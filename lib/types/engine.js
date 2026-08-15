/** 称号（每 5 级一档）。 */
export const TITLES = [
    { min: 1, zh: '学徒', en: 'Apprentice' },
    { min: 5, zh: '工匠', en: 'Artisan' },
    { min: 10, zh: '锻造师', en: 'Forger' },
    { min: 15, zh: '宗师', en: 'Master' },
    { min: 20, zh: '传说', en: 'Legend' },
];
/** 等级曲线：xpToNext(level) = round(100 × level^1.5)。 */
export function xpToNext(level) {
    return Math.round(100 * Math.pow(level, 1.5));
}
/** 按等级取称号。 */
export function titleFor(level) {
    let t = TITLES[0];
    for (const cand of TITLES)
        if (level >= cand.min)
            t = cand;
    return { zh: t.zh, en: t.en };
}
/** 工具 XP 加成：锻造师工具 +2，其余 +1。 */
const CRAFT_TOOLS = new Set(['edit', 'write', 'str-replace-editor', 'pwsh', 'bash', 'ssh_exec', 'ssh_upload', 'ssh_download', 'ssh_tunnel', 'ssh_cluster']);
export function xpForTool(tool) {
    return CRAFT_TOOLS.has(tool) ? 2 : 1;
}
/** 单动作 XP（工具 XP 在 applyTurn 内单独封顶 +10）。 */
export function xpForAction(action) {
    switch (action.kind) {
        case 'turn-completed': return 10;
        case 'turn-failed': return 2;
        case 'todo-completed': return 15 * action.count;
        case 'tokens': return Math.floor(action.tokens / 10_000);
        default: return 0;
    }
}
/** 日期键 'YYYY-MM-DD'（本地时区）。 */
export function dayKey(now) {
    const d = new Date(now);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}
