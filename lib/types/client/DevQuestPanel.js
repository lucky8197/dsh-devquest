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
/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
export function DevQuestPanelCard(props) {
    const { useStore, actions, t, refresh } = props;
    const state = useStore(snapshot => snapshot);
    const [wallOpen, setWallOpen] = useState(false);
    const [category, setCategory] = useState('journey');
    const [hover, setHover] = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [shopOpen, setShopOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [buying, setBuying] = useState(null);
    const [confirmBuyId, setConfirmBuyId] = useState(null);
    const [shopMsg, setShopMsg] = useState(null);
    const [rerolling, setRerolling] = useState(false);
    const [luckyMsg, setLuckyMsg] = useState(null);
    const [claimingLucky, setClaimingLucky] = useState(false);
    const [importing, setImporting] = useState(false);
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
    return _jsxs("section", { ref: cardRef, style: { ...cardStyle, ...positionStyle, ...(dragging ? cardDraggingStyle : {}) }, "data-devquest": true, onPointerDown: onCardPointerDown, onPointerMove: onCardPointerMove, onPointerUp: onCardPointerUp, onPointerCancel: onCardPointerCancel, children: [_jsxs("header", { style: cardHeaderStyle, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 20 }) }), _jsx("strong", { style: cardTitleStyle, children: "DevQuest" }), _jsx("button", { type: "button", onClick: () => actions.setOpen(false), "aria-label": t('dq.close'), style: iconButtonStyle, children: _jsx(CloseIcon, {}) })] }), _jsxs("div", { style: cardBodyStyle, children: [_jsxs("div", { style: heroStyle, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(LevelRing, { status: status }), _jsxs("div", { style: levelBadgeStyle, children: [_jsxs("span", { style: levelNumStyle, children: ["Lv.", status.level] }), _jsx("span", { style: { ...levelSubStyle, ...titleToneStyle(status.level) }, children: status.title.zh })] })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: titleRowStyle, children: [_jsx("span", { style: { ...titleTextStyle, ...titleToneStyle(status.level) }, children: status.title.zh }), (status.shop?.badges ?? []).map(badgeId => {
                                                const item = status.shop?.items.find(i => i.id === badgeId);
                                                return item !== undefined ? _jsx("span", { style: titleBadgeStyle, title: item.name.zh, children: item.icon }, badgeId) : null;
                                            }), _jsx("span", { style: seasonStyle, children: t('dq.season', { season: status.season }) })] }), status.levelStartedAt !== undefined && (_jsx("span", { style: levelSinceStyle, children: t('dq.levelSince', { days: Math.max(0, Math.floor((Date.now() - status.levelStartedAt) / 86_400_000)) }) })), _jsxs("div", { style: sprintRowStyle, children: [_jsx("span", { style: sprintLabelStyle, children: t('dq.seasonSprint') }), _jsx("div", { style: sprintTrackStyle, children: _jsx("div", { style: { ...sprintFillStyle, width: `${Math.min(100, Math.round((c.seasonTokensOut / SEASON_GOAL_TOKENS) * 100))}%` } }) }), _jsx("span", { style: sprintDaysStyle, children: t('dq.seasonDaysLeft', { days: seasonDaysLeft(status.season) }) })] }), _jsx("div", { style: xpTrackStyle, children: _jsx("div", { style: { ...xpFillStyle, width: `${percent}%` } }) }), _jsxs("div", { style: xpRowStyle, children: [_jsx("span", { style: xpTextStyle, children: t('dq.xpToNext', { xp: status.xp, next: status.xpToNext }) }), _jsx("button", { type: "button", onClick: refresh, "aria-label": t('dq.refresh'), title: t('dq.refresh'), style: iconButtonStyle, children: _jsx(RefreshIcon, {}) })] }), _jsxs("div", { style: metaRowStyle, children: [_jsx("span", { style: metaStyle, children: t('dq.turns', { n: c.turnsCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.toolCalls', { n: c.toolCalls }) }), _jsx("span", { style: metaStyle, children: t('dq.todos', { n: c.todosCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.tokens', { n: formatNumber(c.tokensOut) }) }), comboMultiplier(c.consecutiveSuccess) !== null && (_jsxs("span", { style: comboStyle, children: ["\uD83D\uDD25 ", t('dq.combo', { n: c.consecutiveSuccess }), " \u00D7", comboMultiplier(c.consecutiveSuccess)] }))] })] })] }), _jsxs("div", { style: nextTitleRowStyle, children: [status.nextTitle !== null && (_jsx("span", { style: nextTitleStyle, children: t('dq.nextTitle', { name: status.nextTitle.name.zh, level: status.nextTitle.level, xp: Math.max(0, Math.round(status.nextTitle.xpToNext)) }) })), status.lucky !== undefined && status.lucky.available && (_jsxs("button", { type: "button", onClick: () => void claimLuckyDraw(), disabled: claimingLucky, style: luckyButtonStyle, children: ["\uD83C\uDF81 ", claimingLucky ? '…' : t('dq.luckyDraw')] }))] }), luckyMsg !== null && _jsx("div", { style: luckyMsgStyle, children: luckyMsg }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: ["\uD83D\uDCC5 ", t('dq.daily')] }), _jsx("span", { style: updatedStyle, children: status.daily?.date ?? '' })] }), (status.daily?.quests ?? []).map(q => {
                                const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                                return (_jsxs("div", { style: questRowStyle, children: [_jsxs("div", { style: questTopStyle, children: [_jsxs("span", { style: questLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: questRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: questTrackStyle, children: _jsx("div", { style: { ...questFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                            }), status.dailyChest !== undefined && (status.dailyChest.ready || status.dailyChest.claimed) && (status.dailyChest.claimed
                                ? _jsxs("div", { style: chestClaimedStyle, children: ["\uD83C\uDF81 ", t('dq.chestClaimed')] })
                                : _jsxs("button", { type: "button", onClick: () => void claimChest(), disabled: claiming, style: chestButtonStyle, children: ["\uD83C\uDF81 ", claiming ? t('dq.chestClaiming') : t('dq.chestReady', { xp: 50 })] })), _jsxs("div", { style: shopBarStyle, children: [_jsx("span", { style: shopBalanceStyle, children: t('dq.shopBalance', { balance: status.shop?.balance ?? 0 }) }), (status.shop?.shields ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopShields', { n: status.shop.shields }) }), (status.shop?.rerolls ?? 0) > 0 && _jsx("span", { style: shopStockStyle, children: t('dq.shopRerolls', { n: status.shop.rerolls }) }), _jsx("button", { type: "button", onClick: () => setShopOpen(v => !v), style: linkButtonStyle, children: shopOpen ? '▾' : '🛒 ' + t('dq.shop') })] }), shopOpen && (_jsxs("div", { style: shopGridStyle, children: [status.shop?.items.map(item => {
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
                                    }), shopMsg !== null && _jsx("div", { style: shopMsgStyle(shopMsg.ok), children: shopMsg.text }), (status.shop?.rerolls ?? 0) > 0 && (_jsxs("button", { type: "button", onClick: () => void rerollQuests(), disabled: rerolling, style: rerollButtonStyle, children: ["\uD83D\uDD00 ", rerolling ? '…' : t('dq.shopReroll')] }))] }))] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: ["\uD83C\uDF93 ", t('dq.tutorial')] }), _jsx("span", { style: updatedStyle, children: status.tutorial?.done ? '✅' : t('dq.tutorialStepDone', { n: status.tutorial?.steps.filter(s => s.done).length ?? 0, m: status.tutorial?.steps.length ?? 5 }) })] }), status.tutorial?.steps.map(step => (_jsxs("div", { style: tutorialRowStyle, children: [_jsx("span", { style: { fontSize: 13, opacity: step.done ? 1 : 0.55 }, children: step.done ? '✅' : step.icon }), _jsx("span", { style: { ...tutorialNameStyle, ...(step.done ? {} : { color: TONE.muted }) }, children: step.name.zh }), _jsxs("span", { style: tutorialXpStyle, children: ["+", step.xp] })] }, step.id))), status.tutorial?.done === true && (_jsxs("div", { style: tutorialTitleStyle, children: ["\uD83C\uDFC5 ", t('dq.tutorialTitle', { title: status.tutorial.title.zh })] }))] }), _jsxs("div", { style: sectionStyle, children: [_jsx("div", { style: sectionHeadStyle, children: _jsxs("span", { style: sectionTitleStyle, children: ["\uD83D\uDCDA ", t('dq.collections')] }) }), (status.collections?.items ?? []).map(coll => (_jsxs("div", { style: collRowStyle, children: [_jsx("span", { style: { fontSize: 13, opacity: coll.completed ? 1 : 0.6 }, children: coll.completed ? '🏅' : categoryIcon(coll.category) }), _jsx("span", { style: { ...collNameStyle, ...(coll.completed ? { color: TONE.gold, fontWeight: 700 } : {}) }, children: t(`dq.cat.${coll.category}`) }), _jsx("span", { style: collProgressStyle, children: coll.completed ? t('dq.collectionDone') : t('dq.collectionProgress', { n: coll.unlocked, m: coll.total }) }), !coll.completed && _jsx("span", { style: collRewardStyle, children: t('dq.collectionReward', { xp: coll.rewardXp }) })] }, coll.category)))] }), _jsxs("div", { style: saveBarStyle, children: [_jsxs("button", { type: "button", onClick: () => void exportSave(), style: saveButtonStyle, children: ["\u2B07\uFE0F ", t('dq.export')] }), _jsxs("label", { style: saveButtonStyle, children: [importing ? '…' : `⬆️ ${t('dq.import')}`, _jsx("input", { type: "file", accept: "application/json,.json", style: { display: 'none' }, onChange: (e) => {
                                            const f = e.target.files?.[0];
                                            if (f !== undefined)
                                                void importSave(f);
                                            e.target.value = '';
                                        } })] })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsx("span", { style: sectionTitleStyle, children: t('dq.recent') }), _jsxs("span", { style: updatedStyle, children: [t('dq.updated'), " ", updatedLabel(state.refreshedAt)] })] }), recent.length === 0
                                ? _jsx("span", { style: emptyStyle, children: t('dq.empty') })
                                : _jsx("ul", { style: listStyle, children: recent.map(a => (_jsxs("li", { style: listItemStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: a.icon }), _jsx("span", { style: { flex: 1, minWidth: 0 }, children: _jsxs("span", { style: itemNameStyle, children: [a.name.zh, " ", _jsx("em", { style: itemEnStyle, children: a.name.en })] }) }), a.acquiredAt !== undefined && _jsx("span", { style: itemTimeStyle, children: formatTime(a.acquiredAt) })] }, a.id))) })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: [t('dq.wall'), " ", _jsx("span", { style: wallCountStyle, children: t('dq.wallCount', { n: unlocked.length, m: status.achievements.length }) })] }), _jsx("button", { type: "button", onClick: () => setWallOpen(v => !v), style: linkButtonStyle, children: wallOpen ? '▾' : '▸' })] }), milestone !== undefined && (_jsxs("div", { style: milestoneStyle, children: [_jsx("span", { style: milestoneIconStyle, children: milestone.a.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: milestoneTopStyle, children: [_jsx("span", { style: milestoneNameStyle, children: t('dq.nextMilestone', { name: milestone.a.name.zh }) }), _jsxs("span", { style: milestoneNumStyle, children: [milestone.a.progress.current, "/", milestone.a.progress.goal] })] }), _jsx("div", { style: milestoneTrackStyle, children: _jsx("div", { style: { ...milestoneFillStyle, width: `${Math.min(100, Math.round(milestone.ratio * 100))}%` } }) })] })] })), wallOpen && _jsxs(_Fragment, { children: [_jsx("div", { style: tabsStyle, children: CATEGORY_KEYS.map(key => (_jsx("button", { type: "button", onClick: () => setCategory(key), style: { ...tabStyle, ...(category === key ? tabActiveStyle : {}) }, children: t(`dq.cat.${key}`) }, key))) }), _jsx("div", { style: wallGridStyle, children: wallItems.map(a => {
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
                                        }) }), hover !== null && _jsx(AchievementTooltip, { hover: hover, t: t })] })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: ["\uD83D\uDCC8 ", t('dq.report')] }), _jsx("button", { type: "button", onClick: () => setReportOpen(v => !v), style: linkButtonStyle, children: reportOpen ? '▾' : '▸' })] }), reportOpen && (_jsxs("div", { style: reportStyle, children: [_jsx("div", { style: reportBarsStyle, children: (status.history ?? []).slice(-7).map(h => {
                                            const max = Math.max(...(status.history ?? []).slice(-7).map(x => x.xp), 1);
                                            const pct = Math.max(4, Math.round((h.xp / max) * 100));
                                            return (_jsxs("div", { style: reportBarColStyle, title: `${h.date} · ${t('dq.reportXp', { xp: h.xp })} · ${h.turns} 回合`, children: [_jsx("div", { style: reportBarWrapStyle, children: _jsx("div", { style: { ...reportBarStyle, height: `${pct}%` } }) }), _jsx("span", { style: reportBarTurnStyle, children: h.turns > 0 ? h.turns : '' }), _jsx("span", { style: reportBarDateStyle, children: h.date.slice(5) })] }, h.date));
                                        }) }), _jsx("div", { style: reportLegendStyle, children: t('dq.report7d') })] }))] })] })] });
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
    return _jsxs(_Fragment, { children: [state.open && (_jsx(DevQuestPanelCard, { useStore: useStore, actions: actions, t: t, refresh: refresh })), state.toasts.length > 0 && state.status !== null && (_jsx("div", { style: toastStackStyle, children: state.toasts.map(toast => (_jsx(DevQuestToast, { toast: toast, status: state.status, actions: actions, t: t }, toast.id))) }))] });
}
// ---------------------------------------------------------------------------
// 样式
// ---------------------------------------------------------------------------
const cardStyle = {
    position: 'fixed',
    width: 330,
    maxHeight: 'calc(100vh - 32px)',
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
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
};
const heroStyle = { display: 'flex', gap: 12, alignItems: 'center' };
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
    background: TONE.row,
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
const questTrackStyle = { height: 6, borderRadius: 3, background: TONE.row, overflow: 'hidden' };
const questFillStyle = {
    height: '100%',
    background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
    borderRadius: 3,
    transition: 'width .4s ease',
};
const questFillDoneStyle = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const sectionHeadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const sectionTitleStyle = { fontSize: 11, fontWeight: 600, color: TONE.muted, textTransform: 'uppercase', letterSpacing: 0.4 };
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
    background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)',
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
    background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)',
    overflow: 'hidden',
    marginTop: 3,
};
const milestoneFillStyle = { height: '100%', borderRadius: 2, background: TONE.accent };
/** tooltip 内进度。 */
const tooltipProgressWrapStyle = { marginTop: 7 };
const tooltipProgressTopStyle = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 3 };
const tooltipProgressLabelStyle = { fontSize: 9, color: TONE.quiet, textTransform: 'uppercase', letterSpacing: 0.3 };
const tooltipProgressNumStyle = { fontSize: 9, color: TONE.muted, fontVariantNumeric: 'tabular-nums' };
const tooltipProgressTrackStyle = { height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)', overflow: 'hidden' };
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
const sprintTrackStyle = { flex: 1, height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)', overflow: 'hidden' };
const sprintFillStyle = { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))' };
const sprintDaysStyle = { fontSize: 9, color: TONE.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
/** 商店栏（每日任务下方）。 */
const shopBarStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${TONE.border}` };
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
/** 下一称号预览行 + 幸运抽奖。 */
const nextTitleRowStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
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
