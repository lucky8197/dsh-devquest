/** DSH 主题 token（浅色/深色自适应）。 */
export const TONE = {
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
};
/**
 * 商店主题 id → 调色板（hex）。themeVars 转成 CSS 变量覆写，皮肤卡片用色块预览。
 * 配色在浅色主题下保持可读（背景保持浅色、仅强调色改变）。
 */
export const SKIN_PALETTES = {
    'theme-ember': { brand: '#e07b39', warn: '#d97706', success: '#d97706', overlay: '#fff6ee', layer2: '#fff0e2' },
    'theme-frost': { brand: '#3b9fe0', warn: '#4a90c2', success: '#3b9fe0', overlay: '#f0f7fc', layer2: '#e4f1fa' },
    'theme-verdant': { brand: '#34a85e', warn: '#6aa84f', success: '#34a85e', overlay: '#f1f9f2', layer2: '#e2f3e5' },
    'theme-sunset': { brand: '#e86a4f', warn: '#e0a63c', success: '#e86a4f', overlay: '#fff5f0', layer2: '#ffece2' },
    'theme-ocean': { brand: '#1f9e8f', warn: '#2f8fb3', success: '#1f9e8f', overlay: '#f1faf8', layer2: '#e2f3ef' },
    'theme-sakura': { brand: '#e2637f', warn: '#d98aa0', success: '#e2637f', overlay: '#fef5f7', layer2: '#fdeaf0' },
    'theme-royal': { brand: '#8a5cf0', warn: '#a06cd5', success: '#8a5cf0', overlay: '#f7f4fd', layer2: '#eee7fb' },
    'theme-gold': { brand: '#c9a227', warn: '#b8860b', success: '#c9a227', overlay: '#fdfaf1', layer2: '#f8f1de' },
    'theme-peach': { brand: '#f08a6b', warn: '#e88a7a', success: '#f08a6b', overlay: '#fef7f3', layer2: '#fdeee6' },
    'theme-neon': { brand: '#6b5cf0', warn: '#b05ce0', success: '#6b5cf0', overlay: '#f6f4fe', layer2: '#ece8fc' },
};
/**
 * 商店主题 id → 面板 CSS 变量覆写。
 * 在面板根元素上覆写 --dsw-alias-*，TONE 与所有引用这些变量的子元素自动跟随。
 */
export function themeVars(themeId) {
    const p = SKIN_PALETTES[themeId];
    if (p === undefined)
        return {};
    return {
        '--dsw-alias-brand-primary': p.brand,
        '--dsw-alias-state-warn-primary': p.warn,
        '--dsw-alias-state-success-primary': p.success,
        '--dsw-alias-bg-overlay': p.overlay,
        '--dsw-alias-bg-layer-2': p.layer2,
    };
}
export const CATEGORY_KEYS = ['journey', 'crafting', 'quest', 'time', 'legend', 'egg'];
