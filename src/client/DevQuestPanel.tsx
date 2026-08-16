/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（v0.3 起为全局玩家档，与 cwd/session 无关）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { DevQuestStatus } from '../types.ts'
import { titleFor } from '../engine.ts'
import type { DevQuestToast } from './store.ts'
import type { DevQuestUiState } from './store.ts'
import type { createDevQuestStore } from './store.ts'
import { NS } from './locales.ts'

export type DevQuestFooterActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsStore<ReturnType<typeof createDevQuestStore>>
  & PropsLocale<typeof NS>

export type DevQuestOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createDevQuestStore>>
  & PropsLocale<typeof NS>

const STATUS_API = '/api/devquest/status'
const POLL_MS = 60_000

/** DSH 主题 token（浅色/深色自适应）。 */
const TONE = {
  canvas: 'var(--dsw-alias-bg-layer-2, #101722)',
  panel: 'var(--dsw-alias-bg-overlay, #171f2b)',
  row: 'var(--dsw-alias-bg-layer-2, #1d2735)',
  border: 'var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))',
  borderStrong: 'var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.31))',
  text: 'var(--dsw-alias-label-primary, #f2f6fc)',
  muted: 'var(--dsw-alias-label-secondary, #9daabd)',
  quiet: 'var(--dsw-alias-label-tertiary, #718096)',
  accent: 'var(--dsw-alias-brand-primary, #8ec5ff)',
  gold: 'var(--dsw-alias-state-warn-primary, #f6c652)',
  green: 'var(--dsw-alias-state-success-primary, #78dda0)',
  red: 'var(--dsw-alias-state-error-primary, #ff8592)',
} as const

const CATEGORY_KEYS = ['journey', 'crafting', 'quest', 'time', 'legend', 'egg'] as const

// ---------------------------------------------------------------------------
// 图标（内联 SVG，无依赖）
// ---------------------------------------------------------------------------

function SwordIcon({ size = 16 }: { size?: number }): ReactElement {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 20 14.5 9.5M14.5 9.5 17 7m-2.5 2.5L17 7m-2.5 2.5L18.5 5.5M17 7l1.5-1.5M17 7l2 2-1.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m14.5 9.5 2.5 2.5-1.5 1.5L4 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
  </svg>
}

