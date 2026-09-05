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
  /** 历史最高连续活跃天数（v1.1：连续奖励阶梯用，达到新档位才发奖）。 */
  streakBest?: number
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
  /** 累计完成的每日任务数（daily_quest_10 用）。 */
  dailyQuestsDone: number
  /** 东山再起次数：失误后重新完成的回合数（comeback_10 / dq_comeback_1 用）。 */
  comebacks: number
  /** 凌晨(0-5h)完成的回合数（night_owl_10 / dq_night_1 用）。 */
  nightTurns: number
  /** 单回合最大输出 tokens（thinker 用）。 */
  maxTokensTurn: number
  /** 本赛季输出 tokens（season_100k 用），换季清零。 */
  seasonTokensOut: number
  /** 今日使用过的工具名（去重；jack_of_all / dq_distinct_8 用），跨天清零。 */
  todayTools: string[]
  todayToolsDay: string
  /** v1.3.0 今日获得 XP（跨天归零；每日 XP 目标用）。 */
  todayXp?: number
  todayXpDay?: string
  /** v1.3.0 累计击败每周 BOSS 次数（boss_slayer / boss_3 用，跨赛季累计）。 */
  bossSlain?: number
  /** v1.3.0 累计达成每日 XP 目标的次数（goal_done_3 用）。 */
  goalDays?: number
  /** v1.4.0 距上次随机事件卡的已完成回合数（每 EVENT_EVERY_TURNS 触发一次）。 */
  turnsSinceEvent?: number
}

/** 单个每日任务。 */
export interface DailyQuest {
  id: string
  /** 任务目标名（面板/工具展示用）。 */
  label: { zh: string; en: string }
  goal: number
  reward: number
  progress: number
  done: boolean
  claimedAt?: number
  /**
   * 重掷起点（v1.3.3 防刷）：重掷引入的新任务记录重掷瞬间的进度基线，
   * 进度从基线重新计算——换任务不白送"历史计数已达标"的奖励。
   * 默认任务无此字段（progress 从 0 起算）。
   */
  base?: number
}

/** 每日任务状态（每天按日期确定性刷新）。 */
export interface DailyQuestState {
  /** 任务所属日 'YYYY-MM-DD'。 */
  date: string
  quests: DailyQuest[]
  /** 全清宝箱是否已领取（每天一次，3 个任务全完成可领 +50 XP）。 */
  chestClaimed?: boolean
}

/** 玩家面板状态。 */
export interface PlayerState {
  level: number
  xp: number
  xpTotal: number
  title: string // 当前称号（zh）
  season: string // 当前赛季 id（如 2026-S3）
  /** 本赛季获得的 XP（换季清零，累计 XP 保留）。 */
  seasonXp: number
  /** 当前等级起始时间（升级体验：面板展示升到本级的用时）。 */
  levelStartedAt?: number
  /** v1.3.0 每日 XP 目标（0=关闭；达成一次性 +50 XP）。 */
  dailyGoal?: number
  /** v1.3.0 每日目标已领取的日期（'YYYY-MM-DD'，每天一次）。 */
  dailyGoalClaimedDay?: string
  /** v1.3.0 赛季结束结算报告（换季时自动生成，展示上赛季战绩）。 */
  seasonSummary?: {
    season: string
    level: number
    comboBest: number
    seasonXp: number
    achievements: number
  }
  /** v1.3.0 已发放过赛季纪念奖励的赛季 id（防换季重放重复发）。 */
  seasonSettled?: Record<string, boolean>
}

/** 称号解锁状态（多称号系统：除等级称号外，条件解锁可切换）。 */
export interface TitlesState {
  /** 已解锁称号 id 列表。 */
  unlocked: string[]
  /** 当前展示称号 id（空 = 跟随等级）。 */
  active: string
}

/** 单个每周挑战任务。 */
export interface WeeklyQuest {
  id: string
  label: { zh: string; en: string }
  goal: number
  reward: number
  progress: number
  done: boolean
  claimedAt?: number
}

/** 每周挑战状态（按 ISO 周确定性刷新）。 */
export interface WeeklyQuestState {
  /** 周键 'YYYY-Www'（ISO 周）。 */
  week: string
  quests: WeeklyQuest[]
  /** 全清奖励是否已领取（3 个全完成可领一次 +100 XP）。 */
  bonusClaimed?: boolean
  /** v1.3.0 本周 BOSS 掉落是否已领取。 */
  bossClaimed?: boolean
}

