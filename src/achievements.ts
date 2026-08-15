/**
 * DevQuest 成就清单（27 枚，开发文档 §6）。
 * check 均为纯函数：基于存档（含计数器）与注入时间判定。
 */
import type { AchievementDef, Counters } from './types.ts'

const SSH_TOOLS = new Set(['ssh_exec', 'ssh_upload', 'ssh_download', 'ssh_tunnel', 'ssh_cluster', 'ssh_list'])

function toolCount(c: Counters, tool: string): number {
  return c.toolCallsByTool[tool] ?? 0
}

function anyTool(c: Counters, tools: readonly string[]): boolean {
  return tools.some(t => toolCount(c, t) > 0)
}

/** 本地时区小时（0-23）。 */
function hourOf(now: number): number {
  return new Date(now).getHours()
}

/** 本地时区分钟。 */
function minuteOf(now: number): number {
  return new Date(now).getMinutes()
}

export const ACHIEVEMENTS: AchievementDef[] = [
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
  {
    id: 'turns_25',
    category: 'journey',
    name: { zh: '二十五回合', en: 'Quarter' },
    description: { zh: '累计完成 25 个回合', en: 'Complete 25 turns in total' },
    icon: '🎗️',
    xp: 150,
    check: s => s.counters.turnsCompleted >= 25,
  },
  {
    id: 'turns_250',
    category: 'journey',
    name: { zh: '两百五十回合', en: 'Stone Giant' },
    description: { zh: '累计完成 250 个回合', en: 'Complete 250 turns in total' },
    icon: '🗿',
    xp: 750,
    check: s => s.counters.turnsCompleted >= 250,
  },
  {
    id: 'comeback_10',
    category: 'journey',
    name: { zh: '百折不挠', en: 'Unbreakable' },
    description: { zh: '10 次失误后重新站起来', en: 'Rise again after 10 failures' },
    icon: '🔄',
    xp: 300,
    check: s => s.counters.comebacks >= 10,
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
  {
    id: 'cmd_100',
    category: 'crafting',
    name: { zh: '百战之身', en: 'Hundred Commands' },
    description: { zh: '累计调用命令行工具 100 次', en: 'Run 100 shell commands in total' },
    icon: '🖥️',
    xp: 200,
    check: s => toolCount(s.counters, 'pwsh') + toolCount(s.counters, 'bash') >= 100,
  },
  {
    id: 'tools_250',
    category: 'crafting',
    name: { zh: '千锤百炼', en: 'Toolsmith' },
    description: { zh: '累计 250 次工具调用', en: '250 tool calls in total' },
    icon: '🔩',
    xp: 300,
    check: s => s.counters.toolCalls >= 250,
  },
  {
    id: 'subagents_10',
    category: 'crafting',
    name: { zh: '将帅之才', en: 'Commander' },
    description: { zh: '累计派出 10 个子代理', en: 'Spawn 10 subagents in total' },
    icon: '🤝',
    xp: 300,
    check: s => s.counters.subagentsSpawned >= 10,
  },
  {
    id: 'edits_500',
    category: 'crafting',
    name: { zh: '铸剑大师', en: 'Sword Smith' },
    description: { zh: '累计 500 次编辑/写入', en: '500 edits or writes in total' },
    icon: '🗜️',
    xp: 400,
    check: s => s.counters.craftTools >= 500,
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
  {
    id: 'daily_quest_10',
    category: 'quest',
    name: { zh: '日日自新', en: 'Daily Grind' },
    description: { zh: '累计完成 10 个每日任务', en: 'Complete 10 daily quests in total' },
    icon: '📅',
    xp: 150,
    check: s => s.counters.dailyQuestsDone >= 10,
  },
  {
    id: 'todos_100',
    category: 'quest',
    name: { zh: '百事通', en: 'Century of Todos' },
    description: { zh: '累计完成 100 个待办', en: 'Complete 100 todos in total' },
    icon: '🏁',
    xp: 600,
    check: s => s.counters.todosCompleted >= 100,
  },
  {
    id: 'daily_quest_30',
    category: 'quest',
    name: { zh: '任务狂人', en: 'Quest Machine' },
    description: { zh: '累计完成 30 个每日任务', en: 'Complete 30 daily quests in total' },
    icon: '🗓️',
    xp: 400,
    check: s => s.counters.dailyQuestsDone >= 30,
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
      const h = hourOf(s.counters.lastTurnCompletedAt)
      return s.counters.turnsCompleted >= 1 && h >= 0 && h < 5
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
      const h = hourOf(s.counters.lastTurnCompletedAt)
      return s.counters.turnsCompleted >= 1 && h >= 5 && h < 8
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
  {
    id: 'night_owl_10',
    category: 'time',
    name: { zh: '夜行者', en: 'Night Walker' },
    description: { zh: '累计 10 次凌晨回合', en: 'Finish 10 turns after midnight' },
    icon: '🌙',
    xp: 400,
    check: s => s.counters.nightTurns >= 10,
  },
  {
    id: 'streak_30',
    category: 'time',
    name: { zh: '月度之约', en: 'Month Streak' },
    description: { zh: '连续 30 天活跃', en: 'Stay active 30 days in a row' },
    icon: '⭐',
    xp: 800,
    check: s => s.counters.streakDays >= 30,
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
    id: 'level_15',
    category: 'legend',
    name: { zh: '宗师之路', en: 'Master Path' },
    description: { zh: '达到 15 级', en: 'Reach level 15' },
    icon: '🛡️',
    xp: 1200,
    check: s => s.player.level >= 15,
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
    id: 'level_25',
    category: 'legend',
    name: { zh: '神话之上', en: 'Mythic' },
    description: { zh: '达到 25 级', en: 'Reach level 25' },
    icon: '🌟',
    xp: 2500,
    check: s => s.player.level >= 25,
  },
  {
    id: 'level_30',
    category: 'legend',
    name: { zh: '太阳神', en: 'Solar Deity' },
    description: { zh: '达到 30 级', en: 'Reach level 30' },
    icon: '☀️',
    xp: 4000,
    check: s => s.player.level >= 30,
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
      const at = s.counters.lastActivityAt
      return at > 0 && hourOf(at) === 4 && minuteOf(at) === 44
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
  {
    id: 'thinker',
    category: 'egg',
    name: { zh: '沉思者', en: 'Deep Thinker' },
    description: { zh: '单回合输出 100k tokens', en: 'Output 100k tokens in a single turn' },
    icon: '🧠',
    xp: 500,
    hidden: true,
    check: s => s.counters.maxTokensTurn >= 100_000,
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
  },
]

/** 按 id 查成就（未命中返回 undefined）。 */
export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}