function RefreshIcon(): ReactElement {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function CloseIcon(): ReactElement {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}

// ---------------------------------------------------------------------------
// 面板卡片
// ---------------------------------------------------------------------------

function levelPercent(status: DevQuestStatus): number {
  if (status.xpToNext <= 0) return 0
  return Math.max(0.02, Math.min(1, status.xp / status.xpToNext))
}

/** 连击加成档位（与引擎一致）：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5；无加成返回 null。 */
function comboMultiplier(consecutive: number): number | null {
  if (consecutive >= 30) return 2.5
  if (consecutive >= 15) return 2.0
  if (consecutive >= 5) return 1.5
  return null
}

/** 赛季冲刺目标：本赛季输出 tokens 目标（与 season_100k 成就一致）。 */
const SEASON_GOAL_TOKENS = 100_000

/** 由赛季 id（如 2026-S3）计算季度剩余天数（本地时区，含今天）。 */
function seasonDaysLeft(season: string): number {
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

function formatNumber(n: number): string {
  if (n < 1000) return String(n)
  const v = n / 1000
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`
}

function updatedLabel(refreshedAt: number | null): string {
  if (refreshedAt === null) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1000))
  if (seconds < 10) return 'now'
  if (seconds < 60) return `${seconds}s`
  return `${Math.round(seconds / 60)}m`
}

function LevelRing({ status }: { status: DevQuestStatus }): ReactElement {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const progress = levelPercent(status)
  return <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
    <circle cx="42" cy="42" r={radius} fill="none" stroke={TONE.border} strokeWidth="5" />
    <circle cx="42" cy="42" r={radius} fill="none" stroke={TONE.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progress * circumference} ${circumference}`} />
  </svg>
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
function titleTone(level: number): { color?: string; gradient?: string; textShadow?: string } {
  if (level >= 30) return { gradient: 'linear-gradient(90deg, #ffd36b, #ff9a3c, #ff6b6b)', textShadow: '0 0 14px rgba(255,180,80,0.5)' }
  if (level >= 25) return { gradient: 'linear-gradient(90deg, #78dda0, #8ec5ff)', textShadow: '0 0 12px rgba(120,221,160,0.4)' }
  if (level >= 20) return { color: TONE.gold, textShadow: '0 0 12px rgba(246,198,82,0.5)' }
  if (level >= 15) return { color: '#c5a3ff', textShadow: '0 0 10px rgba(197,163,255,0.35)' }
  if (level >= 10) return { color: TONE.accent }
  if (level >= 5) return { color: '#d9a066' }
  return { color: TONE.muted }
}

/** 称号色调 → CSS 样式（渐变称号用 background-clip: text）。 */
function titleToneStyle(level: number): CSSProperties {
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

function formatTime(at: number): string {
  const d = new Date(at)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 本地日期 YYYY-MM-DD（导出文件名用）。 */
function dayKeyLocal(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// 稀有度：视觉分级（普通/稀有/史诗/传说）
// ---------------------------------------------------------------------------

/** 稀有度 → 主题色（toast 边框 / 成就墙光晕）。 */
const RARITY_COLOR: Record<string, string> = {
  common: 'var(--dsw-alias-label-tertiary, #718096)',
  rare: 'var(--dsw-alias-brand-primary, #8ec5ff)',
  epic: '#c5a3ff',
  legendary: 'var(--dsw-alias-state-warn-primary, #f6c652)',
}

/** 稀有度 → toast 边框样式。 */
function rarityToastStyle(rarity: string): CSSProperties {
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common
  return {
    border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
    boxShadow: `0 0 14px color-mix(in srgb, ${color} 25%, transparent)`,
  }
}

/** 稀有度 → 成就墙已解锁格子光晕。 */
function rarityCellStyle(rarity: string): CSSProperties {
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common
  return {
    border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
    boxShadow: `0 0 10px color-mix(in srgb, ${color} 18%, transparent)`,
  }
}

/** 分类图标（收藏进度行用）。 */
function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
    journey: '🚶', crafting: '⚒️', quest: '📜', time: '⏰', legend: '💎', egg: '🥚',
  }
  return map[cat] ?? '📦'
}

// ---------------------------------------------------------------------------
// 面板拖拽：拖动头部可把面板放到任意位置，位置持久化到 localStorage。
// ---------------------------------------------------------------------------

const PANEL_POS_KEY = 'dsh.devquest.panelPos'
/** 面板至少保留多少 px 可见（允许大部分拖出屏幕外）。 */
const MIN_VISIBLE = 60

function loadPanelPos(): { left: number; top: number } | null {
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

/** 限制面板位置：四周至少保留 MIN_VISIBLE 可见，拖不丢。 */
function clampPanelPos(left: number, top: number, width: number, height: number): { left: number; top: number } {
  const minLeft = Math.min(MIN_VISIBLE - width, 0)
  const minTop = Math.min(MIN_VISIBLE - height, 0)
  const maxLeft = Math.max(MIN_VISIBLE, window.innerWidth - MIN_VISIBLE)
  const maxTop = Math.max(MIN_VISIBLE, window.innerHeight - MIN_VISIBLE)
  return {
    left: Math.min(maxLeft, Math.max(minLeft, left)),
    top: Math.min(maxTop, Math.max(minTop, top)),
  }
}

/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
export function DevQuestPanelCard(
  props: Pick<DevQuestFooterActionProps, 'useStore' | 'actions' | 't'> & { refresh: () => void },
): ReactElement {
  const { useStore, actions, t, refresh } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  const [wallOpen, setWallOpen] = useState(false)
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>('journey')
  const [hover, setHover] = useState<{ a: DevQuestStatus['achievements'][number]; x: number; y: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [confirmBuyId, setConfirmBuyId] = useState<string | null>(null)
  const [shopMsg, setShopMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [rerolling, setRerolling] = useState(false)
  const [luckyMsg, setLuckyMsg] = useState<string | null>(null)
  const [claimingLucky, setClaimingLucky] = useState(false)
  const [importing, setImporting] = useState(false)
  const [titlesOpen, setTitlesOpen] = useState(false)
  const [weeklyClaiming, setWeeklyClaiming] = useState(false)
  const [sharing, setSharing] = useState(false)
  // 面板位置：null = 默认右上角；拖拽后保存到 localStorage。
  const [pos, setPos] = useState<{ left: number; top: number } | null>(loadPanelPos)
  const [dragging, setDragging] = useState(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseLeft: number; baseTop: number; active: boolean } | null>(null)

  // 挂载时校准：窗口尺寸变化后把越界的位置拉回可视区。
  useEffect(() => {
    if (pos === null || cardRef.current === null) return
    const card = cardRef.current
    const clamped = clampPanelPos(pos.left, pos.top, card.offsetWidth, card.offsetHeight)
    if (clamped.left !== pos.left || clamped.top !== pos.top) setPos(clamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时校准一次
  }, [])

  /** 拖拽启动阈值（px）：按住移动超过该距离才开始拖——「点住才能拖动」，防误触。 */
  const DRAG_THRESHOLD = 4

  // 整个面板都是拖拽面：按住非按钮区域并移动超过阈值即开始拖动。
  const onCardPointerDown = (e: ReactPointerEvent<HTMLElement>): void => {
    if ((e.target as HTMLElement).closest('button') !== null) return // 按钮不触发拖拽
    const card = cardRef.current
    if (card === null) return
    const base = pos ?? { left: window.innerWidth - card.offsetWidth - 16, top: 16 }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: base.left,
      baseTop: base.top,
      active: false, // 尚未越过阈值
    }
  }

  const onCardPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const d = dragRef.current
    if (d === null || e.pointerId !== d.pointerId || cardRef.current === null) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.active) {
      // 按住但还没移够：不启动拖拽（点击/误触不会移动面板）
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      d.active = true
      cardRef.current.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    const card = cardRef.current
    const next = clampPanelPos(d.baseLeft + dx, d.baseTop + dy, card.offsetWidth, card.offsetHeight)
    setPos(next)
  }

  const onCardPointerUp = (e: ReactPointerEvent<HTMLElement>): void => {
    const d = dragRef.current
    if (d === null || e.pointerId !== d.pointerId) return
    dragRef.current = null
    if (!d.active) return // 简单点击（未拖动），不改变位置
    setDragging(false)
    const card = cardRef.current
    if (card === null) return
    const next = clampPanelPos(
      d.baseLeft + (e.clientX - d.startX),
      d.baseTop + (e.clientY - d.startY),
      card.offsetWidth,
      card.offsetHeight,
    )
    setPos(next)
    try {
      localStorage.setItem(PANEL_POS_KEY, JSON.stringify(next))
    } catch {
      // 隐私模式等场景忽略持久化失败
    }
  }

  const onCardPointerCancel = (e: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null || e.pointerId !== dragRef.current.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  useEffect(() => {
    if (!state.open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') actions.setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.open, actions])

  /** 领取每日全清宝箱：POST 后刷新本地状态。 */
  const claimChest = useCallback(async (): Promise<void> => {
    if (claiming) return
    setClaiming(true)
    try {
      const response = await fetch('/api/devquest/claim-chest', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; status: DevQuestStatus }
      if (data.ok && data.status !== null && data.status !== undefined) actions.setStatus(data.status)
    } catch {
      // 静默失败：下次轮询会纠正状态
    } finally {
      setClaiming(false)
    }
  }, [claiming, actions])

  /** 购买商店商品：两步确认防误触（第一次点击进确认态，3 秒内再点才真买）。 */
  const buy = useCallback(async (itemId: string): Promise<void> => {
    if (buying !== null) return
    // 第一次点击：进入确认态（显示「确认购买？」）
    if (confirmBuyId !== itemId) {
      setConfirmBuyId(itemId)
      setShopMsg(null)
      window.setTimeout(() => setConfirmBuyId(cur => (cur === itemId ? null : cur)), 3000)
      return
    }
    setConfirmBuyId(null)
    setBuying(itemId)
    setShopMsg(null)
    try {
      const response = await fetch('/api/devquest/shop/buy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await response.json() as { ok: boolean; reason?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      setShopMsg(data.ok
        ? { ok: true, text: t('dq.shopBought') }
        : { ok: false, text: data.reason === 'insufficient-balance' ? t('dq.shopNoBalance') : (data.reason ?? '') })
    } catch {
      setShopMsg({ ok: false, text: t('dq.error') })
    } finally {
      setBuying(null)
    }
  }, [buying, confirmBuyId, actions, t])

  /** 使用任务重掷。 */
  const rerollQuests = useCallback(async (): Promise<void> => {
    if (rerolling) return
    setRerolling(true)
    try {
      const response = await fetch('/api/devquest/shop/reroll', { method: 'POST' })
      const data = await response.json() as { ok: boolean; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
    } catch {
      // 静默失败
    } finally {
      setRerolling(false)
    }
  }, [rerolling, actions])

  /** 每日幸运抽奖。 */
  const claimLuckyDraw = useCallback(async (): Promise<void> => {
    if (claimingLucky) return
    setClaimingLucky(true)
    setLuckyMsg(null)
    try {
      const response = await fetch('/api/devquest/lucky', { method: 'POST' })
      const data = await response.json() as { ok: boolean; reward?: { kind: string; amount?: number; count?: number; label: string }; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok && data.reward !== undefined) setLuckyMsg(t('dq.luckyResult', { label: data.reward.label }))
      else if (!data.ok) setLuckyMsg(t('dq.luckyClaimed'))
    } catch {
      setLuckyMsg(t('dq.error'))
    } finally {
      setClaimingLucky(false)
    }
  }, [claimingLucky, actions, t])

  /** 导出存档（下载 JSON）。 */
  const exportSave = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/export')
      const text = await response.text()
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devquest-player-${dayKeyLocal()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setShopMsg({ ok: true, text: t('dq.exported') })
    } catch {
      setShopMsg({ ok: false, text: t('dq.error') })
    }
  }, [t])

  /** 导入存档（覆盖当前）。 */
  const importSave = useCallback(async (file: File): Promise<void> => {
    if (importing) return
    setImporting(true)
    try {
      const text = await file.text()
      const response = await fetch('/api/devquest/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
      })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      setShopMsg(data.ok
        ? { ok: true, text: t('dq.imported') }
        : { ok: false, text: t('dq.importFailed') })
    } catch {
      setShopMsg({ ok: false, text: t('dq.importFailed') })
    } finally {
      setImporting(false)
    }
  }, [importing, actions, t])

  /** 切换展示称号（titleId 空 = 跟随等级）。 */
  const switchTitle = useCallback(async (titleId: string): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/titles/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId }),
      })
      const data = await response.json() as { ok: boolean; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
    } catch {
      // 静默失败
    }
  }, [actions])

  /** 领取每周全清奖励。 */
  const claimWeekly = useCallback(async (): Promise<void> => {
    if (weeklyClaiming) return
    setWeeklyClaiming(true)
    try {
      const response = await fetch('/api/devquest/weekly-bonus', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
    } catch {
      // 静默失败
    } finally {
      setWeeklyClaiming(false)
    }
  }, [weeklyClaiming, actions])

  /** 生成成就分享卡片（canvas → PNG 下载）。 */
  const shareCard = useCallback(async (): Promise<void> => {
    if (sharing || state.status === null) return
    setSharing(true)
    try {
      const s = state.status
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      if (ctx === null) throw new Error('no-canvas')
      // 深色渐变背景
      const grad = ctx.createLinearGradient(0, 0, 640, 400)
      grad.addColorStop(0, '#101722')
      grad.addColorStop(1, '#1d2735')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 640, 400)
      // 边框装饰
      ctx.strokeStyle = 'rgba(246,198,82,0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(12, 12, 616, 376)
      // 标题
      ctx.fillStyle = '#8ec5ff'
      ctx.font = '700 22px "Segoe UI", sans-serif'
      ctx.fillText('⚔️ DevQuest', 36, 56)
      // 等级 + 称号
      ctx.fillStyle = '#f6c652'
      ctx.font = '700 46px "Segoe UI", sans-serif'
      ctx.fillText(`Lv.${s.level}`, 36, 130)
      const titleName = s.titles?.current?.name.zh ?? s.title.zh
      ctx.fillStyle = '#f2f6fc'
      ctx.font = '600 24px "Segoe UI", sans-serif'
      ctx.fillText(titleName, 170, 130)
      // XP 条
      const pct = levelPercent(s)
      ctx.fillStyle = '#1d2735'
      ctx.fillRect(36, 160, 568, 14)
      ctx.fillStyle = '#8ec5ff'
      ctx.fillRect(36, 160, Math.round(568 * pct), 14)
      ctx.fillStyle = '#9daabd'
      ctx.font = '500 16px "Segoe UI", sans-serif'
      ctx.fillText(`${s.xp} / ${s.xpToNext} XP`, 36, 198)
      // 统计
      const c = s.counters
      ctx.fillStyle = '#9daabd'
      ctx.font = '500 17px "Segoe UI", sans-serif'
      ctx.fillText(`回合 ${c.turnsCompleted}   ·   工具 ${c.toolCalls}   ·   待办 ${c.todosCompleted}`, 36, 240)
      ctx.fillText(`赛季 ${s.season} · ${s.seasonXp} XP   ·   成就 ${s.achievements.filter(a => a.unlocked).length}/44`, 36, 270)
      // 已解锁成就图标（前 12 个）
      const unlockedIcons = s.achievements.filter(a => a.unlocked).slice(0, 12).map(a => a.icon)
      ctx.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
      for (let i = 0; i < unlockedIcons.length; i++) {
        ctx.fillText(unlockedIcons[i]!, 36 + (i % 6) * 50, 330 + Math.floor(i / 6) * 40)
      }
      // 底部水印
      ctx.fillStyle = '#718096'
      ctx.font = '400 13px "Segoe UI", sans-serif'
      ctx.fillText('DevQuest — 把开发变成 RPG', 36, 372)
      // 下载
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `devquest-card-${dayKeyLocal()}.png`
      a.click()
      setShopMsg({ ok: true, text: t('dq.shareDone') })
    } catch {
      setShopMsg({ ok: false, text: t('dq.shareFailed') })
    } finally {
      setSharing(false)
    }
  }, [sharing, state.status, t])

  const status = state.status
  // 位置：拖拽后 left/top；未拖过则默认右上角。
  const positionStyle: CSSProperties = pos !== null
    ? { left: pos.left, top: pos.top }
    : { right: 16, top: 16 }

  if (status === null) {
    return <section
      ref={cardRef}
      style={{ ...cardStyle, ...positionStyle, ...(dragging ? cardDraggingStyle : {}) }}
      data-devquest
      onPointerDown={onCardPointerDown}
      onPointerMove={onCardPointerMove}
      onPointerUp={onCardPointerUp}
      onPointerCancel={onCardPointerCancel}
    >
      <header style={cardHeaderStyle}>
        <span style={{ color: TONE.accent, display: 'inline-flex' }}><SwordIcon size={20} /></span>
        <strong style={cardTitleStyle}>DevQuest</strong>
        <button type="button" onClick={() => actions.setOpen(false)} aria-label={t('dq.close')} style={iconButtonStyle}><CloseIcon /></button>
      </header>
      <div style={cardBodyStyle}>
        <span style={emptyStyle}>{state.state === 'error' ? `${t('dq.error')} · ${state.error ?? ''}` : t('dq.empty')}</span>
      </div>
    </section>
  }

  const unlocked = status.achievements.filter(a => a.unlocked)
  const recent = [...unlocked].sort((a, b) => (b.acquiredAt ?? 0) - (a.acquiredAt ?? 0)).slice(0, 4)
  const wallItems = status.achievements.filter(a => a.category === category)
  const c = status.counters
  const percent = Math.round(levelPercent(status) * 100)

  // 最近的里程碑：未解锁且可见、有进度的成就里完成度最高（最接近解锁）的一个。
  const milestone = status.achievements
    .filter(a => !a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0)
    .map(a => ({ a, ratio: a.progress!.current / a.progress!.goal }))
    .sort((x, y) => y.ratio - x.ratio)[0]

  return <section
    ref={cardRef}
    style={{ ...cardStyle, ...positionStyle, ...(dragging ? cardDraggingStyle : {}) }}
    data-devquest
    onPointerDown={onCardPointerDown}
    onPointerMove={onCardPointerMove}
    onPointerUp={onCardPointerUp}
    onPointerCancel={onCardPointerCancel}
  >
    <header style={cardHeaderStyle}>
      <span style={{ color: TONE.accent, display: 'inline-flex' }}><SwordIcon size={20} /></span>
      <strong style={cardTitleStyle}>DevQuest</strong>
      <button type="button" onClick={() => actions.setOpen(false)} aria-label={t('dq.close')} style={iconButtonStyle}><CloseIcon /></button>
    </header>

    <div style={cardBodyStyle}>
      {/* 等级环 + XP */}
      <div style={heroStyle}>
        <div style={{ position: 'relative' }}>
          <LevelRing status={status} />
          <div style={levelBadgeStyle}>
            <span style={levelNumStyle}>Lv.{status.level}</span>
            <span style={{ ...levelSubStyle, ...titleToneStyle(status.level) }}>{status.title.zh}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleRowStyle}>
            <span style={{ ...titleTextStyle, ...titleToneStyle(status.level) }}>{status.title.zh}</span>
            {/* 已购称号徽章 */}
            {(status.shop?.badges ?? []).map(badgeId => {
              const item = status.shop?.items.find(i => i.id === badgeId)
              return item !== undefined ? <span key={badgeId} style={titleBadgeStyle} title={item.name.zh}>{item.icon}</span> : null
            })}
            <span style={seasonStyle}>{t('dq.season', { season: status.season })}</span>
          </div>
          {/* E. 升级体验：本等级已坚持多久（levelStartedAt → 天数） */}
          {status.levelStartedAt !== undefined && (
            <span style={levelSinceStyle}>{t('dq.levelSince', { days: Math.max(0, Math.floor((Date.now() - status.levelStartedAt) / 86_400_000)) })}</span>
          )}
          {/* 赛季冲刺条：本赛季 tokens / 100k 目标 + 剩余天数 */}
          <div style={sprintRowStyle}>
            <span style={sprintLabelStyle}>{t('dq.seasonSprint')}</span>
            <div style={sprintTrackStyle}>
              <div style={{ ...sprintFillStyle, width: `${Math.min(100, Math.round((c.seasonTokensOut / SEASON_GOAL_TOKENS) * 100))}%` }} />
            </div>
            <span style={sprintDaysStyle}>{t('dq.seasonDaysLeft', { days: seasonDaysLeft(status.season) })}</span>
          </div>
          <div style={xpTrackStyle}>
            <div style={{ ...xpFillStyle, width: `${percent}%` }} />
          </div>
          <div style={xpRowStyle}>
            <span style={xpTextStyle}>{t('dq.xpToNext', { xp: status.xp, next: status.xpToNext })}</span>
            <button type="button" onClick={refresh} aria-label={t('dq.refresh')} title={t('dq.refresh')} style={iconButtonStyle}><RefreshIcon /></button>
          </div>
          <div style={metaRowStyle}>
            <span style={metaStyle}>{t('dq.turns', { n: c.turnsCompleted })}</span>
            <span style={metaStyle}>{t('dq.toolCalls', { n: c.toolCalls })}</span>
            <span style={metaStyle}>{t('dq.todos', { n: c.todosCompleted })}</span>
            <span style={metaStyle}>{t('dq.tokens', { n: formatNumber(c.tokensOut) })}</span>
            {comboMultiplier(c.consecutiveSuccess) !== null && (
              <span style={comboStyle}>🔥 {t('dq.combo', { n: c.consecutiveSuccess })} ×{comboMultiplier(c.consecutiveSuccess)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 下一称号预览 + 每日幸运抽奖 */}
      <div style={nextTitleRowStyle}>
        {status.nextTitle !== null && (
          <span style={nextTitleStyle}>{t('dq.nextTitle', { name: status.nextTitle.name.zh, level: status.nextTitle.level, xp: Math.max(0, Math.round(status.nextTitle.xpToNext)) })}</span>
        )}
        {status.lucky !== undefined && status.lucky.available && (
          <button
            type="button"
            onClick={() => void claimLuckyDraw()}
            disabled={claimingLucky}
            style={luckyButtonStyle}
          >
            🎁 {claimingLucky ? '…' : t('dq.luckyDraw')}
          </button>
        )}
      </div>
      {luckyMsg !== null && <div style={luckyMsgStyle}>{luckyMsg}</div>}

      {/* 每日任务 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>📅 {t('dq.daily')}</span>
          <span style={updatedStyle}>{status.daily?.date ?? ''}</span>
        </div>
        {(status.daily?.quests ?? []).map(q => {
          const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100))
          return (
            <div key={q.id} style={questRowStyle}>
              <div style={questTopStyle}>
                <span style={questLabelStyle}>{q.done ? '✅' : '⬜'} {q.label.zh}</span>
                <span style={questRewardStyle}>+{q.reward} XP</span>
              </div>
              <div style={questTrackStyle}>
                <div style={{ ...questFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) }} />
              </div>
            </div>
          )
        })}
        {/* 每日全清宝箱：3 个任务全完成后可领取一次 +50 XP */}
        {status.dailyChest !== undefined && (status.dailyChest.ready || status.dailyChest.claimed) && (
          status.dailyChest.claimed
            ? <div style={chestClaimedStyle}>🎁 {t('dq.chestClaimed')}</div>
            : <button type="button" onClick={() => void claimChest()} disabled={claiming} style={chestButtonStyle}>
              🎁 {claiming ? t('dq.chestClaiming') : t('dq.chestReady', { xp: 50 })}
            </button>
        )}
        {/* 每周挑战：本周 3 个目标 */}
        {status.weekly !== undefined && (
          <div style={weeklyWrapStyle}>
            <div style={weeklyHeadStyle}>
              <span style={weeklyTitleStyle}>🗓️ {t('dq.weekly')}</span>
              <span style={weeklyWeekStyle}>{t('dq.weeklyWeek', { week: status.weekly.week })}</span>
            </div>
            {status.weekly.quests.map(q => {
              const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100))
              return (
                <div key={q.id} style={weeklyQuestRowStyle}>
                  <div style={weeklyQuestTopStyle}>
                    <span style={weeklyQuestLabelStyle}>{q.done ? '✅' : '⬜'} {q.label.zh}</span>
                    <span style={weeklyQuestRewardStyle}>+{q.reward} XP</span>
                  </div>
                  <div style={weeklyQuestTrackStyle}>
                    <div style={{ ...weeklyQuestFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) }} />
                  </div>
                </div>
              )
            })}
            {status.weekly.bonusReady
              ? <button type="button" onClick={() => void claimWeekly()} disabled={weeklyClaiming} style={weeklyBonusButtonStyle}>
                🎁 {weeklyClaiming ? '…' : t('dq.weeklyBonus', { xp: 100 })}
              </button>
              : status.weekly.bonusClaimed && <div style={weeklyBonusClaimedStyle}>🎁 {t('dq.weeklyBonusClaimed')}</div>}
          </div>
        )}
        {/* 商店入口行：余额 + 保险/重掷库存 + 打开商店 */}
        <div style={shopBarStyle}>
          <span style={shopBalanceStyle}>{t('dq.shopBalance', { balance: status.shop?.balance ?? 0 })}</span>
          {(status.shop?.shields ?? 0) > 0 && <span style={shopStockStyle}>{t('dq.shopShields', { n: status.shop!.shields })}</span>}
          {(status.shop?.rerolls ?? 0) > 0 && <span style={shopStockStyle}>{t('dq.shopRerolls', { n: status.shop!.rerolls })}</span>}
          <button type="button" onClick={() => setShopOpen(v => !v)} style={linkButtonStyle}>{shopOpen ? '▾' : '🛒 ' + t('dq.shop')}</button>
        </div>
        {shopOpen && (
          <div style={shopGridStyle}>
            {status.shop?.items.map(item => {
              const canAfford = (status.shop!.balance) >= item.price
              return (
                <div key={item.id} style={shopItemStyle}>
                  <div style={shopItemHeadStyle}>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    <span style={shopItemNameStyle}>{item.name.zh}</span>
                    <span style={shopItemPriceStyle}>{item.price}</span>
                  </div>
                  <div style={shopItemDescStyle}>{item.description.zh}</div>
                  {item.owned
                    ? <div style={shopOwnedStyle}>{t('dq.shopOwned')}</div>
                    : <button
                      type="button"
                      onClick={() => void buy(item.id)}
                      disabled={buying !== null || !canAfford}
                      style={{
                        ...shopBuyButtonStyle,
                        ...(confirmBuyId === item.id ? shopConfirmButtonStyle : {}),
                        ...(!canAfford ? shopBuyDisabledStyle : {}),
                      }}
                    >
                      {buying === item.id
                        ? '…'
                        : confirmBuyId === item.id
                          ? `⚠️ ${t('dq.shopConfirm')}`
                          : t('dq.shopBuy')}
                    </button>}
                </div>
              )
            })}
            {shopMsg !== null && <div style={shopMsgStyle(shopMsg.ok)}>{shopMsg.text}</div>}
            {(status.shop?.rerolls ?? 0) > 0 && (
              <button type="button" onClick={() => void rerollQuests()} disabled={rerolling} style={rerollButtonStyle}>
                🔀 {rerolling ? '…' : t('dq.shopReroll')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新手任务链 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>🎓 {t('dq.tutorial')}</span>
          <span style={updatedStyle}>{status.tutorial?.done ? '✅' : t('dq.tutorialStepDone', { n: status.tutorial?.steps.filter(s => s.done).length ?? 0, m: status.tutorial?.steps.length ?? 5 })}</span>
        </div>
        {status.tutorial?.steps.map(step => (
          <div key={step.id} style={tutorialRowStyle}>
            <span style={{ fontSize: 13, opacity: step.done ? 1 : 0.55 }}>{step.done ? '✅' : step.icon}</span>
            <span style={{ ...tutorialNameStyle, ...(step.done ? {} : { color: TONE.muted }) }}>{step.name.zh}</span>
            <span style={tutorialXpStyle}>+{step.xp}</span>
          </div>
        ))}
        {status.tutorial?.done === true && (
          <div style={tutorialTitleStyle}>🏅 {t('dq.tutorialTitle', { title: status.tutorial.title.zh })}</div>
        )}
      </div>

      {/* 多称号：条件解锁称号可切换展示 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>🏷️ {t('dq.titles')}</span>
          <button type="button" onClick={() => setTitlesOpen(v => !v)} style={linkButtonStyle}>
            {titlesOpen ? '▾' : '▸'}
          </button>
        </div>
        {/* 当前展示称号 */}
        <div style={titleCurrentRowStyle}>
          <span style={{ fontSize: 15 }}>{status.titles?.current?.icon ?? '🎖️'}</span>
          <span style={titleCurrentNameStyle}>
            {status.titles?.current !== null
              ? status.titles?.current?.name.zh
              : `${t('dq.titleFollowLevel')} · ${status.title.zh}`}
          </span>
          <button type="button" onClick={() => void shareCard()} disabled={sharing} style={shareButtonStyle}>
            {sharing ? '…' : `📤 ${t('dq.share')}`}
          </button>
        </div>
        {titlesOpen && (
          <div style={titleListStyle}>
            <button
              type="button"
              onClick={() => void switchTitle('')}
              style={{ ...titleItemStyle, ...(status.titles?.current === null ? titleItemActiveStyle : {}) }}
            >
              <span>🎖️</span>
              <span style={titleItemNameStyle}>{t('dq.titleFollowLevel')} · {status.title.zh}</span>
              {status.titles?.current === null && <span style={titleItemActiveMarkStyle}>{t('dq.titleActive')}</span>}
            </button>
            {(status.titles?.items ?? []).map(ti => (
              <button
                key={ti.id}
                type="button"
                onClick={() => { if (ti.unlocked) void switchTitle(ti.id) }}
                disabled={!ti.unlocked}
                style={{
                  ...titleItemStyle,
                  ...(!ti.unlocked ? titleItemLockedStyle : {}),
                  ...(status.titles?.current?.id === ti.id ? titleItemActiveStyle : {}),
                }}
              >
                <span>{ti.unlocked ? ti.icon : '🔒'}</span>
                <span style={titleItemNameStyle}>{ti.name.zh} <em style={itemEnStyle}>{ti.name.en}</em></span>
                {!ti.unlocked && <span style={titleItemLockedMarkStyle}>{t('dq.titleLocked')}</span>}
                {ti.unlocked && status.titles?.current?.id === ti.id && (
                  <span style={titleItemActiveMarkStyle}>{t('dq.titleActive')}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 分类收藏 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>📚 {t('dq.collections')}</span>
        </div>
        {(status.collections?.items ?? []).map(coll => (
          <div key={coll.category} style={collRowStyle}>
            <span style={{ fontSize: 13, opacity: coll.completed ? 1 : 0.6 }}>{coll.completed ? '🏅' : categoryIcon(coll.category)}</span>
            <span style={{ ...collNameStyle, ...(coll.completed ? { color: TONE.gold, fontWeight: 700 } : {}) }}>
              {t(`dq.cat.${coll.category}`)}
            </span>
            <span style={collProgressStyle}>
              {coll.completed ? t('dq.collectionDone') : t('dq.collectionProgress', { n: coll.unlocked, m: coll.total })}
            </span>
            {!coll.completed && <span style={collRewardStyle}>{t('dq.collectionReward', { xp: coll.rewardXp })}</span>}
          </div>
        ))}
      </div>

      {/* 存档管理：导出 / 导入 */}
      <div style={saveBarStyle}>
        <button type="button" onClick={() => void exportSave()} style={saveButtonStyle}>⬇️ {t('dq.export')}</button>
        <label style={saveButtonStyle}>
          {importing ? '…' : `⬆️ ${t('dq.import')}`}
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f !== undefined) void importSave(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* 最近成就 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>{t('dq.recent')}</span>
          <span style={updatedStyle}>{t('dq.updated')} {updatedLabel(state.refreshedAt)}</span>
        </div>
        {recent.length === 0
          ? <span style={emptyStyle}>{t('dq.empty')}</span>
          : <ul style={listStyle}>
            {recent.map(a => (
              <li key={a.id} style={listItemStyle}>
                <span style={{ fontSize: 15 }}>{a.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={itemNameStyle}>{a.name.zh} <em style={itemEnStyle}>{a.name.en}</em></span>
                </span>
                {a.acquiredAt !== undefined && <span style={itemTimeStyle}>{formatTime(a.acquiredAt)}</span>}
              </li>
            ))}
          </ul>}
      </div>

      {/* 成就墙 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>{t('dq.wall')} <span style={wallCountStyle}>{t('dq.wallCount', { n: unlocked.length, m: status.achievements.length })}</span></span>
          <button type="button" onClick={() => setWallOpen(v => !v)} style={linkButtonStyle}>
            {wallOpen ? '▾' : '▸'}
          </button>
        </div>
        {milestone !== undefined && (
          <div style={milestoneStyle}>
            <span style={milestoneIconStyle}>{milestone.a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={milestoneTopStyle}>
                <span style={milestoneNameStyle}>{t('dq.nextMilestone', { name: milestone.a.name.zh })}</span>
                <span style={milestoneNumStyle}>{milestone.a.progress!.current}/{milestone.a.progress!.goal}</span>
              </div>
              <div style={milestoneTrackStyle}>
                <div style={{ ...milestoneFillStyle, width: `${Math.min(100, Math.round(milestone.ratio * 100))}%` }} />
              </div>
            </div>
          </div>
        )}
        {wallOpen && <>
          <div style={tabsStyle}>
            {CATEGORY_KEYS.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                style={{ ...tabStyle, ...(category === key ? tabActiveStyle : {}) }}
              >
                {t(`dq.cat.${key}`)}
              </button>
            ))}
          </div>
          <div style={wallGridStyle}>
            {wallItems.map(a => {
              const locked = !a.unlocked
              const visible = a.unlocked || !a.hidden
              const p = a.progress
              // G. 隐藏成就渐进揭示：未解锁但进度 ≥50% 时显示「?」轮廓（不泄露具体内容）。
              const revealHint = locked && a.hidden && p !== undefined && p.goal > 0 && p.current / p.goal >= 0.5
              return <span
                key={a.id}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = Math.max(8, Math.min(rect.left + rect.width / 2 - 110, window.innerWidth - 228))
                  const below = rect.bottom + 8
                  const y = below + 120 > window.innerHeight ? Math.max(8, rect.top - 120) : below
                  setHover({ a, x, y })
                }}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: 'relative',
                  ...wallCellStyle,
                  ...(locked
                    ? (a.hidden && !revealHint ? wallCellHiddenLockedStyle : wallCellLockedStyle)
                    : { ...wallCellUnlockedStyle, ...rarityCellStyle(a.rarity) }),
                }}
              >
                {a.unlocked && <span style={wallCheckStyle}>✓</span>}
                <span style={{ fontSize: 17, lineHeight: 1.2 }}>{visible ? a.icon : (revealHint ? '❔' : '🔒')}</span>
                {!a.hidden && (
                  <span style={{ ...wallXpStyle, ...(a.unlocked ? wallXpUnlockedStyle : {}) }}>+{a.xp}</span>
                )}
                {/* 未解锁且可计数的成就：格子底部 2px 进度条 */}
                {locked && p !== undefined && p.goal > 0 && (
                  <span style={wallProgressTrackStyle}>
                    <span style={{ ...wallProgressFillStyle, width: `${Math.min(100, Math.round((p.current / p.goal) * 100))}%` }} />
                  </span>
                )}
              </span>
            })}
          </div>
          {hover !== null && <AchievementTooltip hover={hover} t={t} />}
        </>}
      </div>

      {/* 成长周报：最近 7 天 XP 柱状图 */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>📈 {t('dq.report')}</span>
          <button type="button" onClick={() => setReportOpen(v => !v)} style={linkButtonStyle}>
            {reportOpen ? '▾' : '▸'}
          </button>
        </div>
        {reportOpen && (
          <div style={reportStyle}>
            <div style={reportBarsStyle}>
              {(status.history ?? []).slice(-7).map(h => {
                const max = Math.max(...(status.history ?? []).slice(-7).map(x => x.xp), 1)
                const pct = Math.max(4, Math.round((h.xp / max) * 100))
                return (
                  <div key={h.date} style={reportBarColStyle} title={`${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`}>
                    <div style={reportBarWrapStyle}>
                      <div style={{ ...reportBarStyle, height: `${pct}%` }} />
                    </div>
                    <span style={reportBarTurnStyle}>{h.turns > 0 ? h.turns : ''}</span>
                    <span style={reportBarDateStyle}>{h.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
            <div style={reportLegendStyle}>{t('dq.report7d')}</div>
          </div>
        )}
      </div>
    </div>
  </section>
}

// ---------------------------------------------------------------------------
// 成就悬浮简介
// ---------------------------------------------------------------------------

/** 成就墙悬浮提示：鼠标移到成就格上时显示名称/简介/奖励/解锁状态。 */
function AchievementTooltip(
  props: { hover: { a: DevQuestStatus['achievements'][number]; x: number; y: number }; t: DevQuestFooterActionProps['t'] },
): ReactElement {
  const { hover, t } = props
  const a = hover.a
  const visible = a.unlocked || !a.hidden
  const near = !a.unlocked && a.hidden && a.progress !== undefined && a.progress.goal > 0 && a.progress.current / a.progress.goal >= 0.5
  return <div style={{ ...tooltipStyle, left: hover.x, top: hover.y }} role="tooltip">
    <div style={tooltipHeadStyle}>
      <span style={{ fontSize: 20 }}>{visible ? a.icon : (near ? '❔' : '🔒')}</span>
      <div style={{ minWidth: 0 }}>
        <div style={tooltipNameStyle}>{visible ? `${a.name.zh} ${a.name.en}` : '？？？'}</div>
        <div style={tooltipStatusStyle}>
          {a.unlocked
            ? <span style={{ color: TONE.green }}>✅ {t('dq.earned')}</span>
            : <span style={{ color: TONE.quiet }}>🔒 {t('dq.notEarned')}</span>}
          {!a.hidden && <span style={tooltipXpStyle}>+{a.xp} XP</span>}
        </div>
      </div>
    </div>
    <div style={tooltipDescStyle}>{visible ? a.description.zh : (near ? t('dq.hiddenNear') : t('dq.hiddenHint'))}</div>
    {!a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0 && (
      <div style={tooltipProgressWrapStyle}>
        <div style={tooltipProgressTopStyle}>
          <span style={tooltipProgressLabelStyle}>{t('dq.progress')}</span>
          <span style={tooltipProgressNumStyle}>{a.progress.current}/{a.progress.goal}</span>
        </div>
        <div style={tooltipProgressTrackStyle}>
          <div style={{ ...tooltipProgressFillStyle, width: `${Math.min(100, Math.round((a.progress.current / a.progress.goal) * 100))}%` }} />
        </div>
      </div>
    )}
  </div>
}

// ---------------------------------------------------------------------------
// 成就 toast
// ---------------------------------------------------------------------------

/** 统一 toast 分发：成就解锁 / 回合结算。 */
function DevQuestToast(
  props: { toast: DevQuestToast; status: DevQuestStatus; actions: DevQuestFooterActionProps['actions']; t: DevQuestFooterActionProps['t'] },
): ReactElement {
  const { toast, status, actions, t } = props
  useEffect(() => {
    const timer = setTimeout(() => actions.dismissToast(toast.id), 6000)
    return () => clearTimeout(timer)
  }, [toast.id, actions])

  if (toast.kind === 'settlement' && toast.settlement !== undefined) {
    const s = toast.settlement
    const comboText = s.combo !== null ? ` · 🔥 ×${s.combo}` : ''
    const questText = s.questXp > 0 ? ` · 📅 +${s.questXp}` : ''
    return <div style={{ ...toastStyle, borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)' }} role="status">
      <div style={{ fontSize: 18 }}>{s.leveledUp ? '⬆️' : '⚔️'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...toastTitleStyle, color: s.leveledUp ? TONE.gold : TONE.accent }}>
          {s.leveledUp ? t('dq.levelUp', { level: s.levelAfter }) : t('dq.turnDone')}
        </div>
        <div style={toastNameStyle}>+{s.xp} XP{comboText}{questText}</div>
        <div style={toastDescStyle}>
          {s.leveledUp
            ? t('dq.levelUpTo', { title: titleFor(s.levelAfter).zh })
            : t('dq.turnStats', { turns: s.turnsDone })}
        </div>
      </div>
      <button type="button" onClick={() => actions.dismissToast(toast.id)} aria-label={t('dq.close')} style={toastCloseStyle}>×</button>
    </div>
  }

  const def = status.achievements.find(a => a.id === toast.achievementId)
  if (def === undefined) return <></>
  return <div style={{ ...toastStyle, ...rarityToastStyle(def.rarity) }} role="status">
    <div style={{ fontSize: 18 }}>{def.icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ ...toastTitleStyle, color: RARITY_COLOR[def.rarity] ?? TONE.gold }}>
        {t('dq.unlocked')} <span style={{ fontSize: 9, opacity: 0.8 }}>· {t(`dq.rarity.${def.rarity}`)}</span>
      </div>
      <div style={toastNameStyle}>{def.name.zh} <em style={itemEnStyle}>{def.name.en}</em></div>
      <div style={toastDescStyle}>{def.description.zh} · +{def.xp} XP</div>
    </div>
    <button type="button" onClick={() => actions.dismissToast(toast.id)} aria-label={t('dq.close')} style={toastCloseStyle}>×</button>
  </div>
}

// ---------------------------------------------------------------------------
// 入口组件
// ---------------------------------------------------------------------------

/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
export function DevQuestFooterAction(props: DevQuestFooterActionProps): ReactElement {
  const { useStore, actions, t, wide } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  // 无状态时不显示等级（避免启动时闪现错误的 Lv.1；overlay 常驻拉取后自然出现真实等级）。
  const level = state.status?.level
  const open = state.open

  // 收起态：极紧凑的纯图标按钮（28px 居中），无突出角标——
  // 底部操作位空间紧张（多个插件共用），任何突出元素都会被挤占/裁切。
  if (!wide) {
    return <button
      type="button"
      onClick={() => actions.setOpen(!open)}
      title={level === undefined ? t('dq.open') : `${t('dq.open')} · Lv.${level}`}
      aria-label={t('dq.open')}
      aria-expanded={open}
      style={{
        ...railActionStyle,
        ...(open ? footerActionActiveStyle : {}),
      }}
    >
      <span style={{ color: TONE.accent, display: 'inline-flex' }}><SwordIcon size={18} /></span>
    </button>
  }

  return <button
    type="button"
    onClick={() => actions.setOpen(!open)}
    title={t('dq.open')}
    aria-label={t('dq.open')}
    aria-expanded={open}
    style={{
      ...footerActionStyle,
      ...(open ? footerActionActiveStyle : {}),
    }}
  >
    <span style={{ color: TONE.accent, display: 'inline-flex' }}><SwordIcon size={17} /></span>
    <span style={footerLabelStyle}>DevQuest</span>
    {level !== undefined && <span style={levelChipStyle}>Lv.{level}</span>}
  </button>
}

/** shell.overlay：浮动面板 + toast 栈。常驻挂载：页面加载即拉取全局状态并 60s 轮询，
 * 保证侧边栏等级与面板数据在打开面板前就已就绪。 */
export function DevQuestOverlay(props: DevQuestOverlayProps): ReactElement {
  const { useStore, actions, t } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  const controllerRef = useRef<AbortController | null>(null)

  // v0.3 起状态是全局玩家档，与 cwd/session 无关：直接拉取不带 session 参数。
  const refresh = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    actions.setState('loading', null)
    void fetch(STATUS_API, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`devquest ${response.status}`)
      return response.json() as Promise<{ ok: boolean; status: DevQuestStatus }>
    }).then(data => {
      if (controller.signal.aborted) return
      if (data.ok && data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      else actions.setState('error', 'empty response')
    }, () => {
      if (!controller.signal.aborted) actions.setState('error', 'transport error')
    })
  }, [actions])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => {
      clearInterval(timer)
      controllerRef.current?.abort()
    }
  }, [refresh])

  return <>
    {state.open && (
      <DevQuestPanelCard useStore={useStore} actions={actions} t={t} refresh={refresh} />
    )}
    {state.toasts.length > 0 && state.status !== null && (
      <div style={toastStackStyle}>
        {state.toasts.map(toast => (
          <DevQuestToast key={toast.id} toast={toast} status={state.status!} actions={actions} t={t} />
        ))}
      </div>
    )}
  </>
}

// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------

const cardStyle: CSSProperties = {
  position: 'fixed',
  width: 330,
  maxHeight: 'calc(100vh - 32px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: TONE.panel,
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 14,
  boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 999,
  fontFamily: 'inherit',
  // 整个面板都是拖拽面：光标提示可拖，触摸时拦截原生滚动以便拖动。
  cursor: 'grab',
  touchAction: 'none',
}

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderBottom: `1px solid ${TONE.border}`,
}

/** 拖拽中：光标变抓取中，防止误选中文字。 */
const cardDraggingStyle: CSSProperties = { cursor: 'grabbing', userSelect: 'none' }

const cardTitleStyle: CSSProperties = { fontSize: 14, color: TONE.text, letterSpacing: 0.2 }

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  marginLeft: 'auto',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: TONE.muted,
  cursor: 'pointer',
  padding: 0,
}

const cardBodyStyle: CSSProperties = {
  padding: '12px 14px 14px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const heroStyle: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' }

const levelBadgeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}

const levelNumStyle: CSSProperties = { fontSize: 15, fontWeight: 700, color: TONE.text, lineHeight: 1.1 }

const levelSubStyle: CSSProperties = { fontSize: 10, color: TONE.muted }

const titleRowStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8 }

const titleTextStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: TONE.text }

const seasonStyle: CSSProperties = { fontSize: 10, color: TONE.quiet }

const xpTrackStyle: CSSProperties = {
  height: 7,
  borderRadius: 4,
  background: TONE.row,
  overflow: 'hidden',
  marginTop: 8,
}

const xpFillStyle: CSSProperties = {
  height: '100%',
  background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
  borderRadius: 4,
  transition: 'width .4s ease',
}

const xpRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }

const xpTextStyle: CSSProperties = { fontSize: 10, color: TONE.muted }

const metaRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }

const metaStyle: CSSProperties = { fontSize: 10, color: TONE.quiet, background: TONE.row, padding: '2px 6px', borderRadius: 5 }

const comboStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: TONE.gold,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 35%, transparent)',
  padding: '2px 6px',
  borderRadius: 5,
}

const questRowStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }

const questTopStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }

const questLabelStyle: CSSProperties = { fontSize: 11, color: TONE.text }

const questRewardStyle: CSSProperties = { fontSize: 10, fontWeight: 600, color: TONE.gold }

const questTrackStyle: CSSProperties = { height: 6, borderRadius: 3, background: TONE.row, overflow: 'hidden' }

const questFillStyle: CSSProperties = {
  height: '100%',
  background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
  borderRadius: 3,
  transition: 'width .4s ease',
}

const questFillDoneStyle: CSSProperties = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` }

const sectionStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

const sectionHeadStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }

const sectionTitleStyle: CSSProperties = { fontSize: 11, fontWeight: 600, color: TONE.muted, textTransform: 'uppercase', letterSpacing: 0.4 }

const wallCountStyle: CSSProperties = { color: TONE.quiet, fontWeight: 400 }

const updatedStyle: CSSProperties = { fontSize: 10, color: TONE.quiet }

const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }

const listItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 8px',
  borderRadius: 8,
  background: TONE.row,
}

const itemNameStyle: CSSProperties = { fontSize: 12, color: TONE.text }

const itemEnStyle: CSSProperties = { fontSize: 10, color: TONE.quiet, fontStyle: 'normal', marginLeft: 4 }

const itemTimeStyle: CSSProperties = { fontSize: 10, color: TONE.quiet }

const linkButtonStyle: CSSProperties = { border: 'none', background: 'transparent', color: TONE.muted, cursor: 'pointer', fontSize: 11, padding: '0 4px' }

const tabsStyle: CSSProperties = { display: 'flex', gap: 4, flexWrap: 'wrap' }

const tabStyle: CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 10,
  color: TONE.muted,
  background: 'transparent',
  cursor: 'pointer',
}

const tabActiveStyle: CSSProperties = { background: TONE.row, color: TONE.text }

const wallGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }

const wallCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  padding: '4px 2px',
  borderRadius: 8,
  background: TONE.row,
  cursor: 'default',
  border: '1px solid transparent',
  transition: 'opacity .15s ease',
}

/** 已解锁：绿色高亮底 + 边框，图标全彩。 */
const wallCellUnlockedStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 38%, transparent)',
  boxShadow: '0 0 8px rgba(120, 221, 160, 0.12)',
}

/** 未解锁：灰度 + 压暗，一眼可辨。 */
const wallCellLockedStyle: CSSProperties = {
  opacity: 0.45,
  filter: 'grayscale(0.85)',
}

/** 隐藏成就未解锁：更深的灰，几乎隐形。 */
const wallCellHiddenLockedStyle: CSSProperties = {
  opacity: 0.3,
  filter: 'grayscale(1)',
}

/** 已解锁角标 ✓。 */
const wallCheckStyle: CSSProperties = {
  position: 'absolute',
  top: 1,
  right: 3,
  fontSize: 9,
  fontWeight: 700,
  lineHeight: 1,
  color: TONE.green,
}

const wallXpStyle: CSSProperties = { fontSize: 8, color: TONE.quiet }

const wallXpUnlockedStyle: CSSProperties = { color: TONE.gold, fontWeight: 600 }

/** 未解锁成就格子的微型进度条（底部 2px）。 */
const wallProgressTrackStyle: CSSProperties = {
  display: 'block',
  width: '80%',
  height: 2,
  borderRadius: 1,
  background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)',
  overflow: 'hidden',
  marginTop: 1,
}

const wallProgressFillStyle: CSSProperties = {
  display: 'block',
  height: '100%',
  borderRadius: 1,
  background: TONE.accent,
}

/** 「最近的里程碑」引导条。 */
const milestoneStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 9px',
  borderRadius: 9,
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 9%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 22%, transparent)',
  marginBottom: 8,
}

const milestoneIconStyle: CSSProperties = { fontSize: 16, lineHeight: 1 }

const milestoneTopStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }

const milestoneNameStyle: CSSProperties = { fontSize: 10, color: TONE.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

const milestoneNumStyle: CSSProperties = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

const milestoneTrackStyle: CSSProperties = {
  height: 3,
  borderRadius: 2,
  background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)',
  overflow: 'hidden',
  marginTop: 3,
}

const milestoneFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: TONE.accent }

/** tooltip 内进度。 */
const tooltipProgressWrapStyle: CSSProperties = { marginTop: 7 }

const tooltipProgressTopStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }

const tooltipProgressLabelStyle: CSSProperties = { fontSize: 9, color: TONE.quiet, textTransform: 'uppercase', letterSpacing: 0.3 }

const tooltipProgressNumStyle: CSSProperties = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

const tooltipProgressTrackStyle: CSSProperties = { height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)', overflow: 'hidden' }

const tooltipProgressFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: TONE.accent }

/** 每日全清宝箱按钮。 */
const chestButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  padding: '7px 10px',
  marginTop: 6,
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)',
  borderRadius: 9,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 12%, transparent)',
  color: TONE.gold,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}

const chestClaimedStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  marginTop: 6,
  borderRadius: 9,
  background: TONE.row,
  color: TONE.quiet,
  fontSize: 11,
}

// ---- P1/P2 样式 ----

/** 已购称号徽章（称号旁小图标）。 */
const titleBadgeStyle: CSSProperties = { fontSize: 13, lineHeight: 1, marginLeft: -2 }

/** 等级持续天数。 */
const levelSinceStyle: CSSProperties = { display: 'block', fontSize: 9, color: TONE.quiet, marginTop: 1 }

/** 赛季冲刺条。 */
const sprintRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }

const sprintLabelStyle: CSSProperties = { fontSize: 9, color: TONE.quiet, whiteSpace: 'nowrap' }

const sprintTrackStyle: CSSProperties = { flex: 1, height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)', overflow: 'hidden' }

const sprintFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))' }

const sprintDaysStyle: CSSProperties = { fontSize: 9, color: TONE.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

/** 商店栏（每日任务下方）。 */
const shopBarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${TONE.border}` }

