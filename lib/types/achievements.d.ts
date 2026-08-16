/**
 * DevQuest 成就清单（27 枚，开发文档 §6）。
 * check 均为纯函数：基于存档（含计数器）与注入时间判定。
 */
import type { AchievementDef } from './types.ts';
export declare const ACHIEVEMENTS: AchievementDef[];
/** 按 id 查成就（未命中返回 undefined）。 */
export declare function achievementById(id: string): AchievementDef | undefined;
/** 成就稀有度表（id → rarity；缺省 common）。按达成难度/里程碑价值分级。 */
export declare const ACHIEVEMENT_RARITY: Record<string, 'common' | 'rare' | 'epic' | 'legendary'>;
/** 取成就稀有度（缺省 common）。 */
export declare function rarityOf(id: string): 'common' | 'rare' | 'epic' | 'legendary';