/** 每日历史记录（成长周报：按日累计 XP/回合）。 */
export interface DayHistory {
  /** 当日获得 XP。 */
  xp: number
  /** 当日完成回合数。 */
  turns: number
}

/** 赛季商店状态（用本赛季 XP 消费，换季归零）。 */
export interface ShopState {
  /** 本赛季累计消费（余额 = seasonXp - spent）。 */
  spent: number
  /** 连击保险库存（失败回合自动消耗一个，保住连击）。 */
  shields: number
  /** 每日任务重掷次数（库存）。 */
  rerolls: number
  /** 当前激活的面板主题（id，空=默认）。 */
  theme: string
  /** 已购面板主题（id 列表，永久拥有，可切换）。 */
  themes: string[]
  /** 已购称号徽章（id 列表）。 */
  badges: string[]
  /** 经验加成剩余回合数（v1.1：商店经验卡，回合结算时 +50% XP）。 */
  xpBoostTurns?: number
  /** 任务跳过卡库存（v1.1：直接完成一个未做的每日任务）。 */
  questSkips?: number
  /** 赛季通行证已领取档位 id 列表（v1.1，赛季内累积）。 */
  passClaimed?: string[]
  /** v1.3.0 每周 BOSS 掉落的额外赛季货币（换季清零；shopBalance 计入）。 */
  bossEarned?: number
}

/** 商店商品定义。 */
export interface ShopItemDef {
  id: string // 唯一 id（如 combo-shield / theme-ember / badge-crown）
  kind: 'shield' | 'reroll' | 'theme' | 'badge' | 'boost' | 'skip'
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  icon: string
  price: number // 赛季货币
}

/** 商店商品视图（含是否已购）。 */
export interface ShopItemView extends ShopItemDef {
  owned: boolean
}

/** 新手任务链：5 步引导主线。 */
export interface TutorialState {
  /** stepId → 完成时间戳。 */
  steps: Record<string, number>
  /** 全部完成（解锁专属称号）。 */
  done: boolean
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
  /** 每日任务状态。 */
  daily: DailyQuestState
  /** 每周挑战状态。 */
  weekly?: WeeklyQuestState
  /** 多称号状态。 */
  titles?: TitlesState
  /** 荣誉墙：历史赛季最高纪录（season id → 最佳成绩）。 */
  records?: Record<string, { level: number; combo: number; seasonXp: number }>
  /** 最近回合结算事件（面板 toast 用，保留最近 N 条）。 */
  settlements?: TurnSettlementEvent[]
  /** 每日历史（成长周报），date → 当日累计，保留最近 HISTORY_KEEP 天。 */
  history?: Record<string, DayHistory>
  /** 赛季商店状态。 */
  shop?: ShopState
  /** 新手任务链状态。 */
  tutorial?: TutorialState
  /** 分类收藏奖励状态。 */
  collections?: CollectionState
  /** 每日幸运抽奖状态（每天一次）。 */
  lucky?: { date: string; claimed: boolean }
  // ---- v1.4.0 冒险扩展 ----
  /** 活跃冒险事件（随机事件卡生效中的 buff/诅咒；choice 型即时结算不入驻）。 */
  events?: ActiveEvent[]
  /** 开发者圣物收藏（掉落收集，跨赛季保留）。 */
  relics?: RelicRecord[]
  /** 史诗任务链（跨天剧情任务）状态。 */
  questChain?: QuestChainState
  /** 幽灵竞速（本周 vs 上周自己的数据对决）。 */
  ghostRace?: GhostRaceState
  updatedAt: number
}

// ---------------------------------------------------------------------------
// v1.4.0 冒险扩展类型：随机事件卡 / 连击姿态（派生）/ 圣物 / 史诗任务链 / 幽灵竞速
// ---------------------------------------------------------------------------

/** 活跃冒险事件（随机事件卡的持续型效果）。 */
export interface ActiveEvent {
  /** 实例 id（触发时刻生成，防重复结算）。 */
  id: string
  /** 效果 id（EVENT_POOL 键）。 */
  effectId: string
  gainedAt: number
  /** 到期时刻（时间窗口；未设置 = 回合窗口）。 */
  expiresAt?: number
  /** 剩余有效回合数（回合窗口；引擎每逢 completed 回合递减）。 */
  expiresTurns?: number
  /** 一次性效果是否已消费（如「下次失败不扣连击」）。 */
  consumed?: boolean
}

