import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CATEGORY_KEYS, SKIN_PALETTES, TONE } from "./theme.js";
import { RefreshIcon } from "./icons.js";
import { EVENT_POOL } from "../../events.js"; // v1.4.0 事件卡定义（纯数据，可内联）
import { SEASON_GOAL_TOKENS, categoryIcon, comboMultiplier, dayKeyLocal, formatNumber, formatTime, levelPercent, rarityCellStyle, seasonDaysLeft, titleToneStyle, updatedLabel } from "./util.js";
import { boostStockStyle, bossCardStyle, bossFillStyle, bossHeadRowStyle, bossHintStyle, bossHpStyle, bossNameStyle, bossTrackStyle, calendarCellStyle, calendarGridStyle, calendarIntensityStyle, calendarLegendBlockStyle, calendarLegendLabelStyle, calendarLegendStyle, chestButtonStyle, chestClaimedStyle, classBadgeLabelStyle, classBadgeNameStyle, classBadgeStyle, collNameStyle, collProgressStyle, collRewardStyle, collRowStyle, comboStyle, dailyGoalCardStyle, dailyGoalClaimButtonStyle, dailyGoalDoneStyle, dailyGoalFillStyle, dailyGoalLabelStyle, dailyGoalNumStyle, dailyGoalRowStyle, dailyGoalTrackStyle, emptyStyle, heroStyle, iconButtonStyle, itemEnStyle, itemNameStyle, itemTimeStyle, levelBadgeStyle, levelNumStyle, levelSinceStyle, levelSubStyle, listItemStyle, listStyle, luckyButtonStyle, luckyMsgStyle, metaRowStyle, metaStyle, milestoneFillStyle, milestoneIconStyle, milestoneNameStyle, milestoneNumStyle, milestoneStyle, milestoneTopStyle, milestoneTrackStyle, nextTitleRowStyle, nextTitleStyle, passRowStyle, passTierStyle, passTrackStyle, pokedexFillStyle, pokedexGridStyle, pokedexIconStyle, pokedexItemStyle, pokedexNameStyle, pokedexNumStyle, pokedexTrackStyle, questFillDoneStyle, questFillStyle, questLabelStyle, questRewardStyle, questRowStyle, questTopStyle, questTrackStyle, recordChipStyle, recordRowStyle, reportBarColStyle, reportBarDateStyle, reportBarStyle, reportBarTurnStyle, reportBarWrapStyle, reportBarsStyle, reportLegendStyle, reportStyle, rerollButtonStyle, ritualGoalStyle, ritualGoalsStyle, ritualGreetingStyle, ritualReminderStyle, ritualStyle, ritualSummaryStyle, saveBarStyle, saveButtonStyle, seasonStyle, seasonSummaryCardStyle, seasonSummaryHeadStyle, seasonSummaryMetaStyle, seasonSummaryRewardStyle, sectionCardArrowStyle, sectionCardBodyHiddenStyle, sectionCardBodyStyle, sectionCardHeadStyle, sectionCardStyle, sectionCardTitleStyle, settingsBtnStyle, settingsControlStyle, settingsLabelStyle, settingsRowStyle, settingsToggleOnStyle, settingsToggleStyle, settingsValueStyle, shareButtonStyle, shopBarStyle, shopBuyButtonStyle, shopBuyDisabledStyle, shopConfirmButtonStyle, shopGridStyle, shopItemDescStyle, shopItemHeadStyle, shopItemNameStyle, shopItemPriceStyle, shopItemStyle, shopOwnedStyle, shopStockStyle, shopThemeUseButtonStyle, skinGridStyle, skinHeadActiveStyle, skinItemActiveStyle, skinSwatchBorderStyle, skinSwatchRowStyle, skinSwatchStyle, sprintDaysStyle, sprintFillStyle, sprintLabelStyle, sprintRowStyle, sprintTrackStyle, statsChipStyle, statsRowStyle, statsSubTitleStyle, statsWrapStyle, streakBadgeStyle, streakNextStyle, streakRowStyle, tabActiveStyle, tabStyle, tabsStyle, titleBadgeStyle, titleCurrentNameStyle, titleCurrentRowStyle, titleHeadCurrentStyle, titleItemActiveMarkStyle, titleItemActiveStyle, titleItemLockedMarkStyle, titleItemLockedStyle, titleItemNameStyle, titleItemStyle, titleListStyle, titleRowStyle, titleTextStyle, toolRankCountStyle, toolRankNameStyle, toolRankNumStyle, toolRankRowStyle, toolRankStyle, tooltipDescStyle, tooltipHeadStyle, tooltipNameStyle, tooltipProgressFillStyle, tooltipProgressLabelStyle, tooltipProgressNumStyle, tooltipProgressTopStyle, tooltipProgressTrackStyle, tooltipProgressWrapStyle, tooltipStatusStyle, tooltipStyle, tooltipXpStyle, tutorialNameStyle, tutorialRowStyle, tutorialTitleStyle, tutorialXpStyle, updatedStyle, wallCellHiddenLockedStyle, wallCellLockedStyle, wallCellStyle, wallCellUnlockedStyle, wallCheckStyle, wallCountStyle, wallFilterRowStyle, wallGridStyle, wallProgressFillStyle, wallProgressTrackStyle, wallSearchInputStyle, wallSelectStyle, wallXpStyle, wallXpUnlockedStyle, weeklyBonusButtonStyle, weeklyBonusClaimedStyle, weeklyQuestFillStyle, weeklyQuestLabelStyle, weeklyQuestRewardStyle, weeklyQuestRowStyle, weeklyQuestTopStyle, weeklyQuestTrackStyle, xpFillStyle, xpRowStyle, xpTextStyle, xpTrackStyle } from "./styles.js";
/** 通用分区卡片（各分区组件使用）。 */
function SectionCard(props) {
    const { id, title, right, collapsed, onToggle, children } = props;
    return _jsxs("section", { style: sectionCardStyle, "data-section": id, "data-collapsed": collapsed ? 'true' : 'false', children: [_jsxs("button", { type: "button", onClick: onToggle, style: sectionCardHeadStyle, "aria-expanded": !collapsed, title: collapsed ? '展开' : '折叠', children: [_jsx("span", { style: sectionCardTitleStyle, children: title }), _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [right, _jsx("span", { style: sectionCardArrowStyle, children: collapsed ? '▸' : '▾' })] })] }), _jsx("div", { style: { ...sectionCardBodyStyle, ...(collapsed ? sectionCardBodyHiddenStyle : {}) }, children: children })] });
}
/** 等级环（hero 分区使用）。 */
function LevelRing({ status }) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const progress = levelPercent(status);
    return _jsxs("svg", { width: "84", height: "84", viewBox: "0 0 84 84", "aria-hidden": "true", style: { transform: 'rotate(-90deg)' }, children: [_jsx("circle", { cx: "42", cy: "42", r: radius, fill: "none", stroke: TONE.border, strokeWidth: "5" }), _jsx("circle", { cx: "42", cy: "42", r: radius, fill: "none", stroke: TONE.accent, strokeWidth: "5", strokeLinecap: "round", strokeDasharray: `${progress * circumference} ${circumference}` })] });
}
export function HeroSection(props) {
    const { status, t, c, percent, refresh, claimPassTier } = props;
    return _jsx(_Fragment, { children: _jsxs("div", { style: heroStyle, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(LevelRing, { status: status }), _jsxs("div", { style: levelBadgeStyle, children: [_jsxs("span", { style: levelNumStyle, children: ["Lv.", status.level] }), _jsx("span", { style: { ...levelSubStyle, ...titleToneStyle(status.level) }, children: status.title.zh })] })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: titleRowStyle, children: [_jsx("span", { style: { ...titleTextStyle, ...titleToneStyle(status.level) }, children: status.title.zh }), (status.shop?.badges ?? []).map(badgeId => {
                                    const item = status.shop?.items.find(i => i.id === badgeId);
                                    return item !== undefined ? _jsx("span", { style: titleBadgeStyle, title: item.name.zh, children: item.icon }, badgeId) : null;
                                }), _jsx("span", { style: seasonStyle, children: t('dq.season', { season: status.season }) })] }), status.levelStartedAt !== undefined && (_jsx("span", { style: levelSinceStyle, children: t('dq.levelSince', { days: Math.max(0, Math.floor((Date.now() - status.levelStartedAt) / 86_400_000)) }) })), _jsxs("div", { style: sprintRowStyle, children: [_jsx("span", { style: sprintLabelStyle, children: t('dq.seasonSprint') }), _jsx("div", { style: sprintTrackStyle, children: _jsx("div", { style: { ...sprintFillStyle, width: `${Math.min(100, Math.round((c.seasonTokensOut / SEASON_GOAL_TOKENS) * 100))}%` } }) }), _jsx("span", { style: sprintDaysStyle, children: t('dq.seasonDaysLeft', { days: seasonDaysLeft(status.season) }) })] }), _jsxs("div", { style: streakRowStyle, children: [_jsxs("span", { style: streakBadgeStyle, title: t('dq.streakBest', { best: status.streak?.best ?? 0 }), children: ["\uD83D\uDD25 ", t('dq.streak', { n: status.streak?.days ?? 0 })] }), status.streak?.nextTierXp !== null && status.streak !== undefined && (_jsx("span", { style: streakNextStyle, children: t('dq.streakNext', { xp: status.streak.nextTierXp ?? 0 }) })), _jsxs("span", { style: boostStockStyle, children: [(status.shop?.xpBoostTurns ?? 0) > 0 && `⚡×${status.shop?.xpBoostTurns ?? 0}`, (status.shop?.questSkips ?? 0) > 0 && ` ⏭️×${status.shop?.questSkips ?? 0}`] })] }), _jsxs("div", { style: passRowStyle, children: [_jsx("span", { style: sprintLabelStyle, children: t('dq.pass') }), _jsx("div", { style: passTrackStyle, children: status.pass?.tiers.map(tier => {
                                        const pct = Math.min(100, Math.round((status.pass?.seasonXp ?? 0) / tier.seasonXp * 100));
                                        return (_jsx("span", { style: passTierStyle(tier.reached, tier.claimed), title: `${tier.seasonXp} XP · +${tier.xp} XP${tier.claimed ? ' ✓' : tier.reached ? '（可领取）' : ''}`, onClick: tier.reached && !tier.claimed ? () => void claimPassTier(tier.id) : undefined, children: tier.claimed ? '✓' : tier.reached ? '🎁' : '' }, tier.id));
                                    }) })] }), _jsx("div", { style: xpTrackStyle, children: _jsx("div", { style: { ...xpFillStyle, width: `${percent}%` } }) }), _jsxs("div", { style: xpRowStyle, children: [_jsx("span", { style: xpTextStyle, children: t('dq.xpToNext', { xp: status.xp, next: status.xpToNext }) }), _jsx("button", { type: "button", onClick: refresh, "aria-label": t('dq.refresh'), title: t('dq.refresh'), style: iconButtonStyle, children: _jsx(RefreshIcon, {}) })] }), _jsxs("div", { style: metaRowStyle, children: [_jsx("span", { style: metaStyle, children: t('dq.turns', { n: c.turnsCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.toolCalls', { n: c.toolCalls }) }), _jsx("span", { style: metaStyle, children: t('dq.todos', { n: c.todosCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.tokens', { n: formatNumber(c.tokensOut) }) }), comboMultiplier(c.consecutiveSuccess) !== null && (_jsxs("span", { style: comboStyle, children: ["\uD83D\uDD25 ", t('dq.combo', { n: c.consecutiveSuccess }), " \u00D7", comboMultiplier(c.consecutiveSuccess)] })), status.stance !== null && (_jsxs("span", { style: stanceBadgeStyle, title: t('dq.stance'), children: [status.stance.icon, " ", status.stance.name.zh] }))] })] })] }) });
}
export function SeasonSummaryCard(props) {
    const { status, t } = props;
    return _jsx(_Fragment, { children: status.seasonSummary !== undefined && (_jsxs("div", { style: seasonSummaryCardStyle, children: [_jsxs("div", { style: seasonSummaryHeadStyle, children: ["\uD83D\uDCDC ", t('dq.seasonSummary'), " \u00B7 ", t('dq.seasonSummaryTitle', { season: status.seasonSummary.season, level: status.seasonSummary.level })] }), _jsx("div", { style: seasonSummaryMetaStyle, children: t('dq.seasonSummaryMeta', {
                        combo: status.seasonSummary.comboBest,
                        xp: formatNumber(status.seasonSummary.seasonXp),
                        n: status.seasonSummary.achievements,
                    }) }), _jsx("div", { style: seasonSummaryRewardStyle, children: t('dq.seasonSummaryReward') })] })) });
}
export function DailyGoalCard(props) {
    const { status, t, claimDailyGoalF } = props;
    return _jsx(_Fragment, { children: status.dailyGoal !== undefined && status.dailyGoal.goal > 0 && (() => {
            const g = status.dailyGoal;
            const pct = Math.min(100, Math.round((Math.min(g.todayXp, g.goal) / Math.max(g.goal, 1)) * 100));
            const reached = g.todayXp >= g.goal;
            return (_jsxs("div", { style: dailyGoalCardStyle, children: [_jsxs("div", { style: dailyGoalRowStyle, children: [_jsxs("span", { style: dailyGoalLabelStyle, children: ["\uD83C\uDFAF ", t('dq.dailyGoal')] }), _jsx("span", { style: dailyGoalNumStyle, children: t('dq.dailyGoalProgress', { xp: formatNumber(g.todayXp), goal: formatNumber(g.goal) }) })] }), _jsx("div", { style: dailyGoalTrackStyle, children: _jsx("div", { style: { ...dailyGoalFillStyle, width: `${pct}%`, ...(reached ? questFillDoneStyle : {}) } }) }), g.claimed
                        ? _jsx("div", { style: dailyGoalDoneStyle, children: t('dq.dailyGoalClaimed') })
                        : reached && (_jsx("button", { type: "button", onClick: () => void claimDailyGoalF(), style: dailyGoalClaimButtonStyle, children: t('dq.dailyGoalClaim', { xp: g.rewardXp }) }))] }));
        })() });
}
export function RitualSection(props) {
    const { status, t, questReminderMsg, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "ritual", title: `🌅 ${t('dq.ritual')}`, collapsed: collapsedMap["ritual"] === true, onToggle: () => toggle("ritual"), children: _jsxs("div", { style: ritualStyle, children: [_jsx("div", { style: ritualGreetingStyle, children: t('dq.ritualGreeting', { level: status.level }) }), questReminderMsg !== null && _jsxs("div", { style: ritualReminderStyle, children: ["\u23F0 ", questReminderMsg] }), (() => {
                        const todayKey = dayKeyLocal();
                        const yesterday = (status.history ?? []).filter(h => h.date !== todayKey).slice(-1)[0];
                        return yesterday !== undefined
                            ? _jsx("div", { style: ritualSummaryStyle, children: t('dq.ritualYesterday', { xp: yesterday.xp, turns: yesterday.turns }) })
                            : _jsx("div", { style: ritualSummaryStyle, children: t('dq.ritualFirst') });
                    })(), _jsx("div", { style: ritualGoalsStyle, children: status.daily?.quests.map(q => (_jsxs("span", { style: ritualGoalStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }, q.id))) })] }) }) });
}
export function LuckyRow(props) {
    const { status, t, claimingLucky, luckyMsg, claimLuckyDraw } = props;
    return _jsxs(_Fragment, { children: [_jsxs("div", { style: nextTitleRowStyle, children: [status.nextTitle !== null && (_jsx("span", { style: nextTitleStyle, children: t('dq.nextTitle', { name: status.nextTitle.name.zh, level: status.nextTitle.level, xp: Math.max(0, Math.round(status.nextTitle.xpToNext)) }) })), status.lucky !== undefined && status.lucky.available && (_jsxs("button", { type: "button", onClick: () => void claimLuckyDraw(), disabled: claimingLucky, style: luckyButtonStyle, children: ["\uD83C\uDF81 ", claimingLucky ? '…' : t('dq.luckyDraw')] }))] }), luckyMsg !== null && _jsx("div", { style: luckyMsgStyle, children: luckyMsg })] });
}
export function DailySection(props) {
    const { status, t, claiming, claimChest, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "daily", title: `📅 ${t('dq.daily')}`, right: _jsx("span", { style: updatedStyle, children: status.daily?.date ?? '' }), collapsed: collapsedMap["daily"] === true, onToggle: () => toggle("daily"), children: [(status.daily?.quests ?? []).map(q => {
                    const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                    return (_jsxs("div", { style: questRowStyle, children: [_jsxs("div", { style: questTopStyle, children: [_jsxs("span", { style: questLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: questRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: questTrackStyle, children: _jsx("div", { style: { ...questFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                }), status.dailyChest !== undefined && (status.dailyChest.ready || status.dailyChest.claimed) && (status.dailyChest.claimed
                    ? _jsxs("div", { style: chestClaimedStyle, children: ["\uD83C\uDF81 ", t('dq.chestClaimed')] })
                    : _jsxs("button", { type: "button", onClick: () => void claimChest(), disabled: claiming, style: chestButtonStyle, children: ["\uD83C\uDF81 ", claiming ? t('dq.chestClaiming') : t('dq.chestReady', { xp: 50 })] }))] }) });
}
export function WeeklySection(props) {
    const { status, t, weeklyClaiming, claimBossF, claimWeekly, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "weekly", title: `🗓️ ${t('dq.weekly')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.weeklyWeek', { week: status.weekly?.week ?? '' }) }), collapsed: collapsedMap["weekly"] === true, onToggle: () => toggle("weekly"), children: status.weekly !== undefined && (_jsxs(_Fragment, { children: [status.weekly.quests.map(q => {
                        const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                        return (_jsxs("div", { style: weeklyQuestRowStyle, children: [_jsxs("div", { style: weeklyQuestTopStyle, children: [_jsxs("span", { style: weeklyQuestLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: weeklyQuestRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: weeklyQuestTrackStyle, children: _jsx("div", { style: { ...weeklyQuestFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                    }), status.weekly.boss.name !== '' && (_jsxs("div", { style: bossCardStyle, children: [_jsxs("div", { style: bossHeadRowStyle, children: [_jsxs("span", { style: bossNameStyle, children: [status.weekly.boss.icon, " ", status.weekly.boss.name] }), _jsx("span", { style: bossHpStyle, children: t('dq.bossHp', { damage: formatNumber(status.weekly.boss.damage), hp: formatNumber(status.weekly.boss.hp) }) })] }), _jsx("div", { style: bossTrackStyle, children: _jsx("div", { style: {
                                        ...bossFillStyle,
                                        width: `${Math.min(100, Math.round((status.weekly.boss.damage / Math.max(status.weekly.boss.hp, 1)) * 100))}%`,
                                        ...(status.weekly.boss.defeated ? questFillDoneStyle : {}),
                                    } }) }), status.weekly.boss.claimed
                                ? _jsxs("div", { style: weeklyBonusClaimedStyle, children: ["\uD83D\uDC09 ", t('dq.bossClaimed')] })
                                : status.weekly.boss.defeated
                                    ? _jsx("button", { type: "button", onClick: () => void claimBossF(), style: weeklyBonusButtonStyle, children: t('dq.bossDefeat', { name: status.weekly.boss.name, n: status.weekly.boss.reward }) })
                                    : _jsx("div", { style: bossHintStyle, children: t('dq.bossProgress') })] })), status.weekly.bonusReady
                        ? _jsxs("button", { type: "button", onClick: () => void claimWeekly(), disabled: weeklyClaiming, style: weeklyBonusButtonStyle, children: ["\uD83C\uDF81 ", weeklyClaiming ? '…' : t('dq.weeklyBonus', { xp: 100 })] })
                        : status.weekly.bonusClaimed && _jsxs("div", { style: weeklyBonusClaimedStyle, children: ["\uD83C\uDF81 ", t('dq.weeklyBonusClaimed')] })] })) }) });
}
export function ShopSection(props) {
    const { status, t, buying, confirmBuyId, buy, rerolling, rerollQuests, useQuestSkipCard, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "shop", title: `🛒 ${t('dq.shop')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.shopBalance', { balance: status.shop?.balance ?? 0 }) }), collapsed: collapsedMap["shop"] === true, onToggle: () => toggle("shop"), children: [_jsxs("div", { style: shopBarStyle, children: [(status.shop?.shields ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopShields', { n: status.shop.shields }) }), (status.shop?.rerolls ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopRerolls', { n: status.shop.rerolls }) })] }), _jsxs("div", { style: shopGridStyle, children: [status.shop?.items.filter(item => item.kind !== 'theme').map(item => {
                            const canAfford = (status.shop.balance) >= item.price;
                            return (_jsxs("div", { style: shopItemStyle, children: [_jsxs("div", { style: shopItemHeadStyle, children: [_jsx("span", { style: { fontSize: 'calc(15px * var(--dq-fsz, 1))' }, children: item.icon }), _jsx("span", { style: shopItemNameStyle, children: item.name.zh }), _jsx("span", { style: shopItemPriceStyle, children: item.price })] }), _jsx("div", { style: shopItemDescStyle, children: item.description.zh }), item.owned
                                        ? _jsx("div", { style: shopOwnedStyle, children: t('dq.shopOwned') })
                                        : _jsx("button", { type: "button", onClick: () => void buy(item.id), disabled: buying !== null || !canAfford, style: {
                                                ...shopBuyButtonStyle,
                                                ...(confirmBuyId === item.id ? shopConfirmButtonStyle : {}),
                                                ...(!canAfford ? shopBuyDisabledStyle : {}),
                                            }, children: buying === item.id
                                                ? '…'
                                                : confirmBuyId === item.id
                                                    ? `⚠️ ${t('dq.shopConfirm')}`
                                                    : t('dq.shopBuy') })] }, item.id));
                        }), (status.shop?.rerolls ?? 0) > 0 && (_jsxs("button", { type: "button", onClick: () => void rerollQuests(), disabled: rerolling, style: rerollButtonStyle, children: ["\uD83D\uDD00 ", rerolling ? '…' : t('dq.shopReroll')] })), (status.shop?.questSkips ?? 0) > 0 && (_jsxs("button", { type: "button", onClick: () => void useQuestSkipCard(), style: rerollButtonStyle, children: ["\u23ED\uFE0F ", t('dq.shopSkip'), "\uFF08\u00D7", status.shop.questSkips, "\uFF09"] }))] })] }) });
}
export function SkinsSection(props) {
    const { status, t, buying, confirmBuyId, buy, activateTheme, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "skins", title: `🎨 ${t('dq.skins')}`, right: (() => {
                const activeTheme = status.shop?.items.find(i => i.id === status.shop?.theme);
                return status.shop?.theme !== undefined && status.shop.theme !== '' && activeTheme !== undefined
                    ? _jsxs("span", { style: skinHeadActiveStyle, children: [activeTheme.icon, " ", activeTheme.name.zh] })
                    : _jsx("span", { style: updatedStyle, children: t('dq.skinDefault') });
            })(), collapsed: collapsedMap["skins"] === true, onToggle: () => toggle("skins"), children: _jsx("div", { style: skinGridStyle, children: status.shop?.items.filter(item => item.kind === 'theme').map(item => {
                    const canAfford = (status.shop.balance) >= item.price;
                    const active = status.shop?.theme === item.id;
                    const owned = item.owned;
                    return (_jsxs("div", { style: { ...shopItemStyle, ...(active ? skinItemActiveStyle : {}) }, children: [_jsxs("div", { style: shopItemHeadStyle, children: [_jsx("span", { style: { fontSize: 'calc(15px * var(--dq-fsz, 1))' }, children: item.icon }), _jsx("span", { style: shopItemNameStyle, children: item.name.zh }), _jsx("span", { style: shopItemPriceStyle, children: item.price })] }), _jsx("div", { style: shopItemDescStyle, children: item.description.zh }), (() => {
                                const palette = SKIN_PALETTES[item.id];
                                if (palette === undefined)
                                    return null;
                                return (_jsxs("div", { style: skinSwatchRowStyle, children: [_jsx("span", { style: skinSwatchStyle(palette.brand), title: "\u4E3B\u8272" }), _jsx("span", { style: skinSwatchStyle(palette.warn), title: "\u91D1\u8272" }), _jsx("span", { style: skinSwatchStyle(palette.layer2), title: "\u80CC\u666F" }), _jsx("span", { style: skinSwatchBorderStyle(palette.overlay), title: "\u9762\u677F\u5E95" })] }));
                            })(), active
                                ? _jsx("div", { style: shopOwnedStyle, children: t('dq.themeActive') })
                                : owned
                                    ? _jsx("button", { type: "button", onClick: () => void activateTheme(item.id), disabled: buying !== null, style: { ...shopBuyButtonStyle, ...shopThemeUseButtonStyle }, children: t('dq.themeUse') })
                                    : _jsx("button", { type: "button", onClick: () => void buy(item.id), disabled: buying !== null || !canAfford, style: {
                                            ...shopBuyButtonStyle,
                                            ...(confirmBuyId === item.id ? shopConfirmButtonStyle : {}),
                                            ...(!canAfford ? shopBuyDisabledStyle : {}),
                                        }, children: buying === item.id
                                            ? '…'
                                            : confirmBuyId === item.id
                                                ? `⚠️ ${t('dq.shopConfirm')}`
                                                : t('dq.shopBuy') })] }, item.id));
                }) }) }) });
}
export function TutorialSection(props) {
    const { status, t, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "tutorial", title: `🎓 ${t('dq.tutorial')}`, right: _jsx("span", { style: updatedStyle, children: status.tutorial?.done ? '✅' : t('dq.tutorialStepDone', { n: status.tutorial?.steps.filter(s => s.done).length ?? 0, m: status.tutorial?.steps.length ?? 5 }) }), collapsed: collapsedMap["tutorial"] === true, onToggle: () => toggle("tutorial"), children: [status.tutorial?.steps.map(step => (_jsxs("div", { style: tutorialRowStyle, children: [_jsx("span", { style: { fontSize: 'calc(13px * var(--dq-fsz, 1))', opacity: step.done ? 1 : 0.55 }, children: step.done ? '✅' : step.icon }), _jsx("span", { style: { ...tutorialNameStyle, ...(step.done ? {} : { color: TONE.muted }) }, children: step.name.zh }), _jsxs("span", { style: tutorialXpStyle, children: ["+", step.xp] })] }, step.id))), status.tutorial?.done === true && (_jsxs("div", { style: tutorialTitleStyle, children: ["\uD83C\uDFC5 ", t('dq.tutorialTitle', { title: status.tutorial.title.zh })] }))] }) });
}
export function TitlesSection(props) {
    const { status, t, sharing, shareCard, shareSeason, switchTitle, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "titles", title: `🏷️ ${t('dq.titles')}`, right: status.titles?.current !== null
                ? _jsxs("span", { style: titleHeadCurrentStyle, children: [status.titles?.current?.icon ?? '🎖️', " ", status.titles?.current?.name.zh] })
                : _jsxs("span", { style: titleHeadCurrentStyle, children: [t('dq.titleFollowLevel'), " \u00B7 ", status.title.zh] }), collapsed: collapsedMap["titles"] === true, onToggle: () => toggle("titles"), children: [_jsxs("div", { style: titleCurrentRowStyle, children: [_jsx("span", { style: { fontSize: 'calc(15px * var(--dq-fsz, 1))' }, children: status.titles?.current?.icon ?? '🎖️' }), _jsx("span", { style: titleCurrentNameStyle, children: status.titles?.current !== null
                                ? status.titles?.current?.name.zh
                                : `${t('dq.titleFollowLevel')} · ${status.title.zh}` }), _jsx("button", { type: "button", onClick: () => void shareCard(), disabled: sharing, style: shareButtonStyle, children: sharing ? '…' : `📤 ${t('dq.share')}` }), _jsx("button", { type: "button", onClick: () => void shareSeason(), disabled: sharing, style: shareButtonStyle, children: sharing ? '…' : `📊 ${t('dq.shareSeason')}` })] }), status.class !== null && (_jsxs("div", { style: classBadgeStyle, children: [_jsx("span", { style: { fontSize: 'calc(13px * var(--dq-fsz, 1))' }, children: status.class.icon }), _jsxs("span", { style: classBadgeNameStyle, children: [status.class.name.zh, " ", _jsx("em", { style: itemEnStyle, children: status.class.name.en })] }), _jsx("span", { style: classBadgeLabelStyle, children: t('dq.classLabel') })] })), _jsxs("div", { style: titleListStyle, children: [_jsxs("button", { type: "button", onClick: () => void switchTitle(''), style: { ...titleItemStyle, ...(status.titles?.current === null ? titleItemActiveStyle : {}) }, children: [_jsx("span", { children: "\uD83C\uDF96\uFE0F" }), _jsxs("span", { style: titleItemNameStyle, children: [t('dq.titleFollowLevel'), " \u00B7 ", status.title.zh] }), status.titles?.current === null && _jsx("span", { style: titleItemActiveMarkStyle, children: t('dq.titleActive') })] }), (status.titles?.items ?? []).map(ti => (_jsxs("button", { type: "button", onClick: () => { if (ti.unlocked)
                                void switchTitle(ti.id); }, disabled: !ti.unlocked, style: {
                                ...titleItemStyle,
                                ...(!ti.unlocked ? titleItemLockedStyle : {}),
                                ...(status.titles?.current?.id === ti.id ? titleItemActiveStyle : {}),
                            }, children: [_jsx("span", { children: ti.unlocked ? ti.icon : '🔒' }), _jsxs("span", { style: titleItemNameStyle, children: [ti.name.zh, " ", _jsx("em", { style: itemEnStyle, children: ti.name.en })] }), !ti.unlocked && _jsx("span", { style: titleItemLockedMarkStyle, children: t('dq.titleLocked') }), ti.unlocked && status.titles?.current?.id === ti.id && (_jsx("span", { style: titleItemActiveMarkStyle, children: t('dq.titleActive') }))] }, ti.id)))] })] }) });
}
export function CollectionsSection(props) {
    const { status, t, importing, exportSave, importSave, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "collections", title: `📚 ${t('dq.collections')}`, collapsed: collapsedMap["collections"] === true, onToggle: () => toggle("collections"), children: [(status.collections?.items ?? []).map(coll => (_jsxs("div", { style: collRowStyle, children: [_jsx("span", { style: { fontSize: 'calc(13px * var(--dq-fsz, 1))', opacity: coll.completed ? 1 : 0.6 }, children: coll.completed ? '🏅' : categoryIcon(coll.category) }), _jsx("span", { style: { ...collNameStyle, ...(coll.completed ? { color: TONE.gold, fontWeight: 700 } : {}) }, children: t(`dq.cat.${coll.category}`) }), _jsx("span", { style: collProgressStyle, children: coll.completed ? t('dq.collectionDone') : t('dq.collectionProgress', { n: coll.unlocked, m: coll.total }) }), !coll.completed && _jsx("span", { style: collRewardStyle, children: t('dq.collectionReward', { xp: coll.rewardXp }) })] }, coll.category))), _jsxs("div", { style: saveBarStyle, children: [_jsxs("button", { type: "button", onClick: () => void exportSave(), style: saveButtonStyle, children: ["\u2B07\uFE0F ", t('dq.export')] }), _jsxs("label", { style: saveButtonStyle, children: [importing ? '…' : `⬆️ ${t('dq.import')}`, _jsx("input", { type: "file", accept: "application/json,.json", style: { display: 'none' }, onChange: (e) => {
                                        const f = e.target.files?.[0];
                                        if (f !== undefined)
                                            void importSave(f);
                                        e.target.value = '';
                                    } })] })] })] }) });
}
export function PokedexSection(props) {
    const { status, t, unlocked, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "pokedex", title: `📖 ${t('dq.pokedex')}`, right: _jsxs("span", { style: updatedStyle, children: [t('dq.pokedexOverall', { pct: Math.round(((unlocked.length / Math.max(status.achievements.length, 1)) + ((status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter(i => i.kind === 'theme').length, 1)) + ((status.titles?.items ?? []).filter(t => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1))) / 3 * 100) }), "%"] }), collapsed: collapsedMap["pokedex"] === true, onToggle: () => toggle("pokedex"), children: _jsxs("div", { style: pokedexGridStyle, children: [_jsxs("div", { style: pokedexItemStyle, children: [_jsx("span", { style: pokedexIconStyle, children: "\uD83C\uDFC6" }), _jsx("span", { style: pokedexNameStyle, children: t('dq.pokedexAch') }), _jsx("div", { style: pokedexTrackStyle, children: _jsx("div", { style: { ...pokedexFillStyle, width: `${Math.round(unlocked.length / Math.max(status.achievements.length, 1) * 100)}%` } }) }), _jsxs("span", { style: pokedexNumStyle, children: [unlocked.length, "/", status.achievements.length] })] }), _jsxs("div", { style: pokedexItemStyle, children: [_jsx("span", { style: pokedexIconStyle, children: "\uD83C\uDFA8" }), _jsx("span", { style: pokedexNameStyle, children: t('dq.pokedexSkin') }), _jsx("div", { style: pokedexTrackStyle, children: _jsx("div", { style: { ...pokedexFillStyle, width: `${Math.round((status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter(i => i.kind === 'theme').length, 1) * 100)}%` } }) }), _jsxs("span", { style: pokedexNumStyle, children: [(status.shop?.themes ?? []).length, "/", status.shop?.items.filter(i => i.kind === 'theme').length ?? 0] })] }), _jsxs("div", { style: pokedexItemStyle, children: [_jsx("span", { style: pokedexIconStyle, children: "\uD83C\uDFF7\uFE0F" }), _jsx("span", { style: pokedexNameStyle, children: t('dq.pokedexTitle') }), _jsx("div", { style: pokedexTrackStyle, children: _jsx("div", { style: { ...pokedexFillStyle, width: `${Math.round((status.titles?.items ?? []).filter(t => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1) * 100)}%` } }) }), _jsxs("span", { style: pokedexNumStyle, children: [(status.titles?.items ?? []).filter(t => t.unlocked).length, "/", status.titles?.items?.length ?? 0] })] })] }) }) });
}
export function RecentSection(props) {
    const { status, t, state, recent, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "recent", title: t('dq.recent'), right: _jsxs("span", { style: updatedStyle, children: [t('dq.updated'), " ", updatedLabel(state.refreshedAt)] }), collapsed: collapsedMap["recent"] === true, onToggle: () => toggle("recent"), children: recent.length === 0
                ? _jsx("span", { style: emptyStyle, children: t('dq.empty') })
                : _jsx("ul", { style: listStyle, children: recent.map(a => (_jsxs("li", { style: listItemStyle, children: [_jsx("span", { style: { fontSize: 'calc(15px * var(--dq-fsz, 1))' }, children: a.icon }), _jsx("span", { style: { flex: 1, minWidth: 0 }, children: _jsxs("span", { style: itemNameStyle, children: [a.name.zh, " ", _jsx("em", { style: itemEnStyle, children: a.name.en })] }) }), a.acquiredAt !== undefined && _jsx("span", { style: itemTimeStyle, children: formatTime(a.acquiredAt) })] }, a.id))) }) }) });
}
export function WallSection(props) {
    const { status, t, category, setCategory, wallSearch, setWallSearch, wallRarity, setWallRarity, wallStatus, setWallStatus, hover, setHover, wallItems, milestone, unlocked, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "wall", title: t('dq.wall'), right: _jsx("span", { style: wallCountStyle, children: t('dq.wallCount', { n: unlocked.length, m: status.achievements.length }) }), collapsed: collapsedMap["wall"] === true, onToggle: () => toggle("wall"), children: [milestone !== undefined && (_jsxs("div", { style: milestoneStyle, children: [_jsx("span", { style: milestoneIconStyle, children: milestone.a.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: milestoneTopStyle, children: [_jsx("span", { style: milestoneNameStyle, children: t('dq.nextMilestone', { name: milestone.a.name.zh }) }), _jsxs("span", { style: milestoneNumStyle, children: [milestone.a.progress.current, "/", milestone.a.progress.goal] })] }), _jsx("div", { style: milestoneTrackStyle, children: _jsx("div", { style: { ...milestoneFillStyle, width: `${Math.min(100, Math.round(milestone.ratio * 100))}%` } }) })] })] })), _jsxs("div", { style: wallFilterRowStyle, children: [_jsx("input", { type: "text", value: wallSearch, onChange: (e) => setWallSearch(e.target.value), placeholder: t('dq.wallSearch'), style: wallSearchInputStyle }), _jsxs("select", { value: wallRarity, onChange: (e) => setWallRarity(e.target.value), style: wallSelectStyle, children: [_jsx("option", { value: "all", children: t('dq.wallRarityAll') }), _jsx("option", { value: "common", children: t('dq.rarity.common') }), _jsx("option", { value: "rare", children: t('dq.rarity.rare') }), _jsx("option", { value: "epic", children: t('dq.rarity.epic') }), _jsx("option", { value: "legendary", children: t('dq.rarity.legendary') })] }), _jsxs("select", { value: wallStatus, onChange: (e) => setWallStatus(e.target.value), style: wallSelectStyle, children: [_jsx("option", { value: "all", children: t('dq.wallStatusAll') }), _jsx("option", { value: "unlocked", children: t('dq.wallStatusUnlocked') }), _jsx("option", { value: "locked", children: t('dq.wallStatusLocked') })] })] }), _jsx("div", { style: tabsStyle, children: CATEGORY_KEYS.map(key => (_jsx("button", { type: "button", onClick: () => setCategory(key), style: { ...tabStyle, ...(category === key ? tabActiveStyle : {}) }, children: t(`dq.cat.${key}`) }, key))) }), wallItems.length === 0 && _jsx("div", { style: emptyStyle, children: t('dq.wallNoMatch') }), _jsx("div", { style: wallGridStyle, children: wallItems.map(a => {
                        const locked = !a.unlocked;
                        const visible = a.unlocked || !a.hidden;
                        const p = a.progress;
                        // G. 隐藏成就渐进揭示：未解锁但进度 ≥50% 时显示「?」轮廓（不泄露具体内容）。
                        const revealHint = locked && a.hidden && p !== undefined && p.goal > 0 && p.current / p.goal >= 0.5;
                        return _jsxs("span", { onMouseEnter: (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.max(8, Math.min(rect.left + rect.width / 2 - 110, window.innerWidth - 228));
                                const below = rect.bottom + 8;
                                const y = below + 120 > window.innerHeight ? Math.max(8, rect.top - 120) : below;
                                setHover({ a, x, y });
                            }, onMouseLeave: () => setHover(null), style: {
                                position: 'relative',
                                ...wallCellStyle,
                                ...(locked
                                    ? (a.hidden && !revealHint ? wallCellHiddenLockedStyle : wallCellLockedStyle)
                                    : { ...wallCellUnlockedStyle, ...rarityCellStyle(a.rarity) }),
                            }, children: [a.unlocked && _jsx("span", { style: wallCheckStyle, children: "\u2713" }), _jsx("span", { style: { fontSize: 'calc(17px * var(--dq-fsz, 1))', lineHeight: 1.2 }, children: visible ? a.icon : (revealHint ? '❔' : '🔒') }), !a.hidden && (_jsxs("span", { style: { ...wallXpStyle, ...(a.unlocked ? wallXpUnlockedStyle : {}) }, children: ["+", a.xp] })), locked && p !== undefined && p.goal > 0 && (_jsx("span", { style: wallProgressTrackStyle, children: _jsx("span", { style: { ...wallProgressFillStyle, width: `${Math.min(100, Math.round((p.current / p.goal) * 100))}%` } }) }))] }, a.id);
                    }) }), hover !== null && _jsx(AchievementTooltip, { hover: hover, t: t })] }) });
}
export function ReportSection(props) {
    const { status, t, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "report", title: `📈 ${t('dq.report')}`, collapsed: collapsedMap["report"] === true, onToggle: () => toggle("report"), children: _jsxs("div", { style: reportStyle, children: [_jsx("div", { style: reportBarsStyle, children: (status.history ?? []).slice(-7).map(h => {
                            const max = Math.max(...(status.history ?? []).slice(-7).map(x => x.xp), 1);
                            const pct = Math.max(4, Math.round((h.xp / max) * 100));
                            return (_jsxs("div", { style: reportBarColStyle, title: `${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`, children: [_jsx("div", { style: reportBarWrapStyle, children: _jsx("div", { style: { ...reportBarStyle, height: `${pct}%` } }) }), _jsx("span", { style: reportBarTurnStyle, children: h.turns > 0 ? h.turns : '' }), _jsx("span", { style: reportBarDateStyle, children: h.date.slice(5) })] }, h.date));
                        }) }), _jsx("div", { style: reportLegendStyle, children: t('dq.report7d') })] }) }) });
}
export function CalendarSection(props) {
    const { status, t, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "calendar", title: `🗓️ ${t('dq.calendar')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.calendarDays') }), collapsed: collapsedMap["calendar"] === true, onToggle: () => toggle("calendar"), children: [_jsx("div", { style: calendarGridStyle, children: (status.history ?? []).slice(-30).map(h => {
                        const intensity = h.xp > 0 ? Math.min(4, 1 + Math.floor(h.xp / 100)) : 0;
                        return _jsx("span", { title: `${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`, style: { ...calendarCellStyle, ...(calendarIntensityStyle(intensity)) } }, h.date);
                    }) }), _jsxs("div", { style: calendarLegendStyle, children: [_jsx("span", { style: calendarLegendLabelStyle, children: "\u5C11" }), _jsx("span", { style: calendarLegendBlockStyle(1) }), _jsx("span", { style: calendarLegendBlockStyle(2) }), _jsx("span", { style: calendarLegendBlockStyle(3) }), _jsx("span", { style: calendarLegendBlockStyle(4) }), _jsx("span", { style: calendarLegendLabelStyle, children: "\u591A" })] })] }) });
}
export function StatsSection(props) {
    const { status, t, c, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsx(SectionCard, { id: "stats", title: `📊 ${t('dq.stats')}`, collapsed: collapsedMap["stats"] === true, onToggle: () => toggle("stats"), children: _jsxs("div", { style: statsWrapStyle, children: [_jsxs("div", { style: statsRowStyle, children: [_jsxs("span", { style: statsChipStyle, children: ["\uD83C\uDFC6 ", t('dq.statsBestCombo'), ": ", Math.max(c.consecutiveSuccess, ...(status.records ?? []).map(r => r.combo))] }), _jsxs("span", { style: statsChipStyle, children: ["\u2B06\uFE0F ", t('dq.statsBestLevel'), ": ", Math.max(status.level, ...(status.records ?? []).map(r => r.level))] })] }), _jsx("div", { style: statsSubTitleStyle, children: t('dq.statsTopTools') }), _jsx("div", { style: toolRankStyle, children: Object.entries(c.toolCallsByTool)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([tool, n], i) => (_jsxs("div", { style: toolRankRowStyle, children: [_jsx("span", { style: toolRankNumStyle, children: i + 1 }), _jsx("span", { style: toolRankNameStyle, children: tool }), _jsx("span", { style: toolRankCountStyle, children: n })] }, tool))) }), (status.records ?? []).length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: statsSubTitleStyle, children: ["\uD83C\uDFDB\uFE0F ", t('dq.records')] }), _jsx("div", { style: recordRowStyle, children: (status.records ?? []).map(r => (_jsxs("span", { style: recordChipStyle, title: t('dq.recordsCombo', { combo: r.combo }), children: [t('dq.recordsSeason', { season: r.season }), " \u00B7 Lv.", r.level] }, r.season))) })] }))] }) }) });
}
export function SettingsSection(props) {
    const { status, t, settings, updateSettings, setGoalF, collapsedMap, toggle } = props;
    return _jsx(_Fragment, { children: _jsxs(SectionCard, { id: "settings", title: `⚙️ ${t('dq.settings')}`, collapsed: collapsedMap["settings"] === true, onToggle: () => toggle("settings"), children: [_jsxs("div", { style: settingsRowStyle, children: [_jsx("span", { style: settingsLabelStyle, children: t('dq.settingsFont') }), _jsxs("div", { style: settingsControlStyle, children: [_jsx("button", { type: "button", onClick: () => updateSettings({ fontSize: Math.max(0.85, Math.round((settings.fontSize - 0.1) * 100) / 100) }), style: settingsBtnStyle, children: "\u2212" }), _jsxs("span", { style: settingsValueStyle, children: [Math.round(settings.fontSize * 100), "%"] }), _jsx("button", { type: "button", onClick: () => updateSettings({ fontSize: Math.min(1.2, Math.round((settings.fontSize + 0.1) * 100) / 100) }), style: settingsBtnStyle, children: "+" })] })] }), _jsxs("div", { style: settingsRowStyle, children: [_jsx("span", { style: settingsLabelStyle, children: t('dq.settingsCompact') }), _jsx("button", { type: "button", onClick: () => updateSettings({ compact: !settings.compact }), style: { ...settingsToggleStyle, ...(settings.compact ? settingsToggleOnStyle : {}) }, children: settings.compact ? t('dq.on') : t('dq.off') })] }), _jsxs("div", { style: settingsRowStyle, children: [_jsx("span", { style: settingsLabelStyle, children: t('dq.settingsToast') }), _jsxs("select", { value: settings.toastFilter, onChange: (e) => updateSettings({ toastFilter: e.target.value }), style: wallSelectStyle, children: [_jsx("option", { value: "all", children: t('dq.settingsToastAll') }), _jsx("option", { value: "rare", children: t('dq.settingsToastRare') }), _jsx("option", { value: "off", children: t('dq.settingsToastOff') })] })] }), _jsxs("div", { style: settingsRowStyle, children: [_jsxs("span", { style: settingsLabelStyle, children: ["\uD83C\uDFAF ", t('dq.dailyGoal')] }), _jsxs("select", { value: String(status.dailyGoal?.goal ?? 0), onChange: (e) => void setGoalF(Number(e.target.value)), style: wallSelectStyle, children: [_jsx("option", { value: "0", children: t('dq.dailyGoalOff') }), (status.dailyGoal?.options ?? [200, 400, 800, 1500]).map(opt => (_jsxs("option", { value: String(opt), children: [opt, " XP"] }, opt)))] })] }), _jsxs("div", { style: settingsRowStyle, children: [_jsxs("span", { style: settingsLabelStyle, children: ["\uD83D\uDD0A ", t('dq.sound')] }), _jsx("button", { type: "button", onClick: () => updateSettings({ sound: !settings.sound }), style: { ...settingsToggleStyle, ...(settings.sound ? settingsToggleOnStyle : {}) }, children: settings.sound ? t('dq.on') : t('dq.off') })] }), _jsxs("div", { style: settingsRowStyle, children: [_jsxs("span", { style: settingsLabelStyle, children: ["\uD83D\uDD14 ", t('dq.notify')] }), _jsx("button", { type: "button", onClick: () => updateSettings({ notify: !settings.notify }), style: { ...settingsToggleStyle, ...(settings.notify ? settingsToggleOnStyle : {}) }, children: settings.notify ? t('dq.on') : t('dq.off') })] })] }) });
}
// ---------------------------------------------------------------------------
// 成就悬浮简介（wall 分区使用）
// ---------------------------------------------------------------------------
/** 成就墙悬浮提示（wall 分区使用）。 */
function AchievementTooltip(props) {
    const { hover, t } = props;
    const a = hover.a;
    const visible = a.unlocked || !a.hidden;
    const near = !a.unlocked && a.hidden && a.progress !== undefined && a.progress.goal > 0 && a.progress.current / a.progress.goal >= 0.5;
    return _jsxs("div", { style: { ...tooltipStyle, left: hover.x, top: hover.y }, role: "tooltip", children: [_jsxs("div", { style: tooltipHeadStyle, children: [_jsx("span", { style: { fontSize: 'calc(20px * var(--dq-fsz, 1))' }, children: visible ? a.icon : (near ? '❔' : '🔒') }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: tooltipNameStyle, children: visible ? `${a.name.zh} ${a.name.en}` : '？？？' }), _jsxs("div", { style: tooltipStatusStyle, children: [a.unlocked
                                        ? _jsxs("span", { style: { color: TONE.green }, children: ["\u2705 ", t('dq.earned')] })
                                        : _jsxs("span", { style: { color: TONE.quiet }, children: ["\uD83D\uDD12 ", t('dq.notEarned')] }), !a.hidden && _jsxs("span", { style: tooltipXpStyle, children: ["+", a.xp, " XP"] })] })] })] }), _jsx("div", { style: tooltipDescStyle, children: visible ? a.description.zh : (near ? t('dq.hiddenNear') : t('dq.hiddenHint')) }), !a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0 && (_jsxs("div", { style: tooltipProgressWrapStyle, children: [_jsxs("div", { style: tooltipProgressTopStyle, children: [_jsx("span", { style: tooltipProgressLabelStyle, children: t('dq.progress') }), _jsxs("span", { style: tooltipProgressNumStyle, children: [a.progress.current, "/", a.progress.goal] })] }), _jsx("div", { style: tooltipProgressTrackStyle, children: _jsx("div", { style: { ...tooltipProgressFillStyle, width: `${Math.min(100, Math.round((a.progress.current / a.progress.goal) * 100))}%` } }) })] }))] });
}
// ---------------------------------------------------------------------------
// v1.4.0 冒险扩展分区：事件卡 / 圣物 / 史诗任务链 / 幽灵竞速
// ---------------------------------------------------------------------------
/** 连击姿态徽章（hero meta 行）。 */
const stanceBadgeStyle = {
    fontSize: 'calc(9px * var(--dq-fsz, 1))',
    fontWeight: 700,
    color: TONE.accent,
    background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 35%, transparent)',
    padding: '2px 6px',
    borderRadius: 5,
};
/** 事件卡弹层。 */
const eventCardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 16%, transparent), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 12%, transparent))',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)',
};
const eventCardHeadStyle = { fontSize: 'calc(10px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.gold, letterSpacing: 0.3 };
const eventCardNameStyle = { fontSize: 'calc(12px * var(--dq-fsz, 1))', fontWeight: 600, color: TONE.text };
const eventCardDescStyle = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted, lineHeight: 1.5 };
const eventCardOptsStyle = { display: 'flex', gap: 6, marginTop: 2 };
const eventOptButtonStyle = { flex: 1, marginTop: 0, textAlign: 'center' };
const buffRowStyle = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' };
const buffNameStyle = { flex: 1, fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.text };
const buffRemainStyle = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.gold };
/** 🎴 冒险事件分区：待抉择事件卡 + 生效 buff/诅咒。 */
export function AdventureSection(props) {
    const { status, t, collapsedMap, toggle, onResolve, resolving } = props;
    const events = status.events ?? [];
    const choices = events.filter(e => e.pendingChoice);
    const buffs = events.filter(e => !e.pendingChoice);
    return (_jsxs(SectionCard, { id: "adventure", title: `🎴 ${t('dq.adventure')}`, right: buffs.length > 0 ? _jsx("span", { style: updatedStyle, children: t('dq.buffCount', { n: buffs.length }) }) : undefined, collapsed: collapsedMap['adventure'] === true, onToggle: () => toggle('adventure'), children: [choices.map(ev => {
                const def = EVENT_POOL.find(d => d.id === ev.effectId);
                if (def === undefined)
                    return null;
                return (_jsxs("div", { style: eventCardStyle, children: [_jsxs("div", { style: eventCardHeadStyle, children: [def.icon, " ", t('dq.eventTitle')] }), _jsx("div", { style: eventCardNameStyle, children: def.name.zh }), _jsx("div", { style: eventCardDescStyle, children: def.description.zh }), _jsxs("div", { style: eventCardOptsStyle, children: [_jsx("button", { type: "button", onClick: () => onResolve(ev.id, 0), disabled: resolving !== null, style: { ...shopBuyButtonStyle, ...eventOptButtonStyle }, children: t('dq.eventChoiceA') }), _jsx("button", { type: "button", onClick: () => onResolve(ev.id, 1), disabled: resolving !== null, style: { ...shopBuyButtonStyle, ...eventOptButtonStyle }, children: t('dq.eventChoiceB') })] })] }, ev.id));
            }), buffs.map(ev => {
                const def = EVENT_POOL.find(d => d.id === ev.effectId);
                if (def === undefined)
                    return null;
                return (_jsxs("div", { style: buffRowStyle, children: [_jsx("span", { children: def.icon }), _jsx("span", { style: buffNameStyle, children: def.name.zh }), _jsx("span", { style: buffRemainStyle, children: ev.expiresTurns !== undefined ? `⏳${ev.expiresTurns}` : t('dq.buffActive') })] }, ev.id));
            }), events.length === 0 && _jsx("span", { style: emptyStyle, children: t('dq.adventureEmpty') })] }));
}
/** 🪙 圣物收藏分区。 */
const relicGridStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const relicRarityLabelStyle = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 };
const relicRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 4 };
const relicCellStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, fontSize: 'calc(16px * var(--dq-fsz, 1))',
    borderRadius: 8, background: TONE.row, border: `1px solid ${TONE.border}`,
    cursor: 'default',
};
const relicRarityColor = {
    common: 'var(--dsw-alias-label-tertiary, #718096)',
    rare: 'var(--dsw-alias-brand-primary, #8ec5ff)',
    epic: '#c5a3ff',
    legendary: 'var(--dsw-alias-state-warn-primary, #f6c652)',
};
export function RelicsSection(props) {
    const { status, t, collapsedMap, toggle } = props;
    const relics = status.relics;
    const items = relics?.items ?? [];
    const order = ['common', 'rare', 'epic', 'legendary'];
    const labels = {
        common: t('dq.rarity.common'), rare: t('dq.rarity.rare'), epic: t('dq.rarity.epic'), legendary: t('dq.rarity.legendary'),
    };
    return (_jsx(SectionCard, { id: "relics", title: `🪙 ${t('dq.relics')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.relicsCount', { n: items.length, m: relics?.total ?? 0 }) }), collapsed: collapsedMap['relics'] === true, onToggle: () => toggle('relics'), children: items.length === 0
            ? _jsx("span", { style: emptyStyle, children: t('dq.relicsEmpty') })
            : (_jsx("div", { style: relicGridStyle, children: order.map(r => {
                    const group = items.filter(x => x.rarity === r);
                    if (group.length === 0)
                        return null;
                    return (_jsxs("div", { children: [_jsxs("div", { style: { ...relicRarityLabelStyle, color: relicRarityColor[r] }, children: [labels[r] ?? r, " \u00B7 ", group.length] }), _jsx("div", { style: relicRowStyle, children: group.map(x => (_jsx("span", { style: { ...relicCellStyle, borderColor: `color-mix(in srgb, ${relicRarityColor[x.rarity] ?? '#718096'} 40%, transparent)` }, title: `${x.name.zh} ${x.name.en}`, children: x.icon }, x.id))) })] }, r));
                }) })) }));
}
/** 📜 史诗任务链分区。 */
const chainNameStyle = { fontSize: 'calc(11px * var(--dq-fsz, 1))', fontWeight: 700, color: TONE.text, marginBottom: 4 };
const chainStepStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' };
const chainStepLabelStyle = { fontSize: 'calc(10px * var(--dq-fsz, 1))', color: TONE.muted, lineHeight: 1.4 };
export function ChainSection(props) {
    const { status, t, collapsedMap, toggle, onClaim, claiming } = props;
    const ch = status.questChain;
    if (ch === null)
        return _jsx(_Fragment, {});
    return (_jsxs(SectionCard, { id: "chain", title: `📜 ${t('dq.chain')}`, right: _jsx("span", { style: updatedStyle, children: ch.finished ? t('dq.chainDone') : `${ch.step}/${ch.total}` }), collapsed: collapsedMap['chain'] === true, onToggle: () => toggle('chain'), children: [_jsxs("div", { style: chainNameStyle, children: [ch.icon, " ", ch.name.zh] }), ch.steps.map((s, i) => (_jsxs("div", { style: chainStepStyle, children: [_jsx("span", { style: { opacity: s.met ? 1 : 0.5 }, children: s.met ? '✅' : '⏳' }), _jsx("span", { style: { ...chainStepLabelStyle, ...(s.met ? { color: TONE.green } : {}) }, children: s.label.zh })] }, i))), ch.finished && !ch.claimed && (_jsx("button", { type: "button", onClick: () => void onClaim(), disabled: claiming, style: weeklyBonusButtonStyle, children: claiming ? '…' : t('dq.chainClaim', { xp: ch.rewardXp }) })), ch.claimed && _jsx("div", { style: weeklyBonusClaimedStyle, children: t('dq.chainClaimedDone') })] }));
}
/** 👻 幽灵竞速分区（本周 vs 上周的自己）。 */
const ghostRowStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 };
const ghostLabelStyle = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.quiet, width: 30, flexShrink: 0 };
const ghostNumStyle = { fontSize: 'calc(9px * var(--dq-fsz, 1))', color: TONE.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
export function GhostSection(props) {
    const { status, t, collapsedMap, toggle, onClaim, claiming } = props;
    const g = status.ghostRace;
    if (g === undefined || !g.active)
        return _jsx(_Fragment, {});
    const xpPct = Math.min(100, Math.round((g.myXp / Math.max(g.ghostXp, 1)) * 100));
    const turnPct = Math.min(100, Math.round((g.myTurns / Math.max(g.ghostTurns, 1)) * 100));
    return (_jsxs(SectionCard, { id: "ghost", title: `👻 ${t('dq.ghost')}`, right: g.beaten
            ? _jsx("span", { style: weeklyBonusClaimedStyle, children: t('dq.ghostBeaten') })
            : _jsx("span", { style: updatedStyle, children: t('dq.ghostVs') }), collapsed: collapsedMap['ghost'] === true, onToggle: () => toggle('ghost'), children: [_jsxs("div", { style: ghostRowStyle, children: [_jsx("span", { style: ghostLabelStyle, children: "XP" }), _jsx("div", { style: bossTrackStyle, children: _jsx("div", { style: { ...bossFillStyle, width: `${xpPct}%`, ...(g.beaten ? questFillDoneStyle : {}) } }) }), _jsxs("span", { style: ghostNumStyle, children: [formatNumber(g.myXp), "/", formatNumber(g.ghostXp)] })] }), _jsxs("div", { style: ghostRowStyle, children: [_jsx("span", { style: ghostLabelStyle, children: t('dq.ghostTurnsLabel') }), _jsx("div", { style: bossTrackStyle, children: _jsx("div", { style: { ...bossFillStyle, width: `${turnPct}%`, ...(g.beaten ? questFillDoneStyle : {}) } }) }), _jsxs("span", { style: ghostNumStyle, children: [g.myTurns, "/", g.ghostTurns] })] }), g.beaten && !g.claimed && (_jsx("button", { type: "button", onClick: () => void onClaim(), disabled: claiming, style: weeklyBonusButtonStyle, children: claiming ? '…' : t('dq.ghostClaim') })), g.claimed && _jsx("div", { style: weeklyBonusClaimedStyle, children: t('dq.ghostClaimedDone') })] }));
}
