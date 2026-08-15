/**
 * DevQuest 纯函数计分引擎 —— 可单测核心。
 *
 * 不变式：`applyTurn` / `addXp` / `checkAchievements` 都是纯函数
 * （时间由调用方注入 `now`，缺省 Date.now()），无 I/O 无副作用。
 */
import type { AchievementDef, Action, Counters, DailyQuest, DailyQuestState, PlayerState, SaveData } from './types.ts'

/** 称号（每 5 级一档）。 */
export const TITLES = [
  { min: 1, zh: '学徒', en: 'Apprentice' },
  { min: 5, zh: '工匠', en: 'Artisan' },
  { min: 10, zh: '锻造师', en: 'Forger' },
  { min: 15, zh: '宗师', en: 'Master' },
  { min: 20, zh: '传说', en: 'Legend' },
] as const

/** 等级曲线：xpToNext(level) = round(100 × level^1.5)。 */
export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

/** 按等级取称号。 */
export function titleFor(level: number): { zh: string; en: string } {
  let t: (typeof TITLES)[number] = TITLES[0]
  for (const cand of TITLES) if (level >= cand.min) t = cand
  return { zh: t.zh, en: t.en }
}

/** 工具 XP 加成：锻造师工具 +2，其余 +1。 */
const CRAFT_TOOLS = new Set(['edit', 'write', 'str-replace-editor', 'pwsh', 'bash', 'ssh_exec', 'ssh_upload', 'ssh_download', 'ssh_tunnel', 'ssh_cluster'])

export function xpForTool(tool: string): number {
  return CRAFT_TOOLS.has(tool) ? 2 : 1
}

/** 单动作 XP（工具 XP 在 applyTurn 内单独封顶 +10）。 */
export function xpForAction(action: Action): number {
  switch (action.kind) {
    case 'turn-completed': return 10
    case 'turn-failed': return 2
    case 'todo-completed': return 15 * action.count
    case 'tokens': return Math.floor(action.tokens / 10_000)
    default: return 0
  }
}

/** 日期键 'YYYY-MM-DD'（本地时区）。 */
export function dayKey(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// 每日任务：每天按日期确定性抽取 3 个任务，进度自动推进、完成自动结算 XP。
// ---------------------------------------------------------------------------

/** 每日任务定义（从计数器取进度）。 */
export interface DailyQuestDef {
  id: string
  label: { zh: string; en: string }
  goal: number
  reward: number
  progress: (c: Counters) => number
}

/** 每日任务池（每天抽取 DAILY_QUEST_COUNT 个）。 */
export const DAILY_QUEST_POOL: DailyQuestDef[] = [
  { id: 'dq_turns_5', label: { zh: '完成 5 个回合', en: 'Finish 5 turns' }, goal: 5, reward: 30, progress: c => c.turnsCompleted },
  { id: 'dq_turns_15', label: { zh: '完成 15 个回合', en: 'Finish 15 turns' }, goal: 15, reward: 60, progress: c => c.turnsCompleted },
  { id: 'dq_tools_20', label: { zh: '调用 20 次工具', en: 'Call 20 tools' }, goal: 20, reward: 40, progress: c => c.toolCalls },
  { id: 'dq_tools_50', label: { zh: '调用 50 次工具', en: 'Call 50 tools' }, goal: 50, reward: 80, progress: c => c.toolCalls },
  { id: 'dq_edits_10', label: { zh: '编辑/写入 10 次', en: 'Edit or write 10 times' }, goal: 10, reward: 50, progress: c => c.craftTools },
  { id: 'dq_cmd_10', label: { zh: '命令行 10 次', en: 'Run 10 commands' }, goal: 10, reward: 40, progress: c => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0) },
  { id: 'dq_todos_5', label: { zh: '完成 5 个待办', en: 'Complete 5 todos' }, goal: 5, reward: 60, progress: c => c.todosCompleted },
  { id: 'dq_tokens_50k', label: { zh: '输出 50k tokens', en: 'Output 50k tokens' }, goal: 50_000, reward: 70, progress: c => c.tokensOut },
  { id: 'dq_subagent_2', label: { zh: '派出 2 个子代理', en: 'Spawn 2 subagents' }, goal: 2, reward: 80, progress: c => c.subagentsSpawned },
  { id: 'dq_checkin_1', label: { zh: '查看 1 次进度', en: 'Check your progress' }, goal: 1, reward: 20, progress: c => c.devquestCalls },
]

