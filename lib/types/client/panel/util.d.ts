/**
 * DevQuest 面板工具函数与常量：格式/音效/稀有度/localStorage 持久化、
 * 面板设置、拖拽位置约束等。均为纯函数或浏览器端直写。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react';
import type { DevQuestStatus } from '../../types.ts';
export declare const STATUS_API = "/api/devquest/status";
export declare const POLL_MS = 60000;
export declare function levelPercent(status: DevQuestStatus): number;
/** 连击加成档位（与引擎一致）：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5；无加成返回 null。 */
export declare function comboMultiplier(consecutive: number): number | null;
/** 赛季冲刺目标：本赛季输出 tokens 目标（与 season_100k 成就一致）。 */
export declare const SEASON_GOAL_TOKENS = 100000;
/** 由赛季 id（如 2026-S3）计算季度剩余天数（本地时区，含今天）。 */
export declare function seasonDaysLeft(season: string): number;
/** 数值格式化：<1k 原样；<1M 用 k；<1T 用 M；更大用 T。 */
export declare function formatNumber(n: number): string;
/** v1.2.3：从后端 JSON 响应提取错误文本；成功或无错误返回 null。 */
export declare function apiErrorOf(data: {
    ok?: boolean;
    error?: string;
} | null): string | null;
/**
 * v1.3.0 音效：用 WebAudio 合成短提示音（无外部资源）。
 * kind: 'goal' 成功上升音 / 'boss' 低沉胜利音 / 'levelup' 明亮琶音 / 'achievement' 清脆叮咚。
 */
export declare function playSfx(kind: 'goal' | 'boss' | 'levelup' | 'achievement'): void;
export declare function updatedLabel(refreshedAt: number | null): string;
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
export declare function titleTone(level: number): {
    color?: string;
    gradient?: string;
    textShadow?: string;
};
/** 称号色调 → CSS 样式（渐变称号用 background-clip: text）。 */
export declare function titleToneStyle(level: number): CSSProperties;
export declare function formatTime(at: number): string;
/** 本地日期 YYYY-MM-DD（导出文件名用）。 */
export declare function dayKeyLocal(): string;
/** 稀有度 → 主题色（toast 边框 / 成就墙光晕）。 */
export declare const RARITY_COLOR: Record<string, string>;
/** 稀有度 → toast 边框样式。 */
export declare function rarityToastStyle(rarity: string): CSSProperties;
/** 稀有度 → 成就墙已解锁格子光晕。 */
export declare function rarityCellStyle(rarity: string): CSSProperties;
/** 分类图标（收藏进度行用）。 */
export declare function categoryIcon(cat: string): string;
export declare const PANEL_POS_KEY = "dsh.devquest.panelPos";
/** 面板至少保留多少 px 可见（允许大部分拖出屏幕外）。 */
export declare const MIN_VISIBLE = 60;
export declare function loadPanelPos(): {
    left: number;
    top: number;
} | null;
export declare const PANEL_COLLAPSED_KEY = "dsh.devquest.collapsed";
/** v1.1 未完成任务提醒：每日去重 key（记录已提醒的日期）。 */
export declare const REMINDER_KEY = "dsh.devquest.questReminder";
/** 读取已保存的分区折叠状态（section id → true=折叠）。损坏/不存在时返回空（全部展开）。 */
export declare function loadCollapsed(): Record<string, boolean>;
/** 保存分区折叠状态。 */
export declare function saveCollapsed(collapsed: Record<string, boolean>): void;
export declare const PANEL_SETTINGS_KEY = "dsh.devquest.settings";
export interface DevQuestSettings {
    /** 面板字号缩放（0.85 - 1.2）。 */
    fontSize: number;
    /** 紧凑模式：缩小间距/字号。 */
    compact: boolean;
    /** toast 过滤：all=全部；rare=仅稀有及以上；off=关闭。 */
    toastFilter: 'all' | 'rare' | 'off';
    /** v1.3.0 音效提示（成就/升级/宝箱/BOSS）。 */
    sound: boolean;
    /** v1.3.0 桌面通知（成就解锁）。 */
    notify: boolean;
}
export declare const DEFAULT_SETTINGS: DevQuestSettings;
/**
 * 拉取 host 侧设置并更新缓存（页面加载时调用一次）。
 * host 尚无设置时：若浏览器里留有旧值则上报完成一次性迁移，否则用默认。
 */
export declare function fetchUiSettings(): Promise<void>;
export declare function loadSettings(): DevQuestSettings;
export declare function saveSettings(s: DevQuestSettings): void;
/** 稀有度权重（toast 过滤用）。 */
export declare const RARITY_WEIGHT: {
    readonly common: 0;
    readonly rare: 1;
    readonly epic: 2;
    readonly legendary: 3;
};
/** 稀有度 → 权重。 */
export declare function rarityWeight(r: string): number;
/** 限制面板位置：四周至少保留 MIN_VISIBLE 可见，拖不丢。 */
export declare function clampPanelPos(left: number, top: number, width: number, height: number): {
    left: number;
    top: number;
};
