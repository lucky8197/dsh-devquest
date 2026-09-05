/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（v0.3 起为全局玩家档，与 cwd/session 无关）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react'
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

import { TONE, SKIN_PALETTES, themeVars, CATEGORY_KEYS } from './panel/theme.ts'
import { SwordIcon, RefreshIcon, CloseIcon } from './panel/icons.tsx'
import { STATUS_API, POLL_MS, levelPercent, comboMultiplier, SEASON_GOAL_TOKENS, seasonDaysLeft, formatNumber, apiErrorOf, playSfx, updatedLabel, titleTone, titleToneStyle, formatTime, dayKeyLocal, RARITY_COLOR, rarityToastStyle, rarityCellStyle, categoryIcon, PANEL_POS_KEY, MIN_VISIBLE, loadPanelPos, PANEL_COLLAPSED_KEY, REMINDER_KEY, loadCollapsed, saveCollapsed, PANEL_SETTINGS_KEY, DEFAULT_SETTINGS, loadSettings, saveSettings, fetchUiSettings, RARITY_WEIGHT, rarityWeight, clampPanelPos } from './panel/util.ts'
import type { DevQuestSettings } from './panel/util.ts'
import { HeroSection, SeasonSummaryCard, DailyGoalCard, RitualSection, LuckyRow, DailySection, WeeklySection, ShopSection, SkinsSection, TutorialSection, TitlesSection, CollectionsSection, PokedexSection, RecentSection, WallSection, ReportSection, CalendarSection, StatsSection, SettingsSection } from './panel/sections.tsx'
import { cardStyle, cardHeaderStyle, cardDraggingStyle, cardTitleStyle, versionLabelStyle, iconButtonStyle, cardBodyStyle, sectionCardStyle, sectionCardHeadStyle, sectionCardTitleStyle, sectionCardArrowStyle, sectionCardBodyStyle, sectionCardBodyHiddenStyle, heroStyle, levelBadgeStyle, levelNumStyle, levelSubStyle, titleRowStyle, titleTextStyle, seasonStyle, xpTrackStyle, xpFillStyle, xpRowStyle, xpTextStyle, metaRowStyle, metaStyle, comboStyle, questRowStyle, questTopStyle, questLabelStyle, questRewardStyle, questTrackStyle, questFillStyle, questFillDoneStyle, wallCountStyle, updatedStyle, listStyle, listItemStyle, itemNameStyle, itemEnStyle, itemTimeStyle, linkButtonStyle, tabsStyle, wallFilterRowStyle, wallSearchInputStyle, wallSelectStyle, tabStyle, tabActiveStyle, wallGridStyle, wallCellStyle, wallCellUnlockedStyle, wallCellLockedStyle, wallCellHiddenLockedStyle, wallCheckStyle, wallXpStyle, wallXpUnlockedStyle, wallProgressTrackStyle, wallProgressFillStyle, milestoneStyle, milestoneIconStyle, milestoneTopStyle, milestoneNameStyle, milestoneNumStyle, milestoneTrackStyle, milestoneFillStyle, tooltipProgressWrapStyle, tooltipProgressTopStyle, tooltipProgressLabelStyle, tooltipProgressNumStyle, tooltipProgressTrackStyle, tooltipProgressFillStyle, chestButtonStyle, chestClaimedStyle, titleBadgeStyle, levelSinceStyle, sprintRowStyle, sprintLabelStyle, sprintTrackStyle, sprintFillStyle, sprintDaysStyle, streakRowStyle, streakBadgeStyle, streakNextStyle, boostStockStyle, passRowStyle, ritualStyle, ritualGreetingStyle, ritualSummaryStyle, ritualReminderStyle, ritualGoalsStyle, ritualGoalStyle, pokedexGridStyle, pokedexItemStyle, pokedexIconStyle, pokedexNameStyle, pokedexTrackStyle, pokedexFillStyle, pokedexNumStyle, settingsRowStyle, settingsLabelStyle, settingsControlStyle, settingsValueStyle, settingsBtnStyle, settingsToggleStyle, settingsToggleOnStyle, passTrackStyle, passTierStyle, shopBarStyle, shopBalanceStyle, shopStockStyle, shopGridStyle, shopItemStyle, shopItemHeadStyle, shopItemNameStyle, shopItemPriceStyle, shopItemDescStyle, shopOwnedStyle, shopBuyButtonStyle, shopConfirmButtonStyle, shopBuyDisabledStyle, shopThemeUseButtonStyle, skinGridStyle, skinSwatchRowStyle, skinSwatchStyle, skinSwatchBorderStyle, skinItemActiveStyle, skinHeadActiveStyle, rerollButtonStyle, panelMsgStyle, dailyGoalCardStyle, dailyGoalRowStyle, dailyGoalLabelStyle, dailyGoalNumStyle, dailyGoalTrackStyle, dailyGoalFillStyle, dailyGoalDoneStyle, dailyGoalClaimButtonStyle, bossCardStyle, bossHeadRowStyle, bossNameStyle, bossHpStyle, bossTrackStyle, bossFillStyle, bossHintStyle, classBadgeStyle, classBadgeNameStyle, classBadgeLabelStyle, seasonSummaryCardStyle, seasonSummaryHeadStyle, seasonSummaryMetaStyle, seasonSummaryRewardStyle, tutorialRowStyle, tutorialNameStyle, tutorialXpStyle, tutorialTitleStyle, reportStyle, reportBarsStyle, reportBarColStyle, reportBarWrapStyle, reportBarStyle, reportBarDateStyle, reportLegendStyle, celebrationOverlayStyle, celebrationInnerStyle, celebrationTitleStyle, celebrationLevelStyle, celebrationStatsStyle, calendarGridStyle, calendarCellStyle, calendarIntensityStyle, calendarLegendColor, calendarLegendStyle, calendarLegendLabelStyle, calendarLegendBlockStyle, statsWrapStyle, statsRowStyle, statsChipStyle, statsSubTitleStyle, toolRankStyle, toolRankRowStyle, toolRankNumStyle, toolRankNameStyle, toolRankCountStyle, recordRowStyle, recordChipStyle, nextTitleRowStyle, nextTitleStyle, luckyButtonStyle, luckyMsgStyle, collRowStyle, collNameStyle, collProgressStyle, collRewardStyle, weeklyQuestRowStyle, weeklyQuestTopStyle, weeklyQuestLabelStyle, weeklyQuestRewardStyle, weeklyQuestTrackStyle, weeklyQuestFillStyle, weeklyBonusButtonStyle, weeklyBonusClaimedStyle, titleCurrentRowStyle, titleCurrentNameStyle, titleHeadCurrentStyle, shareButtonStyle, titleListStyle, titleItemStyle, titleItemActiveStyle, titleItemLockedStyle, titleItemNameStyle, titleItemActiveMarkStyle, titleItemLockedMarkStyle, saveBarStyle, saveButtonStyle, reportBarTurnStyle, tooltipStyle, tooltipHeadStyle, tooltipNameStyle, tooltipStatusStyle, tooltipXpStyle, tooltipDescStyle, emptyStyle, toastStackStyle, toastStyle, toastTitleStyle, toastNameStyle, toastDescStyle, toastCloseStyle, footerActionStyle, railActionStyle, footerActionActiveStyle, footerLabelStyle, levelChipStyle } from './panel/styles.ts'

