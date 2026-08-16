const SSH_TOOLS = new Set(['ssh_exec', 'ssh_upload', 'ssh_download', 'ssh_tunnel', 'ssh_cluster', 'ssh_list']);
/** 职业画像表（按工具习惯匹配，命中第一个）。 */
export const CLASSES = [
    { id: 'class-editor', icon: '✏️', name: { zh: '编辑大师', en: 'Edit Master' }, tools: ['edit', 'write', 'str-replace-editor'], minCalls: 200, minTools: 2 },
    { id: 'class-commander', icon: '⌨️', name: { zh: '命令行者', en: 'Command Runner' }, tools: ['pwsh', 'bash', 'terminal'], minCalls: 300 },
    { id: 'class-scholar', icon: '📚', name: { zh: '档案管理员', en: 'Archivist' }, tools: ['read', 'grep', 'glob'], minCalls: 400, minTools: 2 },
    { id: 'class-liason', icon: '🤝', name: { zh: '协调使', en: 'Coordinator' }, tools: ['subagent', 'agent_teams_', 'workflow'], minCalls: 20, minTools: 2 },
    { id: 'class-crafter', icon: '🧱', name: { zh: '锻造师', en: 'Crafter' }, tools: ['skill_manage', 'skill', 'memory', 'dtodo'], minCalls: 50, minTools: 2 },
    { id: 'class-multitool', icon: '🎭', name: { zh: '多面手', en: 'Versatile' }, tools: [], minCalls: 0, minTools: 12 },
];
/** 今日使用过的工具名（去重；jack_of_all / dq_distinct_8 用），跨天清零。 */
export function isClassTool(tool, cls) {
    if (cls.tools.length === 0)
        return true;
    return cls.tools.some(prefix => tool.startsWith(prefix));
}
/**
 * 识别玩家职业画像：统计工具调用分布，按 CLASSES 表匹配。
 * 无匹配时返回 null（玩家还不够专注）。
 */
