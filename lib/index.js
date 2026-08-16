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
	combo_master: "epic"
};
/** 取成就稀有度（缺省 common）。 */
function rarityOf(id) {
	return ACHIEVEMENT_RARITY[id] ?? "common";
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
		badges: []
	};
}
/** 商店余额（本赛季可支配 XP）。 */
function shopBalance(save) {
	return Math.max(0, save.player.seasonXp - (save.shop?.spent ?? 0));
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
	const shop = {
		...freshShop(),
		...s.shop ?? {},
		themes: s.shop?.themes ?? []
	};
	if (item.kind === "theme" && shop.themes.includes(item.id)) return {
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
	s.shop = shop;
	return {
		ok: true,
		save: s
	};
}
/** 切换已拥有主题（id 空=默认主题；未拥有则拒绝）。 */
function activateTheme(save, themeId) {
	const s = structuredClone(save);
	const shop = {
		...freshShop(),
		...s.shop ?? {},
		themes: s.shop?.themes ?? []
	};
	if (themeId !== "" && !shop.themes.includes(themeId)) return {
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
/** 使用 1 次任务重掷：重新抽取今日任务（返回副本；库存不足返回 false）。 */
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
	s.daily = rollDailyQuests(now, `reroll-${shop.rerolls}-${Date.now() % 864e5}`);
	return {
		ok: true,
		save: s
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
		todayToolsDay: ""
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
		if (q.done) continue;
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
		"comeback",
		"comeback_10",
		"steel_will"
	],
	crafting: [
		"first_edit",
		"edits_100",
		"edits_500",
		"first_cmd",
		"first_remote",
		"first_subagent",
		"subagents_10",
		"tool_666",
		"cmd_100",
		"tools_250"
	],
	quest: [
		"first_todo",
		"todos_10",
		"todos_50",
		"todos_100",
		"clean_sweep",
		"daily_quest_10",
		"daily_quest_30"
	],
	time: [
		"night_owl",
		"early_bird",
		"night_owl_10",
		"seven_days",
		"streak_30",
		"grinder"
	],
	legend: [
		"level_5",
		"level_10",
		"level_15",
		"level_20",
		"level_25",
		"level_30",
		"season_100k"
	],
	egg: [
		"devil_hour",
		"self_aware",
		"oops",
		"thinker",
		"jack_of_all",
		"keyboard_warrior",
		"midnight_bell",
		"combo_master"
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
* 加 XP 并处理升级、活跃日统计与赛季换季（返回副本；原存档不变）。
* seasonOverride 缺省按日期自动推导季度赛季；设置后赛季固定不换季。
*/
function addXp(save, gain, now = Date.now(), seasonOverride) {
	const s = structuredClone(save);
	const season = seasonOverride ?? autoSeasonId(now);
	if (s.player.season !== season) {
		s.player.season = season;
		s.player.seasonXp = 0;
		s.counters.seasonTokensOut = 0;
		s.shop = {
			...freshShop(),
			theme: s.shop?.theme ?? "",
			themes: s.shop?.themes ?? [],
			badges: s.shop?.badges ?? []
		};
	}
	if (gain > 0) {
		s.player.xp += gain;
		s.player.xpTotal += gain;
		s.player.seasonXp += gain;
	}
	const levelBefore = s.player.level;
	while (s.player.xp >= xpToNext(s.player.level)) {
		s.player.xp -= xpToNext(s.player.level);
		s.player.level++;
	}
	if (s.player.level > levelBefore) s.player.levelStartedAt = now;
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
	const s = structuredClone(save);
	const c = s.counters;
	const levelBefore = s.player.level;
	const season = seasonOverride ?? autoSeasonId(now);
	if (s.player.season !== season) {
		s.player.season = season;
		s.player.seasonXp = 0;
		c.seasonTokensOut = 0;
	}
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
				c.seasonTokensOut += a.tokens;
				turnTokens += a.tokens;
				break;
			case "subagent": c.subagentsSpawned += a.depth > 0 ? 1 : 0;
		}
	}
	if (turnTokens > c.maxTokensTurn) c.maxTokensTurn = turnTokens;
	gain += Math.min(toolGain, 10);
	const completed = actions.some((a) => a.kind === "turn-completed");
	const failed = actions.some((a) => a.kind === "turn-failed");
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
		if (c.consecutiveSuccess >= 30) {
			gain = Math.round(gain * 2.5);
			combo = 2.5;
		} else if (c.consecutiveSuccess >= 15) {
			gain = Math.round(gain * 2);
			combo = 2;
		} else if (c.consecutiveSuccess >= 5) {
			gain = Math.round(gain * 1.5);
			combo = 1.5;
		}
	} else if (failed) {
		c.turnsFailed++;
		if ((s.shop?.shields ?? 0) > 0) s.shop = {
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
		else c.consecutiveSuccess = 0;
	}
	gain = Math.min(gain, 125);
	const questGain = applyDaily(s, now) + applyWeekly(s, now);
	const next = addXp(s, gain + questGain, now, seasonOverride);
	const turnsDone = completed || failed ? 1 : 0;
	const withRecords = trimRecords(updateRecords(next, now));
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
			xp: gain + questGain,
			combo,
			questXp: questGain,
			levelBefore,
			levelAfter: withRecords.player.level,
			leveledUp: withRecords.player.level > levelBefore,
			turnsDone
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
	out.player.title = titleFor(out.player.level).zh;
	return out;
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
		console.log(`[devquest] 已合并 ${legacy.length} 份旧存档 → 全局玩家存档`);
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
		console.error(`[devquest] load save failed (${file}):`, error);
		return freshSave(scopeKey(), config.season);
	}
}
/** 写全局存档（原子替换）。 */
async function persistSave(ctx, config, save) {
	const target = await ctx.fs.resolve(savePath(config));
	await ctx.fs.writeText(target, JSON.stringify(save, null, 2));
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
	const { level, xp, xpToNext, title, season, seasonXp, counters } = status;
	const lines = [
		`⚔️ DevQuest — Lv.${level} ${title.zh}`,
		`   XP: ${xp} / ${xpToNext}（赛季 ${season} · 本赛季 ${seasonXp} XP，累计 ${counters.turnsCompleted} 回合 / ${counters.toolCalls} 次工具调用 / ${counters.todosCompleted} 个待办 / ${counters.tokensOut} tokens）`,
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
			}
			if (status.lucky?.available === true) lines.push("🎁 今日幸运抽奖可抽！");
			return { text: lines.join("\n") };
		}
	}));
}
//#endregion
//#region lib/types/routes.js
/** 浏览器侧 API 前缀。 */
const STATUS_API_PREFIX = "/api/devquest";
/** 读取 POST JSON body（小请求，最多 4MB——导入存档可能较大）。 */
function readBody(req, max = 4194304) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
			if (data.length > max) {
				reject(/* @__PURE__ */ new Error("body-too-large"));
				req.destroy();
			}
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}
/** 写 JSON 响应。 */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
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
			path: `${STATUS_API_PREFIX}/claim-chest`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.claimChest().then((result) => {
					invalidateCache();
					json(res, 200, {
						ok: result.ok,
						gained: result.gained,
						status: result.status
					});
				}, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/shop/buy`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				readBody(req).then((body) => {
					let itemId = "";
					try {
						const parsed = JSON.parse(body);
						if (typeof parsed.itemId === "string") itemId = parsed.itemId;
					} catch {
						itemId = "";
					}
					if (itemId === "") {
						json(res, 400, {
							ok: false,
							error: "invalid-item-id"
						});
						return;
					}
					return config.buy(itemId).then((result) => {
						invalidateCache();
						json(res, 200, {
							ok: result.ok,
							reason: result.reason,
							status: result.status
						});
					});
				}).then(void 0, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/shop/reroll`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.reroll().then((result) => {
					invalidateCache();
					json(res, 200, {
						ok: result.ok,
						status: result.status
					});
				}, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/lucky`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.lucky().then((result) => {
					invalidateCache();
					json(res, 200, {
						ok: result.ok,
						reward: result.reward,
						status: result.status
					});
				}, (error) => json(res, 500, {
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
			path: `${STATUS_API_PREFIX}/import`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				readBody(req, 16777216).then((body) => {
					let raw;
					try {
						raw = JSON.parse(body);
					} catch {
						json(res, 400, {
							ok: false,
							error: "invalid-json"
						});
						return;
					}
					return config.importSave(raw).then((result) => {
						invalidateCache();
						json(res, 200, {
							ok: result.ok,
							error: result.error,
							status: result.status
						});
					});
				}).then(void 0, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/titles/switch`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				readBody(req).then((body) => {
					let titleId = "";
					try {
						const parsed = JSON.parse(body);
						if (typeof parsed.titleId === "string") titleId = parsed.titleId;
					} catch {
						titleId = "";
					}
					return config.setTitle(titleId).then((result) => {
						invalidateCache();
						json(res, 200, {
							ok: result.ok,
							status: result.status
						});
					});
				}).then(void 0, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/shop/theme`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				readBody(req).then((body) => {
					let themeId = "";
					try {
						const parsed = JSON.parse(body);
						if (typeof parsed.themeId === "string") themeId = parsed.themeId;
					} catch {
						themeId = "";
					}
					return config.setTheme(themeId).then((result) => {
						invalidateCache();
						json(res, 200, {
							ok: result.ok,
							status: result.status
						});
					});
				}).then(void 0, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		},
		{
			kind: "exact",
			path: `${STATUS_API_PREFIX}/weekly-bonus`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return;
				}
				config.claimWeeklyBonus().then((result) => {
					invalidateCache();
					json(res, 200, {
						ok: result.ok,
						gained: result.gained,
						status: result.status
					});
				}, (error) => json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				}));
			}
		}
	];
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
	const seasonOverride = config.season;
	const saveCache = /* @__PURE__ */ new Map();
	const tails = /* @__PURE__ */ new Map();
	let settlementSeq = 0;
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
			...save.player.levelStartedAt !== void 0 ? { levelStartedAt: save.player.levelStartedAt } : {},
			title: titleFor(save.player.level),
			season: save.player.season,
			seasonXp: save.player.seasonXp,
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
			daily: ensureDaily(save, Date.now()),
			dailyChest: {
				ready: dailyQuestsDone(save.daily) && save.daily.chestClaimed !== true,
				claimed: save.daily.chestClaimed === true
			},
			settlements: save.settlements ?? [],
			shop: {
				balance: shopBalance(save),
				items: SHOP_ITEMS.map((item) => {
					const owned = item.kind === "theme" ? (save.shop?.themes ?? []).includes(item.id) : item.kind === "badge" ? (save.shop?.badges ?? []).includes(item.id) : false;
					return {
						...item,
						owned
					};
				}),
				theme: save.shop?.theme ?? "",
				themes: save.shop?.themes ?? [],
				badges: save.shop?.badges ?? [],
				shields: save.shop?.shields ?? 0,
				rerolls: save.shop?.rerolls ?? 0
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
		const weekly = ensureWeekly(save, now);
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
			bonusClaimed: weekly.bonusClaimed === true
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
			saveCache.set(key, next);
			await persistSave(ctx, storeConfig, next);
			if (unlocked.length > 0) {
				const names = unlocked.map((id) => {
					const def = achievementById(id);
					return def !== void 0 ? `${def.icon} ${def.name.zh} ${def.name.en}` : id;
				});
				console.log(`[devquest] 🏆 成就解锁：${names.join("、")}`);
			}
			if (tut.stepIds.length > 0) {
				const names = tut.stepIds.map((id) => {
					const def = TUTORIAL_STEPS.find((s) => s.id === id);
					return def !== void 0 ? `${def.icon} ${def.name.zh}` : id;
				});
				console.log(`[devquest] 🎓 新手任务：${names.join("、")}${tut.complete ? "（全部完成，解锁「见习冒险者」称号！）" : ""}`);
			}
			if (coll.completed.length > 0) console.log(`[devquest] 📚 分类收藏达成：${coll.completed.join("、")}（+${coll.completed.reduce((sum, c) => sum + (COLLECTION_REWARDS[c] ?? 0), 0)} XP）`);
			if (titles.unlocked.length > 0) {
				const names = titles.unlocked.map((id) => {
					const def = TITLE_POOL.find((t) => t.id === id);
					return def !== void 0 ? `${def.icon} ${def.name.zh}` : id;
				});
				console.log(`[devquest] 🏅 新称号解锁：${names.join("、")}`);
			}
		});
	});
	registerDevQuestTools(ctx, {
		status: async () => {
			return buildStatus(await getSave(scopeKey()));
		},
		buy: async (itemId) => {
			const key = scopeKey();
			let result = { ok: false };
			let fresh;
			await new Promise((resolve, reject) => {
				enqueue(key, async () => {
					try {
						const r = buyShopItem(await getSave(key), itemId, Date.now(), seasonOverride);
						result = {
							ok: r.ok,
							...r.reason !== void 0 ? { reason: r.reason } : {}
						};
						fresh = r.save;
						if (r.ok) {
							saveCache.set(key, r.save);
							await persistSave(ctx, storeConfig, r.save);
						}
					} catch (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
			return {
				...result,
				status: buildStatus(fresh ?? await getSave(key))
			};
		},
		reset: async () => {
			const key = scopeKey();
			saveCache.delete(key);
			try {
				return {
					ok: true,
					reset: await deleteSave(ctx, storeConfig)
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
	/** 串行执行一个改档操作：读 → 纯函数改 → 缓存/持久化 → 返回最新状态。 */
	async function mutateSave(mutate, pick) {
		const key = scopeKey();
		let picked = { ok: false };
		let fresh;
		await new Promise((resolve, reject) => {
			enqueue(key, async () => {
				try {
					const result = mutate(await getSave(key));
					picked = pick(result);
					fresh = result.save;
					if (picked.ok) {
						saveCache.set(key, result.save);
						await persistSave(ctx, storeConfig, result.save);
					}
				} catch (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
		return {
			...picked,
			status: buildStatus(fresh ?? await getSave(key))
		};
	}
	const routes = makeDevQuestRoutes({
		status: async () => {
			return buildStatus(await getSave(scopeKey()));
		},
		claimChest: async () => {
			const key = scopeKey();
			let result = {
				ok: false,
				gained: 0
			};
			let fresh;
			await new Promise((resolve, reject) => {
				enqueue(key, async () => {
					try {
						const claimed = claimDailyChest(await getSave(key), Date.now(), seasonOverride);
						result = {
							ok: claimed.ok,
							gained: claimed.gained
						};
						fresh = claimed.save;
						if (claimed.ok) {
							saveCache.set(key, claimed.save);
							await persistSave(ctx, storeConfig, claimed.save);
						}
					} catch (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
			return {
				...result,
				status: buildStatus(fresh ?? await getSave(key))
			};
		},
		buy: async (itemId) => mutateSave((save) => buyShopItem(save, itemId, Date.now(), seasonOverride), (result) => ({
			ok: result.ok,
			...result.reason !== void 0 ? { reason: result.reason } : {}
		})),
		reroll: async () => mutateSave((save) => useReroll(save, Date.now()), (result) => ({ ok: result.ok })),
		lucky: async () => {
			const key = scopeKey();
			let reward;
			let ok = false;
			await new Promise((resolve, reject) => {
				enqueue(key, async () => {
					try {
						const r = claimLucky(await getSave(key), Date.now(), seasonOverride);
						ok = r.ok;
						if (r.ok && r.reward !== void 0) {
							reward = r.reward.kind === "xp" || r.reward.kind === "currency" ? {
								kind: r.reward.kind,
								amount: r.reward.amount,
								label: r.reward.label
							} : {
								kind: r.reward.kind,
								count: r.reward.kind === "shield" ? r.reward.count : r.reward.count,
								label: r.reward.label
							};
							saveCache.set(key, r.save);
							await persistSave(ctx, storeConfig, r.save);
						}
					} catch (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
			return {
				ok,
				...reward !== void 0 ? { reward } : {},
				status: buildStatus(await getSave(key))
			};
		},
		exportSave: async () => {
			const save = await getSave(scopeKey());
			return JSON.parse(JSON.stringify(save));
		},
		importSave: async (raw) => {
			const key = scopeKey();
			if (typeof raw !== "object" || raw === null) return {
				ok: false,
				error: "invalid-save",
				status: buildStatus(await getSave(key))
			};
			const candidate = raw;
			if (typeof candidate.player !== "object" || typeof candidate.counters !== "object") return {
				ok: false,
				error: "invalid-save",
				status: buildStatus(await getSave(key))
			};
			let imported;
			try {
				imported = migrateSave(candidate, scopeKey(), seasonOverride);
			} catch {
				return {
					ok: false,
					error: "invalid-save",
					status: buildStatus(await getSave(key))
				};
			}
			imported.updatedAt = Date.now();
			saveCache.set(key, imported);
			await persistSave(ctx, storeConfig, imported);
			return {
				ok: true,
				status: buildStatus(imported)
			};
		},
		setTitle: async (titleId) => mutateSave((save) => setActiveTitle(save, titleId), (result) => ({ ok: result.ok })),
		setTheme: async (themeId) => mutateSave((save) => activateTheme(save, themeId), (result) => ({ ok: result.ok })),
		claimWeeklyBonus: async () => {
			const key = scopeKey();
			let result = {
				ok: false,
				gained: 0
			};
			let fresh;
			await new Promise((resolve, reject) => {
				enqueue(key, async () => {
					try {
						const claimed = claimWeeklyBonus(await getSave(key), Date.now(), seasonOverride);
						result = {
							ok: claimed.ok,
							gained: claimed.gained
						};
						fresh = claimed.save;
						if (claimed.ok) {
							saveCache.set(key, claimed.save);
							await persistSave(ctx, storeConfig, claimed.save);
						}
					} catch (error) {
						reject(error);
						return;
					}
					resolve();
				});
			});
			return {
				...result,
				status: buildStatus(fresh ?? await getSave(key))
			};
		},
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