const shopBalanceStyle: CSSProperties = { fontSize: 10, color: TONE.gold, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }

const shopStockStyle: CSSProperties = { fontSize: 9, color: TONE.muted }

const shopGridStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }

const shopItemStyle: CSSProperties = { padding: '7px 9px', borderRadius: 9, background: TONE.row, border: `1px solid ${TONE.border}` }

const shopItemHeadStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

const shopItemNameStyle: CSSProperties = { flex: 1, fontSize: 11, color: TONE.text, fontWeight: 600 }

const shopItemPriceStyle: CSSProperties = { fontSize: 10, color: TONE.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }

const shopItemDescStyle: CSSProperties = { fontSize: 10, color: TONE.muted, marginTop: 3, lineHeight: 1.4 }

const shopOwnedStyle: CSSProperties = { marginTop: 5, fontSize: 10, color: TONE.green }

/** 购买按钮：金色高对比（任何主题下都清晰可点，不再是暗色「黑块」）。 */
const shopBuyButtonStyle: CSSProperties = {
  marginTop: 5,
  padding: '4px 12px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 55%, transparent)',
  borderRadius: 7,
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 92%, white), var(--dsw-alias-state-warn-primary, #f6c652))',
  color: '#2b1d00',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
}

/** 确认态：红色高亮，提示「再点一次才真买」。 */
const shopConfirmButtonStyle: CSSProperties = {
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 60%, transparent)',
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 88%, white), var(--dsw-alias-state-error-primary, #ff8592))',
  color: '#3a0609',
}

