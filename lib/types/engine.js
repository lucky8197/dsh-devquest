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
/** 每日全清宝箱奖励 XP（当天 3 个任务全部完成后可领取一次）。 */
export const DAILY_CHEST_REWARD = 50;
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
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务；salt 用于重掷）。 */
export function rollDailyQuests(now, salt = '') {
    const date = dayKey(now);
    const rng = seededRng(`${date}#${salt}`);
    const pool = [...DAILY_QUEST_POOL];
    const quests = [];
    for (let i = 0; i < DAILY_QUEST_COUNT && pool.length > 0; i++) {
        const idx = Math.floor(rng() * pool.length);
        const def = pool.splice(idx, 1)[0];
        quests.push({ id: def.id, label: def.label, goal: def.goal, reward: def.reward, progress: 0, done: false });
    }
    return { date, quests, chestClaimed: false };
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
/** 当天 3 个任务是否已全部完成。 */
export function dailyQuestsDone(daily) {
    return daily.quests.length > 0 && daily.quests.every(q => q.done);
}
/**
 * 领取每日全清宝箱（当天 3 个任务全完成后可领一次，+DAILY_CHEST_REWARD XP）。
 * 未满足条件时返回 { ok: false, gained: 0, save }（原存档副本不变）。
 */
export function claimDailyChest(save, now = Date.now(), seasonOverride) {
    const s = structuredClone(save);
    const daily = ensureDaily(s, now);
    if (!dailyQuestsDone(daily) || daily.chestClaimed === true) {
        return { ok: false, gained: 0, save: s };
    }
    daily.chestClaimed = true;
    return { ok: true, gained: DAILY_CHEST_REWARD, save: addXp(s, DAILY_CHEST_REWARD, now, seasonOverride) };
}
// ---------------------------------------------------------------------------
// 赛季商店：用本赛季 XP 消费（余额 = seasonXp - spent，换季清零）。
// ---------------------------------------------------------------------------
/** 构造最小商店状态。 */
export function freshShop() {
    return { spent: 0, shields: 0, rerolls: 0, theme: '', badges: [] };
}
/** 商店余额（本赛季可支配 XP）。 */
export function shopBalance(save) {
    return Math.max(0, save.player.seasonXp - (save.shop?.spent ?? 0));
}
/**
 * 购买商店商品（纯函数，返回副本）。
 * 余额不足 / 重复购买主题徽章 → { ok: false, reason }。
 */
export function buyShopItem(save, itemId, now = Date.now(), seasonOverride) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (item === undefined)
        return { ok: false, reason: 'unknown-item', save: structuredClone(save) };
    const s = structuredClone(save);
    const shop = { ...freshShop(), ...(s.shop ?? {}) };
    // 主题/徽章是永久解锁，重复购买无意义
    if (item.kind === 'theme' && shop.theme === item.id)
        return { ok: false, reason: 'already-owned', save: s };
    if (item.kind === 'badge' && shop.badges.includes(item.id))
        return { ok: false, reason: 'already-owned', save: s };
    // 余额校验（换季时 seasonXp 已清零，spent 也一并清零——见 addXp 换季逻辑）
    const balance = shopBalance(s);
    if (balance < item.price)
        return { ok: false, reason: 'insufficient-balance', save: s };
    shop.spent += item.price;
    if (item.kind === 'shield')
        shop.shields += item.id === 'shield-3' ? 3 : 1;
    if (item.kind === 'reroll')
        shop.rerolls += 1;
    if (item.kind === 'theme')
        shop.theme = item.id;
    if (item.kind === 'badge')
        shop.badges = [...shop.badges, item.id];
    s.shop = shop;
    return { ok: true, save: s };
}
/** 使用 1 次任务重掷：重新抽取今日任务（返回副本；库存不足返回 false）。 */
export function useReroll(save, now = Date.now()) {
    const s = structuredClone(save);
    const shop = { ...freshShop(), ...(s.shop ?? {}) };
    if (shop.rerolls <= 0)
        return { ok: false, save: s };
    shop.rerolls -= 1;
    s.shop = shop;
    // 重掷：基于「日期 + 重掷次数」抽取，保证与当天默认任务不同。
    s.daily = rollDailyQuests(now, `reroll-${shop.rerolls}-${Date.now() % 86400_000}`);
    return { ok: true, save: s };
}
// ---------------------------------------------------------------------------
// 新手任务链：5 步引导，全部完成解锁专属称号。
// ---------------------------------------------------------------------------
/** 检查新手链：返回新完成的 step id 列表（已完成的跳过），并结算奖励 XP。 */
export function checkTutorial(save, now = Date.now(), seasonOverride) {
    const s = structuredClone(save);
    const tutorial = s.tutorial ?? { steps: {}, done: false };
    const doneIds = new Set(Object.keys(tutorial.steps));
    const newly = [];
    for (const step of TUTORIAL_STEPS) {
        if (doneIds.has(step.id))
            continue;
        if (step.check(s.counters)) {
            tutorial.steps[step.id] = now;
            newly.push(step.id);
        }
    }
    const allDone = TUTORIAL_STEPS.every(step => tutorial.steps[step.id] !== undefined);
    tutorial.done = allDone;
    s.tutorial = tutorial;
    let gain = newly.length * 20; // 每步 +20 XP
    if (allDone && !doneIds.has('__complete')) {
        tutorial.steps['__complete'] = now;
        gain += TUTORIAL_COMPLETE_XP; // 全清额外 +100
    }
    return {
        stepIds: newly,
        complete: allDone,
        save: gain > 0 ? addXp(s, gain, now, seasonOverride) : s,
    };
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
    return { level: 1, xp: 0, xpTotal: 0, title: titleFor(1).zh, season: seasonOverride ?? autoSeasonId(now), seasonXp: 0, levelStartedAt: now };
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
        settlements: [],
        history: {},
        shop: freshShop(),
        tutorial: { steps: {}, done: false },
        updatedAt: now,
    };
}
/** 存档保留的最近结算事件条数（面板 toast 只关心最近的）。 */
export const SETTLEMENT_KEEP = 12;
/** 每日历史保留天数（成长周报展示窗口，超出自动裁剪）。 */
export const HISTORY_KEEP = 30;
/** 赛季商店：用本赛季 XP 消费（换季清零，天然防通胀）。 */
export const SHOP_ITEMS = [
    { id: 'shield-1', kind: 'shield', icon: '🛡️', price: 150,
        name: { zh: '连击保险', en: 'Combo Shield' },
        description: { zh: '获得 1 个连击保险：失误回合自动消耗一个，连击不清零', en: 'Buy 1 combo shield: a failed turn consumes it instead of breaking your combo' } },
    { id: 'shield-3', kind: 'shield', icon: '⛨', price: 400,
        name: { zh: '连击保险 ×3', en: 'Combo Shield ×3' },
        description: { zh: '3 个连击保险（9 折）', en: '3 combo shields (10% off)' } },
    { id: 'reroll-1', kind: 'reroll', icon: '🔀', price: 120,
        name: { zh: '任务重掷', en: 'Quest Reroll' },
        description: { zh: '重掷今天的每日任务（任务与奖励重新抽取）', en: 'Reroll today\'s daily quests' } },
    { id: 'theme-ember', kind: 'theme', icon: '🔥', price: 300,
        name: { zh: '熔火主题', en: 'Ember Theme' },
        description: { zh: '面板切换为熔火橙配色', en: 'Switch the panel to ember-orange colors' } },
    { id: 'theme-frost', kind: 'theme', icon: '❄️', price: 300,
        name: { zh: '寒霜主题', en: 'Frost Theme' },
        description: { zh: '面板切换为寒霜蓝配色', en: 'Switch the panel to frost-blue colors' } },
    { id: 'theme-verdant', kind: 'theme', icon: '🌿', price: 300,
        name: { zh: '青翠主题', en: 'Verdant Theme' },
        description: { zh: '面板切换为青翠绿配色', en: 'Switch the panel to verdant-green colors' } },
    { id: 'badge-crown', kind: 'badge', icon: '👑', price: 250,
        name: { zh: '王冠徽章', en: 'Crown Badge' },
        description: { zh: '称号旁展示 👑 王冠徽章', en: 'Show a crown badge next to your title' } },
    { id: 'badge-star', kind: 'badge', icon: '🌟', price: 250,
        name: { zh: '星芒徽章', en: 'Star Badge' },
        description: { zh: '称号旁展示 🌟 星芒徽章', en: 'Show a star badge next to your title' } },
];
/** 商店主题 id → 面板主题覆盖（client 消费）。 */
export const SHOP_THEMES = {
    'theme-ember': 'ember',
    'theme-frost': 'frost',
    'theme-verdant': 'verdant',
};
export const TUTORIAL_STEPS = [
    { id: 'first-turn', name: { zh: '完成首个回合', en: 'Finish your first turn' }, icon: '🚶', xp: 20,
        check: c => c.turnsCompleted >= 1 },
    { id: 'first-edit', name: { zh: '第一次编辑', en: 'Make your first edit' }, icon: '✏️', xp: 20,
        check: c => (c.toolCallsByTool['edit'] ?? 0) + (c.toolCallsByTool['str-replace-editor'] ?? 0) + (c.toolCallsByTool['write'] ?? 0) >= 1 },
    { id: 'first-todo', name: { zh: '完成首个待办', en: 'Complete your first todo' }, icon: '📋', xp: 20,
        check: c => c.todosCompleted >= 1 },
    { id: 'first-command', name: { zh: '运行第一条命令', en: 'Run your first command' }, icon: '⌨️', xp: 20,
        check: c => (c.toolCallsByTool['pwsh'] ?? 0) + (c.toolCallsByTool['bash'] ?? 0) >= 1 },
    { id: 'first-check', name: { zh: '查看一次进度', en: 'Check your progress' }, icon: '👀', xp: 20,
        check: c => c.devquestCalls >= 1 },
];
/** 新手链专属称号（全部完成解锁）。 */
export const TUTORIAL_TITLE = { zh: '见习冒险者', en: 'Rookie Adventurer' };
/** 新手链全部完成的额外奖励 XP。 */
export const TUTORIAL_COMPLETE_XP = 100;
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
        // 新赛季：商店余额重新累计（spent 清零，库存保留？不——赛季货币清零，库存也清零更公平）
        s.shop = { ...freshShop(), theme: s.shop?.theme ?? '', badges: s.shop?.badges ?? [] };
    }
    if (gain > 0) {
        s.player.xp += gain;
        s.player.xpTotal += gain;
        s.player.seasonXp += gain;
    }
    const levelBefore = s.player.level;
    while (s.player.xp >= xpToNext(s.player.level)) {
        s.player.xp -= xpToNext(s.player.level);
        s.player.level++;
    }
    if (s.player.level > levelBefore)
        s.player.levelStartedAt = now;
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
    // 每日历史（成长周报）：当日 XP 累计，裁剪到最近 HISTORY_KEEP 天。
    if (gain > 0) {
        const history = s.history ?? {};
        const h = history[today] ?? { xp: 0, turns: 0 };
        h.xp += gain;
        history[today] = h;
        s.history = trimHistory(history, now);
    }
    s.updatedAt = now;
    return s;
}
/** 裁剪每日历史：只保留最近 HISTORY_KEEP 天。 */
export function trimHistory(history, now) {
    const cutoff = dayKey(now - HISTORY_KEEP * 86_400_000);
    const out = {};
    for (const [date, h] of Object.entries(history)) {
        if (date >= cutoff)
            out[date] = h;
    }
    return out;
}
/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 * 返回存档副本（原存档不变）。
 */
