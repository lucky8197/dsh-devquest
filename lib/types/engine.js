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
    };
}
/** 构造最小玩家状态。 */
export function freshPlayer(season) {
    return { level: 1, xp: 0, xpTotal: 0, title: titleFor(1).zh, season };
}
/** 构造最小存档。 */
export function freshSave(cwd, season, now = Date.now()) {
    return {
        version: 1,
        cwd,
        player: freshPlayer(season),
        counters: freshCounters(),
        achievements: {},
        lastSeqBySession: {},
        updatedAt: now,
    };
}
/**
 * 加 XP 并处理升级与活跃日统计（返回副本；原存档不变）。
 */
export function addXp(save, gain, now = Date.now()) {
    const s = structuredClone(save);
    if (gain > 0) {
        s.player.xp += gain;
        s.player.xpTotal += gain;
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
export function applyTurn(save, actions, now = Date.now()) {
    const s = structuredClone(save);
    const c = s.counters;
    let toolGain = 0;
    let gain = 0;
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
                break;
            case 'subagent':
                c.subagentsSpawned += a.depth > 0 ? 1 : 0;
                break;
            default:
                break;
        }
    }
    gain += Math.min(toolGain, 10); // 工具 XP 单回合封顶 +10
    const completed = actions.some(a => a.kind === 'turn-completed');
    const failed = actions.some(a => a.kind === 'turn-failed');
    if (completed) {
        c.turnsCompleted++;
        c.consecutiveSuccess++;
        c.lastTurnCompletedAt = now;
        const today = dayKey(now);
        if (c.completedDay === today) {
            c.completedToday++;
        }
        else {
            c.completedDay = today;
            c.completedToday = 1;
        }
        if (c.consecutiveSuccess >= 5)
            gain = Math.round(gain * 1.5); // 连击 ×1.5
    }
    else if (failed) {
        c.turnsFailed++;
        c.consecutiveSuccess = 0;
    }
    // 单回合兜底上限（工具 10 + todo 15 + turn 基础 + tokens，宽松防刷）。
    gain = Math.min(gain, 125);
    return addXp(s, gain, now);
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
export function migrateSave(raw, cwd, season) {
    const base = freshSave(cwd, season, raw.updatedAt ?? Date.now());
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
    };
    out.version = Math.max(1, raw.version ?? 1);
    // 派生字段一致性：称号跟等级走。
    out.player.title = titleFor(out.player.level).zh;
    return out;
}
