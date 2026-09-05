/**
 * DevQuest 面板分区组件（从 DevQuestPanelCard 机械拆分，纯展示：
 * 状态与回调由 DevQuestPanel.tsx 持有并经 props 传入——行为不变）。
 */
import { type ReactElement, type ReactNode } from 'react'
import type { DevQuestStatus } from '../../types.ts'
import type { DevQuestUiState } from '../store.ts'
import type { DevQuestSettings } from './util.ts'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
import { CATEGORY_KEYS, SKIN_PALETTES, TONE } from './theme.ts'
import { RefreshIcon } from './icons.tsx'
import { SEASON_GOAL_TOKENS, categoryIcon, comboMultiplier, dayKeyLocal, formatNumber, formatTime, levelPercent, rarityCellStyle, seasonDaysLeft, titleToneStyle, updatedLabel } from './util.ts'
import { boostStockStyle, bossCardStyle, bossFillStyle, bossHeadRowStyle, bossHintStyle, bossHpStyle, bossNameStyle, bossTrackStyle, calendarCellStyle, calendarGridStyle, calendarIntensityStyle, calendarLegendBlockStyle, calendarLegendLabelStyle, calendarLegendStyle, chestButtonStyle, chestClaimedStyle, classBadgeLabelStyle, classBadgeNameStyle, classBadgeStyle, collNameStyle, collProgressStyle, collRewardStyle, collRowStyle, comboStyle, dailyGoalCardStyle, dailyGoalClaimButtonStyle, dailyGoalDoneStyle, dailyGoalFillStyle, dailyGoalLabelStyle, dailyGoalNumStyle, dailyGoalRowStyle, dailyGoalTrackStyle, emptyStyle, heroStyle, iconButtonStyle, itemEnStyle, itemNameStyle, itemTimeStyle, levelBadgeStyle, levelNumStyle, levelSinceStyle, levelSubStyle, listItemStyle, listStyle, luckyButtonStyle, luckyMsgStyle, metaRowStyle, metaStyle, milestoneFillStyle, milestoneIconStyle, milestoneNameStyle, milestoneNumStyle, milestoneStyle, milestoneTopStyle, milestoneTrackStyle, nextTitleRowStyle, nextTitleStyle, passRowStyle, passTierStyle, passTrackStyle, pokedexFillStyle, pokedexGridStyle, pokedexIconStyle, pokedexItemStyle, pokedexNameStyle, pokedexNumStyle, pokedexTrackStyle, questFillDoneStyle, questFillStyle, questLabelStyle, questRewardStyle, questRowStyle, questTopStyle, questTrackStyle, recordChipStyle, recordRowStyle, reportBarColStyle, reportBarDateStyle, reportBarStyle, reportBarTurnStyle, reportBarWrapStyle, reportBarsStyle, reportLegendStyle, reportStyle, rerollButtonStyle, ritualGoalStyle, ritualGoalsStyle, ritualGreetingStyle, ritualReminderStyle, ritualStyle, ritualSummaryStyle, saveBarStyle, saveButtonStyle, seasonStyle, seasonSummaryCardStyle, seasonSummaryHeadStyle, seasonSummaryMetaStyle, seasonSummaryRewardStyle, sectionCardArrowStyle, sectionCardBodyHiddenStyle, sectionCardBodyStyle, sectionCardHeadStyle, sectionCardStyle, sectionCardTitleStyle, settingsBtnStyle, settingsControlStyle, settingsLabelStyle, settingsRowStyle, settingsToggleOnStyle, settingsToggleStyle, settingsValueStyle, shareButtonStyle, shopBarStyle, shopBuyButtonStyle, shopBuyDisabledStyle, shopConfirmButtonStyle, shopGridStyle, shopItemDescStyle, shopItemHeadStyle, shopItemNameStyle, shopItemPriceStyle, shopItemStyle, shopOwnedStyle, shopStockStyle, shopThemeUseButtonStyle, skinGridStyle, skinHeadActiveStyle, skinItemActiveStyle, skinSwatchBorderStyle, skinSwatchRowStyle, skinSwatchStyle, sprintDaysStyle, sprintFillStyle, sprintLabelStyle, sprintRowStyle, sprintTrackStyle, statsChipStyle, statsRowStyle, statsSubTitleStyle, statsWrapStyle, streakBadgeStyle, streakNextStyle, streakRowStyle, tabActiveStyle, tabStyle, tabsStyle, titleBadgeStyle, titleCurrentNameStyle, titleCurrentRowStyle, titleHeadCurrentStyle, titleItemActiveMarkStyle, titleItemActiveStyle, titleItemLockedMarkStyle, titleItemLockedStyle, titleItemNameStyle, titleItemStyle, titleListStyle, titleRowStyle, titleTextStyle, toolRankCountStyle, toolRankNameStyle, toolRankNumStyle, toolRankRowStyle, toolRankStyle, tooltipDescStyle, tooltipHeadStyle, tooltipNameStyle, tooltipProgressFillStyle, tooltipProgressLabelStyle, tooltipProgressNumStyle, tooltipProgressTopStyle, tooltipProgressTrackStyle, tooltipProgressWrapStyle, tooltipStatusStyle, tooltipStyle, tooltipXpStyle, tutorialNameStyle, tutorialRowStyle, tutorialTitleStyle, tutorialXpStyle, updatedStyle, wallCellHiddenLockedStyle, wallCellLockedStyle, wallCellStyle, wallCellUnlockedStyle, wallCheckStyle, wallCountStyle, wallFilterRowStyle, wallGridStyle, wallProgressFillStyle, wallProgressTrackStyle, wallSearchInputStyle, wallSelectStyle, wallXpStyle, wallXpUnlockedStyle, weeklyBonusButtonStyle, weeklyBonusClaimedStyle, weeklyQuestFillStyle, weeklyQuestLabelStyle, weeklyQuestRewardStyle, weeklyQuestRowStyle, weeklyQuestTopStyle, weeklyQuestTrackStyle, xpFillStyle, xpRowStyle, xpTextStyle, xpTrackStyle } from './styles.ts'

