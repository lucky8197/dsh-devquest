import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（v0.3 起为全局玩家档，与 cwd/session 无关）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { titleFor } from "../engine.js";
const STATUS_API = '/api/devquest/status';
const POLL_MS = 60_000;
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
};
/**
 * 商店主题 id → 面板 CSS 变量覆写。
 * 在面板根元素上覆写 --dsw-alias-*，TONE 与所有引用这些变量的子元素自动跟随。
 * 配色在浅色主题下保持可读（背景保持浅色、仅强调色改变）。
 */
function themeVars(themeId) {
    const palettes = {
        'theme-ember': {
            '--dsw-alias-brand-primary': '#e07b39',
            '--dsw-alias-state-warn-primary': '#d97706',
            '--dsw-alias-state-success-primary': '#d97706',
            '--dsw-alias-bg-overlay': '#fff6ee',
            '--dsw-alias-bg-layer-2': '#fff0e2',
        },
        'theme-frost': {
            '--dsw-alias-brand-primary': '#3b9fe0',
            '--dsw-alias-state-warn-primary': '#4a90c2',
            '--dsw-alias-state-success-primary': '#3b9fe0',
            '--dsw-alias-bg-overlay': '#f0f7fc',
            '--dsw-alias-bg-layer-2': '#e4f1fa',
        },
        'theme-verdant': {
            '--dsw-alias-brand-primary': '#34a85e',
            '--dsw-alias-state-warn-primary': '#6aa84f',
            '--dsw-alias-state-success-primary': '#34a85e',
            '--dsw-alias-bg-overlay': '#f1f9f2',
            '--dsw-alias-bg-layer-2': '#e2f3e5',
        },
        'theme-sunset': {
            '--dsw-alias-brand-primary': '#e86a4f',
            '--dsw-alias-state-warn-primary': '#e0a63c',
            '--dsw-alias-state-success-primary': '#e86a4f',
            '--dsw-alias-bg-overlay': '#fff5f0',
            '--dsw-alias-bg-layer-2': '#ffece2',
        },
        'theme-ocean': {
            '--dsw-alias-brand-primary': '#1f9e8f',
            '--dsw-alias-state-warn-primary': '#2f8fb3',
            '--dsw-alias-state-success-primary': '#1f9e8f',
            '--dsw-alias-bg-overlay': '#f1faf8',
            '--dsw-alias-bg-layer-2': '#e2f3ef',
        },
        'theme-sakura': {
            '--dsw-alias-brand-primary': '#e2637f',
            '--dsw-alias-state-warn-primary': '#d98aa0',
            '--dsw-alias-state-success-primary': '#e2637f',
            '--dsw-alias-bg-overlay': '#fef5f7',
            '--dsw-alias-bg-layer-2': '#fdeaf0',
        },
        'theme-royal': {
            '--dsw-alias-brand-primary': '#8a5cf0',
            '--dsw-alias-state-warn-primary': '#a06cd5',
            '--dsw-alias-state-success-primary': '#8a5cf0',
            '--dsw-alias-bg-overlay': '#f7f4fd',
            '--dsw-alias-bg-layer-2': '#eee7fb',
        },
    };
    return (palettes[themeId] ?? {});
}
const CATEGORY_KEYS = ['journey', 'crafting', 'quest', 'time', 'legend', 'egg'];
// ---------------------------------------------------------------------------
// 图标（内联 SVG，无依赖）
// ---------------------------------------------------------------------------
function SwordIcon({ size = 16 }) {
    return _jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M4 20 14.5 9.5M14.5 9.5 17 7m-2.5 2.5L17 7m-2.5 2.5L18.5 5.5M17 7l1.5-1.5M17 7l2 2-1.5 1.5", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "m14.5 9.5 2.5 2.5-1.5 1.5L4 20", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", opacity: ".55" })] });
}
function RefreshIcon() {
    return _jsx("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function CloseIcon() {
    return _jsx("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "m6 6 12 12M18 6 6 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) });
}
// ---------------------------------------------------------------------------
// 面板卡片
// ---------------------------------------------------------------------------
function levelPercent(status) {
    if (status.xpToNext <= 0)
        return 0;
    return Math.max(0.02, Math.min(1, status.xp / status.xpToNext));
}
/** 连击加成档位（与引擎一致）：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5；无加成返回 null。 */
function comboMultiplier(consecutive) {
    if (consecutive >= 30)
        return 2.5;
    if (consecutive >= 15)
        return 2.0;
    if (consecutive >= 5)
        return 1.5;
    return null;
}
/** 赛季冲刺目标：本赛季输出 tokens 目标（与 season_100k 成就一致）。 */
const SEASON_GOAL_TOKENS = 100_000;
/** 由赛季 id（如 2026-S3）计算季度剩余天数（本地时区，含今天）。 */
function seasonDaysLeft(season) {
    const m = /^(\d{4})-S([1-4])$/.exec(season);
    if (m === null)
        return 0;
    const year = Number(m[1]);
    const quarter = Number(m[2]);
    const endMonth = quarter * 3; // 季度最后一个月（1-12）
    const end = new Date(year, endMonth, 1, 0, 0, 0, 0); // 下季度第一天
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}
function formatNumber(n) {
    if (n < 1000)
        return String(n);
    const v = n / 1000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`;
}
function updatedLabel(refreshedAt) {
    if (refreshedAt === null)
        return '—';
    const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1000));
    if (seconds < 10)
        return 'now';
    if (seconds < 60)
        return `${seconds}s`;
    return `${Math.round(seconds / 60)}m`;
}
function LevelRing({ status }) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const progress = levelPercent(status);
    return _jsxs("svg", { width: "84", height: "84", viewBox: "0 0 84 84", "aria-hidden": "true", style: { transform: 'rotate(-90deg)' }, children: [_jsx("circle", { cx: "42", cy: "42", r: radius, fill: "none", stroke: TONE.border, strokeWidth: "5" }), _jsx("circle", { cx: "42", cy: "42", r: radius, fill: "none", stroke: TONE.accent, strokeWidth: "5", strokeLinecap: "round", strokeDasharray: `${progress * circumference} ${circumference}` })] });
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
function titleTone(level) {
    if (level >= 30)
        return { gradient: 'linear-gradient(90deg, #ffd36b, #ff9a3c, #ff6b6b)', textShadow: '0 0 14px rgba(255,180,80,0.5)' };
    if (level >= 25)
        return { gradient: 'linear-gradient(90deg, #78dda0, #8ec5ff)', textShadow: '0 0 12px rgba(120,221,160,0.4)' };
    if (level >= 20)
        return { color: TONE.gold, textShadow: '0 0 12px rgba(246,198,82,0.5)' };
    if (level >= 15)
        return { color: '#c5a3ff', textShadow: '0 0 10px rgba(197,163,255,0.35)' };
    if (level >= 10)
        return { color: TONE.accent };
    if (level >= 5)
        return { color: '#d9a066' };
    return { color: TONE.muted };
}
/** 称号色调 → CSS 样式（渐变称号用 background-clip: text）。 */
function titleToneStyle(level) {
    const t = titleTone(level);
    const style = {};
    if (t.gradient !== undefined) {
        style.background = t.gradient;
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
    }
    else if (t.color !== undefined) {
        style.color = t.color;
    }
    if (t.textShadow !== undefined)
        style.textShadow = t.textShadow;
    return style;
}
function formatTime(at) {
    const d = new Date(at);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}
/** 本地日期 YYYY-MM-DD（导出文件名用）。 */
function dayKeyLocal() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}
// ---------------------------------------------------------------------------
// 稀有度：视觉分级（普通/稀有/史诗/传说）
// ---------------------------------------------------------------------------
/** 稀有度 → 主题色（toast 边框 / 成就墙光晕）。 */
const RARITY_COLOR = {
    common: 'var(--dsw-alias-label-tertiary, #718096)',
    rare: 'var(--dsw-alias-brand-primary, #8ec5ff)',
    epic: '#c5a3ff',
    legendary: 'var(--dsw-alias-state-warn-primary, #f6c652)',
};
/** 稀有度 → toast 边框样式。 */
function rarityToastStyle(rarity) {
    const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
    return {
        border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
        boxShadow: `0 0 14px color-mix(in srgb, ${color} 25%, transparent)`,
    };
}
/** 稀有度 → 成就墙已解锁格子光晕。 */
function rarityCellStyle(rarity) {
    const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
    return {
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 18%, transparent)`,
    };
}
/** 分类图标（收藏进度行用）。 */
function categoryIcon(cat) {
    const map = {
        journey: '🚶', crafting: '⚒️', quest: '📜', time: '⏰', legend: '💎', egg: '🥚',
    };
    return map[cat] ?? '📦';
}
// ---------------------------------------------------------------------------
// 面板拖拽：拖动头部可把面板放到任意位置，位置持久化到 localStorage。
// ---------------------------------------------------------------------------
const PANEL_POS_KEY = 'dsh.devquest.panelPos';
/** 面板至少保留多少 px 可见（允许大部分拖出屏幕外）。 */
const MIN_VISIBLE = 60;
function loadPanelPos() {
    try {
        const raw = localStorage.getItem(PANEL_POS_KEY);
        if (raw === null)
            return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
            return { left: parsed.left, top: parsed.top };
        }
        return null;
    }
    catch {
        return null;
    }
}
/** 限制面板位置：四周至少保留 MIN_VISIBLE 可见，拖不丢。 */
function clampPanelPos(left, top, width, height) {
    const minLeft = Math.min(MIN_VISIBLE - width, 0);
    const minTop = Math.min(MIN_VISIBLE - height, 0);
    const maxLeft = Math.max(MIN_VISIBLE, window.innerWidth - MIN_VISIBLE);
    const maxTop = Math.max(MIN_VISIBLE, window.innerHeight - MIN_VISIBLE);
    return {
        left: Math.min(maxLeft, Math.max(minLeft, left)),
        top: Math.min(maxTop, Math.max(minTop, top)),
    };
}
/**
 * 通用分区卡片：带边框的背景块，标题栏可点击折叠/展开。
 * collapsed 由父组件统一管理（section id → boolean）。
 */