const shopBuyDisabledStyle: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' }

const rerollButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '5px 10px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 10,
  cursor: 'pointer',
}

const shopMsgStyle = (ok: boolean): CSSProperties => ({
  fontSize: 10,
  color: ok ? TONE.green : TONE.red,
  marginTop: 2,
})

/** 新手任务链。 */
const tutorialRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }

const tutorialNameStyle: CSSProperties = { flex: 1, fontSize: 11, color: TONE.text }

const tutorialXpStyle: CSSProperties = { fontSize: 9, color: TONE.gold }

const tutorialTitleStyle: CSSProperties = { marginTop: 4, fontSize: 11, color: TONE.gold, fontWeight: 700 }

/** 成长周报。 */
const reportStyle: CSSProperties = { marginTop: 4 }

const reportBarsStyle: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 }

const reportBarColStyle: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }

const reportBarWrapStyle: CSSProperties = { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }

const reportBarStyle: CSSProperties = { width: '70%', borderRadius: 3, background: 'linear-gradient(180deg, var(--dsw-alias-brand-primary, #8ec5ff), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent))', transition: 'height .3s ease' }

const reportBarDateStyle: CSSProperties = { fontSize: 8, color: TONE.quiet, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }

const reportLegendStyle: CSSProperties = { marginTop: 4, fontSize: 9, color: TONE.quiet, textAlign: 'center' }

