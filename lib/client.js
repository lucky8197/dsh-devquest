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
					seen: []
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
						if (!(draft.status === null)) for (const id of unlockedIds) {
							if (draft.seen.includes(id)) continue;
							draft.toasts.push({
								id: `${id}-${Date.now()}`,
								achievementId: id,
								at: Date.now()
							});
						}
						draft.seen = Array.from(/* @__PURE__ */ new Set([...draft.seen, ...unlockedIds]));
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
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...titleTextStyle,
												...titleToneStyle(status.level)
											},
											children: status.title.zh
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: seasonStyle,
											children: t("dq.season", { season: status.season })
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
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: sectionStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: sectionHeadStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: sectionTitleStyle,
									children: ["📅 ", t("dq.daily")]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: updatedStyle,
									children: status.daily?.date ?? ""
								})]
							}), (status.daily?.quests ?? []).map((q) => {
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							}), wallOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
												...locked ? a.hidden ? wallCellHiddenLockedStyle : wallCellLockedStyle : wallCellUnlockedStyle
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
													children: visible ? a.icon : "🔒"
												}),
												!a.hidden && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														...wallXpStyle,
														...a.unlocked ? wallXpUnlockedStyle : {}
													},
													children: ["+", a.xp]
												})
											]
										}, a.id);
									})
								}),
								hover !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AchievementTooltip, {
									hover,
									t
								})
							] })]
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...tooltipStyle,
					left: hover.x,
					top: hover.y
				},
				role: "tooltip",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: tooltipHeadStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { fontSize: 20 },
						children: visible ? a.icon : "🔒"
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: tooltipDescStyle,
					children: visible ? a.description.zh : t("dq.hiddenHint")
				})]
			});
		}
		function AchievementToast(props) {
			const { toast, status, actions, t } = props;
			const def = status.achievements.find((a) => a.id === toast.achievementId);
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => actions.dismissToast(toast.id), 6e3);
				return () => clearTimeout(timer);
			}, [toast.id, actions]);
			if (def === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: toastStyle,
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontSize: 18 },
						children: def.icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: toastTitleStyle,
								children: t("dq.unlocked")
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DevQuestPanelCard, {
				useStore,
				actions,
				t,
				refresh
			}), state.toasts.length > 0 && state.status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: toastStackStyle,
				children: state.toasts.map((toast) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AchievementToast, {
					toast,
					status: state.status,
					actions,
					t
				}, toast.id))
			})] });
		}
		const cardStyle = {
			position: "fixed",
			width: 330,
			maxHeight: "calc(100vh - 32px)",
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