export function computeClass(counters) {
    const byTool = counters.toolCallsByTool ?? {};
    for (const cls of CLASSES) {
        if (cls.tools.length === 0) {
            // 多面手：今日用过 ≥minTools 种不同工具。
            const distinct = counters.todayTools?.length ?? 0;
            if (distinct >= (cls.minTools ?? 0))
                return cls;
            continue;
        }
        const matched = [];
        let total = 0;
        for (const tool of Object.keys(byTool)) {
            if (isClassTool(tool, cls)) {
                total += byTool[tool] ?? 0;
                if ((byTool[tool] ?? 0) > 0)
                    matched.push(tool);
            }
        }
        const minTools = cls.minTools ?? 1;
        if (total >= cls.minCalls && matched.length >= minTools)
            return cls;
    }
    return null;
}
function toolCount(c, tool) {
    return c.toolCallsByTool[tool] ?? 0;
}
function anyTool(c, tools) {
    return tools.some(t => toolCount(c, t) > 0);
}
/** 本地时区小时（0-23）。 */
function hourOf(now) {
    return new Date(now).getHours();
}
/** 本地时区分钟。 */
function minuteOf(now) {
    return new Date(now).getMinutes();
}
/** 计数成就的进度（current/goal）。 */
function countProgress(get, goal) {
    return (s) => ({ current: Math.min(get(s), goal), goal });
}
export const ACHIEVEMENTS = [
    // ⚔️ 旅程 Journey
    {
        id: 'first_turn',
        category: 'journey',
        name: { zh: '初出茅庐', en: 'First Steps' },
        description: { zh: '完成首个回合', en: 'Complete your first turn' },
        icon: '🚶',
        xp: 50,
        check: s => s.counters.turnsCompleted >= 1,
        progress: countProgress(s => s.counters.turnsCompleted, 1),
    },
    {
        id: 'turns_10',
        category: 'journey',
        name: { zh: '十回合老兵', en: 'Veteran' },
        description: { zh: '累计完成 10 个回合', en: 'Complete 10 turns in total' },
        icon: '🎖️',
        xp: 100,
        check: s => s.counters.turnsCompleted >= 10,
        progress: countProgress(s => s.counters.turnsCompleted, 10),
    },
    {
        id: 'turns_50',
        category: 'journey',
        name: { zh: '五十回合', en: 'Half Century' },
        description: { zh: '累计完成 50 个回合', en: 'Complete 50 turns in total' },
        icon: '🏅',
        xp: 250,
        check: s => s.counters.turnsCompleted >= 50,
        progress: countProgress(s => s.counters.turnsCompleted, 50),
    },
    {
        id: 'turns_100',
        category: 'journey',
        name: { zh: '百回合大师', en: 'Centurion' },
        description: { zh: '累计完成 100 个回合', en: 'Complete 100 turns in total' },
        icon: '🏆',
        xp: 500,
        check: s => s.counters.turnsCompleted >= 100,
        progress: countProgress(s => s.counters.turnsCompleted, 100),
    },
    {
        id: 'comeback',
        category: 'journey',
        name: { zh: '东山再起', en: 'Comeback' },
        description: { zh: '首次失误后重新完成一个回合', en: 'Complete a turn after your first failure' },
        icon: '💪',
        xp: 100,
        check: s => s.counters.turnsFailed >= 1 && s.counters.turnsCompleted >= 1,
    },
    {
        id: 'steel_will',
        category: 'journey',
        name: { zh: '钢铁意志', en: 'Iron Will' },
        description: { zh: '连续 25 个回合零失误', en: '25 consecutive turns without failure' },
        icon: '🛡️',
        xp: 400,
        check: s => s.counters.consecutiveSuccess >= 25,
        progress: countProgress(s => s.counters.consecutiveSuccess, 25),
    },
    {
        id: 'turns_25',
        category: 'journey',
        name: { zh: '二十五回合', en: 'Quarter' },
        description: { zh: '累计完成 25 个回合', en: 'Complete 25 turns in total' },
        icon: '🎗️',
        xp: 150,
        check: s => s.counters.turnsCompleted >= 25,
        progress: countProgress(s => s.counters.turnsCompleted, 25),
    },
    {
        id: 'turns_250',
        category: 'journey',
        name: { zh: '两百五十回合', en: 'Stone Giant' },
        description: { zh: '累计完成 250 个回合', en: 'Complete 250 turns in total' },
        icon: '🗿',
        xp: 750,
        check: s => s.counters.turnsCompleted >= 250,
        progress: countProgress(s => s.counters.turnsCompleted, 250),
    },
    {
        id: 'comeback_10',
        category: 'journey',
        name: { zh: '百折不挠', en: 'Unbreakable' },
        description: { zh: '10 次失误后重新站起来', en: 'Rise again after 10 failures' },
        icon: '🔄',
        xp: 300,
        check: s => s.counters.comebacks >= 10,
        progress: countProgress(s => s.counters.comebacks, 10),
    },
    // 🛠️ 锻造 Crafting
    {
        id: 'first_edit',
        category: 'crafting',
        name: { zh: '初试锋芒', en: 'First Edit' },
        description: { zh: '首次成功调用编辑工具', en: 'Call an editing tool for the first time' },
        icon: '✏️',
        xp: 50,
        check: s => toolCount(s.counters, 'edit') + toolCount(s.counters, 'str-replace-editor') >= 1,
        progress: countProgress(s => toolCount(s.counters, 'edit') + toolCount(s.counters, 'str-replace-editor'), 1),
    },
    {
        id: 'edits_100',
        category: 'crafting',
        name: { zh: '百炼成钢', en: 'Hundred Edits' },
        description: { zh: '累计 100 次编辑/写入', en: '100 edits or writes in total' },
        icon: '⚒️',
        xp: 200,
        check: s => s.counters.craftTools >= 100,
        progress: countProgress(s => s.counters.craftTools, 100),
    },
    {
        id: 'first_cmd',
        category: 'crafting',
        name: { zh: '号令天下', en: 'First Command' },
        description: { zh: '首次调用命令行工具', en: 'Run a shell command for the first time' },
        icon: '⌨️',
        xp: 50,
        check: s => anyTool(s.counters, ['pwsh', 'bash']),
        progress: countProgress(s => toolCount(s.counters, 'pwsh') + toolCount(s.counters, 'bash'), 1),
    },
    {
        id: 'first_remote',
        category: 'crafting',
        name: { zh: '远洋航行', en: 'Voyager' },
        description: { zh: '首次调用 SSH 远程工具', en: 'Use an SSH tool for the first time' },
        icon: '🛰️',
        xp: 100,
        check: s => anyTool(s.counters, [...SSH_TOOLS]),
        progress: countProgress(s => [...SSH_TOOLS].reduce((sum, t) => sum + toolCount(s.counters, t), 0), 1),
    },
    {
        id: 'first_subagent',
        category: 'crafting',
        name: { zh: '运筹帷幄', en: 'Strategist' },
        description: { zh: '首次派出子代理', en: 'Spawn your first subagent' },
        icon: '🧠',
        xp: 150,
        check: s => s.counters.subagentsSpawned >= 1,
        progress: countProgress(s => s.counters.subagentsSpawned, 1),
    },
    {
        id: 'tool_666',
        category: 'crafting',
        name: { zh: '恶魔的低语', en: 'Whisper of 666' },
        description: { zh: '累计 666 次工具调用', en: '666 tool calls in total' },
        icon: '😈',
        xp: 666,
        hidden: true,
        check: s => s.counters.toolCalls >= 666,
        progress: countProgress(s => s.counters.toolCalls, 666),
    },
    {
        id: 'cmd_100',
        category: 'crafting',
        name: { zh: '百战之身', en: 'Hundred Commands' },
        description: { zh: '累计调用命令行工具 100 次', en: 'Run 100 shell commands in total' },
        icon: '🖥️',
        xp: 200,
        check: s => toolCount(s.counters, 'pwsh') + toolCount(s.counters, 'bash') >= 100,
        progress: countProgress(s => toolCount(s.counters, 'pwsh') + toolCount(s.counters, 'bash'), 100),
    },
    {
        id: 'tools_250',
        category: 'crafting',
        name: { zh: '千锤百炼', en: 'Toolsmith' },
        description: { zh: '累计 250 次工具调用', en: '250 tool calls in total' },
        icon: '🔩',
        xp: 300,
        check: s => s.counters.toolCalls >= 250,
        progress: countProgress(s => s.counters.toolCalls, 250),
    },
    {
        id: 'subagents_10',
        category: 'crafting',
        name: { zh: '将帅之才', en: 'Commander' },
        description: { zh: '累计派出 10 个子代理', en: 'Spawn 10 subagents in total' },
        icon: '🤝',
        xp: 300,
        check: s => s.counters.subagentsSpawned >= 10,
        progress: countProgress(s => s.counters.subagentsSpawned, 10),
    },
    {
        id: 'edits_500',
        category: 'crafting',
        name: { zh: '铸剑大师', en: 'Sword Smith' },
        description: { zh: '累计 500 次编辑/写入', en: '500 edits or writes in total' },
        icon: '🗜️',
        xp: 400,
        check: s => s.counters.craftTools >= 500,
        progress: countProgress(s => s.counters.craftTools, 500),
    },
    // ✅ 使命 Quest
    {
        id: 'first_todo',
        category: 'quest',
        name: { zh: '使命开始', en: 'Quest Accepted' },
        description: { zh: '完成首个待办', en: 'Complete your first todo' },
        icon: '📜',
        xp: 50,
        check: s => s.counters.todosCompleted >= 1,
        progress: countProgress(s => s.counters.todosCompleted, 1),
    },
    {
        id: 'todos_10',
        category: 'quest',
        name: { zh: '十全十美', en: 'Decade' },
        description: { zh: '累计完成 10 个待办', en: 'Complete 10 todos in total' },
        icon: '✅',
        xp: 150,
        check: s => s.counters.todosCompleted >= 10,
        progress: countProgress(s => s.counters.todosCompleted, 10),
    },
    {
        id: 'todos_50',
        category: 'quest',
        name: { zh: '使命达人', en: 'Quest Master' },
        description: { zh: '累计完成 50 个待办', en: 'Complete 50 todos in total' },
        icon: '🗺️',
        xp: 400,
        check: s => s.counters.todosCompleted >= 50,
        progress: countProgress(s => s.counters.todosCompleted, 50),
    },
    {
        id: 'clean_sweep',
        category: 'quest',
        name: { zh: '清道夫', en: 'Clean Sweep' },
        description: { zh: '单轮全部待办一次清空', en: 'Clear every todo in a single round' },
        icon: '🧹',
        xp: 200,
        check: s => s.counters.cleanSweeps >= 1,
        progress: countProgress(s => s.counters.cleanSweeps, 1),
    },
    {
        id: 'daily_quest_10',
        category: 'quest',
        name: { zh: '日日自新', en: 'Daily Grind' },
        description: { zh: '累计完成 10 个每日任务', en: 'Complete 10 daily quests in total' },
        icon: '📅',
        xp: 150,
        check: s => s.counters.dailyQuestsDone >= 10,
        progress: countProgress(s => s.counters.dailyQuestsDone, 10),
    },
    {
        id: 'todos_100',
        category: 'quest',
        name: { zh: '百事通', en: 'Century of Todos' },
        description: { zh: '累计完成 100 个待办', en: 'Complete 100 todos in total' },
        icon: '🏁',
        xp: 600,
        check: s => s.counters.todosCompleted >= 100,
        progress: countProgress(s => s.counters.todosCompleted, 100),
    },
    {
        id: 'daily_quest_30',
        category: 'quest',
        name: { zh: '任务狂人', en: 'Quest Machine' },
        description: { zh: '累计完成 30 个每日任务', en: 'Complete 30 daily quests in total' },
        icon: '🗓️',
        xp: 400,
        check: s => s.counters.dailyQuestsDone >= 30,
        progress: countProgress(s => s.counters.dailyQuestsDone, 30),
    },
    // ⏰ 时光 Time
    {
        id: 'night_owl',
        category: 'time',
        name: { zh: '夜猫子', en: 'Night Owl' },
        description: { zh: '凌晨 0-5 点完成一个回合', en: 'Complete a turn between 0-5 AM' },
        icon: '🦉',
        xp: 150,
        check: s => {
            const h = hourOf(s.counters.lastTurnCompletedAt);
            return s.counters.turnsCompleted >= 1 && h >= 0 && h < 5;
        },
    },
    {
        id: 'early_bird',
        category: 'time',
        name: { zh: '早起的鸟儿', en: 'Early Bird' },
        description: { zh: '清晨 5-8 点完成一个回合', en: 'Complete a turn between 5-8 AM' },
        icon: '🐦',
        xp: 100,
        check: s => {
            const h = hourOf(s.counters.lastTurnCompletedAt);
            return s.counters.turnsCompleted >= 1 && h >= 5 && h < 8;
        },
    },
    {
        id: 'seven_days',
        category: 'time',
        name: { zh: '七日之约', en: 'Week Streak' },
        description: { zh: '连续 7 天活跃', en: 'Stay active 7 days in a row' },
        icon: '📆',
        xp: 300,
        check: s => s.counters.streakDays >= 7,
        progress: countProgress(s => s.counters.streakDays, 7),
    },
    {
        id: 'grinder',
        category: 'time',
        name: { zh: '肝帝', en: 'Grinder' },
        description: { zh: '单日完成 50 个回合', en: 'Complete 50 turns in one day' },
        icon: '🔥',
        xp: 500,
        check: s => s.counters.completedToday >= 50,
        progress: countProgress(s => s.counters.completedToday, 50),
    },
    {
        id: 'night_owl_10',
        category: 'time',
        name: { zh: '夜行者', en: 'Night Walker' },
        description: { zh: '累计 10 次凌晨回合', en: 'Finish 10 turns after midnight' },
        icon: '🌙',
        xp: 400,
        check: s => s.counters.nightTurns >= 10,
        progress: countProgress(s => s.counters.nightTurns, 10),
    },
    {
        id: 'streak_30',
        category: 'time',
        name: { zh: '月度之约', en: 'Month Streak' },
        description: { zh: '连续 30 天活跃', en: 'Stay active 30 days in a row' },
        icon: '⭐',
        xp: 800,
        check: s => s.counters.streakDays >= 30,
        progress: countProgress(s => s.counters.streakDays, 30),
    },
    // 💎 传奇 Legend
    {
        id: 'level_5',
        category: 'legend',
        name: { zh: '工匠之路', en: 'Artisan Path' },
        description: { zh: '达到 5 级', en: 'Reach level 5' },
        icon: '🔨',
        xp: 300,
        check: s => s.player.level >= 5,
        progress: countProgress(s => s.player.level, 5),
    },
    {
        id: 'level_10',
        category: 'legend',
        name: { zh: '锻造宗师', en: 'Forge Master' },
        description: { zh: '达到 10 级', en: 'Reach level 10' },
        icon: '⚔️',
        xp: 800,
        check: s => s.player.level >= 10,
        progress: countProgress(s => s.player.level, 10),
    },
    {
        id: 'level_15',
        category: 'legend',
        name: { zh: '宗师之路', en: 'Master Path' },
        description: { zh: '达到 15 级', en: 'Reach level 15' },
        icon: '🛡️',
        xp: 1200,
        check: s => s.player.level >= 15,
        progress: countProgress(s => s.player.level, 15),
    },
    {
        id: 'level_20',
        category: 'legend',
        name: { zh: '传说降临', en: 'Legend' },
        description: { zh: '达到 20 级', en: 'Reach level 20' },
        icon: '👑',
        xp: 2000,
        check: s => s.player.level >= 20,
        progress: countProgress(s => s.player.level, 20),
    },
    {
        id: 'level_25',
        category: 'legend',
        name: { zh: '神话之上', en: 'Mythic' },
        description: { zh: '达到 25 级', en: 'Reach level 25' },
        icon: '🌟',
        xp: 2500,
        check: s => s.player.level >= 25,
        progress: countProgress(s => s.player.level, 25),
    },
    {
        id: 'level_30',
        category: 'legend',
        name: { zh: '太阳神', en: 'Solar Deity' },
        description: { zh: '达到 30 级', en: 'Reach level 30' },
        icon: '☀️',
        xp: 4000,
        check: s => s.player.level >= 30,
        progress: countProgress(s => s.player.level, 30),
    },
    {
        id: 'season_100k',
        category: 'legend',
        name: { zh: '赛季精英', en: 'Season Elite' },
        description: { zh: '本赛季内输出 100k tokens', en: 'Output 100k tokens this season' },
        icon: '💎',
        xp: 500,
        check: s => s.counters.seasonTokensOut >= 100_000,
        progress: countProgress(s => s.counters.seasonTokensOut, 100_000),
    },
    // 🥚 彩蛋 Easter Eggs（hidden）
    {
        id: 'devil_hour',
        category: 'egg',
        name: { zh: '魔鬼时刻', en: "Devil's Hour" },
        description: { zh: '凌晨 4:44 仍在行动', en: 'Be active at 4:44 AM' },
        icon: '👹',
        xp: 444,
        hidden: true,
        check: s => {
            const at = s.counters.lastActivityAt;
            return at > 0 && hourOf(at) === 4 && minuteOf(at) === 44;
        },
    },
    {
        id: 'self_aware',
        category: 'egg',
        name: { zh: '觉醒', en: 'Self-Aware' },
        description: { zh: 'agent 主动查询了自己的 DevQuest 进度', en: 'The agent checks its own DevQuest progress' },
        icon: '🤖',
        xp: 233,
        hidden: true,
        check: s => s.counters.devquestCalls >= 1,
        progress: countProgress(s => s.counters.devquestCalls, 1),
    },
    {
        id: 'oops',
        category: 'egg',
        name: { zh: '手滑', en: 'Oops' },
        description: { zh: '工具失败后 1 分钟内同一工具调用成功', en: 'Succeed with a tool within 1 minute of failing it' },
        icon: '🙃',
        xp: 50,
        hidden: true,
        check: s => s.counters.oopsFired === true,
    },
    {
        id: 'thinker',
        category: 'egg',
        name: { zh: '沉思者', en: 'Deep Thinker' },
        description: { zh: '单回合输出 100k tokens', en: 'Output 100k tokens in a single turn' },
        icon: '🧠',
        xp: 500,
        hidden: true,
        check: s => s.counters.maxTokensTurn >= 100_000,
        progress: countProgress(s => s.counters.maxTokensTurn, 100_000),
    },
    {
        id: 'jack_of_all',
        category: 'egg',
        name: { zh: '百变大咖', en: 'Jack of All Trades' },
        description: { zh: '单日使用 10 种不同的工具', en: 'Use 10 different tools in one day' },
        icon: '🎭',
        xp: 300,
        hidden: true,
        check: s => s.counters.todayTools.length >= 10,
        progress: countProgress(s => s.counters.todayTools.length, 10),
    },
    // v0.8.0 新彩蛋
    {
        id: 'keyboard_warrior',
        category: 'egg',
        name: { zh: '键盘侠', en: 'Keyboard Warrior' },
        description: { zh: '任一工具累计调用 100 次', en: 'Call any single tool 100 times' },
        icon: '⌨️',
        xp: 200,
        hidden: true,
        check: s => Object.values(s.counters.toolCallsByTool).some(n => n >= 100),
    },
    {
        id: 'midnight_bell',
        category: 'egg',
        name: { zh: '午夜钟声', en: 'Midnight Bell' },
        description: { zh: '23:55-00:05 之间完成一个回合', en: 'Finish a turn between 23:55 and 00:05' },
        icon: '🔔',
        xp: 250,
        hidden: true,
        check: s => {
            const at = s.counters.lastTurnCompletedAt;
            if (at <= 0)
                return false;
            const h = hourOf(at);
            const m = minuteOf(at);
            return (h === 23 && m >= 55) || (h === 0 && m <= 5);
        },
    },
    {
        id: 'combo_master',
        category: 'egg',
        name: { zh: '连击大师', en: 'Combo Master' },
        description: { zh: '连击达到 40', en: 'Reach a 40-turn combo' },
        icon: '🔥',
        xp: 350,
        hidden: true,
        check: s => s.counters.consecutiveSuccess >= 40,
        progress: countProgress(s => s.counters.consecutiveSuccess, 40),
    },
    // v1.2.0 新成就
    {
        id: 'turns_500',
        category: 'journey',
        name: { zh: '五百回合', en: 'Quincentenary' },
        description: { zh: '累计完成 500 个回合', en: 'Complete 500 turns in total' },
        icon: '⚔️',
        xp: 800,
        check: s => s.counters.turnsCompleted >= 500,
        progress: countProgress(s => s.counters.turnsCompleted, 500),
    },
    {
        id: 'edits_1000',
        category: 'crafting',
        name: { zh: '千锤百炼', en: 'Thousand Hammers' },
        description: { zh: '累计 1000 次编辑/写入', en: '1000 edits or writes in total' },
        icon: '🔨',
        xp: 800,
        check: s => s.counters.craftTools >= 1000,
        progress: countProgress(s => s.counters.craftTools, 1000),
    },
    {
        id: 'daily_quest_50',
        category: 'quest',
        name: { zh: '任务宗师', en: 'Quest Grandmaster' },
        description: { zh: '累计完成 50 个每日任务', en: 'Complete 50 daily quests in total' },
        icon: '🏅',
        xp: 600,
        check: s => s.counters.dailyQuestsDone >= 50,
        progress: countProgress(s => s.counters.dailyQuestsDone, 50),
    },
    {
        id: 'streak_14',
        category: 'time',
        name: { zh: '双周之约', en: 'Fortnight' },
        description: { zh: '连续 14 天活跃', en: 'Stay active 14 days in a row' },
        icon: '📅',
        xp: 400,
        check: s => s.counters.streakDays >= 14,
        progress: countProgress(s => s.counters.streakDays, 14),
    },
    {
        id: 'lunch_break',
        category: 'egg',
        name: { zh: '午间小憩', en: 'Lunch Break' },
        description: { zh: '12:00-13:00 之间完成回合', en: 'Complete a turn between 12:00 and 13:00' },
        icon: '🍚',
        xp: 150,
        hidden: true,
        check: (s, now) => {
            const h = hourOf(now);
            return h >= 12 && h < 13 && s.counters.turnsCompleted >= 1;
        },
    },
    // v1.3.0 新成就（职业 ×2 / Boss ×2 / 每日目标 ×1 / 彩蛋 ×1）
    {
        id: 'class_editor',
        category: 'crafting',
        name: { zh: '编辑大师', en: 'Edit Master' },
        description: { zh: '达成编辑大师职业画像（编辑/写入类工具 ≥200 次且 ≥2 种）', en: 'Become an Edit Master (200+ edits across 2+ edit tools)' },
        icon: '✏️',
        xp: 500,
        check: s => computeClass(s.counters)?.id === 'class-editor',
        progress: countProgress(s => Object.entries(s.counters.toolCallsByTool ?? {})
            .filter(([t]) => isClassTool(t, CLASSES[0]))
            .reduce((a, [, n]) => a + n, 0), 200),
    },
    {
        id: 'class_versatile',
        category: 'legend',
        name: { zh: '百变星君', en: 'Versatile Star' },
        description: { zh: '达成多面手职业画像（单日使用 ≥12 种工具）', en: 'Turn into a Versatile (12+ distinct tools in one day)' },
        icon: '🎭',
        xp: 500,
        check: s => computeClass(s.counters)?.id === 'class-multitool',
        progress: countProgress(s => s.counters.todayTools?.length ?? 0, 12),
    },
    {
        id: 'boss_slayer',
        category: 'quest',
        name: { zh: '首杀讨伐', en: 'First Hunt' },
        description: { zh: '击败任意一只每周 BOSS', en: 'Defeat any weekly boss' },
        icon: '🐉',
        xp: 300,
        check: s => (s.counters.bossSlain ?? 0) >= 1,
        progress: countProgress(s => s.counters.bossSlain ?? 0, 1),
    },
    {
        id: 'boss_3',
        category: 'quest',
        name: { zh: '猎龙者', en: 'Dragonslayer' },
        description: { zh: '累计击败 3 只每周 BOSS', en: 'Defeat 3 weekly bosses in total' },
        icon: '🗡️',
        xp: 800,
        check: s => (s.counters.bossSlain ?? 0) >= 3,
        progress: countProgress(s => s.counters.bossSlain ?? 0, 3),
    },
    {
        id: 'goal_1',
        category: 'time',
        name: { zh: '今日达标', en: 'On Target' },
        description: { zh: '首次达成每日 XP 目标', en: 'Reach your daily XP goal once' },
        icon: '🎯',
        xp: 200,
        check: s => (s.counters.goalDays ?? 0) >= 1,
        progress: countProgress(s => s.counters.goalDays ?? 0, 1),
    },
    {
        id: 'egg_boss_dusk',
        category: 'egg',
        name: { zh: '黄昏讨伐', en: 'Dusk Hunt' },
        description: { zh: '21:00-22:00 之间击败每周 BOSS', en: 'Defeat a weekly boss between 21:00 and 22:00' },
        icon: '🦇',
        xp: 150,
        hidden: true,
        check: (s, now) => {
            const h = hourOf(now);
            return h >= 21 && h < 22 && (s.counters.bossSlain ?? 0) >= 1;
        },
    },
];
/** 按 id 查成就（未命中返回 undefined）。 */
export function achievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id);
}
/** 成就稀有度表（id → rarity；缺省 common）。按达成难度/里程碑价值分级。 */
export const ACHIEVEMENT_RARITY = {
    // 旅程
    first_turn: 'common',
    turns_10: 'common',
    turns_25: 'rare',
    turns_50: 'rare',
    turns_100: 'epic',
    turns_250: 'legendary',
    comeback: 'common',
    comeback_10: 'legendary',
    steel_will: 'epic',
    // 锻造
    first_edit: 'common',
    edits_100: 'rare',
    edits_500: 'epic',
    first_cmd: 'common',
    first_remote: 'rare',
    first_subagent: 'common',
    subagents_10: 'epic',
    tool_666: 'legendary',
    cmd_100: 'rare',
    tools_250: 'rare',
    // 使命
    first_todo: 'common',
    todos_10: 'rare',
    todos_50: 'rare',
    todos_100: 'epic',
    clean_sweep: 'rare',
    daily_quest_10: 'rare',
    daily_quest_30: 'epic',
    // 时光
    night_owl: 'common',
    early_bird: 'common',
    night_owl_10: 'epic',
    seven_days: 'rare',
    streak_30: 'legendary',
    grinder: 'epic',
    // 传奇
    level_5: 'rare',
    level_10: 'epic',
    level_15: 'epic',
    level_20: 'legendary',
    level_25: 'legendary',
    level_30: 'legendary',
    season_100k: 'rare',
    // 彩蛋
    devil_hour: 'legendary',
    self_aware: 'rare',
    oops: 'common',
    thinker: 'epic',
    jack_of_all: 'epic',
    // v0.8.0
    keyboard_warrior: 'epic',
    midnight_bell: 'epic',
    combo_master: 'epic',
    // v1.2.0
    turns_500: 'legendary',
    edits_1000: 'legendary',
    daily_quest_50: 'legendary',
    streak_14: 'epic',
    lunch_break: 'rare',
    // v1.3.0
    class_editor: 'epic',
    class_versatile: 'epic',
    boss_slayer: 'rare',
    boss_3: 'legendary',
    goal_1: 'rare',
    egg_boss_dusk: 'rare',
};
/** 取成就稀有度（缺省 common）。 */
export function rarityOf(id) {
    return ACHIEVEMENT_RARITY[id] ?? 'common';
}