/** 下一称号预览行 + 幸运抽奖。 */
const nextTitleRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }

const nextTitleStyle: CSSProperties = { fontSize: 10, color: TONE.muted }

const luckyButtonStyle: CSSProperties = {
  marginLeft: 'auto',
  padding: '4px 10px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  color: TONE.gold,
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
}

const luckyMsgStyle: CSSProperties = { fontSize: 10, color: TONE.gold, marginTop: 2 }

/** 分类收藏行。 */
const collRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }

const collNameStyle: CSSProperties = { flex: 1, fontSize: 11, color: TONE.text }

const collProgressStyle: CSSProperties = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

const collRewardStyle: CSSProperties = { fontSize: 9, color: TONE.quiet }

// ---- v0.7.0 样式：每周挑战 / 多称号 / 分享 ----

/** 每周挑战。 */
const weeklyWrapStyle: CSSProperties = { marginTop: 8, paddingTop: 8, borderTop: `1px solid ${TONE.border}`, display: 'flex', flexDirection: 'column', gap: 5 }

const weeklyHeadStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }

const weeklyTitleStyle: CSSProperties = { fontSize: 10, fontWeight: 600, color: TONE.muted }

const weeklyWeekStyle: CSSProperties = { fontSize: 9, color: TONE.quiet }

const weeklyQuestRowStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3 }

const weeklyQuestTopStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }

const weeklyQuestLabelStyle: CSSProperties = { fontSize: 10, color: TONE.text }

const weeklyQuestRewardStyle: CSSProperties = { fontSize: 9, fontWeight: 600, color: TONE.gold }

const weeklyQuestTrackStyle: CSSProperties = { height: 4, borderRadius: 2, background: TONE.row, overflow: 'hidden' }

const weeklyQuestFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-brand-primary, #8ec5ff), var(--dsw-alias-state-success-primary, #78dda0))' }

const weeklyBonusButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '6px 10px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  color: TONE.gold,
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
}

const weeklyBonusClaimedStyle: CSSProperties = { marginTop: 4, fontSize: 10, color: TONE.quiet }

/** 多称号。 */
const titleCurrentRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }

const titleCurrentNameStyle: CSSProperties = { flex: 1, fontSize: 12, color: TONE.text, fontWeight: 600 }

const shareButtonStyle: CSSProperties = {
  padding: '4px 10px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 10,
  cursor: 'pointer',
}

const titleListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }

const titleItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  border: `1px solid ${TONE.border}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'left',
}

const titleItemActiveStyle: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)',
}

const titleItemLockedStyle: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' }

const titleItemNameStyle: CSSProperties = { flex: 1, minWidth: 0 }

const titleItemActiveMarkStyle: CSSProperties = { fontSize: 9, color: TONE.gold, fontWeight: 600 }

const titleItemLockedMarkStyle: CSSProperties = { fontSize: 9, color: TONE.quiet }

/** 存档管理。 */
const saveBarStyle: CSSProperties = { display: 'flex', gap: 6 }

const saveButtonStyle: CSSProperties = {
  flex: 1,
  padding: '5px 8px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.muted,
  fontSize: 10,
  cursor: 'pointer',
  textAlign: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/** 周报回合数标注。 */
const reportBarTurnStyle: CSSProperties = { fontSize: 8, color: TONE.quiet, fontVariantNumeric: 'tabular-nums' }

/** 成就悬浮简介卡（fixed 定位，pointer-events none 不挡鼠标）。 */
const tooltipStyle: CSSProperties = {
  position: 'fixed',
  width: 220,
  padding: '9px 11px',
  background: TONE.panel,
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 10,
  boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
  pointerEvents: 'none',
  zIndex: 1001,
}

const tooltipHeadStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

const tooltipNameStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: TONE.text }

const tooltipStatusStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }

const tooltipXpStyle: CSSProperties = { fontSize: 10, fontWeight: 700, color: TONE.gold }

const tooltipDescStyle: CSSProperties = { fontSize: 11, color: TONE.muted, marginTop: 6, lineHeight: 1.5 }

const emptyStyle: CSSProperties = { fontSize: 11, color: TONE.quiet, padding: '8px 0' }

const toastStackStyle: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
  zIndex: 1000,
}

const toastStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  width: 300,
  padding: '10px 12px',
  background: TONE.panel,
  border: `1px solid ${TONE.gold}`,
  borderRadius: 10,
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  pointerEvents: 'auto',
}

const toastTitleStyle: CSSProperties = { fontSize: 10, fontWeight: 700, color: TONE.gold, textTransform: 'uppercase', letterSpacing: 0.4 }

const toastNameStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: TONE.text, marginTop: 2 }

const toastDescStyle: CSSProperties = { fontSize: 11, color: TONE.muted, marginTop: 2 }

const toastCloseStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: TONE.quiet,
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
  marginLeft: 'auto',
  padding: 0,
}

const footerActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  color: TONE.muted,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 8,
  fontSize: 12,
}

/** 收起态（56px rail）入口按钮：紧凑纯图标，不与其他插件图标抢空间。 */
const railActionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  color: TONE.muted,
  cursor: 'pointer',
  padding: 0,
  borderRadius: 7,
}

const footerActionActiveStyle: CSSProperties = { background: TONE.row, color: TONE.text }

const footerLabelStyle: CSSProperties = { fontWeight: 600, fontSize: 12 }

const levelChipStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: TONE.accent,
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
  padding: '1px 5px',
  borderRadius: 999,
}
