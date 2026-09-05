/**
 * v1.4.0 冒险扩展（二）：开发者圣物 / 史诗任务链 / 幽灵竞速。
 *
 * - 圣物：todo 全清 / 周 BOSS / 每日宝箱低概率掉落，24 种分稀有度收集。
 * - 史诗任务链：跨天剧情任务（多步、每日推进、断天重置、终章大奖励）。
 * - 幽灵竞速：用前 7 天真实数据生成幽灵对手，近 7 天滚动进度追赶，击败领奖。
 *
 * 全部纯函数（时间由调用方注入），周期生成依赖 history/计数器。
 */
import type { ActiveEvent, RelicRecord, SaveData } from './types.ts'
import type { DailyQuestDef } from './engine.ts' // type-only：不构成运行时循环
import { hashSeed, relicLuckActive } from './events.ts'

/** 本地日期键 'YYYY-MM-DD'（与 engine.dayKey 一致；保持零依赖避免循环 import）。 */
export function dayKeyLocal(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// 开发者圣物
// ---------------------------------------------------------------------------

export interface RelicDef {
  id: string
  icon: string
  name: { zh: string; en: string }
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/** 圣物池（24 种，按稀有度分布）。 */
export const RELIC_POOL: RelicDef[] = [
  { id: 'rel-bug', icon: '🐛', name: { zh: 'Bug 标本', en: 'Bug Specimen' }, rarity: 'common' },
  { id: 'rel-todo', icon: '📌', name: { zh: '待办碎纸', en: 'Todo Shred' }, rarity: 'common' },
  { id: 'rel-coffee', icon: '☕', name: { zh: '咖啡渍杯', en: 'Coffee Cup' }, rarity: 'common' },
  { id: 'rel-mouse', icon: '🖱️', name: { zh: '双击鼠标', en: 'Double-Click Mouse' }, rarity: 'common' },
  { id: 'rel-tab', icon: '🔖', name: { zh: '游离 Tab', en: 'Wandering Tab' }, rarity: 'common' },
  { id: 'rel-semicolon', icon: '🔤', name: { zh: '多余分号', en: 'Stray Semicolon' }, rarity: 'common' },
  { id: 'rel-keyboard', icon: '⌨️', name: { zh: '附魔键盘', en: 'Enchanted Keyboard' }, rarity: 'rare' },
  { id: 'rel-unicorn', icon: '🦄', name: { zh: '独角兽干尸', en: 'Unicorn Mummy' }, rarity: 'rare' },
  { id: 'rel-phoenix', icon: '🐦', name: { zh: '灰烬凤凰', en: 'Ashen Phoenix' }, rarity: 'rare' },
  { id: 'rel-steak', icon: '🥩', name: { zh: '重构牛排', en: 'Refactor Steak' }, rarity: 'rare' },
  { id: 'rel-monitor', icon: '🖥️', name: { zh: '三屏神机', en: 'Triple Monitor' }, rarity: 'rare' },
  { id: 'rel-diamond', icon: '💎', name: { zh: '钻石合并', en: 'Diamond Merge' }, rarity: 'rare' },
  { id: 'rel-clock', icon: '⏰', name: { zh: '午夜时钟', en: 'Midnight Clock' }, rarity: 'rare' },
  { id: 'rel-chair', icon: '💺', name: { zh: '人体工学椅', en: 'Ergo Chair' }, rarity: 'rare' },
  { id: 'rel-badge', icon: '🏅', name: { zh: 'CI 徽章', en: 'CI Badge' }, rarity: 'rare' },
  { id: 'rel-streak', icon: '🔗', name: { zh: '连击之链', en: 'Combo Chain' }, rarity: 'rare' },
  { id: 'rel-deploy', icon: '🚀', name: { zh: '周五部署箭', en: 'Friday Deploy' }, rarity: 'epic' },
  { id: 'rel-peg', icon: '🪵', name: { zh: '神秘木桩', en: 'Mystic Peg' }, rarity: 'epic' },
  { id: 'rel-time', icon: '⏳', name: { zh: '时间沙漏', en: 'Time Hourglass' }, rarity: 'epic' },
  { id: 'rel-vault', icon: '🏦', name: { zh: '技术债金库', en: 'Debt Vault' }, rarity: 'epic' },
  { id: 'rel-wizard', icon: '🧙', name: { zh: '重构法师杖', en: 'Refactor Staff' }, rarity: 'legendary' },
  { id: 'rel-dragon', icon: '🐉', name: { zh: '弃用龙鳞', en: 'Deprecated Scale' }, rarity: 'legendary' },
  { id: 'rel-one', icon: '1️⃣', name: { zh: '远古分号', en: 'Ancient Semicolon' }, rarity: 'legendary' },
  { id: 'rel-main', icon: '👑', name: { zh: '主分支王冠', en: 'Main Crown' }, rarity: 'legendary' },
]

export function relicById(id: string): RelicDef | undefined {
  return RELIC_POOL.find(r => r.id === id)
}

/** 已收集的圣物（id 集合）。 */
export function ownedRelics(save: SaveData): Set<string> {
  return new Set((save.relics ?? []).map(r => r.id))
}

/**
 * 尝试掉落圣物（基础概率 chance ∈ [0,1]；神秘彩蛋 buff 在场时 ×2）。
 * 只掉落未拥有的（全收集后返回 null）。返回 s 与掉落的圣物（无则 null）。
 */
export function rollRelic(save: SaveData, chance: number, now: number, seed: string): { save: SaveData; relic: RelicDef | null } {
  const s = structuredClone(save)
  const owned = ownedRelics(s)
  if (owned.size >= RELIC_POOL.length) return { save: s, relic: null }
  const luck = relicLuckActive(s.events, now) ? 2 : 1
  const roll = (hashSeed(seed) % 100) / 100
  if (roll >= chance * luck) return { save: s, relic: null }
  // 从未拥有的中按稀有度加权抽取（传说更稀有）
  const candidates = RELIC_POOL.filter(r => !owned.has(r.id))
  const weight = (r: RelicDef): number =>
    r.rarity === 'common' ? 40 : r.rarity === 'rare' ? 25 : r.rarity === 'epic' ? 12 : 5
  const total = candidates.reduce((sum, r) => sum + weight(r), 0)
  let pick = hashSeed(`relic-${seed}`) % total
  for (const r of candidates) {
    pick -= weight(r)
    if (pick < 0) {
      s.relics = [...(s.relics ?? []), { id: r.id, acquiredAt: now } as RelicRecord]
      return { save: s, relic: r }
    }
  }
  return { save: s, relic: null }
}

// ---------------------------------------------------------------------------
// 史诗任务链（跨天剧情任务）
// ---------------------------------------------------------------------------

export interface ChainStepDef {
  /** 条件类型：xp=今日 XP 达阈值；quests=当日完成每日任务数；turns=当日完成回合数。 */
  need: 'xp' | 'quests' | 'turns'
  target: number
  label: { zh: string; en: string }
}

export interface ChainQuestDef {
  id: string
  icon: string
  name: { zh: string; en: string }
  /** 每步剧情文案（推进时展示）。 */
  steps: ChainStepDef[]
  rewardXp: number
}

/** 史诗任务链池（3 条剧情线）。 */
export const CHAIN_QUESTS: ChainQuestDef[] = [
  {
    id: 'chain-techdebt', icon: '🧱', name: { zh: '征服技术债', en: 'Tame the Tech Debt' },
    steps: [
      { need: 'xp', target: 150, label: { zh: '第 1 天：摸清债务规模（今日 XP ≥ 150）', en: 'Day 1: Survey the debt (150 XP today)' } },
      { need: 'quests', target: 2, label: { zh: '第 2 天：清偿小额债务（完成 2 个每日任务）', en: 'Day 2: Clear small debts (2 daily quests)' } },
      { need: 'turns', target: 10, label: { zh: '第 3 天：重构冲刺（完成 10 个回合）', en: 'Day 3: Refactor sprint (10 turns)' } },
      { need: 'xp', target: 500, label: { zh: '第 4 天：债务清零（今日 XP ≥ 500）', en: 'Day 4: Debt cleared (500 XP today)' } },
    ],
    rewardXp: 500,
  },
  {
    id: 'chain-nightowl', icon: '🦉', name: { zh: '夜猫传说', en: 'Legend of the Night Owl' },
    steps: [
      { need: 'turns', target: 8, label: { zh: '第 1 夜：夜幕降临（完成 8 个回合）', en: 'Night 1: Darkness falls (8 turns)' } },
      { need: 'xp', target: 300, label: { zh: '第 2 夜：月光代码（今日 XP ≥ 300）', en: 'Night 2: Moonlight code (300 XP today)' } },
      { need: 'quests', target: 3, label: { zh: '第 3 夜：全清任务（完成 3 个每日任务）', en: 'Night 3: Clear all quests' } },
      { need: 'xp', target: 800, label: { zh: '第 4 夜：破晓黎明（今日 XP ≥ 800）', en: 'Night 4: Dawn breaks (800 XP today)' } },
    ],
    rewardXp: 800,
  },
  {
    id: 'chain-bugslayer', icon: '⚔️', name: { zh: 'Bug 猎手', en: 'Bug Slayer' },
    steps: [
      { need: 'xp', target: 200, label: { zh: '第 1 天：循迹追踪（今日 XP ≥ 200）', en: 'Day 1: Track the prey (200 XP today)' } },
      { need: 'turns', target: 12, label: { zh: '第 2 天：连续作战（完成 12 个回合）', en: 'Day 2: Relentless (12 turns)' } },
      { need: 'xp', target: 600, label: { zh: '第 3 天：boss 现身（今日 XP ≥ 600）', en: 'Day 3: Boss appears (600 XP today)' } },
    ],
    rewardXp: 600,
  },
]

export function chainById(id: string): ChainQuestDef | undefined {
  return CHAIN_QUESTS.find(c => c.id === id)
}

/** 条件是否满足（基于当天累计指标）。 */
export function chainStepMet(def: ChainStepDef, save: SaveData, now: number): boolean {
  const today = dayKeyLocal(now)
  switch (def.need) {
    case 'xp':
      return todayXp(save, now) >= def.target
    case 'quests': {
      const doneToday = (save.daily?.quests ?? []).filter(q => q.claimedAt !== undefined && dayKeyLocal(q.claimedAt) === today).length
      return doneToday >= def.target
    }
    case 'turns':
      return (save.history?.[today]?.turns ?? 0) >= def.target
  }
}

function todayXp(save: SaveData, now: number): number {
  return save.counters.todayXpDay === dayKeyLocal(now) ? (save.counters.todayXp ?? 0) : 0
}

/**
 * 每日推进任务链（回合结算后调用）：
 * - 无链时（或上一链完成）不自动接链——接链由 claimChain 时从池中随机接取新链？简化：无链则随机接一条。
 * - 断天重置：上次推进不是今天也不是昨天 → 链从头开始。
 * - 今天未推进且条件满足 → 步骤 +1；全部完成 → finished（待领终章）。
 * 返回 { save, advanced: 是否推进/断裂, finished: 是否刚完成, label? }。
 */
export function advanceQuestChain(save: SaveData, now: number, seed: string): {
  save: SaveData
  advanced: boolean
  reset: boolean
  finished: boolean
  label: string | null
} {
  const s = structuredClone(save)
  const today = dayKeyLocal(now)
  const yesterday = dayKeyLocal(now - 86_400_000)
  const none = { save: s, advanced: false, reset: false, finished: false, label: null }

  let chain = s.questChain
  if (chain === undefined || chain.finished === true) {
    // 接新链（随机一条）
    const pool = CHAIN_QUESTS
    const picked = pool[hashSeed(`chain-${today}-${seed}`) % pool.length]!
    s.questChain = { id: picked.id, step: 0, dayKeyStarted: today, lastProgressDay: today }
    return { ...none, save: s, label: `📜 新史诗任务「${picked.name.zh}」开始！` }
  }
  const def = chainById(chain.id)
  if (def === undefined) return none

  // 断天检查：未完成的链若昨天没推进且今天未推进 → 重置进度（重新开始本链）
  if (chain.lastProgressDay !== today && chain.lastProgressDay !== yesterday) {
    s.questChain = { ...chain, step: 0, lastProgressDay: today }
    return { ...none, save: s, reset: true, label: `💔 断档了……「${def.name.zh}」从头再来。` }
  }
  if (chain.lastProgressDay === today) return none // 今天已推进过

  const stepDef = def.steps[chain.step]
  if (stepDef === undefined) return none
  if (!chainStepMet(stepDef, s, now)) return none

  const nextStep = chain.step + 1
  if (nextStep >= def.steps.length) {
    // 全部完成 → 终章待领
    s.questChain = { ...chain, step: nextStep, lastProgressDay: today, finished: true }
    return { ...none, save: s, finished: true, label: `🏆 「${def.name.zh}」达成！领终章奖励吧。` }
  }
  s.questChain = { ...chain, step: nextStep, lastProgressDay: today }
  return { ...none, save: s, advanced: true, label: `📜 「${def.name.zh}」推进到第 ${nextStep + 1} 步` }
}

/** 领取任务链终章奖励（大 XP；幂等 finished+claimed 门）。 */
export function claimChainReward(save: SaveData, now: number, seasonOverride?: string): { ok: boolean; gained: number; save: SaveData } {
  const s = structuredClone(save)
  const chain = s.questChain
  if (chain === undefined || chain.finished !== true) return { ok: false, gained: 0, save: s }
  const def = chainById(chain.id)
  if (def === undefined) return { ok: false, gained: 0, save: s }
  s.questChain = { ...chain, finished: false, claimed: true }
  return { ok: true, gained: def.rewardXp, save: s }
}

// ---------------------------------------------------------------------------
// 幽灵竞速（前 7 天真实数据 vs 近 7 天滚动进度）
// ---------------------------------------------------------------------------

export const GHOST_REWARD_XP = 300

/** 前 7 天（不含今天）history 总和。 */
export function pastWeekTotals(save: SaveData, now: number): { xp: number; turns: number } {
  let xp = 0
  let turns = 0
  const h = save.history ?? {}
  for (let i = 1; i <= 7; i++) {
    const d = dayKeyLocal(now - i * 86_400_000)
    const rec = h[d]
    if (rec !== undefined) {
      xp += rec.xp
      turns += rec.turns
    }
  }
  return { xp, turns }
}

/** 近 7 天（含今天）history 总和（本周进度）。 */
export function thisWeekTotals(save: SaveData, now: number): { xp: number; turns: number } {
  let xp = 0
  let turns = 0
  const h = save.history ?? {}
  for (let i = 0; i < 7; i++) {
    const d = dayKeyLocal(now - i * 86_400_000)
    const rec = h[d]
    if (rec !== undefined) {
      xp += rec.xp
      turns += rec.turns
    }
  }
  return { xp, turns }
}

/**
 * 幽灵竞速状态保证：本周未初始化且有前 7 天数据 → 生成幽灵（前 7 天总和）。
 * 幽灵只在「上周有数据」时生成（首周无幽灵）。
 */
export function ensureGhostRace(save: SaveData, now: number): SaveData {
  const s = structuredClone(save)
  const g = s.ghostRace
  if (g !== undefined && g.week === 'rolling') return s // 已初始化（滚动窗口语义，无需换周）
  const past = pastWeekTotals(s, now)
  if (past.xp <= 0 && past.turns <= 0) return s
  s.ghostRace = { week: 'rolling', ghostXp: past.xp, ghostTurns: past.turns, claimed: false }
  return s
}

/** 当前对决进度（client 进度条用）。 */
export function ghostRaceProgress(save: SaveData, now: number): {
  active: boolean
  ghostXp: number
  ghostTurns: number
  myXp: number
  myTurns: number
  beaten: boolean
  claimed: boolean
} {
  const g = save.ghostRace
  if (g === undefined) return { active: false, ghostXp: 0, ghostTurns: 0, myXp: 0, myTurns: 0, beaten: false, claimed: false }
  const mine = thisWeekTotals(save, now)
  const beaten = mine.xp >= g.ghostXp && mine.turns >= g.ghostTurns
  return { active: true, ghostXp: g.ghostXp, ghostTurns: g.ghostTurns, myXp: mine.xp, myTurns: mine.turns, beaten, claimed: g.claimed === true }
}

/** 领取幽灵竞速奖励（击败且未领；+300 XP）。 */
export function claimGhostReward(save: SaveData, now: number, seasonOverride?: string): { ok: boolean; gained: number; save: SaveData } {
  const s = structuredClone(save)
  const g = s.ghostRace
  if (g === undefined || g.claimed === true) return { ok: false, gained: 0, save: s }
  const mine = thisWeekTotals(s, now)
  if (mine.xp < g.ghostXp || mine.turns < g.ghostTurns) return { ok: false, gained: 0, save: s }
  s.ghostRace = { ...g, claimed: true }
  return { ok: true, gained: GHOST_REWARD_XP, save: s }
}

// ---------------------------------------------------------------------------
// 文案梗化：任务/BOSS 花名（按日期+id 确定性抽取）
// ---------------------------------------------------------------------------

/** 每日任务梗化花名（与正经名共存，seed 决定是否用梗版）。 */
export const DAILY_QUEST_MEME: Partial<Record<string, { zh: string; en: string }>> = {
  dq_turns_5: { zh: '热热身，跑 5 个回合', en: 'Warm up with 5 turns' },
  dq_turns_30: { zh: '狂肝 30 回合，勿扰', en: 'Grind 30 turns, do not disturb' },
  dq_tools_20: { zh: '工具人上线：调用 20 次工具', en: 'Tool golem: 20 tool calls' },
  dq_edits_10: { zh: '消灭 10 处代码异味', en: 'Squash 10 code smells' },
  dq_edits_20: { zh: '屠城模式：编辑/写入 20 次', en: 'Slay mode: 20 edits/writes' },
  dq_cmd_10: { zh: '终端老炮：跑 10 条命令', en: 'Terminal veteran: 10 commands' },
  dq_todos_5: { zh: '清空 5 个待办，一身轻', en: 'Clear 5 todos' },
  dq_ssh_1: { zh: '远程开荒：SSH 一次', en: 'Remote raid: 1 SSH' },
  dq_comeback_1: { zh: '跌倒再起：失败后爬起来', en: 'Rise from failure' },
  dq_night_1: { zh: '夜之试炼：凌晨完成回合', en: 'Night trial: finish after midnight' },
  dq_distinct_8: { zh: '百宝工具箱：用 8 种工具', en: 'Toolbox master: 8 tools' },
  dq_combo_10: { zh: '连击小王子：达到 10 连击', en: 'Combo prince: 10 streak' },
}

/** 梗化标签（确定性抽取；约 60% 用梗版）。 */
export function memedDailyLabel(id: string, def: DailyQuestDef, seed: string): { zh: string; en: string } {
  const meme = DAILY_QUEST_MEME[id]
  if (meme === undefined) return def.label
  return hashSeed(`${id}-${seed}`) % 100 < 60 ? meme : def.label
}

/** 每周 BOSS 花名池。 */
export const BOSS_MEME_NAMES: { zh: string; en: string }[] = [
  { zh: '重构巨兽', en: 'Refactor Behemoth' },
  { zh: '技术债魔龙', en: 'Tech Debt Wyrm' },
  { zh: '死线幽灵', en: 'Deadline Specter' },
  { zh: '吞并分号怪', en: 'Semicolon Eater' },
  { zh: '缓存失败之龙', en: 'Cache Miss Dragon' },
  { zh: '单元测试吞噬者', en: 'Test Swallower' },
  { zh: '部署星期五', en: 'Deploy Friday' },
  { zh: '生产事故兽', en: 'Incident Beast' },
]

/** 按周种子取 BOSS 花名。 */
export function bossMemeName(seed: string): { zh: string; en: string } {
  return BOSS_MEME_NAMES[hashSeed(`boss-${seed}`) % BOSS_MEME_NAMES.length]!
}

/** 幽灵界面花名（本轮对决对手名称）。 */
export function ghostMemeName(seed: string): { zh: string; en: string } {
  const names = [
    { zh: '过去的你', en: 'Past You' },
    { zh: '上周的自己', en: 'Last Week You' },
    { zh: '撸过的代码你', en: 'Caffeine You' },
    { zh: '熬夜の你', en: 'All-Nighter You' },
  ]
  return names[hashSeed(`ghost-${seed}`) % names.length]!
}