/** 开发者圣物（掉落收集）。 */
export interface RelicRecord {
  id: string
  acquiredAt: number
}

/** 史诗任务链（跨天剧情任务）状态。 */
export interface QuestChainState {
  /** 当前链 id（CHAIN_QUESTS 键）。 */
  id: string
  /** 当前步骤下标（0-based；全部完成 = finished）。 */
  step: number
  /** 链条接取的日期（'YYYY-MM-DD'）。 */
  dayKeyStarted: string
  /** 上次推进日期（断天检查：非连续则重置）。 */
  lastProgressDay: string
  /** 终章奖励已领取。 */
  finished?: boolean
  /** 终章奖励已领取（领取后 finished 复位，链不再推进）。 */
  claimed?: boolean
}

/** 幽灵竞速（本周 vs 上周自己的数据）状态。 */
export interface GhostRaceState {
  /** 对决所属周键（weekKey）。 */
  week: string
  /** 幽灵 XP 目标（上周每天 XP 之和）。 */
  ghostXp: number
  /** 幽灵回合目标（上周完成回合数）。 */
  ghostTurns: number
  /** 奖励是否已领取。 */
  claimed: boolean
}

/** 单回合结算事件（host 每回合推一条，client 轮询 diff 出 toast）。 */
export interface TurnSettlementEvent {
  /** 单调递增事件 id（client 去重用）。 */
  id: string
  at: number
  /** 本轮 XP（含连击加成与每日任务奖励）。 */
  xp: number
  /** 连击加成倍率（无加成时 null）。 */
  combo: number | null
  /** 每日任务奖励 XP。 */
  questXp: number
  levelBefore: number
  levelAfter: number
  leveledUp: boolean
  /** 本轮完成/失败回合数。 */
  turnsDone: number
  /** v1.4.0 本轮触发的随机事件卡（client 弹卡用；defId 对 events.EVENT_POOL）。 */
  eventCard?: { id: string; defId: string }
  /** v1.4.0 本轮掉落的圣物（id 对 relics.RELIC_POOL）。 */
  relicId?: string
}

/** 成就分类（面板成就墙分主题 tab）。 */
export type AchievementCategory = 'journey' | 'crafting' | 'quest' | 'time' | 'legend' | 'egg'

/** 稀有度（视觉分级：普通/稀有/史诗/传说）。 */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

/** 成就定义。check 为基于存档（含计数器）的纯函数。 */
export interface AchievementDef {
  id: string // kebab-case 唯一
  category: AchievementCategory
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  icon: string // emoji
  xp: number // 解锁奖励 XP
  rarity?: Rarity // 缺省 common
  hidden?: boolean // 彩蛋（解锁前不显示）
  check: (save: SaveData, now: number) => boolean
  /** 可选：进度条信息（current/goal）。缺省表示纯条件成就，不显示进度。 */
  progress?: (save: SaveData) => { current: number; goal: number }
}

/** 成就视图（status API / 面板用，含解锁状态）。 */
export interface AchievementView {
  id: string
  category: AchievementCategory
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  icon: string
  xp: number
  rarity: Rarity
  hidden: boolean
  unlocked: boolean
  acquiredAt?: number
  /** 未解锁成就的进度（若有）。 */
  progress?: { current: number; goal: number }
}

/** 分类收藏奖励（集齐某分类全部成就）。 */
export interface CollectionState {
  /** category → 完成时间戳。 */
  completed: Partial<Record<AchievementCategory, number>>
}

