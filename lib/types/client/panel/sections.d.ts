/**
 * DevQuest 面板分区组件（从 DevQuestPanelCard 机械拆分，纯展示：
 * 状态与回调由 DevQuestPanel.tsx 持有并经 props 传入——行为不变）。
 */
import { type ReactElement } from 'react';
import type { DevQuestStatus } from '../../types.ts';
import type { DevQuestUiState } from '../store.ts';
import type { DevQuestSettings } from './util.ts';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from '../locales.ts';
import { CATEGORY_KEYS } from './theme.ts';
/** 翻译函数（与主面板一致）。 */
export type TFunc = PropsLocale<typeof NS>['t'];
export declare function HeroSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    c: DevQuestStatus['counters'];
    percent: number;
    refresh: () => void;
    claimPassTier: (tierId: string) => unknown;
}): ReactElement;
export declare function SeasonSummaryCard(props: {
    status: DevQuestStatus;
    t: TFunc;
}): ReactElement;
export declare function DailyGoalCard(props: {
    status: DevQuestStatus;
    t: TFunc;
    claimDailyGoalF: () => unknown;
}): ReactElement;
export declare function RitualSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    questReminderMsg: string | null;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function LuckyRow(props: {
    status: DevQuestStatus;
    t: TFunc;
    claimingLucky: boolean;
    luckyMsg: string | null;
    claimLuckyDraw: () => unknown;
}): ReactElement;
export declare function DailySection(props: {
    status: DevQuestStatus;
    t: TFunc;
    claiming: boolean;
    claimChest: () => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function WeeklySection(props: {
    status: DevQuestStatus;
    t: TFunc;
    weeklyClaiming: boolean;
    claimBossF: () => unknown;
    claimWeekly: () => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function ShopSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    buying: string | null;
    confirmBuyId: string | null;
    buy: (itemId: string) => unknown;
    rerolling: boolean;
    rerollQuests: () => unknown;
    useQuestSkipCard: () => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function SkinsSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    buying: string | null;
    confirmBuyId: string | null;
    buy: (itemId: string) => unknown;
    activateTheme: (themeId: string) => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function TutorialSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function TitlesSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    sharing: boolean;
    shareCard: () => unknown;
    shareSeason: () => unknown;
    switchTitle: (titleId: string) => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function CollectionsSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    importing: boolean;
    exportSave: () => unknown;
    importSave: (file: File) => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function PokedexSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    unlocked: DevQuestStatus['achievements'];
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function RecentSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    state: DevQuestUiState;
    recent: DevQuestStatus['achievements'];
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function WallSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    category: (typeof CATEGORY_KEYS)[number];
    setCategory: (c: (typeof CATEGORY_KEYS)[number]) => void;
    wallSearch: string;
    setWallSearch: (s: string) => void;
    wallRarity: 'all' | 'common' | 'rare' | 'epic' | 'legendary';
    setWallRarity: (r: 'all' | 'common' | 'rare' | 'epic' | 'legendary') => void;
    wallStatus: 'all' | 'unlocked' | 'locked';
    setWallStatus: (s: 'all' | 'unlocked' | 'locked') => void;
    hover: {
        a: DevQuestStatus['achievements'][number];
        x: number;
        y: number;
    } | null;
    setHover: (h: {
        a: DevQuestStatus['achievements'][number];
        x: number;
        y: number;
    } | null) => void;
    wallItems: DevQuestStatus['achievements'];
    milestone: {
        a: DevQuestStatus['achievements'][number];
        ratio: number;
    } | undefined;
    unlocked: DevQuestStatus['achievements'];
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function ReportSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function CalendarSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function StatsSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    c: DevQuestStatus['counters'];
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function SettingsSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    settings: DevQuestSettings;
    updateSettings: (patch: Partial<DevQuestSettings>) => void;
    setGoalF: (goal: number) => unknown;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
/** 🎴 冒险事件分区：待抉择事件卡 + 生效 buff/诅咒。 */
export declare function AdventureSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
    onResolve: (eventId: string, option: number) => void;
    resolving: string | null;
}): ReactElement;
export declare function RelicsSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
}): ReactElement;
export declare function ChainSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
    onClaim: () => unknown;
    claiming: boolean;
}): ReactElement;
export declare function GhostSection(props: {
    status: DevQuestStatus;
    t: TFunc;
    collapsedMap: Record<string, boolean>;
    toggle: (id: string) => void;
    onClaim: () => unknown;
    claiming: boolean;
}): ReactElement;
