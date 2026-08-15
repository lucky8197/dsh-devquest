import { ACHIEVEMENTS, achievementById } from "./achievements.js";
import { applyTurnDetailed, checkAchievements, claimDailyChest, dailyQuestsDone, ensureDaily, SETTLEMENT_KEEP, titleFor, xpToNext } from "./engine.js";
import { watchEvents } from "./listener.js";
import { loadSave, persistSave, deleteSave, scopeKey } from "./store.js";
import { registerDevQuestTools } from "./tools.js";
import { makeDevQuestRoutes } from "./routes.js";
export const name = 'devquest';
export const inject = ['fs', 'sessions', 'tools'];
export function apply(ctx, config = {}) {
    const storeConfig = {
        ...(config.dataDir !== undefined ? { dataDir: config.dataDir } : {}),
        ...(config.season !== undefined ? { season: config.season } : {}),
    };
    // 赛季：config.season 可选固定覆盖；缺省按日期自动推导季度赛季（见 autoSeasonId）。
    const seasonOverride = config.season;
    // ---- 引擎状态：存档缓存 + 每作用域串行化队列 ----
    const saveCache = new Map();
    const tails = new Map();
    let settlementSeq = 0;
    /** 取存档（缓存优先，无则从盘读）。 */
    async function getSave(key) {
        let save = saveCache.get(key);
        if (save === undefined) {
            save = await loadSave(ctx, storeConfig, key);
            saveCache.set(key, save);
        }
        return save;
    }
    /** 按作用域串行化写操作（同 cwd 的回合结算不互相覆盖）。 */
    function enqueue(key, task) {
        const prev = tails.get(key) ?? Promise.resolve();
        const next = prev.catch(() => undefined).then(task);
        tails.set(key, next.catch(() => undefined));
    }
    /** 组装状态视图。 */
    function buildStatus(save) {
        const unlocked = new Set(Object.keys(save.achievements));
        return {
            cwd: save.cwd,
            level: save.player.level,
            xp: save.player.xp,
            xpToNext: xpToNext(save.player.level),
            title: titleFor(save.player.level),
            season: save.player.season,
            seasonXp: save.player.seasonXp,
            counters: save.counters,
            achievements: ACHIEVEMENTS.map(a => {
                const rec = save.achievements[a.id];
                const view = {
                    id: a.id,
                    category: a.category,
                    name: a.name,
                    description: a.description,
                    icon: a.icon,
                    xp: a.xp,
                    hidden: a.hidden === true,
                    unlocked: rec !== undefined,
                    ...(rec !== undefined ? { acquiredAt: rec.acquiredAt } : {}),
                };
                // 未解锁成就附带进度（面板显示「还差多少」）。
                if (rec === undefined && a.progress !== undefined)
                    view.progress = a.progress(save);
                return view;
            }),
            // 每日任务：跨天自动重滚（就地更新缓存存档，随下次结算持久化）。
            daily: ensureDaily(save, Date.now()),
            dailyChest: {
                ready: dailyQuestsDone(save.daily) && save.daily.chestClaimed !== true,
                claimed: save.daily.chestClaimed === true,
            },
            settlements: save.settlements ?? [],
            updatedAt: save.updatedAt,
        };
    }
    // ---- 1. 事件监听：缓冲 → 回合结束结算 ----
    watchEvents(ctx, (session, agg, action) => {
        const ending = action.kind === 'turn-completed'
            || action.kind === 'turn-failed'
            || action.kind === 'turn-aborted';
        if (!ending)
            return;
        const sessionId = agg.sessionId;
        const key = scopeKey(); // 全局玩家存档（跨会话/跨项目）
        const seq = agg.seenSeq; // 当前事件（turn/end）的会话内序号
        const actions = agg.actions; // 含本次 turn/end 动作
        agg.actions = []; // 同步清空，避免重复结算
        enqueue(key, async () => {
            const save = await getSave(key);
            // 幂等水位：该会话已结算过 ≥ 本次 seq 的回合 → 重放跳过。
            if (seq <= (save.lastSeqBySession[sessionId] ?? -1))
                return;
            const at = Date.now();
            const { save: next, settlement } = applyTurnDetailed(save, actions, at, seasonOverride);
            // 结算事件入存档（面板 toast 数据源，保留最近 N 条）。
            const event = {
                id: `${at}-${settlementSeq++}`,
                at,
                xp: settlement.xp,
                combo: settlement.combo,
                questXp: settlement.questXp,
                levelBefore: settlement.levelBefore,
                levelAfter: settlement.levelAfter,
                leveledUp: settlement.leveledUp,
                turnsDone: settlement.turnsDone,
            };
            next.settlements = [...(next.settlements ?? []), event].slice(-SETTLEMENT_KEEP);
            const unlocked = checkAchievements(ACHIEVEMENTS, next);
            next.lastSeqBySession[sessionId] = seq;
            saveCache.set(key, next);
            await persistSave(ctx, storeConfig, next);
            if (unlocked.length > 0) {
                const names = unlocked.map(id => {
                    const def = achievementById(id);
                    return def !== undefined ? `${def.icon} ${def.name.zh} ${def.name.en}` : id;
                });
                console.log(`[devquest] 🏆 成就解锁：${names.join('、')}`);
            }
        });
    });
    // ---- 2. 工具 ----
    registerDevQuestTools(ctx, {
        status: async () => {
            const save = await getSave(scopeKey());
            return buildStatus(save);
        },
        reset: async () => {
            const key = scopeKey();
            saveCache.delete(key);
            try {
                const reset = await deleteSave(ctx, storeConfig);
                return { ok: true, reset };
            }
            catch (error) {
                console.error('[devquest] reset failed:', error);
                return { ok: false, reset: false };
            }
        },
    });
    // ---- 3. HTTP 路由（可选能力：headless 无 webServer 时自动跳过） ----
    const routes = makeDevQuestRoutes({
        status: async () => {
            const save = await getSave(scopeKey());
            return buildStatus(save);
        },
        claimChest: async () => {
            const key = scopeKey();
            let result = { ok: false, gained: 0 };
            let fresh;
            await new Promise((resolve, reject) => {
                enqueue(key, async () => {
                    try {
                        const save = await getSave(key);
                        const claimed = claimDailyChest(save, Date.now(), seasonOverride);
                        result = { ok: claimed.ok, gained: claimed.gained };
                        fresh = claimed.save;
                        if (claimed.ok) {
                            saveCache.set(key, claimed.save);
                            await persistSave(ctx, storeConfig, claimed.save);
                        }
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
            return { ...result, status: buildStatus(fresh ?? (await getSave(key))) };
        },
        ...(config.cacheTtlMs !== undefined ? { cacheTtlMs: config.cacheTtlMs } : {}),
    });
    ctx.inject(['webServer'], (httpCtx) => {
        httpCtx.effect(() => {
            const disposers = routes.map((route) => httpCtx.webServer.register(route));
            return () => {
                for (const dispose of disposers)
                    dispose();
            };
        }, 'devquest: routes');
    });
}
