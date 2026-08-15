/**
 * DevQuest 类型定义：归一化 Action / 计数器 / 存档 / 成就定义。
 * 全部为可 JSON 序列化的纯数据，跨 host/client 共享。
 */

/** 归一化动作：listener 把 session 事件翻译成计分引擎可消费的最小结构。 */
export type Action =
  | { kind: 'turn-completed'; turn: number }
  | { kind: 'turn-failed'; turn: number }
  | { kind: 'turn-aborted'; turn: number }
  | { kind: 'tool-call'; tool: string }
  | { kind: 'tool-failed'; tool: string }
  | { kind: 'todo-completed'; count: number; allCompleted?: boolean }
  | { kind: 'tokens'; tokens: number }
  | { kind: 'subagent'; depth: number }
  | { kind: 'session-start'; hourOfDay: number; source: string }

/** 计数器（成就判定的输入；extra 字段为成就所需的状态）。 */
export interface Counters {
  turnsCompleted: number
  turnsFailed: number
  consecutiveSuccess: number
  toolCalls: number
  toolCallsByTool: Record<string, number>
  /** edit/write/str-replace-editor 累计（edits_100 用）。 */
  craftTools: number
  todosCompleted: number
  /** 单轮 todo/write 全 completed 的次数（clean_sweep 用）。 */
  cleanSweeps: number
  /** 输出 tokens 累计（season_100k 用）。 */
  tokensOut: number
  subagentsSpawned: number
  /** agent 调用 devquest_status 的次数（self_aware 用）。 */
  devquestCalls: number
  activeDays: number
  /** 连续活跃天数（seven_days 用）。 */
  streakDays: number
  lastActiveDay: string // 'YYYY-MM-DD'
  lastActivityAt: number // epoch ms
  /** 当日 completed 数（grinder 用），跨天清零。 */
  completedToday: number
  completedDay: string // completedToday 所属日期
  /** 最近一次 completed turn 时间（night_owl / early_bird 用）。 */
  lastTurnCompletedAt: number
  /** 最近一次工具失败（oops 用）。 */
  lastErrorTool?: string
  lastErrorAt?: number
  /** 最近一次工具调用（oops 用）。 */
  lastSuccessTool?: string
  lastSuccessAt?: number
  /** 已触发「失败后 1 分钟内同工具成功」（oops 一次性标记）。 */
  oopsFired: boolean
}

/** 玩家面板状态。 */
export interface PlayerState {
  level: number
  xp: number
  xpTotal: number
  title: string // 当前称号（zh）
  season: string
}

/** 存档（~/.dsh/devquest/<cwd-hash>.json）。 */
export interface SaveData {
  version: number
  cwd: string
  player: PlayerState
  counters: Counters
  achievements: Record<string, { acquiredAt: number; xp: number }>
  /** 幂等水位：sessionId → 已处理的最大 event.seq。 */
  lastSeqBySession: Record<string, number>
  updatedAt: number
}

/** 成就分类（面板成就墙分主题 tab）。 */
export type AchievementCategory = 'journey' | 'crafting' | 'quest' | 'time' | 'legend' | 'egg'

/** 成就定义。check 为基于存档（含计数器）的纯函数。 */
export interface AchievementDef {
  id: string // kebab-case 唯一
  category: AchievementCategory
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  icon: string // emoji
  xp: number // 解锁奖励 XP
  hidden?: boolean // 彩蛋（解锁前不显示）
  check: (save: SaveData, now: number) => boolean
}

/** 成就视图（status API / 面板用，含解锁状态）。 */
export interface AchievementView {
  id: string
  category: AchievementCategory
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  icon: string
  xp: number
  hidden: boolean
  unlocked: boolean
  acquiredAt?: number
}

/** DevQuest 状态视图（工具与 HTTP API 共用）。 */
export interface DevQuestStatus {
  cwd: string
  level: number
  xp: number
  xpToNext: number
  title: { zh: string; en: string }
  season: string
  counters: Counters
  achievements: AchievementView[]
  updatedAt: number
}