export function applyTurn(save, actions, now = Date.now(), seasonOverride) {
    return applyTurnDetailed(save, actions, now, seasonOverride).save;
}
/**
 * 单回合结算（返回存档 + 结算明细）。语义同 applyTurn。
 */
export function applyTurnDetailed(save, actions, now = Date.now(), seasonOverride) {
    const s = structuredClone(save);
    const c = s.counters;
    const levelBefore = s.player.level;
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
    let combo = null;
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
        if (c.consecutiveSuccess >= 30) {
            gain = Math.round(gain * 2.5);
            combo = 2.5;
        }
        else if (c.consecutiveSuccess >= 15) {
            gain = Math.round(gain * 2.0);
            combo = 2.0;
        }
        else if (c.consecutiveSuccess >= 5) {
            gain = Math.round(gain * 1.5);
            combo = 1.5;
        }
    }
    else if (failed) {
        c.turnsFailed++;
        // 连击保险：失误回合自动消耗一个，连击不清零（商店购买）。
        if ((s.shop?.shields ?? 0) > 0) {
            s.shop = { ...(s.shop ?? { spent: 0, shields: 0, rerolls: 0, theme: '', badges: [] }), shields: (s.shop?.shields ?? 0) - 1 };
        }
        else {
            c.consecutiveSuccess = 0;
        }
    }
    // 单回合兜底上限（工具 10 + todo 15 + turn 基础 + tokens，宽松防刷）。
    gain = Math.min(gain, 125);
    // 每日任务奖励不计入兜底上限（每天固定 3 个，天然防刷）。
    const questGain = applyDaily(s, now);
    const next = addXp(s, gain + questGain, now, seasonOverride);
    const turnsDone = completed || failed ? 1 : 0;
    // 每日历史：完成回合数累计（XP 已在 addXp 内累计）。
    if (completed) {
        const today = dayKey(now);
        const history = next.history ?? {};
        const h = history[today] ?? { xp: 0, turns: 0 };
        h.turns += 1;
        history[today] = h;
        next.history = trimHistory(history, now);
    }
    return {
        save: next,
        settlement: {
            xp: gain + questGain,
            combo,
            questXp: questGain,
            levelBefore,
            levelAfter: next.player.level,
            leveledUp: next.player.level > levelBefore,
            turnsDone,
        },
    };
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
        settlements: raw.settlements ?? [],
        history: raw.history ?? {},
        shop: { ...freshShop(), ...(raw.shop ?? {}) },
        tutorial: { steps: {}, done: false, ...(raw.tutorial ?? {}) },
    };
    out.version = Math.max(1, raw.version ?? 1);
    // 派生字段一致性：称号跟等级走；每日任务日期过期由 ensureDaily 重滚。
    out.player.title = titleFor(out.player.level).zh;
    return out;
}
/**
 * 合并多个存档为全局玩家存档（v0.3：从按项目隔离切换到全局跨会话）。
 * - 累计类计数器求和，状态类字段取 updatedAt 最新的存档
 * - 成就取并集（保留最早解锁时间），水位取并集（每个会话的最大 seq）
 * - 等级从累计 XP 重算
 */