function SectionCard(props) {
    const { id, title, right, collapsed, onToggle, children } = props;
    return _jsxs("section", { style: sectionCardStyle, "data-section": id, "data-collapsed": collapsed ? 'true' : 'false', children: [_jsxs("button", { type: "button", onClick: onToggle, style: sectionCardHeadStyle, "aria-expanded": !collapsed, title: collapsed ? '展开' : '折叠', children: [_jsx("span", { style: sectionCardTitleStyle, children: title }), _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [right, _jsx("span", { style: sectionCardArrowStyle, children: collapsed ? '▸' : '▾' })] })] }), _jsx("div", { style: { ...sectionCardBodyStyle, ...(collapsed ? sectionCardBodyHiddenStyle : {}) }, children: children })] });
}
/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
export function DevQuestPanelCard(props) {
    const { useStore, actions, t, refresh } = props;
    const state = useStore(snapshot => snapshot);
    const [category, setCategory] = useState('journey');
    const [hover, setHover] = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [buying, setBuying] = useState(null);
    const [confirmBuyId, setConfirmBuyId] = useState(null);
    const [shopMsg, setShopMsg] = useState(null);
    const [rerolling, setRerolling] = useState(false);
    const [luckyMsg, setLuckyMsg] = useState(null);
    const [claimingLucky, setClaimingLucky] = useState(false);
    const [importing, setImporting] = useState(false);
    const [weeklyClaiming, setWeeklyClaiming] = useState(false);
    const [sharing, setSharing] = useState(false);
    // 统一折叠状态：section id → 是否折叠（true=隐藏内容）。默认全部展开。
    const [collapsed, setCollapsed] = useState({});
    const toggleSection = (id) => setCollapsed(cur => ({ ...cur, [id]: !(cur[id] ?? false) }));
    const isCollapsed = (id) => collapsed[id] === true;
    // 面板位置：null = 默认右上角；拖拽后保存到 localStorage。
    const [pos, setPos] = useState(loadPanelPos);
    const [dragging, setDragging] = useState(false);
    const cardRef = useRef(null);
    const dragRef = useRef(null);
    // 挂载时校准：窗口尺寸变化后把越界的位置拉回可视区。
    useEffect(() => {
        if (pos === null || cardRef.current === null)
            return;
        const card = cardRef.current;
        const clamped = clampPanelPos(pos.left, pos.top, card.offsetWidth, card.offsetHeight);
        if (clamped.left !== pos.left || clamped.top !== pos.top)
            setPos(clamped);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时校准一次
    }, []);
    /** 拖拽启动阈值（px）：按住移动超过该距离才开始拖——「点住才能拖动」，防误触。 */
    const DRAG_THRESHOLD = 4;
    // 整个面板都是拖拽面：按住非按钮区域并移动超过阈值即开始拖动。
    const onCardPointerDown = (e) => {
        if (e.target.closest('button') !== null)
            return; // 按钮不触发拖拽
        const card = cardRef.current;
        if (card === null)
            return;
        const base = pos ?? { left: window.innerWidth - card.offsetWidth - 16, top: 16 };
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            baseLeft: base.left,
            baseTop: base.top,
            active: false, // 尚未越过阈值
        };
    };
    const onCardPointerMove = (e) => {
        const d = dragRef.current;
        if (d === null || e.pointerId !== d.pointerId || cardRef.current === null)
            return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.active) {
            // 按住但还没移够：不启动拖拽（点击/误触不会移动面板）
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD)
                return;
            d.active = true;
            cardRef.current.setPointerCapture(e.pointerId);
            setDragging(true);
        }
        const card = cardRef.current;
        const next = clampPanelPos(d.baseLeft + dx, d.baseTop + dy, card.offsetWidth, card.offsetHeight);
        setPos(next);
    };
    const onCardPointerUp = (e) => {
        const d = dragRef.current;
        if (d === null || e.pointerId !== d.pointerId)
            return;
        dragRef.current = null;
        if (!d.active)
            return; // 简单点击（未拖动），不改变位置
        setDragging(false);
        const card = cardRef.current;
        if (card === null)
            return;
        const next = clampPanelPos(d.baseLeft + (e.clientX - d.startX), d.baseTop + (e.clientY - d.startY), card.offsetWidth, card.offsetHeight);
        setPos(next);
        try {
            localStorage.setItem(PANEL_POS_KEY, JSON.stringify(next));
        }
        catch {
            // 隐私模式等场景忽略持久化失败
        }
    };
    const onCardPointerCancel = (e) => {
        if (dragRef.current === null || e.pointerId !== dragRef.current.pointerId)
            return;
        dragRef.current = null;
        setDragging(false);
    };
    useEffect(() => {
        if (!state.open)
            return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape')
            actions.setOpen(false); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [state.open, actions]);
    /** 领取每日全清宝箱：POST 后刷新本地状态。 */
    const claimChest = useCallback(async () => {
        if (claiming)
            return;
        setClaiming(true);
        try {
            const response = await fetch('/api/devquest/claim-chest', { method: 'POST' });
            const data = await response.json();
            if (data.ok && data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
        }
        catch {
            // 静默失败：下次轮询会纠正状态
        }
        finally {
            setClaiming(false);
        }
    }, [claiming, actions]);
    /** 购买商店商品：两步确认防误触（第一次点击进确认态，3 秒内再点才真买）。 */
    const buy = useCallback(async (itemId) => {
        if (buying !== null)
            return;
        // 第一次点击：进入确认态（显示「确认购买？」）
        if (confirmBuyId !== itemId) {
            setConfirmBuyId(itemId);
            setShopMsg(null);
            window.setTimeout(() => setConfirmBuyId(cur => (cur === itemId ? null : cur)), 3000);
            return;
        }
        setConfirmBuyId(null);
        setBuying(itemId);
        setShopMsg(null);
        try {
            const response = await fetch('/api/devquest/shop/buy', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ itemId }),
            });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
            setShopMsg(data.ok
                ? { ok: true, text: t('dq.shopBought') }
                : { ok: false, text: data.reason === 'insufficient-balance' ? t('dq.shopNoBalance') : (data.reason ?? '') });
        }
        catch {
            setShopMsg({ ok: false, text: t('dq.error') });
        }
        finally {
            setBuying(null);
        }
    }, [buying, confirmBuyId, actions, t]);
    /** 使用任务重掷。 */
    const rerollQuests = useCallback(async () => {
        if (rerolling)
            return;
        setRerolling(true);
        try {
            const response = await fetch('/api/devquest/shop/reroll', { method: 'POST' });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
        }
        catch {
            // 静默失败
        }
        finally {
            setRerolling(false);
        }
    }, [rerolling, actions]);
    /** 每日幸运抽奖。 */
    const claimLuckyDraw = useCallback(async () => {
        if (claimingLucky)
            return;
        setClaimingLucky(true);
        setLuckyMsg(null);
        try {
            const response = await fetch('/api/devquest/lucky', { method: 'POST' });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
            if (data.ok && data.reward !== undefined)
                setLuckyMsg(t('dq.luckyResult', { label: data.reward.label }));
            else if (!data.ok)
                setLuckyMsg(t('dq.luckyClaimed'));
        }
        catch {
            setLuckyMsg(t('dq.error'));
        }
        finally {
            setClaimingLucky(false);
        }
    }, [claimingLucky, actions, t]);
    /** 导出存档（下载 JSON）。 */
    const exportSave = useCallback(async () => {
        try {
            const response = await fetch('/api/devquest/export');
            const text = await response.text();
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `devquest-player-${dayKeyLocal()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setShopMsg({ ok: true, text: t('dq.exported') });
        }
        catch {
            setShopMsg({ ok: false, text: t('dq.error') });
        }
    }, [t]);
    /** 导入存档（覆盖当前）。 */
    const importSave = useCallback(async (file) => {
        if (importing)
            return;
        setImporting(true);
        try {
            const text = await file.text();
            const response = await fetch('/api/devquest/import', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: text,
            });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
            setShopMsg(data.ok
                ? { ok: true, text: t('dq.imported') }
                : { ok: false, text: t('dq.importFailed') });
        }
        catch {
            setShopMsg({ ok: false, text: t('dq.importFailed') });
        }
        finally {
            setImporting(false);
        }
    }, [importing, actions, t]);
    /** 切换展示称号（titleId 空 = 跟随等级）。 */
    const switchTitle = useCallback(async (titleId) => {
        try {
            const response = await fetch('/api/devquest/titles/switch', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ titleId }),
            });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
        }
        catch {
            // 静默失败
        }
    }, [actions]);
    /** 切换已拥有主题（空 = 默认主题）。 */
    const activateTheme = useCallback(async (themeId) => {
        try {
            const response = await fetch('/api/devquest/shop/theme', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ themeId }),
            });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
            if (data.ok)
                setShopMsg({ ok: true, text: t('dq.themeUsed') });
        }
        catch {
            // 静默失败
        }
    }, [actions, t]);
    /** 领取每周全清奖励。 */
    const claimWeekly = useCallback(async () => {
        if (weeklyClaiming)
            return;
        setWeeklyClaiming(true);
        try {
            const response = await fetch('/api/devquest/weekly-bonus', { method: 'POST' });
            const data = await response.json();
            if (data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
        }
        catch {
            // 静默失败
        }
        finally {
            setWeeklyClaiming(false);
        }
    }, [weeklyClaiming, actions]);
    /** 生成成就分享卡片（canvas → PNG 下载）。 */
    const shareCard = useCallback(async () => {
        if (sharing || state.status === null)
            return;
        setSharing(true);
        try {
            const s = state.status;
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (ctx === null)
                throw new Error('no-canvas');
            // 深色渐变背景
            const grad = ctx.createLinearGradient(0, 0, 640, 400);
            grad.addColorStop(0, '#101722');
            grad.addColorStop(1, '#1d2735');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 640, 400);
            // 边框装饰
            ctx.strokeStyle = 'rgba(246,198,82,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(12, 12, 616, 376);
            // 标题
            ctx.fillStyle = '#8ec5ff';
            ctx.font = '700 22px "Segoe UI", sans-serif';
            ctx.fillText('⚔️ DevQuest', 36, 56);
            // 等级 + 称号
            ctx.fillStyle = '#f6c652';
            ctx.font = '700 46px "Segoe UI", sans-serif';
            ctx.fillText(`Lv.${s.level}`, 36, 130);
            const titleName = s.titles?.current?.name.zh ?? s.title.zh;
            ctx.fillStyle = '#f2f6fc';
            ctx.font = '600 24px "Segoe UI", sans-serif';
            ctx.fillText(titleName, 170, 130);
            // XP 条
            const pct = levelPercent(s);
            ctx.fillStyle = '#1d2735';
            ctx.fillRect(36, 160, 568, 14);
            ctx.fillStyle = '#8ec5ff';
            ctx.fillRect(36, 160, Math.round(568 * pct), 14);
            ctx.fillStyle = '#9daabd';
            ctx.font = '500 16px "Segoe UI", sans-serif';
            ctx.fillText(`${s.xp} / ${s.xpToNext} XP`, 36, 198);
            // 统计
            const c = s.counters;
            ctx.fillStyle = '#9daabd';
            ctx.font = '500 17px "Segoe UI", sans-serif';
            ctx.fillText(`回合 ${c.turnsCompleted}   ·   工具 ${c.toolCalls}   ·   待办 ${c.todosCompleted}`, 36, 240);
            ctx.fillText(`赛季 ${s.season} · ${s.seasonXp} XP   ·   成就 ${s.achievements.filter(a => a.unlocked).length}/44`, 36, 270);
            // 已解锁成就图标（前 12 个）
            const unlockedIcons = s.achievements.filter(a => a.unlocked).slice(0, 12).map(a => a.icon);
            ctx.font = '26px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            for (let i = 0; i < unlockedIcons.length; i++) {
                ctx.fillText(unlockedIcons[i], 36 + (i % 6) * 50, 330 + Math.floor(i / 6) * 40);
            }
            // 底部水印
            ctx.fillStyle = '#718096';
            ctx.font = '400 13px "Segoe UI", sans-serif';
            ctx.fillText('DevQuest — 把开发变成 RPG', 36, 372);
            // 下载
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `devquest-card-${dayKeyLocal()}.png`;
            a.click();
            setShopMsg({ ok: true, text: t('dq.shareDone') });
        }
        catch {
            setShopMsg({ ok: false, text: t('dq.shareFailed') });
        }
        finally {
            setSharing(false);
        }
    }, [sharing, state.status, t]);
    const status = state.status;
    // 位置：拖拽后 left/top；未拖过则默认右上角。
    const positionStyle = pos !== null
        ? { left: pos.left, top: pos.top }
        : { right: 16, top: 16 };
    if (status === null) {
        return _jsxs("section", { ref: cardRef, style: { ...cardStyle, ...positionStyle, ...(dragging ? cardDraggingStyle : {}) }, "data-devquest": true, onPointerDown: onCardPointerDown, onPointerMove: onCardPointerMove, onPointerUp: onCardPointerUp, onPointerCancel: onCardPointerCancel, children: [_jsxs("header", { style: cardHeaderStyle, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 20 }) }), _jsx("strong", { style: cardTitleStyle, children: "DevQuest" }), _jsx("button", { type: "button", onClick: () => actions.setOpen(false), "aria-label": t('dq.close'), style: iconButtonStyle, children: _jsx(CloseIcon, {}) })] }), _jsx("div", { style: cardBodyStyle, children: _jsx("span", { style: emptyStyle, children: state.state === 'error' ? `${t('dq.error')} · ${state.error ?? ''}` : t('dq.empty') }) })] });
    }
    const unlocked = status.achievements.filter(a => a.unlocked);
    const recent = [...unlocked].sort((a, b) => (b.acquiredAt ?? 0) - (a.acquiredAt ?? 0)).slice(0, 4);
    const wallItems = status.achievements.filter(a => a.category === category);
    const c = status.counters;
    const percent = Math.round(levelPercent(status) * 100);
    // 最近的里程碑：未解锁且可见、有进度的成就里完成度最高（最接近解锁）的一个。
    const milestone = status.achievements
        .filter(a => !a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0)
        .map(a => ({ a, ratio: a.progress.current / a.progress.goal }))
        .sort((x, y) => y.ratio - x.ratio)[0];
    return _jsxs("section", { ref: cardRef, style: { ...cardStyle, ...positionStyle, ...(dragging ? cardDraggingStyle : {}), ...themeVars(status.shop?.theme ?? '') }, "data-devquest": true, onPointerDown: onCardPointerDown, onPointerMove: onCardPointerMove, onPointerUp: onCardPointerUp, onPointerCancel: onCardPointerCancel, children: [_jsxs("header", { style: cardHeaderStyle, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 20 }) }), _jsx("strong", { style: cardTitleStyle, children: "DevQuest" }), _jsx("button", { type: "button", onClick: () => actions.setOpen(false), "aria-label": t('dq.close'), style: iconButtonStyle, children: _jsx(CloseIcon, {}) })] }), _jsxs("div", { style: cardBodyStyle, children: [_jsxs("div", { style: heroStyle, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(LevelRing, { status: status }), _jsxs("div", { style: levelBadgeStyle, children: [_jsxs("span", { style: levelNumStyle, children: ["Lv.", status.level] }), _jsx("span", { style: { ...levelSubStyle, ...titleToneStyle(status.level) }, children: status.title.zh })] })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: titleRowStyle, children: [_jsx("span", { style: { ...titleTextStyle, ...titleToneStyle(status.level) }, children: status.title.zh }), (status.shop?.badges ?? []).map(badgeId => {
                                                const item = status.shop?.items.find(i => i.id === badgeId);
                                                return item !== undefined ? _jsx("span", { style: titleBadgeStyle, title: item.name.zh, children: item.icon }, badgeId) : null;
                                            }), _jsx("span", { style: seasonStyle, children: t('dq.season', { season: status.season }) })] }), status.levelStartedAt !== undefined && (_jsx("span", { style: levelSinceStyle, children: t('dq.levelSince', { days: Math.max(0, Math.floor((Date.now() - status.levelStartedAt) / 86_400_000)) }) })), _jsxs("div", { style: sprintRowStyle, children: [_jsx("span", { style: sprintLabelStyle, children: t('dq.seasonSprint') }), _jsx("div", { style: sprintTrackStyle, children: _jsx("div", { style: { ...sprintFillStyle, width: `${Math.min(100, Math.round((c.seasonTokensOut / SEASON_GOAL_TOKENS) * 100))}%` } }) }), _jsx("span", { style: sprintDaysStyle, children: t('dq.seasonDaysLeft', { days: seasonDaysLeft(status.season) }) })] }), _jsx("div", { style: xpTrackStyle, children: _jsx("div", { style: { ...xpFillStyle, width: `${percent}%` } }) }), _jsxs("div", { style: xpRowStyle, children: [_jsx("span", { style: xpTextStyle, children: t('dq.xpToNext', { xp: status.xp, next: status.xpToNext }) }), _jsx("button", { type: "button", onClick: refresh, "aria-label": t('dq.refresh'), title: t('dq.refresh'), style: iconButtonStyle, children: _jsx(RefreshIcon, {}) })] }), _jsxs("div", { style: metaRowStyle, children: [_jsx("span", { style: metaStyle, children: t('dq.turns', { n: c.turnsCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.toolCalls', { n: c.toolCalls }) }), _jsx("span", { style: metaStyle, children: t('dq.todos', { n: c.todosCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.tokens', { n: formatNumber(c.tokensOut) }) }), comboMultiplier(c.consecutiveSuccess) !== null && (_jsxs("span", { style: comboStyle, children: ["\uD83D\uDD25 ", t('dq.combo', { n: c.consecutiveSuccess }), " \u00D7", comboMultiplier(c.consecutiveSuccess)] }))] })] })] }), _jsxs("div", { style: nextTitleRowStyle, children: [status.nextTitle !== null && (_jsx("span", { style: nextTitleStyle, children: t('dq.nextTitle', { name: status.nextTitle.name.zh, level: status.nextTitle.level, xp: Math.max(0, Math.round(status.nextTitle.xpToNext)) }) })), status.lucky !== undefined && status.lucky.available && (_jsxs("button", { type: "button", onClick: () => void claimLuckyDraw(), disabled: claimingLucky, style: luckyButtonStyle, children: ["\uD83C\uDF81 ", claimingLucky ? '…' : t('dq.luckyDraw')] }))] }), luckyMsg !== null && _jsx("div", { style: luckyMsgStyle, children: luckyMsg }), _jsxs(SectionCard, { id: "daily", title: `📅 ${t('dq.daily')}`, right: _jsx("span", { style: updatedStyle, children: status.daily?.date ?? '' }), collapsed: isCollapsed('daily'), onToggle: () => toggleSection('daily'), children: [(status.daily?.quests ?? []).map(q => {
                                const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                                return (_jsxs("div", { style: questRowStyle, children: [_jsxs("div", { style: questTopStyle, children: [_jsxs("span", { style: questLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: questRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: questTrackStyle, children: _jsx("div", { style: { ...questFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                            }), status.dailyChest !== undefined && (status.dailyChest.ready || status.dailyChest.claimed) && (status.dailyChest.claimed
                                ? _jsxs("div", { style: chestClaimedStyle, children: ["\uD83C\uDF81 ", t('dq.chestClaimed')] })
                                : _jsxs("button", { type: "button", onClick: () => void claimChest(), disabled: claiming, style: chestButtonStyle, children: ["\uD83C\uDF81 ", claiming ? t('dq.chestClaiming') : t('dq.chestReady', { xp: 50 })] })), status.weekly !== undefined && (_jsxs("div", { style: weeklyWrapStyle, children: [_jsxs("div", { style: weeklyHeadStyle, children: [_jsxs("span", { style: weeklyTitleStyle, children: ["\uD83D\uDDD3\uFE0F ", t('dq.weekly')] }), _jsx("span", { style: weeklyWeekStyle, children: t('dq.weeklyWeek', { week: status.weekly.week }) })] }), status.weekly.quests.map(q => {
                                        const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                                        return (_jsxs("div", { style: weeklyQuestRowStyle, children: [_jsxs("div", { style: weeklyQuestTopStyle, children: [_jsxs("span", { style: weeklyQuestLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: weeklyQuestRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: weeklyQuestTrackStyle, children: _jsx("div", { style: { ...weeklyQuestFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                                    }), status.weekly.bonusReady
                                        ? _jsxs("button", { type: "button", onClick: () => void claimWeekly(), disabled: weeklyClaiming, style: weeklyBonusButtonStyle, children: ["\uD83C\uDF81 ", weeklyClaiming ? '…' : t('dq.weeklyBonus', { xp: 100 })] })
                                        : status.weekly.bonusClaimed && _jsxs("div", { style: weeklyBonusClaimedStyle, children: ["\uD83C\uDF81 ", t('dq.weeklyBonusClaimed')] })] }))] }), _jsxs(SectionCard, { id: "shop", title: `🛒 ${t('dq.shop')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.shopBalance', { balance: status.shop?.balance ?? 0 }) }), collapsed: isCollapsed('shop'), onToggle: () => toggleSection('shop'), children: [_jsxs("div", { style: shopBarStyle, children: [(status.shop?.shields ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopShields', { n: status.shop.shields }) }), (status.shop?.rerolls ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopRerolls', { n: status.shop.rerolls }) })] }), _jsxs("div", { style: shopGridStyle, children: [status.shop?.items.filter(item => item.kind !== 'theme').map(item => {
                                        const canAfford = (status.shop.balance) >= item.price;
                                        return (_jsxs("div", { style: shopItemStyle, children: [_jsxs("div", { style: shopItemHeadStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: item.icon }), _jsx("span", { style: shopItemNameStyle, children: item.name.zh }), _jsx("span", { style: shopItemPriceStyle, children: item.price })] }), _jsx("div", { style: shopItemDescStyle, children: item.description.zh }), item.owned
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
                                    }), shopMsg !== null && _jsx("div", { style: shopMsgStyle(shopMsg.ok), children: shopMsg.text }), (status.shop?.rerolls ?? 0) > 0 && (_jsxs("button", { type: "button", onClick: () => void rerollQuests(), disabled: rerolling, style: rerollButtonStyle, children: ["\uD83D\uDD00 ", rerolling ? '…' : t('dq.shopReroll')] }))] })] }), _jsx(SectionCard, { id: "skins", title: `🎨 ${t('dq.skins')}`, right: (() => {
                            const activeTheme = status.shop?.items.find(i => i.id === status.shop?.theme);
                            return status.shop?.theme !== undefined && status.shop.theme !== '' && activeTheme !== undefined
                                ? _jsxs("span", { style: skinHeadActiveStyle, children: [activeTheme.icon, " ", activeTheme.name.zh] })
                                : _jsx("span", { style: updatedStyle, children: t('dq.skinDefault') });
                        })(), collapsed: isCollapsed('skins'), onToggle: () => toggleSection('skins'), children: _jsx("div", { style: skinGridStyle, children: status.shop?.items.filter(item => item.kind === 'theme').map(item => {
                                const canAfford = (status.shop.balance) >= item.price;
                                const active = status.shop?.theme === item.id;
                                const owned = item.owned;
                                return (_jsxs("div", { style: { ...shopItemStyle, ...(active ? skinItemActiveStyle : {}) }, children: [_jsxs("div", { style: shopItemHeadStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: item.icon }), _jsx("span", { style: shopItemNameStyle, children: item.name.zh }), _jsx("span", { style: shopItemPriceStyle, children: item.price })] }), _jsx("div", { style: shopItemDescStyle, children: item.description.zh }), active
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
                            }) }) }), _jsxs(SectionCard, { id: "tutorial", title: `🎓 ${t('dq.tutorial')}`, right: _jsx("span", { style: updatedStyle, children: status.tutorial?.done ? '✅' : t('dq.tutorialStepDone', { n: status.tutorial?.steps.filter(s => s.done).length ?? 0, m: status.tutorial?.steps.length ?? 5 }) }), collapsed: isCollapsed('tutorial'), onToggle: () => toggleSection('tutorial'), children: [status.tutorial?.steps.map(step => (_jsxs("div", { style: tutorialRowStyle, children: [_jsx("span", { style: { fontSize: 13, opacity: step.done ? 1 : 0.55 }, children: step.done ? '✅' : step.icon }), _jsx("span", { style: { ...tutorialNameStyle, ...(step.done ? {} : { color: TONE.muted }) }, children: step.name.zh }), _jsxs("span", { style: tutorialXpStyle, children: ["+", step.xp] })] }, step.id))), status.tutorial?.done === true && (_jsxs("div", { style: tutorialTitleStyle, children: ["\uD83C\uDFC5 ", t('dq.tutorialTitle', { title: status.tutorial.title.zh })] }))] }), _jsxs(SectionCard, { id: "titles", title: `🏷️ ${t('dq.titles')}`, right: status.titles?.current !== null
                            ? _jsxs("span", { style: titleHeadCurrentStyle, children: [status.titles?.current?.icon ?? '🎖️', " ", status.titles?.current?.name.zh] })
                            : _jsxs("span", { style: titleHeadCurrentStyle, children: [t('dq.titleFollowLevel'), " \u00B7 ", status.title.zh] }), collapsed: isCollapsed('titles'), onToggle: () => toggleSection('titles'), children: [_jsxs("div", { style: titleCurrentRowStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: status.titles?.current?.icon ?? '🎖️' }), _jsx("span", { style: titleCurrentNameStyle, children: status.titles?.current !== null
                                            ? status.titles?.current?.name.zh
                                            : `${t('dq.titleFollowLevel')} · ${status.title.zh}` }), _jsx("button", { type: "button", onClick: () => void shareCard(), disabled: sharing, style: shareButtonStyle, children: sharing ? '…' : `📤 ${t('dq.share')}` })] }), _jsxs("div", { style: titleListStyle, children: [_jsxs("button", { type: "button", onClick: () => void switchTitle(''), style: { ...titleItemStyle, ...(status.titles?.current === null ? titleItemActiveStyle : {}) }, children: [_jsx("span", { children: "\uD83C\uDF96\uFE0F" }), _jsxs("span", { style: titleItemNameStyle, children: [t('dq.titleFollowLevel'), " \u00B7 ", status.title.zh] }), status.titles?.current === null && _jsx("span", { style: titleItemActiveMarkStyle, children: t('dq.titleActive') })] }), (status.titles?.items ?? []).map(ti => (_jsxs("button", { type: "button", onClick: () => { if (ti.unlocked)
                                            void switchTitle(ti.id); }, disabled: !ti.unlocked, style: {
                                            ...titleItemStyle,
                                            ...(!ti.unlocked ? titleItemLockedStyle : {}),
                                            ...(status.titles?.current?.id === ti.id ? titleItemActiveStyle : {}),
                                        }, children: [_jsx("span", { children: ti.unlocked ? ti.icon : '🔒' }), _jsxs("span", { style: titleItemNameStyle, children: [ti.name.zh, " ", _jsx("em", { style: itemEnStyle, children: ti.name.en })] }), !ti.unlocked && _jsx("span", { style: titleItemLockedMarkStyle, children: t('dq.titleLocked') }), ti.unlocked && status.titles?.current?.id === ti.id && (_jsx("span", { style: titleItemActiveMarkStyle, children: t('dq.titleActive') }))] }, ti.id)))] })] }), _jsxs(SectionCard, { id: "collections", title: `📚 ${t('dq.collections')}`, collapsed: isCollapsed('collections'), onToggle: () => toggleSection('collections'), children: [(status.collections?.items ?? []).map(coll => (_jsxs("div", { style: collRowStyle, children: [_jsx("span", { style: { fontSize: 13, opacity: coll.completed ? 1 : 0.6 }, children: coll.completed ? '🏅' : categoryIcon(coll.category) }), _jsx("span", { style: { ...collNameStyle, ...(coll.completed ? { color: TONE.gold, fontWeight: 700 } : {}) }, children: t(`dq.cat.${coll.category}`) }), _jsx("span", { style: collProgressStyle, children: coll.completed ? t('dq.collectionDone') : t('dq.collectionProgress', { n: coll.unlocked, m: coll.total }) }), !coll.completed && _jsx("span", { style: collRewardStyle, children: t('dq.collectionReward', { xp: coll.rewardXp }) })] }, coll.category))), _jsxs("div", { style: saveBarStyle, children: [_jsxs("button", { type: "button", onClick: () => void exportSave(), style: saveButtonStyle, children: ["\u2B07\uFE0F ", t('dq.export')] }), _jsxs("label", { style: saveButtonStyle, children: [importing ? '…' : `⬆️ ${t('dq.import')}`, _jsx("input", { type: "file", accept: "application/json,.json", style: { display: 'none' }, onChange: (e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f !== undefined)
                                                        void importSave(f);
                                                    e.target.value = '';
                                                } })] })] })] }), _jsx(SectionCard, { id: "recent", title: t('dq.recent'), right: _jsxs("span", { style: updatedStyle, children: [t('dq.updated'), " ", updatedLabel(state.refreshedAt)] }), collapsed: isCollapsed('recent'), onToggle: () => toggleSection('recent'), children: recent.length === 0
                            ? _jsx("span", { style: emptyStyle, children: t('dq.empty') })
                            : _jsx("ul", { style: listStyle, children: recent.map(a => (_jsxs("li", { style: listItemStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: a.icon }), _jsx("span", { style: { flex: 1, minWidth: 0 }, children: _jsxs("span", { style: itemNameStyle, children: [a.name.zh, " ", _jsx("em", { style: itemEnStyle, children: a.name.en })] }) }), a.acquiredAt !== undefined && _jsx("span", { style: itemTimeStyle, children: formatTime(a.acquiredAt) })] }, a.id))) }) }), _jsxs(SectionCard, { id: "wall", title: t('dq.wall'), right: _jsx("span", { style: wallCountStyle, children: t('dq.wallCount', { n: unlocked.length, m: status.achievements.length }) }), collapsed: isCollapsed('wall'), onToggle: () => toggleSection('wall'), children: [milestone !== undefined && (_jsxs("div", { style: milestoneStyle, children: [_jsx("span", { style: milestoneIconStyle, children: milestone.a.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: milestoneTopStyle, children: [_jsx("span", { style: milestoneNameStyle, children: t('dq.nextMilestone', { name: milestone.a.name.zh }) }), _jsxs("span", { style: milestoneNumStyle, children: [milestone.a.progress.current, "/", milestone.a.progress.goal] })] }), _jsx("div", { style: milestoneTrackStyle, children: _jsx("div", { style: { ...milestoneFillStyle, width: `${Math.min(100, Math.round(milestone.ratio * 100))}%` } }) })] })] })), _jsx("div", { style: tabsStyle, children: CATEGORY_KEYS.map(key => (_jsx("button", { type: "button", onClick: () => setCategory(key), style: { ...tabStyle, ...(category === key ? tabActiveStyle : {}) }, children: t(`dq.cat.${key}`) }, key))) }), _jsx("div", { style: wallGridStyle, children: wallItems.map(a => {
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
                                        }, children: [a.unlocked && _jsx("span", { style: wallCheckStyle, children: "\u2713" }), _jsx("span", { style: { fontSize: 17, lineHeight: 1.2 }, children: visible ? a.icon : (revealHint ? '❔' : '🔒') }), !a.hidden && (_jsxs("span", { style: { ...wallXpStyle, ...(a.unlocked ? wallXpUnlockedStyle : {}) }, children: ["+", a.xp] })), locked && p !== undefined && p.goal > 0 && (_jsx("span", { style: wallProgressTrackStyle, children: _jsx("span", { style: { ...wallProgressFillStyle, width: `${Math.min(100, Math.round((p.current / p.goal) * 100))}%` } }) }))] }, a.id);
                                }) }), hover !== null && _jsx(AchievementTooltip, { hover: hover, t: t })] }), _jsx(SectionCard, { id: "report", title: `📈 ${t('dq.report')}`, collapsed: isCollapsed('report'), onToggle: () => toggleSection('report'), children: _jsxs("div", { style: reportStyle, children: [_jsx("div", { style: reportBarsStyle, children: (status.history ?? []).slice(-7).map(h => {
                                        const max = Math.max(...(status.history ?? []).slice(-7).map(x => x.xp), 1);
                                        const pct = Math.max(4, Math.round((h.xp / max) * 100));
                                        return (_jsxs("div", { style: reportBarColStyle, title: `${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`, children: [_jsx("div", { style: reportBarWrapStyle, children: _jsx("div", { style: { ...reportBarStyle, height: `${pct}%` } }) }), _jsx("span", { style: reportBarTurnStyle, children: h.turns > 0 ? h.turns : '' }), _jsx("span", { style: reportBarDateStyle, children: h.date.slice(5) })] }, h.date));
                                    }) }), _jsx("div", { style: reportLegendStyle, children: t('dq.report7d') })] }) }), _jsxs(SectionCard, { id: "calendar", title: `🗓️ ${t('dq.calendar')}`, right: _jsx("span", { style: updatedStyle, children: t('dq.calendarDays') }), collapsed: isCollapsed('calendar'), onToggle: () => toggleSection('calendar'), children: [_jsx("div", { style: calendarGridStyle, children: (status.history ?? []).slice(-30).map(h => {
                                    const intensity = h.xp > 0 ? Math.min(4, 1 + Math.floor(h.xp / 100)) : 0;
                                    return _jsx("span", { title: `${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`, style: { ...calendarCellStyle, ...(calendarIntensityStyle(intensity)) } }, h.date);
                                }) }), _jsxs("div", { style: calendarLegendStyle, children: [_jsx("span", { style: calendarLegendLabelStyle, children: "\u5C11" }), _jsx("span", { style: calendarLegendBlockStyle(1) }), _jsx("span", { style: calendarLegendBlockStyle(2) }), _jsx("span", { style: calendarLegendBlockStyle(3) }), _jsx("span", { style: calendarLegendBlockStyle(4) }), _jsx("span", { style: calendarLegendLabelStyle, children: "\u591A" })] })] }), _jsx(SectionCard, { id: "stats", title: `📊 ${t('dq.stats')}`, collapsed: isCollapsed('stats'), onToggle: () => toggleSection('stats'), children: _jsxs("div", { style: statsWrapStyle, children: [_jsxs("div", { style: statsRowStyle, children: [_jsxs("span", { style: statsChipStyle, children: ["\uD83C\uDFC6 ", t('dq.statsBestCombo'), ": ", Math.max(c.consecutiveSuccess, ...(status.records ?? []).map(r => r.combo))] }), _jsxs("span", { style: statsChipStyle, children: ["\u2B06\uFE0F ", t('dq.statsBestLevel'), ": ", Math.max(status.level, ...(status.records ?? []).map(r => r.level))] })] }), _jsx("div", { style: statsSubTitleStyle, children: t('dq.statsTopTools') }), _jsx("div", { style: toolRankStyle, children: Object.entries(c.toolCallsByTool)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([tool, n], i) => (_jsxs("div", { style: toolRankRowStyle, children: [_jsx("span", { style: toolRankNumStyle, children: i + 1 }), _jsx("span", { style: toolRankNameStyle, children: tool }), _jsx("span", { style: toolRankCountStyle, children: n })] }, tool))) }), (status.records ?? []).length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: statsSubTitleStyle, children: ["\uD83C\uDFDB\uFE0F ", t('dq.records')] }), _jsx("div", { style: recordRowStyle, children: (status.records ?? []).map(r => (_jsxs("span", { style: recordChipStyle, title: t('dq.recordsCombo', { combo: r.combo }), children: [t('dq.recordsSeason', { season: r.season }), " \u00B7 Lv.", r.level] }, r.season))) })] }))] }) })] })] });
}
// ---------------------------------------------------------------------------
// 成就悬浮简介
// ---------------------------------------------------------------------------
/** 成就墙悬浮提示：鼠标移到成就格上时显示名称/简介/奖励/解锁状态。 */
function AchievementTooltip(props) {
    const { hover, t } = props;
    const a = hover.a;
    const visible = a.unlocked || !a.hidden;
    const near = !a.unlocked && a.hidden && a.progress !== undefined && a.progress.goal > 0 && a.progress.current / a.progress.goal >= 0.5;
    return _jsxs("div", { style: { ...tooltipStyle, left: hover.x, top: hover.y }, role: "tooltip", children: [_jsxs("div", { style: tooltipHeadStyle, children: [_jsx("span", { style: { fontSize: 20 }, children: visible ? a.icon : (near ? '❔' : '🔒') }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: tooltipNameStyle, children: visible ? `${a.name.zh} ${a.name.en}` : '？？？' }), _jsxs("div", { style: tooltipStatusStyle, children: [a.unlocked
                                        ? _jsxs("span", { style: { color: TONE.green }, children: ["\u2705 ", t('dq.earned')] })
                                        : _jsxs("span", { style: { color: TONE.quiet }, children: ["\uD83D\uDD12 ", t('dq.notEarned')] }), !a.hidden && _jsxs("span", { style: tooltipXpStyle, children: ["+", a.xp, " XP"] })] })] })] }), _jsx("div", { style: tooltipDescStyle, children: visible ? a.description.zh : (near ? t('dq.hiddenNear') : t('dq.hiddenHint')) }), !a.unlocked && !a.hidden && a.progress !== undefined && a.progress.goal > 0 && (_jsxs("div", { style: tooltipProgressWrapStyle, children: [_jsxs("div", { style: tooltipProgressTopStyle, children: [_jsx("span", { style: tooltipProgressLabelStyle, children: t('dq.progress') }), _jsxs("span", { style: tooltipProgressNumStyle, children: [a.progress.current, "/", a.progress.goal] })] }), _jsx("div", { style: tooltipProgressTrackStyle, children: _jsx("div", { style: { ...tooltipProgressFillStyle, width: `${Math.min(100, Math.round((a.progress.current / a.progress.goal) * 100))}%` } }) })] }))] });
}
// ---------------------------------------------------------------------------
// 成就 toast
// ---------------------------------------------------------------------------
/** 统一 toast 分发：成就解锁 / 回合结算。 */
function DevQuestToast(props) {
    const { toast, status, actions, t } = props;
    useEffect(() => {
        const timer = setTimeout(() => actions.dismissToast(toast.id), 6000);
        return () => clearTimeout(timer);
    }, [toast.id, actions]);
    if (toast.kind === 'settlement' && toast.settlement !== undefined) {
        const s = toast.settlement;
        const comboText = s.combo !== null ? ` · 🔥 ×${s.combo}` : '';
        const questText = s.questXp > 0 ? ` · 📅 +${s.questXp}` : '';
        return _jsxs("div", { style: { ...toastStyle, borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)' }, role: "status", children: [_jsx("div", { style: { fontSize: 18 }, children: s.leveledUp ? '⬆️' : '⚔️' }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { ...toastTitleStyle, color: s.leveledUp ? TONE.gold : TONE.accent }, children: s.leveledUp ? t('dq.levelUp', { level: s.levelAfter }) : t('dq.turnDone') }), _jsxs("div", { style: toastNameStyle, children: ["+", s.xp, " XP", comboText, questText] }), _jsx("div", { style: toastDescStyle, children: s.leveledUp
                                ? t('dq.levelUpTo', { title: titleFor(s.levelAfter).zh })
                                : t('dq.turnStats', { turns: s.turnsDone }) })] }), _jsx("button", { type: "button", onClick: () => actions.dismissToast(toast.id), "aria-label": t('dq.close'), style: toastCloseStyle, children: "\u00D7" })] });
    }
    const def = status.achievements.find(a => a.id === toast.achievementId);
    if (def === undefined)
        return _jsx(_Fragment, {});
    return _jsxs("div", { style: { ...toastStyle, ...rarityToastStyle(def.rarity) }, role: "status", children: [_jsx("div", { style: { fontSize: 18 }, children: def.icon }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs("div", { style: { ...toastTitleStyle, color: RARITY_COLOR[def.rarity] ?? TONE.gold }, children: [t('dq.unlocked'), " ", _jsxs("span", { style: { fontSize: 9, opacity: 0.8 }, children: ["\u00B7 ", t(`dq.rarity.${def.rarity}`)] })] }), _jsxs("div", { style: toastNameStyle, children: [def.name.zh, " ", _jsx("em", { style: itemEnStyle, children: def.name.en })] }), _jsxs("div", { style: toastDescStyle, children: [def.description.zh, " \u00B7 +", def.xp, " XP"] })] }), _jsx("button", { type: "button", onClick: () => actions.dismissToast(toast.id), "aria-label": t('dq.close'), style: toastCloseStyle, children: "\u00D7" })] });
}
// ---------------------------------------------------------------------------
// 入口组件
// ---------------------------------------------------------------------------
/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
export function DevQuestFooterAction(props) {
    const { useStore, actions, t, wide } = props;
    const state = useStore(snapshot => snapshot);
    // 无状态时不显示等级（避免启动时闪现错误的 Lv.1；overlay 常驻拉取后自然出现真实等级）。
    const level = state.status?.level;
    const open = state.open;
    // 收起态：极紧凑的纯图标按钮（28px 居中），无突出角标——
    // 底部操作位空间紧张（多个插件共用），任何突出元素都会被挤占/裁切。
    if (!wide) {
        return _jsx("button", { type: "button", onClick: () => actions.setOpen(!open), title: level === undefined ? t('dq.open') : `${t('dq.open')} · Lv.${level}`, "aria-label": t('dq.open'), "aria-expanded": open, style: {
                ...railActionStyle,
                ...(open ? footerActionActiveStyle : {}),
            }, children: _jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 18 }) }) });
    }
    return _jsxs("button", { type: "button", onClick: () => actions.setOpen(!open), title: t('dq.open'), "aria-label": t('dq.open'), "aria-expanded": open, style: {
            ...footerActionStyle,
            ...(open ? footerActionActiveStyle : {}),
        }, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 17 }) }), _jsx("span", { style: footerLabelStyle, children: "DevQuest" }), level !== undefined && _jsxs("span", { style: levelChipStyle, children: ["Lv.", level] })] });
}
/** shell.overlay：浮动面板 + toast 栈。常驻挂载：页面加载即拉取全局状态并 60s 轮询，
 * 保证侧边栏等级与面板数据在打开面板前就已就绪。 */