export type DevQuestFooterActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsStore<ReturnType<typeof createDevQuestStore>>
  & PropsLocale<typeof NS>

export type DevQuestOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createDevQuestStore>>
  & PropsLocale<typeof NS>




// ---------------------------------------------------------------------------
// 面板卡片
// ---------------------------------------------------------------------------







/**
 * 通用分区卡片：带边框的背景块，标题栏可点击折叠/展开。
 * collapsed 由父组件统一管理（section id → boolean）。
 */


/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
export function DevQuestPanelCard(
  props: Pick<DevQuestFooterActionProps, 'useStore' | 'actions' | 't'> & { refresh: () => void },
): ReactElement {
  const { useStore, actions, t, refresh } = props
  const state: DevQuestUiState = useStore(snapshot => snapshot)
  const [category, setCategory] = useState<(typeof CATEGORY_KEYS)[number]>('journey')
  // 成就墙筛选：名称搜索 + 稀有度 + 解锁状态
  const [wallSearch, setWallSearch] = useState('')
  const [wallRarity, setWallRarity] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all')
  const [wallStatus, setWallStatus] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [hover, setHover] = useState<{ a: DevQuestStatus['achievements'][number]; x: number; y: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [confirmBuyId, setConfirmBuyId] = useState<string | null>(null)
  // v1.2.3：全局操作结果条（hero 区下方，所有写操作的成功/失败都可见，4s 自动消失）。
  const [panelMsg, setPanelMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const panelMsgTimer = useRef<number | null>(null)
  const [rerolling, setRerolling] = useState(false)
  const [luckyMsg, setLuckyMsg] = useState<string | null>(null)
  const [claimingLucky, setClaimingLucky] = useState(false)
  const [importing, setImporting] = useState(false)
  const [weeklyClaiming, setWeeklyClaiming] = useState(false)
  const [sharing, setSharing] = useState(false)
  // v1.1 未完成任务提醒：当天 20:00 后提醒一次（localStorage 记日期防重复）。
  const [questReminderMsg, setQuestReminderMsg] = useState<string | null>(null)
  // v1.2.0 面板设置：字号 / 紧凑 / toast 过滤（localStorage 持久化）。
  const [settings, setSettings] = useState<DevQuestSettings>(loadSettings)
  const updateSettings = (patch: Partial<DevQuestSettings>): void => {
    setSettings(cur => {
      const next = { ...cur, ...patch }
      saveSettings(next)
      return next
    })
  }
  /** v1.2.3：显示全局操作结果（成功/失败），4 秒自动消失。 */
  const notify = useCallback((ok: boolean, text: string): void => {
    setPanelMsg({ ok, text })
    if (panelMsgTimer.current !== null) window.clearTimeout(panelMsgTimer.current)
    panelMsgTimer.current = window.setTimeout(() => setPanelMsg(null), 4000)
  }, [])
  // 统一折叠状态：section id → 是否折叠（true=隐藏内容）。
  // 从 localStorage 恢复上次状态（重开面板不再默认全部展开）。
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed)
  const toggleSection = (id: string): void => {
    setCollapsed(cur => {
      const next = { ...cur, [id]: !(cur[id] ?? false) }
      saveCollapsed(next)
      return next
    })
  }
  const isCollapsed = (id: string): boolean => collapsed[id] === true
  /** 全部面板分区 id（一键折叠/展开用）。 */
  const ALL_SECTION_IDS = ['ritual', 'daily', 'weekly', 'shop', 'skins', 'tutorial', 'titles', 'collections', 'pokedex', 'recent', 'wall', 'report', 'calendar', 'stats', 'settings']
  /** 全部展开。 */
  const expandAll = (): void => {
    const next: Record<string, boolean> = {}
    for (const id of ALL_SECTION_IDS) next[id] = false
    setCollapsed(next)
    saveCollapsed(next)
  }
  /** 全部折叠。 */
  const collapseAll = (): void => {
    const next: Record<string, boolean> = {}
    for (const id of ALL_SECTION_IDS) next[id] = true
    setCollapsed(next)
    saveCollapsed(next)
  }
  // 面板位置：null = 默认右上角；拖拽后保存到 localStorage。
  const [pos, setPos] = useState<{ left: number; top: number } | null>(loadPanelPos)
  const [dragging, setDragging] = useState(false)
  const cardRef = useRef<HTMLElement | null>(null)

  // host 设置拉取完成（devquest:ui-settings）时同步面板当前设置（含迁移后的值）。
  useEffect(() => {
    const onUiSettings = (): void => setSettings(loadSettings())
    window.addEventListener('devquest:ui-settings', onUiSettings)
    return () => window.removeEventListener('devquest:ui-settings', onUiSettings)
  }, [])
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

  // v1.1 未完成任务提醒：当天 20:00 后、任务未全清时提醒一次（localStorage 防每日重复）。
  useEffect(() => {
    const status = state.status
    if (status === null) return
    const now = new Date()
    if (now.getHours() < 20) return
    const today = dayKeyLocal()
    try {
      if (localStorage.getItem(REMINDER_KEY) === today) return
    } catch {
      return
    }
    const quests = status.daily?.quests ?? []
    const pending = quests.filter(q => !q.done).length
    if (pending === 0) return
    try {
      localStorage.setItem(REMINDER_KEY, today)
    } catch {
      // 隐私模式忽略
    }
    const text = t('dq.reminder', { n: pending })
    setQuestReminderMsg(text)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('DevQuest', { body: text }) } catch { /* 忽略 */ }
    }
  }, [state.status, t])

  /** 领取每日全清宝箱：POST 后刷新本地状态。 */
  const claimChest = useCallback(async (): Promise<void> => {
    if (claiming) return
    setClaiming(true)
    try {
      const response = await fetch('/api/devquest/claim-chest', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.chestClaimed'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默，失败可见
      notify(false, t('dq.opFailed'))
    } finally {
      setClaiming(false)
    }
  }, [claiming, actions, notify, t])

  /** 购买商店商品：两步确认防误触（第一次点击进确认态，3 秒内再点才真买）。 */
  const buy = useCallback(async (itemId: string): Promise<void> => {
    if (buying !== null) return
    // 第一次点击：进入确认态（显示「确认购买？」）
    if (confirmBuyId !== itemId) {
      setConfirmBuyId(itemId)
      window.setTimeout(() => setConfirmBuyId(cur => (cur === itemId ? null : cur)), 3000)
      return
    }
    setConfirmBuyId(null)
    setBuying(itemId)
    try {
      const response = await fetch('/api/devquest/shop/buy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await response.json() as { ok: boolean; reason?: string; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.shopBought'))
      else {
        const err = apiErrorOf(data)
        notify(false, data.reason === 'insufficient-balance' ? t('dq.shopNoBalance') : (err ?? t('dq.opFailed')))
      }
    } catch {
      notify(false, t('dq.opFailed'))
    } finally {
      setBuying(null)
    }
  }, [buying, confirmBuyId, actions, notify, t])

  /** 使用任务重掷。 */
  const rerollQuests = useCallback(async (): Promise<void> => {
    if (rerolling) return
    setRerolling(true)
    try {
      const response = await fetch('/api/devquest/shop/reroll', { method: 'POST' })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.rerolled'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默
      notify(false, t('dq.opFailed'))
    } finally {
      setRerolling(false)
    }
  }, [rerolling, actions, notify, t])

  /** 每日幸运抽奖。 */
  const claimLuckyDraw = useCallback(async (): Promise<void> => {
    if (claimingLucky) return
    setClaimingLucky(true)
    setLuckyMsg(null)
    try {
      const response = await fetch('/api/devquest/lucky', { method: 'POST' })
      const data = await response.json() as { ok: boolean; error?: string; reward?: { kind: string; amount?: number; count?: number; label: string }; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok && data.reward !== undefined) setLuckyMsg(t('dq.luckyResult', { label: data.reward.label }))
      else if (!data.ok) {
        const err = apiErrorOf(data)
        setLuckyMsg(err !== null ? `⚠️ ${err}` : t('dq.luckyClaimed'))
      }
    } catch {
      setLuckyMsg(t('dq.opFailed'))
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
      notify(true, t('dq.exported'))
    } catch {
      notify(false, t('dq.opFailed'))
    }
  }, [notify, t])

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
      if (data.ok) notify(true, t('dq.imported'))
      else notify(false, apiErrorOf(data) ?? t('dq.importFailed'))
    } catch {
      notify(false, t('dq.importFailed'))
    } finally {
      setImporting(false)
    }
  }, [importing, actions, notify, t])

  /** 切换展示称号（titleId 空 = 跟随等级）。 */
  const switchTitle = useCallback(async (titleId: string): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/titles/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId }),
      })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.titleSwitched'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  /** 切换已拥有主题（空 = 默认主题）。 */
  const activateTheme = useCallback(async (themeId: string): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/shop/theme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ themeId }),
      })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.themeUsed'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默（此前主题切换失败完全无反馈）
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  // v1.3.0 每日目标：设定 / 领取。
  const setGoalF = useCallback(async (goal: number): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/daily-goal/set', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, goal > 0 ? t('dq.dailyGoalSet') : t('dq.dailyGoalOff'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  const claimDailyGoalF = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/daily-goal/claim', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) {
        notify(true, t('dq.dailyGoalClaim', { xp: data.gained }))
        playSfx('goal')
      } else {
        notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
      }
    } catch {
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  /** v1.3.0 领取每周 BOSS 掉落。 */
  const claimBossF = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/weekly-boss/claim', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) {
        notify(true, t('dq.bossDefeat', { name: state.status?.weekly?.boss.name ?? '', n: data.gained }))
        playSfx('boss')
      } else {
        notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
      }
    } catch {
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, state.status, t])

  /** 领取赛季通行证档位奖励。 */
  const claimPassTier = useCallback(async (tierId: string): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/pass/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      const data = await response.json() as { ok: boolean; gained: number; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.passClaimed', { xp: data.gained }))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  /** 使用任务跳过卡。 */
  const useQuestSkipCard = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/devquest/shop/quest-skip', { method: 'POST' })
      const data = await response.json() as { ok: boolean; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.skipUsed'))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默
      notify(false, t('dq.opFailed'))
    }
  }, [actions, notify, t])

  /** 领取每周全清奖励。 */
  const claimWeekly = useCallback(async (): Promise<void> => {
    if (weeklyClaiming) return
    setWeeklyClaiming(true)
    try {
      const response = await fetch('/api/devquest/weekly-bonus', { method: 'POST' })
      const data = await response.json() as { ok: boolean; gained: number; error?: string; status: DevQuestStatus }
      if (data.status !== null && data.status !== undefined) actions.setStatus(data.status)
      if (data.ok) notify(true, t('dq.weeklyClaimed', { xp: data.gained }))
      else notify(false, apiErrorOf(data) ?? t('dq.opFailed'))
    } catch {
      // v1.2.3：不再静默
      notify(false, t('dq.opFailed'))
    } finally {
      setWeeklyClaiming(false)
    }
  }, [weeklyClaiming, actions, notify, t])

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
      ctx.fillText(`赛季 ${s.season} · ${s.seasonXp} XP   ·   成就 ${s.achievements.filter(a => a.unlocked).length}/${s.achievements.length}`, 36, 270)
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
      notify(true, t('dq.shareDone'))
    } catch {
      notify(false, t('dq.shareFailed'))
    } finally {
      setSharing(false)
    }
  }, [sharing, state.status, notify, t])

  /** 生成赛季报告分享卡片（canvas → PNG 下载）。 */
  const shareSeason = useCallback(async (): Promise<void> => {
    if (sharing || state.status === null) return
    setSharing(true)
    try {
      const s = state.status
      const c = s.counters
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 460
      const ctx = canvas.getContext('2d')
      if (ctx === null) throw new Error('no-canvas')
      // 深色渐变背景
      const grad = ctx.createLinearGradient(0, 0, 640, 460)
      grad.addColorStop(0, '#101722')
      grad.addColorStop(1, '#1d2735')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 640, 460)
      ctx.strokeStyle = 'rgba(246,198,82,0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(12, 12, 616, 436)
      // 标题
      ctx.fillStyle = '#8ec5ff'
      ctx.font = '700 22px "Segoe UI", sans-serif'
      ctx.fillText('⚔️ DevQuest · 赛季报告', 36, 56)
      ctx.fillStyle = '#9daabd'
      ctx.font = '500 16px "Segoe UI", sans-serif'
      ctx.fillText(`赛季 ${s.season} · Lv.${s.level} ${s.title.zh}`, 36, 84)
      // 核心数据
      ctx.fillStyle = '#f2f6fc'
      ctx.font = '600 18px "Segoe UI", sans-serif'
      ctx.fillText(`本赛季 XP: ${s.seasonXp}`, 36, 130)
      ctx.fillText(`最高连击: ${Math.max(c.consecutiveSuccess, ...(s.records ?? []).map(r => r.combo))}`, 36, 162)
      ctx.fillText(`连续活跃: ${s.streak?.best ?? c.streakDays} 天`, 36, 194)
      ctx.fillText(`成就: ${s.achievements.filter(a => a.unlocked).length}/${s.achievements.length}`, 36, 226)
      // 工具 TOP5
      ctx.fillStyle = '#f6c652'
      ctx.font = '600 15px "Segoe UI", sans-serif'
      ctx.fillText('工具 TOP5', 36, 268)
      ctx.fillStyle = '#9daabd'
      ctx.font = '500 15px "Segoe UI", sans-serif'
      const top = Object.entries(c.toolCallsByTool).sort((a, b) => b[1] - a[1]).slice(0, 5)
      for (let i = 0; i < top.length; i++) {
        ctx.fillText(`${i + 1}. ${top[i]![0]}  ${top[i]![1]}`, 36, 292 + i * 26)
      }
      // 底部水印
      ctx.fillStyle = '#718096'
      ctx.font = '400 13px "Segoe UI", sans-serif'
      ctx.fillText('DevQuest — 把开发变成 RPG', 36, 440)
      // 下载
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `devquest-season-${s.season}.png`
      a.click()
      notify(true, t('dq.shareDone'))
    } catch {
      notify(false, t('dq.shareFailed'))
    } finally {
      setSharing(false)
    }
  }, [sharing, state.status, notify, t])

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
  // 成就墙筛选：分类 + 名称搜索 + 稀有度 + 解锁状态
  const wallItems = status.achievements
    .filter(a => a.category === category)
    .filter(a => {
      if (wallSearch.trim() !== '') {
        const q = wallSearch.trim().toLowerCase()
        if (!a.name.zh.toLowerCase().includes(q) && !a.name.en.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false
      }
      if (wallRarity !== 'all' && a.rarity !== wallRarity) return false
      if (wallStatus === 'unlocked' && !a.unlocked) return false
      if (wallStatus === 'locked' && a.unlocked) return false
      return true
    })
  const c = status.counters
  const percent = Math.round(levelPercent(status) * 100)

  // 最近的里程碑：未解锁且可见、有进度的成就里完成度最高（最接近解锁）的一个。
  const milestone = status.achievements
    .filter(a => !a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0)
    .map(a => ({ a, ratio: a.progress!.current / a.progress!.goal }))
    .sort((x, y) => y.ratio - x.ratio)[0]

  return <section
    ref={cardRef}
    style={{
      ...cardStyle,
      ...positionStyle,
      ...(dragging ? cardDraggingStyle : {}),
      ...themeVars(status.shop?.theme ?? ''),
      // v1.2.4 字号：只缩放文字（--dq-fsz），面板宽 330 / 位置 / 间距保持不变。
      // 内部所有 fontSize 统一为 calc(Npx * var(--dq-fsz, 1))。
      ...({ '--dq-fsz': String(settings.fontSize) }) as CSSProperties,
      // v1.2.0 紧凑模式：压缩关键间距（分区间距/卡片内边距/标题栏内边距/hero 间距）。
      ...(settings.compact ? {
        '--dq-section-mb': '6px',
        '--dq-body-pad': '8px 10px 10px',
        '--dq-head-pad': '4px 8px',
        '--dq-hero-mb': '8px',
      } : {}),
    }}
    data-devquest
    onPointerDown={onCardPointerDown}
    onPointerMove={onCardPointerMove}
    onPointerUp={onCardPointerUp}
    onPointerCancel={onCardPointerCancel}
  >
    <header style={cardHeaderStyle}>
      <span style={{ color: TONE.accent, display: 'inline-flex' }}><SwordIcon size={20} /></span>
      <strong style={cardTitleStyle}>DevQuest</strong>
      {status.version !== undefined && status.version !== '' && (
        <span style={versionLabelStyle} title={t('dq.version')}>{status.version}</span>
      )}
      <button type="button" onClick={expandAll} aria-label={t('dq.expandAll')} title={t('dq.expandAll')} style={iconButtonStyle}>⤢</button>
      <button type="button" onClick={collapseAll} aria-label={t('dq.collapseAll')} title={t('dq.collapseAll')} style={iconButtonStyle}>⤡</button>
      <button type="button" onClick={() => actions.setOpen(false)} aria-label={t('dq.close')} style={iconButtonStyle}><CloseIcon /></button>
    </header>

    <div style={cardBodyStyle}>
      <HeroSection status={status} t={t} c={c} percent={percent} refresh={refresh} claimPassTier={claimPassTier} />
      <SeasonSummaryCard status={status} t={t} />
      <DailyGoalCard status={status} t={t} claimDailyGoalF={claimDailyGoalF} />

      {/* v1.2.3：全局操作结果条（成功/失败，4s 自动消失） */}
      {panelMsg !== null && (
        <div style={panelMsgStyle(panelMsg.ok)} role="status">
          {panelMsg.ok ? '✅ ' : '⚠️ '}{panelMsg.text}
        </div>
      )}


      <RitualSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} questReminderMsg={questReminderMsg} />
      <LuckyRow status={status} t={t} claimingLucky={claimingLucky} luckyMsg={luckyMsg} claimLuckyDraw={claimLuckyDraw} />
      <DailySection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} claiming={claiming} claimChest={claimChest} />
      <WeeklySection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} weeklyClaiming={weeklyClaiming} claimBossF={claimBossF} claimWeekly={claimWeekly} />
      <ShopSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} buying={buying} confirmBuyId={confirmBuyId} buy={buy} rerolling={rerolling} rerollQuests={rerollQuests} useQuestSkipCard={useQuestSkipCard} />
      <SkinsSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} buying={buying} confirmBuyId={confirmBuyId} buy={buy} activateTheme={activateTheme} />
      <TutorialSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} />
      <TitlesSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} sharing={sharing} shareCard={shareCard} shareSeason={shareSeason} switchTitle={switchTitle} />
      <CollectionsSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} importing={importing} exportSave={exportSave} importSave={importSave} />
      <PokedexSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} unlocked={unlocked} />
      <RecentSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} state={state} recent={recent} />
      <WallSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} category={category} setCategory={setCategory} wallSearch={wallSearch} setWallSearch={setWallSearch} wallRarity={wallRarity} setWallRarity={setWallRarity} wallStatus={wallStatus} setWallStatus={setWallStatus} hover={hover} setHover={setHover} wallItems={wallItems} milestone={milestone} unlocked={unlocked} />
      <ReportSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} />
      <CalendarSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} />
      <StatsSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} c={c} />
      <SettingsSection collapsedMap={collapsed} toggle={toggleSection} status={status} t={t} settings={settings} updateSettings={updateSettings} setGoalF={setGoalF} />
    </div>
  </section>
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
    // v1.3.0 音效 + 桌面通知：成就解锁（升机由结算 toast 触发）。
    if (toast.kind === 'achievement') {
      const settings = loadSettings()
      if (settings.sound) playSfx('achievement')
      if (settings.notify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const def = status.achievements.find(a => a.id === toast.achievementId)
          new Notification('DevQuest', { body: def !== undefined ? `🏆 ${def.name.zh} +${def.xp} XP` : '成就解锁！' })
        } catch {
          // 忽略
        }
      }
    } else if (toast.kind === 'settlement' && toast.settlement?.leveledUp === true) {
      const settings = loadSettings()
      if (settings.sound) playSfx('levelup')
    }
    return () => clearTimeout(timer)
  }, [toast.id, toast.kind, toast.achievementId, toast.settlement, actions, status.achievements])

  if (toast.kind === 'settlement' && toast.settlement !== undefined) {
    const s = toast.settlement
    const comboText = s.combo !== null ? ` · 🔥 ×${s.combo}` : ''
    const questText = s.questXp > 0 ? ` · 📅 +${s.questXp}` : ''
    return <div style={{ ...toastStyle, borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)' }} role="status">
      <div style={{ fontSize: 'calc(18px * var(--dq-fsz, 1))' }}>{s.leveledUp ? '⬆️' : '⚔️'}</div>
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
    <div style={{ fontSize: 'calc(18px * var(--dq-fsz, 1))' }}>{def.icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ ...toastTitleStyle, color: RARITY_COLOR[def.rarity] ?? TONE.gold }}>
        {t('dq.unlocked')} <span style={{ fontSize: 'calc(9px * var(--dq-fsz, 1))', opacity: 0.8 }}>· {t(`dq.rarity.${def.rarity}`)}</span>
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
  // 里程碑庆祝：等级升到 5 的倍数时全屏金色庆祝。
  const [celebration, setCelebration] = useState<{ level: number; title: string; days: number; turns: number } | null>(null)
  const prevLevelRef = useRef<number | null>(null)

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
    // UI 设置：拉取 host 侧权威值（localStorage 仅启动快照；host 无值时自动迁移旧配置）。
    void fetchUiSettings()
    const timer = setInterval(refresh, POLL_MS)
    return () => {
      clearInterval(timer)
      controllerRef.current?.abort()
    }
  }, [refresh])

  // 里程碑检测：等级提升且新等级是 5 的倍数 → 庆祝（只触发一次）。
  useEffect(() => {
    const level = state.status?.level
    if (level === undefined) return
    const prev = prevLevelRef.current
    prevLevelRef.current = level
    if (prev !== null && level > prev && level % 5 === 0 && state.status !== null) {
      const startedAt = state.status.levelStartedAt
      const days = startedAt !== undefined ? Math.max(0, Math.floor((Date.now() - startedAt) / 86_400_000)) : 0
      setCelebration({
        level,
        title: state.status.title.zh,
        days,
        turns: state.status.counters.turnsCompleted,
      })
      window.setTimeout(() => setCelebration(null), 4000)
    }
  }, [state.status])

  // 注入庆祝动画 keyframes（只注入一次）。
  useEffect(() => {
    if (document.getElementById('dsh-devquest-kf') !== null) return
    const style = document.createElement('style')
    style.id = 'dsh-devquest-kf'
    style.textContent = '@keyframes dshCelebrateFade { 0% { opacity: 0; transform: scale(0.92); } 12% { opacity: 1; transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; } }'
    document.head.appendChild(style)
    return () => { document.getElementById('dsh-devquest-kf')?.remove() }
  }, [])

  return <>
    {state.open && (
      <DevQuestPanelCard useStore={useStore} actions={actions} t={t} refresh={refresh} />
    )}
    {state.toasts.length > 0 && state.status !== null && (
      <div style={toastStackStyle}>
        {(() => {
          // v1.2.0 toast 过滤：按设置过滤（rare=仅稀有及以上；off=全关）。localStorage 即时读取。
          const filter = loadSettings().toastFilter
          const visible = filter === 'off' ? [] : state.toasts.filter(toast => {
            if (filter === 'all') return true
            if (toast.kind !== 'achievement') return true // 回合结算 toast 不受稀有度过滤
            const def = state.status?.achievements.find(a => a.id === toast.achievementId)
            return def !== undefined && rarityWeight(def.rarity) >= rarityWeight('rare')
          })
          return visible.map(toast => (
            <DevQuestToast key={toast.id} toast={toast} status={state.status!} actions={actions} t={t} />
          ))
        })()}
      </div>
    )}
    {celebration !== null && (
      <div style={celebrationOverlayStyle} role="alert">
        <div style={celebrationInnerStyle}>
          <div style={{ fontSize: 'calc(64px * var(--dq-fsz, 1))', lineHeight: 1 }}>🏆</div>
          <div style={celebrationTitleStyle}>{t('dq.celebration')}</div>
          <div style={celebrationLevelStyle}>{t('dq.celebrationLevel', { level: celebration.level, title: celebration.title })}</div>
          <div style={celebrationStatsStyle}>{t('dq.celebrationStats', { days: celebration.days, turns: celebration.turns })}</div>
        </div>
      </div>
    )}
  </>
}

