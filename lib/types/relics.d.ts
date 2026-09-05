/**
 * v1.4.0 冒险扩展（二）：开发者圣物 / 史诗任务链 / 幽灵竞速。
 *
 * - 圣物：todo 全清 / 周 BOSS / 每日宝箱低概率掉落，24 种分稀有度收集。
 * - 史诗任务链：跨天剧情任务（多步、每日推进、断天重置、终章大奖励）。
 * - 幽灵竞速：用前 7 天真实数据生成幽灵对手，近 7 天滚动进度追赶，击败领奖。
 *
 * 全部纯函数（时间由调用方注入），周期生成依赖 history/计数器。
 */
import type { SaveData } from './types.ts';
import type { DailyQuestDef } from './engine.ts';
/** 本地日期键 'YYYY-MM-DD'（与 engine.dayKey 一致；保持零依赖避免循环 import）。 */
export declare function dayKeyLocal(now: number): string;
export interface RelicDef {
    id: string;
    icon: string;
    name: {
        zh: string;
        en: string;
    };
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
/** 圣物池（24 种，按稀有度分布）。 */
export declare const RELIC_POOL: RelicDef[];
export declare function relicById(id: string): RelicDef | undefined;
/** 已收集的圣物（id 集合）。 */
export declare function ownedRelics(save: SaveData): Set<string>;
/**
 * 尝试掉落圣物（基础概率 chance ∈ [0,1]；神秘彩蛋 buff 在场时 ×2）。
 * 只掉落未拥有的（全收集后返回 null）。返回 s 与掉落的圣物（无则 null）。
 */
export declare function rollRelic(save: SaveData, chance: number, now: number, seed: string): {
    save: SaveData;
    relic: RelicDef | null;
};
export interface ChainStepDef {
    /** 条件类型：xp=今日 XP 达阈值；quests=当日完成每日任务数；turns=当日完成回合数。 */
    need: 'xp' | 'quests' | 'turns';
    target: number;
    label: {
        zh: string;
        en: string;
    };
}
export interface ChainQuestDef {
    id: string;
    icon: string;
    name: {
        zh: string;
        en: string;
    };
    /** 每步剧情文案（推进时展示）。 */
    steps: ChainStepDef[];
    rewardXp: number;
}
/** 史诗任务链池（3 条剧情线）。 */
export declare const CHAIN_QUESTS: ChainQuestDef[];
export declare function chainById(id: string): ChainQuestDef | undefined;
/** 条件是否满足（基于当天累计指标）。 */
export declare function chainStepMet(def: ChainStepDef, save: SaveData, now: number): boolean;
/**
 * 每日推进任务链（回合结算后调用）：
 * - 无链时（或上一链完成）不自动接链——接链由 claimChain 时从池中随机接取新链？简化：无链则随机接一条。
 * - 断天重置：上次推进不是今天也不是昨天 → 链从头开始。
 * - 今天未推进且条件满足 → 步骤 +1；全部完成 → finished（待领终章）。
 * 返回 { save, advanced: 是否推进/断裂, finished: 是否刚完成, label? }。
 */
export declare function advanceQuestChain(save: SaveData, now: number, seed: string): {
    save: SaveData;
    advanced: boolean;
    reset: boolean;
    finished: boolean;
    label: string | null;
};
/** 领取任务链终章奖励（大 XP；幂等 finished+claimed 门）。 */
export declare function claimChainReward(save: SaveData, now: number, seasonOverride?: string): {
    ok: boolean;
    gained: number;
    save: SaveData;
};
export declare const GHOST_REWARD_XP = 300;
/** 前 7 天（不含今天）history 总和。 */
export declare function pastWeekTotals(save: SaveData, now: number): {
    xp: number;
    turns: number;
};
/** 近 7 天（含今天）history 总和（本周进度）。 */
export declare function thisWeekTotals(save: SaveData, now: number): {
    xp: number;
    turns: number;
};
/**
 * 幽灵竞速状态保证：本周未初始化且有前 7 天数据 → 生成幽灵（前 7 天总和）。
 * 幽灵只在「上周有数据」时生成（首周无幽灵）。
 */
export declare function ensureGhostRace(save: SaveData, now: number): SaveData;
/** 当前对决进度（client 进度条用）。 */
export declare function ghostRaceProgress(save: SaveData, now: number): {
    active: boolean;
    ghostXp: number;
    ghostTurns: number;
    myXp: number;
    myTurns: number;
    beaten: boolean;
    claimed: boolean;
};
/** 领取幽灵竞速奖励（击败且未领；+300 XP）。 */
export declare function claimGhostReward(save: SaveData, now: number, seasonOverride?: string): {
    ok: boolean;
    gained: number;
    save: SaveData;
};
/** 每日任务梗化花名（与正经名共存，seed 决定是否用梗版）。 */
export declare const DAILY_QUEST_MEME: Partial<Record<string, {
    zh: string;
    en: string;
}>>;
/** 梗化标签（确定性抽取；约 60% 用梗版）。 */
export declare function memedDailyLabel(id: string, def: DailyQuestDef, seed: string): {
    zh: string;
    en: string;
};
/** 每周 BOSS 花名池。 */
export declare const BOSS_MEME_NAMES: {
    zh: string;
    en: string;
}[];
/** 按周种子取 BOSS 花名。 */
export declare function bossMemeName(seed: string): {
    zh: string;
    en: string;
};
/** 幽灵界面花名（本轮对决对手名称）。 */
export declare function ghostMemeName(seed: string): {
    zh: string;
    en: string;
};