/** 翻译函数（与主面板一致）。 */
export type TFunc = PropsLocale<typeof NS>['t']

/** 通用分区卡片（各分区组件使用）。 */
function SectionCard(props: {
  id: string
  title: string
  /** 标题右侧附加信息（日期/计数等）。 */
  right?: ReactNode
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}): ReactElement {
  const { id, title, right, collapsed, onToggle, children } = props
  return <section style={sectionCardStyle} data-section={id} data-collapsed={collapsed ? 'true' : 'false'}>
    {/* 标题栏：折叠/展开样式保持一致（浅色+深字），只翻转箭头——折叠后是正常标题栏，不是黑条 */}
    <button
      type="button"
      onClick={onToggle}
      style={sectionCardHeadStyle}
      aria-expanded={!collapsed}
      title={collapsed ? '展开' : '折叠'}
    >
      <span style={sectionCardTitleStyle}>{title}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {right}
        <span style={sectionCardArrowStyle}>{collapsed ? '▸' : '▾'}</span>
      </span>
    </button>
    {/* 用 display:none 而非条件渲染：DOM 结构稳定，避免折叠部分分区时布局异常 */}
    <div style={{ ...sectionCardBodyStyle, ...(collapsed ? sectionCardBodyHiddenStyle : {}) }}>{children}</div>
  </section>
}

