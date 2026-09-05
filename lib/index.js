import { createRequire } from "node:module";
import { join } from "node:path";
import { homedir } from "node:os";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/logger.js
/**
* DevQuest 轻量日志通道：统一 `[devquest]` 前缀与 level 门控，
* 替代散落的 console.log / console.error。
*
* 用法：模块级默认 logger（import { log }），或 createLogger(level) 定制。
* level 缺省 'info'；debug 默认关闭，Config.logLevel = 'debug' 打开。
*/
const LEVEL_ORDER = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40
};
/** 按 level 构造 logger（低于阈值的调用直接丢弃）。 */
function createLogger(level = "info") {
	const enabled = (l) => LEVEL_ORDER[l] >= LEVEL_ORDER[level];
	return {
		debug(msg) {
			if (enabled("debug")) console.debug(`[devquest] ${msg}`);
		},
		info(msg) {
			if (enabled("info")) console.log(`[devquest] ${msg}`);
		},
		warn(msg) {
			if (enabled("warn")) console.warn(`[devquest] ${msg}`);
		},
		error(msg, err) {
			if (!enabled("error")) return;
			if (err === void 0) console.error(`[devquest] ${msg}`);
			else console.error(`[devquest] ${msg}`, err);
		}
	};
}
/** 模块级默认 logger（各处共享；index.ts 可用 setGlobalLogLevel 调整）。 */
let globalLevel = "info";
let globalLogger = createLogger(globalLevel);
/** 调整全局 logger 级别（Config.logLevel 生效）。 */
function setGlobalLogLevel(level) {
	globalLevel = level;
	globalLogger = createLogger(level);
}
/** 全局共享 logger。 */
const log = {
	debug(msg) {
		globalLogger.debug(msg);
	},
	info(msg) {
		globalLogger.info(msg);
	},
	warn(msg) {
		globalLogger.warn(msg);
	},
	error(msg, err) {
		globalLogger.error(msg, err);
	}
};
//#endregion
//#region lib/types/achievements.js
const SSH_TOOLS = /* @__PURE__ */ new Set([
	"ssh_exec",
	"ssh_upload",
	"ssh_download",
	"ssh_tunnel",
	"ssh_cluster",
	"ssh_list"
]);
/** 职业画像表（按工具习惯匹配，命中第一个）。 */
const CLASSES = [
	{
		id: "class-editor",
		icon: "✏️",
		name: {
			zh: "编辑大师",
			en: "Edit Master"
		},
		tools: [
			"edit",
			"write",
			"str-replace-editor"
		],
		minCalls: 200,
		minTools: 2
	},
	{
		id: "class-commander",
		icon: "⌨️",
		name: {
			zh: "命令行者",
			en: "Command Runner"
		},
		tools: [
			"pwsh",
			"bash",
			"terminal"
		],
		minCalls: 300
	},
	{
		id: "class-scholar",
		icon: "📚",
		name: {
			zh: "档案管理员",
			en: "Archivist"
		},
		tools: [
			"read",
			"grep",
			"glob"
		],
		minCalls: 400,
		minTools: 2
	},
	{
		id: "class-liason",
		icon: "🤝",
		name: {
			zh: "协调使",
			en: "Coordinator"
		},
		tools: [
			"subagent",
			"agent_teams_",
			"workflow"
		],
		minCalls: 20,
		minTools: 2
	},
	{
		id: "class-crafter",
		icon: "🧱",
		name: {
			zh: "锻造师",
			en: "Crafter"
		},
		tools: [
			"skill_manage",
			"skill",
			"memory",
			"dtodo"
		],
		minCalls: 50,
		minTools: 2
	},
	{
		id: "class-multitool",
		icon: "🎭",
		name: {
			zh: "多面手",
			en: "Versatile"
		},
		tools: [],
		minCalls: 0,
		minTools: 12
	}
];
/** 今日使用过的工具名（去重；jack_of_all / dq_distinct_8 用），跨天清零。 */
function isClassTool(tool, cls) {
	if (cls.tools.length === 0) return true;
	return cls.tools.some((prefix) => tool.startsWith(prefix));
}
/**
* 识别玩家职业画像：统计工具调用分布，按 CLASSES 表匹配。
* 无匹配时返回 null（玩家还不够专注）。
*/
function computeClass(counters) {
	const byTool = counters.toolCallsByTool ?? {};
	for (const cls of CLASSES) {
		if (cls.tools.length === 0) {
			if ((counters.todayTools?.length ?? 0) >= (cls.minTools ?? 0)) return cls;
			continue;
		}
		const matched = [];
		let total = 0;
		for (const tool of Object.keys(byTool)) if (isClassTool(tool, cls)) {
			total += byTool[tool] ?? 0;
			if ((byTool[tool] ?? 0) > 0) matched.push(tool);
		}
		const minTools = cls.minTools ?? 1;
		if (total >= cls.minCalls && matched.length >= minTools) return cls;
	}
	return null;
}
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
/** 计数成就的进度（current/goal）。 */
function countProgress(get, goal) {
	return (s) => ({
		current: Math.min(get(s), goal),
		goal
	});
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
		check: (s) => s.counters.turnsCompleted >= 1,
		progress: countProgress((s) => s.counters.turnsCompleted, 1)
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
		check: (s) => s.counters.turnsCompleted >= 10,
		progress: countProgress((s) => s.counters.turnsCompleted, 10)
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
		check: (s) => s.counters.turnsCompleted >= 50,
		progress: countProgress((s) => s.counters.turnsCompleted, 50)
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
		check: (s) => s.counters.turnsCompleted >= 100,
		progress: countProgress((s) => s.counters.turnsCompleted, 100)
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
		check: (s) => s.counters.consecutiveSuccess >= 25,
		progress: countProgress((s) => s.counters.consecutiveSuccess, 25)
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
		check: (s) => s.counters.turnsCompleted >= 25,
		progress: countProgress((s) => s.counters.turnsCompleted, 25)
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
		check: (s) => s.counters.turnsCompleted >= 250,
		progress: countProgress((s) => s.counters.turnsCompleted, 250)
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
		check: (s) => s.counters.comebacks >= 10,
		progress: countProgress((s) => s.counters.comebacks, 10)
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
		check: (s) => toolCount(s.counters, "edit") + toolCount(s.counters, "str-replace-editor") >= 1,
		progress: countProgress((s) => toolCount(s.counters, "edit") + toolCount(s.counters, "str-replace-editor"), 1)
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
		check: (s) => s.counters.craftTools >= 100,
		progress: countProgress((s) => s.counters.craftTools, 100)
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
		check: (s) => anyTool(s.counters, ["pwsh", "bash"]),
		progress: countProgress((s) => toolCount(s.counters, "pwsh") + toolCount(s.counters, "bash"), 1)
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
		check: (s) => anyTool(s.counters, [...SSH_TOOLS]),
		progress: countProgress((s) => [...SSH_TOOLS].reduce((sum, t) => sum + toolCount(s.counters, t), 0), 1)
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
		check: (s) => s.counters.subagentsSpawned >= 1,
		progress: countProgress((s) => s.counters.subagentsSpawned, 1)
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
		check: (s) => s.counters.toolCalls >= 666,
		progress: countProgress((s) => s.counters.toolCalls, 666)
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
		check: (s) => toolCount(s.counters, "pwsh") + toolCount(s.counters, "bash") >= 100,
		progress: countProgress((s) => toolCount(s.counters, "pwsh") + toolCount(s.counters, "bash"), 100)
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
		check: (s) => s.counters.toolCalls >= 250,
		progress: countProgress((s) => s.counters.toolCalls, 250)
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
		check: (s) => s.counters.subagentsSpawned >= 10,
		progress: countProgress((s) => s.counters.subagentsSpawned, 10)
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
		check: (s) => s.counters.craftTools >= 500,
		progress: countProgress((s) => s.counters.craftTools, 500)
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
		check: (s) => s.counters.todosCompleted >= 1,
		progress: countProgress((s) => s.counters.todosCompleted, 1)
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
		check: (s) => s.counters.todosCompleted >= 10,
		progress: countProgress((s) => s.counters.todosCompleted, 10)
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
		check: (s) => s.counters.todosCompleted >= 50,
		progress: countProgress((s) => s.counters.todosCompleted, 50)
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
		check: (s) => s.counters.cleanSweeps >= 1,
		progress: countProgress((s) => s.counters.cleanSweeps, 1)
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
		check: (s) => s.counters.dailyQuestsDone >= 10,
		progress: countProgress((s) => s.counters.dailyQuestsDone, 10)
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
		check: (s) => s.counters.todosCompleted >= 100,
		progress: countProgress((s) => s.counters.todosCompleted, 100)
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
		check: (s) => s.counters.dailyQuestsDone >= 30,
		progress: countProgress((s) => s.counters.dailyQuestsDone, 30)
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
		check: (s) => s.counters.streakDays >= 7,
		progress: countProgress((s) => s.counters.streakDays, 7)
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
		check: (s) => s.counters.completedToday >= 50,
		progress: countProgress((s) => s.counters.completedToday, 50)
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
		check: (s) => s.counters.nightTurns >= 10,
		progress: countProgress((s) => s.counters.nightTurns, 10)
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
		check: (s) => s.counters.streakDays >= 30,
		progress: countProgress((s) => s.counters.streakDays, 30)
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
		check: (s) => s.player.level >= 5,
		progress: countProgress((s) => s.player.level, 5)
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
		check: (s) => s.player.level >= 10,
		progress: countProgress((s) => s.player.level, 10)
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
		check: (s) => s.player.level >= 15,
		progress: countProgress((s) => s.player.level, 15)
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
		check: (s) => s.player.level >= 20,
		progress: countProgress((s) => s.player.level, 20)
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
		check: (s) => s.player.level >= 25,
		progress: countProgress((s) => s.player.level, 25)
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
		check: (s) => s.player.level >= 30,
		progress: countProgress((s) => s.player.level, 30)
	},
	{
		id: "season_100k",
		category: "legend",
		name: {
			zh: "赛季精英",
			en: "Season Elite"
		},
		description: {
			zh: "本赛季内输出 100k tokens",
			en: "Output 100k tokens this season"
		},
		icon: "💎",
		xp: 500,
		check: (s) => s.counters.seasonTokensOut >= 1e5,
		progress: countProgress((s) => s.counters.seasonTokensOut, 1e5)
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
		check: (s) => s.counters.devquestCalls >= 1,
		progress: countProgress((s) => s.counters.devquestCalls, 1)
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
		check: (s) => s.counters.maxTokensTurn >= 1e5,
		progress: countProgress((s) => s.counters.maxTokensTurn, 1e5)
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
		check: (s) => s.counters.todayTools.length >= 10,
		progress: countProgress((s) => s.counters.todayTools.length, 10)
	},
	{
		id: "keyboard_warrior",
		category: "egg",
		name: {
			zh: "键盘侠",
			en: "Keyboard Warrior"
		},
		description: {
			zh: "任一工具累计调用 100 次",
			en: "Call any single tool 100 times"
		},
		icon: "⌨️",
		xp: 200,
		hidden: true,
		check: (s) => Object.values(s.counters.toolCallsByTool).some((n) => n >= 100)
	},
	{
		id: "midnight_bell",
		category: "egg",
		name: {
			zh: "午夜钟声",
			en: "Midnight Bell"
		},
		description: {
			zh: "23:55-00:05 之间完成一个回合",
			en: "Finish a turn between 23:55 and 00:05"
		},
		icon: "🔔",
		xp: 250,
		hidden: true,
		check: (s) => {
			const at = s.counters.lastTurnCompletedAt;
			if (at <= 0) return false;
			const h = hourOf(at);
			const m = minuteOf(at);
			return h === 23 && m >= 55 || h === 0 && m <= 5;
		}
	},
	{
		id: "combo_master",
		category: "egg",
		name: {
			zh: "连击大师",
			en: "Combo Master"
		},
		description: {
			zh: "连击达到 40",
			en: "Reach a 40-turn combo"
		},
		icon: "🔥",
		xp: 350,
		hidden: true,
		check: (s) => s.counters.consecutiveSuccess >= 40,
		progress: countProgress((s) => s.counters.consecutiveSuccess, 40)
	},
	{
		id: "turns_500",
		category: "journey",
		name: {
			zh: "五百回合",
			en: "Quincentenary"
		},
		description: {
			zh: "累计完成 500 个回合",
			en: "Complete 500 turns in total"
		},
		icon: "⚔️",
		xp: 800,
		check: (s) => s.counters.turnsCompleted >= 500,
		progress: countProgress((s) => s.counters.turnsCompleted, 500)
	},
	{
		id: "edits_1000",
		category: "crafting",
		name: {
			zh: "千锤百炼",
			en: "Thousand Hammers"
		},
		description: {
			zh: "累计 1000 次编辑/写入",
			en: "1000 edits or writes in total"
		},
		icon: "🔨",
		xp: 800,
		check: (s) => s.counters.craftTools >= 1e3,
		progress: countProgress((s) => s.counters.craftTools, 1e3)
	},
	{
		id: "daily_quest_50",
		category: "quest",
		name: {
			zh: "任务宗师",
			en: "Quest Grandmaster"
		},
		description: {
			zh: "累计完成 50 个每日任务",
			en: "Complete 50 daily quests in total"
		},
		icon: "🏅",
		xp: 600,
		check: (s) => s.counters.dailyQuestsDone >= 50,
		progress: countProgress((s) => s.counters.dailyQuestsDone, 50)
	},
	{
		id: "streak_14",
		category: "time",
		name: {
			zh: "双周之约",
			en: "Fortnight"
		},
		description: {
			zh: "连续 14 天活跃",
			en: "Stay active 14 days in a row"
		},
		icon: "📅",
		xp: 400,
		check: (s) => s.counters.streakDays >= 14,
		progress: countProgress((s) => s.counters.streakDays, 14)
	},
	{
		id: "lunch_break",
		category: "egg",
		name: {
			zh: "午间小憩",
			en: "Lunch Break"
		},
		description: {
			zh: "12:00-13:00 之间完成回合",
			en: "Complete a turn between 12:00 and 13:00"
		},
		icon: "🍚",
		xp: 150,
		hidden: true,
		check: (s, now) => {
			const h = hourOf(now);
			return h >= 12 && h < 13 && s.counters.turnsCompleted >= 1;
		}
	},
	{
		id: "class_editor",
		category: "crafting",
		name: {
			zh: "编辑大师",
			en: "Edit Master"
		},
		description: {
			zh: "达成编辑大师职业画像（编辑/写入类工具 ≥200 次且 ≥2 种）",
			en: "Become an Edit Master (200+ edits across 2+ edit tools)"
		},
		icon: "✏️",
		xp: 500,
		check: (s) => computeClass(s.counters)?.id === "class-editor",
		progress: countProgress((s) => Object.entries(s.counters.toolCallsByTool ?? {}).filter(([t]) => isClassTool(t, CLASSES[0])).reduce((a, [, n]) => a + n, 0), 200)
	},
	{
		id: "class_versatile",
		category: "legend",
		name: {
			zh: "百变星君",
			en: "Versatile Star"
		},
		description: {
			zh: "达成多面手职业画像（单日使用 ≥12 种工具）",
			en: "Turn into a Versatile (12+ distinct tools in one day)"
		},
		icon: "🎭",
		xp: 500,
		check: (s) => computeClass(s.counters)?.id === "class-multitool",
		progress: countProgress((s) => s.counters.todayTools?.length ?? 0, 12)
	},
	{
		id: "boss_slayer",
		category: "quest",
		name: {
			zh: "首杀讨伐",
			en: "First Hunt"
		},
		description: {
			zh: "击败任意一只每周 BOSS",
			en: "Defeat any weekly boss"
		},
		icon: "🐉",
		xp: 300,
		check: (s) => (s.counters.bossSlain ?? 0) >= 1,
		progress: countProgress((s) => s.counters.bossSlain ?? 0, 1)
	},
	{
		id: "boss_3",
		category: "quest",
		name: {
			zh: "猎龙者",
			en: "Dragonslayer"
		},
		description: {
			zh: "累计击败 3 只每周 BOSS",
			en: "Defeat 3 weekly bosses in total"
		},
		icon: "🗡️",
		xp: 800,
		check: (s) => (s.counters.bossSlain ?? 0) >= 3,
		progress: countProgress((s) => s.counters.bossSlain ?? 0, 3)
	},
	{
		id: "goal_1",
		category: "time",
		name: {
			zh: "今日达标",
			en: "On Target"
		},
		description: {
			zh: "首次达成每日 XP 目标",
			en: "Reach your daily XP goal once"
		},
		icon: "🎯",
		xp: 200,
		check: (s) => (s.counters.goalDays ?? 0) >= 1,
		progress: countProgress((s) => s.counters.goalDays ?? 0, 1)
	},
	{
		id: "egg_boss_dusk",
		category: "egg",
		name: {
			zh: "黄昏讨伐",
			en: "Dusk Hunt"
		},
		description: {
			zh: "21:00-22:00 之间击败每周 BOSS",
			en: "Defeat a weekly boss between 21:00 and 22:00"
		},
		icon: "🦇",
		xp: 150,
		hidden: true,
		check: (s, now) => {
			const h = hourOf(now);
			return h >= 21 && h < 22 && (s.counters.bossSlain ?? 0) >= 1;
		}
	}
];
/** 按 id 查成就（未命中返回 undefined）。 */
function achievementById(id) {
	return ACHIEVEMENTS.find((a) => a.id === id);
}
/** 成就稀有度表（id → rarity；缺省 common）。按达成难度/里程碑价值分级。 */
const ACHIEVEMENT_RARITY = {
	first_turn: "common",
	turns_10: "common",
	turns_25: "rare",
	turns_50: "rare",
	turns_100: "epic",
	turns_250: "legendary",
	comeback: "common",
	comeback_10: "legendary",
	steel_will: "epic",
	first_edit: "common",
	edits_100: "rare",
	edits_500: "epic",
	first_cmd: "common",
	first_remote: "rare",
	first_subagent: "common",
	subagents_10: "epic",
	tool_666: "legendary",
	cmd_100: "rare",
	tools_250: "rare",
	first_todo: "common",
	todos_10: "rare",
	todos_50: "rare",
	todos_100: "epic",
	clean_sweep: "rare",
	daily_quest_10: "rare",
	daily_quest_30: "epic",
	night_owl: "common",
	early_bird: "common",
	night_owl_10: "epic",
	seven_days: "rare",
	streak_30: "legendary",
	grinder: "epic",
	level_5: "rare",
	level_10: "epic",
	level_15: "epic",
	level_20: "legendary",
	level_25: "legendary",
	level_30: "legendary",
	season_100k: "rare",
	devil_hour: "legendary",
	self_aware: "rare",
	oops: "common",
	thinker: "epic",
	jack_of_all: "epic",
	keyboard_warrior: "epic",
	midnight_bell: "epic",
	combo_master: "epic",
	turns_500: "legendary",
	edits_1000: "legendary",
	daily_quest_50: "legendary",
	streak_14: "epic",
	lunch_break: "rare",
	class_editor: "epic",
	class_versatile: "epic",
	boss_slayer: "rare",
	boss_3: "legendary",
	goal_1: "rare",
	egg_boss_dusk: "rare"
};
/** 取成就稀有度（缺省 common）。 */
function rarityOf(id) {
	return ACHIEVEMENT_RARITY[id] ?? "common";
}
//#endregion
//#region lib/types/events.js
/** 事件效果池（随机抽取；相斥效果同组不再同时出现）。 */
const EVENT_POOL = [
	{
		id: "ev-coffee",
		kind: "buff",
		icon: "☕",
		name: {
			zh: "咖啡因爆发",
			en: "Caffeine Rush"
		},
		description: {
			zh: "接下来 30 分钟内工具 XP ×2",
			en: "Tool XP ×2 for the next 30 minutes"
		},
		durationMin: 30
	},
	{
		id: "ev-focus",
		kind: "buff",
		icon: "🧘",
		name: {
			zh: "深度专注",
			en: "Deep Focus"
		},
		description: {
			zh: "接下来 20 个完成回合输出 tokens 计分 ×1.5",
			en: "Token XP ×1.5 for the next 20 turns"
		},
		durationTurns: 20
	},
	{
		id: "ev-inspire",
		kind: "buff",
		icon: "💡",
		name: {
			zh: "灵感迸发",
			en: "Inspiration"
		},
		description: {
			zh: "接下来 10 个完成回合 XP +10%",
			en: "+10% XP for the next 10 turns"
		},
		durationTurns: 10
	},
	{
		id: "ev-bugdoc",
		kind: "buff",
		icon: "🐛",
		name: {
			zh: "BUG 档案馆",
			en: "Bug Archive"
		},
		description: {
			zh: "今日 todo 完成后每个额外 +15 XP",
			en: "Each completed todo grants +15 XP today"
		},
		durationMin: 60
	},
	{
		id: "ev-ghostbug",
		kind: "curse",
		icon: "👻",
		name: {
			zh: "幽灵 Bug 缠身",
			en: "Ghost Bug"
		},
		description: {
			zh: "下一次工具失败不扣连击（但它偷走了你 20 XP）",
			en: "Next failure won't break combo (but it costs you 20 XP)"
		},
		oneShot: true
	},
	{
		id: "ev-refactor",
		kind: "curse",
		icon: "🔧",
		name: {
			zh: "重构之痛",
			en: "Refactor Pain"
		},
		description: {
			zh: "接下来 15 个完成回合工具 XP 减半（完成 5 个待办可提前解除）",
			en: "Tool XP halved for 15 turns (5 todos clears it)"
		},
		durationTurns: 15
	},
	{
		id: "ev-techdebt",
		kind: "curse",
		icon: "🧱",
		name: {
			zh: "技术债上门",
			en: "Tech Debt Collector"
		},
		description: {
			zh: "下次回合结算 XP 清零（愤怒的债主）",
			en: "Next settlement XP is lost (the debt collector)"
		},
		oneShot: true
	},
	{
		id: "ev-easteregg",
		kind: "choice",
		icon: "🥚",
		name: {
			zh: "神秘彩蛋",
			en: "Mystery Egg"
		},
		description: {
			zh: "你发现一枚神秘彩蛋……吃掉它（+80 XP）还是留着（获得稀有圣物掉率 ×2 一小时）？",
			en: "A mystery egg! Eat it (+80 XP) or keep it (double relic drop chance for an hour)?"
		}
	},
	{
		id: "ev-midnight",
		kind: "choice",
		icon: "🌙",
		name: {
			zh: "深夜抉择",
			en: "Midnight Choice"
		},
		description: {
			zh: "凌晨的代码格外安静：继续肝（明天活跃奖励 ×2）还是休息（今天 +50 XP）？",
			en: "Continue (double streak reward tomorrow) or rest (+50 XP now)?"
		}
	},
	{
		id: "ev-gamble",
		kind: "choice",
		icon: "🎲",
		name: {
			zh: "命运骰子",
			en: "Fate Dice"
		},
		description: {
			zh: "赌一把：50% 得 +200 XP，50% 失去 100 XP",
			en: "Gamble: 50% +200 XP, 50% -100 XP"
		}
	}
];
/**
* 触发随机事件卡（每 EVENT_EVERY_TURNS 回合调用一次）：
* 重置计数并抽取一个效果。choice 型写入 events 待玩家抉择（resolveEvent 结算）；
* buff/curse 立即写入（持续生效）。
* 返回事件视图（client 展示用）；无事件时返回 null。
*/
function rollEvent(save, now, seed) {
	const s = structuredClone(save);
	s.counters.turnsSinceEvent = 0;
	const idx = hashSeed(seed) % EVENT_POOL.length;
	const def = EVENT_POOL[idx];
	const event = {
		id: `ev-${now}-${idx}`,
		effectId: def.id,
		gainedAt: now,
		...def.durationMin !== void 0 ? { expiresAt: now + def.durationMin * 6e4 } : {},
		...def.durationTurns !== void 0 ? { expiresTurns: def.durationTurns } : {}
	};
	s.events = [...s.events ?? [], event];
	return {
		id: event.id,
		def,
		save: s
	};
}
/** 简单字符串散列（FNV-1a）——事件抽取与怪名随机共用。 */
function hashSeed(seed) {
	let h = 2166136261;
	for (const ch of seed) {
		h ^= ch.codePointAt(0) ?? 0;
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
/**
* 结算 choice 类事件：选项编号 0/1。
* 返回 gained（XP 增减，可为负）与 save（不含 XP 加法——由调用方 addXp 统一入账）。
* 事件条目从 save.events 移除；选择的 buff（彩蛋/深夜）以新事件条目写入。
*/
function resolveEvent(save, eventId, option, now, seed) {
	const s = structuredClone(save);
	const ev = (s.events ?? []).find((e) => e.id === eventId);
	const fail = (label) => ({
		ok: false,
		gained: 0,
		label,
		save: s
	});
	if (ev === void 0) return fail("事件不存在或已过期");
	const def = EVENT_POOL.find((d) => d.id === ev.effectId);
	if (def === void 0 || def.kind !== "choice") return fail("不可结算");
	s.events = (s.events ?? []).filter((e) => e.id !== eventId);
	switch (def.id) {
		case "ev-easteregg": {
			if (option === 0) return {
				ok: true,
				gained: 80,
				label: "吃掉彩蛋：+80 XP",
				save: s
			};
			const buff = {
				id: `evx-${now}`,
				effectId: "ev-relicluck",
				gainedAt: now,
				expiresAt: now + 36e5
			};
			s.events = [...s.events ?? [], buff];
			return {
				ok: true,
				gained: 0,
				label: "留下彩蛋：圣物掉率 ×2（1 小时）",
				save: s
			};
		}
		case "ev-midnight":
			if (option === 0) {
				const buff = {
					id: `evx-${now}`,
					effectId: "ev-doublestreak",
					gainedAt: now
				};
				s.events = [...s.events ?? [], buff];
				return {
					ok: true,
					gained: 0,
					label: "继续肝：明日连击奖励 ×2",
					save: s
				};
			}
			return {
				ok: true,
				gained: 50,
				label: "休息一下：+50 XP",
				save: s
			};
		case "ev-gamble":
			if (hashSeed(`gamble-${now}-${seed}`) % 2 === 0) return {
				ok: true,
				gained: 200,
				label: "🎲 大成功：+200 XP",
				save: s
			};
			return {
				ok: true,
				gained: -100,
				label: "🎲 大失败：-100 XP",
				save: s
			};
		default: return fail("未知事件");
	}
}
/** 连击姿态表（连击 ≥ combo 生效，取最高档）。 */
const COMBO_STANCES = [
	{
		combo: 10,
		id: "stance-flow",
		icon: "🌊",
		name: {
			zh: "心流",
			en: "Flow"
		},
		toolBonus: 1
	},
	{
		combo: 25,
		id: "stance-aegis",
		icon: "⚡",
		name: {
			zh: "雷闪",
			en: "Surge"
		},
		toolBonus: 2
	},
	{
		combo: 50,
		id: "stance-phoenix",
		icon: "🔥",
		name: {
			zh: "凤炎",
			en: "Phoenix"
		},
		toolBonus: 3,
		tokenMultiplier: 1.2
	},
	{
		combo: 100,
		id: "stance-ascend",
		icon: "✨",
		name: {
			zh: "飞升",
			en: "Ascend"
		},
		toolBonus: 5,
		tokenMultiplier: 1.5
	}
];
/** 按当前连击取生效姿态（无达标返回 null）。 */
function comboStance(consecutive) {
	let best = null;
	for (const s of COMBO_STANCES) if (consecutive >= s.combo) best = s;
	return best;
}
/**
* 结算事件有效期（按时间/回合窗口清理过期项），并消费一次性项。
* 注意：**原地修改传入存档**（调用方需保证传的是自己的副本，如 applyTurnDetailed 的 clone）；
* 返回本轮生效的 mods。
*/
function tickEvents(save, completed, failed, now) {
	const live = (save.events ?? []).filter((e) => e.expiresAt === void 0 || now <= e.expiresAt);
	const mods = {
		toolBonus: 0,
		tokenMultiplier: 1,
		gainMultiplier: 1,
		shieldFailure: false,
		wipeGain: false,
		todoBonus: false
	};
	for (const e of live) {
		const def = EVENT_POOL.find((d) => d.id === e.effectId);
		if (def === void 0) continue;
		switch (def.id) {
			case "ev-coffee":
				mods.toolBonus += 2;
				break;
			case "ev-focus":
				if (completed) mods.tokenMultiplier *= 1.5;
				break;
			case "ev-inspire":
				if (completed) mods.gainMultiplier *= 1.1;
				break;
			case "ev-bugdoc":
				mods.todoBonus = true;
				break;
			case "ev-ghostbug":
				e.consumed = true;
				if (failed) mods.shieldFailure = true;
				break;
			case "ev-refactor":
				if (completed) mods.toolBonus -= 1;
				break;
			case "ev-techdebt":
				e.consumed = true;
				mods.wipeGain = true;
		}
	}
	save.events = live.filter((e) => {
		if (e.consumed === true) return false;
		if (e.expiresTurns !== void 0 && completed) {
			e.expiresTurns -= 1;
			return e.expiresTurns > 0;
		}
		return true;
	});
	return mods;
}
/** 圣物掉率 ×2 是否生效（神秘彩蛋保留选项）。 */
function relicLuckActive(events, now) {
	return (events ?? []).some((e) => e.effectId === "ev-relicluck" && (e.expiresAt === void 0 || now < e.expiresAt));
}
//#endregion
//#region lib/types/relics.js
/** 本地日期键 'YYYY-MM-DD'（与 engine.dayKey 一致；保持零依赖避免循环 import）。 */
function dayKeyLocal(now) {
	const d = new Date(now);
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
/** 圣物池（24 种，按稀有度分布）。 */
const RELIC_POOL = [
	{
		id: "rel-bug",
		icon: "🐛",
		name: {
			zh: "Bug 标本",
			en: "Bug Specimen"
		},
		rarity: "common"
	},
	{
		id: "rel-todo",
		icon: "📌",
		name: {
			zh: "待办碎纸",
			en: "Todo Shred"
		},
		rarity: "common"
	},
	{
		id: "rel-coffee",
		icon: "☕",
		name: {
			zh: "咖啡渍杯",
			en: "Coffee Cup"
		},
		rarity: "common"
	},
	{
		id: "rel-mouse",
		icon: "🖱️",
		name: {
			zh: "双击鼠标",
			en: "Double-Click Mouse"
		},
		rarity: "common"
	},
	{
		id: "rel-tab",
		icon: "🔖",
		name: {
			zh: "游离 Tab",
			en: "Wandering Tab"
		},
		rarity: "common"
	},
	{
		id: "rel-semicolon",
		icon: "🔤",
		name: {
			zh: "多余分号",
			en: "Stray Semicolon"
		},
		rarity: "common"
	},
	{
		id: "rel-keyboard",
		icon: "⌨️",
		name: {
			zh: "附魔键盘",
			en: "Enchanted Keyboard"
		},
		rarity: "rare"
	},
	{
		id: "rel-unicorn",
		icon: "🦄",
		name: {
			zh: "独角兽干尸",
			en: "Unicorn Mummy"
		},
		rarity: "rare"
	},
	{
		id: "rel-phoenix",
		icon: "🐦",
		name: {
			zh: "灰烬凤凰",
			en: "Ashen Phoenix"
		},
		rarity: "rare"
	},
	{
		id: "rel-steak",
		icon: "🥩",
		name: {
			zh: "重构牛排",
			en: "Refactor Steak"
		},
		rarity: "rare"
	},
	{
		id: "rel-monitor",
		icon: "🖥️",
		name: {
			zh: "三屏神机",
			en: "Triple Monitor"
		},
		rarity: "rare"
	},
	{
		id: "rel-diamond",
		icon: "💎",
		name: {
			zh: "钻石合并",
			en: "Diamond Merge"
		},
		rarity: "rare"
	},
	{
		id: "rel-clock",
		icon: "⏰",
		name: {
			zh: "午夜时钟",
			en: "Midnight Clock"
		},
		rarity: "rare"
	},
	{
		id: "rel-chair",
		icon: "💺",
		name: {
			zh: "人体工学椅",
			en: "Ergo Chair"
		},
		rarity: "rare"
	},
	{
		id: "rel-badge",
		icon: "🏅",
		name: {
			zh: "CI 徽章",
			en: "CI Badge"
		},
		rarity: "rare"
	},
	{
		id: "rel-streak",
		icon: "🔗",
		name: {
			zh: "连击之链",
			en: "Combo Chain"
		},
		rarity: "rare"
	},
	{
		id: "rel-deploy",
		icon: "🚀",
		name: {
			zh: "周五部署箭",
			en: "Friday Deploy"
		},
		rarity: "epic"
	},
	{
		id: "rel-peg",
		icon: "🪵",
		name: {
			zh: "神秘木桩",
			en: "Mystic Peg"
		},
		rarity: "epic"
	},
	{
		id: "rel-time",
		icon: "⏳",
		name: {
			zh: "时间沙漏",
			en: "Time Hourglass"
		},
		rarity: "epic"
	},
	{
		id: "rel-vault",
		icon: "🏦",
		name: {
			zh: "技术债金库",
			en: "Debt Vault"
		},
		rarity: "epic"
	},
	{
		id: "rel-wizard",
		icon: "🧙",
		name: {
			zh: "重构法师杖",
			en: "Refactor Staff"
		},
		rarity: "legendary"
	},
	{
		id: "rel-dragon",
		icon: "🐉",
		name: {
			zh: "弃用龙鳞",
			en: "Deprecated Scale"
		},
		rarity: "legendary"
	},
	{
		id: "rel-one",
		icon: "1️⃣",
		name: {
			zh: "远古分号",
			en: "Ancient Semicolon"
		},
		rarity: "legendary"
	},
	{
		id: "rel-main",
		icon: "👑",
		name: {
			zh: "主分支王冠",
			en: "Main Crown"
		},
		rarity: "legendary"
	}
];
function relicById(id) {
	return RELIC_POOL.find((r) => r.id === id);
}
/** 已收集的圣物（id 集合）。 */
function ownedRelics(save) {
	return new Set((save.relics ?? []).map((r) => r.id));
}
/**
* 尝试掉落圣物（基础概率 chance ∈ [0,1]；神秘彩蛋 buff 在场时 ×2）。
* 只掉落未拥有的（全收集后返回 null）。返回 s 与掉落的圣物（无则 null）。
*/
function rollRelic(save, chance, now, seed) {
	const s = structuredClone(save);
	const owned = ownedRelics(s);
	if (owned.size >= RELIC_POOL.length) return {
		save: s,
		relic: null
	};
	const luck = relicLuckActive(s.events, now) ? 2 : 1;
	if (hashSeed(seed) % 100 / 100 >= chance * luck) return {
		save: s,
		relic: null
	};
	const candidates = RELIC_POOL.filter((r) => !owned.has(r.id));
	const weight = (r) => r.rarity === "common" ? 40 : r.rarity === "rare" ? 25 : r.rarity === "epic" ? 12 : 5;
	const total = candidates.reduce((sum, r) => sum + weight(r), 0);
	let pick = hashSeed(`relic-${seed}`) % total;
	for (const r of candidates) {
		pick -= weight(r);
		if (pick < 0) {
			s.relics = [...s.relics ?? [], {
				id: r.id,
				acquiredAt: now
			}];
			return {
				save: s,
				relic: r
			};
		}
	}
	return {
		save: s,
		relic: null
	};
}
/** 史诗任务链池（3 条剧情线）。 */
const CHAIN_QUESTS = [
	{
		id: "chain-techdebt",
		icon: "🧱",
		name: {
			zh: "征服技术债",
			en: "Tame the Tech Debt"
		},
		steps: [
			{
				need: "xp",
				target: 150,
				label: {
					zh: "第 1 天：摸清债务规模（今日 XP ≥ 150）",
					en: "Day 1: Survey the debt (150 XP today)"
				}
			},
			{
				need: "quests",
				target: 2,
				label: {
					zh: "第 2 天：清偿小额债务（完成 2 个每日任务）",
					en: "Day 2: Clear small debts (2 daily quests)"
				}
			},
			{
				need: "turns",
				target: 10,
				label: {
					zh: "第 3 天：重构冲刺（完成 10 个回合）",
					en: "Day 3: Refactor sprint (10 turns)"
				}
			},
			{
				need: "xp",
				target: 500,
				label: {
					zh: "第 4 天：债务清零（今日 XP ≥ 500）",
					en: "Day 4: Debt cleared (500 XP today)"
				}
			}
		],
		rewardXp: 500
	},
	{
		id: "chain-nightowl",
		icon: "🦉",
		name: {
			zh: "夜猫传说",
			en: "Legend of the Night Owl"
		},
		steps: [
			{
				need: "turns",
				target: 8,
				label: {
					zh: "第 1 夜：夜幕降临（完成 8 个回合）",
					en: "Night 1: Darkness falls (8 turns)"
				}
			},
			{
				need: "xp",
				target: 300,
				label: {
					zh: "第 2 夜：月光代码（今日 XP ≥ 300）",
					en: "Night 2: Moonlight code (300 XP today)"
				}
			},
			{
				need: "quests",
				target: 3,
				label: {
					zh: "第 3 夜：全清任务（完成 3 个每日任务）",
					en: "Night 3: Clear all quests"
				}
			},
			{
				need: "xp",
				target: 800,
				label: {
					zh: "第 4 夜：破晓黎明（今日 XP ≥ 800）",
					en: "Night 4: Dawn breaks (800 XP today)"
				}
			}
		],
		rewardXp: 800
	},
	{
		id: "chain-bugslayer",
		icon: "⚔️",
		name: {
			zh: "Bug 猎手",
			en: "Bug Slayer"
		},
		steps: [
			{
				need: "xp",
				target: 200,
				label: {
					zh: "第 1 天：循迹追踪（今日 XP ≥ 200）",
					en: "Day 1: Track the prey (200 XP today)"
				}
			},
			{
				need: "turns",
				target: 12,
				label: {
					zh: "第 2 天：连续作战（完成 12 个回合）",
					en: "Day 2: Relentless (12 turns)"
				}
			},
			{
				need: "xp",
				target: 600,
				label: {
					zh: "第 3 天：boss 现身（今日 XP ≥ 600）",
					en: "Day 3: Boss appears (600 XP today)"
				}
			}
		],
		rewardXp: 600
	}
];
function chainById(id) {
	return CHAIN_QUESTS.find((c) => c.id === id);
}
/** 条件是否满足（基于当天累计指标）。 */
function chainStepMet(def, save, now) {
	const today = dayKeyLocal(now);
	switch (def.need) {
		case "xp": return todayXp(save, now) >= def.target;
		case "quests": return (save.daily?.quests ?? []).filter((q) => q.claimedAt !== void 0 && dayKeyLocal(q.claimedAt) === today).length >= def.target;
		case "turns": return (save.history?.[today]?.turns ?? 0) >= def.target;
	}
}
function todayXp(save, now) {
	return save.counters.todayXpDay === dayKeyLocal(now) ? save.counters.todayXp ?? 0 : 0;
}
/**
* 每日推进任务链（回合结算后调用）：
* - 无链时（或上一链完成）不自动接链——接链由 claimChain 时从池中随机接取新链？简化：无链则随机接一条。
* - 断天重置：上次推进不是今天也不是昨天 → 链从头开始。
* - 今天未推进且条件满足 → 步骤 +1；全部完成 → finished（待领终章）。
* 返回 { save, advanced: 是否推进/断裂, finished: 是否刚完成, label? }。
*/
function advanceQuestChain(save, now, seed) {
	const s = structuredClone(save);
	const today = dayKeyLocal(now);
	const yesterday = dayKeyLocal(now - 864e5);
	const none = {
		save: s,
		advanced: false,
		reset: false,
		finished: false,
		label: null
	};
	let chain = s.questChain;
	if (chain === void 0 || chain.finished === true) {
		const pool = CHAIN_QUESTS;
		const picked = pool[hashSeed(`chain-${today}-${seed}`) % pool.length];
		s.questChain = {
			id: picked.id,
			step: 0,
			dayKeyStarted: today,
			lastProgressDay: today
		};
		return {
			...none,
			save: s,
			label: `📜 新史诗任务「${picked.name.zh}」开始！`
		};
	}
	const def = chainById(chain.id);
	if (def === void 0) return none;
	if (chain.lastProgressDay !== today && chain.lastProgressDay !== yesterday) {
		s.questChain = {
			...chain,
			step: 0,
			lastProgressDay: today
		};
		return {
			...none,
			save: s,
			reset: true,
			label: `💔 断档了……「${def.name.zh}」从头再来。`
		};
	}
	if (chain.lastProgressDay === today) return none;
	const stepDef = def.steps[chain.step];
	if (stepDef === void 0) return none;
	if (!chainStepMet(stepDef, s, now)) return none;
	const nextStep = chain.step + 1;
	if (nextStep >= def.steps.length) {
		s.questChain = {
			...chain,
			step: nextStep,
			lastProgressDay: today,
			finished: true
		};
		return {
			...none,
			save: s,
			finished: true,
			label: `🏆 「${def.name.zh}」达成！领终章奖励吧。`
		};
	}
	s.questChain = {
		...chain,
		step: nextStep,
		lastProgressDay: today
	};
	return {
		...none,
		save: s,
		advanced: true,
		label: `📜 「${def.name.zh}」推进到第 ${nextStep + 1} 步`
	};
}
/** 领取任务链终章奖励（大 XP；幂等 finished+claimed 门）。 */
function claimChainReward(save, now, seasonOverride) {
	const s = structuredClone(save);
	const chain = s.questChain;
	if (chain === void 0 || chain.finished !== true) return {
		ok: false,
		gained: 0,
		save: s
	};
	const def = chainById(chain.id);
	if (def === void 0) return {
		ok: false,
		gained: 0,
		save: s
	};
	s.questChain = {
		...chain,
		finished: false,
		claimed: true
	};
	return {
		ok: true,
		gained: def.rewardXp,
		save: s
	};
}
/** 前 7 天（不含今天）history 总和。 */
function pastWeekTotals(save, now) {
	let xp = 0;
	let turns = 0;
	const h = save.history ?? {};
	for (let i = 1; i <= 7; i++) {
		const rec = h[dayKeyLocal(now - i * 864e5)];
		if (rec !== void 0) {
			xp += rec.xp;
			turns += rec.turns;
		}
	}
	return {
		xp,
		turns
	};
}
/** 近 7 天（含今天）history 总和（本周进度）。 */
function thisWeekTotals(save, now) {
	let xp = 0;
	let turns = 0;
	const h = save.history ?? {};
	for (let i = 0; i < 7; i++) {
		const rec = h[dayKeyLocal(now - i * 864e5)];
		if (rec !== void 0) {
			xp += rec.xp;
			turns += rec.turns;
		}
	}
	return {
		xp,
		turns
	};
}
/**
* 幽灵竞速状态保证：本周未初始化且有前 7 天数据 → 生成幽灵（前 7 天总和）。
* 幽灵只在「上周有数据」时生成（首周无幽灵）。
*/
function ensureGhostRace(save, now) {
	const s = structuredClone(save);
	const g = s.ghostRace;
	if (g !== void 0 && g.week === "rolling") return s;
	const past = pastWeekTotals(s, now);
	if (past.xp <= 0 && past.turns <= 0) return s;
	s.ghostRace = {
		week: "rolling",
		ghostXp: past.xp,
		ghostTurns: past.turns,
		claimed: false
	};
	return s;
}
/** 当前对决进度（client 进度条用）。 */
function ghostRaceProgress(save, now) {
	const g = save.ghostRace;
	if (g === void 0) return {
		active: false,
		ghostXp: 0,
		ghostTurns: 0,
		myXp: 0,
		myTurns: 0,
		beaten: false,
		claimed: false
	};
	const mine = thisWeekTotals(save, now);
	const beaten = mine.xp >= g.ghostXp && mine.turns >= g.ghostTurns;
	return {
		active: true,
		ghostXp: g.ghostXp,
		ghostTurns: g.ghostTurns,
		myXp: mine.xp,
		myTurns: mine.turns,
		beaten,
		claimed: g.claimed === true
	};
}
/** 领取幽灵竞速奖励（击败且未领；+300 XP）。 */
function claimGhostReward(save, now, seasonOverride) {
	const s = structuredClone(save);
	const g = s.ghostRace;
	if (g === void 0 || g.claimed === true) return {
		ok: false,
		gained: 0,
		save: s
	};
	const mine = thisWeekTotals(s, now);
	if (mine.xp < g.ghostXp || mine.turns < g.ghostTurns) return {
		ok: false,
		gained: 0,
		save: s
	};
	s.ghostRace = {
		...g,
		claimed: true
	};
	return {
		ok: true,
		gained: 300,
		save: s
	};
}
/** 每日任务梗化花名（与正经名共存，seed 决定是否用梗版）。 */
const DAILY_QUEST_MEME = {
	dq_turns_5: {
		zh: "热热身，跑 5 个回合",
		en: "Warm up with 5 turns"
	},
	dq_turns_30: {
		zh: "狂肝 30 回合，勿扰",
		en: "Grind 30 turns, do not disturb"
	},
	dq_tools_20: {
		zh: "工具人上线：调用 20 次工具",
		en: "Tool golem: 20 tool calls"
	},
	dq_edits_10: {
		zh: "消灭 10 处代码异味",
		en: "Squash 10 code smells"
	},
	dq_edits_20: {
		zh: "屠城模式：编辑/写入 20 次",
		en: "Slay mode: 20 edits/writes"
	},
	dq_cmd_10: {
		zh: "终端老炮：跑 10 条命令",
		en: "Terminal veteran: 10 commands"
	},
	dq_todos_5: {
		zh: "清空 5 个待办，一身轻",
		en: "Clear 5 todos"
	},
	dq_ssh_1: {
		zh: "远程开荒：SSH 一次",
		en: "Remote raid: 1 SSH"
	},
	dq_comeback_1: {
		zh: "跌倒再起：失败后爬起来",
		en: "Rise from failure"
	},
	dq_night_1: {
		zh: "夜之试炼：凌晨完成回合",
		en: "Night trial: finish after midnight"
	},
	dq_distinct_8: {
		zh: "百宝工具箱：用 8 种工具",
		en: "Toolbox master: 8 tools"
	},
	dq_combo_10: {
		zh: "连击小王子：达到 10 连击",
		en: "Combo prince: 10 streak"
	}
};
/** 梗化标签（确定性抽取；约 60% 用梗版）。 */
function memedDailyLabel(id, def, seed) {
	const meme = DAILY_QUEST_MEME[id];
	if (meme === void 0) return def.label;
	return hashSeed(`${id}-${seed}`) % 100 < 60 ? meme : def.label;
}
/** 每周 BOSS 花名池。 */
const BOSS_MEME_NAMES = [
	{
		zh: "重构巨兽",
		en: "Refactor Behemoth"
	},
	{
		zh: "技术债魔龙",
		en: "Tech Debt Wyrm"
	},
	{
		zh: "死线幽灵",
		en: "Deadline Specter"
	},
	{
		zh: "吞并分号怪",
		en: "Semicolon Eater"
	},
	{
		zh: "缓存失败之龙",
		en: "Cache Miss Dragon"
	},
	{
		zh: "单元测试吞噬者",
		en: "Test Swallower"
	},
	{
		zh: "部署星期五",
		en: "Deploy Friday"
	},
	{
		zh: "生产事故兽",
		en: "Incident Beast"
	}
];
/** 按周种子取 BOSS 花名。 */
function bossMemeName(seed) {
	return BOSS_MEME_NAMES[hashSeed(`boss-${seed}`) % BOSS_MEME_NAMES.length];
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
/** 赛季 id（自动按季度）：2026-S1 = 2026 年 Q1（1-3 月），以此类推。 */
function autoSeasonId(now) {
	const d = new Date(now);
	const quarter = Math.floor(d.getMonth() / 3) + 1;
	return `${d.getFullYear()}-S${quarter}`;
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
	},
	{
		id: "dq_combo_10",
		label: {
			zh: "连击达到 10",
			en: "Reach a 10-turn combo"
		},
		goal: 10,
		reward: 100,
		progress: (c) => c.consecutiveSuccess
	},
	{
		id: "dq_combo_25",
		label: {
			zh: "连击达到 25",
			en: "Reach a 25-turn combo"
		},
		goal: 25,
		reward: 150,
		progress: (c) => c.consecutiveSuccess
	},
	{
		id: "dq_night_2",
		label: {
			zh: "凌晨完成 2 个回合",
			en: "Finish 2 turns after midnight"
		},
		goal: 2,
		reward: 150,
		progress: (c) => c.nightTurns
	}
];
/** 连续活跃奖励阶梯：连续天数 → 奖励 XP（达到新历史最高时一次性发放）。 */
const STREAK_REWARDS = {
	3: { xp: 50 },
	7: { xp: 150 },
	14: { xp: 300 },
	30: { xp: 800 }
};
/** 赛季通行证：本赛季 XP 里程碑 → 奖励 XP（赛季内一次性领取）。 */
const SEASON_PASS_TIERS = [
	{
		id: "pass-5k",
		seasonXp: 5e3,
		xp: 200
	},
	{
		id: "pass-10k",
		seasonXp: 1e4,
		xp: 500
	},
	{
		id: "pass-20k",
		seasonXp: 2e4,
		xp: 1e3
	},
	{
		id: "pass-50k",
		seasonXp: 5e4,
		xp: 2e3
	}
];
/** 当天 0 点（本地时区）epoch ms。 */
function dayStartMs(now) {
	const d = new Date(now);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}
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
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务；salt 用于重掷）。 */
function rollDailyQuests(now, salt = "") {
	const date = dayKey(now);
	const rng = seededRng(`${date}#${salt}`);
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
		quests,
		chestClaimed: false
	};
}
/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
function ensureDaily(save, now) {
	if (save.daily.date !== dayKey(now)) save.daily = rollDailyQuests(now);
	return save.daily;
}
/** 每日任务进度（含重掷基线：progress = counters 推进量 - base）。 */
function dailyProgress(def, counters, base) {
	return Math.max(0, def.progress(counters) - (base ?? 0));
}
/**
* 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。
*/
function applyDaily(save, now) {
	const daily = ensureDaily(save, now);
	let gain = 0;
	for (const q of daily.quests) {
		if (q.claimedAt !== void 0) continue;
		const def = DAILY_QUEST_POOL.find((d) => d.id === q.id);
		if (def === void 0) continue;
		q.progress = Math.min(dailyProgress(def, save.counters, q.base), q.goal);
		if (q.progress >= q.goal) {
			q.done = true;
			q.claimedAt = now;
			save.counters.dailyQuestsDone++;
			gain += q.reward;
		}
	}
	return gain;
}
/**
* 每日任务进度即时同步（纯展示，不发奖）：
* 从计数器重算每个任务的 progress/done，让面板/工具不用等下一个回合结算就能看到最新进度。
* 发奖仍由 applyDaily 在回合结算时执行（claimedAt 标记，不会重复/丢失）。
*/
function refreshDailyProgress(save, now) {
	const daily = ensureDaily(save, now);
	for (const q of daily.quests) {
		const def = DAILY_QUEST_POOL.find((d) => d.id === q.id);
		if (def === void 0) continue;
		q.progress = Math.min(dailyProgress(def, save.counters, q.base), q.goal);
		if (q.progress >= q.goal) q.done = true;
	}
	return daily;
}
/** 当天 3 个任务是否已全部完成。 */
function dailyQuestsDone(daily) {
	return daily.quests.length > 0 && daily.quests.every((q) => q.done);
}
/**
* 领取每日全清宝箱（当天 3 个任务全完成后可领一次，+DAILY_CHEST_REWARD XP）。
* 未满足条件时返回 { ok: false, gained: 0, save }（原存档副本不变）。
*/
function claimDailyChest(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const daily = ensureDaily(s, now);
	if (!dailyQuestsDone(daily) || daily.chestClaimed === true) return {
		ok: false,
		gained: 0,
		save: s
	};
	daily.chestClaimed = true;
	return {
		ok: true,
		gained: 50,
		save: addXp(s, 50, now, seasonOverride)
	};
}
/** 构造最小商店状态。 */
function freshShop() {
	return {
		spent: 0,
		shields: 0,
		rerolls: 0,
		theme: "",
		themes: [],
		badges: [],
		xpBoostTurns: 0,
		questSkips: 0,
		passClaimed: []
	};
}
/** 商店余额（本赛季可支配 XP；含 v1.3.0 每周 BOSS 掉落）。 */
function shopBalance(save) {
	return Math.max(0, save.player.seasonXp - (save.shop?.spent ?? 0) + (save.shop?.bossEarned ?? 0));
}
/**
* 购买商店商品（纯函数，返回副本）。
* 余额不足 / 重复购买主题徽章 → { ok: false, reason }。
*/
function buyShopItem(save, itemId, now = Date.now(), seasonOverride) {
	const item = SHOP_ITEMS.find((i) => i.id === itemId);
	if (item === void 0) return {
		ok: false,
		reason: "unknown-item",
		save: structuredClone(save)
	};
	const s = structuredClone(save);
	const themes = s.shop?.themes?.length ? [...s.shop.themes] : s.shop?.theme !== void 0 && s.shop.theme !== "" ? [s.shop.theme] : [];
	const shop = {
		...freshShop(),
		...s.shop ?? {},
		themes
	};
	if (item.kind === "theme" && (shop.themes.includes(item.id) || shop.theme === item.id)) return {
		ok: false,
		reason: "already-owned",
		save: s
	};
	if (item.kind === "badge" && shop.badges.includes(item.id)) return {
		ok: false,
		reason: "already-owned",
		save: s
	};
	if (shopBalance(s) < item.price) return {
		ok: false,
		reason: "insufficient-balance",
		save: s
	};
	shop.spent += item.price;
	if (item.kind === "shield") shop.shields += item.id === "shield-3" ? 3 : 1;
	if (item.kind === "reroll") shop.rerolls += 1;
	if (item.kind === "theme") {
		shop.themes = [...shop.themes, item.id];
		shop.theme = item.id;
	}
	if (item.kind === "badge") shop.badges = [...shop.badges, item.id];
	if (item.kind === "boost") shop.xpBoostTurns = (shop.xpBoostTurns ?? 0) + 10;
	if (item.kind === "skip") shop.questSkips = (shop.questSkips ?? 0) + 1;
	s.shop = shop;
	return {
		ok: true,
		save: s
	};
}
/**
* 使用 1 张任务跳过卡：直接完成一个未做的每日任务（无奖励，计入全清宝箱）。
* 库存不足 / 全部已完成 → { ok: false }。
*/
function useQuestSkip(save, now = Date.now()) {
	const s = structuredClone(save);
	const shop = {
		...freshShop(),
		...s.shop ?? {}
	};
	if ((shop.questSkips ?? 0) <= 0) return {
		ok: false,
		save: s
	};
	const target = ensureDaily(s, now).quests.find((q) => !q.done);
	if (target === void 0) return {
		ok: false,
		save: s
	};
	shop.questSkips = (shop.questSkips ?? 0) - 1;
	s.shop = shop;
	target.done = true;
	return {
		ok: true,
		save: s
	};
}
/**
* 领取赛季通行证档位奖励（达到赛季 XP 里程碑后一次性领取）。
* 已领取 / 未达标 → { ok: false }。
*/
function claimPassTier(save, tierId, now = Date.now(), seasonOverride) {
	const tier = SEASON_PASS_TIERS.find((t) => t.id === tierId);
	if (tier === void 0) return {
		ok: false,
		gained: 0,
		save: structuredClone(save)
	};
	const s = structuredClone(save);
	const shop = {
		...freshShop(),
		...s.shop ?? {},
		passClaimed: s.shop?.passClaimed ?? []
	};
	if (shop.passClaimed.includes(tier.id)) return {
		ok: false,
		gained: 0,
		save: s
	};
	if (s.player.seasonXp < tier.seasonXp) return {
		ok: false,
		gained: 0,
		save: s
	};
	shop.passClaimed = [...shop.passClaimed, tier.id];
	s.shop = shop;
	return {
		ok: true,
		gained: tier.xp,
		save: addXp(s, tier.xp, now, seasonOverride)
	};
}
/** 切换已拥有主题（id 空=默认主题；未拥有则拒绝；当前激活也视为可切换）。 */
function activateTheme(save, themeId) {
	const s = structuredClone(save);
	const themes = s.shop?.themes?.length ? [...s.shop.themes] : s.shop?.theme !== void 0 && s.shop.theme !== "" ? [s.shop.theme] : [];
	const shop = {
		...freshShop(),
		...s.shop ?? {},
		themes
	};
	if (themeId !== "" && !shop.themes.includes(themeId) && shop.theme !== themeId) return {
		ok: false,
		save: s
	};
	shop.theme = themeId;
	s.shop = shop;
	return {
		ok: true,
		save: s
	};
}
/** 使用 1 次任务重掷：重新抽取今日任务（返回副本；库存不足返回 false）。
* 防刷（v1.3.3）：重掷只换「任务外形」，不放宽领取门——
* 已发过奖的任务按 id 继承 claimedAt（抽回不重发）、宝箱领取状态保留、
* 新任务记录重掷瞬间的进度基线（base），进度从基线重新计算，不因历史计数达标而白送奖励。 */
function useReroll(save, now = Date.now()) {
	const s = structuredClone(save);
	const shop = {
		...freshShop(),
		...s.shop ?? {}
	};
	if (shop.rerolls <= 0) return {
		ok: false,
		save: s
	};
	shop.rerolls -= 1;
	s.shop = shop;
	const old = ensureDaily(s, now);
	const next = rollDailyQuests(now, `reroll-${shop.rerolls}-${Date.now() % 864e5}`);
	const oldById = new Map(old.quests.map((q) => [q.id, q]));
	for (const q of next.quests) {
		const prev = oldById.get(q.id);
		if (prev?.claimedAt !== void 0) {
			q.claimedAt = prev.claimedAt;
			q.done = true;
		}
		const def = DAILY_QUEST_POOL.find((d) => d.id === q.id);
		if (def !== void 0) q.base = def.progress(s.counters);
	}
	next.chestClaimed = old.chestClaimed === true;
	s.daily = next;
	return {
		ok: true,
		save: s
	};
}
/** 每日目标可设定的档位（XP）。 */
const DAILY_GOAL_OPTIONS = [
	200,
	400,
	800,
	1500
];
/** 今日已获 XP（跨天自动归零）。 */
function todayXpOf(save, now = Date.now()) {
	const c = save.counters;
	return c.todayXpDay === dayKey(now) ? c.todayXp ?? 0 : 0;
}
/** 设定每日 XP 目标（0=关闭）。 */
function setDailyGoal(save, goal, now = Date.now()) {
	const s = structuredClone(save);
	const g = goal === 0 ? 0 : DAILY_GOAL_OPTIONS.includes(goal) ? goal : DAILY_GOAL_OPTIONS[0];
	s.player.dailyGoal = g;
	return {
		ok: true,
		save: s
	};
}
/**
* 领取每日目标奖励：今日 XP 达到目标且当日未领 → +50 XP（每天一次）。
* 返回是否成功与领取的 XP。
*/
function claimDailyGoal(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const goal = s.player.dailyGoal ?? 0;
	const today = dayKey(now);
	if (goal <= 0) return {
		ok: false,
		gained: 0,
		save: s
	};
	if (s.player.dailyGoalClaimedDay === today) return {
		ok: false,
		gained: 0,
		save: s
	};
	if (todayXpOf(s, now) < goal) return {
		ok: false,
		gained: 0,
		save: s
	};
	s.player.dailyGoalClaimedDay = today;
	s.counters.goalDays = (s.counters.goalDays ?? 0) + 1;
	return {
		ok: true,
		gained: 50,
		save: addXp(s, 50, now, seasonOverride)
	};
}
/** 检查新手链：返回新完成的 step id 列表（已完成的跳过），并结算奖励 XP。 */
function checkTutorial(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const tutorial = s.tutorial ?? {
		steps: {},
		done: false
	};
	const doneIds = new Set(Object.keys(tutorial.steps));
	const newly = [];
	for (const step of TUTORIAL_STEPS) {
		if (doneIds.has(step.id)) continue;
		if (step.check(s.counters)) {
			tutorial.steps[step.id] = now;
			newly.push(step.id);
		}
	}
	const allDone = TUTORIAL_STEPS.every((step) => tutorial.steps[step.id] !== void 0);
	tutorial.done = allDone;
	s.tutorial = tutorial;
	let gain = newly.length * 20;
	if (allDone && !doneIds.has("__complete")) {
		tutorial.steps["__complete"] = now;
		gain += 100;
	}
	return {
		stepIds: newly,
		complete: allDone,
		save: gain > 0 ? addXp(s, gain, now, seasonOverride) : s
	};
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
		streakBest: 0,
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
		seasonTokensOut: 0,
		todayTools: [],
		todayToolsDay: "",
		todayXp: 0,
		todayXpDay: ""
	};
}
/** 构造最小玩家状态。seasonOverride 缺省按当前日期自动推导季度赛季。 */
function freshPlayer(seasonOverride, now) {
	return {
		level: 1,
		xp: 0,
		xpTotal: 0,
		title: titleFor(1).zh,
		season: seasonOverride ?? autoSeasonId(now),
		seasonXp: 0,
		levelStartedAt: now
	};
}
/** 构造最小存档。seasonOverride 缺省按当前日期自动推导季度赛季。 */
function freshSave(cwd, seasonOverride, now = Date.now()) {
	return {
		version: 1,
		cwd,
		player: freshPlayer(seasonOverride, now),
		counters: freshCounters(),
		achievements: {},
		lastSeqBySession: {},
		daily: rollDailyQuests(now),
		settlements: [],
		history: {},
		shop: freshShop(),
		tutorial: {
			steps: {},
			done: false
		},
		collections: { completed: {} },
		lucky: {
			date: "",
			claimed: false
		},
		weekly: rollWeeklyQuests(now),
		titles: {
			unlocked: [],
			active: ""
		},
		records: {},
		updatedAt: now
	};
}
/** 赛季商店：用本赛季 XP 消费（换季清零，天然防通胀）。 */
const SHOP_ITEMS = [
	{
		id: "shield-1",
		kind: "shield",
		icon: "🛡️",
		price: 150,
		name: {
			zh: "连击保险",
			en: "Combo Shield"
		},
		description: {
			zh: "获得 1 个连击保险：失误回合自动消耗一个，连击不清零",
			en: "Buy 1 combo shield: a failed turn consumes it instead of breaking your combo"
		}
	},
	{
		id: "shield-3",
		kind: "shield",
		icon: "⚔️",
		price: 400,
		name: {
			zh: "连击保险 ×3",
			en: "Combo Shield ×3"
		},
		description: {
			zh: "3 个连击保险（9 折）",
			en: "3 combo shields (10% off)"
		}
	},
	{
		id: "reroll-1",
		kind: "reroll",
		icon: "🔀",
		price: 120,
		name: {
			zh: "任务重掷",
			en: "Quest Reroll"
		},
		description: {
			zh: "重掷今天的每日任务（任务与奖励重新抽取）",
			en: "Reroll today's daily quests"
		}
	},
	{
		id: "theme-ember",
		kind: "theme",
		icon: "🔥",
		price: 300,
		name: {
			zh: "熔火主题",
			en: "Ember Theme"
		},
		description: {
			zh: "面板切换为熔火橙配色",
			en: "Switch the panel to ember-orange colors"
		}
	},
	{
		id: "theme-frost",
		kind: "theme",
		icon: "❄️",
		price: 300,
		name: {
			zh: "寒霜主题",
			en: "Frost Theme"
		},
		description: {
			zh: "面板切换为寒霜蓝配色",
			en: "Switch the panel to frost-blue colors"
		}
	},
	{
		id: "theme-verdant",
		kind: "theme",
		icon: "🌿",
		price: 300,
		name: {
			zh: "青翠主题",
			en: "Verdant Theme"
		},
		description: {
			zh: "面板切换为青翠绿配色",
			en: "Switch the panel to verdant-green colors"
		}
	},
	{
		id: "theme-sunset",
		kind: "theme",
		icon: "🌇",
		price: 300,
		name: {
			zh: "落日主题",
			en: "Sunset Theme"
		},
		description: {
			zh: "面板切换为落日珊瑚橙配色",
			en: "Switch the panel to sunset-coral colors"
		}
	},
	{
		id: "theme-ocean",
		kind: "theme",
		icon: "🌊",
		price: 300,
		name: {
			zh: "深海主题",
			en: "Ocean Theme"
		},
		description: {
			zh: "面板切换为深海青碧配色",
			en: "Switch the panel to deep-teal colors"
		}
	},
	{
		id: "theme-sakura",
		kind: "theme",
		icon: "🌸",
		price: 300,
		name: {
			zh: "樱花主题",
			en: "Sakura Theme"
		},
		description: {
			zh: "面板切换为樱花粉配色",
			en: "Switch the panel to sakura-pink colors"
		}
	},
	{
		id: "theme-royal",
		kind: "theme",
		icon: "💜",
		price: 300,
		name: {
			zh: "紫晶主题",
			en: "Royal Theme"
		},
		description: {
			zh: "面板切换为紫晶紫配色",
			en: "Switch the panel to royal-violet colors"
		}
	},
	{
		id: "theme-gold",
		kind: "theme",
		icon: "✨",
		price: 300,
		name: {
			zh: "鎏金主题",
			en: "Gold Theme"
		},
		description: {
			zh: "面板切换为鎏金黄配色",
			en: "Switch the panel to gold colors"
		}
	},
	{
		id: "theme-peach",
		kind: "theme",
		icon: "🍑",
		price: 300,
		name: {
			zh: "蜜桃主题",
			en: "Peach Theme"
		},
		description: {
			zh: "面板切换为蜜桃粉橙配色",
			en: "Switch the panel to peach colors"
		}
	},
	{
		id: "theme-neon",
		kind: "theme",
		icon: "🌌",
		price: 300,
		name: {
			zh: "霓虹主题",
			en: "Neon Theme"
		},
		description: {
			zh: "面板切换为霓虹蓝紫配色",
			en: "Switch the panel to neon blue-violet colors"
		}
	},
	{
		id: "badge-crown",
		kind: "badge",
		icon: "👑",
		price: 250,
		name: {
			zh: "王冠徽章",
			en: "Crown Badge"
		},
		description: {
			zh: "称号旁展示 👑 王冠徽章",
			en: "Show a crown badge next to your title"
		}
	},
	{
		id: "badge-star",
		kind: "badge",
		icon: "🌟",
		price: 250,
		name: {
			zh: "星芒徽章",
			en: "Star Badge"
		},
		description: {
			zh: "称号旁展示 🌟 星芒徽章",
			en: "Show a star badge next to your title"
		}
	},
	{
		id: "boost-1",
		kind: "boost",
		icon: "⚡",
		price: 200,
		name: {
			zh: "经验加成卡",
			en: "XP Boost Card"
		},
		description: {
			zh: "接下来 10 个回合 XP +50%",
			en: "+50% XP for the next 10 turns"
		}
	},
	{
		id: "skip-1",
		kind: "skip",
		icon: "⏭️",
		price: 150,
		name: {
			zh: "任务跳过卡",
			en: "Quest Skip Card"
		},
		description: {
			zh: "直接完成一个未做的每日任务（无奖励，但计入全清）",
			en: "Auto-complete one unfinished daily quest (no reward, counts toward the chest)"
		}
	}
];
const TUTORIAL_STEPS = [
	{
		id: "first-turn",
		name: {
			zh: "完成首个回合",
			en: "Finish your first turn"
		},
		icon: "🚶",
		xp: 20,
		check: (c) => c.turnsCompleted >= 1
	},
	{
		id: "first-edit",
		name: {
			zh: "第一次编辑",
			en: "Make your first edit"
		},
		icon: "✏️",
		xp: 20,
		check: (c) => (c.toolCallsByTool["edit"] ?? 0) + (c.toolCallsByTool["str-replace-editor"] ?? 0) + (c.toolCallsByTool["write"] ?? 0) >= 1
	},
	{
		id: "first-todo",
		name: {
			zh: "完成首个待办",
			en: "Complete your first todo"
		},
		icon: "📋",
		xp: 20,
		check: (c) => c.todosCompleted >= 1
	},
	{
		id: "first-command",
		name: {
			zh: "运行第一条命令",
			en: "Run your first command"
		},
		icon: "⌨️",
		xp: 20,
		check: (c) => (c.toolCallsByTool["pwsh"] ?? 0) + (c.toolCallsByTool["bash"] ?? 0) >= 1
	},
	{
		id: "first-check",
		name: {
			zh: "查看一次进度",
			en: "Check your progress"
		},
		icon: "👀",
		xp: 20,
		check: (c) => c.devquestCalls >= 1
	}
];
/** 新手链专属称号（全部完成解锁）。 */
const TUTORIAL_TITLE = {
	zh: "见习冒险者",
	en: "Rookie Adventurer"
};
/** 条件称号池（按里程碑/成就解锁）。 */
const TITLE_POOL = [
	{
		id: "t-100edits",
		name: {
			zh: "百炼之匠",
			en: "Hundred Smith"
		},
		icon: "⚒️",
		description: {
			zh: "累计 100 次编辑/写入",
			en: "100 edits or writes in total"
		},
		check: (s) => s.counters.craftTools >= 100
	},
	{
		id: "t-500edits",
		name: {
			zh: "铸剑大师",
			en: "Sword Smith"
		},
		icon: "🗡️",
		description: {
			zh: "累计 500 次编辑/写入",
			en: "500 edits or writes in total"
		},
		check: (s) => s.counters.craftTools >= 500
	},
	{
		id: "t-100turns",
		name: {
			zh: "百回战将",
			en: "Centurion"
		},
		icon: "🏇",
		description: {
			zh: "累计完成 100 个回合",
			en: "Complete 100 turns in total"
		},
		check: (s) => s.counters.turnsCompleted >= 100
	},
	{
		id: "t-30streak",
		name: {
			zh: "月之守护",
			en: "Month Warden"
		},
		icon: "🌙",
		description: {
			zh: "连续 30 天活跃",
			en: "Stay active 30 days in a row"
		},
		check: (s) => s.counters.streakDays >= 30
	},
	{
		id: "t-allachs",
		name: {
			zh: "全成就之主",
			en: "All-Rounder"
		},
		icon: "👑",
		description: {
			zh: "解锁全部成就",
			en: "Unlock every achievement"
		},
		check: (_s, _now) => false
	}
];
/** 检查条件称号：返回新解锁的称号 id 列表（一次性）。 */
function checkTitles(save, now = Date.now()) {
	const s = structuredClone(save);
	const titles = s.titles ?? {
		unlocked: [],
		active: ""
	};
	const unlocked = [];
	for (const t of TITLE_POOL) {
		if (titles.unlocked.includes(t.id)) continue;
		if (t.id === "t-allachs") continue;
		if (t.check(s, now)) {
			titles.unlocked.push(t.id);
			unlocked.push(t.id);
		}
	}
	s.titles = titles;
	return {
		unlocked,
		save: s
	};
}
/** 切换展示称号（active 空 = 跟随等级）。 */
function setActiveTitle(save, titleId) {
	const s = structuredClone(save);
	const titles = s.titles ?? {
		unlocked: [],
		active: ""
	};
	if (titleId !== "" && !titles.unlocked.includes(titleId)) return {
		ok: false,
		save: s
	};
	titles.active = titleId;
	s.titles = titles;
	return {
		ok: true,
		save: s
	};
}
/** 每周挑战池。 */
const WEEKLY_QUEST_POOL = [
	{
		id: "wq_turns_30",
		label: {
			zh: "完成 30 个回合",
			en: "Finish 30 turns"
		},
		goal: 30,
		reward: 120,
		progress: (c) => c.turnsCompleted
	},
	{
		id: "wq_turns_60",
		label: {
			zh: "完成 60 个回合",
			en: "Finish 60 turns"
		},
		goal: 60,
		reward: 200,
		progress: (c) => c.turnsCompleted
	},
	{
		id: "wq_tools_200",
		label: {
			zh: "调用 200 次工具",
			en: "Call 200 tools"
		},
		goal: 200,
		reward: 150,
		progress: (c) => c.toolCalls
	},
	{
		id: "wq_tools_500",
		label: {
			zh: "调用 500 次工具",
			en: "Call 500 tools"
		},
		goal: 500,
		reward: 250,
		progress: (c) => c.toolCalls
	},
	{
		id: "wq_edits_60",
		label: {
			zh: "编辑/写入 60 次",
			en: "Edit or write 60 times"
		},
		goal: 60,
		reward: 150,
		progress: (c) => c.craftTools
	},
	{
		id: "wq_cmd_80",
		label: {
			zh: "命令行 80 次",
			en: "Run 80 commands"
		},
		goal: 80,
		reward: 150,
		progress: (c) => (c.toolCallsByTool.pwsh ?? 0) + (c.toolCallsByTool.bash ?? 0)
	},
	{
		id: "wq_todos_30",
		label: {
			zh: "完成 30 个待办",
			en: "Complete 30 todos"
		},
		goal: 30,
		reward: 200,
		progress: (c) => c.todosCompleted
	},
	{
		id: "wq_tokens_300k",
		label: {
			zh: "输出 300k tokens",
			en: "Output 300k tokens"
		},
		goal: 3e5,
		reward: 180,
		progress: (c) => c.tokensOut
	},
	{
		id: "wq_tokens_800k",
		label: {
			zh: "输出 800k tokens",
			en: "Output 800k tokens"
		},
		goal: 8e5,
		reward: 300,
		progress: (c) => c.tokensOut
	},
	{
		id: "wq_subagent_5",
		label: {
			zh: "派出 5 个子代理",
			en: "Spawn 5 subagents"
		},
		goal: 5,
		reward: 180,
		progress: (c) => c.subagentsSpawned
	},
	{
		id: "wq_distinct_15",
		label: {
			zh: "使用 15 种不同工具",
			en: "Use 15 different tools"
		},
		goal: 15,
		reward: 150,
		progress: (c) => c.todayTools.length
	},
	{
		id: "wq_night_5",
		label: {
			zh: "凌晨完成 5 个回合",
			en: "Finish 5 turns after midnight"
		},
		goal: 5,
		reward: 200,
		progress: (c) => c.nightTurns
	}
];
/** ISO 周键 'YYYY-Www'（周一为一周开始）。 */
function weekKey(now) {
	const d = new Date(now);
	const day = (d.getDay() + 6) % 7;
	const thursday = new Date(d);
	thursday.setDate(d.getDate() - day + 3);
	const year = thursday.getFullYear();
	const jan1 = new Date(year, 0, 1);
	const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 864e5 + 1) / 7);
	return `${year}-W${String(week).padStart(2, "0")}`;
}
/** 按周滚动本周挑战（同周结果确定）。 */
function rollWeeklyQuests(now) {
	const week = weekKey(now);
	const rng = seededRng(`${week}#weekly`);
	const pool = [...WEEKLY_QUEST_POOL];
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
		week,
		quests
	};
}
/** 周过期时重滚（幂等）。 */
function ensureWeekly(save, now) {
	if (save.weekly === void 0 || save.weekly.week !== weekKey(now)) save.weekly = rollWeeklyQuests(now);
	return save.weekly;
}
/** 推进每周挑战进度并自动结算，返回本轮奖励 XP（与每日任务同机制）。 */
function applyWeekly(save, now) {
	const weekly = ensureWeekly(save, now);
	let gain = 0;
	for (const q of weekly.quests) {
		if (q.claimedAt !== void 0) continue;
		const def = WEEKLY_QUEST_POOL.find((d) => d.id === q.id);
		if (def === void 0) continue;
		q.progress = Math.min(def.progress(save.counters), q.goal);
		if (q.progress >= q.goal) {
			q.done = true;
			q.claimedAt = now;
			gain += q.reward;
		}
	}
	return gain;
}
/** Boss 名池（按周确定选择）。 */
const BOSS_NAMES = [
	{
		icon: "🐉",
		name: {
			zh: "代码恶龙",
			en: "Code Wyrm"
		}
	},
	{
		icon: "🦾",
		name: {
			zh: "锈蚀魔像",
			en: "Rust Golem"
		}
	},
	{
		icon: "👾",
		name: {
			zh: "冲突兽",
			en: "Merge Beast"
		}
	},
	{
		icon: "🧟",
		name: {
			zh: "遗留僵尸",
			en: "Legacy Zombie"
		}
	},
	{
		icon: "🐙",
		name: {
			zh: "千手章鱼",
			en: "Kraken of Tasks"
		}
	},
	{
		icon: "💾",
		name: {
			zh: "磁盘守卫",
			en: "Disk Guardian"
		}
	}
];
/** 合成本周 Boss（纯函数）。 */
function computeWeeklyBoss(save, now = Date.now()) {
	const weekly = ensureWeekly(save, now);
	if (weekly === void 0) return null;
	const idx = Math.abs(hashStr(weekly.week)) % BOSS_NAMES.length;
	const def = BOSS_NAMES[idx];
	let hp = 0;
	let damage = 0;
	let doneCount = 0;
	for (const q of weekly.quests) {
		hp += q.goal;
		const d = q.done ? q.goal : Math.min(q.progress, q.goal);
		damage += d;
		if (q.done) doneCount++;
	}
	return {
		week: weekly.week,
		name: def.name.zh,
		icon: def.icon,
		hp: Math.max(hp, 1),
		damage,
		defeated: doneCount >= weekly.quests.length && weekly.quests.length > 0,
		claimed: weekly.bossClaimed === true
	};
}
/** 简单字符串散列（Boss 名确定选择用）。 */
function hashStr(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
	return h;
}
/**
* 领取每周 BOSS 掉落：3 个周挑战全完成且本周未领 → +WEEKLY_BOSS_REWARD 赛季货币。
*/
function claimWeeklyBoss(save, now = Date.now()) {
	const s = structuredClone(save);
	const weekly = s.weekly;
	if (weekly === void 0 || weekly.week !== weekKey(now)) return {
		ok: false,
		gained: 0,
		save: s
	};
	if (weekly.bossClaimed === true) return {
		ok: false,
		gained: 0,
		save: s
	};
	if (weekly.quests.filter((q) => q.done).length < weekly.quests.length || weekly.quests.length === 0) return {
		ok: false,
		gained: 0,
		save: s
	};
	weekly.bossClaimed = true;
	s.counters.bossSlain = (s.counters.bossSlain ?? 0) + 1;
	const shop = {
		...freshShop(),
		...s.shop ?? {}
	};
	shop.bossEarned = (shop.bossEarned ?? 0) + 150;
	s.shop = shop;
	return {
		ok: true,
		gained: 150,
		save: s
	};
}
/**
* 每周挑战进度即时同步（纯展示，不发奖）：从计数器重算 progress/done，
* 让面板/工具不用等下一个回合结算就能看到最新进度。发奖仍由 applyWeekly 执行。
*/
function refreshWeeklyProgress(save, now) {
	const weekly = ensureWeekly(save, now);
	for (const q of weekly.quests) {
		const def = WEEKLY_QUEST_POOL.find((d) => d.id === q.id);
		if (def === void 0) continue;
		q.progress = Math.min(def.progress(save.counters), q.goal);
		if (q.progress >= q.goal) q.done = true;
	}
	return weekly;
}
/** 领取每周全清奖励（3 个全完成可领一次 +100 XP）。 */
function claimWeeklyBonus(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const weekly = ensureWeekly(s, now);
	if (weekly.quests.length === 0 || !weekly.quests.every((q) => q.done) || weekly.bonusClaimed === true) return {
		ok: false,
		gained: 0,
		save: s
	};
	weekly.bonusClaimed = true;
	return {
		ok: true,
		gained: 100,
		save: addXp(s, 100, now, seasonOverride)
	};
}
/** 各分类集齐奖励 XP（按分类含成就数/难度给）。 */
const COLLECTION_REWARDS = {
	journey: 300,
	crafting: 400,
	quest: 300,
	time: 400,
	legend: 800,
	egg: 500
};
/** 更新当前赛季纪录（纯函数，返回副本）。换季时旧纪录保留在 records 里。 */
function updateRecords(save, now = Date.now()) {
	const s = structuredClone(save);
	const season = s.player.season;
	const records = { ...s.records ?? {} };
	const cur = records[season] ?? {
		level: 0,
		combo: 0,
		seasonXp: 0
	};
	if (s.player.level > cur.level) cur.level = s.player.level;
	if (s.counters.consecutiveSuccess > cur.combo) cur.combo = s.counters.consecutiveSuccess;
	if (s.player.seasonXp > cur.seasonXp) cur.seasonXp = s.player.seasonXp;
	records[season] = cur;
	s.records = records;
	return s;
}
/** 组装荣誉墙（按赛季倒序，最近在前）。 */
function buildRecordsView(save) {
	const records = save.records ?? {};
	return Object.entries(records).map(([season, r]) => ({
		season,
		level: r.level,
		combo: r.combo,
		seasonXp: r.seasonXp
	})).sort((a, b) => a.season < b.season ? 1 : -1);
}
/** 裁剪荣誉墙：只保留最近 RECORDS_KEEP 个赛季。 */
function trimRecords(save) {
	const s = structuredClone(save);
	if (s.records === void 0) return s;
	const seasons = Object.keys(s.records).sort().reverse();
	if (seasons.length <= 8) return s;
	const keep = new Set(seasons.slice(0, 8));
	for (const season of seasons) if (!keep.has(season)) delete s.records[season];
	return s;
}
/**
* 检查分类收藏：返回新完成的分类（含奖励 XP 的存档副本）。
* completed 记录集齐时间；奖励计入累计 XP。
*/
function checkCollections(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const collections = s.collections ?? { completed: {} };
	const completed = [];
	let gain = 0;
	for (const cat of CATEGORY_IDS) {
		if (collections.completed[cat] !== void 0) continue;
		const defs = ACHIEVEMENTS_BY_CATEGORY[cat];
		if (defs === void 0) continue;
		if (defs.every((id) => s.achievements[id] !== void 0)) {
			collections.completed[cat] = now;
			completed.push(cat);
			gain += COLLECTION_REWARDS[cat] ?? 0;
		}
	}
	s.collections = collections;
	return {
		completed,
		save: gain > 0 ? addXp(s, gain, now, seasonOverride) : s
	};
}
/** 每分类成就列表（供收藏检查用；避免循环依赖 achievements.ts）。 */
const ACHIEVEMENTS_BY_CATEGORY = {
	journey: [
		"first_turn",
		"turns_10",
		"turns_25",
		"turns_50",
		"turns_100",
		"turns_250",
		"turns_500",
		"comeback",
		"comeback_10",
		"steel_will"
	],
	crafting: [
		"first_edit",
		"edits_100",
		"edits_500",
		"edits_1000",
		"first_cmd",
		"first_remote",
		"first_subagent",
		"subagents_10",
		"tool_666",
		"cmd_100",
		"tools_250",
		"class_editor"
	],
	quest: [
		"first_todo",
		"todos_10",
		"todos_50",
		"todos_100",
		"clean_sweep",
		"daily_quest_10",
		"daily_quest_30",
		"daily_quest_50",
		"boss_slayer",
		"boss_3"
	],
	time: [
		"night_owl",
		"early_bird",
		"night_owl_10",
		"seven_days",
		"streak_14",
		"streak_30",
		"grinder",
		"goal_1"
	],
	legend: [
		"level_5",
		"level_10",
		"level_15",
		"level_20",
		"level_25",
		"level_30",
		"season_100k",
		"class_versatile"
	],
	egg: [
		"devil_hour",
		"self_aware",
		"oops",
		"thinker",
		"jack_of_all",
		"keyboard_warrior",
		"midnight_bell",
		"combo_master",
		"lunch_break",
		"egg_boss_dusk"
	]
};
/** 分类 id 列表。 */
const CATEGORY_IDS = [
	"journey",
	"crafting",
	"quest",
	"time",
	"legend",
	"egg"
];
/** 每日抽奖奖池（权重表）。 */
const LUCKY_POOL = [
	{
		weight: 30,
		roll: () => ({
			kind: "xp",
			amount: 50,
			label: "⚡ +50 XP"
		})
	},
	{
		weight: 20,
		roll: () => ({
			kind: "xp",
			amount: 100,
			label: "⚡ +100 XP"
		})
	},
	{
		weight: 15,
		roll: () => ({
			kind: "currency",
			amount: 100,
			label: "💰 +100 赛季货币"
		})
	},
	{
		weight: 15,
		roll: () => ({
			kind: "shield",
			count: 1,
			label: "🛡️ 连击保险 ×1"
		})
	},
	{
		weight: 10,
		roll: () => ({
			kind: "reroll",
			count: 1,
			label: "🔀 任务重掷 ×1"
		})
	},
	{
		weight: 10,
		roll: () => ({
			kind: "xp",
			amount: 200,
			label: "🌟 +200 XP"
		})
	}
];
/** 每日幸运抽奖（每天一次；未抽过时可用）。返回奖励与存档副本。 */
function claimLucky(save, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const today = dayKey(now);
	const lucky = s.lucky ?? {
		date: "",
		claimed: false
	};
	if (lucky.date === today && lucky.claimed) return {
		ok: false,
		save: s
	};
	const total = LUCKY_POOL.reduce((sum, p) => sum + p.weight, 0);
	let r = Math.floor(Math.random() * total);
	let reward = LUCKY_POOL[0].roll();
	for (const p of LUCKY_POOL) {
		if (r < p.weight) {
			reward = p.roll();
			break;
		}
		r -= p.weight;
	}
	s.lucky = {
		date: today,
		claimed: true
	};
	switch (reward.kind) {
		case "xp": return {
			ok: true,
			reward,
			save: addXp(s, reward.amount, now, seasonOverride)
		};
		case "currency": return {
			ok: true,
			reward,
			save: addXp(s, reward.amount, now, seasonOverride)
		};
		case "shield": {
			const shop = {
				...freshShop(),
				...s.shop ?? {}
			};
			shop.shields += reward.count;
			s.shop = shop;
			return {
				ok: true,
				reward,
				save: s
			};
		}
		case "reroll": {
			const shop = {
				...freshShop(),
				...s.shop ?? {}
			};
			shop.rerolls += reward.count;
			s.shop = shop;
			return {
				ok: true,
				reward,
				save: s
			};
		}
	}
}
/** 下一个更高称号（无则返回 null）。 */
function nextTitle(level) {
	let next = null;
	for (const t of TITLES) if (t.min > level) {
		next = {
			level: t.min,
			name: {
				zh: t.zh,
				en: t.en
			}
		};
		break;
	}
	return next;
}
/** 从 level 升到 targetLevel 所需累计 XP。 */
function xpToLevel(level, target) {
	let need = 0;
	for (let l = level; l < target; l++) need += xpToNext(l);
	return need;
}
/**
* 赛季换季结算（v1.3.3 统一三入口）：生成上赛季战绩摘要 + 一次性纪念奖励（防重放）。
* 返回纪念 XP；prevSeason 为空（全新档）或已结算过时返回 0。
* 注意：调用方需先完成赛季切换（s.player.season 已置新赛季、seasonXp 已清零）。
*/
function settleSeason(s, prevSeason, now) {
	const settled = s.player.seasonSettled ?? {};
	if (prevSeason === "" || settled[prevSeason] === true) return 0;
	settled[prevSeason] = true;
	s.player.seasonSettled = settled;
	const prevRec = s.records?.[prevSeason];
	s.player.seasonSummary = {
		season: prevSeason,
		level: prevRec?.level ?? s.player.level,
		comboBest: prevRec?.combo ?? s.counters.streakBest ?? 0,
		seasonXp: prevRec?.seasonXp ?? s.player.seasonXp,
		achievements: Object.keys(s.achievements ?? {}).length
	};
	return 200;
}
/**
* 加 XP 并处理升级、活跃日统计与赛季换季（返回副本；原存档不变）。
* seasonOverride 缺省按日期自动推导季度赛季；设置后赛季固定不换季。
*/
function addXp(save, gain, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const season = seasonOverride ?? autoSeasonId(now);
	if (s.player.season !== season) {
		const prevSeason = s.player.season;
		s.player.season = season;
		s.player.seasonXp = 0;
		s.counters.seasonTokensOut = 0;
		gain += settleSeason(s, prevSeason, now);
		s.shop = {
			...freshShop(),
			theme: s.shop?.theme ?? "",
			themes: s.shop?.themes ?? [],
			badges: s.shop?.badges ?? []
		};
	}
	const c = s.counters;
	c.lastActivityAt = now;
	const today = dayKey(now);
	const yesterday = dayKey(now - 864e5);
	if (c.lastActiveDay !== "" && c.lastActiveDay !== today && c.lastActiveDay !== yesterday && autoSeasonId(Date.parse(c.lastActiveDay)) === season) {
		const gapDays = Math.floor((dayStartMs(now) - dayStartMs(Date.parse(c.lastActiveDay))) / 864e5);
		if (gapDays >= 3) gain += 100 + Math.min(200, gapDays * 10);
	}
	if (c.lastActiveDay !== today) {
		c.streakDays = c.lastActiveDay === yesterday ? c.streakDays + 1 : 1;
		c.activeDays++;
		c.lastActiveDay = today;
		if ((c.streakBest ?? 0) < c.streakDays) {
			c.streakBest = c.streakDays;
			const tier = STREAK_REWARDS[c.streakDays];
			if (tier !== void 0) gain += tier.xp;
		}
	}
	if (gain > 0) {
		s.player.xp += gain;
		s.player.xpTotal += gain;
		s.player.seasonXp += gain;
	}
	if ((c.todayXpDay ?? "") !== today) {
		c.todayXp = 0;
		c.todayXpDay = today;
	}
	if (gain > 0) c.todayXp = (c.todayXp ?? 0) + gain;
	const levelBefore = s.player.level;
	while (s.player.xp >= xpToNext(s.player.level)) {
		s.player.xp -= xpToNext(s.player.level);
		s.player.level++;
	}
	if (s.player.level > levelBefore) s.player.levelStartedAt = now;
	s.player.title = titleFor(s.player.level).zh;
	if (gain > 0) {
		const history = s.history ?? {};
		const h = history[today] ?? {
			xp: 0,
			turns: 0
		};
		h.xp += gain;
		history[today] = h;
		s.history = trimHistory(history, now);
	}
	s.updatedAt = now;
	return s;
}
/** 裁剪每日历史：只保留最近 HISTORY_KEEP 天。 */
function trimHistory(history, now) {
	const cutoff = dayKey(now - 2592e6);
	const out = {};
	for (const [date, h] of Object.entries(history)) if (date >= cutoff) out[date] = h;
	return out;
}
/**
* 单回合结算（返回存档 + 结算明细）。语义同 applyTurn。
*/
function applyTurnDetailed(save, actions, now = Date.now(), seasonOverride) {
	let s = structuredClone(save);
	const c = s.counters;
	const levelBefore = s.player.level;
	let toolGain = 0;
	let gain = 0;
	let tokenXp = 0;
	let todoXp = 0;
	let sweeps = 0;
	let turnTokens = 0;
	let seasonBonus = 0;
	const season = seasonOverride ?? autoSeasonId(now);
	if (s.player.season !== season) {
		const prevSeason = s.player.season;
		s.player.season = season;
		s.player.seasonXp = 0;
		c.seasonTokensOut = 0;
		seasonBonus = settleSeason(s, prevSeason, now);
		s.shop = {
			...freshShop(),
			theme: s.shop?.theme ?? "",
			themes: s.shop?.themes ?? [],
			badges: s.shop?.badges ?? []
		};
	}
	for (const a of actions) switch (a.kind) {
		case "tool-call": {
			toolGain += xpForTool(a.tool);
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
		}
		case "tool-failed":
			c.lastErrorTool = a.tool;
			c.lastErrorAt = now;
			break;
		case "todo-completed":
			todoXp += 15 * a.count;
			c.todosCompleted += a.count;
			if (a.allCompleted === true) {
				c.cleanSweeps++;
				sweeps++;
			}
			break;
		case "tokens":
			tokenXp += xpForAction(a);
			c.tokensOut += a.tokens;
			c.seasonTokensOut += a.tokens;
			turnTokens += a.tokens;
			break;
		case "subagent":
			c.subagentsSpawned += a.depth > 0 ? 1 : 0;
			break;
		default: gain += xpForAction(a);
	}
	if (turnTokens > c.maxTokensTurn) c.maxTokensTurn = turnTokens;
	const completed = actions.some((a) => a.kind === "turn-completed");
	const failed = actions.some((a) => a.kind === "turn-failed");
	const mods = tickEvents(s, completed, failed, now);
	let combo = null;
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
	} else if (failed) {
		c.turnsFailed++;
		if (mods.shieldFailure || (s.shop?.shields ?? 0) > 0) {
			if (!mods.shieldFailure) s.shop = {
				...s.shop ?? {
					spent: 0,
					shields: 0,
					rerolls: 0,
					theme: "",
					themes: [],
					badges: []
				},
				shields: (s.shop?.shields ?? 0) - 1
			};
		} else c.consecutiveSuccess = 0;
	}
	let eventCard = null;
	if (completed) {
		c.turnsSinceEvent = (c.turnsSinceEvent ?? 0) + 1;
		if ((c.turnsSinceEvent ?? 0) >= 20) {
			const rolled = rollEvent(s, now, `${dayKey(now)}-${c.turnsCompleted}`);
			if (rolled !== null) {
				s = rolled.save;
				eventCard = {
					id: rolled.id,
					def: rolled.def
				};
			}
		}
	}
	const stance = completed ? comboStance(c.consecutiveSuccess) : null;
	const toolBonus = toolGain > 0 ? mods.toolBonus + (stance?.toolBonus ?? 0) : 0;
	let gainTotal = Math.min(toolGain, 10) + toolBonus + Math.round(tokenXp * mods.tokenMultiplier * (stance?.tokenMultiplier ?? 1)) + (mods.todoBonus ? todoXp * 2 : todoXp) + gain;
	if (completed) {
		if (c.consecutiveSuccess >= 30) {
			gainTotal = Math.round(gainTotal * 2.5);
			combo = 2.5;
		} else if (c.consecutiveSuccess >= 15) {
			gainTotal = Math.round(gainTotal * 2);
			combo = 2;
		} else if (c.consecutiveSuccess >= 5) {
			gainTotal = Math.round(gainTotal * 1.5);
			combo = 1.5;
		}
	}
	if (gainTotal > 0 && (s.shop?.xpBoostTurns ?? 0) > 0) {
		gainTotal = Math.round(gainTotal * 1.5);
		s.shop = {
			...s.shop ?? {
				spent: 0,
				shields: 0,
				rerolls: 0,
				theme: "",
				themes: [],
				badges: []
			},
			xpBoostTurns: (s.shop?.xpBoostTurns ?? 0) - 1
		};
	}
	if (mods.wipeGain) gainTotal = 0;
	gainTotal = Math.min(gainTotal, 125);
	const questGain = applyDaily(s, now) + applyWeekly(s, now);
	const next = addXp(s, gainTotal + questGain + seasonBonus, now, seasonOverride);
	const turnsDone = completed || failed ? 1 : 0;
	let withRecords = trimRecords(updateRecords(next, now));
	let relicDropped = null;
	if (sweeps > 0) {
		const rr = rollRelic(withRecords, Math.min(.05 * sweeps, .3), now, `${dayKey(now)}-r${c.turnsCompleted}`);
		withRecords = rr.save;
		relicDropped = rr.relic?.id ?? null;
	}
	if (completed) {
		const today = dayKey(now);
		const history = withRecords.history ?? {};
		const h = history[today] ?? {
			xp: 0,
			turns: 0
		};
		h.turns += 1;
		history[today] = h;
		withRecords.history = trimHistory(history, now);
	}
	return {
		save: withRecords,
		settlement: {
			xp: gainTotal + questGain,
			combo,
			questXp: questGain,
			levelBefore,
			levelAfter: withRecords.player.level,
			leveledUp: withRecords.player.level > levelBefore,
			turnsDone,
			...eventCard !== null ? { eventCard: {
				id: eventCard.id,
				defId: eventCard.def.id
			} } : {},
			...relicDropped !== null ? { relicId: relicDropped } : {}
		}
	};
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
function migrateSave(raw, cwd, seasonOverride) {
	const base = freshSave(cwd, seasonOverride, raw.updatedAt ?? Date.now());
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
		daily: raw.daily ?? base.daily,
		settlements: raw.settlements ?? [],
		history: raw.history ?? {},
		shop: (() => {
			const rawShop = raw.shop ?? {};
			const themes = Array.isArray(rawShop.themes) ? [...rawShop.themes] : rawShop.theme !== void 0 && rawShop.theme !== "" ? [rawShop.theme] : [];
			return {
				...freshShop(),
				...rawShop,
				themes
			};
		})(),
		tutorial: {
			steps: {},
			done: false,
			...raw.tutorial ?? {}
		},
		collections: {
			completed: {},
			...raw.collections ?? {}
		},
		lucky: {
			date: "",
			claimed: false,
			...raw.lucky ?? {}
		},
		weekly: raw.weekly ?? rollWeeklyQuests(raw.updatedAt ?? Date.now()),
		titles: {
			unlocked: [],
			active: "",
			...raw.titles ?? {}
		},
		records: raw.records ?? {}
	};
	out.version = Math.max(1, raw.version ?? 1);
	sanitizeMigratedNumbers(out, base);
	out.player.title = titleFor(out.player.level).zh;
	return out;
}
/** migrateSave 的数值字段消毒（玩家/计数器/商店的数值字段非法时回退 base 默认）。 */
function sanitizeMigratedNumbers(out, base) {
	const outPlayer = out.player;
	const basePlayer = base.player;
	for (const f of [
		"level",
		"xp",
		"xpTotal",
		"seasonXp"
	]) {
		const v = outPlayer[f];
		if (typeof v !== "number" || !Number.isFinite(v)) outPlayer[f] = basePlayer[f];
	}
	const outCounters = out.counters;
	const baseCounters = base.counters;
	for (const f of [
		"turnsCompleted",
		"turnsFailed",
		"consecutiveSuccess",
		"toolCalls",
		"craftTools",
		"todosCompleted",
		"cleanSweeps",
		"tokensOut",
		"subagentsSpawned",
		"devquestCalls",
		"activeDays",
		"streakDays",
		"streakBest",
		"completedToday",
		"nightTurns",
		"maxTokensTurn",
		"seasonTokensOut",
		"dailyQuestsDone",
		"comebacks",
		"todayXp",
		"goalDays",
		"bossSlain",
		"lastErrorAt",
		"lastSuccessAt"
	]) {
		const v = outCounters[f];
		if (v !== void 0 && (typeof v !== "number" || !Number.isFinite(v))) outCounters[f] = baseCounters[f];
	}
	if (out.shop !== void 0) {
		const outShop = out.shop;
		const baseShop = base.shop;
		for (const f of [
			"spent",
			"shields",
			"rerolls",
			"xpBoostTurns",
			"questSkips",
			"bossEarned"
		]) {
			const v = outShop[f];
			if (typeof v !== "number" || !Number.isFinite(v)) outShop[f] = baseShop[f];
		}
	}
}
/**
* 合并多个存档为全局玩家存档（v0.3：从按项目隔离切换到全局跨会话）。
* - 累计类计数器求和，状态类字段取 updatedAt 最新的存档
* - 成就取并集（保留最早解锁时间），水位取并集（每个会话的最大 seq）
* - 等级从累计 XP 重算
*/
function mergeSaves(saves, now = Date.now()) {
	const out = freshSave("global", void 0, now);
	if (saves.length === 0) return out;
	const latest = saves.reduce((a, b) => a.updatedAt >= b.updatedAt ? a : b);
	const c = out.counters;
	for (const s of saves) {
		const sc = s.counters;
		out.player.xpTotal += s.player.xpTotal;
		out.player.seasonXp += s.player.seasonXp;
		c.turnsCompleted += sc.turnsCompleted;
		c.turnsFailed += sc.turnsFailed;
		c.toolCalls += sc.toolCalls;
		c.craftTools += sc.craftTools;
		c.todosCompleted += sc.todosCompleted;
		c.cleanSweeps += sc.cleanSweeps;
		c.tokensOut += sc.tokensOut;
		c.seasonTokensOut += sc.seasonTokensOut;
		c.subagentsSpawned += sc.subagentsSpawned;
		c.devquestCalls += sc.devquestCalls;
		c.activeDays += sc.activeDays;
		c.comebacks += sc.comebacks;
		c.nightTurns += sc.nightTurns;
		c.dailyQuestsDone += sc.dailyQuestsDone;
		c.maxTokensTurn = Math.max(c.maxTokensTurn, sc.maxTokensTurn);
		c.streakBest = Math.max(c.streakBest ?? 0, sc.streakBest ?? 0);
		c.bossSlain = (c.bossSlain ?? 0) + (sc.bossSlain ?? 0);
		c.goalDays = (c.goalDays ?? 0) + (sc.goalDays ?? 0);
		c.todayXp = (c.todayXp ?? 0) + (sc.todayXp ?? 0);
		for (const [tool, n] of Object.entries(sc.toolCallsByTool)) c.toolCallsByTool[tool] = (c.toolCallsByTool[tool] ?? 0) + n;
		for (const tool of sc.todayTools) if (!c.todayTools.includes(tool)) c.todayTools.push(tool);
		for (const [id, rec] of Object.entries(s.achievements)) if (out.achievements[id] === void 0 || rec.acquiredAt < out.achievements[id].acquiredAt) out.achievements[id] = rec;
		for (const [sid, seq] of Object.entries(s.lastSeqBySession)) out.lastSeqBySession[sid] = Math.max(out.lastSeqBySession[sid] ?? -1, seq);
		for (const ev of s.settlements ?? []) if (out.settlements.find((x) => x.id === ev.id) === void 0) out.settlements.push(ev);
		for (const [date, h] of Object.entries(s.history ?? {})) {
			const cur = out.history[date];
			out.history[date] = {
				xp: Math.max(cur?.xp ?? 0, h.xp),
				turns: Math.max(cur?.turns ?? 0, h.turns)
			};
		}
		const shop = s.shop;
		if (shop !== void 0) {
			out.shop.spent += shop.spent;
			out.shop.shields += shop.shields;
			out.shop.rerolls += shop.rerolls;
			out.shop.xpBoostTurns = (out.shop.xpBoostTurns ?? 0) + (shop.xpBoostTurns ?? 0);
			out.shop.questSkips = (out.shop.questSkips ?? 0) + (shop.questSkips ?? 0);
			out.shop.bossEarned = (out.shop.bossEarned ?? 0) + (shop.bossEarned ?? 0);
			for (const p of shop.passClaimed ?? []) if (!(out.shop.passClaimed ?? []).includes(p)) out.shop.passClaimed = [...out.shop.passClaimed ?? [], p];
			for (const b of shop.badges) if (!out.shop.badges.includes(b)) out.shop.badges.push(b);
			for (const t of shop.themes ?? []) if (!out.shop.themes.includes(t)) out.shop.themes.push(t);
		}
		const tut = s.tutorial;
		if (tut !== void 0) {
			for (const [id, at] of Object.entries(tut.steps)) if (out.tutorial.steps[id] === void 0 || at < out.tutorial.steps[id]) out.tutorial.steps[id] = at;
		}
		const coll = s.collections;
		if (coll !== void 0) for (const [cat, at] of Object.entries(coll.completed)) {
			const cur = out.collections.completed[cat];
			if (cur === void 0 || (at ?? 0) < cur) out.collections.completed[cat] = at;
		}
	}
	out.settlements.sort((a, b) => b.at - a.at);
	out.settlements = out.settlements.slice(0, 12);
	c.consecutiveSuccess = latest.counters.consecutiveSuccess;
	c.lastActiveDay = latest.counters.lastActiveDay;
	c.lastActivityAt = Math.max(c.lastActivityAt, latest.counters.lastActivityAt);
	c.completedToday = latest.counters.completedToday;
	c.completedDay = latest.counters.completedDay;
	c.lastTurnCompletedAt = latest.counters.lastTurnCompletedAt;
	c.todayToolsDay = latest.counters.todayToolsDay;
	c.oopsFired = latest.counters.oopsFired;
	if ((c.streakBest ?? 0) < c.streakDays) c.streakBest = c.streakDays;
	if (latest.counters.lastErrorTool !== void 0) c.lastErrorTool = latest.counters.lastErrorTool;
	if (latest.counters.lastErrorAt !== void 0) c.lastErrorAt = latest.counters.lastErrorAt;
	if (latest.counters.lastSuccessTool !== void 0) c.lastSuccessTool = latest.counters.lastSuccessTool;
	if (latest.counters.lastSuccessAt !== void 0) c.lastSuccessAt = latest.counters.lastSuccessAt;
	let level = 1;
	let xp = out.player.xpTotal;
	while (xp >= xpToNext(level)) {
		xp -= xpToNext(level);
		level++;
	}
	out.player.level = level;
	out.player.xp = xp;
	out.player.title = titleFor(level).zh;
	out.shop.theme = latest.shop?.theme ?? "";
	if (out.shop.themes.length === 0 && out.shop.theme !== "") out.shop.themes.push(out.shop.theme);
	out.tutorial.done = TUTORIAL_STEPS.every((step) => out.tutorial.steps[step.id] !== void 0);
	out.weekly = latest.weekly ?? rollWeeklyQuests(now);
	for (const s of saves) for (const id of s.titles?.unlocked ?? []) if (!out.titles.unlocked.includes(id)) out.titles.unlocked.push(id);
	out.titles.active = latest.titles?.active ?? "";
	const mergedRecords = {};
	for (const s of saves) for (const [season, r] of Object.entries(s.records ?? {})) {
		const cur = mergedRecords[season] ?? {
			level: 0,
			combo: 0,
			seasonXp: 0
		};
		cur.level = Math.max(cur.level, r.level);
		cur.combo = Math.max(cur.combo, r.combo);
		cur.seasonXp = Math.max(cur.seasonXp, r.seasonXp);
		mergedRecords[season] = cur;
	}
	out.records = mergedRecords;
	out.daily = latest.daily;
	out.history = trimHistory(out.history ?? {}, now);
	out.updatedAt = now;
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
				toolNames: /* @__PURE__ */ new Map(),
				seenCompletedTodos: /* @__PURE__ */ new Set()
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
			log.error("event error:", error);
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
			let newly = 0;
			let allCompleted = todos.length > 0;
			todos.forEach((t, i) => {
				if (t.status !== "completed") {
					allCompleted = false;
					return;
				}
				const fingerprint = t.content !== "" ? t.content : `#${i}`;
				if (agg.seenCompletedTodos.has(fingerprint)) return;
				agg.seenCompletedTodos.add(fingerprint);
				newly++;
			});
			if (newly <= 0) return null;
			return {
				kind: "todo-completed",
				count: newly,
				allCompleted: allCompleted && newly > 0
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
/** 存档根目录。 */
function dataRoot(config) {
	return config.dataDir ?? join(homedir(), ".dsh", "devquest");
}
/** 全局玩家作用域键（v0.3 起不再按项目隔离）。 */
function scopeKey(_cwd) {
	return "global";
}
/** 全局存档文件绝对路径。 */
function savePath(config) {
	return join(dataRoot(config), "player.json");
}
/** 旧档文件名匹配：20 位十六进制 + .json（旧版按 cwd hash 命名）。 */
function isLegacyFileName(name) {
	return /^[0-9a-f]{20}\.json$/.test(name);
}
/**
* 迁移：扫描 dataDir 里的旧版分项目存档（<20hex>.json），合并为全局存档。
* 没有旧档或读取失败时返回 null（调用方回退到全新存档）。
*/
async function migrateLegacySaves(ctx, config, now) {
	try {
		const dirTarget = await ctx.fs.resolve(dataRoot(config));
		const entries = await ctx.fs.listDir(dirTarget);
		const legacy = [];
		for (const entry of entries) {
			if (entry.type !== "file" || !isLegacyFileName(entry.name)) continue;
			try {
				const text = await ctx.fs.readText(entry.target);
				const parsed = JSON.parse(text);
				legacy.push(migrateSave(parsed, "legacy", config.season));
			} catch {}
		}
		if (legacy.length === 0) return null;
		const merged = mergeSaves(legacy, now);
		log.info(`已合并 ${legacy.length} 份旧存档 → 全局玩家存档`);
		return merged;
	} catch {
		return null;
	}
}
/** 读全局存档；不存在时尝试合并旧档，都没有则返回全新存档。 */
async function loadSave(ctx, config, _cwd) {
	const file = savePath(config);
	try {
		const target = await ctx.fs.resolve(file);
		if (await ctx.fs.stat(target) === void 0) {
			const merged = await migrateLegacySaves(ctx, config, Date.now());
			if (merged !== null) return merged;
			return freshSave(scopeKey(), config.season);
		}
		const text = await ctx.fs.readText(target);
		return migrateSave(JSON.parse(text), scopeKey(), config.season);
	} catch (error) {
		log.error(`load save failed (${file}):`, error);
		return freshSave(scopeKey(), config.season);
	}
}
/** 写全局存档（原子替换）。 */
async function persistSave(ctx, config, save) {
	const target = await ctx.fs.resolve(savePath(config));
	await ctx.fs.writeText(target, JSON.stringify(save, null, 2));
}
/**
* 创建节流写盘器：多次 save 在 delayMs 内合并为最后一次写，
* 串行化写链（后写不越过前写）。写失败记录，快照回退待下次重试。
* 缺省 delayMs = 250（毫秒）。
*/
function createSaveWriter(ctx, config, delayMs = 250) {
	let latest = null;
	let timer = null;
	let chain = Promise.resolve();
	/** 单次落盘：写 latest 快照；失败时快照回退（无更新则下次重试）。 */
	const writeOnce = async () => {
		if (latest === null) return;
		const snapshot = latest;
		latest = null;
		try {
			await persistSave(ctx, config, snapshot);
		} catch (error) {
			log.error(`persist save failed (${savePath(config)}):`, error);
			if (latest === null) latest = snapshot;
			throw error;
		}
	};
	/** 追加一次延迟写（已有定时器则合并——latest 已被覆盖，无需新调度）。 */
	const schedule = () => {
		if (timer !== null) return;
		timer = setTimeout(() => {
			timer = null;
			chain = chain.then(writeOnce).catch(() => void 0);
		}, delayMs);
	};
	return {
		save(next) {
			latest = next;
			schedule();
		},
		async flush() {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			chain = chain.then(writeOnce).catch(() => void 0);
			await chain.catch(() => void 0);
		},
		discard() {
			latest = null;
		}
	};
}
/** 重置全局存档（reset 用）。不存在时静默成功。 */
async function deleteSave(ctx, config) {
	const file = savePath(config);
	try {
		const target = await ctx.fs.resolve(file);
		if (await ctx.fs.stat(target) === void 0) return false;
		await ctx.fs.writeText(target, JSON.stringify(freshSave(scopeKey(), config.season), null, 2));
		return true;
	} catch (error) {
		log.error(`reset save failed (${file}):`, error);
		return false;
	}
}
const DEFAULT_UI_SETTINGS = {
	fontSize: 1,
	compact: false,
	toastFilter: "all",
	sound: true,
	notify: true
};
/** UI 设置文件绝对路径。 */
function settingsPath(config) {
	return join(dataRoot(config), "settings.json");
}
/** 校验并补全设置对象（未知/越界字段回落默认，保证写出的永远是合法形状）。 */
function sanitizeUiSettings(raw) {
	const p = typeof raw === "object" && raw !== null ? raw : {};
	return {
		fontSize: typeof p.fontSize === "number" && p.fontSize >= .85 && p.fontSize <= 1.2 ? p.fontSize : DEFAULT_UI_SETTINGS.fontSize,
		compact: p.compact === true,
		toastFilter: p.toastFilter === "rare" || p.toastFilter === "off" ? p.toastFilter : "all",
		sound: p.sound !== false,
		notify: p.notify !== false
	};
}
/** 读 UI 设置；文件不存在/损坏返回 null（调用方决定迁移或默认）。 */
async function loadUiSettings(ctx, config) {
	try {
		const target = await ctx.fs.resolve(settingsPath(config));
		if (await ctx.fs.stat(target) === void 0) return null;
		const text = await ctx.fs.readText(target);
		return sanitizeUiSettings(JSON.parse(text));
	} catch (error) {
		log.error(`load ui settings failed (${settingsPath(config)}):`, error);
		return null;
	}
}
/** 写 UI 设置（原子替换）。 */
async function saveUiSettings(ctx, config, settings) {
	const target = await ctx.fs.resolve(settingsPath(config));
	await ctx.fs.writeText(target, JSON.stringify(settings, null, 2));
}
//#endregion
//#region lib/types/tools.js
/**
* DevQuest 模型工具：devquest_status / devquest_achievements / devquest_reset。
* 依赖通过 deps 注入（index.ts 装配），保持本文件无引擎直接耦合。
*/
/** 状态渲染为人类可读文本。 */
function renderStatus(status, detail) {
	const { level, xp, xpToNext, title, season, seasonXp, counters } = status;
	const lines = [
		`⚔️ DevQuest — Lv.${level} ${title.zh}`,
		`   XP: ${xp} / ${xpToNext}（赛季 ${season} · 本赛季 ${seasonXp} XP，累计 ${counters.turnsCompleted} 回合 / ${counters.toolCalls} 次工具调用 / ${counters.todosCompleted} 个待办 / ${counters.tokensOut} tokens）`,
		`   连击: ${counters.consecutiveSuccess} · 今日回合: ${counters.completedToday} · 活跃: ${counters.streakDays} 天`
	];
	if (status.class !== null) lines.push(`   🃏 职业: ${status.class.icon} ${status.class.name.zh}`);
	if (status.seasonSummary !== void 0) lines.push(`   📜 上赛季 ${status.seasonSummary.season}：Lv.${status.seasonSummary.level} · 最高连击 ${status.seasonSummary.comboBest} · ${status.seasonSummary.seasonXp} XP · ${status.seasonSummary.achievements} 枚成就`);
	const dg = status.dailyGoal;
	if (dg !== void 0 && dg.goal > 0) {
		const gState = dg.claimed ? "（已达成 ✓）" : dg.todayXp >= dg.goal ? `（可领取 +${dg.rewardXp} XP）` : "";
		lines.push(`   🎯 今日目标: ${Math.min(dg.todayXp, dg.goal)}/${dg.goal} XP${gState}`);
	}
	const quests = status.daily?.quests ?? [];
	if (quests.length > 0) {
		lines.push(`   📅 每日任务（${status.daily.date}）：`);
		for (const q of quests) {
			const mark = q.done ? "✅" : "⬜";
			const progress = Math.min(q.progress, q.goal);
			lines.push(`     ${mark} ${q.label.zh} ${progress}/${q.goal}（+${q.reward} XP）`);
		}
	}
	const weeklyQuests = status.weekly?.quests ?? [];
	if (weeklyQuests.length > 0) {
		lines.push(`   🗓️ 每周挑战（${status.weekly.week}）：`);
		for (const q of weeklyQuests) {
			const mark = q.done ? "✅" : "⬜";
			lines.push(`     ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`);
		}
		if (status.weekly.bonusReady) lines.push(`     🎁 周全清奖励可领取（+100 XP）`);
		const boss = status.weekly.boss;
		if (boss.name !== "") lines.push(`     🐉 每周 BOSS「${boss.name}」${boss.claimed ? "已击败 ✓" : `${Math.min(boss.damage, boss.hp)}/${boss.hp}${boss.defeated ? `（可领取 +${boss.reward} 货币）` : ""}`}`);
	}
	const shop = status.shop;
	if (shop !== void 0) {
		const activeTheme = shop.items.find((i) => i.id === shop.theme);
		const themeText = shop.theme !== "" && activeTheme !== void 0 ? `${activeTheme.icon} ${activeTheme.name.zh}` : "默认";
		lines.push(`   🛒 赛季货币: ${shop.balance} · 主题皮肤: ${themeText}`);
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
		async execute(args) {
			return await deps.status();
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
		async execute() {
			return { achievements: (await deps.status()).achievements };
		}
	}));
	ctx.tools.register(defineTool({
		name: "devquest_reset",
		description: "清空 DevQuest 全局存档（重置等级/XP/成就/计数，跨会话统一）。危险操作，必须传 confirm=true。",
		parameters: { confirm: {
			type: "boolean",
			description: "必须为 true 才会执行；false 只返回预览"
		} },
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
		async execute(args) {
			if (args.confirm !== true) return {
				ok: false,
				message: "未确认：传入 confirm=true 才会清空 DevQuest 全局存档"
			};
			const result = await deps.reset();
			return {
				ok: result.ok,
				message: result.reset ? "✅ DevQuest 全局存档已重置" : "存档不存在或重置失败"
			};
		}
	}));
	ctx.tools.register(defineTool({
		name: "devquest_shop",
		description: "查看 DevQuest 赛季商店余额/商品，或用赛季货币购买商品（连击保险 shield-1/shield-3、任务重掷 reroll-1、主题 theme-ember/frost/verdant、徽章 badge-crown/star）。",
		parameters: { buy: {
			type: "string",
			description: "可选：要购买的商品 id（不传则只查看余额与商品列表）"
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: [
						`💰 赛季货币: ${String(value.balance ?? 0)}`,
						...Array.isArray(value.itemsText) ? value.itemsText : [],
						...value.result !== void 0 ? [String(value.result)] : []
					].join("\n")
				}];
			}
		},
		async execute(args) {
			const status = await deps.status();
			const balance = status.shop?.balance ?? 0;
			const itemsText = (status.shop?.items ?? []).map((i) => `${i.owned ? "✅" : "⬜"} ${i.icon} ${i.name.zh}（${i.id}）— ${i.price} 货币${i.owned ? "（已拥有）" : ""}`);
			if (typeof args.buy === "string" && args.buy !== "") {
				const r = await deps.buy(args.buy);
				if (r.ok) return {
					balance: r.status.shop?.balance ?? 0,
					itemsText: (r.status.shop?.items ?? []).map((i) => `${i.owned ? "✅" : "⬜"} ${i.icon} ${i.name.zh}（${i.id}）— ${i.price} 货币${i.owned ? "（已拥有）" : ""}`),
					result: `✅ 购买成功：${args.buy}`
				};
				const reason = r.reason === "insufficient-balance" ? "赛季货币不足" : r.reason === "already-owned" ? "已拥有该商品" : r.reason === "unknown-item" ? "未知商品 id" : "购买失败";
				return {
					balance: r.status.shop?.balance ?? 0,
					itemsText,
					result: `❌ ${reason}`
				};
			}
			return {
				balance,
				itemsText
			};
		}
	}));
	ctx.tools.register(defineTool({
		name: "devquest_daily",
		description: "生成 DevQuest 每日/每周任务简报（纯文本，适合推送到 IM 渠道）：今日 3 个每日任务 + 本周 3 个每周挑战的进度与奖励。若用户要求把任务推送到飞书/QQ 等，调用本工具后用 de_channel_send 发送返回的 text。",
		parameters: {},
		output: {
			schema: {
				type: "object",
				additionalProperties: true
			},
			render: (_args, value) => [{
				type: "text",
				text: String(value.text ?? "")
			}]
		},
		async execute() {
			const status = await deps.status();
			const lines = [];
			lines.push(`⚔️ DevQuest 任务简报（Lv.${status.level} ${status.title.zh} · ${status.season}）`);
			const daily = status.daily?.quests ?? [];
			if (daily.length > 0) {
				lines.push(`📅 今日任务（${status.daily.date}）：`);
				for (const q of daily) {
					const mark = q.done ? "✅" : "⬜";
					lines.push(`  ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`);
				}
				if (status.dailyChest?.ready === true) lines.push("  🎁 全清宝箱可领取 +50 XP！");
			}
			const weekly = status.weekly?.quests ?? [];
			if (weekly.length > 0) {
				lines.push(`🗓️ 本周挑战（${status.weekly.week}）：`);
				for (const q of weekly) {
					const mark = q.done ? "✅" : "⬜";
					lines.push(`  ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`);
				}
				if (status.weekly.bonusReady === true) lines.push("  🎁 全清周奖励可领取 +100 XP！");
				const boss = status.weekly.boss;
				if (boss.name !== "") lines.push(`🐉 每周 BOSS「${boss.name}」${boss.claimed ? "已击败 ✓" : `${Math.min(boss.damage, boss.hp)}/${boss.hp}（${boss.defeated ? `可领取 +${boss.reward} 赛季货币！` : "全清周挑战击败"}`}`);
			}
			const dg = status.dailyGoal;
			if (dg !== void 0 && dg.goal > 0) lines.push(`🎯 今日目标 ${Math.min(dg.todayXp, dg.goal)}/${dg.goal} XP${dg.claimed ? "（已达成 ✓）" : dg.todayXp >= dg.goal ? `（可领取 +${dg.rewardXp} XP！）` : ""}`);
			if (status.lucky?.available === true) lines.push("🎁 今日幸运抽奖可抽！");
			return { text: lines.join("\n") };
		}
	}));
}
//#endregion
//#region lib/types/routes.js
/** 浏览器侧 API 前缀。 */
const STATUS_API_PREFIX = "/api/devquest";
/** readBody 超限错误标记（响应 413 而非 500）。 */
const BODY_TOO_LARGE_CODE = "BODY_TOO_LARGE";
/** 读取 POST JSON body（最多 max 字节——导入存档可能较大）。
* v1.3.3：超限立即销毁连接并以带 code 的错误 reject（不再挂起/双响应）。 */
function readBody(req, max = 4194304) {
	return new Promise((resolve, reject) => {
		let data = "";
		let tooLarge = false;
		req.on("data", (chunk) => {
			if (tooLarge) return;
			data += chunk;
			if (data.length > max) {
				tooLarge = true;
				data = "";
				req.destroy();
				const err = /* @__PURE__ */ new Error("request body too large");
				err.code = BODY_TOO_LARGE_CODE;
				reject(err);
			}
		});
		req.on("end", () => {
			if (!tooLarge) resolve(data);
		});
		req.on("error", (error) => {
			if (!tooLarge) reject(error);
		});
	});
}
/** 写 JSON 响应（socket 已销毁/写失败时静默——防向已断开连接写响应抛错）。 */
function json(res, status, body) {
	if (res.destroyed) return;
	try {
		res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
		res.end(JSON.stringify(body));
	} catch {}
}
/** 统一错误响应：body 超限 → 413；其余 → 500。 */
function errorJson(res, error) {
	const code = error?.code;
	json(res, code === BODY_TOO_LARGE_CODE ? 413 : 500, {
		ok: false,
		error: code === BODY_TOO_LARGE_CODE ? "body-too-large" : error instanceof Error ? error.message : String(error)
	});
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
function makeDevQuestRoutes(config) {
	const { cacheTtlMs = 6e4 } = config;
	let cached;
	const invalidateCache = () => {
		cached = void 0;
	};
	const status = () => {
		if (cached !== void 0 && Date.now() - cached.at < cacheTtlMs) return cached.promise;
		const promise = config.status().catch((error) => {
			cached = void 0;
			throw error;
		});
		cached = {
			at: Date.now(),
			promise
		};
		return promise;
	};
	/** POST 无 body 路由工厂：写成功即失效缓存。 */
	const post = (path, run) => ({
		kind: "exact",
		path,
		handler: (req, res) => {
			if (req.method !== "POST") {
				json(res, 405, {
					ok: false,
					error: "method-not-allowed"
				});
				return;
			}
			run().then((result) => {
				invalidateCache();
				json(res, 200, result);
			}, (error) => errorJson(res, error));
		}
	});
	/** POST + JSON body 路由工厂：parse 校验并取出参数；返回 null 时 400。 */
	const postJson = (path, parse, run, options = {}) => ({
		kind: "exact",
		path,
		handler: (req, res) => {
			if (req.method !== "POST") {
				json(res, 405, {
					ok: false,
					error: "method-not-allowed"
				});
				return;
			}
			readBody(req, options.maxBytes).then((bodyText) => {
				let raw;
				try {
					raw = JSON.parse(bodyText);
				} catch {
					json(res, 400, {
						ok: false,
						error: "invalid-json"
					});
					return;
				}
				const arg = parse(raw);
				if (arg === null) {
					json(res, 400, {
						ok: false,
						error: options.badRequestError ?? "invalid-request"
					});
					return;
				}
				return run(arg).then((result) => {
					invalidateCache();
					json(res, 200, result);
				});
			}).then(void 0, (error) => errorJson(res, error));
		}
	});
	return [
		{
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
				status().then((result) => json(res, 200, {
					ok: true,
					status: result
				}), (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/export`,
			handler: (req, res) => {
				if (req.method !== "GET") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.exportSave().then((data) => {
					res.writeHead(200, {
						"content-type": "application/json; charset=utf-8",
						"content-disposition": "attachment; filename=\"devquest-player.json\""
					});
					res.end(JSON.stringify(data, null, 2));
				}, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/ui-settings`,
			handler: (req, res) => {
				if (req.method !== "GET") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.uiSettings().then((settings) => json(res, 200, {
					ok: true,
					settings
				}), (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		post(`${STATUS_API_PREFIX}/claim-chest`, () => config.claimChest()),
		post(`${STATUS_API_PREFIX}/shop/reroll`, () => config.reroll()),
		post(`${STATUS_API_PREFIX}/lucky`, () => config.lucky()),
		post(`${STATUS_API_PREFIX}/daily-goal/claim`, () => config.claimDailyGoal()),
		post(`${STATUS_API_PREFIX}/weekly-boss/claim`, () => config.claimWeeklyBoss()),
		post(`${STATUS_API_PREFIX}/weekly-bonus`, () => config.claimWeeklyBonus()),
		post(`${STATUS_API_PREFIX}/shop/quest-skip`, () => config.useQuestSkip()),
		postJson(`${STATUS_API_PREFIX}/import`, (raw) => raw, (raw) => config.importSave(raw), { maxBytes: 16777216 }),
		postJson(`${STATUS_API_PREFIX}/shop/buy`, (raw) => {
			const itemId = raw?.itemId;
			return typeof itemId === "string" && itemId !== "" ? itemId : null;
		}, (itemId) => config.buy(itemId), { badRequestError: "invalid-item-id" }),
		postJson(`${STATUS_API_PREFIX}/titles/switch`, (raw) => {
			const titleId = raw?.titleId;
			return typeof titleId === "string" ? titleId : null;
		}, (titleId) => config.setTitle(titleId)),
		postJson(`${STATUS_API_PREFIX}/shop/theme`, (raw) => {
			const themeId = raw?.themeId;
			return typeof themeId === "string" ? themeId : null;
		}, (themeId) => config.setTheme(themeId)),
		postJson(`${STATUS_API_PREFIX}/daily-goal/set`, (raw) => {
			const goal = raw?.goal;
			return typeof goal === "number" ? goal : 0;
		}, (goal) => config.setDailyGoal(goal)),
		postJson(`${STATUS_API_PREFIX}/pass/claim`, (raw) => {
			const tierId = raw?.tierId;
			return typeof tierId === "string" && tierId !== "" ? tierId : null;
		}, (tierId) => config.claimPass(tierId), { badRequestError: "invalid-tier-id" }),
		postJson(`${STATUS_API_PREFIX}/ui-settings`, (raw) => raw, (raw) => config.saveUiSettings(raw)),
		postJson(`${STATUS_API_PREFIX}/event/resolve`, (raw) => {
			const obj = raw ?? {};
			return typeof obj.eventId === "string" && obj.eventId !== "" && typeof obj.option === "number" ? {
				eventId: obj.eventId,
				option: obj.option
			} : null;
		}, (arg) => config.resolveEvent(arg.eventId, arg.option), { badRequestError: "invalid-event" }),
		post(`${STATUS_API_PREFIX}/chain/claim`, () => config.claimChainReward()),
		post(`${STATUS_API_PREFIX}/ghost/claim`, () => config.claimGhostReward())
	];
}
//#endregion
//#region lib/types/index.js
/** 插件版本号（读 package.json；面板头部展示，方便确认加载的代码版本）。 */
function pluginVersion() {
	try {
		return createRequire(import.meta.url)("../package.json").version ?? "";
	} catch {
		return "";
	}
}
const PLUGIN_VERSION = pluginVersion();
const name = "devquest";
const inject = [
	"fs",
	"sessions",
	"tools"
];
function apply(ctx, config = {}) {
	if (config.logLevel !== void 0) setGlobalLogLevel(config.logLevel);
	const storeConfig = {
		...config.dataDir !== void 0 ? { dataDir: config.dataDir } : {},
		...config.season !== void 0 ? { season: config.season } : {}
	};
	const seasonOverride = config.season;
	const saveCache = /* @__PURE__ */ new Map();
	const tails = /* @__PURE__ */ new Map();
	let settlementSeq = 0;
	const writer = createSaveWriter(ctx, storeConfig);
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
	/** 串行执行任意读写任务（工具/路由改档的公共骨架）。 */
	async function runExclusive(task) {
		const key = scopeKey();
		return new Promise((resolve, reject) => {
			enqueue(key, async () => {
				try {
					resolve(await task());
				} catch (error) {
					reject(error);
				}
			});
		});
	}
	/**
	* 串行改档：读 → 纯函数改 → 缓存 + 节流落盘 → 返回最新状态。
	* pick 决定结果（ok=false 时只读不写；返回失败原因供调用方展示）。
	*/
	async function mutateSave(mutate, pick) {
		let outcome = { ok: false };
		let fresh;
		await runExclusive(async () => {
			const result = mutate(await getSave(scopeKey()));
			outcome = pick(result);
			fresh = result.save;
			if (outcome.ok) {
				saveCache.set(scopeKey(), result.save);
				writer.save(result.save);
			}
		});
		return {
			...outcome,
			gained: outcome.gained ?? 0,
			status: buildStatus(fresh ?? await getSave(scopeKey()))
		};
	}
	/** 组装状态视图。 */
	function buildStatus(save) {
		new Set(Object.keys(save.achievements));
		return {
			cwd: save.cwd,
			level: save.player.level,
			xp: save.player.xp,
			xpToNext: xpToNext(save.player.level),
			...save.player.levelStartedAt !== void 0 ? { levelStartedAt: save.player.levelStartedAt } : {},
			title: titleFor(save.player.level),
			season: save.player.season,
			seasonXp: save.player.seasonXp,
			version: PLUGIN_VERSION,
			counters: save.counters,
			achievements: ACHIEVEMENTS.map((a) => {
				const rec = save.achievements[a.id];
				const view = {
					id: a.id,
					category: a.category,
					name: a.name,
					description: a.description,
					icon: a.icon,
					xp: a.xp,
					rarity: rarityOf(a.id),
					hidden: a.hidden === true,
					unlocked: rec !== void 0,
					...rec !== void 0 ? { acquiredAt: rec.acquiredAt } : {}
				};
				if (rec === void 0 && a.progress !== void 0) view.progress = a.progress(save);
				return view;
			}),
			daily: (() => {
				const d = refreshDailyProgress(save, Date.now());
				return {
					...d,
					quests: d.quests.map((q) => {
						const def = DAILY_QUEST_POOL.find((x) => x.id === q.id);
						return def === void 0 ? q : {
							...q,
							label: memedDailyLabel(q.id, def, d.date)
						};
					})
				};
			})(),
			dailyChest: {
				ready: dailyQuestsDone(save.daily) && save.daily.chestClaimed !== true,
				claimed: save.daily.chestClaimed === true
			},
			settlements: save.settlements ?? [],
			shop: {
				balance: shopBalance(save),
				items: SHOP_ITEMS.map((item) => {
					const owned = item.kind === "theme" ? (save.shop?.themes ?? []).includes(item.id) || save.shop?.theme === item.id : item.kind === "badge" ? (save.shop?.badges ?? []).includes(item.id) : false;
					return {
						...item,
						owned
					};
				}),
				theme: save.shop?.theme ?? "",
				themes: save.shop?.themes ?? [],
				badges: save.shop?.badges ?? [],
				shields: save.shop?.shields ?? 0,
				rerolls: save.shop?.rerolls ?? 0,
				xpBoostTurns: save.shop?.xpBoostTurns ?? 0,
				questSkips: save.shop?.questSkips ?? 0
			},
			streak: (() => {
				const days = save.counters.streakDays;
				const best = save.counters.streakBest ?? days;
				const next = STREAK_REWARDS[days] === void 0 ? Object.entries(STREAK_REWARDS).map(([k, v]) => ({
					d: Number(k),
					xp: v.xp
				})).find((t) => t.d > days) ?? null : null;
				return {
					days,
					best,
					nextTierXp: next !== null ? next.xp : null
				};
			})(),
			pass: {
				seasonXp: save.player.seasonXp,
				tiers: SEASON_PASS_TIERS.map((t) => ({
					id: t.id,
					seasonXp: t.seasonXp,
					xp: t.xp,
					claimed: (save.shop?.passClaimed ?? []).includes(t.id),
					reached: save.player.seasonXp >= t.seasonXp
				}))
			},
			tutorial: {
				steps: TUTORIAL_STEPS.map((step) => {
					const at = save.tutorial?.steps[step.id];
					return {
						id: step.id,
						name: step.name,
						icon: step.icon,
						xp: step.xp,
						done: at !== void 0,
						...at !== void 0 ? { acquiredAt: at } : {}
					};
				}),
				done: save.tutorial?.done === true,
				title: TUTORIAL_TITLE
			},
			history: buildHistory(save, Date.now()),
			collections: buildCollections(save),
			lucky: {
				available: (save.lucky?.date ?? "") !== dayKey(Date.now()) || save.lucky?.claimed !== true,
				claimed: save.lucky?.claimed === true && save.lucky?.date === dayKey(Date.now())
			},
			nextTitle: buildNextTitle(save),
			weekly: buildWeekly(save, Date.now()),
			titles: buildTitles(save),
			records: buildRecordsView(save),
			dailyGoal: (() => {
				const now = Date.now();
				const goal = save.player.dailyGoal ?? 0;
				const claimed = save.player.dailyGoalClaimedDay === dayKey(now) && goal > 0 && todayXpOf(save, now) >= goal;
				return {
					goal,
					todayXp: todayXpOf(save, now),
					claimed,
					options: [...DAILY_GOAL_OPTIONS],
					rewardXp: 50
				};
			})(),
			class: (() => {
				const cls = computeClass(save.counters);
				return cls === null ? null : {
					id: cls.id,
					icon: cls.icon,
					name: cls.name
				};
			})(),
			...save.player.seasonSummary !== void 0 ? { seasonSummary: save.player.seasonSummary } : {},
			events: (save.events ?? []).map((e) => ({
				id: e.id,
				effectId: e.effectId,
				gainedAt: e.gainedAt,
				...e.expiresTurns !== void 0 ? { expiresTurns: e.expiresTurns } : {},
				pendingChoice: EVENT_POOL.find((d) => d.id === e.effectId)?.kind === "choice"
			})),
			relics: {
				total: RELIC_POOL.length,
				items: (save.relics ?? []).map((r) => {
					const def = relicById(r.id);
					return {
						id: r.id,
						icon: def?.icon ?? "❓",
						name: def?.name ?? {
							zh: r.id,
							en: r.id
						},
						rarity: def?.rarity ?? "common",
						acquiredAt: r.acquiredAt
					};
				})
			},
			questChain: (() => {
				const ch = save.questChain;
				if (ch === void 0) return null;
				const def = chainById(ch.id);
				if (def === void 0) return null;
				return {
					id: def.id,
					icon: def.icon,
					name: def.name,
					step: ch.step,
					total: def.steps.length,
					steps: def.steps.map((step, i) => ({
						label: step.label,
						met: i < ch.step
					})),
					finished: ch.finished === true,
					claimed: ch.claimed === true,
					rewardXp: def.rewardXp
				};
			})(),
			ghostRace: (() => {
				return ghostRaceProgress(save, Date.now());
			})(),
			stance: (() => {
				const st = comboStance(save.counters.consecutiveSuccess);
				return st === null ? null : {
					combo: st.combo,
					id: st.id,
					icon: st.icon,
					name: st.name
				};
			})(),
			updatedAt: save.updatedAt
		};
	}
	/** 组装分类收藏进度。 */
	function buildCollections(save) {
		const completedAt = save.collections?.completed ?? {};
		return { items: CATEGORY_IDS.map((cat) => {
			const defs = ACHIEVEMENTS.filter((a) => a.category === cat);
			const unlockedCount = defs.filter((a) => save.achievements[a.id] !== void 0).length;
			const at = completedAt[cat];
			return {
				category: cat,
				total: defs.length,
				unlocked: unlockedCount,
				completed: at !== void 0,
				rewardXp: COLLECTION_REWARDS[cat] ?? 0,
				...at !== void 0 ? { claimedAt: at } : {}
			};
		}) };
	}
	/** 下一称号预览（距更高称号还差多少 XP）。 */
	function buildNextTitle(save) {
		const next = nextTitle(save.player.level);
		if (next === null) return null;
		return {
			...next,
			xpToNext: xpToLevel(save.player.level, next.level) - save.player.xp
		};
	}
	/** 组装每周挑战视图。 */
	function buildWeekly(save, now) {
		const weekly = refreshWeeklyProgress(save, now);
		const boss = computeWeeklyBoss(save, now);
		return {
			week: weekly.week,
			quests: weekly.quests.map((q) => ({
				id: q.id,
				label: q.label,
				goal: q.goal,
				reward: q.reward,
				progress: q.progress,
				done: q.done
			})),
			bonusReady: weekly.quests.length > 0 && weekly.quests.every((q) => q.done) && weekly.bonusClaimed !== true,
			bonusClaimed: weekly.bonusClaimed === true,
			boss: boss === null ? {
				icon: "🐉",
				name: "",
				hp: 1,
				damage: 0,
				defeated: false,
				claimed: false,
				reward: 150
			} : {
				...boss,
				icon: boss.icon,
				name: bossMemeName(weekly.week).zh,
				hp: boss.hp,
				damage: boss.damage,
				defeated: boss.defeated,
				claimed: boss.claimed,
				reward: 150
			}
		};
	}
	/** 组装多称号视图（含 t-allachs 动态判定：全部 44 枚成就）。 */
	function buildTitles(save) {
		const titles = save.titles ?? {
			unlocked: [],
			active: ""
		};
		const allAchs = ACHIEVEMENTS.every((a) => save.achievements[a.id] !== void 0);
		const items = TITLE_POOL.map((t) => {
			const unlocked = titles.unlocked.includes(t.id) || t.id === "t-allachs" && allAchs;
			return {
				id: t.id,
				name: t.name,
				icon: t.icon,
				description: t.description,
				unlocked,
				...unlocked ? { acquiredAt: save.updatedAt } : {}
			};
		});
		const activeDef = TITLE_POOL.find((t) => t.id === titles.active && (titles.unlocked.includes(t.id) || t.id === "t-allachs" && allAchs));
		return {
			current: activeDef !== void 0 ? {
				id: activeDef.id,
				name: activeDef.name,
				icon: activeDef.icon
			} : null,
			items
		};
	}
	/** 组装成长周报（最近 HISTORY_KEEP 天，时间正序）。 */
	function buildHistory(save, now) {
		const out = [];
		const map = save.history ?? {};
		for (let i = 29; i >= 0; i--) {
			const date = dayKey(now - i * 864e5);
			const h = map[date];
			out.push({
				date,
				xp: h?.xp ?? 0,
				turns: h?.turns ?? 0
			});
		}
		return out;
	}
	watchEvents(ctx, (session, agg, action) => {
		if (!(action.kind === "turn-completed" || action.kind === "turn-failed" || action.kind === "turn-aborted")) return;
		const sessionId = agg.sessionId;
		const key = scopeKey();
		const seq = agg.seenSeq;
		const actions = agg.actions;
		agg.actions = [];
		enqueue(key, async () => {
			const save = await getSave(key);
			if (seq <= (save.lastSeqBySession[sessionId] ?? -1)) return;
			const at = Date.now();
			const { save: next, settlement } = applyTurnDetailed(save, actions, at, seasonOverride);
			const event = {
				id: `${at}-${settlementSeq++}`,
				at,
				xp: settlement.xp,
				combo: settlement.combo,
				questXp: settlement.questXp,
				levelBefore: settlement.levelBefore,
				levelAfter: settlement.levelAfter,
				leveledUp: settlement.leveledUp,
				turnsDone: settlement.turnsDone
			};
			next.settlements = [...next.settlements ?? [], event].slice(-12);
			const unlocked = checkAchievements(ACHIEVEMENTS, next);
			const tut = checkTutorial(next, at, seasonOverride);
			Object.assign(next, tut.save);
			const coll = checkCollections(next, at, seasonOverride);
			Object.assign(next, coll.save);
			const titles = checkTitles(next, at);
			Object.assign(next, titles.save);
			next.lastSeqBySession[sessionId] = seq;
			const chainR = advanceQuestChain(next, at, `chain-${key}`);
			if (chainR.save.questChain !== void 0) next.questChain = chainR.save.questChain;
			const settled2 = ensureGhostRace(next, at);
			if (settled2.ghostRace !== void 0) next.ghostRace = settled2.ghostRace;
			if (chainR.label !== null) log.info(chainR.label);
			saveCache.set(key, next);
			writer.save(next);
			if (unlocked.length > 0) {
				const names = unlocked.map((id) => {
					const def = achievementById(id);
					return def !== void 0 ? `${def.icon} ${def.name.zh} ${def.name.en}` : id;
				});
				log.info(`🏆 成就解锁：${names.join("、")}`);
			}
			if (tut.stepIds.length > 0) {
				const names = tut.stepIds.map((id) => {
					const def = TUTORIAL_STEPS.find((s) => s.id === id);
					return def !== void 0 ? `${def.icon} ${def.name.zh}` : id;
				});
				log.info(`🎓 新手任务：${names.join("、")}${tut.complete ? "（全部完成，解锁「见习冒险者」称号！）" : ""}`);
			}
			if (coll.completed.length > 0) log.info(`📚 分类收藏达成：${coll.completed.join("、")}（+${coll.completed.reduce((sum, c) => sum + (COLLECTION_REWARDS[c] ?? 0), 0)} XP）`);
			if (titles.unlocked.length > 0) {
				const names = titles.unlocked.map((id) => {
					const def = TITLE_POOL.find((t) => t.id === id);
					return def !== void 0 ? `${def.icon} ${def.name.zh}` : id;
				});
				log.info(`🏅 新称号解锁：${names.join("、")}`);
			}
		});
	});
	ctx.on("session/created", (session) => {
		if (!(session.header?.origin === "subagent" || (session.header?.delegationDepth ?? 0) > 0)) return;
		enqueue(scopeKey(), async () => {
			const save = await getSave(scopeKey());
			save.counters.subagentsSpawned += 1;
			save.updatedAt = Date.now();
			saveCache.set(scopeKey(), save);
			writer.save(save);
		});
	});
	registerDevQuestTools(ctx, {
		status: async () => {
			return buildStatus(await getSave(scopeKey()));
		},
		buy: async (itemId) => mutateSave((save) => buyShopItem(save, itemId, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			...result.reason !== void 0 ? { reason: result.reason } : {}
		})),
		reset: async () => runExclusive(async () => {
			writer.discard();
			await writer.flush();
			saveCache.delete(scopeKey());
			try {
				return {
					ok: true,
					reset: await deleteSave(ctx, storeConfig)
				};
			} catch (error) {
				log.error("reset failed:", error);
				return {
					ok: false,
					reset: false
				};
			}
		})
	});
	const routes = makeDevQuestRoutes({
		status: async () => {
			return buildStatus(await getSave(scopeKey()));
		},
		claimChest: async () => mutateSave((save) => claimDailyChest(save, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			gained: result.gained
		})),
		buy: async (itemId) => mutateSave((save) => buyShopItem(save, itemId, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			...result.reason !== void 0 ? { reason: result.reason } : {}
		})),
		reroll: async () => mutateSave((save) => useReroll(save, Date.now()), (result) => ({ ok: result.ok })),
		lucky: async () => mutateSave((save) => claimLucky(save, Date.now(), seasonOverride), (result) => {
			if (!result.ok || result.reward === void 0) return { ok: result.ok };
			const r = result.reward;
			return {
				ok: true,
				reward: r.kind === "xp" || r.kind === "currency" ? {
					kind: r.kind,
					amount: r.amount,
					label: r.label
				} : {
					kind: r.kind,
					count: r.count,
					label: r.label
				}
			};
		}),
		exportSave: async () => {
			const save = await getSave(scopeKey());
			return JSON.parse(JSON.stringify(save));
		},
		importSave: async (raw) => {
			return runExclusive(async () => {
				const statusOf = async (s) => buildStatus(s);
				if (typeof raw !== "object" || raw === null) return {
					ok: false,
					error: "invalid-save",
					status: await statusOf(await getSave(scopeKey()))
				};
				const candidate = raw;
				if (typeof candidate.player !== "object" || typeof candidate.counters !== "object") return {
					ok: false,
					error: "invalid-save",
					status: await statusOf(await getSave(scopeKey()))
				};
				const current = await getSave(scopeKey());
				let imported;
				try {
					imported = migrateSave(candidate, scopeKey(), seasonOverride);
				} catch {
					return {
						ok: false,
						error: "invalid-save",
						status: await statusOf(current)
					};
				}
				for (const [sid, seq] of Object.entries(current.lastSeqBySession ?? {})) imported.lastSeqBySession[sid] = Math.max(imported.lastSeqBySession[sid] ?? -1, seq);
				imported.updatedAt = Date.now();
				saveCache.set(scopeKey(), imported);
				writer.save(imported);
				return {
					ok: true,
					status: await statusOf(imported)
				};
			});
		},
		setTitle: async (titleId) => mutateSave((save) => setActiveTitle(save, titleId), (result) => ({ ok: result.ok })),
		setTheme: async (themeId) => mutateSave((save) => activateTheme(save, themeId), (result) => ({ ok: result.ok })),
		useQuestSkip: async () => mutateSave((save) => useQuestSkip(save, Date.now()), (result) => ({ ok: result.ok })),
		claimPass: async (tierId) => mutateSave((save) => claimPassTier(save, tierId, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			gained: result.gained
		})),
		claimWeeklyBonus: async () => mutateSave((save) => claimWeeklyBonus(save, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			gained: result.gained
		})),
		setDailyGoal: async (goal) => mutateSave((save) => setDailyGoal(save, goal, Date.now()), (result) => ({ ok: result.ok })),
		claimDailyGoal: async () => mutateSave((save) => claimDailyGoal(save, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			gained: result.gained
		})),
		claimWeeklyBoss: async () => mutateSave((save) => claimWeeklyBoss(save, Date.now()), (result) => ({
			ok: result.ok,
			gained: result.gained
		})),
		resolveEvent: async (eventId, option) => runExclusive(async () => {
			const save = await getSave(scopeKey());
			const at = Date.now();
			const r = resolveEvent(save, eventId, option, at, `${eventId}-${option}`);
			if (!r.ok) return {
				ok: false,
				gained: 0,
				label: r.label,
				status: buildStatus(save)
			};
			const next = addXp(r.save, r.gained, at, seasonOverride);
			next.updatedAt = at;
			saveCache.set(scopeKey(), next);
			writer.save(next);
			return {
				ok: true,
				gained: r.gained,
				label: r.label,
				status: buildStatus(next)
			};
		}),
		claimChainReward: async () => runExclusive(async () => {
			const save = await getSave(scopeKey());
			const at = Date.now();
			const r = claimChainReward(save, at);
			if (!r.ok) return {
				ok: false,
				gained: 0,
				status: buildStatus(save)
			};
			const next = addXp(r.save, r.gained, at, seasonOverride);
			next.updatedAt = at;
			saveCache.set(scopeKey(), next);
			writer.save(next);
			return {
				ok: true,
				gained: r.gained,
				status: buildStatus(next)
			};
		}),
		claimGhostReward: async () => runExclusive(async () => {
			const save = await getSave(scopeKey());
			const at = Date.now();
			const r = claimGhostReward(save, at);
			if (!r.ok) return {
				ok: false,
				gained: 0,
				status: buildStatus(save)
			};
			const next = addXp(r.save, r.gained, at, seasonOverride);
			next.updatedAt = at;
			saveCache.set(scopeKey(), next);
			writer.save(next);
			return {
				ok: true,
				gained: r.gained,
				status: buildStatus(next)
			};
		}),
		uiSettings: async () => loadUiSettings(ctx, storeConfig),
		saveUiSettings: async (raw) => runExclusive(async () => {
			const settings = sanitizeUiSettings(raw);
			await saveUiSettings(ctx, storeConfig, settings);
			return settings;
		}),
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
