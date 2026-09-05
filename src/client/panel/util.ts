/**
 * DevQuest 面板工具函数与常量：格式/音效/稀有度/localStorage 持久化、
 * 面板设置、拖拽位置约束等。均为纯函数或浏览器端直写。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react'
import type { DevQuestStatus } from '../../types.ts'
import { TONE } from './theme.ts'

export const STATUS_API = '/api/devquest/status'
export const POLL_MS = 60_000

export function levelPercent(status: DevQuestStatus): number {
  if (status.xpToNext <= 0) return 0
  return Math.max(0.02, Math.min(1, status.xp / status.xpToNext))
}

/** 连击加成档位（与引擎一致）：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5；无加成返回 null。 */
export function comboMultiplier(consecutive: number): number | null {
  if (consecutive >= 30) return 2.5
  if (consecutive >= 15) return 2.0
  if (consecutive >= 5) return 1.5
  return null
}

/** 赛季冲刺目标：本赛季输出 tokens 目标（与 season_100k 成就一致）。 */
export const SEASON_GOAL_TOKENS = 100_000

/** 由赛季 id（如 2026-S3）计算季度剩余天数（本地时区，含今天）。 */
export function seasonDaysLeft(season: string): number {
  const m = /^(\d{4})-S([1-4])$/.exec(season)
  if (m === null) return 0
  const year = Number(m[1])
  const quarter = Number(m[2])
  const endMonth = quarter * 3 // 季度最后一个月（1-12）
  const end = new Date(year, endMonth, 1, 0, 0, 0, 0) // 下季度第一天
  const now = new Date()
  const ms = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

/** 数值格式化：<1k 原样；<1M 用 k；<1T 用 M；更大用 T。 */
export function formatNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)}M`
  }
  const v = n / 1_000_000_000
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)}T`
}

/** v1.2.3：从后端 JSON 响应提取错误文本；成功或无错误返回 null。 */
export function apiErrorOf(data: { ok?: boolean; error?: string } | null): string | null {
  if (data === null || data.ok === true) return null
  return data.error !== undefined && data.error !== '' ? data.error : null
}

/**
 * v1.3.0 音效：用 WebAudio 合成短提示音（无外部资源）。
 * kind: 'goal' 成功上升音 / 'boss' 低沉胜利音 / 'levelup' 明亮琶音 / 'achievement' 清脆叮咚。
 */
export function playSfx(kind: 'goal' | 'boss' | 'levelup' | 'achievement'): void {
  try {
    if (typeof AudioContext === 'undefined') return
    const ctx = new AudioContext()
    const notes: { f: number; t: number; d: number }[] =
      kind === 'goal'
        ? [{ f: 523.25, t: 0, d: 0.12 }, { f: 659.25, t: 0.12, d: 0.12 }, { f: 783.99, t: 0.24, d: 0.2 }]
        : kind === 'boss'
          ? [{ f: 220, t: 0, d: 0.25 }, { f: 277.18, t: 0.2, d: 0.3 }, { f: 329.63, t: 0.45, d: 0.4 }]
          : kind === 'levelup'
            ? [{ f: 392, t: 0, d: 0.1 }, { f: 523.25, t: 0.1, d: 0.1 }, { f: 659.25, t: 0.2, d: 0.1 }, { f: 783.99, t: 0.3, d: 0.25 }]
            : [{ f: 880, t: 0, d: 0.08 }, { f: 1174.66, t: 0.09, d: 0.14 }]
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = n.f
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.t)
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + n.t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.t + n.d)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + n.t)
      osc.stop(ctx.currentTime + n.t + n.d + 0.02)
    }
    window.setTimeout(() => void ctx.close().catch(() => { /* 忽略 */ }), 1500)
  } catch {
    // 音效失败静默
  }
}