export function mergeSaves(saves, now = Date.now()) {
    const out = freshSave('global', undefined, now);
    if (saves.length === 0)
        return out;
    const latest = saves.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b));
    const c = out.counters;
    for (const s of saves) {
        const sc = s.counters;
        out.player.xpTotal += s.player.xpTotal;
        out.player.seasonXp += s.player.seasonXp;
        c.turnsCompleted += sc.turnsCompleted;
        c.turnsFailed += sc.turnsFailed;
        c.toolCalls += sc.toolCalls;
        c.craftTools += sc.craftTools;
        c.todosCompleted += sc.todosCompleted;
        c.cleanSweeps += sc.cleanSweeps;
        c.tokensOut += sc.tokensOut;
        c.seasonTokensOut += sc.seasonTokensOut;
        c.subagentsSpawned += sc.subagentsSpawned;
        c.devquestCalls += sc.devquestCalls;
        c.activeDays += sc.activeDays;
        c.comebacks += sc.comebacks;
        c.nightTurns += sc.nightTurns;
        c.dailyQuestsDone += sc.dailyQuestsDone;
        c.maxTokensTurn = Math.max(c.maxTokensTurn, sc.maxTokensTurn);
        for (const [tool, n] of Object.entries(sc.toolCallsByTool)) {
            c.toolCallsByTool[tool] = (c.toolCallsByTool[tool] ?? 0) + n;
        }
        for (const tool of sc.todayTools) {
            if (!c.todayTools.includes(tool))
                c.todayTools.push(tool);
        }
        for (const [id, rec] of Object.entries(s.achievements)) {
            if (out.achievements[id] === undefined || rec.acquiredAt < out.achievements[id].acquiredAt) {
                out.achievements[id] = rec;
            }
        }
        for (const [sid, seq] of Object.entries(s.lastSeqBySession)) {
            out.lastSeqBySession[sid] = Math.max(out.lastSeqBySession[sid] ?? -1, seq);
        }
        for (const ev of s.settlements ?? []) {
            if (out.settlements.find(x => x.id === ev.id) === undefined)
                out.settlements.push(ev);
        }
        // 每日历史：按日取最大累计（合并多个项目时同一天只保留一份，取较大的）。
        for (const [date, h] of Object.entries(s.history ?? {})) {
            const cur = out.history[date];
            out.history[date] = { xp: Math.max(cur?.xp ?? 0, h.xp), turns: Math.max(cur?.turns ?? 0, h.turns) };
        }
        // 商店：花费与库存求和，主题/徽章取并集（主题取最新存档的）。
        const shop = s.shop;
        if (shop !== undefined) {
            out.shop.spent += shop.spent;
            out.shop.shields += shop.shields;
            out.shop.rerolls += shop.rerolls;
            for (const b of shop.badges)
                if (!out.shop.badges.includes(b))
                    out.shop.badges.push(b);
        }
        // 新手链：步骤并集。
        const tut = s.tutorial;
        if (tut !== undefined) {
            for (const [id, at] of Object.entries(tut.steps)) {
                if (out.tutorial.steps[id] === undefined || at < out.tutorial.steps[id])
                    out.tutorial.steps[id] = at;
            }
        }
    }
    // 结算事件：按时间倒序保留最近 SETTLEMENT_KEEP 条。
    out.settlements.sort((a, b) => b.at - a.at);
    out.settlements = out.settlements.slice(0, SETTLEMENT_KEEP);
    // 状态类字段取最新存档（连击/活跃日/今日计数/工具成败对等）
    c.consecutiveSuccess = latest.counters.consecutiveSuccess;
    c.lastActiveDay = latest.counters.lastActiveDay;
    c.lastActivityAt = Math.max(c.lastActivityAt, latest.counters.lastActivityAt);
    c.completedToday = latest.counters.completedToday;
    c.completedDay = latest.counters.completedDay;
    c.lastTurnCompletedAt = latest.counters.lastTurnCompletedAt;
    c.todayToolsDay = latest.counters.todayToolsDay;
    c.oopsFired = latest.counters.oopsFired;
    if (latest.counters.lastErrorTool !== undefined)
        c.lastErrorTool = latest.counters.lastErrorTool;
    if (latest.counters.lastErrorAt !== undefined)
        c.lastErrorAt = latest.counters.lastErrorAt;
    if (latest.counters.lastSuccessTool !== undefined)
        c.lastSuccessTool = latest.counters.lastSuccessTool;
    if (latest.counters.lastSuccessAt !== undefined)
        c.lastSuccessAt = latest.counters.lastSuccessAt;
    // 等级从累计 XP 重算
    let level = 1;
    let xp = out.player.xpTotal;
    while (xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level++;
    }
    out.player.level = level;
    out.player.xp = xp;
    out.player.title = titleFor(level).zh;
    // 商店派生：余额 = 汇总 seasonXp - 汇总 spent；主题取最新存档（换季后 spent 已清，见 addXp）。
    out.shop.theme = latest.shop?.theme ?? '';
    out.tutorial.done = TUTORIAL_STEPS.every(step => out.tutorial.steps[step.id] !== undefined);
    // 每日任务：保留最新存档的（日期过期由 ensureDaily 重滚）
    out.daily = latest.daily;
    out.history = trimHistory(out.history ?? {}, now);
    out.updatedAt = now;
    return out;
}
