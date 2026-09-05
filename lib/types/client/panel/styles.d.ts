/**
 * DevQuest 面板全部样式常量（CSSProperties，跟随 DSH CSS 变量 / --dq-fsz 字号缩放）。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react';
export declare const cardStyle: CSSProperties;
export declare const cardHeaderStyle: CSSProperties;
/** 拖拽中：光标变抓取中，防止误选中文字。 */
export declare const cardDraggingStyle: CSSProperties;
export declare const cardTitleStyle: CSSProperties;
/** 面板头部版本号：小号弱化标签（提示当前加载的插件版本）。 */
export declare const versionLabelStyle: CSSProperties;
export declare const iconButtonStyle: CSSProperties;
export declare const cardBodyStyle: CSSProperties;
/** 通用分区卡片：独立背景块 + 边框 + 可折叠头部。 */
export declare const sectionCardStyle: CSSProperties;
/** 分区标题栏：可点击折叠（折叠/展开样式一致，仅内容区收起）。 */
export declare const sectionCardHeadStyle: CSSProperties;
export declare const sectionCardTitleStyle: CSSProperties;
/** 折叠箭头。 */
export declare const sectionCardArrowStyle: CSSProperties;
/** 分区内容区。 */
export declare const sectionCardBodyStyle: CSSProperties;
/** 折叠态内容区：完全隐藏（不占空间）。 */
export declare const sectionCardBodyHiddenStyle: CSSProperties;
export declare const heroStyle: CSSProperties;
export declare const levelBadgeStyle: CSSProperties;
export declare const levelNumStyle: CSSProperties;
export declare const levelSubStyle: CSSProperties;
export declare const titleRowStyle: CSSProperties;
export declare const titleTextStyle: CSSProperties;
export declare const seasonStyle: CSSProperties;
export declare const xpTrackStyle: CSSProperties;
export declare const xpFillStyle: CSSProperties;
export declare const xpRowStyle: CSSProperties;
export declare const xpTextStyle: CSSProperties;
export declare const metaRowStyle: CSSProperties;
export declare const metaStyle: CSSProperties;
export declare const comboStyle: CSSProperties;
export declare const questRowStyle: CSSProperties;
export declare const questTopStyle: CSSProperties;
export declare const questLabelStyle: CSSProperties;
export declare const questRewardStyle: CSSProperties;
export declare const questTrackStyle: CSSProperties;
export declare const questFillStyle: CSSProperties;
export declare const questFillDoneStyle: CSSProperties;
export declare const wallCountStyle: CSSProperties;
export declare const updatedStyle: CSSProperties;
export declare const listStyle: CSSProperties;
export declare const listItemStyle: CSSProperties;
export declare const itemNameStyle: CSSProperties;
export declare const itemEnStyle: CSSProperties;
export declare const itemTimeStyle: CSSProperties;
export declare const linkButtonStyle: CSSProperties;
export declare const tabsStyle: CSSProperties;
/** 成就墙筛选行：搜索框 + 稀有度/状态下拉。 */
export declare const wallFilterRowStyle: CSSProperties;
export declare const wallSearchInputStyle: CSSProperties;
export declare const wallSelectStyle: CSSProperties;
export declare const tabStyle: CSSProperties;
export declare const tabActiveStyle: CSSProperties;
export declare const wallGridStyle: CSSProperties;
export declare const wallCellStyle: CSSProperties;
/** 已解锁：绿色高亮底 + 边框，图标全彩。 */
export declare const wallCellUnlockedStyle: CSSProperties;
/** 未解锁：灰度 + 压暗，一眼可辨。 */
export declare const wallCellLockedStyle: CSSProperties;
/** 隐藏成就未解锁：更深的灰，几乎隐形。 */
export declare const wallCellHiddenLockedStyle: CSSProperties;
/** 已解锁角标 ✓。 */
export declare const wallCheckStyle: CSSProperties;
export declare const wallXpStyle: CSSProperties;
export declare const wallXpUnlockedStyle: CSSProperties;
/** 未解锁成就格子的微型进度条（底部 2px）。 */
export declare const wallProgressTrackStyle: CSSProperties;
export declare const wallProgressFillStyle: CSSProperties;
/** 「最近的里程碑」引导条。 */
export declare const milestoneStyle: CSSProperties;
export declare const milestoneIconStyle: CSSProperties;
export declare const milestoneTopStyle: CSSProperties;
export declare const milestoneNameStyle: CSSProperties;
export declare const milestoneNumStyle: CSSProperties;
export declare const milestoneTrackStyle: CSSProperties;
export declare const milestoneFillStyle: CSSProperties;
/** tooltip 内进度。 */
export declare const tooltipProgressWrapStyle: CSSProperties;
export declare const tooltipProgressTopStyle: CSSProperties;
export declare const tooltipProgressLabelStyle: CSSProperties;
export declare const tooltipProgressNumStyle: CSSProperties;
export declare const tooltipProgressTrackStyle: CSSProperties;
export declare const tooltipProgressFillStyle: CSSProperties;
/** 每日全清宝箱按钮。 */
export declare const chestButtonStyle: CSSProperties;
export declare const chestClaimedStyle: CSSProperties;
/** 已购称号徽章（称号旁小图标）。 */
export declare const titleBadgeStyle: CSSProperties;
/** 等级持续天数。 */
export declare const levelSinceStyle: CSSProperties;
/** 赛季冲刺条。 */
export declare const sprintRowStyle: CSSProperties;
export declare const sprintLabelStyle: CSSProperties;
export declare const sprintTrackStyle: CSSProperties;
export declare const sprintFillStyle: CSSProperties;
export declare const sprintDaysStyle: CSSProperties;
/** v1.1 连续活跃行。 */
export declare const streakRowStyle: CSSProperties;
export declare const streakBadgeStyle: CSSProperties;
export declare const streakNextStyle: CSSProperties;
export declare const boostStockStyle: CSSProperties;
/** v1.1 赛季通行证行。 */
export declare const passRowStyle: CSSProperties;
/** v1.1 每日开工仪式。 */
export declare const ritualStyle: CSSProperties;
export declare const ritualGreetingStyle: CSSProperties;
export declare const ritualSummaryStyle: CSSProperties;
export declare const ritualReminderStyle: CSSProperties;
export declare const ritualGoalsStyle: CSSProperties;
export declare const ritualGoalStyle: CSSProperties;
/** v1.1 收藏图鉴总览。 */
export declare const pokedexGridStyle: CSSProperties;
export declare const pokedexItemStyle: CSSProperties;
export declare const pokedexIconStyle: CSSProperties;
export declare const pokedexNameStyle: CSSProperties;
export declare const pokedexTrackStyle: CSSProperties;
export declare const pokedexFillStyle: CSSProperties;
export declare const pokedexNumStyle: CSSProperties;
/** v1.2.0 设置区。 */
export declare const settingsRowStyle: CSSProperties;
export declare const settingsLabelStyle: CSSProperties;
export declare const settingsControlStyle: CSSProperties;
export declare const settingsValueStyle: CSSProperties;
export declare const settingsBtnStyle: CSSProperties;
export declare const settingsToggleStyle: CSSProperties;
export declare const settingsToggleOnStyle: CSSProperties;
export declare const passTrackStyle: CSSProperties;
export declare const passTierStyle: (reached: boolean, claimed: boolean) => CSSProperties;
/** 商店分区：库存行（保险/重掷）。 */
export declare const shopBarStyle: CSSProperties;
export declare const shopBalanceStyle: CSSProperties;
export declare const shopStockStyle: CSSProperties;
export declare const shopGridStyle: CSSProperties;
export declare const shopItemStyle: CSSProperties;
export declare const shopItemHeadStyle: CSSProperties;
export declare const shopItemNameStyle: CSSProperties;
export declare const shopItemPriceStyle: CSSProperties;
export declare const shopItemDescStyle: CSSProperties;
export declare const shopOwnedStyle: CSSProperties;
/** 购买按钮：金色高对比（任何主题下都清晰可点，不再是暗色「黑块」）。 */
export declare const shopBuyButtonStyle: CSSProperties;
/** 确认态：红色高亮，提示「再点一次才真买」。 */
export declare const shopConfirmButtonStyle: CSSProperties;
export declare const shopBuyDisabledStyle: CSSProperties;
/** 「使用主题」按钮：品牌色描边 + 浅色填充（区别于购买的金色按钮）。 */
export declare const shopThemeUseButtonStyle: CSSProperties;
/** 主题皮肤独立分区：皮肤卡片网格。 */
export declare const skinGridStyle: CSSProperties;
/** 皮肤配色预览行：4 个小色块（主色/金色/背景/面板底）。 */
export declare const skinSwatchRowStyle: CSSProperties;
export declare const skinSwatchStyle: (color: string) => CSSProperties;
/** 面板底色块：浅色底加描边保证可见。 */
export declare const skinSwatchBorderStyle: (color: string) => CSSProperties;
/** 当前激活的皮肤卡片：品牌色描边高亮。 */
export declare const skinItemActiveStyle: CSSProperties;
/** 皮肤分区标题栏右侧：当前激活皮肤胶囊。 */
export declare const skinHeadActiveStyle: CSSProperties;
export declare const rerollButtonStyle: CSSProperties;
/** v1.2.3：全局操作结果条（成功绿色 / 失败红色，带淡背景）。 */
export declare const panelMsgStyle: (ok: boolean) => CSSProperties;
export declare const dailyGoalCardStyle: CSSProperties;
export declare const dailyGoalRowStyle: CSSProperties;
export declare const dailyGoalLabelStyle: CSSProperties;
export declare const dailyGoalNumStyle: CSSProperties;
export declare const dailyGoalTrackStyle: CSSProperties;
export declare const dailyGoalFillStyle: CSSProperties;
export declare const dailyGoalDoneStyle: CSSProperties;
export declare const dailyGoalClaimButtonStyle: CSSProperties;
export declare const bossCardStyle: CSSProperties;
export declare const bossHeadRowStyle: CSSProperties;
export declare const bossNameStyle: CSSProperties;
export declare const bossHpStyle: CSSProperties;
export declare const bossTrackStyle: CSSProperties;
export declare const bossFillStyle: CSSProperties;
export declare const bossHintStyle: CSSProperties;
export declare const classBadgeStyle: CSSProperties;
export declare const classBadgeNameStyle: CSSProperties;
export declare const classBadgeLabelStyle: CSSProperties;
export declare const seasonSummaryCardStyle: CSSProperties;
export declare const seasonSummaryHeadStyle: CSSProperties;
export declare const seasonSummaryMetaStyle: CSSProperties;
export declare const seasonSummaryRewardStyle: CSSProperties;
/** 新手任务链。 */
export declare const tutorialRowStyle: CSSProperties;
export declare const tutorialNameStyle: CSSProperties;
export declare const tutorialXpStyle: CSSProperties;
export declare const tutorialTitleStyle: CSSProperties;
/** 成长周报。 */
export declare const reportStyle: CSSProperties;
export declare const reportBarsStyle: CSSProperties;
export declare const reportBarColStyle: CSSProperties;
export declare const reportBarWrapStyle: CSSProperties;
export declare const reportBarStyle: CSSProperties;
export declare const reportBarDateStyle: CSSProperties;
export declare const reportLegendStyle: CSSProperties;
/** 全屏里程碑庆祝。 */
export declare const celebrationOverlayStyle: CSSProperties;
export declare const celebrationInnerStyle: CSSProperties;
export declare const celebrationTitleStyle: CSSProperties;
export declare const celebrationLevelStyle: CSSProperties;
export declare const celebrationStatsStyle: CSSProperties;
/** 活跃日历。 */
export declare const calendarGridStyle: CSSProperties;
export declare const calendarCellStyle: CSSProperties;
export declare function calendarIntensityStyle(intensity: number): CSSProperties;
/** 活跃日历强度色（与格子一致：1-4 级绿）。 */
export declare function calendarLegendColor(level: number): string;
/** 活跃日历图例：少 → 多 4 级绿色块（与日历格子同色）。 */
export declare const calendarLegendStyle: CSSProperties;
export declare const calendarLegendLabelStyle: CSSProperties;
export declare const calendarLegendBlockStyle: (level: number) => CSSProperties;
/** 统计页。 */
export declare const statsWrapStyle: CSSProperties;
export declare const statsRowStyle: CSSProperties;
export declare const statsChipStyle: CSSProperties;
export declare const statsSubTitleStyle: CSSProperties;
export declare const toolRankStyle: CSSProperties;
export declare const toolRankRowStyle: CSSProperties;
export declare const toolRankNumStyle: CSSProperties;
export declare const toolRankNameStyle: CSSProperties;
export declare const toolRankCountStyle: CSSProperties;
/** 荣誉墙。 */
export declare const recordRowStyle: CSSProperties;
export declare const recordChipStyle: CSSProperties;
/** 下一称号预览行 + 幸运抽奖。 */
export declare const nextTitleRowStyle: CSSProperties;
export declare const nextTitleStyle: CSSProperties;
export declare const luckyButtonStyle: CSSProperties;
export declare const luckyMsgStyle: CSSProperties;
/** 分类收藏行。 */
export declare const collRowStyle: CSSProperties;
export declare const collNameStyle: CSSProperties;
export declare const collProgressStyle: CSSProperties;
export declare const collRewardStyle: CSSProperties;
/** 每周挑战。 */
export declare const weeklyQuestRowStyle: CSSProperties;
export declare const weeklyQuestTopStyle: CSSProperties;
export declare const weeklyQuestLabelStyle: CSSProperties;
export declare const weeklyQuestRewardStyle: CSSProperties;
export declare const weeklyQuestTrackStyle: CSSProperties;
export declare const weeklyQuestFillStyle: CSSProperties;
export declare const weeklyBonusButtonStyle: CSSProperties;
export declare const weeklyBonusClaimedStyle: CSSProperties;
/** 多称号。 */
export declare const titleCurrentRowStyle: CSSProperties;
export declare const titleCurrentNameStyle: CSSProperties;
/** 称号区标题栏右侧：当前展示称号（折叠时也能看到具体称号）。 */
export declare const titleHeadCurrentStyle: CSSProperties;
export declare const shareButtonStyle: CSSProperties;
export declare const titleListStyle: CSSProperties;
export declare const titleItemStyle: CSSProperties;
export declare const titleItemActiveStyle: CSSProperties;
export declare const titleItemLockedStyle: CSSProperties;
export declare const titleItemNameStyle: CSSProperties;
export declare const titleItemActiveMarkStyle: CSSProperties;
export declare const titleItemLockedMarkStyle: CSSProperties;
/** 存档管理。 */
export declare const saveBarStyle: CSSProperties;
export declare const saveButtonStyle: CSSProperties;
/** 周报回合数标注。 */
export declare const reportBarTurnStyle: CSSProperties;
/** 成就悬浮简介卡（fixed 定位，pointer-events none 不挡鼠标）。 */
export declare const tooltipStyle: CSSProperties;
export declare const tooltipHeadStyle: CSSProperties;
export declare const tooltipNameStyle: CSSProperties;
export declare const tooltipStatusStyle: CSSProperties;
export declare const tooltipXpStyle: CSSProperties;
export declare const tooltipDescStyle: CSSProperties;
export declare const emptyStyle: CSSProperties;
export declare const toastStackStyle: CSSProperties;
export declare const toastStyle: CSSProperties;
export declare const toastTitleStyle: CSSProperties;
export declare const toastNameStyle: CSSProperties;
export declare const toastDescStyle: CSSProperties;
export declare const toastCloseStyle: CSSProperties;
export declare const footerActionStyle: CSSProperties;
/** 收起态（56px rail）入口按钮：紧凑纯图标，不与其他插件图标抢空间。 */
export declare const railActionStyle: CSSProperties;
export declare const footerActionActiveStyle: CSSProperties;
export declare const footerLabelStyle: CSSProperties;
export declare const levelChipStyle: CSSProperties;
