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
    /** 本赛季输出 tokens（season_100k 用），换季清零。 */
    seasonTokensOut: number;
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
    /** 全清宝箱是否已领取（每天一次，3 个任务全完成可领 +50 XP）。 */
    chestClaimed?: boolean;
}
/** 玩家面板状态。 */
export interface PlayerState {
    level: number;
    xp: number;
    xpTotal: number;
    title: string;
    season: string;
    /** 本赛季获得的 XP（换季清零，累计 XP 保留）。 */
    seasonXp: number;
    /** 当前等级起始时间（升级体验：面板展示升到本级的用时）。 */
    levelStartedAt?: number;
}
/** 每日历史记录（成长周报：按日累计 XP/回合）。 */
export interface DayHistory {
    /** 当日获得 XP。 */
    xp: number;
    /** 当日完成回合数。 */
    turns: number;
}
/** 赛季商店状态（用本赛季 XP 消费，换季归零）。 */
export interface ShopState {
    /** 本赛季累计消费（余额 = seasonXp - spent）。 */
    spent: number;
    /** 连击保险库存（失败回合自动消耗一个，保住连击）。 */
    shields: number;
    /** 每日任务重掷次数（库存）。 */
    rerolls: number;
    /** 已购面板主题（id，空=默认）。 */
    theme: string;
    /** 已购称号徽章（id 列表）。 */
    badges: string[];
}
/** 商店商品定义。 */
export interface ShopItemDef {
    id: string;
    kind: 'shield' | 'reroll' | 'theme' | 'badge';
    name: {
        zh: string;
        en: string;
    };
    description: {
        zh: string;
        en: string;
    };
    icon: string;
    price: number;
}
/** 商店商品视图（含是否已购）。 */
export interface ShopItemView extends ShopItemDef {
    owned: boolean;
}
/** 新手任务链：5 步引导主线。 */
export interface TutorialState {
    /** stepId → 完成时间戳。 */
    steps: Record<string, number>;
    /** 全部完成（解锁专属称号）。 */
    done: boolean;
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
    /** 最近回合结算事件（面板 toast 用，保留最近 N 条）。 */
    settlements?: TurnSettlementEvent[];
    /** 每日历史（成长周报），date → 当日累计，保留最近 HISTORY_KEEP 天。 */
    history?: Record<string, DayHistory>;
    /** 赛季商店状态。 */
    shop?: ShopState;
    /** 新手任务链状态。 */
    tutorial?: TutorialState;
    updatedAt: number;
}
/** 单回合结算事件（host 每回合推一条，client 轮询 diff 出 toast）。 */
export interface TurnSettlementEvent {
    /** 单调递增事件 id（client 去重用）。 */
    id: string;
    at: number;
    /** 本轮 XP（含连击加成与每日任务奖励）。 */
    xp: number;
    /** 连击加成倍率（无加成时 null）。 */
    combo: number | null;
    /** 每日任务奖励 XP。 */
    questXp: number;
    levelBefore: number;
    levelAfter: number;
    leveledUp: boolean;
    /** 本轮完成/失败回合数。 */
    turnsDone: number;
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
    /** 可选：进度条信息（current/goal）。缺省表示纯条件成就，不显示进度。 */
    progress?: (save: SaveData) => {
        current: number;
        goal: number;
    };
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
    /** 未解锁成就的进度（若有）。 */
    progress?: {
        current: number;
        goal: number;
    };
}
/** DevQuest 状态视图（工具与 HTTP API 共用）。 */
export interface DevQuestStatus {
    cwd: string;
    level: number;
    xp: number;
    xpToNext: number;
    /** 当前等级起始时间（升级体验：面板显示升到本级的用时）。 */
    levelStartedAt?: number;
    title: {
        zh: string;
        en: string;
    };
    season: string;
    /** 本赛季获得的 XP。 */
    seasonXp: number;
    counters: Counters;
    achievements: AchievementView[];
    /** 当日每日任务（含进度/奖励）。 */
    daily: DailyQuestState;
    /** 每日全清宝箱状态（当天 3 个任务全完成后可领取）。 */
    dailyChest: {
        ready: boolean;
        claimed: boolean;
    };
    /** 最近回合结算事件（面板 toast 数据源）。 */
    settlements: TurnSettlementEvent[];
    /** 赛季商店：余额 + 商品（含已购状态）。 */
    shop: {
        balance: number;
        items: ShopItemView[];
        theme: string;
        badges: string[];
        shields: number;
        rerolls: number;
    };
    /** 新手任务链视图。 */
    tutorial: {
        steps: {
            id: string;
            name: {
                zh: string;
                en: string;
            };
            icon: string;
            xp: number;
            done: boolean;
            acquiredAt?: number;
        }[];
        done: boolean;
        /** 专属称号（全部完成解锁）。 */
        title: {
            zh: string;
            en: string;
        };
    };
    /** 最近 HISTORY_DAYS 天每日历史（成长周报，时间正序）。 */
    history: {
        date: string;
        xp: number;
        turns: number;
    }[];
    updatedAt: number;
}
