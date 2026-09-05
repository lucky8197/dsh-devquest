/**
 * v1.4.0 冒险扩展（一）：随机事件卡 + 连击姿态。
 *
 * - 随机事件卡：每 EVENT_EVERY_TURNS 个已完成回合触发一次「命运骰子」。
 *   事件分三类：buff（增益，时段/回合窗口）、curse（挫折，多为一次性止损）、
 *   choice（抉择：玩家二选一，经 resolveEvent 即时结算）。
 * - 连击姿态：连击 ≥ 档位解锁战斗姿态（纯展示 + 微加成），里程碑可配全屏特效。
 *
 * 全部纯函数（时间由调用方注入），effect 生效逻辑在 applyTurnDetailed 钩子内消费。
 */
import type { ActiveEvent, SaveData } from './types.ts';
/** 每多少已完成回合触发一次事件卡。 */
export declare const EVENT_EVERY_TURNS = 20;
export type EventEffectKind = 'buff' | 'curse' | 'choice';
export interface EventEffectDef {
    id: string;
    kind: EventEffectKind;
    icon: string;
    name: {
        zh: string;
        en: string;
    };
    description: {
        zh: string;
        en: string;
    };
    /** 效果持续分钟数（时间窗口；choice 型即时结算不需要）。 */
    durationMin?: number;
    /** 效果持续已完成回合数（回合窗口）。 */
    durationTurns?: number;
    /** 一次性止损型（消费后消失，如「下次失败不扣连击」）。 */
    oneShot?: boolean;
}
/** 事件效果池（随机抽取；相斥效果同组不再同时出现）。 */
export declare const EVENT_POOL: EventEffectDef[];
/** 事件卡可领取状态（client 弹卡片用：存在未决的 choice 事件）。 */
export declare function pendingEvent(save: SaveData): boolean;
/**
 * 触发随机事件卡（每 EVENT_EVERY_TURNS 回合调用一次）：
 * 重置计数并抽取一个效果。choice 型写入 events 待玩家抉择（resolveEvent 结算）；
 * buff/curse 立即写入（持续生效）。
 * 返回事件视图（client 展示用）；无事件时返回 null。
 */
export declare function rollEvent(save: SaveData, now: number, seed: string): {
    id: string;
    def: EventEffectDef;
    save: SaveData;
} | null;
/** 简单字符串散列（FNV-1a）——事件抽取与怪名随机共用。 */
export declare function hashSeed(seed: string): number;
/**
 * 结算 choice 类事件：选项编号 0/1。
 * 返回 gained（XP 增减，可为负）与 save（不含 XP 加法——由调用方 addXp 统一入账）。
 * 事件条目从 save.events 移除；选择的 buff（彩蛋/深夜）以新事件条目写入。
 */
export declare function resolveEvent(save: SaveData, eventId: string, option: number, now: number, seed: string): {
    ok: boolean;
    gained: number;
    label: string;
    save: SaveData;
};
export interface ComboStanceDef {
    /** 解锁连击数。 */
    combo: number;
    id: string;
    icon: string;
    name: {
        zh: string;
        en: string;
    };
    /** 姿态生效时：每回合工具 XP 追加（封顶前）。 */
    toolBonus?: number;
    /** 姿态生效时：tokens 计分倍率。 */
    tokenMultiplier?: number;
}
/** 连击姿态表（连击 ≥ combo 生效，取最高档）。 */
export declare const COMBO_STANCES: ComboStanceDef[];
/** 按当前连击取生效姿态（无达标返回 null）。 */
export declare function comboStance(consecutive: number): ComboStanceDef | null;
/** 是否刚达成新的姿态档位（client 全屏特效用：上一连击 < combo ≤ 当前）。 */
export declare function stanceJustReached(prevCombo: number, nowCombo: number): ComboStanceDef | null;
/** 事件/姿态的回合级效果：返回 { toolGain 追加, token 倍率, gain 倍率, 失败护盾 }。 */
export interface TurnEffectMods {
    toolBonus: number;
    tokenMultiplier: number;
    gainMultiplier: number;
    /** 失败回合护盾（幽灵 Bug）：本次失败不扣连击。 */
    shieldFailure: boolean;
    /** 技术债上门：本轮 XP 清零。 */
    wipeGain: boolean;
    /** todo 完成奖励 ×2（BUG 档案馆）。 */
    todoBonus: boolean;
}
/**
 * 结算事件有效期（按时间/回合窗口清理过期项），并消费一次性项。
 * 注意：**原地修改传入存档**（调用方需保证传的是自己的副本，如 applyTurnDetailed 的 clone）；
 * 返回本轮生效的 mods。
 */
export declare function tickEvents(save: SaveData, completed: boolean, failed: boolean, now: number): TurnEffectMods;
/** 幽灵 Bug 一次性事件的「失败了也护盾」语义：引擎失败分支调用询问。 */
export declare function hasFailureShield(events: ActiveEvent[] | undefined): boolean;
/** 技术债上门：本轮结算清零（一次性）。 */
export declare function techDebtConsumed(events: ActiveEvent[] | undefined): boolean;
/** 圣物掉率 ×2 是否生效（神秘彩蛋保留选项）。 */
export declare function relicLuckActive(events: ActiveEvent[] | undefined, now: number): boolean;
/** 明日连击阶梯 ×2 标记是否在场（凌晨抉择：继续肝）。 */
export declare function doubleStreakActive(events: ActiveEvent[] | undefined): boolean;
/** 消费「明日连击 ×2」标记（addXp 发放阶梯奖励时调用并叠加一次）。 */
export declare function consumeDoubleStreak(save: SaveData): SaveData;
/** bugdoc 事件在场：todo 奖励 ×2（15 → 30 XP/个）。 */
export declare function todoBonusActive(events: ActiveEvent[] | undefined, now: number): boolean;
