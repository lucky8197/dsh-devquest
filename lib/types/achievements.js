const SSH_TOOLS = new Set(['ssh_exec', 'ssh_upload', 'ssh_download', 'ssh_tunnel', 'ssh_cluster', 'ssh_list']);
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
    },
    {
        id: 'turns_10',
        category: 'journey',
        name: { zh: '十回合老兵', en: 'Veteran' },
        description: { zh: '累计完成 10 个回合', en: 'Complete 10 turns in total' },
        icon: '🎖️',
        xp: 100,
        check: s => s.counters.turnsCompleted >= 10,
    },
    {
        id: 'turns_50',
        category: 'journey',
        name: { zh: '五十回合', en: 'Half Century' },
        description: { zh: '累计完成 50 个回合', en: 'Complete 50 turns in total' },
        icon: '🏅',
        xp: 250,
        check: s => s.counters.turnsCompleted >= 50,
    },
    {
        id: 'turns_100',
        category: 'journey',
        name: { zh: '百回合大师', en: 'Centurion' },
        description: { zh: '累计完成 100 个回合', en: 'Complete 100 turns in total' },
        icon: '🏆',
        xp: 500,
        check: s => s.counters.turnsCompleted >= 100,
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
    },
    {
        id: 'edits_100',
        category: 'crafting',
        name: { zh: '百炼成钢', en: 'Hundred Edits' },
        description: { zh: '累计 100 次编辑/写入', en: '100 edits or writes in total' },
        icon: '⚒️',
        xp: 200,
        check: s => s.counters.craftTools >= 100,
    },
    {
        id: 'first_cmd',
        category: 'crafting',
        name: { zh: '号令天下', en: 'First Command' },
        description: { zh: '首次调用命令行工具', en: 'Run a shell command for the first time' },
        icon: '⌨️',
        xp: 50,
        check: s => anyTool(s.counters, ['pwsh', 'bash']),
    },
    {
        id: 'first_remote',
        category: 'crafting',
        name: { zh: '远洋航行', en: 'Voyager' },
        description: { zh: '首次调用 SSH 远程工具', en: 'Use an SSH tool for the first time' },
        icon: '🛰️',
        xp: 100,
        check: s => anyTool(s.counters, [...SSH_TOOLS]),
    },
    {
        id: 'first_subagent',
        category: 'crafting',
        name: { zh: '运筹帷幄', en: 'Strategist' },
        description: { zh: '首次派出子代理', en: 'Spawn your first subagent' },
        icon: '🧠',
        xp: 150,
        check: s => s.counters.subagentsSpawned >= 1,
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
    },
    {
        id: 'todos_10',
        category: 'quest',
        name: { zh: '十全十美', en: 'Decade' },
        description: { zh: '累计完成 10 个待办', en: 'Complete 10 todos in total' },
        icon: '✅',
        xp: 150,
        check: s => s.counters.todosCompleted >= 10,
    },
    {
        id: 'todos_50',
        category: 'quest',
        name: { zh: '使命达人', en: 'Quest Master' },
        description: { zh: '累计完成 50 个待办', en: 'Complete 50 todos in total' },
        icon: '🗺️',
        xp: 400,
        check: s => s.counters.todosCompleted >= 50,
    },
    {
        id: 'clean_sweep',
        category: 'quest',
        name: { zh: '清道夫', en: 'Clean Sweep' },
        description: { zh: '单轮全部待办一次清空', en: 'Clear every todo in a single round' },
        icon: '🧹',
        xp: 200,
        check: s => s.counters.cleanSweeps >= 1,
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
    },
    {
        id: 'grinder',
        category: 'time',
        name: { zh: '肝帝', en: 'Grinder' },
        description: { zh: '单日完成 50 个回合', en: 'Complete 50 turns in one day' },
        icon: '🔥',
        xp: 500,
        check: s => s.counters.completedToday >= 50,
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
    },
    {
        id: 'level_10',
        category: 'legend',
        name: { zh: '锻造宗师', en: 'Forge Master' },
        description: { zh: '达到 10 级', en: 'Reach level 10' },
        icon: '⚔️',
        xp: 800,
        check: s => s.player.level >= 10,
    },
    {
        id: 'level_20',
        category: 'legend',
        name: { zh: '传说降临', en: 'Legend' },
        description: { zh: '达到 20 级', en: 'Reach level 20' },
        icon: '👑',
        xp: 2000,
        check: s => s.player.level >= 20,
    },
    {
        id: 'season_100k',
        category: 'legend',
        name: { zh: '赛季精英', en: 'Season Elite' },
        description: { zh: '赛季内输出 100k tokens', en: 'Output 100k tokens this season' },
        icon: '💎',
        xp: 500,
        check: s => s.counters.tokensOut >= 100_000,
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
];
/** 按 id 查成就（未命中返回 undefined）。 */
export function achievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id);
}
