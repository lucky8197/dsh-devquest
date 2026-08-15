import { createHash } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/achievements.js
const SSH_TOOLS = /* @__PURE__ */ new Set([
	"ssh_exec",
	"ssh_upload",
	"ssh_download",
	"ssh_tunnel",
	"ssh_cluster",
	"ssh_list"
]);
function toolCount(c, tool) {
	return c.toolCallsByTool[tool] ?? 0;
}
function anyTool(c, tools) {
	return tools.some((t) => toolCount(c, t) > 0);
}
/** 本地时区小时（0-23）。 */
function hourOf(now) {
	return new Date(now).getHours();
}
/** 本地时区分钟。 */
function minuteOf(now) {
	return new Date(now).getMinutes();
}
const ACHIEVEMENTS = [
	{
		id: "first_turn",
		category: "journey",
		name: {
			zh: "初出茅庐",
			en: "First Steps"
		},
		description: {
			zh: "完成首个回合",
			en: "Complete your first turn"
		},
		icon: "🚶",
		xp: 50,
		check: (s) => s.counters.turnsCompleted >= 1
	},
	{
		id: "turns_10",
		category: "journey",
		name: {
			zh: "十回合老兵",
			en: "Veteran"
		},
		description: {
			zh: "累计完成 10 个回合",
			en: "Complete 10 turns in total"
		},
		icon: "🎖️",
		xp: 100,
		check: (s) => s.counters.turnsCompleted >= 10
	},
	{
		id: "turns_50",
		category: "journey",
		name: {
			zh: "五十回合",
			en: "Half Century"
		},
		description: {
			zh: "累计完成 50 个回合",
			en: "Complete 50 turns in total"
		},
		icon: "🏅",
		xp: 250,
		check: (s) => s.counters.turnsCompleted >= 50
	},
	{
		id: "turns_100",
		category: "journey",
		name: {
			zh: "百回合大师",
			en: "Centurion"
		},
		description: {
			zh: "累计完成 100 个回合",
			en: "Complete 100 turns in total"
		},
		icon: "🏆",
		xp: 500,
		check: (s) => s.counters.turnsCompleted >= 100
	},
	{
		id: "comeback",
		category: "journey",
		name: {
			zh: "东山再起",
			en: "Comeback"
		},
		description: {
			zh: "首次失误后重新完成一个回合",
			en: "Complete a turn after your first failure"
		},
		icon: "💪",
		xp: 100,
		check: (s) => s.counters.turnsFailed >= 1 && s.counters.turnsCompleted >= 1
	},
	{
		id: "steel_will",
		category: "journey",
		name: {
			zh: "钢铁意志",
			en: "Iron Will"
		},
		description: {
			zh: "连续 25 个回合零失误",
			en: "25 consecutive turns without failure"
		},
		icon: "🛡️",
		xp: 400,
		check: (s) => s.counters.consecutiveSuccess >= 25
	},
	{
		id: "turns_25",
		category: "journey",
		name: {
			zh: "二十五回合",
			en: "Quarter"
		},
		description: {
			zh: "累计完成 25 个回合",
			en: "Complete 25 turns in total"
		},
		icon: "🎗️",
		xp: 150,
		check: (s) => s.counters.turnsCompleted >= 25
	},
	{
		id: "turns_250",
		category: "journey",
		name: {
			zh: "两百五十回合",
			en: "Stone Giant"
		},
		description: {
			zh: "累计完成 250 个回合",
			en: "Complete 250 turns in total"
		},
		icon: "🗿",
		xp: 750,
		check: (s) => s.counters.turnsCompleted >= 250
	},
	{
		id: "comeback_10",
		category: "journey",
		name: {
			zh: "百折不挠",
			en: "Unbreakable"
		},
		description: {
			zh: "10 次失误后重新站起来",
			en: "Rise again after 10 failures"
		},
		icon: "🔄",
		xp: 300,
		check: (s) => s.counters.comebacks >= 10
	},
	{
		id: "first_edit",
		category: "crafting",
		name: {
			zh: "初试锋芒",
			en: "First Edit"
		},
		description: {
			zh: "首次成功调用编辑工具",
			en: "Call an editing tool for the first time"
		},
		icon: "✏️",
		xp: 50,
		check: (s) => toolCount(s.counters, "edit") + toolCount(s.counters, "str-replace-editor") >= 1
	},
	{
		id: "edits_100",
		category: "crafting",
		name: {
			zh: "百炼成钢",
			en: "Hundred Edits"
		},
		description: {
			zh: "累计 100 次编辑/写入",
			en: "100 edits or writes in total"
		},
		icon: "⚒️",
		xp: 200,
		check: (s) => s.counters.craftTools >= 100
	},
	{
		id: "first_cmd",
		category: "crafting",
		name: {
			zh: "号令天下",
			en: "First Command"
		},
		description: {
			zh: "首次调用命令行工具",
			en: "Run a shell command for the first time"
		},
		icon: "⌨️",
		xp: 50,
		check: (s) => anyTool(s.counters, ["pwsh", "bash"])
	},
	{
		id: "first_remote",
		category: "crafting",
		name: {
			zh: "远洋航行",
			en: "Voyager"
		},
		description: {
			zh: "首次调用 SSH 远程工具",
			en: "Use an SSH tool for the first time"
		},
		icon: "🛰️",
		xp: 100,
		check: (s) => anyTool(s.counters, [...SSH_TOOLS])
	},
	{
		id: "first_subagent",
		category: "crafting",
		name: {
			zh: "运筹帷幄",
			en: "Strategist"
		},
		description: {
			zh: "首次派出子代理",
			en: "Spawn your first subagent"
		},
		icon: "🧠",
		xp: 150,
		check: (s) => s.counters.subagentsSpawned >= 1
	},
	{
		id: "tool_666",
		category: "crafting",
		name: {
			zh: "恶魔的低语",
			en: "Whisper of 666"
		},
		description: {
			zh: "累计 666 次工具调用",
			en: "666 tool calls in total"
		},
		icon: "😈",
		xp: 666,
		hidden: true,
		check: (s) => s.counters.toolCalls >= 666
	},
	{
		id: "cmd_100",
		category: "crafting",
		name: {
			zh: "百战之身",
			en: "Hundred Commands"
		},
		description: {
			zh: "累计调用命令行工具 100 次",
			en: "Run 100 shell commands in total"
		},
		icon: "🖥️",
		xp: 200,
		check: (s) => toolCount(s.counters, "pwsh") + toolCount(s.counters, "bash") >= 100
	},
	{
		id: "tools_250",
		category: "crafting",
		name: {
			zh: "千锤百炼",
			en: "Toolsmith"
		},
		description: {
			zh: "累计 250 次工具调用",
			en: "250 tool calls in total"
		},
		icon: "🔩",
		xp: 300,
		check: (s) => s.counters.toolCalls >= 250
	},
	{
		id: "subagents_10",
		category: "crafting",
		name: {
			zh: "将帅之才",
			en: "Commander"
		},
		description: {
			zh: "累计派出 10 个子代理",
			en: "Spawn 10 subagents in total"
		},
		icon: "🤝",
		xp: 300,
		check: (s) => s.counters.subagentsSpawned >= 10
	},
	{
		id: "edits_500",
		category: "crafting",
		name: {
			zh: "铸剑大师",
			en: "Sword Smith"
		},
		description: {
			zh: "累计 500 次编辑/写入",
			en: "500 edits or writes in total"
		},
		icon: "🗜️",
		xp: 400,
		check: (s) => s.counters.craftTools >= 500
	},
	{
		id: "first_todo",
		category: "quest",
		name: {
			zh: "使命开始",
			en: "Quest Accepted"
		},
		description: {
			zh: "完成首个待办",
			en: "Complete your first todo"
		},
		icon: "📜",
		xp: 50,
		check: (s) => s.counters.todosCompleted >= 1
	},
	{
		id: "todos_10",
		category: "quest",
		name: {
			zh: "十全十美",
			en: "Decade"
		},
		description: {
			zh: "累计完成 10 个待办",
			en: "Complete 10 todos in total"
		},
		icon: "✅",
		xp: 150,
		check: (s) => s.counters.todosCompleted >= 10
	},
	{
		id: "todos_50",
		category: "quest",
		name: {
			zh: "使命达人",
			en: "Quest Master"
		},
		description: {
			zh: "累计完成 50 个待办",
			en: "Complete 50 todos in total"
		},
		icon: "🗺️",
		xp: 400,
		check: (s) => s.counters.todosCompleted >= 50
	},
	{
		id: "clean_sweep",
		category: "quest",
		name: {
			zh: "清道夫",
			en: "Clean Sweep"
		},
		description: {
			zh: "单轮全部待办一次清空",
			en: "Clear every todo in a single round"
		},
		icon: "🧹",
		xp: 200,
		check: (s) => s.counters.cleanSweeps >= 1
	},
	{
		id: "daily_quest_10",
		category: "quest",
		name: {
			zh: "日日自新",
			en: "Daily Grind"
		},
		description: {
			zh: "累计完成 10 个每日任务",
			en: "Complete 10 daily quests in total"
		},
		icon: "📅",
		xp: 150,
		check: (s) => s.counters.dailyQuestsDone >= 10
	},
	{
		id: "todos_100",
		category: "quest",
		name: {
			zh: "百事通",
			en: "Century of Todos"
		},
		description: {
			zh: "累计完成 100 个待办",
			en: "Complete 100 todos in total"
		},
		icon: "🏁",
		xp: 600,
		check: (s) => s.counters.todosCompleted >= 100
	},
	{
		id: "daily_quest_30",
		category: "quest",
		name: {
			zh: "任务狂人",
			en: "Quest Machine"
		},
		description: {
			zh: "累计完成 30 个每日任务",
			en: "Complete 30 daily quests in total"
		},
		icon: "🗓️",
		xp: 400,
		check: (s) => s.counters.dailyQuestsDone >= 30
	},
	{
		id: "night_owl",
		category: "time",
		name: {
			zh: "夜猫子",
			en: "Night Owl"
		},
		description: {
			zh: "凌晨 0-5 点完成一个回合",
			en: "Complete a turn between 0-5 AM"
		},
		icon: "🦉",
		xp: 150,
		check: (s) => {
			const h = hourOf(s.counters.lastTurnCompletedAt);
			return s.counters.turnsCompleted >= 1 && h >= 0 && h < 5;
		}
	},
	{
		id: "early_bird",
		category: "time",
		name: {
			zh: "早起的鸟儿",
			en: "Early Bird"
		},
		description: {
			zh: "清晨 5-8 点完成一个回合",
			en: "Complete a turn between 5-8 AM"
		},
		icon: "🐦",
		xp: 100,
		check: (s) => {
			const h = hourOf(s.counters.lastTurnCompletedAt);
			return s.counters.turnsCompleted >= 1 && h >= 5 && h < 8;
		}
	},
	{
		id: "seven_days",
		category: "time",
		name: {
			zh: "七日之约",
			en: "Week Streak"
		},
		description: {
			zh: "连续 7 天活跃",
			en: "Stay active 7 days in a row"
		},
		icon: "📆",
		xp: 300,
		check: (s) => s.counters.streakDays >= 7
	},
	{
		id: "grinder",
		category: "time",
		name: {
			zh: "肝帝",
			en: "Grinder"
		},
		description: {
			zh: "单日完成 50 个回合",
			en: "Complete 50 turns in one day"
		},
		icon: "🔥",
		xp: 500,
		check: (s) => s.counters.completedToday >= 50
	},
	{
		id: "night_owl_10",
		category: "time",
		name: {
			zh: "夜行者",
			en: "Night Walker"
		},
		description: {
			zh: "累计 10 次凌晨回合",
			en: "Finish 10 turns after midnight"
		},
		icon: "🌙",
		xp: 400,
		check: (s) => s.counters.nightTurns >= 10
	},
	{
		id: "streak_30",
		category: "time",
		name: {
			zh: "月度之约",
			en: "Month Streak"
		},
		description: {
			zh: "连续 30 天活跃",
			en: "Stay active 30 days in a row"
		},
		icon: "⭐",
		xp: 800,
		check: (s) => s.counters.streakDays >= 30
	},
	{
		id: "level_5",
		category: "legend",
		name: {
			zh: "工匠之路",
			en: "Artisan Path"
		},
		description: {
			zh: "达到 5 级",
			en: "Reach level 5"
		},
		icon: "🔨",
		xp: 300,
		check: (s) => s.player.level >= 5
	},
	{
		id: "level_10",
		category: "legend",
		name: {
			zh: "锻造宗师",
			en: "Forge Master"
		},
		description: {
			zh: "达到 10 级",
			en: "Reach level 10"
		},
		icon: "⚔️",
		xp: 800,
		check: (s) => s.player.level >= 10
	},
	{
		id: "level_15",
		category: "legend",
		name: {
			zh: "宗师之路",
			en: "Master Path"
		},
		description: {
			zh: "达到 15 级",
			en: "Reach level 15"
		},
		icon: "🛡️",
		xp: 1200,
		check: (s) => s.player.level >= 15
	},
	{
		id: "level_20",
		category: "legend",
		name: {
			zh: "传说降临",
			en: "Legend"
		},
		description: {
			zh: "达到 20 级",
			en: "Reach level 20"
		},
		icon: "👑",
		xp: 2e3,
		check: (s) => s.player.level >= 20
	},
	{
		id: "level_25",
		category: "legend",
		name: {
			zh: "神话之上",
			en: "Mythic"
		},
		description: {
			zh: "达到 25 级",
			en: "Reach level 25"
		},
		icon: "🌟",
		xp: 2500,
		check: (s) => s.player.level >= 25
	},
	{
		id: "level_30",
		category: "legend",
		name: {
			zh: "太阳神",
			en: "Solar Deity"
		},
		description: {
			zh: "达到 30 级",
			en: "Reach level 30"
		},
		icon: "☀️",
		xp: 4e3,
		check: (s) => s.player.level >= 30
	},
	{
		id: "season_100k",
		category: "legend",
		name: {
			zh: "赛季精英",
			en: "Season Elite"
		},
		description: {
			zh: "赛季内输出 100k tokens",
			en: "Output 100k tokens this season"
		},
		icon: "💎",
		xp: 500,
		check: (s) => s.counters.tokensOut >= 1e5
	},
	{
		id: "devil_hour",
		category: "egg",
		name: {
			zh: "魔鬼时刻",
			en: "Devil's Hour"
		},
		description: {
			zh: "凌晨 4:44 仍在行动",
			en: "Be active at 4:44 AM"
		},
		icon: "👹",
		xp: 444,
		hidden: true,
		check: (s) => {
			const at = s.counters.lastActivityAt;
			return at > 0 && hourOf(at) === 4 && minuteOf(at) === 44;
		}
	},
	{
		id: "self_aware",
		category: "egg",
		name: {
			zh: "觉醒",
			en: "Self-Aware"
		},
		description: {
			zh: "agent 主动查询了自己的 DevQuest 进度",
			en: "The agent checks its own DevQuest progress"
		},
		icon: "🤖",
		xp: 233,
		hidden: true,
		check: (s) => s.counters.devquestCalls >= 1
	},
	{
		id: "oops",
		category: "egg",
		name: {
			zh: "手滑",
			en: "Oops"
		},
		description: {
			zh: "工具失败后 1 分钟内同一工具调用成功",
			en: "Succeed with a tool within 1 minute of failing it"
		},
		icon: "🙃",
		xp: 50,
		hidden: true,
		check: (s) => s.counters.oopsFired === true
	},
	{
		id: "thinker",
		category: "egg",
		name: {
			zh: "沉思者",
			en: "Deep Thinker"
		},
		description: {
			zh: "单回合输出 100k tokens",
			en: "Output 100k tokens in a single turn"
		},
		icon: "🧠",
		xp: 500,
		hidden: true,
		check: (s) => s.counters.maxTokensTurn >= 1e5
	},
	{
		id: "jack_of_all",
		category: "egg",
		name: {
			zh: "百变大咖",
			en: "Jack of All Trades"
		},
		description: {
			zh: "单日使用 10 种不同的工具",
			en: "Use 10 different tools in one day"
		},
		icon: "🎭",
		xp: 300,
		hidden: true,
		check: (s) => s.counters.todayTools.length >= 10
	}
];
/** 按 id 查成就（未命中返回 undefined）。 */
function achievementById(id) {
	return ACHIEVEMENTS.find((a) => a.id === id);
}
//#endregion
//#region lib/types/engine.js
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
/** 等级曲线：xpToNext(level) = round(100 × level^1.5)。 */
function xpToNext(level) {
	return Math.round(100 * Math.pow(level, 1.5));
}
/** 按等级取称号。 */
function titleFor(level) {
	let t = TITLES[0];
	for (const cand of TITLES) if (level >= cand.min) t = cand;
	return {
		zh: t.zh,
		en: t.en
	};
}
/** 工具 XP 加成：锻造师工具 +2，其余 +1。 */
const CRAFT_TOOLS = /* @__PURE__ */ new Set([
	"edit",
	"write",
	"str-replace-editor",
	"pwsh",
	"bash",
	"ssh_exec",
	"ssh_upload",
	"ssh_download",
	"ssh_tunnel",
	"ssh_cluster"
]);
function xpForTool(tool) {
	return CRAFT_TOOLS.has(tool) ? 2 : 1;
}
/** 单动作 XP（工具 XP 在 applyTurn 内单独封顶 +10）。 */
function xpForAction(action) {
	switch (action.kind) {
		case "turn-completed": return 10;
		case "turn-failed": return 2;
		case "todo-completed": return 15 * action.count;
		case "tokens": return Math.floor(action.tokens / 1e4);
		default: return 0;
	}
}
/** 日期键 'YYYY-MM-DD'（本地时区）。 */
function dayKey(now) {
	const d = new Date(now);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
/** 每日任务池（每天抽取 DAILY_QUEST_COUNT 个）。 */
const DAILY_QUEST_POOL = [
	{
		id: "dq_turns_5",
		label: {
			zh: "完成 5 个回合",
			en: "Finish 5 turns"
		},
		goal: 5,
		reward: 30,
		progress: (c) => c.turnsCompleted
	},
	{
		id: "dq_turns_15",
		label: {
			zh: "完成 15 个回合",
			en: "Finish 15 turns"
		},
		goal: 15,
		reward: 60,
		progress: (c) => c.turnsCompleted
	},
	{
		id: "dq_turns_30",
		label: {
			zh: "完成 30 个回合",
			en: "Finish 30 turns"
		},
		goal: 30,
		reward: 80,
		progress: (c) => c.turnsCompleted
	},
	{
		id: "dq_tools_20",
		label: {
			zh: "调用 20 次工具",
			en: "Call 20 tools"
		},
		goal: 20,
		reward: 40,
		progress: (c) => c.toolCalls
	},
	{
		id: "dq_tools_50",
		label: {
			zh: "调用 50 次工具",
			en: "Call 50 tools"
		},
		goal: 50,
		reward: 80,
		progress: (c) => c.toolCalls
	},
	{
		id: "dq_tools_100",
		label: {
			zh: "调用 100 次工具",
			en: "Call 100 tools"
		},
		goal: 100,
		reward: 120,
		progress: (c) => c.toolCalls
	},
	{
		id: "dq_edits_10",
		label: {
			zh: "编辑/写入 10 次",
			en: "Edit or write 10 times"
		},
		goal: 10,
		reward: 50,
		progress: (c) => c.craftTools
	},
	{
		id: "dq_edits_20",
		label: {
			zh: "编辑/写入 20 次",
			en: "Edit or write 20 times"
		},
		goal: 20,
		reward: 80,
		progress: (c) => c.craftTools
	},
	{
		id: "dq_cmd_10",
		label: {
			zh: "命令行 10 次",
			en: "Run 10 commands"
		},
		goal: 10,
		reward: 40,
		progress: (c) => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0)
	},
	{
		id: "dq_cmd_20",
		label: {
			zh: "命令行 20 次",
			en: "Run 20 commands"
		},
		goal: 20,
		reward: 70,
		progress: (c) => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0)
	},
	{
		id: "dq_todos_5",
		label: {
			zh: "完成 5 个待办",
			en: "Complete 5 todos"
		},
		goal: 5,
		reward: 60,
		progress: (c) => c.todosCompleted
	},
	{
		id: "dq_todos_10",
		label: {
			zh: "完成 10 个待办",
			en: "Complete 10 todos"
		},
		goal: 10,
		reward: 90,
		progress: (c) => c.todosCompleted
	},
	{
		id: "dq_tokens_50k",
		label: {
			zh: "输出 50k tokens",
			en: "Output 50k tokens"
		},
		goal: 5e4,
		reward: 70,
		progress: (c) => c.tokensOut
	},
	{
		id: "dq_tokens_150k",
		label: {
			zh: "输出 150k tokens",
			en: "Output 150k tokens"
		},
		goal: 15e4,
		reward: 100,
		progress: (c) => c.tokensOut
	},
	{
		id: "dq_subagent_1",
		label: {
			zh: "派出 1 个子代理",
			en: "Spawn 1 subagent"
		},
		goal: 1,
		reward: 60,
		progress: (c) => c.subagentsSpawned
	},
	{
		id: "dq_subagent_2",
		label: {
			zh: "派出 2 个子代理",
			en: "Spawn 2 subagents"
		},
		goal: 2,
		reward: 80,
		progress: (c) => c.subagentsSpawned
	},
	{
		id: "dq_ssh_1",
		label: {
			zh: "使用 1 次 SSH",
			en: "Use SSH once"
		},
		goal: 1,
		reward: 100,
		progress: (c) => (c.toolCallsByTool.ssh_exec ?? 0) + (c.toolCallsByTool.ssh_upload ?? 0) + (c.toolCallsByTool.ssh_download ?? 0) + (c.toolCallsByTool.ssh_tunnel ?? 0) + (c.toolCallsByTool.ssh_cluster ?? 0) + (c.toolCallsByTool.ssh_list ?? 0)
	},
	{
		id: "dq_comeback_1",
		label: {
			zh: "失误后重新站起来",
			en: "Rise after a failure"
		},
		goal: 1,
		reward: 80,
		progress: (c) => c.comebacks
	},
	{
		id: "dq_night_1",
		label: {
			zh: "凌晨完成 1 个回合",
			en: "Finish a turn after midnight"
		},
		goal: 1,
		reward: 90,
		progress: (c) => c.nightTurns
	},
	{
		id: "dq_distinct_8",
		label: {
			zh: "使用 8 种不同工具",
			en: "Use 8 different tools"
		},
		goal: 8,
		reward: 100,
		progress: (c) => c.todayTools.length
	},
	{
		id: "dq_checkin_1",
		label: {
			zh: "查看 1 次进度",
			en: "Check your progress"
		},
		goal: 1,
		reward: 20,
		progress: (c) => c.devquestCalls
	}
];
/** 确定性 PRNG（按日期字符串做种子）：同一天所有会话与重启看到相同的任务。 */
function seededRng(seed) {
	let h = 2166136261;
	for (const ch of seed) {
		h ^= ch.codePointAt(0) ?? 0;
		h = Math.imul(h, 16777619);
	}
	let state = h >>> 0;
	return () => {
		state = state + 1831565813 | 0;
		let t = Math.imul(state ^ state >>> 15, 1 | state);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务）。 */
function rollDailyQuests(now) {
	const date = dayKey(now);
	const rng = seededRng(date);
	const pool = [...DAILY_QUEST_POOL];
	const quests = [];
	for (let i = 0; i < 3 && pool.length > 0; i++) {
		const idx = Math.floor(rng() * pool.length);
		const def = pool.splice(idx, 1)[0];
		quests.push({
			id: def.id,
			label: def.label,
			goal: def.goal,
			reward: def.reward,
			progress: 0,
			done: false
		});
	}
	return {
		date,
		quests
	};
}
/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
function ensureDaily(save, now) {
	if (save.daily.date !== dayKey(now)) save.daily = rollDailyQuests(now);
	return save.daily;
}
/** 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。 */
function applyDaily(save, now) {
	const daily = ensureDaily(save, now);
	let gain = 0;
	for (const q of daily.quests) {
		if (q.done) continue;
		const def = DAILY_QUEST_POOL.find((d) => d.id === q.id);
		if (def === void 0) continue;
		q.progress = Math.min(def.progress(save.counters), q.goal);
		if (q.progress >= q.goal) {
			q.done = true;
			q.claimedAt = now;
			save.counters.dailyQuestsDone++;
			gain += q.reward;
		}
	}
	return gain;
}
/** 构造最小计数器。 */
function freshCounters() {
	return {
		turnsCompleted: 0,
		turnsFailed: 0,
		consecutiveSuccess: 0,
		toolCalls: 0,
		toolCallsByTool: {},
		craftTools: 0,
		todosCompleted: 0,
		cleanSweeps: 0,
		tokensOut: 0,
		subagentsSpawned: 0,
		devquestCalls: 0,
		activeDays: 0,
		streakDays: 0,
		lastActiveDay: "",
		lastActivityAt: 0,
		completedToday: 0,
		completedDay: "",
		lastTurnCompletedAt: 0,
		oopsFired: false,
		dailyQuestsDone: 0,
		comebacks: 0,
		nightTurns: 0,
		maxTokensTurn: 0,
		todayTools: [],
		todayToolsDay: ""
	};
}
/** 构造最小玩家状态。 */
function freshPlayer(season) {
	return {
		level: 1,
		xp: 0,
		xpTotal: 0,
		title: titleFor(1).zh,
		season
	};
}
/** 构造最小存档。 */
function freshSave(cwd, season, now = Date.now()) {
	return {
		version: 1,
		cwd,
		player: freshPlayer(season),
		counters: freshCounters(),
		achievements: {},
		lastSeqBySession: {},
		daily: rollDailyQuests(now),
		updatedAt: now
	};
}
/**
* 加 XP 并处理升级与活跃日统计（返回副本；原存档不变）。
*/
function addXp(save, gain, now = Date.now()) {
	const s = structuredClone(save);
	if (gain > 0) {
		s.player.xp += gain;
		s.player.xpTotal += gain;
	}
	while (s.player.xp >= xpToNext(s.player.level)) {
		s.player.xp -= xpToNext(s.player.level);
		s.player.level++;
	}
	s.player.title = titleFor(s.player.level).zh;
	const c = s.counters;
	c.lastActivityAt = now;
	const today = dayKey(now);
	const yesterday = dayKey(now - 864e5);
	if (c.lastActiveDay !== today) {
		c.streakDays = c.lastActiveDay === yesterday ? c.streakDays + 1 : 1;
		c.activeDays++;
		c.lastActiveDay = today;
	}
	s.updatedAt = now;
	return s;
}
/**
* 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
* completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
*/
function applyTurn(save, actions, now = Date.now()) {
	const s = structuredClone(save);
	const c = s.counters;
	let toolGain = 0;
	let gain = 0;
	let turnTokens = 0;
	for (const a of actions) {
		if (a.kind === "tool-call") toolGain += xpForTool(a.tool);
		else gain += xpForAction(a);
		switch (a.kind) {
			case "tool-call":
				c.toolCalls++;
				c.toolCallsByTool[a.tool] = (c.toolCallsByTool[a.tool] ?? 0) + 1;
				if (CRAFT_TOOLS.has(a.tool)) c.craftTools++;
				if (a.tool === "devquest_status") c.devquestCalls++;
				const todayToolsDay = dayKey(now);
				if (c.todayToolsDay !== todayToolsDay) {
					c.todayToolsDay = todayToolsDay;
					c.todayTools = [];
				}
				if (!c.todayTools.includes(a.tool)) c.todayTools.push(a.tool);
				if (c.lastErrorTool === a.tool && c.lastErrorAt !== void 0 && now > c.lastErrorAt && now - c.lastErrorAt <= 6e4) c.oopsFired = true;
				c.lastSuccessTool = a.tool;
				c.lastSuccessAt = now;
				break;
			case "tool-failed":
				c.lastErrorTool = a.tool;
				c.lastErrorAt = now;
				break;
			case "todo-completed":
				c.todosCompleted += a.count;
				if (a.allCompleted === true) c.cleanSweeps++;
				break;
			case "tokens":
				c.tokensOut += a.tokens;
				turnTokens += a.tokens;
				break;
			case "subagent": c.subagentsSpawned += a.depth > 0 ? 1 : 0;
		}
	}
	if (turnTokens > c.maxTokensTurn) c.maxTokensTurn = turnTokens;
	gain += Math.min(toolGain, 10);
	const completed = actions.some((a) => a.kind === "turn-completed");
	const failed = actions.some((a) => a.kind === "turn-failed");
	if (completed) {
		if (c.consecutiveSuccess === 0 && c.turnsFailed > 0) c.comebacks++;
		c.turnsCompleted++;
		c.consecutiveSuccess++;
		c.lastTurnCompletedAt = now;
		const h = new Date(now).getHours();
		if (h >= 0 && h < 5) c.nightTurns++;
		const today = dayKey(now);
		if (c.completedDay === today) c.completedToday++;
		else {
			c.completedDay = today;
			c.completedToday = 1;
		}
		if (c.consecutiveSuccess >= 30) gain = Math.round(gain * 2.5);
		else if (c.consecutiveSuccess >= 15) gain = Math.round(gain * 2);
		else if (c.consecutiveSuccess >= 5) gain = Math.round(gain * 1.5);
	} else if (failed) {
		c.turnsFailed++;
		c.consecutiveSuccess = 0;
	}
	gain = Math.min(gain, 125);
	const questGain = applyDaily(s, now);
	return addXp(s, gain + questGain, now);
}
/**
* 成就判定：返回新解锁的成就 id 列表（一次性；已解锁的不重复）。
* 副作用仅限对传入存档副本写入成就记录。
*/
function checkAchievements(defs, save, now = Date.now()) {
	const unlocked = [];
	for (const d of defs) {
		if (save.achievements[d.id]) continue;
		if (d.check(save, now)) {
			save.achievements[d.id] = {
				acquiredAt: now,
				xp: d.xp
			};
			unlocked.push(d.id);
		}
	}
	return unlocked;
}
/** 存档迁移/补全：把旧版本或缺失字段的存档升级为当前结构。 */
function migrateSave(raw, cwd, season) {
	const base = freshSave(cwd, season, raw.updatedAt ?? Date.now());
	if (!raw || typeof raw !== "object") return base;
	const out = {
		...base,
		...raw,
		cwd,
		player: {
			...base.player,
			...raw.player ?? {}
		},
		counters: {
			...base.counters,
			...raw.counters ?? {}
		},
		achievements: raw.achievements ?? {},
		lastSeqBySession: raw.lastSeqBySession ?? {},
		daily: raw.daily ?? base.daily
	};
	out.version = Math.max(1, raw.version ?? 1);
	out.player.title = titleFor(out.player.level).zh;
	return out;
}
//#endregion
//#region lib/types/listener.js
/**
* 订阅 session/event，逐事件去重并归一化，回调收到 (session, aggregate, action)。
* 返回取消订阅函数（随 ctx 生命周期自动清理）。
*/
function watchEvents(ctx, onAction) {
	const aggregates = /* @__PURE__ */ new Map();
	return ctx.on("session/event", (session, event) => {
		const sessionId = String(session.id);
		let agg = aggregates.get(sessionId);
		if (agg === void 0) {
			agg = {
				sessionId,
				actions: [],
				seenSeq: 0,
				toolNames: /* @__PURE__ */ new Map()
			};
			aggregates.set(sessionId, agg);
		}
		if (event.seq <= agg.seenSeq) return;
		agg.seenSeq = event.seq;
		try {
			const action = normalize(event, agg);
			if (action === null) return;
			agg.actions.push(action);
			onAction(session, agg, action);
		} catch (error) {
			console.error("[devquest] event error:", error);
		}
	});
}
/**
* 归一化：SessionEvent → Action | null。
* 事件载荷按本机 DSH 版本实测（dsh-session types.d.ts）。
*/
function normalize(event, agg) {
	switch (event.type) {
		case "turn/end": switch (event.data.reason.kind) {
			case "completed": return {
				kind: "turn-completed",
				turn: event.data.turn
			};
			case "error": return {
				kind: "turn-failed",
				turn: event.data.turn
			};
			case "aborted":
			case "blocked":
			case "max-tokens":
			case "interrupted": return {
				kind: "turn-aborted",
				turn: event.data.turn
			};
			default: return null;
		}
		case "tool/call":
			agg.toolNames.set(String(event.data.callId), event.data.name);
			return {
				kind: "tool-call",
				tool: event.data.name
			};
		case "tool/result":
			if (event.data.error !== void 0) return {
				kind: "tool-failed",
				tool: agg.toolNames.get(String(event.data.message.source.callId)) ?? "?"
			};
			return null;
		case "todo/write": {
			const todos = event.data.todos;
			const newly = todos.filter((t) => t.status === "completed").length;
			if (newly <= 0) return null;
			return {
				kind: "todo-completed",
				count: newly,
				allCompleted: todos.length > 0 && todos.every((t) => t.status === "completed")
			};
		}
		case "assistant/message": {
			const usage = event.data.usage;
			if (usage === void 0) return null;
			const tokens = usage.inputTokens + usage.outputTokens;
			if (tokens <= 0) return null;
			return {
				kind: "tokens",
				tokens
			};
		}
		case "user/message": {
			const source = event.data.source;
			if (typeof source === "string" && source !== "agent.inject") return {
				kind: "session-start",
				hourOfDay: new Date(event.time).getHours(),
				source
			};
			return null;
		}
		default: return null;
	}
}
//#endregion
//#region lib/types/store.js
/**
* DevQuest 存档读写（ctx.fs，与 sandbox 一致，不直接用 node fs）。
* 存档路径：<dataDir>/<cwd-hash>.json，dataDir 缺省 ~/.dsh/devquest。
* writeText 后端会自动创建父目录（dsh-fs-local）。
*/
/** 存档根目录。 */
function dataRoot(config) {
	return config.dataDir ?? join(homedir(), ".dsh", "devquest");
}
/** 项目作用域键：有 cwd 用 cwd，无 cwd 的会话共用 '<none>'。 */
function scopeKey(cwd) {
	return cwd !== void 0 && cwd.trim() !== "" ? cwd : "<none>";
}
/** cwd → 存档文件名（sha1 前缀，防路径字符问题）。 */
function hashScope(cwd) {
	return createHash("sha1").update(cwd).digest("hex").slice(0, 20);
}
/** 存档文件绝对路径。 */
function savePath(config, cwd) {
	return join(dataRoot(config), `${hashScope(scopeKey(cwd))}.json`);
}
/** 读存档；不存在或损坏时返回全新存档。 */
async function loadSave(ctx, config, cwd) {
	const file = savePath(config, cwd);
	try {
		const target = await ctx.fs.resolve(file);
		if (await ctx.fs.stat(target) === void 0) return freshSave(scopeKey(cwd), config.season ?? "2026-S1");
		const text = await ctx.fs.readText(target);
		return migrateSave(JSON.parse(text), scopeKey(cwd), config.season ?? "2026-S1");
	} catch (error) {
		console.error(`[devquest] load save failed (${file}):`, error);
		return freshSave(scopeKey(cwd), config.season ?? "2026-S1");
	}
}
/** 写存档（原子替换）。save.cwd 已存作用域键（cwd 或 '<none>'）。 */
async function persistSave(ctx, config, save) {
	const file = savePath(config, save.cwd);
	const target = await ctx.fs.resolve(file);
	await ctx.fs.writeText(target, JSON.stringify(save, null, 2));
}
/** 删除存档（reset 用）。不存在时静默成功。 */
async function deleteSave(ctx, config, cwd) {
	const file = savePath(config, cwd);
	try {
		const target = await ctx.fs.resolve(file);
		if (await ctx.fs.stat(target) === void 0) return false;
		await ctx.fs.writeText(target, JSON.stringify(freshSave(scopeKey(cwd), config.season ?? "2026-S1"), null, 2));
		return true;
	} catch (error) {
		console.error(`[devquest] reset save failed (${file}):`, error);
		return false;
	}
}
//#endregion
//#region lib/types/tools.js
/**
* DevQuest 模型工具：devquest_status / devquest_achievements / devquest_reset。
* 依赖通过 deps 注入（index.ts 装配），保持本文件无引擎直接耦合。
*/
/** 状态渲染为人类可读文本。 */
function renderStatus(status, detail) {
	const { level, xp, xpToNext, title, season, counters } = status;
	const lines = [
		`⚔️ DevQuest — Lv.${level} ${title.zh}`,
		`   XP: ${xp} / ${xpToNext}（赛季 ${season}，累计 ${counters.turnsCompleted} 回合 / ${counters.toolCalls} 次工具调用 / ${counters.todosCompleted} 个待办 / ${counters.tokensOut} tokens）`,
		`   连击: ${counters.consecutiveSuccess} · 今日回合: ${counters.completedToday} · 活跃: ${counters.streakDays} 天`
	];
	const quests = status.daily?.quests ?? [];
	if (quests.length > 0) {
		lines.push(`   📅 每日任务（${status.daily.date}）：`);
		for (const q of quests) {
			const mark = q.done ? "✅" : "⬜";
			const progress = Math.min(q.progress, q.goal);
			lines.push(`     ${mark} ${q.label.zh} ${progress}/${q.goal}（+${q.reward} XP）`);
		}
	}
	if (detail === "full") {
		const unlocked = status.achievements.filter((a) => a.unlocked);
		const locked = status.achievements.filter((a) => !a.unlocked && !a.hidden);
		lines.push(`   已解锁 ${unlocked.length}/${status.achievements.length} 枚成就：`);
		for (const a of unlocked) lines.push(`     ${a.icon} ${a.name.zh} ${a.name.en}（+${a.xp} XP）`);
		if (locked.length > 0) lines.push(`   未解锁（${locked.length}）：${locked.map((a) => a.name.zh).join("、")}`);
	}
	return lines.join("\n");
}
/** 注册三个 DevQuest 工具。 */
function registerDevQuestTools(ctx, deps) {
	ctx.tools.register(defineTool({
		name: "devquest_status",
		description: "查询 DevQuest 开发游戏化进度：等级/XP/称号/计数器/成就。",
		parameters: { detail: {
			type: "string",
			enum: ["summary", "full"],
			description: "summary=等级+XP+关键计数；full=含成就列表（默认 summary）"
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render: (_args, value) => [{
				type: "text",
				text: renderStatus(value, _args.detail === "full" ? "full" : "summary")
			}]
		},
		async execute(args, exec) {
			const agentCwd = exec.agent?.session?.header?.cwd;
			return await deps.status(agentCwd);
		}
	}));
	ctx.tools.register(defineTool({
		name: "devquest_achievements",
		description: "列出 DevQuest 全部成就：名称/条件/是否已解锁/奖励 XP。",
		parameters: {},
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: value.achievements.map((a) => {
						return `${a.unlocked ? "✅" : a.hidden ? "🔒" : "⬜"} ${a.icon} ${a.name.zh} ${a.name.en} — ${a.description.zh}（+${a.xp} XP）`;
					}).join("\n")
				}];
			}
		},
		async execute(_args, exec) {
			const agentCwd = exec.agent?.session?.header?.cwd;
			return { achievements: (await deps.status(agentCwd)).achievements };
		}
	}));
	ctx.tools.register(defineTool({
		name: "devquest_reset",
		description: "清空 DevQuest 存档（重置等级/XP/成就/计数）。危险操作，必须传 confirm=true。",
		parameters: {
			confirm: {
				type: "boolean",
				description: "必须为 true 才会执行；false 只返回预览"
			},
			cwd: {
				type: "string",
				description: "要重置的项目工作目录；缺省=当前 agent 会话 cwd"
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render: (_args, value) => [{
				type: "text",
				text: String(value.message ?? "")
			}]
		},
		async execute(args, exec) {
			const agentCwd = exec.agent?.session?.header?.cwd;
			const target = args.cwd ?? agentCwd ?? "<none>";
			if (args.confirm !== true) return {
				ok: false,
				message: `未确认：传入 confirm=true 才会清空存档（目标: ${target}）`
			};
			const result = await deps.reset(target);
			return {
				ok: result.ok,
				message: result.reset ? `✅ DevQuest 存档已重置（目标: ${target}）` : `存档不存在或重置失败（目标: ${target}）`
			};
		}
	}));
}
//#endregion
//#region lib/types/routes.js
/** 浏览器侧 API 前缀。 */
const STATUS_API_PREFIX = "/api/devquest";
/** 写 JSON 响应。 */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** 从查询字符串取单个参数（URL 解码；重复取首个）。 */
function parseQueryParam(url, key) {
	const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
	for (const part of query.split("&")) {
		if (!part.startsWith(`${key}=`)) continue;
		try {
			return decodeURIComponent(part.slice(key.length + 1));
		} catch {
			return;
		}
	}
}
/**
* 解析状态归属目录：显式 cwd > session 参数 > 最近活跃会话的 cwd
* > defaultCwd > 进程 cwd。最近活跃 = 会话列表里 seq 最大者（事件最新）。
*/
function resolveCwd(url, config) {
	const explicit = parseQueryParam(url, "cwd");
	if (explicit !== void 0 && explicit !== "") return explicit;
	const sessionId = parseQueryParam(url, "session");
	if (sessionId !== void 0 && sessionId !== "") {
		const session = config.sessions?.get(sessionId);
		if (session?.header.cwd !== void 0 && session.header.cwd !== "") return session.header.cwd;
	}
	const sessions = config.sessions?.list();
	if (sessions !== void 0) {
		let best;
		let bestTime = -1;
		for (const s of sessions) {
			const cwd = s.header.cwd;
			if (cwd === void 0 || cwd === "") continue;
			const last = s.events?.[s.events.length - 1]?.time ?? s.header.createdAt ?? 0;
			if (last >= bestTime) {
				best = cwd;
				bestTime = last;
			}
		}
		if (best !== void 0) return best;
	}
	return config.defaultCwd ?? process.cwd();
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
function makeDevQuestRoutes(config) {
	const { cacheTtlMs = 6e4 } = config;
	const cache = /* @__PURE__ */ new Map();
	const MAX_CACHE_ENTRIES = 32;
	const status = (cwd) => {
		const hit = cache.get(cwd);
		if (hit !== void 0 && Date.now() - hit.at < cacheTtlMs) return hit.promise;
		if (cache.size >= MAX_CACHE_ENTRIES) {
			const oldest = cache.keys().next().value;
			if (oldest !== void 0) cache.delete(oldest);
		}
		const promise = config.status(cwd).catch((error) => {
			cache.delete(cwd);
			throw error;
		});
		cache.set(cwd, {
			at: Date.now(),
			promise
		});
		return promise;
	};
	return [{
		kind: "exact",
		path: `${STATUS_API_PREFIX}/status`,
		handler: (req, res) => {
			if (req.method !== "GET") {
				json(res, 405, {
					ok: false,
					error: "method-not-allowed"
				});
				return;
			}
			const cwd = resolveCwd(req.url ?? "", config);
			status(cwd).then((result) => json(res, 200, {
				ok: true,
				status: result
			}), (error) => json(res, 500, {
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			}));
		}
	}];
}
//#endregion
//#region lib/types/index.js
const name = "devquest";
const inject = [
	"fs",
	"sessions",
	"tools"
];
function apply(ctx, config = {}) {
	const storeConfig = {
		...config.dataDir !== void 0 ? { dataDir: config.dataDir } : {},
		...config.season !== void 0 ? { season: config.season } : {}
	};
	config.season;
	const saveCache = /* @__PURE__ */ new Map();
	const tails = /* @__PURE__ */ new Map();
	/** 取存档（缓存优先，无则从盘读）。 */
	async function getSave(key) {
		let save = saveCache.get(key);
		if (save === void 0) {
			save = await loadSave(ctx, storeConfig, key);
			saveCache.set(key, save);
		}
		return save;
	}
	/** 按作用域串行化写操作（同 cwd 的回合结算不互相覆盖）。 */
	function enqueue(key, task) {
		const next = (tails.get(key) ?? Promise.resolve()).catch(() => void 0).then(task);
		tails.set(key, next.catch(() => void 0));
	}
	/** 组装状态视图。 */
	function buildStatus(save) {
		new Set(Object.keys(save.achievements));
		return {
			cwd: save.cwd,
			level: save.player.level,
			xp: save.player.xp,
			xpToNext: xpToNext(save.player.level),
			title: titleFor(save.player.level),
			season: save.player.season,
			counters: save.counters,
			achievements: ACHIEVEMENTS.map((a) => {
				const rec = save.achievements[a.id];
				return {
					id: a.id,
					category: a.category,
					name: a.name,
					description: a.description,
					icon: a.icon,
					xp: a.xp,
					hidden: a.hidden === true,
					unlocked: rec !== void 0,
					...rec !== void 0 ? { acquiredAt: rec.acquiredAt } : {}
				};
			}),
			daily: ensureDaily(save, Date.now()),
			updatedAt: save.updatedAt
		};
	}
	watchEvents(ctx, (session, agg, action) => {
		if (!(action.kind === "turn-completed" || action.kind === "turn-failed" || action.kind === "turn-aborted")) return;
		const sessionId = agg.sessionId;
		const cwd = session.header.cwd;
		const key = scopeKey(cwd);
		const seq = agg.seenSeq;
		const actions = agg.actions;
		agg.actions = [];
		enqueue(key, async () => {
			const save = await getSave(key);
			if (seq <= (save.lastSeqBySession[sessionId] ?? -1)) return;
			const next = applyTurn(save, actions, Date.now());
			const unlocked = checkAchievements(ACHIEVEMENTS, next);
			next.lastSeqBySession[sessionId] = seq;
			saveCache.set(key, next);
			await persistSave(ctx, storeConfig, next);
			if (unlocked.length > 0) {
				const names = unlocked.map((id) => {
					const def = achievementById(id);
					return def !== void 0 ? `${def.icon} ${def.name.zh} ${def.name.en}` : id;
				});
				console.log(`[devquest] 🏆 成就解锁：${names.join("、")}`);
			}
		});
	});
	registerDevQuestTools(ctx, {
		status: async (cwd) => {
			return buildStatus(await getSave(scopeKey(cwd)));
		},
		reset: async (cwd) => {
			const key = scopeKey(cwd);
			saveCache.delete(key);
			try {
				return {
					ok: true,
					reset: await deleteSave(ctx, storeConfig, key)
				};
			} catch (error) {
				console.error("[devquest] reset failed:", error);
				return {
					ok: false,
					reset: false
				};
			}
		}
	});
	const routes = makeDevQuestRoutes({
		status: async (cwd) => {
			return buildStatus(await getSave(scopeKey(cwd)));
		},
		sessions: ctx.sessions,
		...config.defaultCwd !== void 0 ? { defaultCwd: config.defaultCwd } : {},
		...config.cacheTtlMs !== void 0 ? { cacheTtlMs: config.cacheTtlMs } : {}
	});
	ctx.inject(["webServer"], (httpCtx) => {
		httpCtx.effect(() => {
			const disposers = routes.map((route) => httpCtx.webServer.register(route));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "devquest: routes");
	});
}
//#endregion
export { apply, inject, name };
