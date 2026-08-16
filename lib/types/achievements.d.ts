/**
 * DevQuest 成就清单（27 枚，开发文档 §6）。
 * check 均为纯函数：基于存档（含计数器）与注入时间判定。
 */
import type { AchievementDef, Counters } from './types.ts';
/** 职业画像定义（id → 展示信息）。 */
export interface ClassDef {
    id: string;
    icon: string;
    name: {
        zh: string;
        en: string;
    };
    /** 匹配：工具 id（部分前缀匹配）。 */
    tools: string[];
    /** 匹配所需的最小调用次数。 */
    minCalls: number;
    /** 匹配所需工具数。 */
    minTools?: number;
}
/** 职业画像表（按工具习惯匹配，命中第一个）。 */
export declare const CLASSES: ClassDef[];
/** 今日使用过的工具名（去重；jack_of_all / dq_distinct_8 用），跨天清零。 */
export declare function isClassTool(tool: string, cls: ClassDef): boolean;
/**
 * 识别玩家职业画像：统计工具调用分布，按 CLASSES 表匹配。
 * 无匹配时返回 null（玩家还不够专注）。
 */
export declare function computeClass(counters: Counters): ClassDef | null;
export declare const ACHIEVEMENTS: AchievementDef[];
/** 按 id 查成就（未命中返回 undefined）。 */
export declare function achievementById(id: string): AchievementDef | undefined;
/** 成就稀有度表（id → rarity；缺省 common）。按达成难度/里程碑价值分级。 */
export declare const ACHIEVEMENT_RARITY: Record<string, 'common' | 'rare' | 'epic' | 'legendary'>;
/** 取成就稀有度（缺省 common）。 */
export declare function rarityOf(id: string): 'common' | 'rare' | 'epic' | 'legendary';
