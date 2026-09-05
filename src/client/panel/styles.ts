/**
 * DevQuest 面板全部样式常量（CSSProperties，跟随 DSH CSS 变量 / --dq-fsz 字号缩放）。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react'
import { TONE } from './theme.ts'

// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------

export const cardStyle: CSSProperties = {
  position: 'fixed',
  width: 330,
  // 面板高度上限：最多屏幕高度的 80%（超出部分在面板内部滚动）。
  maxHeight: '80vh',
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

export const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderBottom: `1px solid ${TONE.border}`,
}

/** 拖拽中：光标变抓取中，防止误选中文字。 */
export const cardDraggingStyle: CSSProperties = { cursor: 'grabbing', userSelect: 'none' }

export const cardTitleStyle: CSSProperties = { fontSize: 'calc(14px * var(--dq-fsz, 1))', color: TONE.text, letterSpacing: 0.2 }

/** 面板头部版本号：小号弱化标签（提示当前加载的插件版本）。 */
export const versionLabelStyle: CSSProperties = {
  fontSize: 'calc(9px * var(--dq-fsz, 1))',
  lineHeight: 1,
  color: TONE.quiet,
  border: `1px solid ${TONE.border}`,
  borderRadius: 99,
  padding: '2px 5px',
  whiteSpace: 'nowrap',
}

export const iconButtonStyle: CSSProperties = {
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

export const cardBodyStyle: CSSProperties = {
  padding: 'var(--dq-body-pad, 12px 14px 14px)',
  overflowY: 'auto',
  display: 'block',
}

/** 通用分区卡片：独立背景块 + 边框 + 可折叠头部。 */
export const sectionCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 10,
  marginBottom: 'var(--dq-section-mb, 12px)',
  background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 55%, transparent)',
  border: `1px solid ${TONE.border}`,
  overflow: 'hidden',
}

/** 分区标题栏：可点击折叠（折叠/展开样式一致，仅内容区收起）。 */
export const sectionCardHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  width: '100%',
  padding: 'var(--dq-head-pad, 7px 10px)',
  border: 'none',
  borderBottom: `1px solid ${TONE.border}`,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
}

export const sectionCardTitleStyle: CSSProperties = {
  fontSize: 'calc(11px * var(--dq-fsz, 1))',
  fontWeight: 700,
  // fallback 用深色：浅色主题下即使变量缺失文字也可见。
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  letterSpacing: 0.3,
}

/** 折叠箭头。 */
export const sectionCardArrowStyle: CSSProperties = {
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  color: TONE.quiet,
  display: 'inline-flex',
  alignItems: 'center',
}

/** 分区内容区。 */
export const sectionCardBodyStyle: CSSProperties = {
  padding: '8px 10px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flexShrink: 0,
}

/** 折叠态内容区：完全隐藏（不占空间）。 */
export const sectionCardBodyHiddenStyle: CSSProperties = {
  display: 'none',
}

export const heroStyle: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 'var(--dq-hero-mb, 12px)' }

export const levelBadgeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}

export const levelNumStyle: CSSProperties = { fontSize: 'calc(15px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.text, lineHeight: 1.1 }

export const levelSubStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted }

export const titleRowStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8 }

export const titleTextStyle: CSSProperties = { fontSize: 'calc(13px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text }

export const seasonStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet }

export const xpTrackStyle: CSSProperties = {
  height: 7,
  borderRadius: 4,
  // 轨道用中性灰底 + 边框：深浅主题都清晰可见（浅色主题不再是白/浅灰条）。
  background: 'rgba(120, 130, 150, 0.28)',
  border: `1px solid ${TONE.border}`,
  overflow: 'hidden',
  marginTop: 8,
}

export const xpFillStyle: CSSProperties = {
  height: '100%',
  background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
  borderRadius: 4,
  transition: 'width .4s ease',
}

export const xpRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }

export const xpTextStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted }

export const metaRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }

export const metaStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet, background: TONE.row, padding: '2px 6px', borderRadius: 5 }