/** 赛季 id（自动按季度）：2026-S1 = 2026 年 Q1（1-3 月），以此类推。 */
export function autoSeasonId(now) {
    const d = new Date(now);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()}-S${quarter}`;
}
/** 每日任务池（每天抽取 DAILY_QUEST_COUNT 个）。 */
export const DAILY_QUEST_POOL = [
    { id: 'dq_turns_5', label: { zh: '完成 5 个回合', en: 'Finish 5 turns' }, goal: 5, reward: 30, progress: c => c.turnsCompleted },
    { id: 'dq_turns_15', label: { zh: '完成 15 个回合', en: 'Finish 15 turns' }, goal: 15, reward: 60, progress: c => c.turnsCompleted },
    { id: 'dq_turns_30', label: { zh: '完成 30 个回合', en: 'Finish 30 turns' }, goal: 30, reward: 80, progress: c => c.turnsCompleted },
    { id: 'dq_tools_20', label: { zh: '调用 20 次工具', en: 'Call 20 tools' }, goal: 20, reward: 40, progress: c => c.toolCalls },
    { id: 'dq_tools_50', label: { zh: '调用 50 次工具', en: 'Call 50 tools' }, goal: 50, reward: 80, progress: c => c.toolCalls },
    { id: 'dq_tools_100', label: { zh: '调用 100 次工具', en: 'Call 100 tools' }, goal: 100, reward: 120, progress: c => c.toolCalls },
    { id: 'dq_edits_10', label: { zh: '编辑/写入 10 次', en: 'Edit or write 10 times' }, goal: 10, reward: 50, progress: c => c.craftTools },
    { id: 'dq_edits_20', label: { zh: '编辑/写入 20 次', en: 'Edit or write 20 times' }, goal: 20, reward: 80, progress: c => c.craftTools },
    { id: 'dq_cmd_10', label: { zh: '命令行 10 次', en: 'Run 10 commands' }, goal: 10, reward: 40, progress: c => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0) },
    { id: 'dq_cmd_20', label: { zh: '命令行 20 次', en: 'Run 20 commands' }, goal: 20, reward: 70, progress: c => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0) },
    { id: 'dq_todos_5', label: { zh: '完成 5 个待办', en: 'Complete 5 todos' }, goal: 5, reward: 60, progress: c => c.todosCompleted },
    { id: 'dq_todos_10', label: { zh: '完成 10 个待办', en: 'Complete 10 todos' }, goal: 10, reward: 90, progress: c => c.todosCompleted },
    { id: 'dq_tokens_50k', label: { zh: '输出 50k tokens', en: 'Output 50k tokens' }, goal: 50_000, reward: 70, progress: c => c.tokensOut },
    { id: 'dq_tokens_150k', label: { zh: '输出 150k tokens', en: 'Output 150k tokens' }, goal: 150_000, reward: 100, progress: c => c.tokensOut },
    { id: 'dq_subagent_1', label: { zh: '派出 1 个子代理', en: 'Spawn 1 subagent' }, goal: 1, reward: 60, progress: c => c.subagentsSpawned },
    { id: 'dq_subagent_2', label: { zh: '派出 2 个子代理', en: 'Spawn 2 subagents' }, goal: 2, reward: 80, progress: c => c.subagentsSpawned },
    { id: 'dq_ssh_1', label: { zh: '使用 1 次 SSH', en: 'Use SSH once' }, goal: 1, reward: 100, progress: c => (c.toolCallsByTool.ssh_exec ?? 0) + (c.toolCallsByTool.ssh_upload ?? 0) + (c.toolCallsByTool.ssh_download ?? 0) + (c.toolCallsByTool.ssh_tunnel ?? 0) + (c.toolCallsByTool.ssh_cluster ?? 0) + (c.toolCallsByTool.ssh_list ?? 0) },
    { id: 'dq_comeback_1', label: { zh: '失误后重新站起来', en: 'Rise after a failure' }, goal: 1, reward: 80, progress: c => c.comebacks },
    { id: 'dq_night_1', label: { zh: '凌晨完成 1 个回合', en: 'Finish a turn after midnight' }, goal: 1, reward: 90, progress: c => c.nightTurns },
    { id: 'dq_distinct_8', label: { zh: '使用 8 种不同工具', en: 'Use 8 different tools' }, goal: 8, reward: 100, progress: c => c.todayTools.length },
    { id: 'dq_checkin_1', label: { zh: '查看 1 次进度', en: 'Check your progress' }, goal: 1, reward: 20, progress: c => c.devquestCalls },
];
/** 每天抽取的任务数。 */
export const DAILY_QUEST_COUNT = 3;
/** 确定性 PRNG（按日期字符串做种子）：同一天所有会话与重启看到相同的任务。 */
function seededRng(seed) {
    let h = 2166136261;
    for (const ch of seed) {
        h ^= ch.codePointAt(0) ?? 0;
        h = Math.imul(h, 16777619);
    }
    let state = h >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务）。 */
export function rollDailyQuests(now) {
    const date = dayKey(now);
    const rng = seededRng(date);
    const pool = [...DAILY_QUEST_POOL];
    const quests = [];
    for (let i = 0; i < DAILY_QUEST_COUNT && pool.length > 0; i++) {
        const idx = Math.floor(rng() * pool.length);
        const def = pool.splice(idx, 1)[0];
        quests.push({ id: def.id, label: def.label, goal: def.goal, reward: def.reward, progress: 0, done: false });
    }
    return { date, quests };
}
/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
export function ensureDaily(save, now) {
    if (save.daily.date !== dayKey(now))
        save.daily = rollDailyQuests(now);
    return save.daily;
}
/** 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。 */
export function applyDaily(save, now) {
    const daily = ensureDaily(save, now);
    let gain = 0;
    for (const q of daily.quests) {
        if (q.done)
            continue;
        const def = DAILY_QUEST_POOL.find(d => d.id === q.id);
        if (def === undefined)
            continue;
        q.progress = Math.min(def.progress(save.counters), q.goal);
        if (q.progress >= q.goal) {
            q.done = true;
            q.claimedAt = now;
            save.counters.dailyQuestsDone++;
            gain += q.reward;
        }
    }
    return gain;
}
/** 构造最小计数器。 */
export function freshCounters() {
    return {
        turnsCompleted: 0,
        turnsFailed: 0,
        consecutiveSuccess: 0,
        toolCalls: 0,
        toolCallsByTool: {},
        craftTools: 0,
        todosCompleted: 0,
        cleanSweeps: 0,
        tokensOut: 0,
        subagentsSpawned: 0,
        devquestCalls: 0,
        activeDays: 0,
        streakDays: 0,
        lastActiveDay: '',
        lastActivityAt: 0,
        completedToday: 0,
        completedDay: '',
        lastTurnCompletedAt: 0,
        oopsFired: false,
        dailyQuestsDone: 0,
        comebacks: 0,
        nightTurns: 0,
        maxTokensTurn: 0,
        seasonTokensOut: 0,
        todayTools: [],
        todayToolsDay: '',
    };
}
/** 构造最小玩家状态。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export function freshPlayer(seasonOverride, now) {
    return { level: 1, xp: 0, xpTotal: 0, title: titleFor(1).zh, season: seasonOverride ?? autoSeasonId(now), seasonXp: 0 };
}
/** 构造最小存档。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export function freshSave(cwd, seasonOverride, now = Date.now()) {
    return {
        version: 1,
        cwd,
        player: freshPlayer(seasonOverride, now),
        counters: freshCounters(),
        achievements: {},
        lastSeqBySession: {},
        daily: rollDailyQuests(now),
        updatedAt: now,
    };
}
/**
 * 加 XP 并处理升级、活跃日统计与赛季换季（返回副本；原存档不变）。
 * seasonOverride 缺省按日期自动推导季度赛季；设置后赛季固定不换季。
 */
export function addXp(save, gain, now = Date.now(), seasonOverride) {
    const s = structuredClone(save);
    // 赛季换季检测：跨季度首次活跃自动开启新赛季（赛季 XP / 赛季 tokens 清零重计，累计保留）。
    const season = seasonOverride ?? autoSeasonId(now);
    if (s.player.season !== season) {
        s.player.season = season;
        s.player.seasonXp = 0;
        s.counters.seasonTokensOut = 0;
    }
    if (gain > 0) {
        s.player.xp += gain;
        s.player.xpTotal += gain;
        s.player.seasonXp += gain;
    }
    while (s.player.xp >= xpToNext(s.player.level)) {
        s.player.xp -= xpToNext(s.player.level);
        s.player.level++;
    }
    s.player.title = titleFor(s.player.level).zh;
    const c = s.counters;
    c.lastActivityAt = now;
    const today = dayKey(now);
    const yesterday = dayKey(now - 86_400_000);
    if (c.lastActiveDay !== today) {
        c.streakDays = c.lastActiveDay === yesterday ? c.streakDays + 1 : 1;
        c.activeDays++;
        c.lastActiveDay = today;
    }
    s.updatedAt = now;
    return s;
}
/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 */
export function applyTurn(save, actions, now = Date.now(), seasonOverride) {
    const s = structuredClone(save);
    const c = s.counters;
    // 赛季换季：先清零赛季统计再累计，保证新赛季首回合的 XP/tokens 归入新赛季。
    const season = seasonOverride ?? autoSeasonId(now);
    if (s.player.season !== season) {
        s.player.season = season;
        s.player.seasonXp = 0;
        c.seasonTokensOut = 0;
    }
    let toolGain = 0;
    let gain = 0;
    let turnTokens = 0;
    for (const a of actions) {
        if (a.kind === 'tool-call') {
            toolGain += xpForTool(a.tool);
        }
        else {
            gain += xpForAction(a);
        }
        switch (a.kind) {
            case 'tool-call':
                c.toolCalls++;
                c.toolCallsByTool[a.tool] = (c.toolCallsByTool[a.tool] ?? 0) + 1;
                if (CRAFT_TOOLS.has(a.tool))
                    c.craftTools++;
                if (a.tool === 'devquest_status')
                    c.devquestCalls++;
                // 今日工具去重（jack_of_all / dq_distinct_8 用），跨天清零。
                const todayToolsDay = dayKey(now);
                if (c.todayToolsDay !== todayToolsDay) {
                    c.todayToolsDay = todayToolsDay;
                    c.todayTools = [];
                }
                if (!c.todayTools.includes(a.tool))
                    c.todayTools.push(a.tool);
                // oops：最近一次失败的工具，在 1 分钟内被再次调用成功（顺序敏感：失败须先于成功）。
                if (c.lastErrorTool === a.tool
                    && c.lastErrorAt !== undefined
                    && now > c.lastErrorAt
                    && now - c.lastErrorAt <= 60_000) {
                    c.oopsFired = true;
                }
                c.lastSuccessTool = a.tool;
                c.lastSuccessAt = now;
                break;
            case 'tool-failed':
                c.lastErrorTool = a.tool;
                c.lastErrorAt = now;
                break;
            case 'todo-completed':
                c.todosCompleted += a.count;
                if (a.allCompleted === true)
                    c.cleanSweeps++;
                break;
            case 'tokens':
                c.tokensOut += a.tokens;
                c.seasonTokensOut += a.tokens;
                turnTokens += a.tokens;
                break;
            case 'subagent':
                c.subagentsSpawned += a.depth > 0 ? 1 : 0;
                break;
            default:
                break;
        }
    }
    // 单回合最大输出 tokens（thinker 用）。
    if (turnTokens > c.maxTokensTurn)
        c.maxTokensTurn = turnTokens;
    gain += Math.min(toolGain, 10); // 工具 XP 单回合封顶 +10
    const completed = actions.some(a => a.kind === 'turn-completed');
    const failed = actions.some(a => a.kind === 'turn-failed');
    if (completed) {
        // 东山再起：连击被清零后重新完成（comeback_10 / dq_comeback_1 用）。
        if (c.consecutiveSuccess === 0 && c.turnsFailed > 0)
            c.comebacks++;
        c.turnsCompleted++;
        c.consecutiveSuccess++;
        c.lastTurnCompletedAt = now;
        const h = new Date(now).getHours();
        if (h >= 0 && h < 5)
            c.nightTurns++; // 凌晨回合（night_owl_10 / dq_night_1 用）
        const today = dayKey(now);
        if (c.completedDay === today) {
            c.completedToday++;
        }
        else {
            c.completedDay = today;
            c.completedToday = 1;
        }
        // 连击多档加成：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5。
        if (c.consecutiveSuccess >= 30)
            gain = Math.round(gain * 2.5);
        else if (c.consecutiveSuccess >= 15)
            gain = Math.round(gain * 2.0);
        else if (c.consecutiveSuccess >= 5)
            gain = Math.round(gain * 1.5);
    }
    else if (failed) {
        c.turnsFailed++;
        c.consecutiveSuccess = 0;
    }
    // 单回合兜底上限（工具 10 + todo 15 + turn 基础 + tokens，宽松防刷）。
    gain = Math.min(gain, 125);
    // 每日任务奖励不计入兜底上限（每天固定 3 个，天然防刷）。
    const questGain = applyDaily(s, now);
    return addXp(s, gain + questGain, now, seasonOverride);
}
/**
 * 成就判定：返回新解锁的成就 id 列表（一次性；已解锁的不重复）。
 * 副作用仅限对传入存档副本写入成就记录。
 */
export function checkAchievements(defs, save, now = Date.now()) {
    const unlocked = [];
    for (const d of defs) {
        if (save.achievements[d.id])
            continue; // 一次性
        if (d.check(save, now)) {
            save.achievements[d.id] = { acquiredAt: now, xp: d.xp };
            unlocked.push(d.id);
        }
    }
    return unlocked;
}
/** 存档迁移/补全：把旧版本或缺失字段的存档升级为当前结构。 */
export function migrateSave(raw, cwd, seasonOverride) {
    const base = freshSave(cwd, seasonOverride, raw.updatedAt ?? Date.now());
    if (!raw || typeof raw !== 'object')
        return base;
    const out = {
        ...base,
        ...raw,
        cwd,
        player: { ...base.player, ...(raw.player ?? {}) },
        counters: { ...base.counters, ...(raw.counters ?? {}) },
        achievements: raw.achievements ?? {},
        lastSeqBySession: raw.lastSeqBySession ?? {},
        daily: raw.daily ?? base.daily,
    };
    out.version = Math.max(1, raw.version ?? 1);
    // 派生字段一致性：称号跟等级走；每日任务日期过期由 ensureDaily 重滚。
    out.player.title = titleFor(out.player.level).zh;
    return out;
}
