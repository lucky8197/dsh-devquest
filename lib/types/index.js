import { createRequire } from 'node:module';
import { log, setGlobalLogLevel } from "./logger.js";
/** 插件版本号（读 package.json；面板头部展示，方便确认加载的代码版本）。 */
function pluginVersion() {
    try {
        const require = createRequire(import.meta.url);
        // lib/index.js 同级向上是 package.json（link 安装 / npm 发布都在）
        const pkg = require('../package.json');
        return pkg.version ?? '';
    }
    catch {
        return '';
    }
}
const PLUGIN_VERSION = pluginVersion();
import { ACHIEVEMENTS, achievementById, computeClass, rarityOf } from "./achievements.js";
import { activateTheme, addXp, applyTurnDetailed, buildRecordsView, buyShopItem, CATEGORY_IDS, checkAchievements, checkCollections, checkTitles, checkTutorial, claimDailyChest, claimDailyGoal, claimLucky, claimPassTier, claimWeeklyBonus, claimWeeklyBoss, COLLECTION_REWARDS, computeWeeklyBoss, DAILY_GOAL_OPTIONS, DAILY_GOAL_REWARD, DAILY_QUEST_POOL, dailyQuestsDone, dayKey, HISTORY_KEEP, migrateSave, nextTitle, refreshDailyProgress, refreshWeeklyProgress, SEASON_PASS_TIERS, SETTLEMENT_KEEP, setActiveTitle, setDailyGoal, SHOP_ITEMS, shopBalance, STREAK_REWARDS, titleFor, TITLE_POOL, todayXpOf, TUTORIAL_STEPS, TUTORIAL_TITLE, useQuestSkip, useReroll, WEEKLY_BOSS_REWARD, xpToLevel, xpToNext, } from "./engine.js";
import { watchEvents } from "./listener.js";
import { createSaveWriter, deleteSave, loadSave, loadUiSettings, sanitizeUiSettings, saveUiSettings, scopeKey } from "./store.js";
import { registerDevQuestTools } from "./tools.js";
import { makeDevQuestRoutes } from "./routes.js";
import { comboStance, resolveEvent as resolveEventPure, EVENT_POOL } from "./events.js";
import { advanceQuestChain, bossMemeName, chainById, claimChainReward as claimChainRewardPure, claimGhostReward as claimGhostRewardPure, ensureGhostRace, ghostRaceProgress, memedDailyLabel, relicById, RELIC_POOL } from "./relics.js";
export const name = 'devquest';
export const inject = ['fs', 'sessions', 'tools'];
export function apply(ctx, config = {}) {
    if (config.logLevel !== undefined)
        setGlobalLogLevel(config.logLevel);
    const storeConfig = {
        ...(config.dataDir !== undefined ? { dataDir: config.dataDir } : {}),
        ...(config.season !== undefined ? { season: config.season } : {}),
    };
    // 赛季：config.season 可选固定覆盖；缺省按日期自动推导季度赛季（见 autoSeasonId）。
    const seasonOverride = config.season;
    // ---- 引擎状态：存档缓存 + 每作用域串行化队列 + 节流写盘 ----
    const saveCache = new Map();
    const tails = new Map();
    let settlementSeq = 0;
    const writer = createSaveWriter(ctx, storeConfig);
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
    /** 串行执行任意读写任务（工具/路由改档的公共骨架）。 */
    async function runExclusive(task) {
        const key = scopeKey();
        return new Promise((resolve, reject) => {
            enqueue(key, async () => {
                try {
                    resolve(await task());
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * 串行改档：读 → 纯函数改 → 缓存 + 节流落盘 → 返回最新状态。
     * pick 决定结果（ok=false 时只读不写；返回失败原因供调用方展示）。
     */
    async function mutateSave(mutate, pick) {
        let outcome = { ok: false };
        let fresh;
        await runExclusive(async () => {
            const save = await getSave(scopeKey());
            const result = mutate(save);
            outcome = pick(result);
            fresh = result.save;
            if (outcome.ok) {
                saveCache.set(scopeKey(), result.save);
                writer.save(result.save);
            }
        });
        return { ...outcome, gained: outcome.gained ?? 0, status: buildStatus(fresh ?? (await getSave(scopeKey()))) };
    }
    /** 组装状态视图。 */
    function buildStatus(save) {
        const unlocked = new Set(Object.keys(save.achievements));
        return {
            cwd: save.cwd,
            level: save.player.level,
            xp: save.player.xp,
            xpToNext: xpToNext(save.player.level),
            ...(save.player.levelStartedAt !== undefined ? { levelStartedAt: save.player.levelStartedAt } : {}),
            title: titleFor(save.player.level),
            season: save.player.season,
            seasonXp: save.player.seasonXp,
            version: PLUGIN_VERSION,
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
                    rarity: rarityOf(a.id),
                    hidden: a.hidden === true,
                    unlocked: rec !== undefined,
                    ...(rec !== undefined ? { acquiredAt: rec.acquiredAt } : {}),
                };
                // 未解锁成就附带进度（面板显示「还差多少」）。
                if (rec === undefined && a.progress !== undefined)
                    view.progress = a.progress(save);
                return view;
            }),
            // 每日任务：跨天自动重滚 + 进度即时同步（不发奖，发奖由回合结算的 applyDaily 执行）。
            // v1.4.0 文案梗化：标签按日期确定性抽取梗版（60%）。
            daily: (() => {
                const d = refreshDailyProgress(save, Date.now());
                return {
                    ...d,
                    quests: d.quests.map(q => {
                        const def = DAILY_QUEST_POOL.find(x => x.id === q.id);
                        return def === undefined ? q : { ...q, label: memedDailyLabel(q.id, def, d.date) };
                    }),
                };
            })(),
            dailyChest: {
                ready: dailyQuestsDone(save.daily) && save.daily.chestClaimed !== true,
                claimed: save.daily.chestClaimed === true,
            },
            settlements: save.settlements ?? [],
            shop: {
                balance: shopBalance(save),
                items: SHOP_ITEMS.map(item => {
                    const owned = item.kind === 'theme'
                        ? (save.shop?.themes ?? []).includes(item.id) || save.shop?.theme === item.id
                        : item.kind === 'badge'
                            ? (save.shop?.badges ?? []).includes(item.id)
                            : false;
                    return { ...item, owned };
                }),
                theme: save.shop?.theme ?? '',
                themes: save.shop?.themes ?? [],
                badges: save.shop?.badges ?? [],
                shields: save.shop?.shields ?? 0,
                rerolls: save.shop?.rerolls ?? 0,
                xpBoostTurns: save.shop?.xpBoostTurns ?? 0,
                questSkips: save.shop?.questSkips ?? 0,
            },
            // v1.1 连续活跃：当前天数 / 历史最高 / 下一奖励档位
            streak: (() => {
                const days = save.counters.streakDays;
                const best = save.counters.streakBest ?? days;
                const next = STREAK_REWARDS[days] === undefined
                    ? Object.entries(STREAK_REWARDS).map(([k, v]) => ({ d: Number(k), xp: v.xp })).find(t => t.d > days) ?? null
                    : null;
                return { days, best, nextTierXp: next !== null ? next.xp : null };
            })(),
            // v1.1 赛季通行证：赛季 XP 里程碑 + 领取状态
            pass: {
                seasonXp: save.player.seasonXp,
                tiers: SEASON_PASS_TIERS.map(t => ({
                    id: t.id,
                    seasonXp: t.seasonXp,
                    xp: t.xp,
                    claimed: (save.shop?.passClaimed ?? []).includes(t.id),
                    reached: save.player.seasonXp >= t.seasonXp,
                })),
            },
            tutorial: {
                steps: TUTORIAL_STEPS.map(step => {
                    const at = save.tutorial?.steps[step.id];
                    return {
                        id: step.id,
                        name: step.name,
                        icon: step.icon,
                        xp: step.xp,
                        done: at !== undefined,
                        ...(at !== undefined ? { acquiredAt: at } : {}),
                    };
                }),
                done: save.tutorial?.done === true,
                title: TUTORIAL_TITLE,
            },
            history: buildHistory(save, Date.now()),
            collections: buildCollections(save),
            lucky: {
                available: (save.lucky?.date ?? '') !== dayKey(Date.now()) || save.lucky?.claimed !== true,
                claimed: save.lucky?.claimed === true && save.lucky?.date === dayKey(Date.now()),
            },
            nextTitle: buildNextTitle(save),
            weekly: buildWeekly(save, Date.now()),
            titles: buildTitles(save),
            records: buildRecordsView(save),
            // v1.3.0 每日 XP 目标视图。
            dailyGoal: (() => {
                const now = Date.now();
                const goal = save.player.dailyGoal ?? 0;
                const claimed = save.player.dailyGoalClaimedDay === dayKey(now) && goal > 0 && todayXpOf(save, now) >= goal;
                return {
                    goal,
                    todayXp: todayXpOf(save, now),
                    claimed,
                    options: [...DAILY_GOAL_OPTIONS],
                    rewardXp: DAILY_GOAL_REWARD,
                };
            })(),
            // v1.3.0 职业画像。
            class: (() => {
                const cls = computeClass(save.counters);
                return cls === null ? null : { id: cls.id, icon: cls.icon, name: cls.name };
            })(),
            ...(save.player.seasonSummary !== undefined ? { seasonSummary: save.player.seasonSummary } : {}),
            // ---- v1.4.0 冒险扩展视图 ----
            events: (save.events ?? []).map(e => ({
                id: e.id,
                effectId: e.effectId,
                gainedAt: e.gainedAt,
                ...(e.expiresTurns !== undefined ? { expiresTurns: e.expiresTurns } : {}),
                pendingChoice: EVENT_POOL.find(d => d.id === e.effectId)?.kind === 'choice',
            })),
            relics: {
                total: RELIC_POOL.length,
                items: (save.relics ?? []).map(r => {
                    const def = relicById(r.id);
                    return {
                        id: r.id,
                        icon: def?.icon ?? '❓',
                        name: def?.name ?? { zh: r.id, en: r.id },
                        rarity: def?.rarity ?? 'common',
                        acquiredAt: r.acquiredAt,
                    };
                }),
            },
            questChain: (() => {
                const ch = save.questChain;
                if (ch === undefined)
                    return null;
                const def = chainById(ch.id);
                if (def === undefined)
                    return null;
                return {
                    id: def.id,
                    icon: def.icon,
                    name: def.name,
                    step: ch.step,
                    total: def.steps.length,
                    steps: def.steps.map((step, i) => ({ label: step.label, met: i < ch.step })),
                    finished: ch.finished === true,
                    claimed: ch.claimed === true,
                    rewardXp: def.rewardXp,
                };
            })(),
            ghostRace: (() => {
                const g = ghostRaceProgress(save, Date.now());
                return g;
            })(),
            stance: (() => {
                const st = comboStance(save.counters.consecutiveSuccess);
                return st === null ? null : { combo: st.combo, id: st.id, icon: st.icon, name: st.name };
            })(),
            updatedAt: save.updatedAt,
        };
    }
    /** 组装分类收藏进度。 */
    function buildCollections(save) {
        const completedAt = save.collections?.completed ?? {};
        return {
            items: CATEGORY_IDS.map(cat => {
                const defs = ACHIEVEMENTS.filter(a => a.category === cat);
                const unlockedCount = defs.filter(a => save.achievements[a.id] !== undefined).length;
                const at = completedAt[cat];
                return {
                    category: cat,
                    total: defs.length,
                    unlocked: unlockedCount,
                    completed: at !== undefined,
                    rewardXp: COLLECTION_REWARDS[cat] ?? 0,
                    ...(at !== undefined ? { claimedAt: at } : {}),
                };
            }),
        };
    }
    /** 下一称号预览（距更高称号还差多少 XP）。 */
    function buildNextTitle(save) {
        const next = nextTitle(save.player.level);
        if (next === null)
            return null;
        return { ...next, xpToNext: xpToLevel(save.player.level, next.level) - save.player.xp };
    }
    /** 组装每周挑战视图。 */
    function buildWeekly(save, now) {
        const weekly = refreshWeeklyProgress(save, now);
        const boss = computeWeeklyBoss(save, now);
        return {
            week: weekly.week,
            quests: weekly.quests.map(q => ({ id: q.id, label: q.label, goal: q.goal, reward: q.reward, progress: q.progress, done: q.done })),
            bonusReady: weekly.quests.length > 0 && weekly.quests.every(q => q.done) && weekly.bonusClaimed !== true,
            bonusClaimed: weekly.bonusClaimed === true,
            boss: boss === null
                ? { icon: '🐉', name: '', hp: 1, damage: 0, defeated: false, claimed: false, reward: WEEKLY_BOSS_REWARD }
                : { ...boss, icon: boss.icon, name: bossMemeName(weekly.week).zh, hp: boss.hp, damage: boss.damage, defeated: boss.defeated, claimed: boss.claimed, reward: WEEKLY_BOSS_REWARD },
        };
    }
    /** 组装多称号视图（含 t-allachs 动态判定：全部 44 枚成就）。 */
    function buildTitles(save) {
        const titles = save.titles ?? { unlocked: [], active: '' };
        const allAchs = ACHIEVEMENTS.every(a => save.achievements[a.id] !== undefined);
        const items = TITLE_POOL.map(t => {
            const unlocked = titles.unlocked.includes(t.id) || (t.id === 't-allachs' && allAchs);
            return {
                id: t.id,
                name: t.name,
                icon: t.icon,
                description: t.description,
                unlocked,
                ...(unlocked ? { acquiredAt: save.updatedAt } : {}),
            };
        });
        // 当前展示：active 命中条件称号则用之，否则回退等级称号。
        const activeDef = TITLE_POOL.find(t => t.id === titles.active && (titles.unlocked.includes(t.id) || (t.id === 't-allachs' && allAchs)));
        return {
            current: activeDef !== undefined ? { id: activeDef.id, name: activeDef.name, icon: activeDef.icon } : null,
            items,
        };
    }
    /** 组装成长周报（最近 HISTORY_KEEP 天，时间正序）。 */
    function buildHistory(save, now) {
        const out = [];
        const map = save.history ?? {};
        for (let i = HISTORY_KEEP - 1; i >= 0; i--) {
            const date = dayKey(now - i * 86_400_000);
            const h = map[date];
            out.push({ date, xp: h?.xp ?? 0, turns: h?.turns ?? 0 });
        }
        return out;
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
            // 新手任务链：步骤推进（每步 +20 XP，全清 +100 XP + 专属称号）。
            const tut = checkTutorial(next, at, seasonOverride);
            Object.assign(next, tut.save);
            // 分类收藏：集齐某分类全部成就 → 奖励 XP。
            const coll = checkCollections(next, at, seasonOverride);
            Object.assign(next, coll.save);
            // 条件称号解锁检查。
            const titles = checkTitles(next, at);
            Object.assign(next, titles.save);
            next.lastSeqBySession[sessionId] = seq;
            // v1.4.0 每日推进：史诗任务链（跨天剧情）+ 幽灵竞速生成（纯函数，结果仅日志）。
            // advance/ensure 返回 clone，取其新字段写回 next（其余字段与 next 一致）。
            const chainR = advanceQuestChain(next, at, `chain-${key}`);
            if (chainR.save.questChain !== undefined)
                next.questChain = chainR.save.questChain;
            const settled2 = ensureGhostRace(next, at);
            if (settled2.ghostRace !== undefined)
                next.ghostRace = settled2.ghostRace;
            if (chainR.label !== null)
                log.info(chainR.label);
            saveCache.set(key, next);
            writer.save(next);
            if (unlocked.length > 0) {
                const names = unlocked.map(id => {
                    const def = achievementById(id);
                    return def !== undefined ? `${def.icon} ${def.name.zh} ${def.name.en}` : id;
                });
                log.info(`🏆 成就解锁：${names.join('、')}`);
            }
            if (tut.stepIds.length > 0) {
                const names = tut.stepIds.map(id => {
                    const def = TUTORIAL_STEPS.find(s => s.id === id);
                    return def !== undefined ? `${def.icon} ${def.name.zh}` : id;
                });
                log.info(`🎓 新手任务：${names.join('、')}${tut.complete ? '（全部完成，解锁「见习冒险者」称号！）' : ''}`);
            }
            if (coll.completed.length > 0) {
                log.info(`📚 分类收藏达成：${coll.completed.join('、')}（+${coll.completed.reduce((sum, c) => sum + (COLLECTION_REWARDS[c] ?? 0), 0)} XP）`);
            }
            if (titles.unlocked.length > 0) {
                const names = titles.unlocked.map(id => {
                    const def = TITLE_POOL.find(t => t.id === id);
                    return def !== undefined ? `${def.icon} ${def.name.zh}` : id;
                });
                log.info(`🏅 新称号解锁：${names.join('、')}`);
            }
        });
    });
    // ---- 1b. 子代理计数：session/created（origin=subagent 或 delegationDepth>0）→ subagentsSpawned+1 ----
    // 事件流里没有子代理创建事件，子代理是独立 session；用 session/created 监听补上。
    ctx.on('session/created', (session) => {
        const isSubagent = session.header?.origin === 'subagent' || (session.header?.delegationDepth ?? 0) > 0;
        if (!isSubagent)
            return;
        enqueue(scopeKey(), async () => {
            const save = await getSave(scopeKey());
            save.counters.subagentsSpawned += 1;
            save.updatedAt = Date.now();
            saveCache.set(scopeKey(), save);
            writer.save(save);
        });
    });
    // ---- 2. 工具 ----
    registerDevQuestTools(ctx, {
        status: async () => {
            const save = await getSave(scopeKey());
            return buildStatus(save);
        },
        buy: async (itemId) => mutateSave(save => buyShopItem(save, itemId, Date.now(), seasonOverride), result => ({ ok: result.ok, ...(result.reason !== undefined ? { reason: result.reason } : {}) })),
        reset: async () => runExclusive(async () => {
            // v1.3.3：reset 与结算/改档同队列串行；先丢弃 pending、再等排空在飞写入，
            // 防止旧档晚于空档落盘造成「复活」（discard 只能清 pending，无法取消已在飞的 writeOnce）。
            writer.discard();
            await writer.flush();
            saveCache.delete(scopeKey());
            try {
                const reset = await deleteSave(ctx, storeConfig);
                return { ok: true, reset };
            }
            catch (error) {
                log.error('reset failed:', error);
                return { ok: false, reset: false };
            }
        }),
    });
    // ---- 3. HTTP 路由（可选能力：headless 无 webServer 时自动跳过） ----
    const routes = makeDevQuestRoutes({
        status: async () => {
            const save = await getSave(scopeKey());
            return buildStatus(save);
        },
        claimChest: async () => mutateSave(save => claimDailyChest(save, Date.now(), seasonOverride), result => ({ ok: result.ok, gained: result.gained })),
        buy: async (itemId) => mutateSave(save => buyShopItem(save, itemId, Date.now(), seasonOverride), result => ({ ok: result.ok, ...(result.reason !== undefined ? { reason: result.reason } : {}) })),
        reroll: async () => mutateSave(save => useReroll(save, Date.now()), result => ({ ok: result.ok })),
        lucky: async () => mutateSave(save => claimLucky(save, Date.now(), seasonOverride), result => {
            if (!result.ok || result.reward === undefined)
                return { ok: result.ok };
            const r = result.reward;
            const reward = r.kind === 'xp' || r.kind === 'currency'
                ? { kind: r.kind, amount: r.amount, label: r.label }
                : { kind: r.kind, count: r.count, label: r.label };
            return { ok: true, reward };
        }),
        exportSave: async () => {
            const save = await getSave(scopeKey());
            return JSON.parse(JSON.stringify(save));
        },
        importSave: async (raw) => {
            return runExclusive(async () => {
                const statusOf = async (s) => buildStatus(s);
                if (typeof raw !== 'object' || raw === null) {
                    return { ok: false, error: 'invalid-save', status: await statusOf(await getSave(scopeKey())) };
                }
                const candidate = raw;
                if (typeof candidate.player !== 'object' || typeof candidate.counters !== 'object') {
                    return { ok: false, error: 'invalid-save', status: await statusOf(await getSave(scopeKey())) };
                }
                const current = await getSave(scopeKey());
                let imported;
                try {
                    imported = migrateSave(candidate, scopeKey(), seasonOverride);
                }
                catch {
                    return { ok: false, error: 'invalid-save', status: await statusOf(current) };
                }
                // v1.3.3：水位只升不降——导入旧备份若回退 lastSeqBySession，
                // 进程重启回放介于新旧水位之间的事件会重复结算（双倍计分）。
                for (const [sid, seq] of Object.entries(current.lastSeqBySession ?? {})) {
                    imported.lastSeqBySession[sid] = Math.max(imported.lastSeqBySession[sid] ?? -1, seq);
                }
                imported.updatedAt = Date.now();
                saveCache.set(scopeKey(), imported);
                writer.save(imported);
                return { ok: true, status: await statusOf(imported) };
            });
        },
        setTitle: async (titleId) => mutateSave(save => setActiveTitle(save, titleId), result => ({ ok: result.ok })),
        setTheme: async (themeId) => mutateSave(save => activateTheme(save, themeId), result => ({ ok: result.ok })),
        useQuestSkip: async () => mutateSave(save => useQuestSkip(save, Date.now()), result => ({ ok: result.ok })),
        claimPass: async (tierId) => mutateSave(save => claimPassTier(save, tierId, Date.now(), seasonOverride), result => ({ ok: result.ok, gained: result.gained })),
        claimWeeklyBonus: async () => mutateSave(save => claimWeeklyBonus(save, Date.now(), seasonOverride), result => ({ ok: result.ok, gained: result.gained })),
        // v1.3.0 每日 XP 目标。
        setDailyGoal: async (goal) => mutateSave(save => setDailyGoal(save, goal, Date.now()), result => ({ ok: result.ok })),
        claimDailyGoal: async () => mutateSave(save => claimDailyGoal(save, Date.now(), seasonOverride), result => ({ ok: result.ok, gained: result.gained })),
        // v1.3.0 每周 BOSS 掉落。
        claimWeeklyBoss: async () => mutateSave(save => claimWeeklyBoss(save, Date.now()), result => ({ ok: result.ok, gained: result.gained })),
        // ---- v1.4.0 冒险扩展 ----
        resolveEvent: async (eventId, option) => runExclusive(async () => {
            const save = await getSave(scopeKey());
            const at = Date.now();
            const r = resolveEventPure(save, eventId, option, at, `${eventId}-${option}`);
            if (!r.ok)
                return { ok: false, gained: 0, label: r.label, status: buildStatus(save) };
            const next = addXp(r.save, r.gained, at, seasonOverride);
            next.updatedAt = at;
            saveCache.set(scopeKey(), next);
            writer.save(next);
            return { ok: true, gained: r.gained, label: r.label, status: buildStatus(next) };
        }),
        claimChainReward: async () => runExclusive(async () => {
            const save = await getSave(scopeKey());
            const at = Date.now();
            const r = claimChainRewardPure(save, at);
            if (!r.ok)
                return { ok: false, gained: 0, status: buildStatus(save) };
            const next = addXp(r.save, r.gained, at, seasonOverride);
            next.updatedAt = at;
            saveCache.set(scopeKey(), next);
            writer.save(next);
            return { ok: true, gained: r.gained, status: buildStatus(next) };
        }),
        claimGhostReward: async () => runExclusive(async () => {
            const save = await getSave(scopeKey());
            const at = Date.now();
            const r = claimGhostRewardPure(save, at);
            if (!r.ok)
                return { ok: false, gained: 0, status: buildStatus(save) };
            const next = addXp(r.save, r.gained, at, seasonOverride);
            next.updatedAt = at;
            saveCache.set(scopeKey(), next);
            writer.save(next);
            return { ok: true, gained: r.gained, status: buildStatus(next) };
        }),
        // UI 设置：host 侧权威存储（面板重启不丢；localStorage 仅启动快照）。
        uiSettings: async () => loadUiSettings(ctx, storeConfig),
        saveUiSettings: async (raw) => runExclusive(async () => {
            const settings = sanitizeUiSettings(raw);
            await saveUiSettings(ctx, storeConfig, settings);
            return settings;
        }),
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
