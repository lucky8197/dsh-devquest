/**
 * DevQuest 纯函数计分引擎 —— 可单测核心。
 *
 * 不变式：`applyTurn` / `addXp` / `checkAchievements` 都是纯函数
 * （时间由调用方注入 `now`，缺省 Date.now()），无 I/O 无副作用。
 */
import type { AchievementDef, Action, Counters, PlayerState, SaveData } from './types.ts';
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
/** 构造最小计数器。 */
export declare function freshCounters(): Counters;
/** 构造最小玩家状态。 */
export declare function freshPlayer(season: string): PlayerState;
/** 构造最小存档。 */
export declare function freshSave(cwd: string, season: string, now?: number): SaveData;
/**
 * 加 XP 并处理升级与活跃日统计（返回副本；原存档不变）。
 */
export declare function addXp(save: SaveData, gain: number, now?: number): SaveData;
/**
 * 单回合结算：聚合该回合的动作，应用工具 XP 封顶与连击加成。
 * completed → turnsCompleted++ / 连击++（≥5 起 ×1.5）；error → turnsFailed++ / 连击清零。
 */
export declare function applyTurn(save: SaveData, actions: Action[], now?: number): SaveData;
/**
 * 成就判定：返回新解锁的成就 id 列表（一次性；已解锁的不重复）。
 * 副作用仅限对传入存档副本写入成就记录。
 */
export declare function checkAchievements(defs: AchievementDef[], save: SaveData, now?: number): string[];
/** 存档迁移/补全：把旧版本或缺失字段的存档升级为当前结构。 */
export declare function migrateSave(raw: Partial<SaveData>, cwd: string, season: string): SaveData;