export const comboStyle: CSSProperties = {
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 700,
  color: TONE.gold,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 35%, transparent)',
  padding: '2px 6px',
  borderRadius: 5,
}

export const questRowStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }

export const questTopStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }

export const questLabelStyle: CSSProperties = { fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.text }

export const questRewardStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.gold }

export const questTrackStyle: CSSProperties = { height: 6, borderRadius: 3, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' }

export const questFillStyle: CSSProperties = {
  height: '100%',
  background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
  borderRadius: 3,
  transition: 'width .4s ease',
}

export const questFillDoneStyle: CSSProperties = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` }

export const wallCountStyle: CSSProperties = { color: TONE.quiet, fontWeight: 400 }

export const updatedStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet }

export const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }

export const listItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 8px',
  borderRadius: 8,
  background: TONE.row,
}

export const itemNameStyle: CSSProperties = { fontSize: 'calc(12px * var(--dq-fsz, 1))', color: TONE.text }

export const itemEnStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet, fontStyle: 'normal', marginLeft: 4 }

export const itemTimeStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet }

export const linkButtonStyle: CSSProperties = { border: 'none', background: 'transparent', color: TONE.muted, cursor: 'pointer', fontSize: 'calc(11px * var(--dq-fsz, 1))', padding: '0 4px' }

export const tabsStyle: CSSProperties = { display: 'flex', gap: 4, flexWrap: 'wrap' }

/** 成就墙筛选行：搜索框 + 稀有度/状态下拉。 */
export const wallFilterRowStyle: CSSProperties = { display: 'flex', gap: 5, marginBottom: 6, alignItems: 'center' }

export const wallSearchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 6,
  padding: '3px 7px',
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  color: TONE.text,
  background: 'transparent',
  outline: 'none',
}

export const wallSelectStyle: CSSProperties = {
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 6,
  padding: '2px 4px',
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  color: TONE.text,
  background: 'transparent',
  cursor: 'pointer',
}

export const tabStyle: CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  color: TONE.muted,
  background: 'transparent',
  cursor: 'pointer',
}

export const tabActiveStyle: CSSProperties = { background: TONE.row, color: TONE.text }

export const wallGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }

export const wallCellStyle: CSSProperties = {
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
export const wallCellUnlockedStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 38%, transparent)',
  boxShadow: '0 0 8px rgba(120, 221, 160, 0.12)',
}

/** 未解锁：灰度 + 压暗，一眼可辨。 */
export const wallCellLockedStyle: CSSProperties = {
  opacity: 0.45,
  filter: 'grayscale(0.85)',
}

/** 隐藏成就未解锁：更深的灰，几乎隐形。 */
export const wallCellHiddenLockedStyle: CSSProperties = {
  opacity: 0.3,
  filter: 'grayscale(1)',
}

/** 已解锁角标 ✓。 */
export const wallCheckStyle: CSSProperties = {
  position: 'absolute',
  top: 1,
  right: 3,
  fontSize: 'calc(9px * var(--dq-fsz, 1))',
  fontWeight: 700,
  lineHeight: 1,
  color: TONE.green,
}

export const wallXpStyle: CSSProperties = { fontSize: 'calc(8px * var(--dq-fsz, 1))', color: TONE.quiet }

export const wallXpUnlockedStyle: CSSProperties = { color: TONE.gold, fontWeight: 600 }

/** 未解锁成就格子的微型进度条（底部 2px）。 */
export const wallProgressTrackStyle: CSSProperties = {
  display: 'block',
  width: '80%',
  height: 2,
  borderRadius: 1,
  background: 'rgba(120, 130, 150, 0.35)',
  overflow: 'hidden',
  marginTop: 1,
}

export const wallProgressFillStyle: CSSProperties = {
  display: 'block',
  height: '100%',
  borderRadius: 1,
  background: TONE.accent,
}

/** 「最近的里程碑」引导条。 */
export const milestoneStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 9px',
  borderRadius: 9,
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 9%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 22%, transparent)',
  marginBottom: 8,
}

export const milestoneIconStyle: CSSProperties = { fontSize: 'calc(16px * var(--dq-fsz, 1))', lineHeight: 1 }

export const milestoneTopStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }

export const milestoneNameStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export const milestoneNumStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

export const milestoneTrackStyle: CSSProperties = {
  height: 3,
  borderRadius: 2,
  background: 'rgba(120, 130, 150, 0.28)',
  border: `1px solid ${TONE.border}`,
  overflow: 'hidden',
  marginTop: 3,
}

export const milestoneFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: TONE.accent }

/** tooltip 内进度。 */
export const tooltipProgressWrapStyle: CSSProperties = { marginTop: 7 }

export const tooltipProgressTopStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 }

export const tooltipProgressLabelStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, textTransform: 'uppercase', letterSpacing: 0.3 }

export const tooltipProgressNumStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

export const tooltipProgressTrackStyle: CSSProperties = { height: 3, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' }

export const tooltipProgressFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: TONE.accent }

/** 每日全清宝箱按钮。 */
export const chestButtonStyle: CSSProperties = {
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
  fontSize: 'calc(11px * var(--dq-fsz, 1))',
  fontWeight: 600,
  cursor: 'pointer',
}

export const chestClaimedStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  marginTop: 6,
  borderRadius: 9,
  background: TONE.row,
  color: TONE.quiet,
  fontSize: 'calc(11px * var(--dq-fsz, 1))',
}

// ---- P1/P2 样式 ----

/** 已购称号徽章（称号旁小图标）。 */
export const titleBadgeStyle: CSSProperties = { fontSize: 'calc(13px * var(--dq-fsz, 1))', lineHeight: 1, marginLeft: -2 }

/** 等级持续天数。 */
export const levelSinceStyle: CSSProperties = { display: 'block', fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, marginTop: 1 }

/** 赛季冲刺条。 */
export const sprintRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }

export const sprintLabelStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, whiteSpace: 'nowrap' }

export const sprintTrackStyle: CSSProperties = { flex: 1, height: 4, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' }

export const sprintFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))' }

export const sprintDaysStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

/** v1.1 连续活跃行。 */
export const streakRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }

export const streakBadgeStyle: CSSProperties = {
  fontSize: 'calc(9px * var(--dq-fsz, 1))',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 22%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 99,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
}

export const streakNextStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet }

export const boostStockStyle: CSSProperties = { marginLeft: 'auto', fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.gold, whiteSpace: 'nowrap' }

/** v1.1 赛季通行证行。 */
export const passRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }

/** v1.1 每日开工仪式。 */
export const ritualStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 }

export const ritualGreetingStyle: CSSProperties = { fontSize: 'calc(12px * var(--dq-fsz, 1))', fontWeight: 700, color: 'var(--dsw-alias-label-primary, #1a2230)' }

export const ritualSummaryStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted }

export const ritualReminderStyle: CSSProperties = {
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 16%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 45%, transparent)',
  borderRadius: 7,
  padding: '4px 8px',
}

export const ritualGoalsStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4 }

export const ritualGoalStyle: CSSProperties = {
  fontSize: 'calc(9px * var(--dq-fsz, 1))',
  color: TONE.text,
  background: TONE.row,
  borderRadius: 99,
  padding: '2px 7px',
  whiteSpace: 'nowrap',
}

/** v1.1 收藏图鉴总览。 */
export const pokedexGridStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

export const pokedexItemStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7 }

export const pokedexIconStyle: CSSProperties = { fontSize: 'calc(14px * var(--dq-fsz, 1))', width: 18, textAlign: 'center' }

export const pokedexNameStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text, width: 52, flexShrink: 0 }

export const pokedexTrackStyle: CSSProperties = {
  flex: 1,
  height: 7,
  borderRadius: 4,
  background: 'rgba(120,130,150,0.28)',
  border: `1px solid ${TONE.border}`,
  overflow: 'hidden',
}

export const pokedexFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 3,
  background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))',
}

export const pokedexNumStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

/** v1.2.0 设置区。 */
export const settingsRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '3px 0' }

export const settingsLabelStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text }

export const settingsControlStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

export const settingsValueStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }

export const settingsBtnStyle: CSSProperties = {
  width: 22,
  height: 22,
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 6,
  background: 'transparent',
  color: TONE.text,
  fontSize: 'calc(12px * var(--dq-fsz, 1))',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const settingsToggleStyle: CSSProperties = {
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 6,
  padding: '2px 10px',
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  color: TONE.quiet,
  background: 'transparent',
  cursor: 'pointer',
}

export const settingsToggleOnStyle: CSSProperties = {
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
  borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 55%, transparent)',
}

export const passTrackStyle: CSSProperties = { display: 'flex', gap: 3, flex: 1 }

export const passTierStyle = (reached: boolean, claimed: boolean): CSSProperties => ({
  flex: 1,
  height: 14,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'calc(8px * var(--dq-fsz, 1))',
  lineHeight: 1,
  cursor: reached && !claimed ? 'pointer' : 'default',
  background: claimed
    ? 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 45%, transparent)'
    : reached
      ? 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 60%, transparent)'
      : 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 65%, transparent)',
  border: `1px solid ${TONE.border}`,
  color: claimed || reached ? '#1a2230' : TONE.quiet,
})

/** 商店分区：库存行（保险/重掷）。 */
export const shopBarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingBottom: 2 }

export const shopBalanceStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }

export const shopStockStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted }

export const shopGridStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }

export const shopItemStyle: CSSProperties = { padding: '7px 9px', borderRadius: 9, background: TONE.row, border: `1px solid ${TONE.border}` }

export const shopItemHeadStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 }

export const shopItemNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.text, fontWeight: 600 }

export const shopItemPriceStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }

export const shopItemDescStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted, marginTop: 3, lineHeight: 1.4 }

export const shopOwnedStyle: CSSProperties = { marginTop: 5, fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.green }

/** 购买按钮：金色高对比（任何主题下都清晰可点，不再是暗色「黑块」）。 */
export const shopBuyButtonStyle: CSSProperties = {
  marginTop: 5,
  padding: '4px 12px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 55%, transparent)',
  borderRadius: 7,
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 92%, white), var(--dsw-alias-state-warn-primary, #f6c652))',
  color: '#2b1d00',
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
}

/** 确认态：红色高亮，提示「再点一次才真买」。 */
export const shopConfirmButtonStyle: CSSProperties = {
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 60%, transparent)',
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 88%, white), var(--dsw-alias-state-error-primary, #ff8592))',
  color: '#3a0609',
}

export const shopBuyDisabledStyle: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' }

/** 「使用主题」按钮：品牌色描边 + 浅色填充（区别于购买的金色按钮）。 */
export const shopThemeUseButtonStyle: CSSProperties = {
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 55%, transparent)',
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, white), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, white))',
  color: 'var(--dsw-alias-label-primary, #1a2230)',
}

/** 主题皮肤独立分区：皮肤卡片网格。 */
export const skinGridStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }

/** 皮肤配色预览行：4 个小色块（主色/金色/背景/面板底）。 */
export const skinSwatchRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }

export const skinSwatchStyle = (color: string): CSSProperties => ({
  width: 14,
  height: 10,
  borderRadius: 3,
  background: color,
  border: '1px solid rgba(120,130,150,0.35)',
})

/** 面板底色块：浅色底加描边保证可见。 */
export const skinSwatchBorderStyle = (color: string): CSSProperties => ({
  width: 14,
  height: 10,
  borderRadius: 3,
  background: color,
  border: '1px solid rgba(120,130,150,0.45)',
})

/** 当前激活的皮肤卡片：品牌色描边高亮。 */
export const skinItemActiveStyle: CSSProperties = {
  border: '1.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 65%, transparent)',
  boxShadow: '0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
}

/** 皮肤分区标题栏右侧：当前激活皮肤胶囊。 */
export const skinHeadActiveStyle: CSSProperties = {
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)',
  borderRadius: 99,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
  maxWidth: 130,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const rerollButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '5px 10px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  cursor: 'pointer',
}

/** v1.2.3：全局操作结果条（成功绿色 / 失败红色，带淡背景）。 */
export const panelMsgStyle = (ok: boolean): CSSProperties => ({
  fontSize: 'calc(11px * var(--dq-fsz, 1))',
  lineHeight: 1.4,
  color: ok ? TONE.green : TONE.red,
  background: ok
    ? 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 10%, transparent)'
    : 'color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 10%, transparent)',
  border: `1px solid ${ok ? TONE.green : TONE.red}`,
  borderRadius: 8,
  padding: '6px 10px',
  marginBottom: 'var(--dq-section-mb, 12px)',
  wordBreak: 'break-all',
})

// ---------------------------------------------------------------------------
// v1.3.0 每日 XP 目标 / 每周 BOSS / 职业徽章 / 赛季结算卡
// ---------------------------------------------------------------------------

export const dailyGoalCardStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 55%, transparent)',
  border: `1px solid ${TONE.border}`,
  borderRadius: 10,
  padding: '8px 10px',
  marginBottom: 'var(--dq-section-mb, 12px)',
}

export const dailyGoalRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }

export const dailyGoalLabelStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text }

export const dailyGoalNumStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, fontVariantNumeric: 'tabular-nums' }

export const dailyGoalTrackStyle: CSSProperties = { height: 5, borderRadius: 3, background: TONE.row, overflow: 'hidden' }

export const dailyGoalFillStyle: CSSProperties = { height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-state-success-primary, #78dda0))' }

export const dailyGoalDoneStyle: CSSProperties = { marginTop: 4, fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.green }

export const dailyGoalClaimButtonStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 22%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
}

export const bossCardStyle: CSSProperties = {
  marginTop: 8,
  background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 8%, transparent)',
  border: `1px solid ${TONE.border}`,
  borderRadius: 8,
  padding: '7px 9px',
}

export const bossHeadRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }

export const bossNameStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.red }

export const bossHpStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

export const bossTrackStyle: CSSProperties = { height: 6, borderRadius: 3, background: TONE.row, overflow: 'hidden' }

export const bossFillStyle: CSSProperties = { height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--dsw-alias-state-error-primary, #ff8592), var(--dsw-alias-state-warn-primary, #f6c652))' }

export const bossHintStyle: CSSProperties = { marginTop: 4, fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet }

export const classBadgeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 35%, transparent)',
  borderRadius: 8,
  padding: '5px 9px',
  marginBottom: 6,
}

export const classBadgeNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(11px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text }

export const classBadgeLabelStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.accent, textTransform: 'uppercase', letterSpacing: 0.3 }

export const seasonSummaryCardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent))',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 40%, transparent)',
  borderRadius: 10,
  padding: '8px 10px',
  marginBottom: 'var(--dq-section-mb, 12px)',
}

export const seasonSummaryHeadStyle: CSSProperties = { fontSize: 'calc(11px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.gold }

export const seasonSummaryMetaStyle: CSSProperties = { marginTop: 3, fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text }

export const seasonSummaryRewardStyle: CSSProperties = { marginTop: 3, fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.green }

/** 新手任务链。 */
export const tutorialRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }

export const tutorialNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.text }

export const tutorialXpStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.gold }

export const tutorialTitleStyle: CSSProperties = { marginTop: 4, fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.gold, fontWeight: 700 }

/** 成长周报。 */
export const reportStyle: CSSProperties = { marginTop: 4 }

export const reportBarsStyle: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 }

export const reportBarColStyle: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }

export const reportBarWrapStyle: CSSProperties = { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }

export const reportBarStyle: CSSProperties = { width: '70%', borderRadius: 3, background: 'linear-gradient(180deg, var(--dsw-alias-brand-primary, #8ec5ff), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent))', transition: 'height .3s ease' }

export const reportBarDateStyle: CSSProperties = { fontSize: 'calc(8px * var(--dq-fsz, 1))', color: TONE.quiet, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }

export const reportLegendStyle: CSSProperties = { marginTop: 4, fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, textAlign: 'center' }

// ---- v0.8.0 样式：庆祝动效 / 活跃日历 / 统计 / 荣誉墙 ----

/** 全屏里程碑庆祝。 */
export const celebrationOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 40%, rgba(246,198,82,0.22), rgba(10,14,22,0.75) 70%)',
  pointerEvents: 'none',
  animation: 'dshCelebrateFade 4s ease forwards',
}

export const celebrationInnerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '28px 44px',
  borderRadius: 18,
  background: 'rgba(23,31,43,0.92)',
  border: '2px solid rgba(246,198,82,0.6)',
  boxShadow: '0 0 60px rgba(246,198,82,0.35)',
}

export const celebrationTitleStyle: CSSProperties = { fontSize: 'calc(20px * var(--dq-fsz, 1))', fontWeight: 800, color: TONE.gold, letterSpacing: 1 }

export const celebrationLevelStyle: CSSProperties = { fontSize: 'calc(16px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text }

export const celebrationStatsStyle: CSSProperties = { fontSize: 'calc(12px * var(--dq-fsz, 1))', color: TONE.muted }

/** 活跃日历。 */
export const calendarGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginTop: 4 }

export const calendarCellStyle: CSSProperties = {
  aspectRatio: '1 / 1',
  borderRadius: 3,
  background: TONE.row,
}

export function calendarIntensityStyle(intensity: number): CSSProperties {
  const colors = [
    'var(--dsw-alias-bg-layer-2, #1d2735)',
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)',
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)',
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)',
    'var(--dsw-alias-state-success-primary, #78dda0)',
  ]
  return { background: colors[Math.min(intensity, 4)] ?? colors[0] }
}

/** 活跃日历强度色（与格子一致：1-4 级绿）。 */
export function calendarLegendColor(level: number): string {
  const colors = [
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)',
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)',
    'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)',
    'var(--dsw-alias-state-success-primary, #78dda0)',
  ]
  return colors[Math.min(Math.max(level, 1), 4) - 1]! as string
}

/** 活跃日历图例：少 → 多 4 级绿色块（与日历格子同色）。 */
export const calendarLegendStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  marginTop: 6,
}

export const calendarLegendLabelStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet }

export const calendarLegendBlockStyle = (level: number): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 3,
  background: calendarLegendColor(level),
})

/** 统计页。 */
export const statsWrapStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }

export const statsRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 }

export const statsChipStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text, background: TONE.row, padding: '4px 8px', borderRadius: 7 }

export const statsSubTitleStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.muted, marginTop: 2 }

export const toolRankStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 }

export const toolRankRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 6, background: TONE.row }

export const toolRankNumStyle: CSSProperties = { width: 16, fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, fontWeight: 700 }

export const toolRankNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

export const toolRankCountStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, fontVariantNumeric: 'tabular-nums' }

/** 荣誉墙。 */
export const recordRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 }

export const recordChipStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.gold, background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 30%, transparent)', padding: '3px 7px', borderRadius: 6 }

/** 下一称号预览行 + 幸运抽奖。 */
export const nextTitleRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }

export const nextTitleStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted }

export const luckyButtonStyle: CSSProperties = {
  marginLeft: 'auto',
  padding: '4px 10px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  color: TONE.gold,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  cursor: 'pointer',
}

export const luckyMsgStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.gold, marginTop: 2 }

/** 分类收藏行。 */
export const collRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }

export const collNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.text }

export const collProgressStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, fontVariantNumeric: 'tabular-nums' }

export const collRewardStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet }

// ---- v0.7.0 样式：每周挑战 / 多称号 / 分享 ----

/** 每周挑战。 */
export const weeklyQuestRowStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3 }

export const weeklyQuestTopStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }

export const weeklyQuestLabelStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text }

export const weeklyQuestRewardStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.gold }

export const weeklyQuestTrackStyle: CSSProperties = { height: 4, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' }

export const weeklyQuestFillStyle: CSSProperties = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-brand-primary, #8ec5ff), var(--dsw-alias-state-success-primary, #78dda0))' }

export const weeklyBonusButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '6px 10px',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
  borderRadius: 8,
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
  color: TONE.gold,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  cursor: 'pointer',
}

export const weeklyBonusClaimedStyle: CSSProperties = { marginTop: 4, fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.quiet }

/** 多称号。 */
export const titleCurrentRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }

export const titleCurrentNameStyle: CSSProperties = { flex: 1, fontSize: 'calc(12px * var(--dq-fsz, 1))', color: TONE.text, fontWeight: 600 }

/** 称号区标题栏右侧：当前展示称号（折叠时也能看到具体称号）。 */
export const titleHeadCurrentStyle: CSSProperties = {
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #1a2230)',
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)',
  borderRadius: 99,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
  maxWidth: 130,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

export const shareButtonStyle: CSSProperties = {
  padding: '4px 10px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  cursor: 'pointer',
}

export const titleListStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }

export const titleItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  border: `1px solid ${TONE.border}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.text,
  fontSize: 'calc(11px * var(--dq-fsz, 1))',
  cursor: 'pointer',
  textAlign: 'left',
}

