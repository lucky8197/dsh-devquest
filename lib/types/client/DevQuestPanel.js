import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（host 解析「最近活跃会话」的项目目录）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
function formatTime(at) {
    const d = new Date(at);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
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
/** 面板卡片（overlay 内容，可拖拽定位）。sessionId=当前会话 id，面板数据跟随当前会话的项目。 */
export function DevQuestPanelCard(props) {
    const { useStore, actions, t, sessionId } = props;
    const state = useStore(snapshot => snapshot);
    const [wallOpen, setWallOpen] = useState(false);
    const [category, setCategory] = useState('journey');
    const controllerRef = useRef(null);
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
    const onHeaderPointerDown = (e) => {
        if (e.target.closest('button') !== null)
            return; // 按钮不触发拖拽
        const card = cardRef.current;
        if (card === null)
            return;
        const base = pos ?? { left: window.innerWidth - card.offsetWidth - 16, top: 16 };
        dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseLeft: base.left, baseTop: base.top };
        card.setPointerCapture(e.pointerId);
        setDragging(true);
    };
    const onHeaderPointerMove = (e) => {
        const d = dragRef.current;
        if (d === null || e.pointerId !== d.pointerId || cardRef.current === null)
            return;
        const card = cardRef.current;
        const next = clampPanelPos(d.baseLeft + (e.clientX - d.startX), d.baseTop + (e.clientY - d.startY), card.offsetWidth, card.offsetHeight);
        setPos(next);
    };
    const onHeaderPointerUp = (e) => {
        const d = dragRef.current;
        if (d === null || e.pointerId !== d.pointerId)
            return;
        dragRef.current = null;
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
    const onHeaderPointerCancel = (e) => {
        if (dragRef.current === null || e.pointerId !== dragRef.current.pointerId)
            return;
        dragRef.current = null;
        setDragging(false);
    };
    const refresh = useCallback(() => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        actions.setState('loading', null);
        // 显式携带当前会话 id：面板数据跟随用户正在查看的会话所属项目，
        // 避免 host 侧按「最近活跃」解析时选错项目（不同会话的 seq 不可比）。
        const query = sessionId !== undefined && sessionId !== ''
            ? `?session=${encodeURIComponent(sessionId)}`
            : '';
        void fetch(`${STATUS_API}${query}`, { signal: controller.signal }).then(response => {
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
    }, [actions, sessionId]);
    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, POLL_MS);
        return () => {
            clearInterval(timer);
            controllerRef.current?.abort();
        };
    }, [refresh]);
    useEffect(() => {
        if (!state.open)
            return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape')
            actions.setOpen(false); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [state.open, actions]);
    const status = state.status;
    // 位置：拖拽后 left/top；未拖过则默认右上角。
    const positionStyle = pos !== null
        ? { left: pos.left, top: pos.top }
        : { right: 16, top: 16 };
    if (status === null) {
        return _jsxs("section", { ref: cardRef, style: { ...cardStyle, ...positionStyle }, "data-devquest": true, children: [_jsxs("header", { style: { ...cardHeaderStyle, ...(dragging ? cardHeaderDraggingStyle : {}) }, onPointerDown: onHeaderPointerDown, onPointerMove: onHeaderPointerMove, onPointerUp: onHeaderPointerUp, onPointerCancel: onHeaderPointerCancel, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 20 }) }), _jsx("strong", { style: cardTitleStyle, children: "DevQuest" }), _jsx("button", { type: "button", onClick: () => actions.setOpen(false), "aria-label": t('dq.close'), style: iconButtonStyle, children: _jsx(CloseIcon, {}) })] }), _jsx("div", { style: cardBodyStyle, children: _jsx("span", { style: emptyStyle, children: state.state === 'error' ? `${t('dq.error')} · ${state.error ?? ''}` : t('dq.empty') }) })] });
    }
    const unlocked = status.achievements.filter(a => a.unlocked);
    const recent = [...unlocked].sort((a, b) => (b.acquiredAt ?? 0) - (a.acquiredAt ?? 0)).slice(0, 4);
    const wallItems = status.achievements.filter(a => a.category === category);
    const c = status.counters;
    const percent = Math.round(levelPercent(status) * 100);
    return _jsxs("section", { ref: cardRef, style: { ...cardStyle, ...positionStyle }, "data-devquest": true, children: [_jsxs("header", { style: { ...cardHeaderStyle, ...(dragging ? cardHeaderDraggingStyle : {}) }, onPointerDown: onHeaderPointerDown, onPointerMove: onHeaderPointerMove, onPointerUp: onHeaderPointerUp, onPointerCancel: onHeaderPointerCancel, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 20 }) }), _jsx("strong", { style: cardTitleStyle, children: "DevQuest" }), _jsx("button", { type: "button", onClick: () => actions.setOpen(false), "aria-label": t('dq.close'), style: iconButtonStyle, children: _jsx(CloseIcon, {}) })] }), _jsxs("div", { style: cardBodyStyle, children: [_jsxs("div", { style: heroStyle, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(LevelRing, { status: status }), _jsxs("div", { style: levelBadgeStyle, children: [_jsxs("span", { style: levelNumStyle, children: ["Lv.", status.level] }), _jsx("span", { style: levelSubStyle, children: status.title.zh })] })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: titleRowStyle, children: [_jsxs("span", { style: titleTextStyle, children: [status.title.zh, " ", status.title.en] }), _jsx("span", { style: seasonStyle, children: t('dq.season', { season: status.season }) })] }), _jsx("div", { style: xpTrackStyle, children: _jsx("div", { style: { ...xpFillStyle, width: `${percent}%` } }) }), _jsxs("div", { style: xpRowStyle, children: [_jsx("span", { style: xpTextStyle, children: t('dq.xpToNext', { xp: status.xp, next: status.xpToNext }) }), _jsx("button", { type: "button", onClick: refresh, "aria-label": t('dq.refresh'), title: t('dq.refresh'), style: iconButtonStyle, children: _jsx(RefreshIcon, {}) })] }), _jsxs("div", { style: metaRowStyle, children: [_jsx("span", { style: metaStyle, children: t('dq.turns', { n: c.turnsCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.toolCalls', { n: c.toolCalls }) }), _jsx("span", { style: metaStyle, children: t('dq.todos', { n: c.todosCompleted }) }), _jsx("span", { style: metaStyle, children: t('dq.tokens', { n: formatNumber(c.tokensOut) }) }), comboMultiplier(c.consecutiveSuccess) !== null && (_jsxs("span", { style: comboStyle, children: ["\uD83D\uDD25 ", t('dq.combo', { n: c.consecutiveSuccess }), " \u00D7", comboMultiplier(c.consecutiveSuccess)] }))] })] })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: ["\uD83D\uDCC5 ", t('dq.daily')] }), _jsx("span", { style: updatedStyle, children: status.daily?.date ?? '' })] }), (status.daily?.quests ?? []).map(q => {
                                const pct = Math.min(100, Math.round((Math.min(q.progress, q.goal) / Math.max(q.goal, 1)) * 100));
                                return (_jsxs("div", { style: questRowStyle, children: [_jsxs("div", { style: questTopStyle, children: [_jsxs("span", { style: questLabelStyle, children: [q.done ? '✅' : '⬜', " ", q.label.zh] }), _jsxs("span", { style: questRewardStyle, children: ["+", q.reward, " XP"] })] }), _jsx("div", { style: questTrackStyle, children: _jsx("div", { style: { ...questFillStyle, width: `${pct}%`, ...(q.done ? questFillDoneStyle : {}) } }) })] }, q.id));
                            })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsx("span", { style: sectionTitleStyle, children: t('dq.recent') }), _jsxs("span", { style: updatedStyle, children: [t('dq.updated'), " ", updatedLabel(state.refreshedAt)] })] }), recent.length === 0
                                ? _jsx("span", { style: emptyStyle, children: t('dq.empty') })
                                : _jsx("ul", { style: listStyle, children: recent.map(a => (_jsxs("li", { style: listItemStyle, children: [_jsx("span", { style: { fontSize: 15 }, children: a.icon }), _jsx("span", { style: { flex: 1, minWidth: 0 }, children: _jsxs("span", { style: itemNameStyle, children: [a.name.zh, " ", _jsx("em", { style: itemEnStyle, children: a.name.en })] }) }), a.acquiredAt !== undefined && _jsx("span", { style: itemTimeStyle, children: formatTime(a.acquiredAt) })] }, a.id))) })] }), _jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: sectionHeadStyle, children: [_jsxs("span", { style: sectionTitleStyle, children: [t('dq.wall'), " ", _jsx("span", { style: wallCountStyle, children: t('dq.wallCount', { n: unlocked.length, m: status.achievements.length }) })] }), _jsx("button", { type: "button", onClick: () => setWallOpen(v => !v), style: linkButtonStyle, children: wallOpen ? '▾' : '▸' })] }), wallOpen && _jsxs(_Fragment, { children: [_jsx("div", { style: tabsStyle, children: CATEGORY_KEYS.map(key => (_jsx("button", { type: "button", onClick: () => setCategory(key), style: { ...tabStyle, ...(category === key ? tabActiveStyle : {}) }, children: t(`dq.cat.${key}`) }, key))) }), _jsx("div", { style: wallGridStyle, children: wallItems.map(a => {
                                            const locked = !a.unlocked;
                                            const visible = a.unlocked || !a.hidden;
                                            return _jsxs("span", { title: visible ? `${a.name.zh} ${a.name.en} — ${a.description.zh}（+${a.xp} XP）` : '???', style: {
                                                    ...wallCellStyle,
                                                    ...(locked ? wallCellLockedStyle : {}),
                                                    ...(a.hidden && locked ? { filter: 'grayscale(1)', opacity: 0.5 } : {}),
                                                }, children: [_jsx("span", { style: { fontSize: 17 }, children: visible ? a.icon : '🔒' }), !a.hidden && _jsxs("span", { style: wallXpStyle, children: ["+", a.xp] })] }, a.id);
                                        }) })] })] })] })] });
}
// ---------------------------------------------------------------------------
// 成就 toast
// ---------------------------------------------------------------------------
function AchievementToast(props) {
    const { toast, status, actions, t } = props;
    const def = status.achievements.find(a => a.id === toast.achievementId);
    useEffect(() => {
        const timer = setTimeout(() => actions.dismissToast(toast.id), 6000);
        return () => clearTimeout(timer);
    }, [toast.id, actions]);
    if (def === undefined)
        return _jsx(_Fragment, {});
    return _jsxs("div", { style: toastStyle, role: "status", children: [_jsx("div", { style: { fontSize: 18 }, children: def.icon }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: toastTitleStyle, children: t('dq.unlocked') }), _jsxs("div", { style: toastNameStyle, children: [def.name.zh, " ", _jsx("em", { style: itemEnStyle, children: def.name.en })] }), _jsxs("div", { style: toastDescStyle, children: [def.description.zh, " \u00B7 +", def.xp, " XP"] })] }), _jsx("button", { type: "button", onClick: () => actions.dismissToast(toast.id), "aria-label": t('dq.close'), style: toastCloseStyle, children: "\u00D7" })] });
}
// ---------------------------------------------------------------------------
// 入口组件
// ---------------------------------------------------------------------------
/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
export function DevQuestFooterAction(props) {
    const { useStore, actions, t, wide } = props;
    const state = useStore(snapshot => snapshot);
    const level = state.status?.level ?? 1;
    const open = state.open;
    // 收起态：窄 rail 放不下「图标 + Lv 徽章」，改为纯图标按钮 + 右上角小等级角标。
    if (!wide) {
        return _jsx("button", { type: "button", onClick: () => actions.setOpen(!open), title: t('dq.open'), "aria-label": t('dq.open'), "aria-expanded": open, style: {
                ...railActionStyle,
                ...(open ? footerActionActiveStyle : {}),
            }, children: _jsxs("span", { style: { position: 'relative', display: 'inline-flex' }, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 19 }) }), _jsx("span", { style: railBadgeStyle, children: level })] }) });
    }
    return _jsxs("button", { type: "button", onClick: () => actions.setOpen(!open), title: t('dq.open'), "aria-label": t('dq.open'), "aria-expanded": open, style: {
            ...footerActionStyle,
            ...(open ? footerActionActiveStyle : {}),
        }, children: [_jsx("span", { style: { color: TONE.accent, display: 'inline-flex' }, children: _jsx(SwordIcon, { size: 17 }) }), _jsx("span", { style: footerLabelStyle, children: "DevQuest" }), _jsxs("span", { style: levelChipStyle, children: ["Lv.", level] })] });
}
/** shell.overlay：浮动面板 + toast 栈。 */
export function DevQuestOverlay(props) {
    const { useStore, actions, t, useSessions } = props;
    const state = useStore(snapshot => snapshot);
    // 当前会话 id：面板数据跟随用户正在查看的会话所属项目。
    const currentSessionId = useSessions(s => s.current);
    return _jsxs(_Fragment, { children: [state.open && (_jsx(DevQuestPanelCard, { useStore: useStore, actions: actions, t: t, sessionId: currentSessionId })), state.toasts.length > 0 && state.status !== null && (_jsx("div", { style: toastStackStyle, children: state.toasts.map(toast => (_jsx(AchievementToast, { toast: toast, status: state.status, actions: actions, t: t }, toast.id))) }))] });
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
};
const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: `1px solid ${TONE.border}`,
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
};
/** 拖拽中：光标变抓取中，防止误选中文字。 */
const cardHeaderDraggingStyle = { cursor: 'grabbing' };
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
};
const wallCellLockedStyle = { opacity: 0.55 };
const wallXpStyle = { fontSize: 8, color: TONE.quiet };
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
/** 收起态（56px rail）入口按钮：定宽小方块，只放图标。 */
const railActionStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    border: 'none',
    background: 'transparent',
    color: TONE.muted,
    cursor: 'pointer',
    padding: 0,
    borderRadius: 8,
};
/** 收起态等级小角标（绝对定位，不参与布局、不撑宽）。 */
const railBadgeStyle = {
    position: 'absolute',
    top: -4,
    right: -7,
    fontSize: 8,
    fontWeight: 700,
    lineHeight: 1,
    color: TONE.accent,
    background: TONE.panel,
    border: '1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)',
    padding: '1px 3px',
    borderRadius: 999,
    pointerEvents: 'none',
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