/** DevQuest 状态视图（工具与 HTTP API 共用）。 */
export interface DevQuestStatus {
  cwd: string
  level: number
  xp: number
  xpToNext: number
  /** 当前等级起始时间（升级体验：面板显示升到本级的用时）。 */
  levelStartedAt?: number
  title: { zh: string; en: string }
  season: string
  /** 本赛季获得的 XP。 */
  seasonXp: number
  /** 插件版本号（面板头部展示，方便确认加载的代码版本）。 */
  version: string
  counters: Counters
  achievements: AchievementView[]
  /** 当日每日任务（含进度/奖励）。 */
  daily: DailyQuestState
  /** 每日全清宝箱状态（当天 3 个任务全完成后可领取）。 */
  dailyChest: { ready: boolean; claimed: boolean }
  /** 最近回合结算事件（面板 toast 数据源）。 */
  settlements: TurnSettlementEvent[]
  /** 赛季商店：余额 + 商品（含已购状态）。 */
  shop: { balance: number; items: ShopItemView[]; theme: string; themes: string[]; badges: string[]; shields: number; rerolls: number; xpBoostTurns: number; questSkips: number }
  /** v1.1 粘性数据：连续活跃 / 赛季通行证。 */
  streak: { days: number; best: number; nextTierXp: number | null }
  pass: { seasonXp: number; tiers: { id: string; seasonXp: number; xp: number; claimed: boolean; reached: boolean }[] }
  /** 新手任务链视图。 */
  tutorial: {
    steps: { id: string; name: { zh: string; en: string }; icon: string; xp: number; done: boolean; acquiredAt?: number }[]
    done: boolean
    /** 专属称号（全部完成解锁）。 */
    title: { zh: string; en: string }
  }
  /** 最近 HISTORY_DAYS 天每日历史（成长周报，时间正序）。 */
  history: { date: string; xp: number; turns: number }[]
  /** 分类收藏进度（集齐某分类全部成就 → 奖励）。 */
  collections: {
    /** 每分类：总数/已解锁/是否已领奖励。 */
    items: { category: AchievementCategory; total: number; unlocked: number; completed: boolean; rewardXp: number; claimedAt?: number }[]
  }
  /** 每日幸运抽奖（每天一次免费）。 */
  lucky: { available: boolean; claimed: boolean }
  /** 下一称号预览（无更高称号时为 null）。 */
  nextTitle: { level: number; name: { zh: string; en: string }; xpToNext: number } | null
  /** 每周挑战视图。 */
  weekly: {
    week: string
    quests: { id: string; label: { zh: string; en: string }; goal: number; reward: number; progress: number; done: boolean }[]
    bonusReady: boolean
    bonusClaimed: boolean
    /** v1.3.0 每周 BOSS（合成）。 */
    boss: { icon: string; name: string; hp: number; damage: number; defeated: boolean; claimed: boolean; reward: number }
  }
  /** v1.3.0 每日 XP 目标视图。 */
  dailyGoal: {
    goal: number
    todayXp: number
    claimed: boolean
    options: number[]
    rewardXp: number
  }
  /** v1.3.0 职业画像（无匹配时为 null）。 */
  class: { id: string; icon: string; name: { zh: string; en: string } } | null
  /** v1.3.0 赛季结束结算报告（换季自动生成）。 */
  seasonSummary?: PlayerState['seasonSummary']
  /** 荣誉墙：历史赛季最佳（含当前赛季）。 */
  records: { season: string; level: number; combo: number; seasonXp: number }[]
  /** 多称号视图。 */
  titles: {
    /** 当前展示称号（active 为空时显示等级称号）。 */
    current: { id: string; name: { zh: string; en: string }; icon: string } | null
    /** 全部条件称号（含解锁状态）。 */
    items: { id: string; name: { zh: string; en: string }; icon: string; description: { zh: string; en: string }; unlocked: boolean; acquiredAt?: number }[]
  }
  // ---- v1.4.0 冒险扩展视图 ----
  /** 活跃事件（含待抉择的事件卡与生效 buff；client 弹卡/状态展示）。 */
  events: { id: string; effectId: string; gainedAt: number; expiresTurns?: number; pendingChoice: boolean }[]
  /** 圣物视图（收藏图鉴展示用）。 */
  relics: { total: number; items: { id: string; icon: string; name: { zh: string; en: string }; rarity: string; acquiredAt: number }[] }
  /** 史诗任务链视图（无链时 null）。 */
  questChain: {
    id: string
    icon: string
    name: { zh: string; en: string }
    step: number
    total: number
    steps: { label: { zh: string; en: string }; met: boolean }[]
    finished: boolean
    claimed: boolean
    rewardXp: number
  } | null
  /** 幽灵竞速进度（未激活时 active=false）。 */
  ghostRace: {
    active: boolean
    ghostXp: number
    ghostTurns: number
    myXp: number
    myTurns: number
    beaten: boolean
    claimed: boolean
  }
  /** v1.4.0 当前连击姿态（无达标姿态时 null）。 */
  stance: { combo: number; id: string; icon: string; name: { zh: string; en: string } } | null
  updatedAt: number
}