/** 等级环（hero 分区使用）。 */
function LevelRing({ status }: { status: DevQuestStatus }): ReactElement {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const progress = levelPercent(status)
  return <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
    <circle cx="42" cy="42" r={radius} fill="none" stroke={TONE.border} strokeWidth="5" />
    <circle cx="42" cy="42" r={radius} fill="none" stroke={TONE.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progress * circumference} ${circumference}`} />
  </svg>
}

export function HeroSection(props: {
  status: DevQuestStatus
  t: TFunc
  c: DevQuestStatus['counters']
  percent: number
  refresh: () => void
  claimPassTier: (tierId: string) => unknown
}): ReactElement {
  const { status, t, c, percent, refresh, claimPassTier } = props
  return <>
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
          {/* v1.1 连续活跃 + 赛季通行证 */}
          <div style={streakRowStyle}>
            <span style={streakBadgeStyle} title={t('dq.streakBest', { best: status.streak?.best ?? 0 })}>
              🔥 {t('dq.streak', { n: status.streak?.days ?? 0 })}
            </span>
            {status.streak?.nextTierXp !== null && status.streak !== undefined && (
              <span style={streakNextStyle}>{t('dq.streakNext', { xp: status.streak.nextTierXp ?? 0 })}</span>
            )}
            <span style={boostStockStyle}>
              {(status.shop?.xpBoostTurns ?? 0) > 0 && `⚡×${status.shop?.xpBoostTurns ?? 0}`}
              {(status.shop?.questSkips ?? 0) > 0 && ` ⏭️×${status.shop?.questSkips ?? 0}`}
            </span>
          </div>
          {/* 赛季通行证：里程碑进度条 + 可领取档位 */}
          <div style={passRowStyle}>
            <span style={sprintLabelStyle}>{t('dq.pass')}</span>
            <div style={passTrackStyle}>
              {status.pass?.tiers.map(tier => {
                const pct = Math.min(100, Math.round((status.pass?.seasonXp ?? 0) / tier.seasonXp * 100))
                return (
                  <span
                    key={tier.id}
                    style={passTierStyle(tier.reached, tier.claimed)}
                    title={`${tier.seasonXp} XP · +${tier.xp} XP${tier.claimed ? ' ✓' : tier.reached ? '（可领取）' : ''}`}
                    onClick={tier.reached && !tier.claimed ? () => void claimPassTier(tier.id) : undefined}
                  >
                    {tier.claimed ? '✓' : tier.reached ? '🎁' : ''}
                  </span>
                )
              })}
            </div>
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

  </>
}

export function SeasonSummaryCard(props: { status: DevQuestStatus; t: TFunc }): ReactElement {
  const { status, t } = props
  return <>
      {/* v1.3.0 赛季结束结算卡：换季自动生成，展示上赛季战绩 */}
      {status.seasonSummary !== undefined && (
        <div style={seasonSummaryCardStyle}>
          <div style={seasonSummaryHeadStyle}>📜 {t('dq.seasonSummary')} · {t('dq.seasonSummaryTitle', { season: status.seasonSummary.season, level: status.seasonSummary.level })}</div>
          <div style={seasonSummaryMetaStyle}>
            {t('dq.seasonSummaryMeta', {
              combo: status.seasonSummary.comboBest,
              xp: formatNumber(status.seasonSummary.seasonXp),
              n: status.seasonSummary.achievements,
            })}
          </div>
          <div style={seasonSummaryRewardStyle}>{t('dq.seasonSummaryReward')}</div>
        </div>
      )}

  </>
}

export function DailyGoalCard(props: { status: DevQuestStatus; t: TFunc; claimDailyGoalF: () => unknown }): ReactElement {
  const { status, t, claimDailyGoalF } = props
  return <>
      {/* v1.3.0 每日 XP 目标条：设定目标后显示进度 + 达标领取 */}
      {status.dailyGoal !== undefined && status.dailyGoal.goal > 0 && (() => {
        const g = status.dailyGoal!
        const pct = Math.min(100, Math.round((Math.min(g.todayXp, g.goal) / Math.max(g.goal, 1)) * 100))
        const reached = g.todayXp >= g.goal
        return (
          <div style={dailyGoalCardStyle}>
            <div style={dailyGoalRowStyle}>
              <span style={dailyGoalLabelStyle}>🎯 {t('dq.dailyGoal')}</span>
              <span style={dailyGoalNumStyle}>{t('dq.dailyGoalProgress', { xp: formatNumber(g.todayXp), goal: formatNumber(g.goal) })}</span>
            </div>
            <div style={dailyGoalTrackStyle}>
              <div style={{ ...dailyGoalFillStyle, width: `${pct}%`, ...(reached ? questFillDoneStyle : {}) }} />
            </div>
            {g.claimed
              ? <div style={dailyGoalDoneStyle}>{t('dq.dailyGoalClaimed')}</div>
              : reached && (
                <button type="button" onClick={() => void claimDailyGoalF()} style={dailyGoalClaimButtonStyle}>
                  {t('dq.dailyGoalClaim', { xp: g.rewardXp })}
                </button>
              )}
          </div>
        )
      })()}

  </>
}

export function RitualSection(props: { status: DevQuestStatus; t: TFunc; questReminderMsg: string | null ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, questReminderMsg, collapsedMap, toggle } = props
  return <>
      {/* 每日开工仪式：问候 + 昨日总结 + 今日目标 */}
      <SectionCard
        id="ritual"
        title={`🌅 ${t('dq.ritual')}`}
        collapsed={collapsedMap["ritual"] === true}
        onToggle={() => toggle("ritual")}
      >
        <div style={ritualStyle}>
          <div style={ritualGreetingStyle}>{t('dq.ritualGreeting', { level: status.level })}</div>
          {questReminderMsg !== null && <div style={ritualReminderStyle}>⏰ {questReminderMsg}</div>}
          {(() => {
            const todayKey = dayKeyLocal()
            const yesterday = (status.history ?? []).filter(h => h.date !== todayKey).slice(-1)[0]
            return yesterday !== undefined
              ? <div style={ritualSummaryStyle}>{t('dq.ritualYesterday', { xp: yesterday.xp, turns: yesterday.turns })}</div>
              : <div style={ritualSummaryStyle}>{t('dq.ritualFirst')}</div>
          })()}
          <div style={ritualGoalsStyle}>
            {status.daily?.quests.map(q => (
              <span key={q.id} style={ritualGoalStyle}>{q.done ? '✅' : '⬜'} {q.label.zh}</span>
            ))}
          </div>
        </div>
      </SectionCard>

  </>
}

export function LuckyRow(props: { status: DevQuestStatus; t: TFunc; claimingLucky: boolean; luckyMsg: string | null; claimLuckyDraw: () => unknown }): ReactElement {
  const { status, t, claimingLucky, luckyMsg, claimLuckyDraw } = props
  return <>
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

  </>
}

export function DailySection(props: { status: DevQuestStatus; t: TFunc; claiming: boolean; claimChest: () => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, claiming, claimChest, collapsedMap, toggle } = props
  return <>
      {/* 每日任务 */}
      <SectionCard
        id="daily"
        title={`📅 ${t('dq.daily')}`}
        right={<span style={updatedStyle}>{status.daily?.date ?? ''}</span>}
        collapsed={collapsedMap["daily"] === true}
        onToggle={() => toggle("daily")}
      >
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
      </SectionCard>

  </>
}

export function WeeklySection(props: { status: DevQuestStatus; t: TFunc; weeklyClaiming: boolean; claimBossF: () => unknown; claimWeekly: () => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, weeklyClaiming, claimBossF, claimWeekly, collapsedMap, toggle } = props
  return <>
      {/* 每周挑战：独立分区 */}
      <SectionCard
        id="weekly"
        title={`🗓️ ${t('dq.weekly')}`}
        right={<span style={updatedStyle}>{t('dq.weeklyWeek', { week: status.weekly?.week ?? '' })}</span>}
        collapsed={collapsedMap["weekly"] === true}
        onToggle={() => toggle("weekly")}
      >
        {status.weekly !== undefined && (
          <>
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
            {/* v1.3.0 每周 BOSS：血量条 = 3 个周挑战合成，全清击败掉落货币 */}
            {status.weekly.boss.name !== '' && (
              <div style={bossCardStyle}>
                <div style={bossHeadRowStyle}>
                  <span style={bossNameStyle}>{status.weekly.boss.icon} {status.weekly.boss.name}</span>
                  <span style={bossHpStyle}>{t('dq.bossHp', { damage: formatNumber(status.weekly.boss.damage), hp: formatNumber(status.weekly.boss.hp) })}</span>
                </div>
                <div style={bossTrackStyle}>
                  <div
                    style={{
                      ...bossFillStyle,
                      width: `${Math.min(100, Math.round((status.weekly.boss.damage / Math.max(status.weekly.boss.hp, 1)) * 100))}%`,
                      ...(status.weekly.boss.defeated ? questFillDoneStyle : {}),
                    }}
                  />
                </div>
                {status.weekly.boss.claimed
                  ? <div style={weeklyBonusClaimedStyle}>🐉 {t('dq.bossClaimed')}</div>
                  : status.weekly.boss.defeated
                    ? <button type="button" onClick={() => void claimBossF()} style={weeklyBonusButtonStyle}>
                      {t('dq.bossDefeat', { name: status.weekly.boss.name, n: status.weekly.boss.reward })}
                    </button>
                    : <div style={bossHintStyle}>{t('dq.bossProgress')}</div>}
              </div>
            )}
            {status.weekly.bonusReady
              ? <button type="button" onClick={() => void claimWeekly()} disabled={weeklyClaiming} style={weeklyBonusButtonStyle}>
                🎁 {weeklyClaiming ? '…' : t('dq.weeklyBonus', { xp: 100 })}
              </button>
              : status.weekly.bonusClaimed && <div style={weeklyBonusClaimedStyle}>🎁 {t('dq.weeklyBonusClaimed')}</div>}
          </>
        )}
      </SectionCard>

  </>
}

export function ShopSection(props: { status: DevQuestStatus; t: TFunc; buying: string | null; confirmBuyId: string | null; buy: (itemId: string) => unknown; rerolling: boolean; rerollQuests: () => unknown; useQuestSkipCard: () => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, buying, confirmBuyId, buy, rerolling, rerollQuests, useQuestSkipCard, collapsedMap, toggle } = props
  return <>
      {/* 商店：赛季货币消费（连击保险 / 任务重掷 / 徽章） */}
      <SectionCard
        id="shop"
        title={`🛒 ${t('dq.shop')}`}
        right={<span style={updatedStyle}>{t('dq.shopBalance', { balance: status.shop?.balance ?? 0 })}</span>}
        collapsed={collapsedMap["shop"] === true}
        onToggle={() => toggle("shop")}
      >
        {/* 库存行：保险/重掷 */}
        <div style={shopBarStyle}>
          {(status.shop?.shields ?? 0) > 0 && <span style={shopStockStyle}>{t('dq.shopShields', { n: status.shop!.shields })}</span>}
          {(status.shop?.rerolls ?? 0) > 0 && <span style={shopStockStyle}>{t('dq.shopRerolls', { n: status.shop!.rerolls })}</span>}
        </div>
        <div style={shopGridStyle}>
          {status.shop?.items.filter(item => item.kind !== 'theme').map(item => {
            const canAfford = (status.shop!.balance) >= item.price
            return (
              <div key={item.id} style={shopItemStyle}>
                <div style={shopItemHeadStyle}>
                  <span style={{ fontSize: 'calc(15px * var(--dq-fsz, 1))' }}>{item.icon}</span>
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
          {(status.shop?.rerolls ?? 0) > 0 && (
            <button type="button" onClick={() => void rerollQuests()} disabled={rerolling} style={rerollButtonStyle}>
              🔀 {rerolling ? '…' : t('dq.shopReroll')}
            </button>
          )}
          {(status.shop?.questSkips ?? 0) > 0 && (
            <button type="button" onClick={() => void useQuestSkipCard()} style={rerollButtonStyle}>
              ⏭️ {t('dq.shopSkip')}（×{status.shop!.questSkips}）
            </button>
          )}
        </div>
      </SectionCard>

  </>
}

export function SkinsSection(props: { status: DevQuestStatus; t: TFunc; buying: string | null; confirmBuyId: string | null; buy: (itemId: string) => unknown; activateTheme: (themeId: string) => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, buying, confirmBuyId, buy, activateTheme, collapsedMap, toggle } = props
  return <>
      {/* 主题皮肤：已购可切换，未购可购买（独立功能） */}
      <SectionCard
        id="skins"
        title={`🎨 ${t('dq.skins')}`}
        right={(() => {
          const activeTheme = status.shop?.items.find(i => i.id === status.shop?.theme)
          return status.shop?.theme !== undefined && status.shop.theme !== '' && activeTheme !== undefined
            ? <span style={skinHeadActiveStyle}>{activeTheme.icon} {activeTheme.name.zh}</span>
            : <span style={updatedStyle}>{t('dq.skinDefault')}</span>
        })()}
        collapsed={collapsedMap["skins"] === true}
        onToggle={() => toggle("skins")}
      >
        <div style={skinGridStyle}>
          {status.shop?.items.filter(item => item.kind === 'theme').map(item => {
            const canAfford = (status.shop!.balance) >= item.price
            const active = status.shop?.theme === item.id
            const owned = item.owned
            return (
              <div key={item.id} style={{ ...shopItemStyle, ...(active ? skinItemActiveStyle : {}) }}>
                <div style={shopItemHeadStyle}>
                  <span style={{ fontSize: 'calc(15px * var(--dq-fsz, 1))' }}>{item.icon}</span>
                  <span style={shopItemNameStyle}>{item.name.zh}</span>
                  <span style={shopItemPriceStyle}>{item.price}</span>
                </div>
                <div style={shopItemDescStyle}>{item.description.zh}</div>
                {(() => {
                  const palette = SKIN_PALETTES[item.id]
                  if (palette === undefined) return null
                  return (
                    <div style={skinSwatchRowStyle}>
                      <span style={skinSwatchStyle(palette.brand)} title="主色" />
                      <span style={skinSwatchStyle(palette.warn)} title="金色" />
                      <span style={skinSwatchStyle(palette.layer2)} title="背景" />
                      <span style={skinSwatchBorderStyle(palette.overlay)} title="面板底" />
                    </div>
                  )
                })()}
                {active
                  ? <div style={shopOwnedStyle}>{t('dq.themeActive')}</div>
                  : owned
                    ? <button
                      type="button"
                      onClick={() => void activateTheme(item.id)}
                      disabled={buying !== null}
                      style={{ ...shopBuyButtonStyle, ...shopThemeUseButtonStyle }}
                    >
                      {t('dq.themeUse')}
                    </button>
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
        </div>
      </SectionCard>

  </>
}

export function TutorialSection(props: { status: DevQuestStatus; t: TFunc ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, collapsedMap, toggle } = props
  return <>
      {/* 新手任务链 */}
      <SectionCard
        id="tutorial"
        title={`🎓 ${t('dq.tutorial')}`}
        right={<span style={updatedStyle}>{status.tutorial?.done ? '✅' : t('dq.tutorialStepDone', { n: status.tutorial?.steps.filter(s => s.done).length ?? 0, m: status.tutorial?.steps.length ?? 5 })}</span>}
        collapsed={collapsedMap["tutorial"] === true}
        onToggle={() => toggle("tutorial")}
      >
        {status.tutorial?.steps.map(step => (
          <div key={step.id} style={tutorialRowStyle}>
            <span style={{ fontSize: 'calc(13px * var(--dq-fsz, 1))', opacity: step.done ? 1 : 0.55 }}>{step.done ? '✅' : step.icon}</span>
            <span style={{ ...tutorialNameStyle, ...(step.done ? {} : { color: TONE.muted }) }}>{step.name.zh}</span>
            <span style={tutorialXpStyle}>+{step.xp}</span>
          </div>
        ))}
        {status.tutorial?.done === true && (
          <div style={tutorialTitleStyle}>🏅 {t('dq.tutorialTitle', { title: status.tutorial.title.zh })}</div>
        )}
      </SectionCard>

  </>
}

export function TitlesSection(props: { status: DevQuestStatus; t: TFunc; sharing: boolean; shareCard: () => unknown; shareSeason: () => unknown; switchTitle: (titleId: string) => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, sharing, shareCard, shareSeason, switchTitle, collapsedMap, toggle } = props
  return <>
      {/* 多称号：条件解锁称号可切换展示 */}
      <SectionCard
        id="titles"
        title={`🏷️ ${t('dq.titles')}`}
        right={status.titles?.current !== null
          ? <span style={titleHeadCurrentStyle}>{status.titles?.current?.icon ?? '🎖️'} {status.titles?.current?.name.zh}</span>
          : <span style={titleHeadCurrentStyle}>{t('dq.titleFollowLevel')} · {status.title.zh}</span>}
        collapsed={collapsedMap["titles"] === true}
        onToggle={() => toggle("titles")}
      >
        {/* 当前展示称号 */}
        <div style={titleCurrentRowStyle}>
          <span style={{ fontSize: 'calc(15px * var(--dq-fsz, 1))' }}>{status.titles?.current?.icon ?? '🎖️'}</span>
          <span style={titleCurrentNameStyle}>
            {status.titles?.current !== null
              ? status.titles?.current?.name.zh
              : `${t('dq.titleFollowLevel')} · ${status.title.zh}`}
          </span>
          <button type="button" onClick={() => void shareCard()} disabled={sharing} style={shareButtonStyle}>
            {sharing ? '…' : `📤 ${t('dq.share')}`}
          </button>
          <button type="button" onClick={() => void shareSeason()} disabled={sharing} style={shareButtonStyle}>
            {sharing ? '…' : `📊 ${t('dq.shareSeason')}`}
          </button>
        </div>
        {/* v1.3.0 职业画像：按工具使用习惯识别 */}
        {status.class !== null && (
          <div style={classBadgeStyle}>
            <span style={{ fontSize: 'calc(13px * var(--dq-fsz, 1))' }}>{status.class.icon}</span>
            <span style={classBadgeNameStyle}>{status.class.name.zh} <em style={itemEnStyle}>{status.class.name.en}</em></span>
            <span style={classBadgeLabelStyle}>{t('dq.classLabel')}</span>
          </div>
        )}
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
      </SectionCard>

  </>
}

export function CollectionsSection(props: { status: DevQuestStatus; t: TFunc; importing: boolean; exportSave: () => unknown; importSave: (file: File) => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, importing, exportSave, importSave, collapsedMap, toggle } = props
  return <>
      {/* 分类收藏 + 存档管理 */}
      <SectionCard
        id="collections"
        title={`📚 ${t('dq.collections')}`}
        collapsed={collapsedMap["collections"] === true}
        onToggle={() => toggle("collections")}
      >
        {(status.collections?.items ?? []).map(coll => (
          <div key={coll.category} style={collRowStyle}>
            <span style={{ fontSize: 'calc(13px * var(--dq-fsz, 1))', opacity: coll.completed ? 1 : 0.6 }}>{coll.completed ? '🏅' : categoryIcon(coll.category)}</span>
            <span style={{ ...collNameStyle, ...(coll.completed ? { color: TONE.gold, fontWeight: 700 } : {}) }}>
              {t(`dq.cat.${coll.category}`)}
            </span>
            <span style={collProgressStyle}>
              {coll.completed ? t('dq.collectionDone') : t('dq.collectionProgress', { n: coll.unlocked, m: coll.total })}
            </span>
            {!coll.completed && <span style={collRewardStyle}>{t('dq.collectionReward', { xp: coll.rewardXp })}</span>}
          </div>
        ))}
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
      </SectionCard>

  </>
}

export function PokedexSection(props: { status: DevQuestStatus; t: TFunc; unlocked: DevQuestStatus['achievements'] ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, unlocked, collapsedMap, toggle } = props
  return <>
      {/* 收藏图鉴总览：成就 / 皮肤 / 称号 完成度 */}
      <SectionCard
        id="pokedex"
        title={`📖 ${t('dq.pokedex')}`}
        right={<span style={updatedStyle}>{t('dq.pokedexOverall', { pct: Math.round(((unlocked.length / Math.max(status.achievements.length, 1)) + ((status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter(i => i.kind === 'theme').length, 1)) + ((status.titles?.items ?? []).filter(t => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1))) / 3 * 100) })}%</span>}
        collapsed={collapsedMap["pokedex"] === true}
        onToggle={() => toggle("pokedex")}
      >
        <div style={pokedexGridStyle}>
          <div style={pokedexItemStyle}>
            <span style={pokedexIconStyle}>🏆</span>
            <span style={pokedexNameStyle}>{t('dq.pokedexAch')}</span>
            <div style={pokedexTrackStyle}>
              <div style={{ ...pokedexFillStyle, width: `${Math.round(unlocked.length / Math.max(status.achievements.length, 1) * 100)}%` }} />
            </div>
            <span style={pokedexNumStyle}>{unlocked.length}/{status.achievements.length}</span>
          </div>
          <div style={pokedexItemStyle}>
            <span style={pokedexIconStyle}>🎨</span>
            <span style={pokedexNameStyle}>{t('dq.pokedexSkin')}</span>
            <div style={pokedexTrackStyle}>
              <div style={{ ...pokedexFillStyle, width: `${Math.round((status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter(i => i.kind === 'theme').length, 1) * 100)}%` }} />
            </div>
            <span style={pokedexNumStyle}>{(status.shop?.themes ?? []).length}/{status.shop?.items.filter(i => i.kind === 'theme').length ?? 0}</span>
          </div>
          <div style={pokedexItemStyle}>
            <span style={pokedexIconStyle}>🏷️</span>
            <span style={pokedexNameStyle}>{t('dq.pokedexTitle')}</span>
            <div style={pokedexTrackStyle}>
              <div style={{ ...pokedexFillStyle, width: `${Math.round((status.titles?.items ?? []).filter(t => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1) * 100)}%` }} />
            </div>
            <span style={pokedexNumStyle}>{(status.titles?.items ?? []).filter(t => t.unlocked).length}/{status.titles?.items?.length ?? 0}</span>
          </div>
        </div>
      </SectionCard>

  </>
}

export function RecentSection(props: {
  status: DevQuestStatus
  t: TFunc
  state: DevQuestUiState
  recent: DevQuestStatus['achievements']
; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, state, recent, collapsedMap, toggle } = props
  return <>
      {/* 最近成就 */}
      <SectionCard
        id="recent"
        title={t('dq.recent')}
        right={<span style={updatedStyle}>{t('dq.updated')} {updatedLabel(state.refreshedAt)}</span>}
        collapsed={collapsedMap["recent"] === true}
        onToggle={() => toggle("recent")}
      >
        {recent.length === 0
          ? <span style={emptyStyle}>{t('dq.empty')}</span>
          : <ul style={listStyle}>
            {recent.map(a => (
              <li key={a.id} style={listItemStyle}>
                <span style={{ fontSize: 'calc(15px * var(--dq-fsz, 1))' }}>{a.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={itemNameStyle}>{a.name.zh} <em style={itemEnStyle}>{a.name.en}</em></span>
                </span>
                {a.acquiredAt !== undefined && <span style={itemTimeStyle}>{formatTime(a.acquiredAt)}</span>}
              </li>
            ))}
          </ul>}
      </SectionCard>

  </>
}

export function WallSection(props: {
  status: DevQuestStatus
  t: TFunc
  category: (typeof CATEGORY_KEYS)[number]
  setCategory: (c: (typeof CATEGORY_KEYS)[number]) => void
  wallSearch: string
  setWallSearch: (s: string) => void
  wallRarity: 'all' | 'common' | 'rare' | 'epic' | 'legendary'
  setWallRarity: (r: 'all' | 'common' | 'rare' | 'epic' | 'legendary') => void
  wallStatus: 'all' | 'unlocked' | 'locked'
  setWallStatus: (s: 'all' | 'unlocked' | 'locked') => void
  hover: { a: DevQuestStatus['achievements'][number]; x: number; y: number } | null
  setHover: (h: { a: DevQuestStatus['achievements'][number]; x: number; y: number } | null) => void
  wallItems: DevQuestStatus['achievements']
  milestone: { a: DevQuestStatus['achievements'][number]; ratio: number } | undefined
  unlocked: DevQuestStatus['achievements']
; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, category, setCategory, wallSearch, setWallSearch, wallRarity, setWallRarity, wallStatus, setWallStatus, hover, setHover, wallItems, milestone, unlocked, collapsedMap, toggle } = props
  return <>
      {/* 成就墙 */}
      <SectionCard
        id="wall"
        title={t('dq.wall')}
        right={<span style={wallCountStyle}>{t('dq.wallCount', { n: unlocked.length, m: status.achievements.length })}</span>}
        collapsed={collapsedMap["wall"] === true}
        onToggle={() => toggle("wall")}
      >
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
        {/* 成就墙筛选：搜索 + 稀有度 + 状态 */}
        <div style={wallFilterRowStyle}>
          <input
            type="text"
            value={wallSearch}
            onChange={(e) => setWallSearch(e.target.value)}
            placeholder={t('dq.wallSearch')}
            style={wallSearchInputStyle}
          />
          <select
            value={wallRarity}
            onChange={(e) => setWallRarity(e.target.value as typeof wallRarity)}
            style={wallSelectStyle}
          >
            <option value="all">{t('dq.wallRarityAll')}</option>
            <option value="common">{t('dq.rarity.common')}</option>
            <option value="rare">{t('dq.rarity.rare')}</option>
            <option value="epic">{t('dq.rarity.epic')}</option>
            <option value="legendary">{t('dq.rarity.legendary')}</option>
          </select>
          <select
            value={wallStatus}
            onChange={(e) => setWallStatus(e.target.value as typeof wallStatus)}
            style={wallSelectStyle}
          >
            <option value="all">{t('dq.wallStatusAll')}</option>
            <option value="unlocked">{t('dq.wallStatusUnlocked')}</option>
            <option value="locked">{t('dq.wallStatusLocked')}</option>
          </select>
        </div>
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
        {wallItems.length === 0 && <div style={emptyStyle}>{t('dq.wallNoMatch')}</div>}
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
              <span style={{ fontSize: 'calc(17px * var(--dq-fsz, 1))', lineHeight: 1.2 }}>{visible ? a.icon : (revealHint ? '❔' : '🔒')}</span>
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
      </SectionCard>

  </>
}

export function ReportSection(props: { status: DevQuestStatus; t: TFunc ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, collapsedMap, toggle } = props
  return <>
      {/* 成长周报：最近 7 天 XP 柱状图 */}
      <SectionCard
        id="report"
        title={`📈 ${t('dq.report')}`}
        collapsed={collapsedMap["report"] === true}
        onToggle={() => toggle("report")}
      >
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
      </SectionCard>

  </>
}

export function CalendarSection(props: { status: DevQuestStatus; t: TFunc ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, collapsedMap, toggle } = props
  return <>
      {/* 活跃日历：近 30 天热力图 */}
      <SectionCard
        id="calendar"
        title={`🗓️ ${t('dq.calendar')}`}
        right={<span style={updatedStyle}>{t('dq.calendarDays')}</span>}
        collapsed={collapsedMap["calendar"] === true}
        onToggle={() => toggle("calendar")}
      >
        <div style={calendarGridStyle}>
          {(status.history ?? []).slice(-30).map(h => {
            const intensity = h.xp > 0 ? Math.min(4, 1 + Math.floor(h.xp / 100)) : 0
            return <span
              key={h.date}
              title={`${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`}
              style={{ ...calendarCellStyle, ...(calendarIntensityStyle(intensity)) }}
            />
          })}
        </div>
        <div style={calendarLegendStyle}>
          <span style={calendarLegendLabelStyle}>少</span>
          <span style={calendarLegendBlockStyle(1)} />
          <span style={calendarLegendBlockStyle(2)} />
          <span style={calendarLegendBlockStyle(3)} />
          <span style={calendarLegendBlockStyle(4)} />
          <span style={calendarLegendLabelStyle}>多</span>
        </div>
      </SectionCard>

  </>
}

export function StatsSection(props: { status: DevQuestStatus; t: TFunc; c: DevQuestStatus['counters'] ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, c, collapsedMap, toggle } = props
  return <>
      {/* 统计 + 荣誉墙 */}
      <SectionCard
        id="stats"
        title={`📊 ${t('dq.stats')}`}
        collapsed={collapsedMap["stats"] === true}
        onToggle={() => toggle("stats")}
      >
        <div style={statsWrapStyle}>
          {/* 核心纪录 */}
          <div style={statsRowStyle}>
            <span style={statsChipStyle}>🏆 {t('dq.statsBestCombo')}: {Math.max(c.consecutiveSuccess, ...(status.records ?? []).map(r => r.combo))}</span>
            <span style={statsChipStyle}>⬆️ {t('dq.statsBestLevel')}: {Math.max(status.level, ...(status.records ?? []).map(r => r.level))}</span>
          </div>
          {/* 工具 TOP5 */}
          <div style={statsSubTitleStyle}>{t('dq.statsTopTools')}</div>
          <div style={toolRankStyle}>
            {Object.entries(c.toolCallsByTool)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([tool, n], i) => (
                <div key={tool} style={toolRankRowStyle}>
                  <span style={toolRankNumStyle}>{i + 1}</span>
                  <span style={toolRankNameStyle}>{tool}</span>
                  <span style={toolRankCountStyle}>{n}</span>
                </div>
              ))}
          </div>
          {/* 荣誉墙：历史赛季纪录 */}
          {(status.records ?? []).length > 0 && (
            <>
              <div style={statsSubTitleStyle}>🏛️ {t('dq.records')}</div>
              <div style={recordRowStyle}>
                {(status.records ?? []).map(r => (
                  <span key={r.season} style={recordChipStyle} title={t('dq.recordsCombo', { combo: r.combo })}>
                    {t('dq.recordsSeason', { season: r.season })} · Lv.{r.level}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionCard>

  </>
}

export function SettingsSection(props: { status: DevQuestStatus; t: TFunc; settings: DevQuestSettings; updateSettings: (patch: Partial<DevQuestSettings>) => void; setGoalF: (goal: number) => unknown ; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {
  const { status, t, settings, updateSettings, setGoalF, collapsedMap, toggle } = props
  return <>
      {/* 设置：字号 / 紧凑模式 / toast 过滤 */}
      <SectionCard
        id="settings"
        title={`⚙️ ${t('dq.settings')}`}
        collapsed={collapsedMap["settings"] === true}
        onToggle={() => toggle("settings")}
      >
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>{t('dq.settingsFont')}</span>
          <div style={settingsControlStyle}>
            <button type="button" onClick={() => updateSettings({ fontSize: Math.max(0.85, Math.round((settings.fontSize - 0.1) * 100) / 100) })} style={settingsBtnStyle}>−</button>
            <span style={settingsValueStyle}>{Math.round(settings.fontSize * 100)}%</span>
            <button type="button" onClick={() => updateSettings({ fontSize: Math.min(1.2, Math.round((settings.fontSize + 0.1) * 100) / 100) })} style={settingsBtnStyle}>+</button>
          </div>
        </div>
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>{t('dq.settingsCompact')}</span>
          <button type="button" onClick={() => updateSettings({ compact: !settings.compact })} style={{ ...settingsToggleStyle, ...(settings.compact ? settingsToggleOnStyle : {}) }}>
            {settings.compact ? t('dq.on') : t('dq.off')}
          </button>
        </div>
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>{t('dq.settingsToast')}</span>
          <select
            value={settings.toastFilter}
            onChange={(e) => updateSettings({ toastFilter: e.target.value as DevQuestSettings['toastFilter'] })}
            style={wallSelectStyle}
          >
            <option value="all">{t('dq.settingsToastAll')}</option>
            <option value="rare">{t('dq.settingsToastRare')}</option>
            <option value="off">{t('dq.settingsToastOff')}</option>
          </select>
        </div>
        {/* v1.3.0 每日 XP 目标档位 */}
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>🎯 {t('dq.dailyGoal')}</span>
          <select
            value={String(status.dailyGoal?.goal ?? 0)}
            onChange={(e) => void setGoalF(Number(e.target.value))}
            style={wallSelectStyle}
          >
            <option value="0">{t('dq.dailyGoalOff')}</option>
            {(status.dailyGoal?.options ?? [200, 400, 800, 1500]).map(opt => (
              <option key={opt} value={String(opt)}>{opt} XP</option>
            ))}
          </select>
        </div>
        {/* v1.3.0 音效 + 桌面通知开关 */}
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>🔊 {t('dq.sound')}</span>
          <button type="button" onClick={() => updateSettings({ sound: !settings.sound })} style={{ ...settingsToggleStyle, ...(settings.sound ? settingsToggleOnStyle : {}) }}>
            {settings.sound ? t('dq.on') : t('dq.off')}
          </button>
        </div>
        <div style={settingsRowStyle}>
          <span style={settingsLabelStyle}>🔔 {t('dq.notify')}</span>
          <button type="button" onClick={() => updateSettings({ notify: !settings.notify })} style={{ ...settingsToggleStyle, ...(settings.notify ? settingsToggleOnStyle : {}) }}>
            {settings.notify ? t('dq.on') : t('dq.off')}
          </button>
        </div>
      </SectionCard>
  </>
}

// ---------------------------------------------------------------------------
// 成就悬浮简介（wall 分区使用）
// ---------------------------------------------------------------------------

/** 成就墙悬浮提示（wall 分区使用）。 */
function AchievementTooltip(
  props: { hover: { a: DevQuestStatus['achievements'][number]; x: number; y: number }; t: TFunc },
): ReactElement {
  const { hover, t } = props
  const a = hover.a
  const visible = a.unlocked || !a.hidden
  const near = !a.unlocked && a.hidden && a.progress !== undefined && a.progress.goal > 0 && a.progress.current / a.progress.goal >= 0.5
  return <div style={{ ...tooltipStyle, left: hover.x, top: hover.y }} role="tooltip">
    <div style={tooltipHeadStyle}>
      <span style={{ fontSize: 'calc(20px * var(--dq-fsz, 1))' }}>{visible ? a.icon : (near ? '❔' : '🔒')}</span>
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
