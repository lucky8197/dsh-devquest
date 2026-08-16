/**
 * DevQuest 纯函数计分引擎 —— 可单测核心。
 *
 * 不变式：`applyTurn` / `addXp` / `checkAchievements` 都是纯函数
 * （时间由调用方注入 `now`，缺省 Date.now()），无 I/O 无副作用。
 */
import type { AchievementDef, Action, Counters, DailyQuestState, DayHistory, PlayerState, SaveData, ShopItemDef, ShopState, WeeklyQuestState } from './types.ts';
/** 称号（每 5 级一档）。 */
export declare const TITLES: readonly [{
    readonly min: 1;
    readonly zh: "学徒";
    readonly en: "Apprentice";
}, {
    readonly min: 5;
    readonly zh: "工匠";
    readonly en: "Artisan";
}, {
    readonly min: 10;
    readonly zh: "锻造师";
    readonly en: "Forger";
}, {
    readonly min: 15;
    readonly zh: "宗师";
    readonly en: "Master";
}, {
    readonly min: 20;
    readonly zh: "传说";
    readonly en: "Legend";
}];
/** 等级曲线：xpToNext(level) = round(100 × level^1.5)。 */
export declare function xpToNext(level: number): number;
/** 按等级取称号。 */
export declare function titleFor(level: number): {
    zh: string;
    en: string;
};
export declare function xpForTool(tool: string): number;
/** 单动作 XP（工具 XP 在 applyTurn 内单独封顶 +10）。 */
export declare function xpForAction(action: Action): number;
/** 日期键 'YYYY-MM-DD'（本地时区）。 */
export declare function dayKey(now: number): string;
/** 赛季 id（自动按季度）：2026-S1 = 2026 年 Q1（1-3 月），以此类推。 */
export declare function autoSeasonId(now: number): string;
/** 每日任务定义（从计数器取进度）。 */
export interface DailyQuestDef {
    id: string;
    label: {
        zh: string;
        en: string;
    };
    goal: number;
    reward: number;
    progress: (c: Counters) => number;
}
/** 每日任务池（每天抽取 DAILY_QUEST_COUNT 个）。 */
export declare const DAILY_QUEST_POOL: DailyQuestDef[];
/** 每天抽取的任务数。 */
export declare const DAILY_QUEST_COUNT = 3;
/** 每日全清宝箱奖励 XP（当天 3 个任务全部完成后可领取一次）。 */
export declare const DAILY_CHEST_REWARD = 50;
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务；salt 用于重掷）。 */
export declare function rollDailyQuests(now: number, salt?: string): DailyQuestState;
/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
export declare function ensureDaily(save: SaveData, now: number): DailyQuestState;
/** 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。 */
export declare function applyDaily(save: SaveData, now: number): number;
/**
 * 每日任务进度即时同步（纯展示，不发奖）：
 * 从计数器重算每个任务的 progress/done，让面板/工具不用等下一个回合结算就能看到最新进度。
 * 发奖仍由 applyDaily 在回合结算时执行（claimedAt 标记，不会重复/丢失）。
 */
export declare function refreshDailyProgress(save: SaveData, now: number): DailyQuestState;
/** 当天 3 个任务是否已全部完成。 */
export declare function dailyQuestsDone(daily: DailyQuestState): boolean;
/**
 * 领取每日全清宝箱（当天 3 个任务全完成后可领一次，+DAILY_CHEST_REWARD XP）。
 * 未满足条件时返回 { ok: false, gained: 0, save }（原存档副本不变）。
 */
export declare function claimDailyChest(save: SaveData, now?: number, seasonOverride?: string): {
    ok: boolean;
    gained: number;
    save: SaveData;
};
/** 构造最小商店状态。 */
export declare function freshShop(): ShopState;
/** 商店余额（本赛季可支配 XP）。 */
export declare function shopBalance(save: SaveData): number;
/**
 * 购买商店商品（纯函数，返回副本）。
 * 余额不足 / 重复购买主题徽章 → { ok: false, reason }。
 */