export function DevQuestOverlay(props) {
    const { useStore, actions, t } = props;
    const state = useStore(snapshot => snapshot);
    const controllerRef = useRef(null);
    // 里程碑庆祝：等级升到 5 的倍数时全屏金色庆祝。
    const [celebration, setCelebration] = useState(null);
    const prevLevelRef = useRef(null);
    // v0.3 起状态是全局玩家档，与 cwd/session 无关：直接拉取不带 session 参数。
    const refresh = useCallback(() => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        actions.setState('loading', null);
        void fetch(STATUS_API, { signal: controller.signal }).then(response => {
            if (!response.ok)
                throw new Error(`devquest ${response.status}`);
            return response.json();
        }).then(data => {
            if (controller.signal.aborted)
                return;
            if (data.ok && data.status !== null && data.status !== undefined)
                actions.setStatus(data.status);
            else
                actions.setState('error', 'empty response');
        }, () => {
            if (!controller.signal.aborted)
                actions.setState('error', 'transport error');
        });
    }, [actions]);
    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, POLL_MS);
        return () => {
            clearInterval(timer);
            controllerRef.current?.abort();
        };
    }, [refresh]);
    // 里程碑检测：等级提升且新等级是 5 的倍数 → 庆祝（只触发一次）。
    useEffect(() => {
        const level = state.status?.level;
        if (level === undefined)
            return;
        const prev = prevLevelRef.current;
        prevLevelRef.current = level;
        if (prev !== null && level > prev && level % 5 === 0 && state.status !== null) {
            const startedAt = state.status.levelStartedAt;
            const days = startedAt !== undefined ? Math.max(0, Math.floor((Date.now() - startedAt) / 86_400_000)) : 0;
            setCelebration({
                level,
                title: state.status.title.zh,
                days,
                turns: state.status.counters.turnsCompleted,
            });
            window.setTimeout(() => setCelebration(null), 4000);
        }
    }, [state.status]);
    // 注入庆祝动画 keyframes（只注入一次）。
    useEffect(() => {
        if (document.getElementById('dsh-devquest-kf') !== null)
            return;
        const style = document.createElement('style');
        style.id = 'dsh-devquest-kf';
        style.textContent = '@keyframes dshCelebrateFade { 0% { opacity: 0; transform: scale(0.92); } 12% { opacity: 1; transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; } }';
        document.head.appendChild(style);
        return () => { document.getElementById('dsh-devquest-kf')?.remove(); };
    }, []);
    return _jsxs(_Fragment, { children: [state.open && (_jsx(DevQuestPanelCard, { useStore: useStore, actions: actions, t: t, refresh: refresh })), state.toasts.length > 0 && state.status !== null && (_jsx("div", { style: toastStackStyle, children: state.toasts.map(toast => (_jsx(DevQuestToast, { toast: toast, status: state.status, actions: actions, t: t }, toast.id))) })), celebration !== null && (_jsx("div", { style: celebrationOverlayStyle, role: "alert", children: _jsxs("div", { style: celebrationInnerStyle, children: [_jsx("div", { style: { fontSize: 64, lineHeight: 1 }, children: "\uD83C\uDFC6" }), _jsx("div", { style: celebrationTitleStyle, children: t('dq.celebration') }), _jsx("div", { style: celebrationLevelStyle, children: t('dq.celebrationLevel', { level: celebration.level, title: celebration.title }) }), _jsx("div", { style: celebrationStatsStyle, children: t('dq.celebrationStats', { days: celebration.days, turns: celebration.turns }) })] }) }))] });
}
// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------
const cardStyle = {
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
};
const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: `1px solid ${TONE.border}`,
};
/** 拖拽中：光标变抓取中，防止误选中文字。 */
const cardDraggingStyle = { cursor: 'grabbing', userSelect: 'none' };
const cardTitleStyle = { fontSize: 14, color: TONE.text, letterSpacing: 0.2 };
const iconButtonStyle = {
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
};
const cardBodyStyle = {
    padding: '12px 14px 14px',
    overflowY: 'auto',
    display: 'block',
};
/** 通用分区卡片：独立背景块 + 边框 + 可折叠头部。 */
const sectionCardStyle = {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 10,
    marginBottom: 12,
    background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 55%, transparent)',
    border: `1px solid ${TONE.border}`,
    overflow: 'hidden',
};
/** 分区标题栏：可点击折叠（折叠/展开样式一致，仅内容区收起）。 */
const sectionCardHeadStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    padding: '7px 10px',
    border: 'none',
    borderBottom: `1px solid ${TONE.border}`,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
};
const sectionCardTitleStyle = {
    fontSize: 11,
    fontWeight: 700,
    // fallback 用深色：浅色主题下即使变量缺失文字也可见。
    color: 'var(--dsw-alias-label-primary, #1a2230)',
    letterSpacing: 0.3,
};
/** 折叠箭头。 */
const sectionCardArrowStyle = {
    fontSize: 10,
    color: TONE.quiet,
    display: 'inline-flex',
    alignItems: 'center',
};
/** 分区内容区。 */
const sectionCardBodyStyle = {
    padding: '8px 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
};
/** 折叠态内容区：完全隐藏（不占空间）。 */
const sectionCardBodyHiddenStyle = {
    display: 'none',
};
const heroStyle = { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 };
const levelBadgeStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
};
const levelNumStyle = { fontSize: 15, fontWeight: 700, color: TONE.text, lineHeight: 1.1 };
const levelSubStyle = { fontSize: 10, color: TONE.muted };
const titleRowStyle = { display: 'flex', alignItems: 'baseline', gap: 8 };
const titleTextStyle = { fontSize: 13, fontWeight: 600, color: TONE.text };
const seasonStyle = { fontSize: 10, color: TONE.quiet };
const xpTrackStyle = {
    height: 7,
    borderRadius: 4,
    // 轨道用中性灰底 + 边框：深浅主题都清晰可见（浅色主题不再是白/浅灰条）。
    background: 'rgba(120, 130, 150, 0.28)',
    border: `1px solid ${TONE.border}`,
    overflow: 'hidden',
    marginTop: 8,
};
const xpFillStyle = {
    height: '100%',
    background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
    borderRadius: 4,
    transition: 'width .4s ease',
};
const xpRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 };
const xpTextStyle = { fontSize: 10, color: TONE.muted };
const metaRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 };
const metaStyle = { fontSize: 10, color: TONE.quiet, background: TONE.row, padding: '2px 6px', borderRadius: 5 };
const comboStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: TONE.gold,
    background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 35%, transparent)',
    padding: '2px 6px',
    borderRadius: 5,
};
const questRowStyle = { display: 'flex', flexDirection: 'column', gap: 4 };
const questTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const questLabelStyle = { fontSize: 11, color: TONE.text };
const questRewardStyle = { fontSize: 10, fontWeight: 600, color: TONE.gold };
const questTrackStyle = { height: 6, borderRadius: 3, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' };
const questFillStyle = {
    height: '100%',
    background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
    borderRadius: 3,
    transition: 'width .4s ease',
};
const questFillDoneStyle = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` };
const wallCountStyle = { color: TONE.quiet, fontWeight: 400 };
const updatedStyle = { fontSize: 10, color: TONE.quiet };
const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 };
const listItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    borderRadius: 8,
    background: TONE.row,
};
const itemNameStyle = { fontSize: 12, color: TONE.text };
const itemEnStyle = { fontSize: 10, color: TONE.quiet, fontStyle: 'normal', marginLeft: 4 };
const itemTimeStyle = { fontSize: 10, color: TONE.quiet };
const linkButtonStyle = { border: 'none', background: 'transparent', color: TONE.muted, cursor: 'pointer', fontSize: 11, padding: '0 4px' };
const tabsStyle = { display: 'flex', gap: 4, flexWrap: 'wrap' };
const tabStyle = {
    border: 'none',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 10,
    color: TONE.muted,
    background: 'transparent',
    cursor: 'pointer',
};
const tabActiveStyle = { background: TONE.row, color: TONE.text };
const wallGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 };
const wallCellStyle = {
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
};
/** 已解锁：绿色高亮底 + 边框，图标全彩。 */
const wallCellUnlockedStyle = {
    background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 12%, transparent)',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 38%, transparent)',
    boxShadow: '0 0 8px rgba(120, 221, 160, 0.12)',
};
/** 未解锁：灰度 + 压暗，一眼可辨。 */
const wallCellLockedStyle = {
    opacity: 0.45,
    filter: 'grayscale(0.85)',
};
/** 隐藏成就未解锁：更深的灰，几乎隐形。 */
const wallCellHiddenLockedStyle = {
    opacity: 0.3,
    filter: 'grayscale(1)',
};
/** 已解锁角标 ✓。 */
const wallCheckStyle = {
    position: 'absolute',
    top: 1,
    right: 3,
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    color: TONE.green,
};
const wallXpStyle = { fontSize: 8, color: TONE.quiet };
const wallXpUnlockedStyle = { color: TONE.gold, fontWeight: 600 };
/** 未解锁成就格子的微型进度条（底部 2px）。 */
const wallProgressTrackStyle = {
    display: 'block',
    width: '80%',
    height: 2,
    borderRadius: 1,
    background: 'rgba(120, 130, 150, 0.35)',
    overflow: 'hidden',
    marginTop: 1,
};
const wallProgressFillStyle = {
    display: 'block',
    height: '100%',
    borderRadius: 1,
    background: TONE.accent,
};
/** 「最近的里程碑」引导条。 */
const milestoneStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 9px',
    borderRadius: 9,
    background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 9%, transparent)',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 22%, transparent)',
    marginBottom: 8,
};
const milestoneIconStyle = { fontSize: 16, lineHeight: 1 };
const milestoneTopStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 };
const milestoneNameStyle = { fontSize: 10, color: TONE.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const milestoneNumStyle = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' };
const milestoneTrackStyle = {
    height: 3,
    borderRadius: 2,
    background: 'rgba(120, 130, 150, 0.28)',
    border: `1px solid ${TONE.border}`,
    overflow: 'hidden',
    marginTop: 3,
};
const milestoneFillStyle = { height: '100%', borderRadius: 2, background: TONE.accent };
/** tooltip 内进度。 */
const tooltipProgressWrapStyle = { marginTop: 7 };
const tooltipProgressTopStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 };
const tooltipProgressLabelStyle = { fontSize: 9, color: TONE.quiet, textTransform: 'uppercase', letterSpacing: 0.3 };
const tooltipProgressNumStyle = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' };
const tooltipProgressTrackStyle = { height: 3, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' };
const tooltipProgressFillStyle = { height: '100%', borderRadius: 2, background: TONE.accent };
/** 每日全清宝箱按钮。 */
const chestButtonStyle = {
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
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
};
const chestClaimedStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 10px',
    marginTop: 6,
    borderRadius: 9,
    background: TONE.row,
    color: TONE.quiet,
    fontSize: 11,
};
// ---- P1/P2 样式 ----
/** 已购称号徽章（称号旁小图标）。 */
const titleBadgeStyle = { fontSize: 13, lineHeight: 1, marginLeft: -2 };
/** 等级持续天数。 */
const levelSinceStyle = { display: 'block', fontSize: 9, color: TONE.quiet, marginTop: 1 };
/** 赛季冲刺条。 */
const sprintRowStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 };
const sprintLabelStyle = { fontSize: 9, color: TONE.quiet, whiteSpace: 'nowrap' };
const sprintTrackStyle = { flex: 1, height: 4, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' };
const sprintFillStyle = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))' };
const sprintDaysStyle = { fontSize: 9, color: TONE.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
/** 商店分区：库存行（保险/重掷）。 */
const shopBarStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingBottom: 2 };
const shopBalanceStyle = { fontSize: 10, color: TONE.gold, fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const shopStockStyle = { fontSize: 9, color: TONE.muted };
const shopGridStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 };
const shopItemStyle = { padding: '7px 9px', borderRadius: 9, background: TONE.row, border: `1px solid ${TONE.border}` };
const shopItemHeadStyle = { display: 'flex', alignItems: 'center', gap: 6 };
const shopItemNameStyle = { flex: 1, fontSize: 11, color: TONE.text, fontWeight: 600 };
const shopItemPriceStyle = { fontSize: 10, color: TONE.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
const shopItemDescStyle = { fontSize: 10, color: TONE.muted, marginTop: 3, lineHeight: 1.4 };
const shopOwnedStyle = { marginTop: 5, fontSize: 10, color: TONE.green };
/** 购买按钮：金色高对比（任何主题下都清晰可点，不再是暗色「黑块」）。 */
const shopBuyButtonStyle = {
    marginTop: 5,
    padding: '4px 12px',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 55%, transparent)',
    borderRadius: 7,
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 92%, white), var(--dsw-alias-state-warn-primary, #f6c652))',
    color: '#2b1d00',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
};
/** 确认态：红色高亮，提示「再点一次才真买」。 */
const shopConfirmButtonStyle = {
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 60%, transparent)',
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 88%, white), var(--dsw-alias-state-error-primary, #ff8592))',
    color: '#3a0609',
};
const shopBuyDisabledStyle = { opacity: 0.4, cursor: 'not-allowed' };
/** 「使用主题」按钮：品牌色描边 + 浅色填充（区别于购买的金色按钮）。 */
const shopThemeUseButtonStyle = {
    border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 55%, transparent)',
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, white), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, white))',
    color: 'var(--dsw-alias-label-primary, #1a2230)',
};
/** 主题皮肤独立分区：皮肤卡片网格。 */
const skinGridStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 };
/** 当前激活的皮肤卡片：品牌色描边高亮。 */
const skinItemActiveStyle = {
    border: '1.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 65%, transparent)',
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
};
/** 皮肤分区标题栏右侧：当前激活皮肤胶囊。 */
const skinHeadActiveStyle = {
    fontSize: 10,
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
};
const rerollButtonStyle = {
    marginTop: 4,
    padding: '5px 10px',
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 8,
    background: TONE.row,
    color: TONE.text,
    fontSize: 10,
    cursor: 'pointer',
};
const shopMsgStyle = (ok) => ({
    fontSize: 10,
    color: ok ? TONE.green : TONE.red,
    marginTop: 2,
});
/** 新手任务链。 */
const tutorialRowStyle = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' };
const tutorialNameStyle = { flex: 1, fontSize: 11, color: TONE.text };
const tutorialXpStyle = { fontSize: 9, color: TONE.gold };
const tutorialTitleStyle = { marginTop: 4, fontSize: 11, color: TONE.gold, fontWeight: 700 };
/** 成长周报。 */
const reportStyle = { marginTop: 4 };
const reportBarsStyle = { display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 };
const reportBarColStyle = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 };
const reportBarWrapStyle = { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const reportBarStyle = { width: '70%', borderRadius: 3, background: 'linear-gradient(180deg, var(--dsw-alias-brand-primary, #8ec5ff), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent))', transition: 'height .3s ease' };
const reportBarDateStyle = { fontSize: 8, color: TONE.quiet, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };
const reportLegendStyle = { marginTop: 4, fontSize: 9, color: TONE.quiet, textAlign: 'center' };
// ---- v0.8.0 样式：庆祝动效 / 活跃日历 / 统计 / 荣誉墙 ----
/** 全屏里程碑庆祝。 */
const celebrationOverlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 40%, rgba(246,198,82,0.22), rgba(10,14,22,0.75) 70%)',
    pointerEvents: 'none',
    animation: 'dshCelebrateFade 4s ease forwards',
};
const celebrationInnerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '28px 44px',
    borderRadius: 18,
    background: 'rgba(23,31,43,0.92)',
    border: '2px solid rgba(246,198,82,0.6)',
    boxShadow: '0 0 60px rgba(246,198,82,0.35)',
};
const celebrationTitleStyle = { fontSize: 20, fontWeight: 800, color: TONE.gold, letterSpacing: 1 };
const celebrationLevelStyle = { fontSize: 16, fontWeight: 600, color: TONE.text };
const celebrationStatsStyle = { fontSize: 12, color: TONE.muted };
/** 活跃日历。 */
const calendarGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3, marginTop: 4 };
const calendarCellStyle = {
    aspectRatio: '1 / 1',
    borderRadius: 3,
    background: TONE.row,
};
function calendarIntensityStyle(intensity) {
    const colors = [
        'var(--dsw-alias-bg-layer-2, #1d2735)',
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)',
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)',
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)',
        'var(--dsw-alias-state-success-primary, #78dda0)',
    ];
    return { background: colors[Math.min(intensity, 4)] ?? colors[0] };
}
/** 活跃日历强度色（与格子一致：1-4 级绿）。 */
function calendarLegendColor(level) {
    const colors = [
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)',
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)',
        'color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)',
        'var(--dsw-alias-state-success-primary, #78dda0)',
    ];
    return colors[Math.min(Math.max(level, 1), 4) - 1];
}
/** 活跃日历图例：少 → 多 4 级绿色块（与日历格子同色）。 */
const calendarLegendStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 6,
};
const calendarLegendLabelStyle = { fontSize: 9, color: TONE.quiet };
const calendarLegendBlockStyle = (level) => ({
    width: 10,
    height: 10,
    borderRadius: 3,
    background: calendarLegendColor(level),
});
/** 统计页。 */
const statsWrapStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const statsRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const statsChipStyle = { fontSize: 10, color: TONE.text, background: TONE.row, padding: '4px 8px', borderRadius: 7 };
const statsSubTitleStyle = { fontSize: 10, fontWeight: 600, color: TONE.muted, marginTop: 2 };
const toolRankStyle = { display: 'flex', flexDirection: 'column', gap: 2 };
const toolRankRowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 6, background: TONE.row };
const toolRankNumStyle = { width: 16, fontSize: 9, color: TONE.quiet, fontWeight: 700 };
const toolRankNameStyle = { flex: 1, fontSize: 10, color: TONE.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const toolRankCountStyle = { fontSize: 10, color: TONE.gold, fontVariantNumeric: 'tabular-nums' };
/** 荣誉墙。 */
const recordRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 5 };
const recordChipStyle = { fontSize: 9, color: TONE.gold, background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 30%, transparent)', padding: '3px 7px', borderRadius: 6 };
/** 下一称号预览行 + 幸运抽奖。 */
const nextTitleRowStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 };
const nextTitleStyle = { fontSize: 10, color: TONE.muted };
const luckyButtonStyle = {
    marginLeft: 'auto',
    padding: '4px 10px',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
    borderRadius: 8,
    background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
    color: TONE.gold,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
};
const luckyMsgStyle = { fontSize: 10, color: TONE.gold, marginTop: 2 };
/** 分类收藏行。 */
const collRowStyle = { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' };
const collNameStyle = { flex: 1, fontSize: 11, color: TONE.text };
const collProgressStyle = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' };
const collRewardStyle = { fontSize: 9, color: TONE.quiet };
// ---- v0.7.0 样式：每周挑战 / 多称号 / 分享 ----
/** 每周挑战。 */
const weeklyWrapStyle = { marginTop: 8, paddingTop: 8, borderTop: `1px solid ${TONE.border}`, display: 'flex', flexDirection: 'column', gap: 5 };
const weeklyHeadStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' };
const weeklyTitleStyle = { fontSize: 10, fontWeight: 600, color: TONE.muted };
const weeklyWeekStyle = { fontSize: 9, color: TONE.quiet };
const weeklyQuestRowStyle = { display: 'flex', flexDirection: 'column', gap: 3 };
const weeklyQuestTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const weeklyQuestLabelStyle = { fontSize: 10, color: TONE.text };
const weeklyQuestRewardStyle = { fontSize: 9, fontWeight: 600, color: TONE.gold };
const weeklyQuestTrackStyle = { height: 4, borderRadius: 2, background: 'rgba(120, 130, 150, 0.28)', border: `1px solid ${TONE.border}`, overflow: 'hidden' };
const weeklyQuestFillStyle = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-brand-primary, #8ec5ff), var(--dsw-alias-state-success-primary, #78dda0))' };
const weeklyBonusButtonStyle = {
    marginTop: 4,
    padding: '6px 10px',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)',
    borderRadius: 8,
    background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)',
    color: TONE.gold,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
};
const weeklyBonusClaimedStyle = { marginTop: 4, fontSize: 10, color: TONE.quiet };
/** 多称号。 */
const titleCurrentRowStyle = { display: 'flex', alignItems: 'center', gap: 8 };
const titleCurrentNameStyle = { flex: 1, fontSize: 12, color: TONE.text, fontWeight: 600 };
/** 称号区标题栏右侧：当前展示称号（折叠时也能看到具体称号）。 */
const titleHeadCurrentStyle = {
    fontSize: 10,
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
};
const shareButtonStyle = {
    padding: '4px 10px',
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 8,
    background: TONE.row,
    color: TONE.text,
    fontSize: 10,
    cursor: 'pointer',
};
const titleListStyle = { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 };
const titleItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    border: `1px solid ${TONE.border}`,
    borderRadius: 8,
    background: TONE.row,
    color: TONE.text,
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'left',
};
const titleItemActiveStyle = {
    borderColor: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)',
    background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)',
};
const titleItemLockedStyle = { opacity: 0.45, cursor: 'not-allowed' };
const titleItemNameStyle = { flex: 1, minWidth: 0 };
const titleItemActiveMarkStyle = { fontSize: 9, color: TONE.gold, fontWeight: 600 };
const titleItemLockedMarkStyle = { fontSize: 9, color: TONE.quiet };
/** 存档管理。 */
const saveBarStyle = { display: 'flex', gap: 6 };
const saveButtonStyle = {
    flex: 1,
    padding: '5px 8px',
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 8,
    background: TONE.row,
    color: TONE.muted,
    fontSize: 10,
    cursor: 'pointer',
    textAlign: 'center',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};
/** 周报回合数标注。 */
const reportBarTurnStyle = { fontSize: 8, color: TONE.quiet, fontVariantNumeric: 'tabular-nums' };
/** 成就悬浮简介卡（fixed 定位，pointer-events none 不挡鼠标）。 */
const tooltipStyle = {
    position: 'fixed',
    width: 220,
    padding: '9px 11px',
    background: TONE.panel,
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 10,
    boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
    zIndex: 1001,
};
const tooltipHeadStyle = { display: 'flex', gap: 8, alignItems: 'center' };
const tooltipNameStyle = { fontSize: 12, fontWeight: 600, color: TONE.text };
const tooltipStatusStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 };
const tooltipXpStyle = { fontSize: 10, fontWeight: 700, color: TONE.gold };
const tooltipDescStyle = { fontSize: 11, color: TONE.muted, marginTop: 6, lineHeight: 1.5 };
const emptyStyle = { fontSize: 11, color: TONE.quiet, padding: '8px 0' };
const toastStackStyle = {
    position: 'fixed',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 1000,
};
const toastStyle = {
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
};
const toastTitleStyle = { fontSize: 10, fontWeight: 700, color: TONE.gold, textTransform: 'uppercase', letterSpacing: 0.4 };
const toastNameStyle = { fontSize: 13, fontWeight: 600, color: TONE.text, marginTop: 2 };
const toastDescStyle = { fontSize: 11, color: TONE.muted, marginTop: 2 };
const toastCloseStyle = {
    border: 'none',
    background: 'transparent',
    color: TONE.quiet,
    cursor: 'pointer',
    fontSize: 15,
    lineHeight: 1,
    marginLeft: 'auto',
    padding: 0,
};
const footerActionStyle = {
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
};
/** 收起态（56px rail）入口按钮：紧凑纯图标，不与其他插件图标抢空间。 */
const railActionStyle = {
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
};
const footerActionActiveStyle = { background: TONE.row, color: TONE.text };
const footerLabelStyle = { fontWeight: 600, fontSize: 12 };
const levelChipStyle = {
    fontSize: 9,
    fontWeight: 700,
    color: TONE.accent,
    background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)',
    border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)',
    padding: '1px 5px',
    borderRadius: 999,
};