/** 每天抽取的任务数。 */
export const DAILY_QUEST_COUNT = 3

/** 确定性 PRNG（按日期字符串做种子）：同一天所有会话与重启看到相同的任务。 */
function seededRng(seed: string): () => number {
  let h = 2166136261
  for (const ch of seed) {
    h ^= ch.codePointAt(0) ?? 0
    h = Math.imul(h, 16777619)
  }
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务）。 */
export function rollDailyQuests(now: number): DailyQuestState {
  const date = dayKey(now)
  const rng = seededRng(date)
  const pool = [...DAILY_QUEST_POOL]
  const quests: DailyQuest[] = []
  for (let i = 0; i < DAILY_QUEST_COUNT && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length)
    const def = pool.splice(idx, 1)[0]!
    quests.push({ id: def.id, label: def.label, goal: def.goal, reward: def.reward, progress: 0, done: false })
  }
  return { date, quests }
}

/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
export function ensureDaily(save: SaveData, now: number): DailyQuestState {
  if (save.daily.date !== dayKey(now)) save.daily = rollDailyQuests(now)
  return save.daily
}

/** 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。 */
export function applyDaily(save: SaveData, now: number): number {
  const daily = ensureDaily(save, now)
  let gain = 0
  for (const q of daily.quests) {
    if (q.done) continue
    const def = DAILY_QUEST_POOL.find(d => d.id === q.id)
    if (def === undefined) continue
    q.progress = Math.min(def.progress(save.counters), q.goal)
    if (q.progress >= q.goal) {
      q.done = true
      q.claimedAt = now
      save.counters.dailyQuestsDone++
      gain += q.reward
    }
  }
  return gain
}

/** 构造最小计数器。 */
export function freshCounters(): Counters {
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
  }
}

/** 构造最小玩家状态。 */
export function freshPlayer(season: string): PlayerState {
  return { level: 1, xp: 0, xpTotal: 0, title: titleFor(1).zh, season }
}

/** 构造最小存档。 */
export function freshSave(cwd: string, season: string, now: number = Date.now()): SaveData {
  return {
    version: 1,
    cwd,
    player: freshPlayer(season),
    counters: freshCounters(),
    achievements: {},
    lastSeqBySession: {},
    daily: rollDailyQuests(now),
    updatedAt: now,
  }
}

/**
 * 加 XP 并处理升级与活跃日统计（返回副本；原存档不变）。
 */
export function addXp(save: SaveData, gain: number, now: number = Date.now()): SaveData {
  const s = structuredClone(save)
  if (gain > 0) {
    s.player.xp += gain
    s.player.xpTotal += gain
  }
  while (s.player.xp >= xpToNext(s.player.level)) {
    s.player.xp -= xpToNext(s.player.level)
    s.player.level++
  }
  s.player.title = titleFor(s.player.level).zh

  const c = s.counters
  c.lastActivityAt = now
  const today = dayKey(now)
  const yesterday = dayKey(now - 86_400_000)
  if (c.lastActiveDay !== today) {
    c.streakDays = c.lastActiveDay === yesterday ? c.streakDays + 1 : 1
    c.activeDays++
    c.lastActiveDay = today
  }
  s.updatedAt = now
  return s
}

