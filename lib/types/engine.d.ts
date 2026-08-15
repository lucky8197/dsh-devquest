/**
 * DevQuest 纯函数计分引擎 —— 可单测核心。
 *
 * 不变式：`applyTurn` / `addXp` / `checkAchievements` 都是纯函数
 * （时间由调用方注入 `now`，缺省 Date.now()），无 I/O 无副作用。
 */
import type { AchievementDef, Action, Counters, DailyQuestState, PlayerState, SaveData } from './types.ts';
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
/** 按日期滚动今日任务（同一天结果确定，不重复抽取同一任务）。 */
export declare function rollDailyQuests(now: number): DailyQuestState;
/** 日期过期时重滚（幂等：当天不重抽）。会就地更新 save.daily。 */
export declare function ensureDaily(save: SaveData, now: number): DailyQuestState;
/** 推进每日任务进度并自动结算奖励，返回本轮任务奖励 XP（在 turn 结算后调用）。 */
export declare function applyDaily(save: SaveData, now: number): number;
/** 构造最小计数器。 */
export declare function freshCounters(): Counters;
/** 构造最小玩家状态。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export declare function freshPlayer(seasonOverride: string | undefined, now: number): PlayerState;
/** 构造最小存档。seasonOverride 缺省按当前日期自动推导季度赛季。 */
export declare function freshSave(cwd: string, seasonOverride: string | undefined, now?: number): SaveData;
/**
 * 加 XP 并处理升级、活跃日统计与赛季换季（返回副本；原存档不变）。
 * seasonOverride 缺省按日期自动推导季度赛季；设置后赛季固定不换季。
 */
export declare function addXp(save: SaveData, gain: number, now?: number, seasonOverride?: string): SaveData;
/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 */
export declare function applyTurn(save: SaveData, actions: Action[], now?: number, seasonOverride?: string): SaveData;
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
