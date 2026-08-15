/**
 * DevQuest 成就清单（27 枚，开发文档 §6）。
 * check 均为纯函数：基于存档（含计数器）与注入时间判定。
 */
import type { AchievementDef } from './types.ts';
export declare const ACHIEVEMENTS: AchievementDef[];
/** 按 id 查成就（未命中返回 undefined）。 */
export declare function achievementById(id: string): AchievementDef | undefined;