export const titleItemActiveStyle: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)',
}

export const titleItemLockedStyle: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' }

export const titleItemNameStyle: CSSProperties = { flex: 1, minWidth: 0 }

export const titleItemActiveMarkStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.gold, fontWeight: 600 }

export const titleItemLockedMarkStyle: CSSProperties = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet }

/** 存档管理。 */
export const saveBarStyle: CSSProperties = { display: 'flex', gap: 6 }

export const saveButtonStyle: CSSProperties = {
  flex: 1,
  padding: '5px 8px',
  border: `1px solid ${TONE.borderStrong}`,
  borderRadius: 8,
  background: TONE.row,
  color: TONE.muted,
  fontSize: 'calc(10px * var(--dq-fsz, 1))',
  cursor: 'pointer',
  textAlign: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/** 周报回合数标注。 */
export const reportBarTurnStyle: CSSProperties = { fontSize: 'calc(8px * var(--dq-fsz, 1))', color: TONE.quiet, fontVariantNumeric: 'tabular-nums' }

/** 成就悬浮简介卡（fixed 定位，pointer-events none 不挡鼠标）。 */
export const tooltipStyle: CSSProperties = {
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

export const tooltipHeadStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

export const tooltipNameStyle: CSSProperties = { fontSize: 'calc(12px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text }

export const tooltipStatusStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }

export const tooltipXpStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.gold }

export const tooltipDescStyle: CSSProperties = { fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.muted, marginTop: 6, lineHeight: 1.5 }

export const emptyStyle: CSSProperties = { fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.quiet, padding: '8px 0' }

export const toastStackStyle: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
  zIndex: 1000,
}