export function updatedLabel(refreshedAt: number | null): string {
  if (refreshedAt === null) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1000))
  if (seconds < 10) return 'now'
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)}m`
}

/**
 * 称号分档色调：等级越高视觉越华丽。
 * - 1-4  学徒     灰蓝（朴素）
 * - 5-9  工匠     青铜
 * - 10-14 锻造师   亮蓝（品牌色）
 * - 15-19 宗师     紫罗兰
 * - 20-24 传说     金 + 光晕
 * - 25-29 神话     青绿渐变 + 光晕
 * - 30+   太阳神   炽金橙渐变 + 强光晕
 */
export function titleTone(level: number): { color?: string; gradient?: string; textShadow?: string } {
  if (level >= 30) return { gradient: 'linear-gradient(90deg, #ffd36b, #ff9a3c, #ff6b6b)', textShadow: '0 0 14px rgba(255,180,80,0.5)' }
  if (level >= 25) return { gradient: 'linear-gradient(90deg, #78dda0, #8ec5ff)', textShadow: '0 0 12px rgba(120,221,160,0.4)' }
  if (level >= 20) return { color: TONE.gold, textShadow: '0 0 12px rgba(246,198,82,0.5)' }
  if (level >= 15) return { color: '#c5a3ff', textShadow: '0 0 10px rgba(197,163,255,0.35)' }
  if (level >= 10) return { color: TONE.accent }
  if (level >= 5) return { color: '#d9a066' }
  return { color: TONE.muted }
}

/** 称号色调 → CSS 样式（渐变称号用 background-clip: text）。 */
export function titleToneStyle(level: number): CSSProperties {
  const t = titleTone(level)
  const style: CSSProperties = {}
  if (t.gradient !== undefined) {
    style.background = t.gradient
    style.WebkitBackgroundClip = 'text'
    style.WebkitTextFillColor = 'transparent'
  } else if (t.color !== undefined) {
    style.color = t.color
  }
  if (t.textShadow !== undefined) style.textShadow = t.textShadow
  return style
}

export function formatTime(at: number): string {
  const d = new Date(at)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 本地日期 YYYY-MM-DD（导出文件名用）。 */
export function dayKeyLocal(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// 稀有度：视觉分级（普通/稀有/史诗/传说）
// ---------------------------------------------------------------------------

/** 稀有度 → 主题色（toast 边框 / 成就墙光晕）。 */
export const RARITY_COLOR: Record<string, string> = {
  common: 'var(--dsw-alias-label-tertiary, #718096)',
  rare: 'var(--dsw-alias-brand-primary, #8ec5ff)',
  epic: '#c5a3ff',
  legendary: 'var(--dsw-alias-state-warn-primary, #f6c652)',
}

/** 稀有度 → toast 边框样式。 */
export function rarityToastStyle(rarity: string): CSSProperties {
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common
  return {
    border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
    boxShadow: `0 0 14px color-mix(in srgb, ${color} 25%, transparent)`,
  }
}

/** 稀有度 → 成就墙已解锁格子光晕。 */
export function rarityCellStyle(rarity: string): CSSProperties {
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common
  return {
    border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
    boxShadow: `0 0 10px color-mix(in srgb, ${color} 18%, transparent)`,
  }
}

/** 分类图标（收藏进度行用）。 */
export function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
    journey: '🚶', crafting: '⚒️', quest: '📜', time: '⏰', legend: '💎', egg: '🥚',
  }
  return map[cat] ?? '📦'
}

// ---------------------------------------------------------------------------
// 面板拖拽：拖动头部可把面板放到任意位置，位置持久化到 localStorage。
// ---------------------------------------------------------------------------

export const PANEL_POS_KEY = 'dsh.devquest.panelPos'
/** 面板至少保留多少 px 可见（允许大部分拖出屏幕外）。 */
export const MIN_VISIBLE = 60

export function loadPanelPos(): { left: number; top: number } | null {
  try {
    const raw = localStorage.getItem(PANEL_POS_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { left?: unknown; top?: unknown }
    if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
      return { left: parsed.left, top: parsed.top }
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 分区折叠状态：持久化到 localStorage，重开面板记住上次折叠/展开。
// ---------------------------------------------------------------------------

export const PANEL_COLLAPSED_KEY = 'dsh.devquest.collapsed'

/** v1.1 未完成任务提醒：每日去重 key（记录已提醒的日期）。 */
export const REMINDER_KEY = 'dsh.devquest.questReminder'

/** 读取已保存的分区折叠状态（section id → true=折叠）。损坏/不存在时返回空（全部展开）。 */
export function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PANEL_COLLAPSED_KEY)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, boolean> = {}
    for (const [id, v] of Object.entries(parsed)) {
      if (v === true) out[id] = true
    }
    return out
  } catch {
    return {}
  }
}

/** 保存分区折叠状态。 */
export function saveCollapsed(collapsed: Record<string, boolean>): void {
  try {
    localStorage.setItem(PANEL_COLLAPSED_KEY, JSON.stringify(collapsed))
  } catch {
    // 隐私模式等场景忽略持久化失败
  }
}

// ---------------------------------------------------------------------------
// v1.2.0 面板设置：字号 / 紧凑模式 / toast 过滤（localStorage 持久化）
// ---------------------------------------------------------------------------

export const PANEL_SETTINGS_KEY = 'dsh.devquest.settings'

export interface DevQuestSettings {
  /** 面板字号缩放（0.85 - 1.2）。 */
  fontSize: number
  /** 紧凑模式：缩小间距/字号。 */
  compact: boolean
  /** toast 过滤：all=全部；rare=仅稀有及以上；off=关闭。 */
  toastFilter: 'all' | 'rare' | 'off'
  /** v1.3.0 音效提示（成就/升级/宝箱/BOSS）。 */
  sound: boolean
  /** v1.3.0 桌面通知（成就解锁）。 */
  notify: boolean
}

export const DEFAULT_SETTINGS: DevQuestSettings = { fontSize: 1, compact: false, toastFilter: 'all', sound: true, notify: true }

/**
 * host 侧 UI 设置缓存（权威）：启动时 fetchUiSettings() 拉取 ~/.dsh/devquest/settings.json，
 * 此后 loadSettings() 优先读缓存；localStorage 仅作启动快照与旧数据迁移。
 * 修复：重启 DSH 后设置不再因浏览器存储失效而丢失。
 */
let uiSettingsCache: DevQuestSettings | null = null

/** 从 localStorage 读取并校验（无/损坏 → 默认）。 */
function loadSettingsLocal(): DevQuestSettings {
  try {
    const raw = localStorage.getItem(PANEL_SETTINGS_KEY)
    if (raw === null) return { ...DEFAULT_SETTINGS }
    const p = JSON.parse(raw) as Partial<DevQuestSettings>
    return {
      fontSize: typeof p.fontSize === 'number' && p.fontSize >= 0.85 && p.fontSize <= 1.2 ? p.fontSize : DEFAULT_SETTINGS.fontSize,
      compact: p.compact === true,
      toastFilter: p.toastFilter === 'rare' || p.toastFilter === 'off' ? p.toastFilter : 'all',
      sound: p.sound !== false,
      notify: p.notify !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** 上报 host（fire-and-forget；失败静默，本地状态不受影响）。 */
async function postUiSettings(s: DevQuestSettings): Promise<void> {
  await fetch('/api/devquest/ui-settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(s),
  })
}

/**
 * 拉取 host 侧设置并更新缓存（页面加载时调用一次）。
 * host 尚无设置时：若浏览器里留有旧值则上报完成一次性迁移，否则用默认。
 */
export async function fetchUiSettings(): Promise<void> {
  try {
    const response = await fetch('/api/devquest/ui-settings')
    const data = await response.json() as { ok: boolean; settings: DevQuestSettings | null }
    if (data.ok !== true) return
    if (data.settings !== null) {
      uiSettingsCache = data.settings
      window.dispatchEvent(new CustomEvent('devquest:ui-settings'))
      return
    }
    // host 无设置：尝试用本地旧值迁移（localStorage 校验后上报）。
    const local = loadSettingsLocal()
    const legacy = localStorage.getItem(PANEL_SETTINGS_KEY)
    if (legacy !== null) {
      try {
        await postUiSettings(local)
      } catch {
        // 上报失败：本次会话仍可用本地值
      }
    }
    uiSettingsCache = local
    window.dispatchEvent(new CustomEvent('devquest:ui-settings'))
  } catch {
    // 网络/解析失败：保持本地快照，不阻塞面板
    uiSettingsCache = loadSettingsLocal()
  }
}

export function loadSettings(): DevQuestSettings {
  return uiSettingsCache ?? loadSettingsLocal()
}

export function saveSettings(s: DevQuestSettings): void {
  uiSettingsCache = s
  try {
    localStorage.setItem(PANEL_SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // 忽略
  }
  void postUiSettings(s).catch(() => undefined)
}

/** 稀有度权重（toast 过滤用）。 */
export const RARITY_WEIGHT = { common: 0, rare: 1, epic: 2, legendary: 3 } as const

/** 稀有度 → 权重。 */
export function rarityWeight(r: string): number {
  return RARITY_WEIGHT[r as keyof typeof RARITY_WEIGHT] ?? 0
}

/** 限制面板位置：四周至少保留 MIN_VISIBLE 可见，拖不丢。 */
export function clampPanelPos(left: number, top: number, width: number, height: number): { left: number; top: number } {
  const minLeft = Math.min(MIN_VISIBLE - width, 0)
  const minTop = Math.min(MIN_VISIBLE - height, 0)
  const maxLeft = Math.max(MIN_VISIBLE, window.innerWidth - MIN_VISIBLE)
  const maxTop = Math.max(MIN_VISIBLE, window.innerHeight - MIN_VISIBLE)
  return {
    left: Math.min(maxLeft, Math.max(minLeft, left)),
    top: Math.min(maxTop, Math.max(minTop, top)),
  }
}
