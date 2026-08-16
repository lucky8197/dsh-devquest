window.__ModuleLoader__.load({
	id: "dsh-devquest",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/store.ts
		/**
		* DevQuest 浏览器侧 store：面板开关 + 状态快照 + 成就 toast 队列。
		* 由 apply 创建共享 handle，footer 按钮与 overlay 面板共用。
		*/
		/** 创建 store handle（apply 世界内调用，绝不在模块顶层）。 */
		function createDevQuestStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({
					state: "idle",
					open: false,
					status: null,
					error: null,
					refreshedAt: null,
					toasts: [],
					seen: [],
					seenSettlements: []
				}),
				actions: {
					setState: (draft, state, error) => {
						draft.state = state;
						draft.error = error;
					},
					setOpen: (draft, open) => {
						draft.open = open;
					},
					setStatus: (draft, status) => {
						const unlockedIds = status.achievements.filter((a) => a.unlocked).map((a) => a.id);
						if (!(draft.status === null)) {
							for (const id of unlockedIds) {
								if (draft.seen.includes(id)) continue;
								draft.toasts.push({
									id: `a-${id}-${Date.now()}`,
									kind: "achievement",
									achievementId: id,
									at: Date.now()
								});
							}
							for (const ev of status.settlements ?? []) {
								if (draft.seenSettlements.includes(ev.id)) continue;
								draft.toasts.push({
									id: `s-${ev.id}`,
									kind: "settlement",
									settlement: ev,
									at: Date.now()
								});
							}
						}
						draft.seen = Array.from(/* @__PURE__ */ new Set([...draft.seen, ...unlockedIds]));
						draft.seenSettlements = Array.from(/* @__PURE__ */ new Set([...draft.seenSettlements, ...(status.settlements ?? []).map((e) => e.id)]));
						draft.status = status;
						draft.state = "ready";
						draft.error = null;
						draft.refreshedAt = Date.now();
					},
					dismissToast: (draft, id) => {
						draft.toasts = draft.toasts.filter((t) => t.id !== id);
					}
				}
			});
		}
		//#endregion
		//#region src/engine.ts
		/** 称号（每 5 级一档）。 */
		const TITLES = [
			{
				min: 1,
				zh: "学徒",
				en: "Apprentice"
			},
			{
				min: 5,
				zh: "工匠",
				en: "Artisan"
			},
			{
				min: 10,
				zh: "锻造师",
				en: "Forger"
			},
			{
				min: 15,
				zh: "宗师",
				en: "Master"
			},
			{
				min: 20,
				zh: "传说",
				en: "Legend"
			}
		];
		/** 按等级取称号。 */
		function titleFor(level) {
			let t = TITLES[0];
			for (const cand of TITLES) if (level >= cand.min) t = cand;
			return {
				zh: t.zh,
				en: t.en
			};
		}
		//#endregion
		//#region src/client/DevQuestPanel.tsx
		/**
		* DevQuest 浏览器侧 UI：
		* - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
		* - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
		*
		* 数据源：GET /api/devquest/status（v0.3 起为全局玩家档，与 cwd/session 无关）。
		* 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
		*/
		const STATUS_API = "/api/devquest/status";
		const POLL_MS = 6e4;
		/** DSH 主题 token（浅色/深色自适应）。 */
		const TONE = {
			canvas: "var(--dsw-alias-bg-layer-2, #101722)",
			panel: "var(--dsw-alias-bg-overlay, #171f2b)",
			row: "var(--dsw-alias-bg-layer-2, #1d2735)",
			border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
			borderStrong: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.31))",
			text: "var(--dsw-alias-label-primary, #f2f6fc)",
			muted: "var(--dsw-alias-label-secondary, #9daabd)",
			quiet: "var(--dsw-alias-label-tertiary, #718096)",
			accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
			gold: "var(--dsw-alias-state-warn-primary, #f6c652)",
			green: "var(--dsw-alias-state-success-primary, #78dda0)",
			red: "var(--dsw-alias-state-error-primary, #ff8592)"
		};
		const CATEGORY_KEYS = [
			"journey",
			"crafting",
			"quest",
			"time",
			"legend",
			"egg"
		];
		function SwordIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4 20 14.5 9.5M14.5 9.5 17 7m-2.5 2.5L17 7m-2.5 2.5L18.5 5.5M17 7l1.5-1.5M17 7l2 2-1.5 1.5",
					stroke: "currentColor",
					strokeWidth: "1.7",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m14.5 9.5 2.5 2.5-1.5 1.5L4 20",
					stroke: "currentColor",
					strokeWidth: "1.7",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					opacity: ".55"
				})]
			});
		}
		function RefreshIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "15",
				height: "15",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M20 11a8 8 0 0 0-14.98-3.8M4 5v4h4M4 13a8 8 0 0 0 14.98 3.8M20 19v-4h-4",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function CloseIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "15",
				height: "15",
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m6 6 12 12M18 6 6 18",
					stroke: "currentColor",
					strokeWidth: "2",
					strokeLinecap: "round"
				})
			});
		}
		function levelPercent(status) {
			if (status.xpToNext <= 0) return 0;
			return Math.max(.02, Math.min(1, status.xp / status.xpToNext));
		}
		/** 连击加成档位（与引擎一致）：≥5 ×1.5，≥15 ×2.0，≥30 ×2.5；无加成返回 null。 */
		function comboMultiplier(consecutive) {
			if (consecutive >= 30) return 2.5;
			if (consecutive >= 15) return 2;
			if (consecutive >= 5) return 1.5;
			return null;
		}
		/** 赛季冲刺目标：本赛季输出 tokens 目标（与 season_100k 成就一致）。 */
		const SEASON_GOAL_TOKENS = 1e5;
		/** 由赛季 id（如 2026-S3）计算季度剩余天数（本地时区，含今天）。 */
		function seasonDaysLeft(season) {
			const m = /^(\d{4})-S([1-4])$/.exec(season);
			if (m === null) return 0;
			const year = Number(m[1]);
			const endMonth = Number(m[2]) * 3;
			const end = new Date(year, endMonth, 1, 0, 0, 0, 0);
			const now = /* @__PURE__ */ new Date();
			const ms = end.getTime() - now.getTime();
			return Math.max(0, Math.ceil(ms / 864e5));
		}
		function formatNumber(n) {
			if (n < 1e3) return String(n);
			const v = n / 1e3;
			return `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`;
		}
		function updatedLabel(refreshedAt) {
			if (refreshedAt === null) return "—";
			const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1e3));
			if (seconds < 10) return "now";
			if (seconds < 60) return `${seconds}s`;
			return `${Math.round(seconds / 60)}m`;
		}
		function LevelRing({ status }) {
			const radius = 34;
			const circumference = 2 * Math.PI * radius;
			const progress = levelPercent(status);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "84",
				height: "84",
				viewBox: "0 0 84 84",
				"aria-hidden": "true",
				style: { transform: "rotate(-90deg)" },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "42",
					cy: "42",
					r: radius,
					fill: "none",
					stroke: TONE.border,
					strokeWidth: "5"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "42",
					cy: "42",
					r: radius,
					fill: "none",
					stroke: TONE.accent,
					strokeWidth: "5",
					strokeLinecap: "round",
					strokeDasharray: `${progress * circumference} ${circumference}`
				})]
			});
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
			if (level >= 30) return {
				gradient: "linear-gradient(90deg, #ffd36b, #ff9a3c, #ff6b6b)",
				textShadow: "0 0 14px rgba(255,180,80,0.5)"
			};
			if (level >= 25) return {
				gradient: "linear-gradient(90deg, #78dda0, #8ec5ff)",
				textShadow: "0 0 12px rgba(120,221,160,0.4)"
			};
			if (level >= 20) return {
				color: TONE.gold,
				textShadow: "0 0 12px rgba(246,198,82,0.5)"
			};
			if (level >= 15) return {
				color: "#c5a3ff",
				textShadow: "0 0 10px rgba(197,163,255,0.35)"
			};
			if (level >= 10) return { color: TONE.accent };
			if (level >= 5) return { color: "#d9a066" };
			return { color: TONE.muted };
		}
		/** 称号色调 → CSS 样式（渐变称号用 background-clip: text）。 */
		function titleToneStyle(level) {
			const t = titleTone(level);
			const style = {};
			if (t.gradient !== void 0) {
				style.background = t.gradient;
				style.WebkitBackgroundClip = "text";
				style.WebkitTextFillColor = "transparent";
			} else if (t.color !== void 0) style.color = t.color;
			if (t.textShadow !== void 0) style.textShadow = t.textShadow;
			return style;
		}
		function formatTime(at) {
			const d = new Date(at);
			return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		}
		/** 本地日期 YYYY-MM-DD（导出文件名用）。 */
		function dayKeyLocal() {
			const d = /* @__PURE__ */ new Date();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return `${d.getFullYear()}-${m}-${day}`;
		}
		/** 稀有度 → 主题色（toast 边框 / 成就墙光晕）。 */
		const RARITY_COLOR = {
			common: "var(--dsw-alias-label-tertiary, #718096)",
			rare: "var(--dsw-alias-brand-primary, #8ec5ff)",
			epic: "#c5a3ff",
			legendary: "var(--dsw-alias-state-warn-primary, #f6c652)"
		};
		/** 稀有度 → toast 边框样式。 */
		function rarityToastStyle(rarity) {
			const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
			return {
				border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
				boxShadow: `0 0 14px color-mix(in srgb, ${color} 25%, transparent)`
			};
		}
		/** 稀有度 → 成就墙已解锁格子光晕。 */
		function rarityCellStyle(rarity) {
			const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
			return {
				border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
				boxShadow: `0 0 10px color-mix(in srgb, ${color} 18%, transparent)`
			};
		}
		/** 分类图标（收藏进度行用）。 */
		function categoryIcon(cat) {
			return {
				journey: "🚶",
				crafting: "⚒️",
				quest: "📜",
				time: "⏰",
				legend: "💎",
				egg: "🥚"
			}[cat] ?? "📦";
		}
		const PANEL_POS_KEY = "dsh.devquest.panelPos";
		/** 面板至少保留多少 px 可见（允许大部分拖出屏幕外）。 */
		const MIN_VISIBLE = 60;
		function loadPanelPos() {
			try {
				const raw = localStorage.getItem(PANEL_POS_KEY);
				if (raw === null) return null;
				const parsed = JSON.parse(raw);
				if (typeof parsed.left === "number" && typeof parsed.top === "number") return {
					left: parsed.left,
					top: parsed.top
				};
				return null;
			} catch {
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
				top: Math.min(maxTop, Math.max(minTop, top))
			};
		}
		/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
		function DevQuestPanelCard(props) {
			const { useStore, actions, t, refresh } = props;
			const state = useStore((snapshot) => snapshot);
			const [wallOpen, setWallOpen] = (0, react.useState)(false);
			const [category, setCategory] = (0, react.useState)("journey");
			const [hover, setHover] = (0, react.useState)(null);
			const [claiming, setClaiming] = (0, react.useState)(false);
			const [shopOpen, setShopOpen] = (0, react.useState)(false);
			const [reportOpen, setReportOpen] = (0, react.useState)(false);
			const [buying, setBuying] = (0, react.useState)(null);
			const [confirmBuyId, setConfirmBuyId] = (0, react.useState)(null);
			const [shopMsg, setShopMsg] = (0, react.useState)(null);
			const [rerolling, setRerolling] = (0, react.useState)(false);
			const [luckyMsg, setLuckyMsg] = (0, react.useState)(null);
			const [claimingLucky, setClaimingLucky] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [titlesOpen, setTitlesOpen] = (0, react.useState)(false);
			const [weeklyClaiming, setWeeklyClaiming] = (0, react.useState)(false);
			const [sharing, setSharing] = (0, react.useState)(false);
			const [statsOpen, setStatsOpen] = (0, react.useState)(false);
			const [pos, setPos] = (0, react.useState)(loadPanelPos);
			const [dragging, setDragging] = (0, react.useState)(false);
			const cardRef = (0, react.useRef)(null);
			const dragRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (pos === null || cardRef.current === null) return;
				const card = cardRef.current;
				const clamped = clampPanelPos(pos.left, pos.top, card.offsetWidth, card.offsetHeight);
				if (clamped.left !== pos.left || clamped.top !== pos.top) setPos(clamped);
			}, []);
			/** 拖拽启动阈值（px）：按住移动超过该距离才开始拖——「点住才能拖动」，防误触。 */
			const DRAG_THRESHOLD = 4;
			const onCardPointerDown = (e) => {
				if (e.target.closest("button") !== null) return;
				const card = cardRef.current;
				if (card === null) return;
				const base = pos ?? {
					left: window.innerWidth - card.offsetWidth - 16,
					top: 16
				};
				dragRef.current = {
					pointerId: e.pointerId,
					startX: e.clientX,
					startY: e.clientY,
					baseLeft: base.left,
					baseTop: base.top,
					active: false
				};
			};
			const onCardPointerMove = (e) => {
				const d = dragRef.current;
				if (d === null || e.pointerId !== d.pointerId || cardRef.current === null) return;
				const dx = e.clientX - d.startX;
				const dy = e.clientY - d.startY;
				if (!d.active) {
					if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
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
				if (d === null || e.pointerId !== d.pointerId) return;
				dragRef.current = null;
				if (!d.active) return;
				setDragging(false);
				const card = cardRef.current;
				if (card === null) return;
				const next = clampPanelPos(d.baseLeft + (e.clientX - d.startX), d.baseTop + (e.clientY - d.startY), card.offsetWidth, card.offsetHeight);
				setPos(next);
				try {
					localStorage.setItem(PANEL_POS_KEY, JSON.stringify(next));
				} catch {}
			};
			const onCardPointerCancel = (e) => {
				if (dragRef.current === null || e.pointerId !== dragRef.current.pointerId) return;
				dragRef.current = null;
				setDragging(false);
			};
			(0, react.useEffect)(() => {
				if (!state.open) return void 0;
				const onKeyDown = (event) => {
					if (event.key === "Escape") actions.setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [state.open, actions]);
			/** 领取每日全清宝箱：POST 后刷新本地状态。 */
			const claimChest = (0, react.useCallback)(async () => {
				if (claiming) return;
				setClaiming(true);
				try {
					const data = await (await fetch("/api/devquest/claim-chest", { method: "POST" })).json();
					if (data.ok && data.status !== null && data.status !== void 0) actions.setStatus(data.status);
				} catch {} finally {
					setClaiming(false);
				}
			}, [claiming, actions]);
			/** 购买商店商品：两步确认防误触（第一次点击进确认态，3 秒内再点才真买）。 */
			const buy = (0, react.useCallback)(async (itemId) => {
				if (buying !== null) return;
				if (confirmBuyId !== itemId) {
					setConfirmBuyId(itemId);
					setShopMsg(null);
					window.setTimeout(() => setConfirmBuyId((cur) => cur === itemId ? null : cur), 3e3);
					return;
				}
				setConfirmBuyId(null);
				setBuying(itemId);
				setShopMsg(null);
				try {
					const data = await (await fetch("/api/devquest/shop/buy", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ itemId })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					setShopMsg(data.ok ? {
						ok: true,
						text: t("dq.shopBought")
					} : {
						ok: false,
						text: data.reason === "insufficient-balance" ? t("dq.shopNoBalance") : data.reason ?? ""
					});
				} catch {
					setShopMsg({
						ok: false,
						text: t("dq.error")
					});
				} finally {
					setBuying(null);
				}
			}, [
				buying,
				confirmBuyId,
				actions,
				t
			]);
			/** 使用任务重掷。 */
			const rerollQuests = (0, react.useCallback)(async () => {
				if (rerolling) return;
				setRerolling(true);
				try {
					const data = await (await fetch("/api/devquest/shop/reroll", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
				} catch {} finally {
					setRerolling(false);
				}
			}, [rerolling, actions]);
			/** 每日幸运抽奖。 */
			const claimLuckyDraw = (0, react.useCallback)(async () => {
				if (claimingLucky) return;
				setClaimingLucky(true);
				setLuckyMsg(null);
				try {
					const data = await (await fetch("/api/devquest/lucky", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok && data.reward !== void 0) setLuckyMsg(t("dq.luckyResult", { label: data.reward.label }));
					else if (!data.ok) setLuckyMsg(t("dq.luckyClaimed"));
				} catch {
					setLuckyMsg(t("dq.error"));
				} finally {
					setClaimingLucky(false);
				}
			}, [
				claimingLucky,
				actions,
				t
			]);
			/** 导出存档（下载 JSON）。 */
			const exportSave = (0, react.useCallback)(async () => {
				try {
					const text = await (await fetch("/api/devquest/export")).text();
					const blob = new Blob([text], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `devquest-player-${dayKeyLocal()}.json`;
					a.click();
					URL.revokeObjectURL(url);
					setShopMsg({
						ok: true,
						text: t("dq.exported")
					});
				} catch {
					setShopMsg({
						ok: false,
						text: t("dq.error")
					});
				}
			}, [t]);
			/** 导入存档（覆盖当前）。 */
			const importSave = (0, react.useCallback)(async (file) => {
				if (importing) return;
				setImporting(true);
				try {
					const text = await file.text();
					const data = await (await fetch("/api/devquest/import", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: text
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					setShopMsg(data.ok ? {
						ok: true,
						text: t("dq.imported")
					} : {
						ok: false,
						text: t("dq.importFailed")
					});
				} catch {
					setShopMsg({
						ok: false,
						text: t("dq.importFailed")
					});
				} finally {
					setImporting(false);
				}
			}, [
				importing,
				actions,
				t
			]);
			/** 切换展示称号（titleId 空 = 跟随等级）。 */
			const switchTitle = (0, react.useCallback)(async (titleId) => {
				try {
					const data = await (await fetch("/api/devquest/titles/switch", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ titleId })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
				} catch {}
			}, [actions]);
			/** 领取每周全清奖励。 */
			const claimWeekly = (0, react.useCallback)(async () => {
				if (weeklyClaiming) return;
				setWeeklyClaiming(true);
				try {
					const data = await (await fetch("/api/devquest/weekly-bonus", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
				} catch {} finally {
					setWeeklyClaiming(false);
				}
			}, [weeklyClaiming, actions]);
			/** 生成成就分享卡片（canvas → PNG 下载）。 */
			const shareCard = (0, react.useCallback)(async () => {
				if (sharing || state.status === null) return;
				setSharing(true);
				try {
					const s = state.status;
					const canvas = document.createElement("canvas");
					canvas.width = 640;
					canvas.height = 400;
					const ctx = canvas.getContext("2d");
					if (ctx === null) throw new Error("no-canvas");
					const grad = ctx.createLinearGradient(0, 0, 640, 400);
					grad.addColorStop(0, "#101722");
					grad.addColorStop(1, "#1d2735");
					ctx.fillStyle = grad;
					ctx.fillRect(0, 0, 640, 400);
					ctx.strokeStyle = "rgba(246,198,82,0.5)";
					ctx.lineWidth = 2;
					ctx.strokeRect(12, 12, 616, 376);
					ctx.fillStyle = "#8ec5ff";
					ctx.font = "700 22px \"Segoe UI\", sans-serif";
					ctx.fillText("⚔️ DevQuest", 36, 56);
					ctx.fillStyle = "#f6c652";
					ctx.font = "700 46px \"Segoe UI\", sans-serif";
					ctx.fillText(`Lv.${s.level}`, 36, 130);
					const titleName = s.titles?.current?.name.zh ?? s.title.zh;
					ctx.fillStyle = "#f2f6fc";
					ctx.font = "600 24px \"Segoe UI\", sans-serif";
					ctx.fillText(titleName, 170, 130);
					const pct = levelPercent(s);
					ctx.fillStyle = "#1d2735";
					ctx.fillRect(36, 160, 568, 14);
					ctx.fillStyle = "#8ec5ff";
					ctx.fillRect(36, 160, Math.round(568 * pct), 14);
					ctx.fillStyle = "#9daabd";
					ctx.font = "500 16px \"Segoe UI\", sans-serif";
					ctx.fillText(`${s.xp} / ${s.xpToNext} XP`, 36, 198);
					const c = s.counters;
					ctx.fillStyle = "#9daabd";
					ctx.font = "500 17px \"Segoe UI\", sans-serif";
					ctx.fillText(`回合 ${c.turnsCompleted}   ·   工具 ${c.toolCalls}   ·   待办 ${c.todosCompleted}`, 36, 240);
					ctx.fillText(`赛季 ${s.season} · ${s.seasonXp} XP   ·   成就 ${s.achievements.filter((a) => a.unlocked).length}/44`, 36, 270);
					const unlockedIcons = s.achievements.filter((a) => a.unlocked).slice(0, 12).map((a) => a.icon);
					ctx.font = "26px \"Segoe UI Emoji\", \"Apple Color Emoji\", sans-serif";
					for (let i = 0; i < unlockedIcons.length; i++) ctx.fillText(unlockedIcons[i], 36 + i % 6 * 50, 330 + Math.floor(i / 6) * 40);
					ctx.fillStyle = "#718096";
					ctx.font = "400 13px \"Segoe UI\", sans-serif";
					ctx.fillText("DevQuest — 把开发变成 RPG", 36, 372);
					const a = document.createElement("a");
					a.href = canvas.toDataURL("image/png");
					a.download = `devquest-card-${dayKeyLocal()}.png`;
					a.click();
					setShopMsg({
						ok: true,
						text: t("dq.shareDone")
					});
				} catch {
					setShopMsg({
						ok: false,
						text: t("dq.shareFailed")
					});
				} finally {
					setSharing(false);
				}
			}, [
				sharing,
				state.status,
				t
			]);
			const status = state.status;
			const positionStyle = pos !== null ? {
				left: pos.left,
				top: pos.top
			} : {
				right: 16,
				top: 16
			};
			if (status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: cardRef,
				style: {
					...cardStyle,
					...positionStyle,
					...dragging ? cardDraggingStyle : {}
				},
				"data-devquest": true,
				onPointerDown: onCardPointerDown,
				onPointerMove: onCardPointerMove,
				onPointerUp: onCardPointerUp,
				onPointerCancel: onCardPointerCancel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: cardHeaderStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: TONE.accent,
								display: "inline-flex"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwordIcon, { size: 20 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: cardTitleStyle,
							children: "DevQuest"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => actions.setOpen(false),
							"aria-label": t("dq.close"),
							style: iconButtonStyle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CloseIcon, {})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: cardBodyStyle,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: emptyStyle,
						children: state.state === "error" ? `${t("dq.error")} · ${state.error ?? ""}` : t("dq.empty")
					})
				})]
			});
			const unlocked = status.achievements.filter((a) => a.unlocked);
			const recent = [...unlocked].sort((a, b) => (b.acquiredAt ?? 0) - (a.acquiredAt ?? 0)).slice(0, 4);
			const wallItems = status.achievements.filter((a) => a.category === category);
			const c = status.counters;
			const percent = Math.round(levelPercent(status) * 100);
			const milestone = status.achievements.filter((a) => !a.unlocked && !a.hidden && a.progress !== void 0 && a.progress.goal > 0).map((a) => ({
				a,
				ratio: a.progress.current / a.progress.goal
			})).sort((x, y) => y.ratio - x.ratio)[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: cardRef,
				style: {
					...cardStyle,
					...positionStyle,
					...dragging ? cardDraggingStyle : {}
				},
				"data-devquest": true,
				onPointerDown: onCardPointerDown,
				onPointerMove: onCardPointerMove,
				onPointerUp: onCardPointerUp,
				onPointerCancel: onCardPointerCancel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: cardHeaderStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: TONE.accent,
								display: "inline-flex"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwordIcon, { size: 20 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: cardTitleStyle,
							children: "DevQuest"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => actions.setOpen(false),
							"aria-label": t("dq.close"),
							style: iconButtonStyle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CloseIcon, {})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: cardBodyStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: heroStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { position: "relative" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LevelRing, { status }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: levelBadgeStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: levelNumStyle,
										children: ["Lv.", status.level]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...levelSubStyle,
											...titleToneStyle(status.level)
										},
										children: status.title.zh
									})]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minWidth: 0
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: titleRowStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													...titleTextStyle,
													...titleToneStyle(status.level)
												},
												children: status.title.zh
											}),
											(status.shop?.badges ?? []).map((badgeId) => {
												const item = status.shop?.items.find((i) => i.id === badgeId);
												return item !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: titleBadgeStyle,
													title: item.name.zh,
													children: item.icon
												}, badgeId) : null;
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: seasonStyle,
												children: t("dq.season", { season: status.season })
											})
										]
									}),
									status.levelStartedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: levelSinceStyle,
										children: t("dq.levelSince", { days: Math.max(0, Math.floor((Date.now() - status.levelStartedAt) / 864e5)) })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: sprintRowStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: sprintLabelStyle,
												children: t("dq.seasonSprint")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: sprintTrackStyle,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
													...sprintFillStyle,
													width: `${Math.min(100, Math.round(c.seasonTokensOut / SEASON_GOAL_TOKENS * 100))}%`
												} })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: sprintDaysStyle,
												children: t("dq.seasonDaysLeft", { days: seasonDaysLeft(status.season) })
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: xpTrackStyle,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
											...xpFillStyle,
											width: `${percent}%`
										} })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: xpRowStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: xpTextStyle,
											children: t("dq.xpToNext", {
												xp: status.xp,
												next: status.xpToNext
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: refresh,
											"aria-label": t("dq.refresh"),
											title: t("dq.refresh"),
											style: iconButtonStyle,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshIcon, {})
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: metaRowStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: metaStyle,
												children: t("dq.turns", { n: c.turnsCompleted })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: metaStyle,
												children: t("dq.toolCalls", { n: c.toolCalls })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: metaStyle,
												children: t("dq.todos", { n: c.todosCompleted })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: metaStyle,
												children: t("dq.tokens", { n: formatNumber(c.tokensOut) })
											}),
											comboMultiplier(c.consecutiveSuccess) !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: comboStyle,
												children: [
													"🔥 ",
													t("dq.combo", { n: c.consecutiveSuccess }),
													" ×",
													comboMultiplier(c.consecutiveSuccess)
												]
											})
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: nextTitleRowStyle,
							children: [status.nextTitle !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: nextTitleStyle,
								children: t("dq.nextTitle", {
									name: status.nextTitle.name.zh,
									level: status.nextTitle.level,
									xp: Math.max(0, Math.round(status.nextTitle.xpToNext))
								})
							}), status.lucky !== void 0 && status.lucky.available && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void claimLuckyDraw(),
								disabled: claimingLucky,
								style: luckyButtonStyle,
								children: ["🎁 ", claimingLucky ? "…" : t("dq.luckyDraw")]
							})]
						}),
						luckyMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: luckyMsgStyle,
							children: luckyMsg
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: sectionHeadStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: sectionTitleStyle,
										children: ["📅 ", t("dq.daily")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: updatedStyle,
										children: status.daily?.date ?? ""
									})]
								}),
								(status.daily?.quests ?? []).map((q) => {
									const pct = Math.min(100, Math.round(Math.min(q.progress, q.goal) / Math.max(q.goal, 1) * 100));
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: questRowStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: questTopStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: questLabelStyle,
												children: [
													q.done ? "✅" : "⬜",
													" ",
													q.label.zh
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: questRewardStyle,
												children: [
													"+",
													q.reward,
													" XP"
												]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: questTrackStyle,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
												...questFillStyle,
												width: `${pct}%`,
												...q.done ? questFillDoneStyle : {}
											} })
										})]
									}, q.id);
								}),
								status.dailyChest !== void 0 && (status.dailyChest.ready || status.dailyChest.claimed) && (status.dailyChest.claimed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: chestClaimedStyle,
									children: ["🎁 ", t("dq.chestClaimed")]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => void claimChest(),
									disabled: claiming,
									style: chestButtonStyle,
									children: ["🎁 ", claiming ? t("dq.chestClaiming") : t("dq.chestReady", { xp: 50 })]
								})),
								status.weekly !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: weeklyWrapStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: weeklyHeadStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: weeklyTitleStyle,
												children: ["🗓️ ", t("dq.weekly")]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: weeklyWeekStyle,
												children: t("dq.weeklyWeek", { week: status.weekly.week })
											})]
										}),
										status.weekly.quests.map((q) => {
											const pct = Math.min(100, Math.round(Math.min(q.progress, q.goal) / Math.max(q.goal, 1) * 100));
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: weeklyQuestRowStyle,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: weeklyQuestTopStyle,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: weeklyQuestLabelStyle,
														children: [
															q.done ? "✅" : "⬜",
															" ",
															q.label.zh
														]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: weeklyQuestRewardStyle,
														children: [
															"+",
															q.reward,
															" XP"
														]
													})]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: weeklyQuestTrackStyle,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
														...weeklyQuestFillStyle,
														width: `${pct}%`,
														...q.done ? questFillDoneStyle : {}
													} })
												})]
											}, q.id);
										}),
										status.weekly.bonusReady ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => void claimWeekly(),
											disabled: weeklyClaiming,
											style: weeklyBonusButtonStyle,
											children: ["🎁 ", weeklyClaiming ? "…" : t("dq.weeklyBonus", { xp: 100 })]
										}) : status.weekly.bonusClaimed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: weeklyBonusClaimedStyle,
											children: ["🎁 ", t("dq.weeklyBonusClaimed")]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: shopBarStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: shopBalanceStyle,
											children: t("dq.shopBalance", { balance: status.shop?.balance ?? 0 })
										}),
										(status.shop?.shields ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: shopStockStyle,
											children: t("dq.shopShields", { n: status.shop.shields })
										}),
										(status.shop?.rerolls ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: shopStockStyle,
											children: t("dq.shopRerolls", { n: status.shop.rerolls })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setShopOpen((v) => !v),
											style: linkButtonStyle,
											children: shopOpen ? "▾" : "🛒 " + t("dq.shop")
										})
									]
								}),
								shopOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: shopGridStyle,
									children: [
										status.shop?.items.map((item) => {
											const canAfford = status.shop.balance >= item.price;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: shopItemStyle,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														style: shopItemHeadStyle,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																style: { fontSize: 15 },
																children: item.icon
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																style: shopItemNameStyle,
																children: item.name.zh
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																style: shopItemPriceStyle,
																children: item.price
															})
														]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														style: shopItemDescStyle,
														children: item.description.zh
													}),
													item.owned ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														style: shopOwnedStyle,
														children: t("dq.shopOwned")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => void buy(item.id),
														disabled: buying !== null || !canAfford,
														style: {
															...shopBuyButtonStyle,
															...confirmBuyId === item.id ? shopConfirmButtonStyle : {},
															...!canAfford ? shopBuyDisabledStyle : {}
														},
														children: buying === item.id ? "…" : confirmBuyId === item.id ? `⚠️ ${t("dq.shopConfirm")}` : t("dq.shopBuy")
													})
												]
											}, item.id);
										}),
										shopMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: shopMsgStyle(shopMsg.ok),
											children: shopMsg.text
										}),
										(status.shop?.rerolls ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => void rerollQuests(),
											disabled: rerolling,
											style: rerollButtonStyle,
											children: ["🔀 ", rerolling ? "…" : t("dq.shopReroll")]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: sectionHeadStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: sectionTitleStyle,
										children: ["🎓 ", t("dq.tutorial")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: updatedStyle,
										children: status.tutorial?.done ? "✅" : t("dq.tutorialStepDone", {
											n: status.tutorial?.steps.filter((s) => s.done).length ?? 0,
											m: status.tutorial?.steps.length ?? 5
										})
									})]
								}),
								status.tutorial?.steps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: tutorialRowStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 13,
												opacity: step.done ? 1 : .55
											},
											children: step.done ? "✅" : step.icon
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...tutorialNameStyle,
												...step.done ? {} : { color: TONE.muted }
											},
											children: step.name.zh
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: tutorialXpStyle,
											children: ["+", step.xp]
										})
									]
								}, step.id)),
								status.tutorial?.done === true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: tutorialTitleStyle,
									children: ["🏅 ", t("dq.tutorialTitle", { title: status.tutorial.title.zh })]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: sectionHeadStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: sectionTitleStyle,
										children: ["🏷️ ", t("dq.titles")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setTitlesOpen((v) => !v),
										style: linkButtonStyle,
										children: titlesOpen ? "▾" : "▸"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: titleCurrentRowStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { fontSize: 15 },
											children: status.titles?.current?.icon ?? "🎖️"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: titleCurrentNameStyle,
											children: status.titles?.current !== null ? status.titles?.current?.name.zh : `${t("dq.titleFollowLevel")} · ${status.title.zh}`
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void shareCard(),
											disabled: sharing,
											style: shareButtonStyle,
											children: sharing ? "…" : `📤 ${t("dq.share")}`
										})
									]
								}),
								titlesOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: titleListStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void switchTitle(""),
										style: {
											...titleItemStyle,
											...status.titles?.current === null ? titleItemActiveStyle : {}
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "🎖️" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: titleItemNameStyle,
												children: [
													t("dq.titleFollowLevel"),
													" · ",
													status.title.zh
												]
											}),
											status.titles?.current === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: titleItemActiveMarkStyle,
												children: t("dq.titleActive")
											})
										]
									}), (status.titles?.items ?? []).map((ti) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											if (ti.unlocked) switchTitle(ti.id);
										},
										disabled: !ti.unlocked,
										style: {
											...titleItemStyle,
											...!ti.unlocked ? titleItemLockedStyle : {},
											...status.titles?.current?.id === ti.id ? titleItemActiveStyle : {}
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ti.unlocked ? ti.icon : "🔒" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: titleItemNameStyle,
												children: [
													ti.name.zh,
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
														style: itemEnStyle,
														children: ti.name.en
													})
												]
											}),
											!ti.unlocked && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: titleItemLockedMarkStyle,
												children: t("dq.titleLocked")
											}),
											ti.unlocked && status.titles?.current?.id === ti.id && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: titleItemActiveMarkStyle,
												children: t("dq.titleActive")
											})
										]
									}, ti.id))]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: sectionHeadStyle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: sectionTitleStyle,
									children: ["📚 ", t("dq.collections")]
								})
							}), (status.collections?.items ?? []).map((coll) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: collRowStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 13,
											opacity: coll.completed ? 1 : .6
										},
										children: coll.completed ? "🏅" : categoryIcon(coll.category)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...collNameStyle,
											...coll.completed ? {
												color: TONE.gold,
												fontWeight: 700
											} : {}
										},
										children: t(`dq.cat.${coll.category}`)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: collProgressStyle,
										children: coll.completed ? t("dq.collectionDone") : t("dq.collectionProgress", {
											n: coll.unlocked,
											m: coll.total
										})
									}),
									!coll.completed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: collRewardStyle,
										children: t("dq.collectionReward", { xp: coll.rewardXp })
									})
								]
							}, coll.category))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: saveBarStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void exportSave(),
								style: saveButtonStyle,
								children: ["⬇️ ", t("dq.export")]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: saveButtonStyle,
								children: [importing ? "…" : `⬆️ ${t("dq.import")}`, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "file",
									accept: "application/json,.json",
									style: { display: "none" },
									onChange: (e) => {
										const f = e.target.files?.[0];
										if (f !== void 0) importSave(f);
										e.target.value = "";
									}
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: sectionHeadStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: sectionTitleStyle,
									children: t("dq.recent")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: updatedStyle,
									children: [
										t("dq.updated"),
										" ",
										updatedLabel(state.refreshedAt)
									]
								})]
							}), recent.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: emptyStyle,
								children: t("dq.empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								style: listStyle,
								children: recent.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									style: listItemStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { fontSize: 15 },
											children: a.icon
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												flex: 1,
												minWidth: 0
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: itemNameStyle,
												children: [
													a.name.zh,
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
														style: itemEnStyle,
														children: a.name.en
													})
												]
											})
										}),
										a.acquiredAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: itemTimeStyle,
											children: formatTime(a.acquiredAt)
										})
									]
								}, a.id))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: sectionHeadStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: sectionTitleStyle,
										children: [
											t("dq.wall"),
											" ",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: wallCountStyle,
												children: t("dq.wallCount", {
													n: unlocked.length,
													m: status.achievements.length
												})
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setWallOpen((v) => !v),
										style: linkButtonStyle,
										children: wallOpen ? "▾" : "▸"
									})]
								}),
								milestone !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: milestoneStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: milestoneIconStyle,
										children: milestone.a.icon
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											flex: 1,
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: milestoneTopStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: milestoneNameStyle,
												children: t("dq.nextMilestone", { name: milestone.a.name.zh })
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: milestoneNumStyle,
												children: [
													milestone.a.progress.current,
													"/",
													milestone.a.progress.goal
												]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: milestoneTrackStyle,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
												...milestoneFillStyle,
												width: `${Math.min(100, Math.round(milestone.ratio * 100))}%`
											} })
										})]
									})]
								}),
								wallOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: tabsStyle,
										children: CATEGORY_KEYS.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setCategory(key),
											style: {
												...tabStyle,
												...category === key ? tabActiveStyle : {}
											},
											children: t(`dq.cat.${key}`)
										}, key))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: wallGridStyle,
										children: wallItems.map((a) => {
											const locked = !a.unlocked;
											const visible = a.unlocked || !a.hidden;
											const p = a.progress;
											const revealHint = locked && a.hidden && p !== void 0 && p.goal > 0 && p.current / p.goal >= .5;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												onMouseEnter: (e) => {
													const rect = e.currentTarget.getBoundingClientRect();
													const x = Math.max(8, Math.min(rect.left + rect.width / 2 - 110, window.innerWidth - 228));
													const below = rect.bottom + 8;
													const y = below + 120 > window.innerHeight ? Math.max(8, rect.top - 120) : below;
													setHover({
														a,
														x,
														y
													});
												},
												onMouseLeave: () => setHover(null),
												style: {
													position: "relative",
													...wallCellStyle,
													...locked ? a.hidden && !revealHint ? wallCellHiddenLockedStyle : wallCellLockedStyle : {
														...wallCellUnlockedStyle,
														...rarityCellStyle(a.rarity)
													}
												},
												children: [
													a.unlocked && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: wallCheckStyle,
														children: "✓"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: {
															fontSize: 17,
															lineHeight: 1.2
														},
														children: visible ? a.icon : revealHint ? "❔" : "🔒"
													}),
													!a.hidden && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: {
															...wallXpStyle,
															...a.unlocked ? wallXpUnlockedStyle : {}
														},
														children: ["+", a.xp]
													}),
													locked && p !== void 0 && p.goal > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														style: wallProgressTrackStyle,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
															...wallProgressFillStyle,
															width: `${Math.min(100, Math.round(p.current / p.goal * 100))}%`
														} })
													})
												]
											}, a.id);
										})
									}),
									hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AchievementTooltip, {
										hover,
										t
									})
								] })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: sectionHeadStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: sectionTitleStyle,
									children: ["📈 ", t("dq.report")]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setReportOpen((v) => !v),
									style: linkButtonStyle,
									children: reportOpen ? "▾" : "▸"
								})]
							}), reportOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: reportStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: reportBarsStyle,
									children: (status.history ?? []).slice(-7).map((h) => {
										const max = Math.max(...(status.history ?? []).slice(-7).map((x) => x.xp), 1);
										const pct = Math.max(4, Math.round(h.xp / max * 100));
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: reportBarColStyle,
											title: `${h.date} · ${t("dq.reportXp", { xp: h.xp })} · ${h.turns} 回合`,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: reportBarWrapStyle,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
														...reportBarStyle,
														height: `${pct}%`
													} })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: reportBarTurnStyle,
													children: h.turns > 0 ? h.turns : ""
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: reportBarDateStyle,
													children: h.date.slice(5)
												})
											]
										}, h.date);
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: reportLegendStyle,
									children: t("dq.report7d")
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: sectionHeadStyle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: sectionTitleStyle,
										children: ["🗓️ ", t("dq.calendar")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: updatedStyle,
										children: t("dq.calendarDays")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: calendarGridStyle,
									children: (status.history ?? []).slice(-30).map((h) => {
										const intensity = h.xp > 0 ? Math.min(4, 1 + Math.floor(h.xp / 100)) : 0;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											title: `${h.date} · ${t("dq.reportXp", { xp: h.xp })} · ${h.turns} 回合`,
											style: {
												...calendarCellStyle,
												...calendarIntensityStyle(intensity)
											}
										}, h.date);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: reportLegendStyle,
									children: "少 ▓▓▓▓ 多"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: sectionHeadStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: sectionTitleStyle,
									children: ["📊 ", t("dq.stats")]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setStatsOpen((v) => !v),
									style: linkButtonStyle,
									children: statsOpen ? "▾" : "▸"
								})]
							}), statsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: statsWrapStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: statsRowStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: statsChipStyle,
											children: [
												"🏆 ",
												t("dq.statsBestCombo"),
												": ",
												Math.max(c.consecutiveSuccess, ...(status.records ?? []).map((r) => r.combo))
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: statsChipStyle,
											children: [
												"⬆️ ",
												t("dq.statsBestLevel"),
												": ",
												Math.max(status.level, ...(status.records ?? []).map((r) => r.level))
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: statsSubTitleStyle,
										children: t("dq.statsTopTools")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: toolRankStyle,
										children: Object.entries(c.toolCallsByTool).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tool, n], i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: toolRankRowStyle,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: toolRankNumStyle,
													children: i + 1
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: toolRankNameStyle,
													children: tool
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: toolRankCountStyle,
													children: n
												})
											]
										}, tool))
									}),
									(status.records ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: statsSubTitleStyle,
										children: ["🏛️ ", t("dq.records")]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: recordRowStyle,
										children: (status.records ?? []).map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: recordChipStyle,
											title: t("dq.recordsCombo", { combo: r.combo }),
											children: [
												t("dq.recordsSeason", { season: r.season }),
												" · Lv.",
												r.level
											]
										}, r.season))
									})] })
								]
							})]
						})
					]
				})]
			});
		}
		/** 成就墙悬浮提示：鼠标移到成就格上时显示名称/简介/奖励/解锁状态。 */
		function AchievementTooltip(props) {
			const { hover, t } = props;
			const a = hover.a;
			const visible = a.unlocked || !a.hidden;
			const near = !a.unlocked && a.hidden && a.progress !== void 0 && a.progress.goal > 0 && a.progress.current / a.progress.goal >= .5;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...tooltipStyle,
					left: hover.x,
					top: hover.y
				},
				role: "tooltip",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: tooltipHeadStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 20 },
							children: visible ? a.icon : near ? "❔" : "🔒"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: tooltipNameStyle,
								children: visible ? `${a.name.zh} ${a.name.en}` : "？？？"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: tooltipStatusStyle,
								children: [a.unlocked ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { color: TONE.green },
									children: ["✅ ", t("dq.earned")]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { color: TONE.quiet },
									children: ["🔒 ", t("dq.notEarned")]
								}), !a.hidden && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: tooltipXpStyle,
									children: [
										"+",
										a.xp,
										" XP"
									]
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: tooltipDescStyle,
						children: visible ? a.description.zh : near ? t("dq.hiddenNear") : t("dq.hiddenHint")
					}),
					!a.unlocked && !a.hidden && a.progress !== void 0 && a.progress.goal > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: tooltipProgressWrapStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: tooltipProgressTopStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: tooltipProgressLabelStyle,
								children: t("dq.progress")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: tooltipProgressNumStyle,
								children: [
									a.progress.current,
									"/",
									a.progress.goal
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: tooltipProgressTrackStyle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
								...tooltipProgressFillStyle,
								width: `${Math.min(100, Math.round(a.progress.current / a.progress.goal * 100))}%`
							} })
						})]
					})
				]
			});
		}
		/** 统一 toast 分发：成就解锁 / 回合结算。 */
		function DevQuestToast(props) {
			const { toast, status, actions, t } = props;
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => actions.dismissToast(toast.id), 6e3);
				return () => clearTimeout(timer);
			}, [toast.id, actions]);
			if (toast.kind === "settlement" && toast.settlement !== void 0) {
				const s = toast.settlement;
				const comboText = s.combo !== null ? ` · 🔥 ×${s.combo}` : "";
				const questText = s.questXp > 0 ? ` · 📅 +${s.questXp}` : "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...toastStyle,
						borderColor: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)"
					},
					role: "status",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { fontSize: 18 },
							children: s.leveledUp ? "⬆️" : "⚔️"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...toastTitleStyle,
										color: s.leveledUp ? TONE.gold : TONE.accent
									},
									children: s.leveledUp ? t("dq.levelUp", { level: s.levelAfter }) : t("dq.turnDone")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: toastNameStyle,
									children: [
										"+",
										s.xp,
										" XP",
										comboText,
										questText
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: toastDescStyle,
									children: s.leveledUp ? t("dq.levelUpTo", { title: titleFor(s.levelAfter).zh }) : t("dq.turnStats", { turns: s.turnsDone })
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => actions.dismissToast(toast.id),
							"aria-label": t("dq.close"),
							style: toastCloseStyle,
							children: "×"
						})
					]
				});
			}
			const def = status.achievements.find((a) => a.id === toast.achievementId);
			if (def === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...toastStyle,
					...rarityToastStyle(def.rarity)
				},
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontSize: 18 },
						children: def.icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...toastTitleStyle,
									color: RARITY_COLOR[def.rarity] ?? TONE.gold
								},
								children: [
									t("dq.unlocked"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 9,
											opacity: .8
										},
										children: ["· ", t(`dq.rarity.${def.rarity}`)]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: toastNameStyle,
								children: [
									def.name.zh,
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
										style: itemEnStyle,
										children: def.name.en
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: toastDescStyle,
								children: [
									def.description.zh,
									" · +",
									def.xp,
									" XP"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => actions.dismissToast(toast.id),
						"aria-label": t("dq.close"),
						style: toastCloseStyle,
						children: "×"
					})
				]
			});
		}
		/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
		function DevQuestFooterAction(props) {
			const { useStore, actions, t, wide } = props;
			const state = useStore((snapshot) => snapshot);
			const level = state.status?.level;
			const open = state.open;
			if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => actions.setOpen(!open),
				title: level === void 0 ? t("dq.open") : `${t("dq.open")} · Lv.${level}`,
				"aria-label": t("dq.open"),
				"aria-expanded": open,
				style: {
					...railActionStyle,
					...open ? footerActionActiveStyle : {}
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						color: TONE.accent,
						display: "inline-flex"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwordIcon, { size: 18 })
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => actions.setOpen(!open),
				title: t("dq.open"),
				"aria-label": t("dq.open"),
				"aria-expanded": open,
				style: {
					...footerActionStyle,
					...open ? footerActionActiveStyle : {}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							color: TONE.accent,
							display: "inline-flex"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwordIcon, { size: 17 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: footerLabelStyle,
						children: "DevQuest"
					}),
					level !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: levelChipStyle,
						children: ["Lv.", level]
					})
				]
			});
		}
		/** shell.overlay：浮动面板 + toast 栈。常驻挂载：页面加载即拉取全局状态并 60s 轮询，
		* 保证侧边栏等级与面板数据在打开面板前就已就绪。 */
		function DevQuestOverlay(props) {
			const { useStore, actions, t } = props;
			const state = useStore((snapshot) => snapshot);
			const controllerRef = (0, react.useRef)(null);
			const [celebration, setCelebration] = (0, react.useState)(null);
			const prevLevelRef = (0, react.useRef)(null);
			const refresh = (0, react.useCallback)(() => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				actions.setState("loading", null);
				fetch(STATUS_API, { signal: controller.signal }).then((response) => {
					if (!response.ok) throw new Error(`devquest ${response.status}`);
					return response.json();
				}).then((data) => {
					if (controller.signal.aborted) return;
					if (data.ok && data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					else actions.setState("error", "empty response");
				}, () => {
					if (!controller.signal.aborted) actions.setState("error", "transport error");
				});
			}, [actions]);
			(0, react.useEffect)(() => {
				refresh();
				const timer = setInterval(refresh, POLL_MS);
				return () => {
					clearInterval(timer);
					controllerRef.current?.abort();
				};
			}, [refresh]);
			(0, react.useEffect)(() => {
				const level = state.status?.level;
				if (level === void 0) return;
				const prev = prevLevelRef.current;
				prevLevelRef.current = level;
				if (prev !== null && level > prev && level % 5 === 0 && state.status !== null) {
					const startedAt = state.status.levelStartedAt;
					const days = startedAt !== void 0 ? Math.max(0, Math.floor((Date.now() - startedAt) / 864e5)) : 0;
					setCelebration({
						level,
						title: state.status.title.zh,
						days,
						turns: state.status.counters.turnsCompleted
					});
					window.setTimeout(() => setCelebration(null), 4e3);
				}
			}, [state.status]);
			(0, react.useEffect)(() => {
				if (document.getElementById("dsh-devquest-kf") !== null) return;
				const style = document.createElement("style");
				style.id = "dsh-devquest-kf";
				style.textContent = "@keyframes dshCelebrateFade { 0% { opacity: 0; transform: scale(0.92); } 12% { opacity: 1; transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; } }";
				document.head.appendChild(style);
				return () => {
					document.getElementById("dsh-devquest-kf")?.remove();
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				state.open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DevQuestPanelCard, {
					useStore,
					actions,
					t,
					refresh
				}),
				state.toasts.length > 0 && state.status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: toastStackStyle,
					children: state.toasts.map((toast) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DevQuestToast, {
						toast,
						status: state.status,
						actions,
						t
					}, toast.id))
				}),
				celebration !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: celebrationOverlayStyle,
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: celebrationInnerStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 64,
									lineHeight: 1
								},
								children: "🏆"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: celebrationTitleStyle,
								children: t("dq.celebration")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: celebrationLevelStyle,
								children: t("dq.celebrationLevel", {
									level: celebration.level,
									title: celebration.title
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: celebrationStatsStyle,
								children: t("dq.celebrationStats", {
									days: celebration.days,
									turns: celebration.turns
								})
							})
						]
					})
				})
			] });
		}
		const cardStyle = {
			position: "fixed",
			width: 330,
			maxHeight: "80vh",
			overflow: "hidden",
			display: "flex",
			flexDirection: "column",
			background: TONE.panel,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 14,
			boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
			pointerEvents: "auto",
			zIndex: 999,
			fontFamily: "inherit",
			cursor: "grab",
			touchAction: "none"
		};
		const cardHeaderStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "10px 12px",
			borderBottom: `1px solid ${TONE.border}`
		};
		/** 拖拽中：光标变抓取中，防止误选中文字。 */
		const cardDraggingStyle = {
			cursor: "grabbing",
			userSelect: "none"
		};
		const cardTitleStyle = {
			fontSize: 14,
			color: TONE.text,
			letterSpacing: .2
		};
		const iconButtonStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 24,
			height: 24,
			marginLeft: "auto",
			border: "none",
			borderRadius: 6,
			background: "transparent",
			color: TONE.muted,
			cursor: "pointer",
			padding: 0
		};
		const cardBodyStyle = {
			padding: "12px 14px 14px",
			overflowY: "auto",
			display: "flex",
			flexDirection: "column",
			gap: 14
		};
		const heroStyle = {
			display: "flex",
			gap: 12,
			alignItems: "center"
		};
		const levelBadgeStyle = {
			position: "absolute",
			inset: 0,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			pointerEvents: "none"
		};
		const levelNumStyle = {
			fontSize: 15,
			fontWeight: 700,
			color: TONE.text,
			lineHeight: 1.1
		};
		const levelSubStyle = {
			fontSize: 10,
			color: TONE.muted
		};
		const titleRowStyle = {
			display: "flex",
			alignItems: "baseline",
			gap: 8
		};
		const titleTextStyle = {
			fontSize: 13,
			fontWeight: 600,
			color: TONE.text
		};
		const seasonStyle = {
			fontSize: 10,
			color: TONE.quiet
		};
		const xpTrackStyle = {
			height: 7,
			borderRadius: 4,
			background: TONE.row,
			overflow: "hidden",
			marginTop: 8
		};
		const xpFillStyle = {
			height: "100%",
			background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
			borderRadius: 4,
			transition: "width .4s ease"
		};
		const xpRowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			marginTop: 4
		};
		const xpTextStyle = {
			fontSize: 10,
			color: TONE.muted
		};
		const metaRowStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: "4px 10px",
			marginTop: 6
		};
		const metaStyle = {
			fontSize: 10,
			color: TONE.quiet,
			background: TONE.row,
			padding: "2px 6px",
			borderRadius: 5
		};
		const comboStyle = {
			fontSize: 10,
			fontWeight: 700,
			color: TONE.gold,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 35%, transparent)",
			padding: "2px 6px",
			borderRadius: 5
		};
		const questRowStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 4
		};
		const questTopStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8
		};
		const questLabelStyle = {
			fontSize: 11,
			color: TONE.text
		};
		const questRewardStyle = {
			fontSize: 10,
			fontWeight: 600,
			color: TONE.gold
		};
		const questTrackStyle = {
			height: 6,
			borderRadius: 3,
			background: TONE.row,
			overflow: "hidden"
		};
		const questFillStyle = {
			height: "100%",
			background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
			borderRadius: 3,
			transition: "width .4s ease"
		};
		const questFillDoneStyle = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` };
		const sectionStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		const sectionHeadStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between"
		};
		const sectionTitleStyle = {
			fontSize: 11,
			fontWeight: 600,
			color: TONE.muted,
			textTransform: "uppercase",
			letterSpacing: .4
		};
		const wallCountStyle = {
			color: TONE.quiet,
			fontWeight: 400
		};
		const updatedStyle = {
			fontSize: 10,
			color: TONE.quiet
		};
		const listStyle = {
			listStyle: "none",
			margin: 0,
			padding: 0,
			display: "flex",
			flexDirection: "column",
			gap: 2
		};
		const listItemStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "5px 8px",
			borderRadius: 8,
			background: TONE.row
		};
		const itemNameStyle = {
			fontSize: 12,
			color: TONE.text
		};
		const itemEnStyle = {
			fontSize: 10,
			color: TONE.quiet,
			fontStyle: "normal",
			marginLeft: 4
		};
		const itemTimeStyle = {
			fontSize: 10,
			color: TONE.quiet
		};
		const linkButtonStyle = {
			border: "none",
			background: "transparent",
			color: TONE.muted,
			cursor: "pointer",
			fontSize: 11,
			padding: "0 4px"
		};
		const tabsStyle = {
			display: "flex",
			gap: 4,
			flexWrap: "wrap"
		};
		const tabStyle = {
			border: "none",
			borderRadius: 6,
			padding: "3px 8px",
			fontSize: 10,
			color: TONE.muted,
			background: "transparent",
			cursor: "pointer"
		};
		const tabActiveStyle = {
			background: TONE.row,
			color: TONE.text
		};
		const wallGridStyle = {
			display: "grid",
			gridTemplateColumns: "repeat(7, 1fr)",
			gap: 6
		};
		const wallCellStyle = {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 1,
			padding: "4px 2px",
			borderRadius: 8,
			background: TONE.row,
			cursor: "default",
			border: "1px solid transparent",
			transition: "opacity .15s ease"
		};
		/** 已解锁：绿色高亮底 + 边框，图标全彩。 */
		const wallCellUnlockedStyle = {
			background: "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 12%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 38%, transparent)",
			boxShadow: "0 0 8px rgba(120, 221, 160, 0.12)"
		};
		/** 未解锁：灰度 + 压暗，一眼可辨。 */
		const wallCellLockedStyle = {
			opacity: .45,
			filter: "grayscale(0.85)"
		};
		/** 隐藏成就未解锁：更深的灰，几乎隐形。 */
		const wallCellHiddenLockedStyle = {
			opacity: .3,
			filter: "grayscale(1)"
		};
		/** 已解锁角标 ✓。 */
		const wallCheckStyle = {
			position: "absolute",
			top: 1,
			right: 3,
			fontSize: 9,
			fontWeight: 700,
			lineHeight: 1,
			color: TONE.green
		};
		const wallXpStyle = {
			fontSize: 8,
			color: TONE.quiet
		};
		const wallXpUnlockedStyle = {
			color: TONE.gold,
			fontWeight: 600
		};
		/** 未解锁成就格子的微型进度条（底部 2px）。 */
		const wallProgressTrackStyle = {
			display: "block",
			width: "80%",
			height: 2,
			borderRadius: 1,
			background: "color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)",
			overflow: "hidden",
			marginTop: 1
		};
		const wallProgressFillStyle = {
			display: "block",
			height: "100%",
			borderRadius: 1,
			background: TONE.accent
		};
		/** 「最近的里程碑」引导条。 */
		const milestoneStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 9px",
			borderRadius: 9,
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 9%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 22%, transparent)",
			marginBottom: 8
		};
		const milestoneIconStyle = {
			fontSize: 16,
			lineHeight: 1
		};
		const milestoneTopStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between",
			gap: 8
		};
		const milestoneNameStyle = {
			fontSize: 10,
			color: TONE.text,
			fontWeight: 600,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const milestoneNumStyle = {
			fontSize: 9,
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const milestoneTrackStyle = {
			height: 3,
			borderRadius: 2,
			background: "color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)",
			overflow: "hidden",
			marginTop: 3
		};
		const milestoneFillStyle = {
			height: "100%",
			borderRadius: 2,
			background: TONE.accent
		};
		/** tooltip 内进度。 */
		const tooltipProgressWrapStyle = { marginTop: 7 };
		const tooltipProgressTopStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between",
			marginBottom: 3
		};
		const tooltipProgressLabelStyle = {
			fontSize: 9,
			color: TONE.quiet,
			textTransform: "uppercase",
			letterSpacing: .3
		};
		const tooltipProgressNumStyle = {
			fontSize: 9,
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const tooltipProgressTrackStyle = {
			height: 3,
			borderRadius: 2,
			background: "color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)",
			overflow: "hidden"
		};
		const tooltipProgressFillStyle = {
			height: "100%",
			borderRadius: 2,
			background: TONE.accent
		};
		/** 每日全清宝箱按钮。 */
		const chestButtonStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			width: "100%",
			padding: "7px 10px",
			marginTop: 6,
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)",
			borderRadius: 9,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 12%, transparent)",
			color: TONE.gold,
			fontSize: 11,
			fontWeight: 600,
			cursor: "pointer"
		};
		const chestClaimedStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			padding: "7px 10px",
			marginTop: 6,
			borderRadius: 9,
			background: TONE.row,
			color: TONE.quiet,
			fontSize: 11
		};
		/** 已购称号徽章（称号旁小图标）。 */
		const titleBadgeStyle = {
			fontSize: 13,
			lineHeight: 1,
			marginLeft: -2
		};
		/** 等级持续天数。 */
		const levelSinceStyle = {
			display: "block",
			fontSize: 9,
			color: TONE.quiet,
			marginTop: 1
		};
		/** 赛季冲刺条。 */
		const sprintRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			marginTop: 5
		};
		const sprintLabelStyle = {
			fontSize: 9,
			color: TONE.quiet,
			whiteSpace: "nowrap"
		};
		const sprintTrackStyle = {
			flex: 1,
			height: 3,
			borderRadius: 2,
			background: "color-mix(in srgb, var(--dsw-alias-label-tertiary, #718096) 30%, transparent)",
			overflow: "hidden"
		};
		const sprintFillStyle = {
			height: "100%",
			borderRadius: 2,
			background: "linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))"
		};
		const sprintDaysStyle = {
			fontSize: 9,
			color: TONE.muted,
			whiteSpace: "nowrap",
			fontVariantNumeric: "tabular-nums"
		};
		/** 商店栏（每日任务下方）。 */
		const shopBarStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			marginTop: 8,
			paddingTop: 8,
			borderTop: `1px solid ${TONE.border}`
		};
		const shopBalanceStyle = {
			fontSize: 10,
			color: TONE.gold,
			fontWeight: 600,
			fontVariantNumeric: "tabular-nums"
		};
		const shopStockStyle = {
			fontSize: 9,
			color: TONE.muted
		};
		const shopGridStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			marginTop: 8
		};
		const shopItemStyle = {
			padding: "7px 9px",
			borderRadius: 9,
			background: TONE.row,
			border: `1px solid ${TONE.border}`
		};
		const shopItemHeadStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6
		};
		const shopItemNameStyle = {
			flex: 1,
			fontSize: 11,
			color: TONE.text,
			fontWeight: 600
		};
		const shopItemPriceStyle = {
			fontSize: 10,
			color: TONE.gold,
			fontWeight: 700,
			fontVariantNumeric: "tabular-nums"
		};
		const shopItemDescStyle = {
			fontSize: 10,
			color: TONE.muted,
			marginTop: 3,
			lineHeight: 1.4
		};
		const shopOwnedStyle = {
			marginTop: 5,
			fontSize: 10,
			color: TONE.green
		};
		/** 购买按钮：金色高对比（任何主题下都清晰可点，不再是暗色「黑块」）。 */
		const shopBuyButtonStyle = {
			marginTop: 5,
			padding: "4px 12px",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 55%, transparent)",
			borderRadius: 7,
			background: "linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 92%, white), var(--dsw-alias-state-warn-primary, #f6c652))",
			color: "#2b1d00",
			fontSize: 10,
			fontWeight: 700,
			cursor: "pointer",
			boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
		};
		/** 确认态：红色高亮，提示「再点一次才真买」。 */
		const shopConfirmButtonStyle = {
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 60%, transparent)",
			background: "linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 88%, white), var(--dsw-alias-state-error-primary, #ff8592))",
			color: "#3a0609"
		};
		const shopBuyDisabledStyle = {
			opacity: .4,
			cursor: "not-allowed"
		};
		const rerollButtonStyle = {
			marginTop: 4,
			padding: "5px 10px",
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.text,
			fontSize: 10,
			cursor: "pointer"
		};
		const shopMsgStyle = (ok) => ({
			fontSize: 10,
			color: ok ? TONE.green : TONE.red,
			marginTop: 2
		});
		/** 新手任务链。 */
		const tutorialRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 7,
			padding: "3px 0"
		};
		const tutorialNameStyle = {
			flex: 1,
			fontSize: 11,
			color: TONE.text
		};
		const tutorialXpStyle = {
			fontSize: 9,
			color: TONE.gold
		};
		const tutorialTitleStyle = {
			marginTop: 4,
			fontSize: 11,
			color: TONE.gold,
			fontWeight: 700
		};
		/** 成长周报。 */
		const reportStyle = { marginTop: 4 };
		const reportBarsStyle = {
			display: "flex",
			alignItems: "flex-end",
			gap: 4,
			height: 52
		};
		const reportBarColStyle = {
			flex: 1,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: 2,
			minWidth: 0
		};
		const reportBarWrapStyle = {
			flex: 1,
			width: "100%",
			display: "flex",
			alignItems: "flex-end",
			justifyContent: "center"
		};
		const reportBarStyle = {
			width: "70%",
			borderRadius: 3,
			background: "linear-gradient(180deg, var(--dsw-alias-brand-primary, #8ec5ff), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent))",
			transition: "height .3s ease"
		};
		const reportBarDateStyle = {
			fontSize: 8,
			color: TONE.quiet,
			overflow: "hidden",
			textOverflow: "ellipsis",
			maxWidth: "100%"
		};
		const reportLegendStyle = {
			marginTop: 4,
			fontSize: 9,
			color: TONE.quiet,
			textAlign: "center"
		};
		/** 全屏里程碑庆祝。 */
		const celebrationOverlayStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 2e3,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "radial-gradient(circle at 50% 40%, rgba(246,198,82,0.22), rgba(10,14,22,0.75) 70%)",
			pointerEvents: "none",
			animation: "dshCelebrateFade 4s ease forwards"
		};
		const celebrationInnerStyle = {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: 8,
			padding: "28px 44px",
			borderRadius: 18,
			background: "rgba(23,31,43,0.92)",
			border: "2px solid rgba(246,198,82,0.6)",
			boxShadow: "0 0 60px rgba(246,198,82,0.35)"
		};
		const celebrationTitleStyle = {
			fontSize: 20,
			fontWeight: 800,
			color: TONE.gold,
			letterSpacing: 1
		};
		const celebrationLevelStyle = {
			fontSize: 16,
			fontWeight: 600,
			color: TONE.text
		};
		const celebrationStatsStyle = {
			fontSize: 12,
			color: TONE.muted
		};
		/** 活跃日历。 */
		const calendarGridStyle = {
			display: "grid",
			gridTemplateColumns: "repeat(10, 1fr)",
			gap: 3,
			marginTop: 4
		};
		const calendarCellStyle = {
			aspectRatio: "1 / 1",
			borderRadius: 3,
			background: TONE.row
		};
		function calendarIntensityStyle(intensity) {
			const colors = [
				"var(--dsw-alias-bg-layer-2, #1d2735)",
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)",
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)",
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)",
				"var(--dsw-alias-state-success-primary, #78dda0)"
			];
			return { background: colors[Math.min(intensity, 4)] ?? colors[0] };
		}
		/** 统计页。 */
		const statsWrapStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		const statsRowStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: 6
		};
		const statsChipStyle = {
			fontSize: 10,
			color: TONE.text,
			background: TONE.row,
			padding: "4px 8px",
			borderRadius: 7
		};
		const statsSubTitleStyle = {
			fontSize: 10,
			fontWeight: 600,
			color: TONE.muted,
			marginTop: 2
		};
		const toolRankStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 2
		};
		const toolRankRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "3px 6px",
			borderRadius: 6,
			background: TONE.row
		};
		const toolRankNumStyle = {
			width: 16,
			fontSize: 9,
			color: TONE.quiet,
			fontWeight: 700
		};
		const toolRankNameStyle = {
			flex: 1,
			fontSize: 10,
			color: TONE.text,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const toolRankCountStyle = {
			fontSize: 10,
			color: TONE.gold,
			fontVariantNumeric: "tabular-nums"
		};
		/** 荣誉墙。 */
		const recordRowStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: 5
		};
		const recordChipStyle = {
			fontSize: 9,
			color: TONE.gold,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 30%, transparent)",
			padding: "3px 7px",
			borderRadius: 6
		};
		/** 下一称号预览行 + 幸运抽奖。 */
		const nextTitleRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			flexWrap: "wrap"
		};
		const nextTitleStyle = {
			fontSize: 10,
			color: TONE.muted
		};
		const luckyButtonStyle = {
			marginLeft: "auto",
			padding: "4px 10px",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)",
			borderRadius: 8,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)",
			color: TONE.gold,
			fontSize: 10,
			fontWeight: 600,
			cursor: "pointer"
		};
		const luckyMsgStyle = {
			fontSize: 10,
			color: TONE.gold,
			marginTop: 2
		};
		/** 分类收藏行。 */
		const collRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 7,
			padding: "3px 0"
		};
		const collNameStyle = {
			flex: 1,
			fontSize: 11,
			color: TONE.text
		};
		const collProgressStyle = {
			fontSize: 9,
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const collRewardStyle = {
			fontSize: 9,
			color: TONE.quiet
		};
		/** 每周挑战。 */
		const weeklyWrapStyle = {
			marginTop: 8,
			paddingTop: 8,
			borderTop: `1px solid ${TONE.border}`,
			display: "flex",
			flexDirection: "column",
			gap: 5
		};
		const weeklyHeadStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between"
		};
		const weeklyTitleStyle = {
			fontSize: 10,
			fontWeight: 600,
			color: TONE.muted
		};
		const weeklyWeekStyle = {
			fontSize: 9,
			color: TONE.quiet
		};
		const weeklyQuestRowStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 3
		};
		const weeklyQuestTopStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8
		};
		const weeklyQuestLabelStyle = {
			fontSize: 10,
			color: TONE.text
		};
		const weeklyQuestRewardStyle = {
			fontSize: 9,
			fontWeight: 600,
			color: TONE.gold
		};
		const weeklyQuestTrackStyle = {
			height: 4,
			borderRadius: 2,
			background: TONE.row,
			overflow: "hidden"
		};
		const weeklyQuestFillStyle = {
			height: "100%",
			borderRadius: 2,
			background: "linear-gradient(90deg, var(--dsw-alias-brand-primary, #8ec5ff), var(--dsw-alias-state-success-primary, #78dda0))"
		};
		const weeklyBonusButtonStyle = {
			marginTop: 4,
			padding: "6px 10px",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)",
			borderRadius: 8,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)",
			color: TONE.gold,
			fontSize: 10,
			fontWeight: 600,
			cursor: "pointer"
		};
		const weeklyBonusClaimedStyle = {
			marginTop: 4,
			fontSize: 10,
			color: TONE.quiet
		};
		/** 多称号。 */
		const titleCurrentRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8
		};
		const titleCurrentNameStyle = {
			flex: 1,
			fontSize: 12,
			color: TONE.text,
			fontWeight: 600
		};
		const shareButtonStyle = {
			padding: "4px 10px",
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.text,
			fontSize: 10,
			cursor: "pointer"
		};
		const titleListStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 4,
			marginTop: 6
		};
		const titleItemStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "6px 8px",
			border: `1px solid ${TONE.border}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.text,
			fontSize: 11,
			cursor: "pointer",
			textAlign: "left"
		};
		const titleItemActiveStyle = {
			borderColor: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 45%, transparent)",
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 10%, transparent)"
		};
		const titleItemLockedStyle = {
			opacity: .45,
			cursor: "not-allowed"
		};
		const titleItemNameStyle = {
			flex: 1,
			minWidth: 0
		};
		const titleItemActiveMarkStyle = {
			fontSize: 9,
			color: TONE.gold,
			fontWeight: 600
		};
		const titleItemLockedMarkStyle = {
			fontSize: 9,
			color: TONE.quiet
		};
		/** 存档管理。 */
		const saveBarStyle = {
			display: "flex",
			gap: 6
		};
		const saveButtonStyle = {
			flex: 1,
			padding: "5px 8px",
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.muted,
			fontSize: 10,
			cursor: "pointer",
			textAlign: "center",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center"
		};
		/** 周报回合数标注。 */
		const reportBarTurnStyle = {
			fontSize: 8,
			color: TONE.quiet,
			fontVariantNumeric: "tabular-nums"
		};
		/** 成就悬浮简介卡（fixed 定位，pointer-events none 不挡鼠标）。 */
		const tooltipStyle = {
			position: "fixed",
			width: 220,
			padding: "9px 11px",
			background: TONE.panel,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 10,
			boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
			pointerEvents: "none",
			zIndex: 1001
		};
		const tooltipHeadStyle = {
			display: "flex",
			gap: 8,
			alignItems: "center"
		};
		const tooltipNameStyle = {
			fontSize: 12,
			fontWeight: 600,
			color: TONE.text
		};
		const tooltipStatusStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			marginTop: 2
		};
		const tooltipXpStyle = {
			fontSize: 10,
			fontWeight: 700,
			color: TONE.gold
		};
		const tooltipDescStyle = {
			fontSize: 11,
			color: TONE.muted,
			marginTop: 6,
			lineHeight: 1.5
		};
		const emptyStyle = {
			fontSize: 11,
			color: TONE.quiet,
			padding: "8px 0"
		};
		const toastStackStyle = {
			position: "fixed",
			top: 16,
			right: 16,
			display: "flex",
			flexDirection: "column",
			gap: 8,
			pointerEvents: "none",
			zIndex: 1e3
		};
		const toastStyle = {
			display: "flex",
			gap: 10,
			alignItems: "flex-start",
			width: 300,
			padding: "10px 12px",
			background: TONE.panel,
			border: `1px solid ${TONE.gold}`,
			borderRadius: 10,
			boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
			pointerEvents: "auto"
		};
		const toastTitleStyle = {
			fontSize: 10,
			fontWeight: 700,
			color: TONE.gold,
			textTransform: "uppercase",
			letterSpacing: .4
		};
		const toastNameStyle = {
			fontSize: 13,
			fontWeight: 600,
			color: TONE.text,
			marginTop: 2
		};
		const toastDescStyle = {
			fontSize: 11,
			color: TONE.muted,
			marginTop: 2
		};
		const toastCloseStyle = {
			border: "none",
			background: "transparent",
			color: TONE.quiet,
			cursor: "pointer",
			fontSize: 15,
			lineHeight: 1,
			marginLeft: "auto",
			padding: 0
		};
		const footerActionStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			border: "none",
			background: "transparent",
			color: TONE.muted,
			cursor: "pointer",
			padding: "4px 8px",
			borderRadius: 8,
			fontSize: 12
		};
		/** 收起态（56px rail）入口按钮：紧凑纯图标，不与其他插件图标抢空间。 */
		const railActionStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 28,
			height: 28,
			border: "none",
			background: "transparent",
			color: TONE.muted,
			cursor: "pointer",
			padding: 0,
			borderRadius: 7
		};
		const footerActionActiveStyle = {
			background: TONE.row,
			color: TONE.text
		};
		const footerLabelStyle = {
			fontWeight: 600,
			fontSize: 12
		};
		const levelChipStyle = {
			fontSize: 9,
			fontWeight: 700,
			color: TONE.accent,
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)",
			padding: "1px 5px",
			borderRadius: 999
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* DevQuest locale dictionaries（中英双语）。
		* 面板组件通过框架注入的 `t` seat 读取，key 域即本字典。
		*/
		const NS = "devquest";
		const zh = {
			"dq.open": "DevQuest 进度",
			"dq.level": "Lv.{level}",
			"dq.xpToNext": "{xp} / {next} XP",
			"dq.season": "赛季 {season}",
			"dq.recent": "最近成就",
			"dq.wall": "成就墙",
			"dq.wallCount": "{n}/{m}",
			"dq.refresh": "刷新",
			"dq.loading": "加载中…",
			"dq.error": "加载失败",
			"dq.close": "关闭",
			"dq.empty": "暂无数据，完成一个回合试试",
			"dq.unlocked": "成就解锁！",
			"dq.cat.journey": "旅程",
			"dq.cat.crafting": "锻造",
			"dq.cat.quest": "使命",
			"dq.cat.time": "时光",
			"dq.cat.legend": "传奇",
			"dq.cat.egg": "彩蛋",
			"dq.updated": "更新于",
			"dq.turns": "{n} 回合",
			"dq.toolCalls": "{n} 次工具调用",
			"dq.todos": "{n} 个待办",
			"dq.tokens": "{n} tokens",
			"dq.consecutive": "连击 {n}",
			"dq.combo": "连击 {n}",
			"dq.streak": "活跃 {n} 天",
			"dq.daily": "每日任务",
			"dq.earned": "已解锁",
			"dq.notEarned": "未解锁",
			"dq.hiddenHint": "隐藏成就，解锁后可见",
			"dq.nextMilestone": "最近的里程碑 · {name}",
			"dq.progress": "进度",
			"dq.turnDone": "回合结算",
			"dq.levelUp": "升级！Lv.{level}",
			"dq.levelUpTo": "新称号 · {title}",
			"dq.turnStats": "完成 {turns} 个回合",
			"dq.chestReady": "领取全清宝箱 +{xp} XP",
			"dq.chestClaiming": "领取中…",
			"dq.chestClaimed": "全清宝箱已领取",
			"dq.tutorial": "新手任务",
			"dq.tutorialDone": "已完成全部新手任务",
			"dq.tutorialTitle": "专属称号 · {title}",
			"dq.tutorialStepDone": "{n}/{m} 步",
			"dq.levelSince": "本等级已 {days} 天",
			"dq.seasonSprint": "赛季冲刺",
			"dq.seasonDaysLeft": "剩 {days} 天",
			"dq.seasonGoal": "赛季输出 {tokens} / {goal}",
			"dq.report": "成长周报",
			"dq.report7d": "最近 7 天",
			"dq.reportXp": "{xp} XP",
			"dq.shop": "商店",
			"dq.shopBalance": "赛季货币 {balance}",
			"dq.shopBuy": "购买",
			"dq.shopConfirm": "确认购买？",
			"dq.shopOwned": "已拥有",
			"dq.shopNoBalance": "赛季货币不足",
			"dq.shopBought": "购买成功",
			"dq.shopReroll": "重掷任务",
			"dq.shopShields": "保险 ×{n}",
			"dq.shopRerolls": "重掷 ×{n}",
			"dq.hiddenNear": "接近解锁的隐藏成就",
			"dq.rarity.common": "普通",
			"dq.rarity.rare": "稀有",
			"dq.rarity.epic": "史诗",
			"dq.rarity.legendary": "传说",
			"dq.collections": "分类收藏",
			"dq.collectionDone": "已集齐",
			"dq.collectionProgress": "{n}/{m}",
			"dq.collectionReward": "集齐奖励 +{xp} XP",
			"dq.lucky": "每日幸运",
			"dq.luckyDraw": "🎁 今日幸运抽奖",
			"dq.luckyClaimed": "今日已抽",
			"dq.luckyResult": "抽到：{label}",
			"dq.nextTitle": "距 {name}（Lv.{level}）还差 {xp} XP",
			"dq.export": "导出存档",
			"dq.import": "导入存档",
			"dq.exported": "存档已导出",
			"dq.imported": "存档已导入",
			"dq.importFailed": "导入失败：存档格式无效",
			"dq.weekly": "每周挑战",
			"dq.weeklyWeek": "{week} 周",
			"dq.weeklyBonus": "🎁 领取全清周奖励 +{xp} XP",
			"dq.weeklyBonusClaimed": "全清周奖励已领取",
			"dq.titles": "称号",
			"dq.titleLevel": "等级称号",
			"dq.titleFollowLevel": "跟随等级",
			"dq.titleSwitch": "切换",
			"dq.titleActive": "展示中",
			"dq.titleLocked": "未解锁",
			"dq.share": "分享卡片",
			"dq.shareDone": "卡片已生成并下载",
			"dq.shareFailed": "卡片生成失败",
			"dq.celebration": "🎉 里程碑达成！",
			"dq.celebrationLevel": "升至 Lv.{level} · {title}",
			"dq.celebrationStats": "本等级用时 {days} 天 · {turns} 回合",
			"dq.calendar": "活跃日历",
			"dq.calendarDays": "近 30 天",
			"dq.stats": "统计",
			"dq.statsBestCombo": "历史最高连击",
			"dq.statsBestLevel": "历史最高等级",
			"dq.statsTopTools": "工具使用 TOP5",
			"dq.statsTurns": "回合",
			"dq.statsTimeline": "成就解锁时间线",
			"dq.records": "荣誉墙",
			"dq.recordsSeason": "赛季 {season}",
			"dq.recordsCombo": "连击 {combo}",
			"dq.counters": "计数"
		};
		const en = {
			"dq.open": "DevQuest progress",
			"dq.level": "Lv.{level}",
			"dq.xpToNext": "{xp} / {next} XP",
			"dq.season": "Season {season}",
			"dq.recent": "Recent unlocks",
			"dq.wall": "Achievement wall",
			"dq.wallCount": "{n}/{m}",
			"dq.refresh": "Refresh",
			"dq.loading": "Loading…",
			"dq.error": "Failed to load",
			"dq.close": "Close",
			"dq.empty": "No data yet — finish a turn to start",
			"dq.unlocked": "Achievement unlocked!",
			"dq.cat.journey": "Journey",
			"dq.cat.crafting": "Crafting",
			"dq.cat.quest": "Quest",
			"dq.cat.time": "Time",
			"dq.cat.legend": "Legend",
			"dq.cat.egg": "Eggs",
			"dq.updated": "Updated",
			"dq.turns": "{n} turns",
			"dq.toolCalls": "{n} tool calls",
			"dq.todos": "{n} todos",
			"dq.tokens": "{n} tokens",
			"dq.consecutive": "{n} streak",
			"dq.combo": "Combo {n}",
			"dq.streak": "{n} active days",
			"dq.daily": "Daily quests",
			"dq.earned": "Earned",
			"dq.notEarned": "Locked",
			"dq.hiddenHint": "Hidden — revealed on unlock",
			"dq.nextMilestone": "Next milestone · {name}",
			"dq.progress": "Progress",
			"dq.turnDone": "Turn settled",
			"dq.levelUp": "Level up! Lv.{level}",
			"dq.levelUpTo": "New title · {title}",
			"dq.turnStats": "Finished {turns} turn(s)",
			"dq.chestReady": "Claim daily chest +{xp} XP",
			"dq.chestClaiming": "Claiming…",
			"dq.chestClaimed": "Daily chest claimed",
			"dq.tutorial": "Tutorial",
			"dq.tutorialDone": "Tutorial complete!",
			"dq.tutorialTitle": "Exclusive title · {title}",
			"dq.tutorialStepDone": "{n}/{m} steps",
			"dq.levelSince": "This level for {days}d",
			"dq.seasonSprint": "Season sprint",
			"dq.seasonDaysLeft": "{days}d left",
			"dq.seasonGoal": "Season output {tokens} / {goal}",
			"dq.report": "Growth report",
			"dq.report7d": "Last 7 days",
			"dq.reportXp": "{xp} XP",
			"dq.shop": "Shop",
			"dq.shopBalance": "Season currency {balance}",
			"dq.shopBuy": "Buy",
			"dq.shopConfirm": "Confirm?",
			"dq.shopOwned": "Owned",
			"dq.shopNoBalance": "Not enough season currency",
			"dq.shopBought": "Purchased!",
			"dq.shopReroll": "Reroll quests",
			"dq.shopShields": "Shields ×{n}",
			"dq.shopRerolls": "Rerolls ×{n}",
			"dq.hiddenNear": "Hidden achievement — almost unlocked",
			"dq.rarity.common": "Common",
			"dq.rarity.rare": "Rare",
			"dq.rarity.epic": "Epic",
			"dq.rarity.legendary": "Legendary",
			"dq.collections": "Collections",
			"dq.collectionDone": "Complete",
			"dq.collectionProgress": "{n}/{m}",
			"dq.collectionReward": "Reward +{xp} XP",
			"dq.lucky": "Daily luck",
			"dq.luckyDraw": "🎁 Daily lucky draw",
			"dq.luckyClaimed": "Claimed today",
			"dq.luckyResult": "You got: {label}",
			"dq.nextTitle": "{xp} XP to {name} (Lv.{level})",
			"dq.export": "Export save",
			"dq.import": "Import save",
			"dq.exported": "Save exported",
			"dq.imported": "Save imported",
			"dq.importFailed": "Import failed: invalid save",
			"dq.weekly": "Weekly quests",
			"dq.weeklyWeek": "Week {week}",
			"dq.weeklyBonus": "🎁 Claim weekly bonus +{xp} XP",
			"dq.weeklyBonusClaimed": "Weekly bonus claimed",
			"dq.titles": "Titles",
			"dq.titleLevel": "Level title",
			"dq.titleFollowLevel": "Follow level",
			"dq.titleSwitch": "Switch",
			"dq.titleActive": "Active",
			"dq.titleLocked": "Locked",
			"dq.share": "Share card",
			"dq.shareDone": "Card generated & downloaded",
			"dq.shareFailed": "Failed to generate card",
			"dq.celebration": "🎉 Milestone reached!",
			"dq.celebrationLevel": "Reached Lv.{level} · {title}",
			"dq.celebrationStats": "Took {days}d · {turns} turns",
			"dq.calendar": "Activity calendar",
			"dq.calendarDays": "Last 30 days",
			"dq.stats": "Stats",
			"dq.statsBestCombo": "Best combo",
			"dq.statsBestLevel": "Best level",
			"dq.statsTopTools": "Top 5 tools",
			"dq.statsTurns": "turns",
			"dq.statsTimeline": "Achievement timeline",
			"dq.records": "Hall of fame",
			"dq.recordsSeason": "Season {season}",
			"dq.recordsCombo": "combo {combo}",
			"dq.counters": "Counters"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services. */
		const inject = ["slots", "locale"];
		/**
		* Client 插件体：注册字典、建共享 store、把两个入口装进插槽。
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "devquest: dictionaries");
			const store = createDevQuestStore();
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "devquest",
				order: 10,
				label: () => t("dq.open"),
				store,
				locale: NS
			}, DevQuestFooterAction));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "devquest-panel",
				order: 20,
				store,
				locale: NS
			}, DevQuestOverlay));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map