export const toastStyle: CSSProperties = {
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

export const toastTitleStyle: CSSProperties = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.gold, textTransform: 'uppercase', letterSpacing: 0.4 }

export const toastNameStyle: CSSProperties = { fontSize: 'calc(13px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text, marginTop: 2 }

export const toastDescStyle: CSSProperties = { fontSize: 'calc(11px * var(--dq-fsz, 1))', color: TONE.muted, marginTop: 2 }

export const toastCloseStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: TONE.quiet,
  cursor: 'pointer',
  fontSize: 'calc(15px * var(--dq-fsz, 1))',
  lineHeight: 1,
  marginLeft: 'auto',
  padding: 0,
}

export const footerActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  color: TONE.muted,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 8,
  fontSize: 'calc(12px * var(--dq-fsz, 1))',
}

/** 收起态（56px rail）入口按钮：紧凑纯图标，不与其他插件图标抢空间。 */
export const railActionStyle: CSSProperties = {
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

export const footerActionActiveStyle: CSSProperties = { background: TONE.row, color: TONE.text }

export const footerLabelStyle: CSSProperties = { fontWeight: 600, fontSize: 'calc(12px * var(--dq-fsz, 1))' }

export const levelChipStyle: CSSProperties = {
  fontSize: 'calc(9px * var(--dq-fsz, 1))',
  fontWeight: 700,
  color: TONE.accent,
  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)',
  border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
  padding: '1px 5px',
  borderRadius: 999,
}
