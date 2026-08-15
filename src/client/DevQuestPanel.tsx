/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（host 解析「最近活跃会话」的项目目录）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { DevQuestStatus } from '../types.ts'
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

/** 面板卡片（overlay 内容，可拖拽定位）。sessionId=当前会话 id，面板数据跟随当前会话的项目。 */
export function DevQuestPanelCard(
  props: Pick<DevQuestFooterActionProps, 'useStore' | 'actions' | 't'> & { sessionId?: string | undefined },
): ReactElement {
  const { useStore, actions, t, sessionId } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  const [wallOpen, setWallOpen] = useState(false)
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>('journey')
  const [hover, setHover] = useState<{ a: DevQuestStatus['achievements'][number]; x: number; y: number } | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
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

  const refresh = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    actions.setState('loading', null)
    // 显式携带当前会话 id：面板数据跟随用户正在查看的会话所属项目，
    // 避免 host 侧按「最近活跃」解析时选错项目（不同会话的 seq 不可比）。
    const query = sessionId !== undefined && sessionId !== ''
      ? `?session=${encodeURIComponent(sessionId)}`
      : ''
    void fetch(`${STATUS_API}${query}`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`devquest ${response.status}`)
      return response.json() as Promise<{ ok: boolean; status: DevQuestStatus }>
    }).then(data => {
      if (controller.signal.aborted) return
      if (data.ok && data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      else actions.setState('error', 'empty response')
    }, () => {
      if (!controller.signal.aborted) actions.setState('error', 'transport error')
    })
  }, [actions, sessionId])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => {
      clearInterval(timer)
      controllerRef.current?.abort()
    }
  }, [refresh])

  useEffect(() => {
    if (!state.open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape') actions.setOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.open, actions])

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
            <span style={seasonStyle}>{t('dq.season', { season: status.season })}</span>
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
                    ? (a.hidden ? wallCellHiddenLockedStyle : wallCellLockedStyle)
                    : wallCellUnlockedStyle),
                }}
              >
                {a.unlocked && <span style={wallCheckStyle}>✓</span>}
                <span style={{ fontSize: 17, lineHeight: 1.2 }}>{visible ? a.icon : '🔒'}</span>
                {!a.hidden && (
                  <span style={{ ...wallXpStyle, ...(a.unlocked ? wallXpUnlockedStyle : {}) }}>+{a.xp}</span>
                )}
              </span>
            })}
          </div>
          {hover !== null && <AchievementTooltip hover={hover} t={t} />}
        </>}
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
  return <div style={{ ...tooltipStyle, left: hover.x, top: hover.y }} role="tooltip">
    <div style={tooltipHeadStyle}>
      <span style={{ fontSize: 20 }}>{visible ? a.icon : '🔒'}</span>
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
    <div style={tooltipDescStyle}>{visible ? a.description.zh : t('dq.hiddenHint')}</div>
  </div>
}

// ---------------------------------------------------------------------------
// 成就 toast
// ---------------------------------------------------------------------------

function AchievementToast(
  props: { toast: { id: string; achievementId: string }; status: DevQuestStatus; actions: DevQuestFooterActionProps['actions']; t: DevQuestFooterActionProps['t'] },
): ReactElement {
  const { toast, status, actions, t } = props
  const def = status.achievements.find(a => a.id === toast.achievementId)
  useEffect(() => {
    const timer = setTimeout(() => actions.dismissToast(toast.id), 6000)
    return () => clearTimeout(timer)
  }, [toast.id, actions])

  if (def === undefined) return <></>
  return <div style={toastStyle} role="status">
    <div style={{ fontSize: 18 }}>{def.icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={toastTitleStyle}>{t('dq.unlocked')}</div>
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
  const level = state.status?.level ?? 1
  const open = state.open

  // 收起态：极紧凑的纯图标按钮（28px 居中），无突出角标——
  // 底部操作位空间紧张（多个插件共用），任何突出元素都会被挤占/裁切。
  if (!wide) {
    return <button
      type="button"
      onClick={() => actions.setOpen(!open)}
      title={`${t('dq.open')} · Lv.${level}`}
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
    <span style={levelChipStyle}>Lv.{level}</span>
  </button>
}

/** shell.overlay：浮动面板 + toast 栈。 */
export function DevQuestOverlay(props: DevQuestOverlayProps): ReactElement {
  const { useStore, actions, t, useSessions } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  // 当前会话 id：面板数据跟随用户正在查看的会话所属项目。
  const currentSessionId = useSessions(s => s.current)

  return <>
    {state.open && (
      <DevQuestPanelCard useStore={useStore} actions={actions} t={t} sessionId={currentSessionId} />
    )}
    {state.toasts.length > 0 && state.status !== null && (
      <div style={toastStackStyle}>
        {state.toasts.map(toast => (
          <AchievementToast key={toast.id} toast={toast} status={state.status!} actions={actions} t={t} />
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