export declare function buyShopItem(save: SaveData, itemId: string, now?: number, seasonOverride?: string): {
    ok: boolean;
    reason?: string;
    save: SaveData;
};
/** 切换已拥有主题（id 空=默认主题；未拥有则拒绝；当前激活也视为可切换）。 */
export declare function activateTheme(save: SaveData, themeId: string): {
    ok: boolean;
    save: SaveData;
};
/** 使用 1 次任务重掷：重新抽取今日任务（返回副本；库存不足返回 false）。 */
export declare function useReroll(save: SaveData, now?: number): {
    ok: boolean;
    save: SaveData;
};
/** 检查新手链：返回新完成的 step id 列表（已完成的跳过），并结算奖励 XP。 */
export declare function checkTutorial(save: SaveData, now?: number, seasonOverride?: string): {
    stepIds: string[];
    complete: boolean;
    save: SaveData;
};
/** 构造最小计数器。 */
export declare function freshCounters(): Counters;
/** 构造最小玩家状态。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export declare function freshPlayer(seasonOverride: string | undefined, now: number): PlayerState;
/** 构造最小存档。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export declare function freshSave(cwd: string, seasonOverride: string | undefined, now?: number): SaveData;
/** 存档保留的最近结算事件条数（面板 toast 只关心最近的）。 */
export declare const SETTLEMENT_KEEP = 12;
/** 每日历史保留天数（成长周报展示窗口，超出自动裁剪）。 */
export declare const HISTORY_KEEP = 30;
/** 赛季商店：用本赛季 XP 消费（换季清零，天然防通胀）。 */
export declare const SHOP_ITEMS: ShopItemDef[];
/** 商店主题 id → 面板主题覆盖（client 消费）。 */
export declare const SHOP_THEMES: Record<string, string>;
/** 新手任务链：5 步引导主线，全部完成解锁专属称号。 */
export interface TutorialStepDef {
    id: string;
    name: {
        zh: string;
        en: string;
    };
    icon: string;
    xp: number;
    check: (c: Counters) => boolean;
}
export declare const TUTORIAL_STEPS: TutorialStepDef[];
/** 新手链专属称号（全部完成解锁）。 */
export declare const TUTORIAL_TITLE: {
    readonly zh: "见习冒险者";
    readonly en: "Rookie Adventurer";
};
/** 新手链全部完成的额外奖励 XP。 */
export declare const TUTORIAL_COMPLETE_XP = 100;
/** 条件称号定义。 */
export interface TitleDef {
    id: string;
    name: {
        zh: string;
        en: string;
    };
    icon: string;
    description: {
        zh: string;
        en: string;
    };
    /** 解锁条件（基于存档）。 */
    check: (save: SaveData, now: number) => boolean;
}
/** 条件称号池（按里程碑/成就解锁）。 */
export declare const TITLE_POOL: TitleDef[];
/** 检查条件称号：返回新解锁的称号 id 列表（一次性）。 */
export declare function checkTitles(save: SaveData, now?: number): {
    unlocked: string[];
    save: SaveData;
};
/** 切换展示称号（active 空 = 跟随等级）。 */
export declare function setActiveTitle(save: SaveData, titleId: string): {
    ok: boolean;
    save: SaveData;
};
/** 每周挑战定义（从计数器取进度）。 */
export interface WeeklyQuestDef {
    id: string;
    label: {
        zh: string;
        en: string;
    };
    goal: number;
    reward: number;
    progress: (c: Counters) => number;
}
/** 每周挑战池。 */
export declare const WEEKLY_QUEST_POOL: WeeklyQuestDef[];
/** 每周抽取的任务数。 */
export declare const WEEKLY_QUEST_COUNT = 3;
/** 每周全清额外奖励 XP。 */
export declare const WEEKLY_BONUS_XP = 100;
/** ISO 周键 'YYYY-Www'（周一为一周开始）。 */
export declare function weekKey(now: number): string;
/** 按周滚动本周挑战（同周结果确定）。 */
export declare function rollWeeklyQuests(now: number): WeeklyQuestState;
/** 周过期时重滚（幂等）。 */
export declare function ensureWeekly(save: SaveData, now: number): WeeklyQuestState;
/** 推进每周挑战进度并自动结算，返回本轮奖励 XP（与每日任务同机制）。 */
export declare function applyWeekly(save: SaveData, now: number): number;
/** 领取每周全清奖励（3 个全完成可领一次 +100 XP）。 */
export declare function claimWeeklyBonus(save: SaveData, now?: number, seasonOverride?: string): {
    ok: boolean;
    gained: number;
    save: SaveData;
};
/** 各分类集齐奖励 XP（按分类含成就数/难度给）。 */
export declare const COLLECTION_REWARDS: Record<string, number>;
/** 更新当前赛季纪录（纯函数，返回副本）。换季时旧纪录保留在 records 里。 */
export declare function updateRecords(save: SaveData, now?: number): SaveData;
/** 组装荣誉墙（按赛季倒序，最近在前）。 */
export declare function buildRecordsView(save: SaveData): {
    season: string;
    level: number;
    combo: number;
    seasonXp: number;
}[];
/** 存档保留的历史赛季数（荣誉墙只展示最近 N 个赛季）。 */
export declare const RECORDS_KEEP = 8;
/** 裁剪荣誉墙：只保留最近 RECORDS_KEEP 个赛季。 */
export declare function trimRecords(save: SaveData): SaveData;
/**
 * 检查分类收藏：返回新完成的分类（含奖励 XP 的存档副本）。
 * completed 记录集齐时间；奖励计入累计 XP。
 */
