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
		//#region src/client/panel/theme.ts
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
		/**
		* 商店主题 id → 调色板（hex）。themeVars 转成 CSS 变量覆写，皮肤卡片用色块预览。
		* 配色在浅色主题下保持可读（背景保持浅色、仅强调色改变）。
		*/
		const SKIN_PALETTES = {
			"theme-ember": {
				brand: "#e07b39",
				warn: "#d97706",
				success: "#d97706",
				overlay: "#fff6ee",
				layer2: "#fff0e2"
			},
			"theme-frost": {
				brand: "#3b9fe0",
				warn: "#4a90c2",
				success: "#3b9fe0",
				overlay: "#f0f7fc",
				layer2: "#e4f1fa"
			},
			"theme-verdant": {
				brand: "#34a85e",
				warn: "#6aa84f",
				success: "#34a85e",
				overlay: "#f1f9f2",
				layer2: "#e2f3e5"
			},
			"theme-sunset": {
				brand: "#e86a4f",
				warn: "#e0a63c",
				success: "#e86a4f",
				overlay: "#fff5f0",
				layer2: "#ffece2"
			},
			"theme-ocean": {
				brand: "#1f9e8f",
				warn: "#2f8fb3",
				success: "#1f9e8f",
				overlay: "#f1faf8",
				layer2: "#e2f3ef"
			},
			"theme-sakura": {
				brand: "#e2637f",
				warn: "#d98aa0",
				success: "#e2637f",
				overlay: "#fef5f7",
				layer2: "#fdeaf0"
			},
			"theme-royal": {
				brand: "#8a5cf0",
				warn: "#a06cd5",
				success: "#8a5cf0",
				overlay: "#f7f4fd",
				layer2: "#eee7fb"
			},
			"theme-gold": {
				brand: "#c9a227",
				warn: "#b8860b",
				success: "#c9a227",
				overlay: "#fdfaf1",
				layer2: "#f8f1de"
			},
			"theme-peach": {
				brand: "#f08a6b",
				warn: "#e88a7a",
				success: "#f08a6b",
				overlay: "#fef7f3",
				layer2: "#fdeee6"
			},
			"theme-neon": {
				brand: "#6b5cf0",
				warn: "#b05ce0",
				success: "#6b5cf0",
				overlay: "#f6f4fe",
				layer2: "#ece8fc"
			}
		};
		/**
		* 商店主题 id → 面板 CSS 变量覆写。
		* 在面板根元素上覆写 --dsw-alias-*，TONE 与所有引用这些变量的子元素自动跟随。
		*/
		function themeVars(themeId) {
			const p = SKIN_PALETTES[themeId];
			if (p === void 0) return {};
			return {
				"--dsw-alias-brand-primary": p.brand,
				"--dsw-alias-state-warn-primary": p.warn,
				"--dsw-alias-state-success-primary": p.success,
				"--dsw-alias-bg-overlay": p.overlay,
				"--dsw-alias-bg-layer-2": p.layer2
			};
		}
		const CATEGORY_KEYS = [
			"journey",
			"crafting",
			"quest",
			"time",
			"legend",
			"egg"
		];
		//#endregion
		//#region src/client/panel/icons.tsx
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
		//#endregion
		//#region src/client/panel/util.ts
		const STATUS_API = "/api/devquest/status";
		const POLL_MS = 6e4;
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
		/** 数值格式化：<1k 原样；<1M 用 k；<1T 用 M；更大用 T。 */
		function formatNumber(n) {
			if (n < 1e3) return String(n);
			if (n < 1e6) {
				const v = n / 1e3;
				return `${v >= 100 ? Math.round(v) : v.toFixed(1)}k`;
			}
			if (n < 1e9) {
				const v = n / 1e6;
				return `${v >= 100 ? Math.round(v) : v.toFixed(1)}M`;
			}
			const v = n / 1e9;
			return `${v >= 100 ? Math.round(v) : v.toFixed(1)}T`;
		}
		/** v1.2.3：从后端 JSON 响应提取错误文本；成功或无错误返回 null。 */
		function apiErrorOf(data) {
			if (data === null || data.ok === true) return null;
			return data.error !== void 0 && data.error !== "" ? data.error : null;
		}
		/**
		* v1.3.0 音效：用 WebAudio 合成短提示音（无外部资源）。
		* kind: 'goal' 成功上升音 / 'boss' 低沉胜利音 / 'levelup' 明亮琶音 / 'achievement' 清脆叮咚。
		*/
		function playSfx(kind) {
			try {
				if (typeof AudioContext === "undefined") return;
				const ctx = new AudioContext();
				const notes = kind === "goal" ? [
					{
						f: 523.25,
						t: 0,
						d: .12
					},
					{
						f: 659.25,
						t: .12,
						d: .12
					},
					{
						f: 783.99,
						t: .24,
						d: .2
					}
				] : kind === "boss" ? [
					{
						f: 220,
						t: 0,
						d: .25
					},
					{
						f: 277.18,
						t: .2,
						d: .3
					},
					{
						f: 329.63,
						t: .45,
						d: .4
					}
				] : kind === "levelup" ? [
					{
						f: 392,
						t: 0,
						d: .1
					},
					{
						f: 523.25,
						t: .1,
						d: .1
					},
					{
						f: 659.25,
						t: .2,
						d: .1
					},
					{
						f: 783.99,
						t: .3,
						d: .25
					}
				] : [{
					f: 880,
					t: 0,
					d: .08
				}, {
					f: 1174.66,
					t: .09,
					d: .14
				}];
				for (const n of notes) {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "sine";
					osc.frequency.value = n.f;
					gain.gain.setValueAtTime(1e-4, ctx.currentTime + n.t);
					gain.gain.exponentialRampToValueAtTime(.12, ctx.currentTime + n.t + .02);
					gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + n.t + n.d);
					osc.connect(gain).connect(ctx.destination);
					osc.start(ctx.currentTime + n.t);
					osc.stop(ctx.currentTime + n.t + n.d + .02);
				}
				window.setTimeout(() => void ctx.close().catch(() => {}), 1500);
			} catch {}
		}
		function updatedLabel(refreshedAt) {
			if (refreshedAt === null) return "—";
			const seconds = Math.max(0, Math.round((Date.now() - refreshedAt) / 1e3));
			if (seconds < 10) return "now";
			if (seconds < 60) return `${seconds}s`;
			return `${Math.round(seconds / 60)}m`;
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
		const PANEL_COLLAPSED_KEY = "dsh.devquest.collapsed";
		/** v1.1 未完成任务提醒：每日去重 key（记录已提醒的日期）。 */
		const REMINDER_KEY = "dsh.devquest.questReminder";
		/** 读取已保存的分区折叠状态（section id → true=折叠）。损坏/不存在时返回空（全部展开）。 */
		function loadCollapsed() {
			try {
				const raw = localStorage.getItem(PANEL_COLLAPSED_KEY);
				if (raw === null) return {};
				const parsed = JSON.parse(raw);
				const out = {};
				for (const [id, v] of Object.entries(parsed)) if (v === true) out[id] = true;
				return out;
			} catch {
				return {};
			}
		}
		/** 保存分区折叠状态。 */
		function saveCollapsed(collapsed) {
			try {
				localStorage.setItem(PANEL_COLLAPSED_KEY, JSON.stringify(collapsed));
			} catch {}
		}
		const PANEL_SETTINGS_KEY = "dsh.devquest.settings";
		const DEFAULT_SETTINGS = {
			fontSize: 1,
			compact: false,
			toastFilter: "all",
			sound: true,
			notify: true
		};
		/**
		* host 侧 UI 设置缓存（权威）：启动时 fetchUiSettings() 拉取 ~/.dsh/devquest/settings.json，
		* 此后 loadSettings() 优先读缓存；localStorage 仅作启动快照与旧数据迁移。
		* 修复：重启 DSH 后设置不再因浏览器存储失效而丢失。
		*/
		let uiSettingsCache = null;
		/** 从 localStorage 读取并校验（无/损坏 → 默认）。 */
		function loadSettingsLocal() {
			try {
				const raw = localStorage.getItem(PANEL_SETTINGS_KEY);
				if (raw === null) return { ...DEFAULT_SETTINGS };
				const p = JSON.parse(raw);
				return {
					fontSize: typeof p.fontSize === "number" && p.fontSize >= .85 && p.fontSize <= 1.2 ? p.fontSize : DEFAULT_SETTINGS.fontSize,
					compact: p.compact === true,
					toastFilter: p.toastFilter === "rare" || p.toastFilter === "off" ? p.toastFilter : "all",
					sound: p.sound !== false,
					notify: p.notify !== false
				};
			} catch {
				return { ...DEFAULT_SETTINGS };
			}
		}
		/** 上报 host（fire-and-forget；失败静默，本地状态不受影响）。 */
		async function postUiSettings(s) {
			await fetch("/api/devquest/ui-settings", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(s)
			});
		}
		/**
		* 拉取 host 侧设置并更新缓存（页面加载时调用一次）。
		* host 尚无设置时：若浏览器里留有旧值则上报完成一次性迁移，否则用默认。
		*/
		async function fetchUiSettings() {
			try {
				const data = await (await fetch("/api/devquest/ui-settings")).json();
				if (data.ok !== true) return;
				if (data.settings !== null) {
					uiSettingsCache = data.settings;
					window.dispatchEvent(new CustomEvent("devquest:ui-settings"));
					return;
				}
				const local = loadSettingsLocal();
				if (localStorage.getItem("dsh.devquest.settings") !== null) try {
					await postUiSettings(local);
				} catch {}
				uiSettingsCache = local;
				window.dispatchEvent(new CustomEvent("devquest:ui-settings"));
			} catch {
				uiSettingsCache = loadSettingsLocal();
			}
		}
		function loadSettings() {
			return uiSettingsCache ?? loadSettingsLocal();
		}
		function saveSettings(s) {
			uiSettingsCache = s;
			try {
				localStorage.setItem(PANEL_SETTINGS_KEY, JSON.stringify(s));
			} catch {}
			postUiSettings(s).catch(() => void 0);
		}
		/** 稀有度权重（toast 过滤用）。 */
		const RARITY_WEIGHT = {
			common: 0,
			rare: 1,
			epic: 2,
			legendary: 3
		};
		/** 稀有度 → 权重。 */
		function rarityWeight(r) {
			return RARITY_WEIGHT[r] ?? 0;
		}
		/** 限制面板位置：四周至少保留 MIN_VISIBLE 可见，拖不丢。 */
		function clampPanelPos(left, top, width, height) {
			const minLeft = Math.min(60 - width, 0);
			const minTop = Math.min(60 - height, 0);
			const maxLeft = Math.max(60, window.innerWidth - 60);
			const maxTop = Math.max(60, window.innerHeight - 60);
			return {
				left: Math.min(maxLeft, Math.max(minLeft, left)),
				top: Math.min(maxTop, Math.max(minTop, top))
			};
		}
		//#endregion
		//#region src/client/panel/styles.ts
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
			fontSize: "calc(14px * var(--dq-fsz, 1))",
			color: TONE.text,
			letterSpacing: .2
		};
		/** 面板头部版本号：小号弱化标签（提示当前加载的插件版本）。 */
		const versionLabelStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			lineHeight: 1,
			color: TONE.quiet,
			border: `1px solid ${TONE.border}`,
			borderRadius: 99,
			padding: "2px 5px",
			whiteSpace: "nowrap"
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
			padding: "var(--dq-body-pad, 12px 14px 14px)",
			overflowY: "auto",
			display: "block"
		};
		/** 通用分区卡片：独立背景块 + 边框 + 可折叠头部。 */
		const sectionCardStyle = {
			display: "flex",
			flexDirection: "column",
			borderRadius: 10,
			marginBottom: "var(--dq-section-mb, 12px)",
			background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 55%, transparent)",
			border: `1px solid ${TONE.border}`,
			overflow: "hidden"
		};
		/** 分区标题栏：可点击折叠（折叠/展开样式一致，仅内容区收起）。 */
		const sectionCardHeadStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			width: "100%",
			padding: "var(--dq-head-pad, 7px 10px)",
			border: "none",
			borderBottom: `1px solid ${TONE.border}`,
			background: "transparent",
			color: "inherit",
			cursor: "pointer",
			textAlign: "left"
		};
		const sectionCardTitleStyle = {
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			letterSpacing: .3
		};
		/** 折叠箭头。 */
		const sectionCardArrowStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			display: "inline-flex",
			alignItems: "center"
		};
		/** 分区内容区。 */
		const sectionCardBodyStyle = {
			padding: "8px 10px 10px",
			display: "flex",
			flexDirection: "column",
			gap: 6,
			flexShrink: 0
		};
		/** 折叠态内容区：完全隐藏（不占空间）。 */
		const sectionCardBodyHiddenStyle = { display: "none" };
		const heroStyle = {
			display: "flex",
			gap: 12,
			alignItems: "center",
			marginBottom: "var(--dq-hero-mb, 12px)"
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
			fontSize: "calc(15px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.text,
			lineHeight: 1.1
		};
		const levelSubStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.muted
		};
		const titleRowStyle = {
			display: "flex",
			alignItems: "baseline",
			gap: 8
		};
		const titleTextStyle = {
			fontSize: "calc(13px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.text
		};
		const seasonStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		const xpTrackStyle = {
			height: 7,
			borderRadius: 4,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.muted
		};
		const metaRowStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: "4px 10px",
			marginTop: 6
		};
		const metaStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			background: TONE.row,
			padding: "2px 6px",
			borderRadius: 5
		};
		const comboStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const questRewardStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.gold
		};
		const questTrackStyle = {
			height: 6,
			borderRadius: 3,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
			overflow: "hidden"
		};
		const questFillStyle = {
			height: "100%",
			background: `linear-gradient(90deg, ${TONE.accent}, ${TONE.green})`,
			borderRadius: 3,
			transition: "width .4s ease"
		};
		const questFillDoneStyle = { background: `linear-gradient(90deg, ${TONE.gold}, ${TONE.green})` };
		const wallCountStyle = {
			color: TONE.quiet,
			fontWeight: 400
		};
		const updatedStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(12px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const itemEnStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			fontStyle: "normal",
			marginLeft: 4
		};
		const itemTimeStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		TONE.muted;
		const tabsStyle = {
			display: "flex",
			gap: 4,
			flexWrap: "wrap"
		};
		/** 成就墙筛选行：搜索框 + 稀有度/状态下拉。 */
		const wallFilterRowStyle = {
			display: "flex",
			gap: 5,
			marginBottom: 6,
			alignItems: "center"
		};
		const wallSearchInputStyle = {
			flex: 1,
			minWidth: 0,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 6,
			padding: "3px 7px",
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			background: "transparent",
			outline: "none"
		};
		const wallSelectStyle = {
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 6,
			padding: "2px 4px",
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			background: "transparent",
			cursor: "pointer"
		};
		const tabStyle = {
			border: "none",
			borderRadius: 6,
			padding: "3px 8px",
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			fontWeight: 700,
			lineHeight: 1,
			color: TONE.green
		};
		const wallXpStyle = {
			fontSize: "calc(8px * var(--dq-fsz, 1))",
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
			background: "rgba(120, 130, 150, 0.35)",
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
			fontSize: "calc(16px * var(--dq-fsz, 1))",
			lineHeight: 1
		};
		const milestoneTopStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between",
			gap: 8
		};
		const milestoneNameStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			fontWeight: 600,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const milestoneNumStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const milestoneTrackStyle = {
			height: 3,
			borderRadius: 2,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			textTransform: "uppercase",
			letterSpacing: .3
		};
		const tooltipProgressNumStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const tooltipProgressTrackStyle = {
			height: 3,
			borderRadius: 2,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
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
			fontSize: "calc(11px * var(--dq-fsz, 1))",
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
			fontSize: "calc(11px * var(--dq-fsz, 1))"
		};
		/** 已购称号徽章（称号旁小图标）。 */
		const titleBadgeStyle = {
			fontSize: "calc(13px * var(--dq-fsz, 1))",
			lineHeight: 1,
			marginLeft: -2
		};
		/** 等级持续天数。 */
		const levelSinceStyle = {
			display: "block",
			fontSize: "calc(9px * var(--dq-fsz, 1))",
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			whiteSpace: "nowrap"
		};
		const sprintTrackStyle = {
			flex: 1,
			height: 4,
			borderRadius: 2,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
			overflow: "hidden"
		};
		const sprintFillStyle = {
			height: "100%",
			borderRadius: 2,
			background: "linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))"
		};
		const sprintDaysStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.muted,
			whiteSpace: "nowrap",
			fontVariantNumeric: "tabular-nums"
		};
		/** v1.1 连续活跃行。 */
		const streakRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			marginTop: 4
		};
		const streakBadgeStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 22%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)",
			borderRadius: 99,
			padding: "2px 7px",
			whiteSpace: "nowrap"
		};
		const streakNextStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		const boostStockStyle = {
			marginLeft: "auto",
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.gold,
			whiteSpace: "nowrap"
		};
		/** v1.1 赛季通行证行。 */
		const passRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			marginTop: 4
		};
		/** v1.1 每日开工仪式。 */
		const ritualStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 5
		};
		const ritualGreetingStyle = {
			fontSize: "calc(12px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: "var(--dsw-alias-label-primary, #1a2230)"
		};
		const ritualSummaryStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.muted
		};
		const ritualReminderStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 16%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 45%, transparent)",
			borderRadius: 7,
			padding: "4px 8px"
		};
		const ritualGoalsStyle = {
			display: "flex",
			flexWrap: "wrap",
			gap: 4
		};
		const ritualGoalStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.text,
			background: TONE.row,
			borderRadius: 99,
			padding: "2px 7px",
			whiteSpace: "nowrap"
		};
		/** v1.1 收藏图鉴总览。 */
		const pokedexGridStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		const pokedexItemStyle = {
			display: "flex",
			alignItems: "center",
			gap: 7
		};
		const pokedexIconStyle = {
			fontSize: "calc(14px * var(--dq-fsz, 1))",
			width: 18,
			textAlign: "center"
		};
		const pokedexNameStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			width: 52,
			flexShrink: 0
		};
		const pokedexTrackStyle = {
			flex: 1,
			height: 7,
			borderRadius: 4,
			background: "rgba(120,130,150,0.28)",
			border: `1px solid ${TONE.border}`,
			overflow: "hidden"
		};
		const pokedexFillStyle = {
			height: "100%",
			borderRadius: 3,
			background: "linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-brand-primary, #8ec5ff))"
		};
		const pokedexNumStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			width: 34,
			textAlign: "right",
			fontVariantNumeric: "tabular-nums"
		};
		/** v1.2.0 设置区。 */
		const settingsRowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			padding: "3px 0"
		};
		const settingsLabelStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const settingsControlStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6
		};
		const settingsValueStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.gold,
			minWidth: 36,
			textAlign: "center",
			fontVariantNumeric: "tabular-nums"
		};
		const settingsBtnStyle = {
			width: 22,
			height: 22,
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 6,
			background: "transparent",
			color: TONE.text,
			fontSize: "calc(12px * var(--dq-fsz, 1))",
			cursor: "pointer",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center"
		};
		const settingsToggleStyle = {
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 6,
			padding: "2px 10px",
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			background: "transparent",
			cursor: "pointer"
		};
		const settingsToggleOnStyle = {
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)",
			borderColor: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 55%, transparent)"
		};
		const passTrackStyle = {
			display: "flex",
			gap: 3,
			flex: 1
		};
		const passTierStyle = (reached, claimed) => ({
			flex: 1,
			height: 14,
			borderRadius: 4,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: "calc(8px * var(--dq-fsz, 1))",
			lineHeight: 1,
			cursor: reached && !claimed ? "pointer" : "default",
			background: claimed ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 45%, transparent)" : reached ? "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 60%, transparent)" : "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 65%, transparent)",
			border: `1px solid ${TONE.border}`,
			color: claimed || reached ? "#1a2230" : TONE.quiet
		});
		/** 商店分区：库存行（保险/重掷）。 */
		const shopBarStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			marginTop: 4,
			paddingBottom: 2
		};
		TONE.gold;
		const shopStockStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
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
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.text,
			fontWeight: 600
		};
		const shopItemPriceStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.gold,
			fontWeight: 700,
			fontVariantNumeric: "tabular-nums"
		};
		const shopItemDescStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.muted,
			marginTop: 3,
			lineHeight: 1.4
		};
		const shopOwnedStyle = {
			marginTop: 5,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
		/** 「使用主题」按钮：品牌色描边 + 浅色填充（区别于购买的金色按钮）。 */
		const shopThemeUseButtonStyle = {
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 55%, transparent)",
			background: "linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, white), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, white))",
			color: "var(--dsw-alias-label-primary, #1a2230)"
		};
		/** 主题皮肤独立分区：皮肤卡片网格。 */
		const skinGridStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			marginTop: 4
		};
		/** 皮肤配色预览行：4 个小色块（主色/金色/背景/面板底）。 */
		const skinSwatchRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 4,
			marginTop: 4
		};
		const skinSwatchStyle = (color) => ({
			width: 14,
			height: 10,
			borderRadius: 3,
			background: color,
			border: "1px solid rgba(120,130,150,0.35)"
		});
		/** 面板底色块：浅色底加描边保证可见。 */
		const skinSwatchBorderStyle = (color) => ({
			width: 14,
			height: 10,
			borderRadius: 3,
			background: color,
			border: "1px solid rgba(120,130,150,0.45)"
		});
		/** 当前激活的皮肤卡片：品牌色描边高亮。 */
		const skinItemActiveStyle = {
			border: "1.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 65%, transparent)",
			boxShadow: "0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)"
		};
		/** 皮肤分区标题栏右侧：当前激活皮肤胶囊。 */
		const skinHeadActiveStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)",
			borderRadius: 99,
			padding: "2px 8px",
			whiteSpace: "nowrap",
			maxWidth: 130,
			overflow: "hidden",
			textOverflow: "ellipsis"
		};
		const rerollButtonStyle = {
			marginTop: 4,
			padding: "5px 10px",
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.text,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			cursor: "pointer"
		};
		/** v1.2.3：全局操作结果条（成功绿色 / 失败红色，带淡背景）。 */
		const panelMsgStyle = (ok) => ({
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			lineHeight: 1.4,
			color: ok ? TONE.green : TONE.red,
			background: ok ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 10%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 10%, transparent)",
			border: `1px solid ${ok ? TONE.green : TONE.red}`,
			borderRadius: 8,
			padding: "6px 10px",
			marginBottom: "var(--dq-section-mb, 12px)",
			wordBreak: "break-all"
		});
		const dailyGoalCardStyle = {
			background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1d2735) 55%, transparent)",
			border: `1px solid ${TONE.border}`,
			borderRadius: 10,
			padding: "8px 10px",
			marginBottom: "var(--dq-section-mb, 12px)"
		};
		const dailyGoalRowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			marginBottom: 4
		};
		const dailyGoalLabelStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.text
		};
		const dailyGoalNumStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.gold,
			fontVariantNumeric: "tabular-nums"
		};
		const dailyGoalTrackStyle = {
			height: 5,
			borderRadius: 3,
			background: TONE.row,
			overflow: "hidden"
		};
		const dailyGoalFillStyle = {
			height: "100%",
			borderRadius: 3,
			background: "linear-gradient(90deg, var(--dsw-alias-state-warn-primary, #f6c652), var(--dsw-alias-state-success-primary, #78dda0))"
		};
		const dailyGoalDoneStyle = {
			marginTop: 4,
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.green
		};
		const dailyGoalClaimButtonStyle = {
			marginTop: 6,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 22%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)",
			borderRadius: 6,
			padding: "4px 10px",
			cursor: "pointer"
		};
		const bossCardStyle = {
			marginTop: 8,
			background: "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff8592) 8%, transparent)",
			border: `1px solid ${TONE.border}`,
			borderRadius: 8,
			padding: "7px 9px"
		};
		const bossHeadRowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			marginBottom: 4
		};
		const bossNameStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.red
		};
		const bossHpStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const bossTrackStyle = {
			height: 6,
			borderRadius: 3,
			background: TONE.row,
			overflow: "hidden"
		};
		const bossFillStyle = {
			height: "100%",
			borderRadius: 3,
			background: "linear-gradient(90deg, var(--dsw-alias-state-error-primary, #ff8592), var(--dsw-alias-state-warn-primary, #f6c652))"
		};
		const bossHintStyle = {
			marginTop: 4,
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		const classBadgeStyle = {
			display: "flex",
			alignItems: "center",
			gap: 6,
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 35%, transparent)",
			borderRadius: 8,
			padding: "5px 9px",
			marginBottom: 6
		};
		const classBadgeNameStyle = {
			flex: 1,
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.text
		};
		const classBadgeLabelStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.accent,
			textTransform: "uppercase",
			letterSpacing: .3
		};
		const seasonSummaryCardStyle = {
			background: "linear-gradient(135deg, color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent), color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent))",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 40%, transparent)",
			borderRadius: 10,
			padding: "8px 10px",
			marginBottom: "var(--dq-section-mb, 12px)"
		};
		const seasonSummaryHeadStyle = {
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.gold
		};
		const seasonSummaryMetaStyle = {
			marginTop: 3,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const seasonSummaryRewardStyle = {
			marginTop: 3,
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.green
		};
		/** 新手任务链。 */
		const tutorialRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: 7,
			padding: "3px 0"
		};
		const tutorialNameStyle = {
			flex: 1,
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const tutorialXpStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.gold
		};
		const tutorialTitleStyle = {
			marginTop: 4,
			fontSize: "calc(11px * var(--dq-fsz, 1))",
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
			fontSize: "calc(8px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			overflow: "hidden",
			textOverflow: "ellipsis",
			maxWidth: "100%"
		};
		const reportLegendStyle = {
			marginTop: 4,
			fontSize: "calc(9px * var(--dq-fsz, 1))",
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
			fontSize: "calc(20px * var(--dq-fsz, 1))",
			fontWeight: 800,
			color: TONE.gold,
			letterSpacing: 1
		};
		const celebrationLevelStyle = {
			fontSize: "calc(16px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.text
		};
		const celebrationStatsStyle = {
			fontSize: "calc(12px * var(--dq-fsz, 1))",
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
		/** 活跃日历强度色（与格子一致：1-4 级绿）。 */
		function calendarLegendColor(level) {
			return [
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 22%, transparent)",
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 42%, transparent)",
				"color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 62%, transparent)",
				"var(--dsw-alias-state-success-primary, #78dda0)"
			][Math.min(Math.max(level, 1), 4) - 1];
		}
		/** 活跃日历图例：少 → 多 4 级绿色块（与日历格子同色）。 */
		const calendarLegendStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			gap: 3,
			marginTop: 6
		};
		const calendarLegendLabelStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		const calendarLegendBlockStyle = (level) => ({
			width: 10,
			height: 10,
			borderRadius: 3,
			background: calendarLegendColor(level)
		});
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			background: TONE.row,
			padding: "4px 8px",
			borderRadius: 7
		};
		const statsSubTitleStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet,
			fontWeight: 700
		};
		const toolRankNameStyle = {
			flex: 1,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const toolRankCountStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
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
			flexWrap: "wrap",
			marginBottom: 12
		};
		const nextTitleStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.muted
		};
		const luckyButtonStyle = {
			marginLeft: "auto",
			padding: "4px 10px",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 50%, transparent)",
			borderRadius: 8,
			background: "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f6c652) 14%, transparent)",
			color: TONE.gold,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			cursor: "pointer"
		};
		const luckyMsgStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const collProgressStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.muted,
			fontVariantNumeric: "tabular-nums"
		};
		const collRewardStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.quiet
		};
		/** 每周挑战。 */
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			color: TONE.text
		};
		const weeklyQuestRewardStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.gold
		};
		const weeklyQuestTrackStyle = {
			height: 4,
			borderRadius: 2,
			background: "rgba(120, 130, 150, 0.28)",
			border: `1px solid ${TONE.border}`,
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			cursor: "pointer"
		};
		const weeklyBonusClaimedStyle = {
			marginTop: 4,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(12px * var(--dq-fsz, 1))",
			color: TONE.text,
			fontWeight: 600
		};
		/** 称号区标题栏右侧：当前展示称号（折叠时也能看到具体称号）。 */
		const titleHeadCurrentStyle = {
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary, #1a2230)",
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)",
			borderRadius: 99,
			padding: "2px 8px",
			whiteSpace: "nowrap",
			maxWidth: 130,
			overflow: "hidden",
			textOverflow: "ellipsis"
		};
		const shareButtonStyle = {
			padding: "4px 10px",
			border: `1px solid ${TONE.borderStrong}`,
			borderRadius: 8,
			background: TONE.row,
			color: TONE.text,
			fontSize: "calc(10px * var(--dq-fsz, 1))",
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
			fontSize: "calc(11px * var(--dq-fsz, 1))",
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
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			color: TONE.gold,
			fontWeight: 600
		};
		const titleItemLockedMarkStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			cursor: "pointer",
			textAlign: "center",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center"
		};
		/** 周报回合数标注。 */
		const reportBarTurnStyle = {
			fontSize: "calc(8px * var(--dq-fsz, 1))",
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
			fontSize: "calc(12px * var(--dq-fsz, 1))",
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.gold
		};
		const tooltipDescStyle = {
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.muted,
			marginTop: 6,
			lineHeight: 1.5
		};
		const emptyStyle = {
			fontSize: "calc(11px * var(--dq-fsz, 1))",
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
			fontSize: "calc(10px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.gold,
			textTransform: "uppercase",
			letterSpacing: .4
		};
		const toastNameStyle = {
			fontSize: "calc(13px * var(--dq-fsz, 1))",
			fontWeight: 600,
			color: TONE.text,
			marginTop: 2
		};
		const toastDescStyle = {
			fontSize: "calc(11px * var(--dq-fsz, 1))",
			color: TONE.muted,
			marginTop: 2
		};
		const toastCloseStyle = {
			border: "none",
			background: "transparent",
			color: TONE.quiet,
			cursor: "pointer",
			fontSize: "calc(15px * var(--dq-fsz, 1))",
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
			fontSize: "calc(12px * var(--dq-fsz, 1))"
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
			fontSize: "calc(12px * var(--dq-fsz, 1))"
		};
		const levelChipStyle = {
			fontSize: "calc(9px * var(--dq-fsz, 1))",
			fontWeight: 700,
			color: TONE.accent,
			background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)",
			border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 30%, transparent)",
			padding: "1px 5px",
			borderRadius: 999
		};
		//#endregion
		//#region src/client/panel/sections.tsx
		/** 通用分区卡片（各分区组件使用）。 */
		function SectionCard(props) {
			const { id, title, right, collapsed, onToggle, children } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: sectionCardStyle,
				"data-section": id,
				"data-collapsed": collapsed ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onToggle,
					style: sectionCardHeadStyle,
					"aria-expanded": !collapsed,
					title: collapsed ? "展开" : "折叠",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: sectionCardTitleStyle,
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							display: "inline-flex",
							alignItems: "center",
							gap: 6
						},
						children: [right, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: sectionCardArrowStyle,
							children: collapsed ? "▸" : "▾"
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...sectionCardBodyStyle,
						...collapsed ? sectionCardBodyHiddenStyle : {}
					},
					children
				})]
			});
		}
		/** 等级环（hero 分区使用）。 */
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
		function HeroSection(props) {
			const { status, t, c, percent, refresh, claimPassTier } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: streakRowStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: streakBadgeStyle,
									title: t("dq.streakBest", { best: status.streak?.best ?? 0 }),
									children: ["🔥 ", t("dq.streak", { n: status.streak?.days ?? 0 })]
								}),
								status.streak?.nextTierXp !== null && status.streak !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: streakNextStyle,
									children: t("dq.streakNext", { xp: status.streak.nextTierXp ?? 0 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: boostStockStyle,
									children: [(status.shop?.xpBoostTurns ?? 0) > 0 && `⚡×${status.shop?.xpBoostTurns ?? 0}`, (status.shop?.questSkips ?? 0) > 0 && ` ⏭️×${status.shop?.questSkips ?? 0}`]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: passRowStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sprintLabelStyle,
								children: t("dq.pass")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: passTrackStyle,
								children: status.pass?.tiers.map((tier) => {
									Math.min(100, Math.round((status.pass?.seasonXp ?? 0) / tier.seasonXp * 100));
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: passTierStyle(tier.reached, tier.claimed),
										title: `${tier.seasonXp} XP · +${tier.xp} XP${tier.claimed ? " ✓" : tier.reached ? "（可领取）" : ""}`,
										onClick: tier.reached && !tier.claimed ? () => void claimPassTier(tier.id) : void 0,
										children: tier.claimed ? "✓" : tier.reached ? "🎁" : ""
									}, tier.id);
								})
							})]
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
			}) });
		}
		function SeasonSummaryCard(props) {
			const { status, t } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: status.seasonSummary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: seasonSummaryCardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: seasonSummaryHeadStyle,
						children: [
							"📜 ",
							t("dq.seasonSummary"),
							" · ",
							t("dq.seasonSummaryTitle", {
								season: status.seasonSummary.season,
								level: status.seasonSummary.level
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: seasonSummaryMetaStyle,
						children: t("dq.seasonSummaryMeta", {
							combo: status.seasonSummary.comboBest,
							xp: formatNumber(status.seasonSummary.seasonXp),
							n: status.seasonSummary.achievements
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: seasonSummaryRewardStyle,
						children: t("dq.seasonSummaryReward")
					})
				]
			}) });
		}
		function DailyGoalCard(props) {
			const { status, t, claimDailyGoalF } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: status.dailyGoal !== void 0 && status.dailyGoal.goal > 0 && (() => {
				const g = status.dailyGoal;
				const pct = Math.min(100, Math.round(Math.min(g.todayXp, g.goal) / Math.max(g.goal, 1) * 100));
				const reached = g.todayXp >= g.goal;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: dailyGoalCardStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: dailyGoalRowStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: dailyGoalLabelStyle,
								children: ["🎯 ", t("dq.dailyGoal")]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: dailyGoalNumStyle,
								children: t("dq.dailyGoalProgress", {
									xp: formatNumber(g.todayXp),
									goal: formatNumber(g.goal)
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: dailyGoalTrackStyle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
								...dailyGoalFillStyle,
								width: `${pct}%`,
								...reached ? questFillDoneStyle : {}
							} })
						}),
						g.claimed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: dailyGoalDoneStyle,
							children: t("dq.dailyGoalClaimed")
						}) : reached && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void claimDailyGoalF(),
							style: dailyGoalClaimButtonStyle,
							children: t("dq.dailyGoalClaim", { xp: g.rewardXp })
						})
					]
				});
			})() });
		}
		function RitualSection(props) {
			const { status, t, questReminderMsg, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "ritual",
				title: `🌅 ${t("dq.ritual")}`,
				collapsed: collapsedMap["ritual"] === true,
				onToggle: () => toggle("ritual"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: ritualStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: ritualGreetingStyle,
							children: t("dq.ritualGreeting", { level: status.level })
						}),
						questReminderMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: ritualReminderStyle,
							children: ["⏰ ", questReminderMsg]
						}),
						(() => {
							const todayKey = dayKeyLocal();
							const yesterday = (status.history ?? []).filter((h) => h.date !== todayKey).slice(-1)[0];
							return yesterday !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: ritualSummaryStyle,
								children: t("dq.ritualYesterday", {
									xp: yesterday.xp,
									turns: yesterday.turns
								})
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: ritualSummaryStyle,
								children: t("dq.ritualFirst")
							});
						})(),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: ritualGoalsStyle,
							children: status.daily?.quests.map((q) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: ritualGoalStyle,
								children: [
									q.done ? "✅" : "⬜",
									" ",
									q.label.zh
								]
							}, q.id))
						})
					]
				})
			}) });
		}
		function LuckyRow(props) {
			const { status, t, claimingLucky, luckyMsg, claimLuckyDraw } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
			}), luckyMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: luckyMsgStyle,
				children: luckyMsg
			})] });
		}
		function DailySection(props) {
			const { status, t, claiming, claimChest, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "daily",
				title: `📅 ${t("dq.daily")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: updatedStyle,
					children: status.daily?.date ?? ""
				}),
				collapsed: collapsedMap["daily"] === true,
				onToggle: () => toggle("daily"),
				children: [(status.daily?.quests ?? []).map((q) => {
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
				}), status.dailyChest !== void 0 && (status.dailyChest.ready || status.dailyChest.claimed) && (status.dailyChest.claimed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: chestClaimedStyle,
					children: ["🎁 ", t("dq.chestClaimed")]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => void claimChest(),
					disabled: claiming,
					style: chestButtonStyle,
					children: ["🎁 ", claiming ? t("dq.chestClaiming") : t("dq.chestReady", { xp: 50 })]
				}))]
			}) });
		}
		function WeeklySection(props) {
			const { status, t, weeklyClaiming, claimBossF, claimWeekly, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "weekly",
				title: `🗓️ ${t("dq.weekly")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: updatedStyle,
					children: t("dq.weeklyWeek", { week: status.weekly?.week ?? "" })
				}),
				collapsed: collapsedMap["weekly"] === true,
				onToggle: () => toggle("weekly"),
				children: status.weekly !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
					status.weekly.boss.name !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: bossCardStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: bossHeadRowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: bossNameStyle,
									children: [
										status.weekly.boss.icon,
										" ",
										status.weekly.boss.name
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: bossHpStyle,
									children: t("dq.bossHp", {
										damage: formatNumber(status.weekly.boss.damage),
										hp: formatNumber(status.weekly.boss.hp)
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: bossTrackStyle,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
									...bossFillStyle,
									width: `${Math.min(100, Math.round(status.weekly.boss.damage / Math.max(status.weekly.boss.hp, 1) * 100))}%`,
									...status.weekly.boss.defeated ? questFillDoneStyle : {}
								} })
							}),
							status.weekly.boss.claimed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: weeklyBonusClaimedStyle,
								children: ["🐉 ", t("dq.bossClaimed")]
							}) : status.weekly.boss.defeated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void claimBossF(),
								style: weeklyBonusButtonStyle,
								children: t("dq.bossDefeat", {
									name: status.weekly.boss.name,
									n: status.weekly.boss.reward
								})
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: bossHintStyle,
								children: t("dq.bossProgress")
							})
						]
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
				] })
			}) });
		}
		function ShopSection(props) {
			const { status, t, buying, confirmBuyId, buy, rerolling, rerollQuests, useQuestSkipCard, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "shop",
				title: `🛒 ${t("dq.shop")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: updatedStyle,
					children: t("dq.shopBalance", { balance: status.shop?.balance ?? 0 })
				}),
				collapsed: collapsedMap["shop"] === true,
				onToggle: () => toggle("shop"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: shopBarStyle,
					children: [(status.shop?.shields ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: shopStockStyle,
						children: t("dq.shopShields", { n: status.shop.shields })
					}), (status.shop?.rerolls ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: shopStockStyle,
						children: t("dq.shopRerolls", { n: status.shop.rerolls })
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: shopGridStyle,
					children: [
						status.shop?.items.filter((item) => item.kind !== "theme").map((item) => {
							const canAfford = status.shop.balance >= item.price;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: shopItemStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: shopItemHeadStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { fontSize: "calc(15px * var(--dq-fsz, 1))" },
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
						(status.shop?.rerolls ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void rerollQuests(),
							disabled: rerolling,
							style: rerollButtonStyle,
							children: ["🔀 ", rerolling ? "…" : t("dq.shopReroll")]
						}),
						(status.shop?.questSkips ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void useQuestSkipCard(),
							style: rerollButtonStyle,
							children: [
								"⏭️ ",
								t("dq.shopSkip"),
								"（×",
								status.shop.questSkips,
								"）"
							]
						})
					]
				})]
			}) });
		}
		function SkinsSection(props) {
			const { status, t, buying, confirmBuyId, buy, activateTheme, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "skins",
				title: `🎨 ${t("dq.skins")}`,
				right: (() => {
					const activeTheme = status.shop?.items.find((i) => i.id === status.shop?.theme);
					return status.shop?.theme !== void 0 && status.shop.theme !== "" && activeTheme !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: skinHeadActiveStyle,
						children: [
							activeTheme.icon,
							" ",
							activeTheme.name.zh
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: updatedStyle,
						children: t("dq.skinDefault")
					});
				})(),
				collapsed: collapsedMap["skins"] === true,
				onToggle: () => toggle("skins"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: skinGridStyle,
					children: status.shop?.items.filter((item) => item.kind === "theme").map((item) => {
						const canAfford = status.shop.balance >= item.price;
						const active = status.shop?.theme === item.id;
						const owned = item.owned;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...shopItemStyle,
								...active ? skinItemActiveStyle : {}
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: shopItemHeadStyle,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { fontSize: "calc(15px * var(--dq-fsz, 1))" },
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
								(() => {
									const palette = SKIN_PALETTES[item.id];
									if (palette === void 0) return null;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: skinSwatchRowStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: skinSwatchStyle(palette.brand),
												title: "主色"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: skinSwatchStyle(palette.warn),
												title: "金色"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: skinSwatchStyle(palette.layer2),
												title: "背景"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: skinSwatchBorderStyle(palette.overlay),
												title: "面板底"
											})
										]
									});
								})(),
								active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: shopOwnedStyle,
									children: t("dq.themeActive")
								}) : owned ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void activateTheme(item.id),
									disabled: buying !== null,
									style: {
										...shopBuyButtonStyle,
										...shopThemeUseButtonStyle
									},
									children: t("dq.themeUse")
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
					})
				})
			}) });
		}
		function TutorialSection(props) {
			const { status, t, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "tutorial",
				title: `🎓 ${t("dq.tutorial")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: updatedStyle,
					children: status.tutorial?.done ? "✅" : t("dq.tutorialStepDone", {
						n: status.tutorial?.steps.filter((s) => s.done).length ?? 0,
						m: status.tutorial?.steps.length ?? 5
					})
				}),
				collapsed: collapsedMap["tutorial"] === true,
				onToggle: () => toggle("tutorial"),
				children: [status.tutorial?.steps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: tutorialRowStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "calc(13px * var(--dq-fsz, 1))",
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
				}, step.id)), status.tutorial?.done === true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: tutorialTitleStyle,
					children: ["🏅 ", t("dq.tutorialTitle", { title: status.tutorial.title.zh })]
				})]
			}) });
		}
		function TitlesSection(props) {
			const { status, t, sharing, shareCard, shareSeason, switchTitle, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "titles",
				title: `🏷️ ${t("dq.titles")}`,
				right: status.titles?.current !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: titleHeadCurrentStyle,
					children: [
						status.titles?.current?.icon ?? "🎖️",
						" ",
						status.titles?.current?.name.zh
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: titleHeadCurrentStyle,
					children: [
						t("dq.titleFollowLevel"),
						" · ",
						status.title.zh
					]
				}),
				collapsed: collapsedMap["titles"] === true,
				onToggle: () => toggle("titles"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: titleCurrentRowStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "calc(15px * var(--dq-fsz, 1))" },
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
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void shareSeason(),
								disabled: sharing,
								style: shareButtonStyle,
								children: sharing ? "…" : `📊 ${t("dq.shareSeason")}`
							})
						]
					}),
					status.class !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: classBadgeStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "calc(13px * var(--dq-fsz, 1))" },
								children: status.class.icon
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: classBadgeNameStyle,
								children: [
									status.class.name.zh,
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
										style: itemEnStyle,
										children: status.class.name.en
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: classBadgeLabelStyle,
								children: t("dq.classLabel")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
			}) });
		}
		function CollectionsSection(props) {
			const { status, t, importing, exportSave, importSave, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "collections",
				title: `📚 ${t("dq.collections")}`,
				collapsed: collapsedMap["collections"] === true,
				onToggle: () => toggle("collections"),
				children: [(status.collections?.items ?? []).map((coll) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: collRowStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: "calc(13px * var(--dq-fsz, 1))",
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
				}, coll.category)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				})]
			}) });
		}
		function PokedexSection(props) {
			const { status, t, unlocked, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "pokedex",
				title: `📖 ${t("dq.pokedex")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: updatedStyle,
					children: [t("dq.pokedexOverall", { pct: Math.round((unlocked.length / Math.max(status.achievements.length, 1) + (status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter((i) => i.kind === "theme").length, 1) + (status.titles?.items ?? []).filter((t) => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1)) / 3 * 100) }), "%"]
				}),
				collapsed: collapsedMap["pokedex"] === true,
				onToggle: () => toggle("pokedex"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: pokedexGridStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: pokedexItemStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexIconStyle,
									children: "🏆"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexNameStyle,
									children: t("dq.pokedexAch")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: pokedexTrackStyle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
										...pokedexFillStyle,
										width: `${Math.round(unlocked.length / Math.max(status.achievements.length, 1) * 100)}%`
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: pokedexNumStyle,
									children: [
										unlocked.length,
										"/",
										status.achievements.length
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: pokedexItemStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexIconStyle,
									children: "🎨"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexNameStyle,
									children: t("dq.pokedexSkin")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: pokedexTrackStyle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
										...pokedexFillStyle,
										width: `${Math.round((status.shop?.themes ?? []).length / Math.max(status.shop?.items.filter((i) => i.kind === "theme").length, 1) * 100)}%`
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: pokedexNumStyle,
									children: [
										(status.shop?.themes ?? []).length,
										"/",
										status.shop?.items.filter((i) => i.kind === "theme").length ?? 0
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: pokedexItemStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexIconStyle,
									children: "🏷️"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: pokedexNameStyle,
									children: t("dq.pokedexTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: pokedexTrackStyle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
										...pokedexFillStyle,
										width: `${Math.round((status.titles?.items ?? []).filter((t) => t.unlocked).length / Math.max(status.titles?.items?.length ?? 1, 1) * 100)}%`
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: pokedexNumStyle,
									children: [
										(status.titles?.items ?? []).filter((t) => t.unlocked).length,
										"/",
										status.titles?.items?.length ?? 0
									]
								})
							]
						})
					]
				})
			}) });
		}
		function RecentSection(props) {
			const { status, t, state, recent, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "recent",
				title: t("dq.recent"),
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: updatedStyle,
					children: [
						t("dq.updated"),
						" ",
						updatedLabel(state.refreshedAt)
					]
				}),
				collapsed: collapsedMap["recent"] === true,
				onToggle: () => toggle("recent"),
				children: recent.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: emptyStyle,
					children: t("dq.empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					style: listStyle,
					children: recent.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						style: listItemStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: "calc(15px * var(--dq-fsz, 1))" },
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
				})
			}) });
		}
		function WallSection(props) {
			const { status, t, category, setCategory, wallSearch, setWallSearch, wallRarity, setWallRarity, wallStatus, setWallStatus, hover, setHover, wallItems, milestone, unlocked, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "wall",
				title: t("dq.wall"),
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: wallCountStyle,
					children: t("dq.wallCount", {
						n: unlocked.length,
						m: status.achievements.length
					})
				}),
				collapsed: collapsedMap["wall"] === true,
				onToggle: () => toggle("wall"),
				children: [
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: wallFilterRowStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "text",
								value: wallSearch,
								onChange: (e) => setWallSearch(e.target.value),
								placeholder: t("dq.wallSearch"),
								style: wallSearchInputStyle
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: wallRarity,
								onChange: (e) => setWallRarity(e.target.value),
								style: wallSelectStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "all",
										children: t("dq.wallRarityAll")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "common",
										children: t("dq.rarity.common")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "rare",
										children: t("dq.rarity.rare")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "epic",
										children: t("dq.rarity.epic")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "legendary",
										children: t("dq.rarity.legendary")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: wallStatus,
								onChange: (e) => setWallStatus(e.target.value),
								style: wallSelectStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "all",
										children: t("dq.wallStatusAll")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "unlocked",
										children: t("dq.wallStatusUnlocked")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "locked",
										children: t("dq.wallStatusLocked")
									})
								]
							})
						]
					}),
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
					wallItems.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: emptyStyle,
						children: t("dq.wallNoMatch")
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
											fontSize: "calc(17px * var(--dq-fsz, 1))",
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
				]
			}) });
		}
		function ReportSection(props) {
			const { status, t, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "report",
				title: `📈 ${t("dq.report")}`,
				collapsed: collapsedMap["report"] === true,
				onToggle: () => toggle("report"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				})
			}) });
		}
		function CalendarSection(props) {
			const { status, t, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "calendar",
				title: `🗓️ ${t("dq.calendar")}`,
				right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: updatedStyle,
					children: t("dq.calendarDays")
				}),
				collapsed: collapsedMap["calendar"] === true,
				onToggle: () => toggle("calendar"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: calendarLegendStyle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: calendarLegendLabelStyle,
							children: "少"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: calendarLegendBlockStyle(1) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: calendarLegendBlockStyle(2) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: calendarLegendBlockStyle(3) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: calendarLegendBlockStyle(4) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: calendarLegendLabelStyle,
							children: "多"
						})
					]
				})]
			}) });
		}
		function StatsSection(props) {
			const { status, t, c, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionCard, {
				id: "stats",
				title: `📊 ${t("dq.stats")}`,
				collapsed: collapsedMap["stats"] === true,
				onToggle: () => toggle("stats"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				})
			}) });
		}
		function SettingsSection(props) {
			const { status, t, settings, updateSettings, setGoalF, collapsedMap, toggle } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SectionCard, {
				id: "settings",
				title: `⚙️ ${t("dq.settings")}`,
				collapsed: collapsedMap["settings"] === true,
				onToggle: () => toggle("settings"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: settingsLabelStyle,
							children: t("dq.settingsFont")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: settingsControlStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => updateSettings({ fontSize: Math.max(.85, Math.round((settings.fontSize - .1) * 100) / 100) }),
									style: settingsBtnStyle,
									children: "−"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: settingsValueStyle,
									children: [Math.round(settings.fontSize * 100), "%"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => updateSettings({ fontSize: Math.min(1.2, Math.round((settings.fontSize + .1) * 100) / 100) }),
									style: settingsBtnStyle,
									children: "+"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: settingsLabelStyle,
							children: t("dq.settingsCompact")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => updateSettings({ compact: !settings.compact }),
							style: {
								...settingsToggleStyle,
								...settings.compact ? settingsToggleOnStyle : {}
							},
							children: settings.compact ? t("dq.on") : t("dq.off")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: settingsLabelStyle,
							children: t("dq.settingsToast")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: settings.toastFilter,
							onChange: (e) => updateSettings({ toastFilter: e.target.value }),
							style: wallSelectStyle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "all",
									children: t("dq.settingsToastAll")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "rare",
									children: t("dq.settingsToastRare")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "off",
									children: t("dq.settingsToastOff")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: settingsLabelStyle,
							children: ["🎯 ", t("dq.dailyGoal")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: String(status.dailyGoal?.goal ?? 0),
							onChange: (e) => void setGoalF(Number(e.target.value)),
							style: wallSelectStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "0",
								children: t("dq.dailyGoalOff")
							}), (status.dailyGoal?.options ?? [
								200,
								400,
								800,
								1500
							]).map((opt) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: String(opt),
								children: [opt, " XP"]
							}, opt))]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: settingsLabelStyle,
							children: ["🔊 ", t("dq.sound")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => updateSettings({ sound: !settings.sound }),
							style: {
								...settingsToggleStyle,
								...settings.sound ? settingsToggleOnStyle : {}
							},
							children: settings.sound ? t("dq.on") : t("dq.off")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: settingsRowStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: settingsLabelStyle,
							children: ["🔔 ", t("dq.notify")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => updateSettings({ notify: !settings.notify }),
							style: {
								...settingsToggleStyle,
								...settings.notify ? settingsToggleOnStyle : {}
							},
							children: settings.notify ? t("dq.on") : t("dq.off")
						})]
					})
				]
			}) });
		}
		/** 成就墙悬浮提示（wall 分区使用）。 */
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
							style: { fontSize: "calc(20px * var(--dq-fsz, 1))" },
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
		/**
		* 通用分区卡片：带边框的背景块，标题栏可点击折叠/展开。
		* collapsed 由父组件统一管理（section id → boolean）。
		*/
		/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
		function DevQuestPanelCard(props) {
			const { useStore, actions, t, refresh } = props;
			const state = useStore((snapshot) => snapshot);
			const [category, setCategory] = (0, react.useState)("journey");
			const [wallSearch, setWallSearch] = (0, react.useState)("");
			const [wallRarity, setWallRarity] = (0, react.useState)("all");
			const [wallStatus, setWallStatus] = (0, react.useState)("all");
			const [hover, setHover] = (0, react.useState)(null);
			const [claiming, setClaiming] = (0, react.useState)(false);
			const [buying, setBuying] = (0, react.useState)(null);
			const [confirmBuyId, setConfirmBuyId] = (0, react.useState)(null);
			const [panelMsg, setPanelMsg] = (0, react.useState)(null);
			const panelMsgTimer = (0, react.useRef)(null);
			const [rerolling, setRerolling] = (0, react.useState)(false);
			const [luckyMsg, setLuckyMsg] = (0, react.useState)(null);
			const [claimingLucky, setClaimingLucky] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [weeklyClaiming, setWeeklyClaiming] = (0, react.useState)(false);
			const [sharing, setSharing] = (0, react.useState)(false);
			const [questReminderMsg, setQuestReminderMsg] = (0, react.useState)(null);
			const [settings, setSettings] = (0, react.useState)(loadSettings);
			const updateSettings = (patch) => {
				setSettings((cur) => {
					const next = {
						...cur,
						...patch
					};
					saveSettings(next);
					return next;
				});
			};
			/** v1.2.3：显示全局操作结果（成功/失败），4 秒自动消失。 */
			const notify = (0, react.useCallback)((ok, text) => {
				setPanelMsg({
					ok,
					text
				});
				if (panelMsgTimer.current !== null) window.clearTimeout(panelMsgTimer.current);
				panelMsgTimer.current = window.setTimeout(() => setPanelMsg(null), 4e3);
			}, []);
			const [collapsed, setCollapsed] = (0, react.useState)(loadCollapsed);
			const toggleSection = (id) => {
				setCollapsed((cur) => {
					const next = {
						...cur,
						[id]: !(cur[id] ?? false)
					};
					saveCollapsed(next);
					return next;
				});
			};
			/** 全部面板分区 id（一键折叠/展开用）。 */
			const ALL_SECTION_IDS = [
				"ritual",
				"daily",
				"weekly",
				"shop",
				"skins",
				"tutorial",
				"titles",
				"collections",
				"pokedex",
				"recent",
				"wall",
				"report",
				"calendar",
				"stats",
				"settings"
			];
			/** 全部展开。 */
			const expandAll = () => {
				const next = {};
				for (const id of ALL_SECTION_IDS) next[id] = false;
				setCollapsed(next);
				saveCollapsed(next);
			};
			/** 全部折叠。 */
			const collapseAll = () => {
				const next = {};
				for (const id of ALL_SECTION_IDS) next[id] = true;
				setCollapsed(next);
				saveCollapsed(next);
			};
			const [pos, setPos] = (0, react.useState)(loadPanelPos);
			const [dragging, setDragging] = (0, react.useState)(false);
			const cardRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const onUiSettings = () => setSettings(loadSettings());
				window.addEventListener("devquest:ui-settings", onUiSettings);
				return () => window.removeEventListener("devquest:ui-settings", onUiSettings);
			}, []);
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
			(0, react.useEffect)(() => {
				const status = state.status;
				if (status === null) return;
				if ((/* @__PURE__ */ new Date()).getHours() < 20) return;
				const today = dayKeyLocal();
				try {
					if (localStorage.getItem("dsh.devquest.questReminder") === today) return;
				} catch {
					return;
				}
				const pending = (status.daily?.quests ?? []).filter((q) => !q.done).length;
				if (pending === 0) return;
				try {
					localStorage.setItem(REMINDER_KEY, today);
				} catch {}
				const text = t("dq.reminder", { n: pending });
				setQuestReminderMsg(text);
				if (typeof Notification !== "undefined" && Notification.permission === "granted") try {
					new Notification("DevQuest", { body: text });
				} catch {}
			}, [state.status, t]);
			/** 领取每日全清宝箱：POST 后刷新本地状态。 */
			const claimChest = (0, react.useCallback)(async () => {
				if (claiming) return;
				setClaiming(true);
				try {
					const data = await (await fetch("/api/devquest/claim-chest", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.chestClaimed"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				} finally {
					setClaiming(false);
				}
			}, [
				claiming,
				actions,
				notify,
				t
			]);
			/** 购买商店商品：两步确认防误触（第一次点击进确认态，3 秒内再点才真买）。 */
			const buy = (0, react.useCallback)(async (itemId) => {
				if (buying !== null) return;
				if (confirmBuyId !== itemId) {
					setConfirmBuyId(itemId);
					window.setTimeout(() => setConfirmBuyId((cur) => cur === itemId ? null : cur), 3e3);
					return;
				}
				setConfirmBuyId(null);
				setBuying(itemId);
				try {
					const data = await (await fetch("/api/devquest/shop/buy", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ itemId })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.shopBought"));
					else {
						const err = apiErrorOf(data);
						notify(false, data.reason === "insufficient-balance" ? t("dq.shopNoBalance") : err ?? t("dq.opFailed"));
					}
				} catch {
					notify(false, t("dq.opFailed"));
				} finally {
					setBuying(null);
				}
			}, [
				buying,
				confirmBuyId,
				actions,
				notify,
				t
			]);
			/** 使用任务重掷。 */
			const rerollQuests = (0, react.useCallback)(async () => {
				if (rerolling) return;
				setRerolling(true);
				try {
					const data = await (await fetch("/api/devquest/shop/reroll", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.rerolled"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				} finally {
					setRerolling(false);
				}
			}, [
				rerolling,
				actions,
				notify,
				t
			]);
			/** 每日幸运抽奖。 */
			const claimLuckyDraw = (0, react.useCallback)(async () => {
				if (claimingLucky) return;
				setClaimingLucky(true);
				setLuckyMsg(null);
				try {
					const data = await (await fetch("/api/devquest/lucky", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok && data.reward !== void 0) setLuckyMsg(t("dq.luckyResult", { label: data.reward.label }));
					else if (!data.ok) {
						const err = apiErrorOf(data);
						setLuckyMsg(err !== null ? `⚠️ ${err}` : t("dq.luckyClaimed"));
					}
				} catch {
					setLuckyMsg(t("dq.opFailed"));
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
					notify(true, t("dq.exported"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [notify, t]);
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
					if (data.ok) notify(true, t("dq.imported"));
					else notify(false, apiErrorOf(data) ?? t("dq.importFailed"));
				} catch {
					notify(false, t("dq.importFailed"));
				} finally {
					setImporting(false);
				}
			}, [
				importing,
				actions,
				notify,
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
					if (data.ok) notify(true, t("dq.titleSwitched"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			/** 切换已拥有主题（空 = 默认主题）。 */
			const activateTheme = (0, react.useCallback)(async (themeId) => {
				try {
					const data = await (await fetch("/api/devquest/shop/theme", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ themeId })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.themeUsed"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			const setGoalF = (0, react.useCallback)(async (goal) => {
				try {
					const data = await (await fetch("/api/devquest/daily-goal/set", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ goal })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, goal > 0 ? t("dq.dailyGoalSet") : t("dq.dailyGoalOff"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			const claimDailyGoalF = (0, react.useCallback)(async () => {
				try {
					const data = await (await fetch("/api/devquest/daily-goal/claim", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) {
						notify(true, t("dq.dailyGoalClaim", { xp: data.gained }));
						playSfx("goal");
					} else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			/** v1.3.0 领取每周 BOSS 掉落。 */
			const claimBossF = (0, react.useCallback)(async () => {
				try {
					const data = await (await fetch("/api/devquest/weekly-boss/claim", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) {
						notify(true, t("dq.bossDefeat", {
							name: state.status?.weekly?.boss.name ?? "",
							n: data.gained
						}));
						playSfx("boss");
					} else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				state.status,
				t
			]);
			/** 领取赛季通行证档位奖励。 */
			const claimPassTier = (0, react.useCallback)(async (tierId) => {
				try {
					const data = await (await fetch("/api/devquest/pass/claim", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ tierId })
					})).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.passClaimed", { xp: data.gained }));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			/** 使用任务跳过卡。 */
			const useQuestSkipCard = (0, react.useCallback)(async () => {
				try {
					const data = await (await fetch("/api/devquest/shop/quest-skip", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.skipUsed"));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				}
			}, [
				actions,
				notify,
				t
			]);
			/** 领取每周全清奖励。 */
			const claimWeekly = (0, react.useCallback)(async () => {
				if (weeklyClaiming) return;
				setWeeklyClaiming(true);
				try {
					const data = await (await fetch("/api/devquest/weekly-bonus", { method: "POST" })).json();
					if (data.status !== null && data.status !== void 0) actions.setStatus(data.status);
					if (data.ok) notify(true, t("dq.weeklyClaimed", { xp: data.gained }));
					else notify(false, apiErrorOf(data) ?? t("dq.opFailed"));
				} catch {
					notify(false, t("dq.opFailed"));
				} finally {
					setWeeklyClaiming(false);
				}
			}, [
				weeklyClaiming,
				actions,
				notify,
				t
			]);
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
					ctx.fillText(`赛季 ${s.season} · ${s.seasonXp} XP   ·   成就 ${s.achievements.filter((a) => a.unlocked).length}/${s.achievements.length}`, 36, 270);
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
					notify(true, t("dq.shareDone"));
				} catch {
					notify(false, t("dq.shareFailed"));
				} finally {
					setSharing(false);
				}
			}, [
				sharing,
				state.status,
				notify,
				t
			]);
			/** 生成赛季报告分享卡片（canvas → PNG 下载）。 */
			const shareSeason = (0, react.useCallback)(async () => {
				if (sharing || state.status === null) return;
				setSharing(true);
				try {
					const s = state.status;
					const c = s.counters;
					const canvas = document.createElement("canvas");
					canvas.width = 640;
					canvas.height = 460;
					const ctx = canvas.getContext("2d");
					if (ctx === null) throw new Error("no-canvas");
					const grad = ctx.createLinearGradient(0, 0, 640, 460);
					grad.addColorStop(0, "#101722");
					grad.addColorStop(1, "#1d2735");
					ctx.fillStyle = grad;
					ctx.fillRect(0, 0, 640, 460);
					ctx.strokeStyle = "rgba(246,198,82,0.5)";
					ctx.lineWidth = 2;
					ctx.strokeRect(12, 12, 616, 436);
					ctx.fillStyle = "#8ec5ff";
					ctx.font = "700 22px \"Segoe UI\", sans-serif";
					ctx.fillText("⚔️ DevQuest · 赛季报告", 36, 56);
					ctx.fillStyle = "#9daabd";
					ctx.font = "500 16px \"Segoe UI\", sans-serif";
					ctx.fillText(`赛季 ${s.season} · Lv.${s.level} ${s.title.zh}`, 36, 84);
					ctx.fillStyle = "#f2f6fc";
					ctx.font = "600 18px \"Segoe UI\", sans-serif";
					ctx.fillText(`本赛季 XP: ${s.seasonXp}`, 36, 130);
					ctx.fillText(`最高连击: ${Math.max(c.consecutiveSuccess, ...(s.records ?? []).map((r) => r.combo))}`, 36, 162);
					ctx.fillText(`连续活跃: ${s.streak?.best ?? c.streakDays} 天`, 36, 194);
					ctx.fillText(`成就: ${s.achievements.filter((a) => a.unlocked).length}/${s.achievements.length}`, 36, 226);
					ctx.fillStyle = "#f6c652";
					ctx.font = "600 15px \"Segoe UI\", sans-serif";
					ctx.fillText("工具 TOP5", 36, 268);
					ctx.fillStyle = "#9daabd";
					ctx.font = "500 15px \"Segoe UI\", sans-serif";
					const top = Object.entries(c.toolCallsByTool).sort((a, b) => b[1] - a[1]).slice(0, 5);
					for (let i = 0; i < top.length; i++) ctx.fillText(`${i + 1}. ${top[i][0]}  ${top[i][1]}`, 36, 292 + i * 26);
					ctx.fillStyle = "#718096";
					ctx.font = "400 13px \"Segoe UI\", sans-serif";
					ctx.fillText("DevQuest — 把开发变成 RPG", 36, 440);
					const a = document.createElement("a");
					a.href = canvas.toDataURL("image/png");
					a.download = `devquest-season-${s.season}.png`;
					a.click();
					notify(true, t("dq.shareDone"));
				} catch {
					notify(false, t("dq.shareFailed"));
				} finally {
					setSharing(false);
				}
			}, [
				sharing,
				state.status,
				notify,
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
			const wallItems = status.achievements.filter((a) => a.category === category).filter((a) => {
				if (wallSearch.trim() !== "") {
					const q = wallSearch.trim().toLowerCase();
					if (!a.name.zh.toLowerCase().includes(q) && !a.name.en.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
				}
				if (wallRarity !== "all" && a.rarity !== wallRarity) return false;
				if (wallStatus === "unlocked" && !a.unlocked) return false;
				if (wallStatus === "locked" && a.unlocked) return false;
				return true;
			});
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
					...dragging ? cardDraggingStyle : {},
					...themeVars(status.shop?.theme ?? ""),
					"--dq-fsz": String(settings.fontSize),
					...settings.compact ? {
						"--dq-section-mb": "6px",
						"--dq-body-pad": "8px 10px 10px",
						"--dq-head-pad": "4px 8px",
						"--dq-hero-mb": "8px"
					} : {}
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
						status.version !== void 0 && status.version !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: versionLabelStyle,
							title: t("dq.version"),
							children: status.version
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: expandAll,
							"aria-label": t("dq.expandAll"),
							title: t("dq.expandAll"),
							style: iconButtonStyle,
							children: "⤢"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: collapseAll,
							"aria-label": t("dq.collapseAll"),
							title: t("dq.collapseAll"),
							style: iconButtonStyle,
							children: "⤡"
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeroSection, {
							status,
							t,
							c,
							percent,
							refresh,
							claimPassTier
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SeasonSummaryCard, {
							status,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DailyGoalCard, {
							status,
							t,
							claimDailyGoalF
						}),
						panelMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: panelMsgStyle(panelMsg.ok),
							role: "status",
							children: [panelMsg.ok ? "✅ " : "⚠️ ", panelMsg.text]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RitualSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							questReminderMsg
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LuckyRow, {
							status,
							t,
							claimingLucky,
							luckyMsg,
							claimLuckyDraw
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DailySection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							claiming,
							claimChest
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WeeklySection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							weeklyClaiming,
							claimBossF,
							claimWeekly
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShopSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							buying,
							confirmBuyId,
							buy,
							rerolling,
							rerollQuests,
							useQuestSkipCard
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkinsSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							buying,
							confirmBuyId,
							buy,
							activateTheme
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TutorialSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TitlesSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							sharing,
							shareCard,
							shareSeason,
							switchTitle
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionsSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							importing,
							exportSave,
							importSave
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PokedexSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							unlocked
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecentSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							state,
							recent
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WallSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							category,
							setCategory,
							wallSearch,
							setWallSearch,
							wallRarity,
							setWallRarity,
							wallStatus,
							setWallStatus,
							hover,
							setHover,
							wallItems,
							milestone,
							unlocked
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReportSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalendarSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							c
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsSection, {
							collapsedMap: collapsed,
							toggle: toggleSection,
							status,
							t,
							settings,
							updateSettings,
							setGoalF
						})
					]
				})]
			});
		}
		/** 统一 toast 分发：成就解锁 / 回合结算。 */
		function DevQuestToast(props) {
			const { toast, status, actions, t } = props;
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => actions.dismissToast(toast.id), 6e3);
				if (toast.kind === "achievement") {
					const settings = loadSettings();
					if (settings.sound) playSfx("achievement");
					if (settings.notify && typeof Notification !== "undefined" && Notification.permission === "granted") try {
						const def = status.achievements.find((a) => a.id === toast.achievementId);
						new Notification("DevQuest", { body: def !== void 0 ? `🏆 ${def.name.zh} +${def.xp} XP` : "成就解锁！" });
					} catch {}
				} else if (toast.kind === "settlement" && toast.settlement?.leveledUp === true) {
					if (loadSettings().sound) playSfx("levelup");
				}
				return () => clearTimeout(timer);
			}, [
				toast.id,
				toast.kind,
				toast.achievementId,
				toast.settlement,
				actions,
				status.achievements
			]);
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
							style: { fontSize: "calc(18px * var(--dq-fsz, 1))" },
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
						style: { fontSize: "calc(18px * var(--dq-fsz, 1))" },
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
											fontSize: "calc(9px * var(--dq-fsz, 1))",
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
				fetchUiSettings();
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
					children: (() => {
						const filter = loadSettings().toastFilter;
						return (filter === "off" ? [] : state.toasts.filter((toast) => {
							if (filter === "all") return true;
							if (toast.kind !== "achievement") return true;
							const def = state.status?.achievements.find((a) => a.id === toast.achievementId);
							return def !== void 0 && rarityWeight(def.rarity) >= rarityWeight("rare");
						})).map((toast) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DevQuestToast, {
							toast,
							status: state.status,
							actions,
							t
						}, toast.id));
					})()
				}),
				celebration !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: celebrationOverlayStyle,
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: celebrationInnerStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: "calc(64px * var(--dq-fsz, 1))",
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
			"dq.wallSearch": "搜索成就…",
			"dq.wallNoMatch": "没有匹配的成就",
			"dq.wallRarityAll": "全部稀有度",
			"dq.wallStatusAll": "全部状态",
			"dq.wallStatusUnlocked": "已解锁",
			"dq.wallStatusLocked": "未解锁",
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
			"dq.version": "插件版本号",
			"dq.expandAll": "全部展开",
			"dq.collapseAll": "全部折叠",
			"dq.streakBest": "历史最高连续 {best} 天",
			"dq.streakNext": "下一档 +{xp} XP",
			"dq.pass": "赛季通行证",
			"dq.passClaimed": "通行证奖励 +{xp} XP",
			"dq.ritual": "今日开工",
			"dq.ritualGreeting": "Lv.{level}，今天也要加油！",
			"dq.ritualYesterday": "昨天 +{xp} XP · {turns} 回合",
			"dq.ritualFirst": "今天开始你的第一条冒险吧",
			"dq.pokedex": "收藏图鉴",
			"dq.pokedexOverall": "总完成度 {pct}%",
			"dq.pokedexAch": "成就",
			"dq.pokedexSkin": "皮肤",
			"dq.pokedexTitle": "称号",
			"dq.shopSkip": "跳过任务",
			"dq.skipUsed": "已跳过 1 个任务",
			"dq.reminder": "今天还有 {n} 个每日任务没完成，趁现在做完吧！",
			"dq.shareSeason": "赛季报告",
			"dq.settings": "设置",
			"dq.settingsFont": "字号",
			"dq.settingsCompact": "紧凑模式",
			"dq.settingsToast": "通知过滤",
			"dq.settingsToastAll": "全部通知",
			"dq.settingsToastRare": "仅稀有以上",
			"dq.settingsToastOff": "关闭通知",
			"dq.dailyGoal": "今日目标",
			"dq.dailyGoalSet": "设定今日 XP 目标",
			"dq.dailyGoalOff": "关闭",
			"dq.dailyGoalClaim": "🎯 领取 +{xp} XP",
			"dq.dailyGoalClaimed": "今日目标已达成 ✓",
			"dq.dailyGoalProgress": "{xp} / {goal} XP",
			"dq.dailyGoalHint": "今日目标 · 达成领奖",
			"dq.classLabel": "职业",
			"dq.classNone": "未定（多用工具解锁职业）",
			"dq.boss": "每周 BOSS",
			"dq.bossHp": "{damage} / {hp}",
			"dq.bossDefeat": "⚔️ 击败 {name}！领取 +{n} 赛季货币",
			"dq.bossClaimed": "BOSS 掉落已领取",
			"dq.bossProgress": "完成全部周挑战击败 BOSS",
			"dq.seasonSummary": "上赛季结算",
			"dq.seasonSummaryTitle": "赛季 {season} · Lv.{level}",
			"dq.seasonSummaryMeta": "最高连击 {combo} · 赛季 XP {xp} · 成就 {n} 枚",
			"dq.seasonSummaryReward": "赛季纪念奖励 +200 XP 已入账",
			"dq.sound": "音效提示",
			"dq.notify": "桌面通知",
			"dq.on": "开",
			"dq.off": "关",
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
			"dq.themeActive": "使用中",
			"dq.themeUse": "使用",
			"dq.themeUsed": "已切换主题",
			"dq.skins": "主题皮肤",
			"dq.skinDefault": "默认主题",
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
			"dq.opFailed": "操作失败",
			"dq.titleSwitched": "已切换称号",
			"dq.rerolled": "任务已重掷",
			"dq.weeklyClaimed": "全清周奖励 +{xp} XP",
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
			"dq.wallSearch": "Search…",
			"dq.wallNoMatch": "No matching achievements",
			"dq.wallRarityAll": "Any rarity",
			"dq.wallStatusAll": "Any status",
			"dq.wallStatusUnlocked": "Unlocked",
			"dq.wallStatusLocked": "Locked",
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
			"dq.version": "Plugin version",
			"dq.expandAll": "Expand all",
			"dq.collapseAll": "Collapse all",
			"dq.streakBest": "Best: {best} days",
			"dq.streakNext": "Next tier +{xp} XP",
			"dq.pass": "Season pass",
			"dq.passClaimed": "Pass reward +{xp} XP",
			"dq.ritual": "Today",
			"dq.ritualGreeting": "Lv.{level} — let's go!",
			"dq.ritualYesterday": "Yesterday +{xp} XP · {turns} turns",
			"dq.ritualFirst": "Start your first adventure today",
			"dq.pokedex": "Collection",
			"dq.pokedexOverall": "{pct}% complete",
			"dq.pokedexAch": "Achievements",
			"dq.pokedexSkin": "Skins",
			"dq.pokedexTitle": "Titles",
			"dq.shopSkip": "Skip quest",
			"dq.skipUsed": "Skipped 1 quest",
			"dq.reminder": "{n} daily quests left today — finish them!",
			"dq.shareSeason": "Season report",
			"dq.settings": "Settings",
			"dq.settingsFont": "Font size",
			"dq.settingsCompact": "Compact mode",
			"dq.settingsToast": "Toast filter",
			"dq.settingsToastAll": "All toasts",
			"dq.settingsToastRare": "Rare+ only",
			"dq.settingsToastOff": "Toasts off",
			"dq.dailyGoal": "Daily goal",
			"dq.dailyGoalSet": "Set today's XP goal",
			"dq.dailyGoalOff": "Off",
			"dq.dailyGoalClaim": "🎯 Claim +{xp} XP",
			"dq.dailyGoalClaimed": "Daily goal reached ✓",
			"dq.dailyGoalProgress": "{xp} / {goal} XP",
			"dq.dailyGoalHint": "Daily goal · claim when reached",
			"dq.classLabel": "Class",
			"dq.classNone": "Undecided (use more tools to pick a class)",
			"dq.boss": "Weekly boss",
			"dq.bossHp": "{damage} / {hp}",
			"dq.bossDefeat": "⚔️ Defeated {name}! Claim +{n} season currency",
			"dq.bossClaimed": "Boss reward claimed",
			"dq.bossProgress": "Finish all weekly quests to slay the boss",
			"dq.seasonSummary": "Last season wrap-up",
			"dq.seasonSummaryTitle": "Season {season} · Lv.{level}",
			"dq.seasonSummaryMeta": "Best combo {combo} · Season XP {xp} · {n} achievements",
			"dq.seasonSummaryReward": "Season memento +200 XP granted",
			"dq.sound": "Sound effects",
			"dq.notify": "Desktop notifications",
			"dq.on": "On",
			"dq.off": "Off",
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
			"dq.themeActive": "Active",
			"dq.themeUse": "Use",
			"dq.themeUsed": "Theme switched",
			"dq.skins": "Theme Skins",
			"dq.skinDefault": "Default theme",
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
			"dq.opFailed": "Operation failed",
			"dq.titleSwitched": "Title switched",
			"dq.rerolled": "Quests rerolled",
			"dq.weeklyClaimed": "Weekly bonus +{xp} XP",
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