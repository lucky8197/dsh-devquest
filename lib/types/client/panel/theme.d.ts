/**
 * DevQuest 主题常量：DSH 主题 token、商店主题调色板与面板 CSS 变量覆写。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react';
/** DSH 主题 token（浅色/深色自适应）。 */
export declare const TONE: {
    readonly canvas: "var(--dsw-alias-bg-layer-2, #101722)";
    readonly panel: "var(--dsw-alias-bg-overlay, #171f2b)";
    readonly row: "var(--dsw-alias-bg-layer-2, #1d2735)";
    readonly border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))";
    readonly borderStrong: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.31))";
    readonly text: "var(--dsw-alias-label-primary, #f2f6fc)";
    readonly muted: "var(--dsw-alias-label-secondary, #9daabd)";
    readonly quiet: "var(--dsw-alias-label-tertiary, #718096)";
    readonly accent: "var(--dsw-alias-brand-primary, #8ec5ff)";
    readonly gold: "var(--dsw-alias-state-warn-primary, #f6c652)";
    readonly green: "var(--dsw-alias-state-success-primary, #78dda0)";
    readonly red: "var(--dsw-alias-state-error-primary, #ff8592)";
};
/**
 * 商店主题 id → 调色板（hex）。themeVars 转成 CSS 变量覆写，皮肤卡片用色块预览。
 * 配色在浅色主题下保持可读（背景保持浅色、仅强调色改变）。
 */
export declare const SKIN_PALETTES: Record<string, {
    brand: string;
    warn: string;
    success: string;
    overlay: string;
    layer2: string;
}>;
/**
 * 商店主题 id → 面板 CSS 变量覆写。
 * 在面板根元素上覆写 --dsw-alias-*，TONE 与所有引用这些变量的子元素自动跟随。
 */
export declare function themeVars(themeId: string): CSSProperties;
export declare const CATEGORY_KEYS: readonly ["journey", "crafting", "quest", "time", "legend", "egg"];