export declare function checkCollections(save: SaveData, now?: number, seasonOverride?: string): {
    completed: string[];
    save: SaveData;
};
/** 分类 id 列表。 */
export declare const CATEGORY_IDS: readonly ["journey", "crafting", "quest", "time", "legend", "egg"];
/** 抽奖结果类型。 */
export type LuckyReward = {
    kind: 'xp';
    amount: number;
    label: string;
} | {
    kind: 'currency';
    amount: number;
    label: string;
} | {
    kind: 'shield';
    count: number;
    label: string;
} | {
    kind: 'reroll';
    count: number;
    label: string;
};
/** 每日抽奖奖池（权重表）。 */
export declare const LUCKY_POOL: {
    weight: number;
    roll: () => LuckyReward;
}[];
/** 每日幸运抽奖（每天一次；未抽过时可用）。返回奖励与存档副本。 */
export declare function claimLucky(save: SaveData, now?: number, seasonOverride?: string): {
    ok: boolean;
    reward?: LuckyReward;
    save: SaveData;
};
/** 下一个更高称号（无则返回 null）。 */
export declare function nextTitle(level: number): {
    level: number;
    name: {
        zh: string;
        en: string;
    };
} | null;
/** 从 level 升到 targetLevel 所需累计 XP。 */
export declare function xpToLevel(level: number, target: number): number;
/**
 * 加 XP 并处理升级、活跃日统计与赛季换季（返回副本；原存档不变）。
 * seasonOverride 缺省按日期自动推导季度赛季；设置后赛季固定不换季。
 */
export declare function addXp(save: SaveData, gain: number, now?: number, seasonOverride?: string): SaveData;
/** 裁剪每日历史：只保留最近 HISTORY_KEEP 天。 */
export declare function trimHistory(history: Record<string, DayHistory>, now: number): Record<string, DayHistory>;
/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 * 返回存档副本（原存档不变）。
 */
export declare function applyTurn(save: SaveData, actions: Action[], now?: number, seasonOverride?: string): SaveData;
/** 单回合结算明细（面板 toast / 工具展示用）。 */
export interface TurnSettlement {
    /** 本轮获得的 XP（含连击加成与每日任务奖励）。 */
    xp: number;
    /** 连击加成倍率（无加成时 null）。 */
    combo: number | null;
    /** 每日任务奖励 XP。 */
    questXp: number;
    /** 结算前等级。 */
    levelBefore: number;
    /** 结算后等级。 */
    levelAfter: number;
    /** 是否升级。 */
    leveledUp: boolean;
    /** 完成/失败的回合数（本轮）。 */
    turnsDone: number;
}
/**
 * 单回合结算（返回存档 + 结算明细）。语义同 applyTurn。
 */
export declare function applyTurnDetailed(save: SaveData, actions: Action[], now?: number, seasonOverride?: string): {
    save: SaveData;
    settlement: TurnSettlement;
};
/**
 * 成就判定：返回新解锁的成就 id 列表（一次性；已解锁的不重复）。
 * 副作用仅限对传入存档副本写入成就记录。
 */
export declare function checkAchievements(defs: AchievementDef[], save: SaveData, now?: number): string[];
/** 存档迁移/补全：把旧版本或缺失字段的存档升级为当前结构。 */
export declare function migrateSave(raw: Partial<SaveData>, cwd: string, seasonOverride: string | undefined): SaveData;
/**
 * 合并多个存档为全局玩家存档（v0.3：从按项目隔离切换到全局跨会话）。
 * - 累计类计数器求和，状态类字段取 updatedAt 最新的存档
 * - 成就取并集（保留最早解锁时间），水位取并集（每个会话的最大 seq）
 * - 等级从累计 XP 重算
 */
export declare function mergeSaves(saves: SaveData[], now?: number): SaveData;
