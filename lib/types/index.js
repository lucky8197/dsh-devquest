import { ACHIEVEMENTS, achievementById } from "./achievements.js";
import { applyTurn, checkAchievements, ensureDaily, titleFor, xpToNext } from "./engine.js";
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
    const season = config.season ?? '2026-S1';
    // ---- 引擎状态：存档缓存 + 每作用域串行化队列 ----
    const saveCache = new Map();
    const tails = new Map();
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
            counters: save.counters,
            achievements: ACHIEVEMENTS.map(a => {
                const rec = save.achievements[a.id];
                return {
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
            }),
            // 每日任务：跨天自动重滚（就地更新缓存存档，随下次结算持久化）。
            daily: ensureDaily(save, Date.now()),
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
        const cwd = session.header.cwd;
        const key = scopeKey(cwd);
        const seq = agg.seenSeq; // 当前事件（turn/end）的会话内序号
        const actions = agg.actions; // 含本次 turn/end 动作
        agg.actions = []; // 同步清空，避免重复结算
        enqueue(key, async () => {
            const save = await getSave(key);
            // 幂等水位：该会话已结算过 ≥ 本次 seq 的回合 → 重放跳过。
            if (seq <= (save.lastSeqBySession[sessionId] ?? -1))
                return;
            const next = applyTurn(save, actions, Date.now());
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
        status: async (cwd) => {
            const save = await getSave(scopeKey(cwd));
            return buildStatus(save);
        },
        reset: async (cwd) => {
            const key = scopeKey(cwd);
            saveCache.delete(key);
            try {
                const reset = await deleteSave(ctx, storeConfig, key);
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
        status: async (cwd) => {
            const save = await getSave(scopeKey(cwd));
            return buildStatus(save);
        },
        sessions: ctx.sessions,
        ...(config.defaultCwd !== undefined ? { defaultCwd: config.defaultCwd } : {}),
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