/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 */
export function applyTurn(save: SaveData, actions: Action[], now: number = Date.now()): SaveData {
  const s = structuredClone(save)
  const c = s.counters
  let toolGain = 0
  let gain = 0

  for (const a of actions) {
    if (a.kind === 'tool-call') {
      toolGain += xpForTool(a.tool)
    } else {
      gain += xpForAction(a)
    }
    switch (a.kind) {
      case 'tool-call':
        c.toolCalls++
        c.toolCallsByTool[a.tool] = (c.toolCallsByTool[a.tool] ?? 0) + 1
        if (CRAFT_TOOLS.has(a.tool)) c.craftTools++
        if (a.tool === 'devquest_status') c.devquestCalls++
        // oops：最近一次失败的工具，在 1 分钟内被再次调用成功（顺序敏感：失败须先于成功）。
        if (c.lastErrorTool === a.tool
          && c.lastErrorAt !== undefined
          && now > c.lastErrorAt
          && now - c.lastErrorAt <= 60_000) {
          c.oopsFired = true
        }
        c.lastSuccessTool = a.tool
        c.lastSuccessAt = now
        break
      case 'tool-failed':
        c.lastErrorTool = a.tool
        c.lastErrorAt = now
        break
      case 'todo-completed':
        c.todosCompleted += a.count
        if (a.allCompleted === true) c.cleanSweeps++
        break
      case 'tokens':
        c.tokensOut += a.tokens
        break
      case 'subagent':
        c.subagentsSpawned += a.depth > 0 ? 1 : 0
        break
      default:
        break
    }
  }

  gain += Math.min(toolGain, 10) // 工具 XP 单回合封顶 +10

  const completed = actions.some(a => a.kind === 'turn-completed')
  const failed = actions.some(a => a.kind === 'turn-failed')

  if (completed) {
    c.turnsCompleted++
    c.consecutiveSuccess++
    c.lastTurnCompletedAt = now
    const today = dayKey(now)
    if (c.completedDay === today) {
      c.completedToday++
    } else {
      c.completedDay = today
      c.completedToday = 1
    }
    // 连击多档加成：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5。
    if (c.consecutiveSuccess >= 30) gain = Math.round(gain * 2.5)
    else if (c.consecutiveSuccess >= 15) gain = Math.round(gain * 2.0)
    else if (c.consecutiveSuccess >= 5) gain = Math.round(gain * 1.5)
  } else if (failed) {
    c.turnsFailed++
    c.consecutiveSuccess = 0
  }

  // 单回合兜底上限（工具 10 + todo 15 + turn 基础 + tokens，宽松防刷）。
  gain = Math.min(gain, 125)
  // 每日任务奖励不计入兜底上限（每天固定 3 个，天然防刷）。
  const questGain = applyDaily(s, now)
  return addXp(s, gain + questGain, now)
}

/**
 * 成就判定：返回新解锁的成就 id 列表（一次性；已解锁的不重复）。
 * 副作用仅限对传入存档副本写入成就记录。
 */
export function checkAchievements(defs: AchievementDef[], save: SaveData, now: number = Date.now()): string[] {
  const unlocked: string[] = []
  for (const d of defs) {
    if (save.achievements[d.id]) continue // 一次性
    if (d.check(save, now)) {
      save.achievements[d.id] = { acquiredAt: now, xp: d.xp }
      unlocked.push(d.id)
    }
  }
  return unlocked
}

/** 存档迁移/补全：把旧版本或缺失字段的存档升级为当前结构。 */
export function migrateSave(raw: Partial<SaveData>, cwd: string, season: string): SaveData {
  const base = freshSave(cwd, season, raw.updatedAt ?? Date.now())
  if (!raw || typeof raw !== 'object') return base
  const out: SaveData = {
    ...base,
    ...raw,
    cwd,
    player: { ...base.player, ...(raw.player ?? {}) },
    counters: { ...base.counters, ...(raw.counters ?? {}) },
    achievements: raw.achievements ?? {},
    lastSeqBySession: raw.lastSeqBySession ?? {},
    daily: raw.daily ?? base.daily,
  }
  out.version = Math.max(1, raw.version ?? 1)
  // 派生字段一致性：称号跟等级走；每日任务日期过期由 ensureDaily 重滚。
  out.player.title = titleFor(out.player.level).zh
  return out
}
