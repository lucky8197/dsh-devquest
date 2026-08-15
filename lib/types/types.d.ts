/**
 * DevQuest 类型定义：归一化 Action / 计数器 / 存档 / 成就定义。
 * 全部为可 JSON 序列化的纯数据，跨 host/client 共享。
 */
/** 归一化动作：listener 把 session 事件翻译成计分引擎可消费的最小结构。 */
export type Action = {
    kind: 'turn-completed';
    turn: number;
} | {
    kind: 'turn-failed';
    turn: number;
} | {
    kind: 'turn-aborted';
    turn: number;
} | {
    kind: 'tool-call';
    tool: string;
} | {
    kind: 'tool-failed';
    tool: string;
} | {
    kind: 'todo-completed';
    count: number;
    allCompleted?: boolean;
} | {
    kind: 'tokens';
    tokens: number;
} | {
    kind: 'subagent';
    depth: number;
} | {
    kind: 'session-start';
    hourOfDay: number;
    source: string;
};
/** 计数器（成就判定的输入；extra 字段为成就所需的状态）。 */
export interface Counters {
    turnsCompleted: number;
    turnsFailed: number;
    consecutiveSuccess: number;
    toolCalls: number;
    toolCallsByTool: Record<string, number>;
    /** edit/write/str-replace-editor 累计（edits_100 用）。 */
    craftTools: number;
    todosCompleted: number;
    /** 单轮 todo/write 全 completed 的次数（clean_sweep 用）。 */
    cleanSweeps: number;
    /** 输出 tokens 累计（season_100k 用）。 */
    tokensOut: number;
    subagentsSpawned: number;
    /** agent 调用 devquest_status 的次数（self_aware 用）。 */
    devquestCalls: number;
    activeDays: number;
    /** 连续活跃天数（seven_days 用）。 */
    streakDays: number;
    lastActiveDay: string;
    lastActivityAt: number;
    /** 当日 completed 数（grinder 用），跨天清零。 */
    completedToday: number;
    completedDay: string;
    /** 最近一次 completed turn 时间（night_owl / early_bird 用）。 */
    lastTurnCompletedAt: number;
    /** 最近一次工具失败（oops 用）。 */
    lastErrorTool?: string;
    lastErrorAt?: number;
    /** 最近一次工具调用（oops 用）。 */
    lastSuccessTool?: string;
    lastSuccessAt?: number;
    /** 已触发「失败后 1 分钟内同工具成功」（oops 一次性标记）。 */
    oopsFired: boolean;
    /** 累计完成的每日任务数（daily_quest_10 用）。 */
    dailyQuestsDone: number;
    /** 东山再起次数：失误后重新完成的回合数（comeback_10 / dq_comeback_1 用）。 */
    comebacks: number;
    /** 凌晨(0-5h)完成的回合数（night_owl_10 / dq_night_1 用）。 */
    nightTurns: number;
    /** 单回合最大输出 tokens（thinker 用）。 */
    maxTokensTurn: number;
    /** 今日使用过的工具名（去重；jack_of_all / dq_distinct_8 用），跨天清零。 */
    todayTools: string[];
    todayToolsDay: string;
}
/** 单个每日任务。 */
export interface DailyQuest {
    id: string;
    /** 任务目标名（面板/工具展示用）。 */
    label: {
        zh: string;
        en: string;
    };
    goal: number;
    reward: number;
    progress: number;
    done: boolean;
    claimedAt?: number;
}
/** 每日任务状态（每天按日期确定性刷新）。 */
export interface DailyQuestState {
    /** 任务所属日 'YYYY-MM-DD'。 */
    date: string;
    quests: DailyQuest[];
}
/** 玩家面板状态。 */
export interface PlayerState {
    level: number;
    xp: number;
    xpTotal: number;
    title: string;
    season: string;
}
/** 存档（~/.dsh/devquest/<cwd-hash>.json）。 */
export interface SaveData {
    version: number;
    cwd: string;
    player: PlayerState;
    counters: Counters;
    achievements: Record<string, {
        acquiredAt: number;
        xp: number;
    }>;
    /** 幂等水位：sessionId → 已处理的最大 event.seq。 */
    lastSeqBySession: Record<string, number>;
    /** 每日任务状态。 */
    daily: DailyQuestState;
    updatedAt: number;
}
/** 成就分类（面板成就墙分主题 tab）。 */
export type AchievementCategory = 'journey' | 'crafting' | 'quest' | 'time' | 'legend' | 'egg';
/** 成就定义。check 为基于存档（含计数器）的纯函数。 */
export interface AchievementDef {
    id: string;
    category: AchievementCategory;
    name: {
        zh: string;
        en: string;
    };
    description: {
        zh: string;
        en: string;
    };
    icon: string;
    xp: number;
    hidden?: boolean;
    check: (save: SaveData, now: number) => boolean;
}
/** 成就视图（status API / 面板用，含解锁状态）。 */
export interface AchievementView {
    id: string;
    category: AchievementCategory;
    name: {
        zh: string;
        en: string;
    };
    description: {
        zh: string;
        en: string;
    };
    icon: string;
    xp: number;
    hidden: boolean;
    unlocked: boolean;
    acquiredAt?: number;
}
/** DevQuest 状态视图（工具与 HTTP API 共用）。 */
export interface DevQuestStatus {
    cwd: string;
    level: number;
    xp: number;
    xpToNext: number;
    title: {
        zh: string;
        en: string;
    };
    season: string;
    counters: Counters;
    achievements: AchievementView[];
    /** 当日每日任务（含进度/奖励）。 */
    daily: DailyQuestState;
    updatedAt: number;
}
