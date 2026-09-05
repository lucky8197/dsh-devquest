/** 每多少已完成回合触发一次事件卡。 */
export const EVENT_EVERY_TURNS = 20;
/** 事件效果池（随机抽取；相斥效果同组不再同时出现）。 */
export const EVENT_POOL = [
    // ---- buff（增益）----
    {
        id: 'ev-coffee', kind: 'buff', icon: '☕',
        name: { zh: '咖啡因爆发', en: 'Caffeine Rush' },
        description: { zh: '接下来 30 分钟内工具 XP ×2', en: 'Tool XP ×2 for the next 30 minutes' },
        durationMin: 30,
    },
    {
        id: 'ev-focus', kind: 'buff', icon: '🧘',
        name: { zh: '深度专注', en: 'Deep Focus' },
        description: { zh: '接下来 20 个完成回合输出 tokens 计分 ×1.5', en: 'Token XP ×1.5 for the next 20 turns' },
        durationTurns: 20,
    },
    {
        id: 'ev-inspire', kind: 'buff', icon: '💡',
        name: { zh: '灵感迸发', en: 'Inspiration' },
        description: { zh: '接下来 10 个完成回合 XP +10%', en: '+10% XP for the next 10 turns' },
        durationTurns: 10,
    },
    {
        id: 'ev-bugdoc', kind: 'buff', icon: '🐛',
        name: { zh: 'BUG 档案馆', en: 'Bug Archive' },
        description: { zh: '今日 todo 完成后每个额外 +15 XP', en: 'Each completed todo grants +15 XP today' },
        durationMin: 60,
    },
    // ---- curse（挫折，多为止损型）----
    {
        id: 'ev-ghostbug', kind: 'curse', icon: '👻',
        name: { zh: '幽灵 Bug 缠身', en: 'Ghost Bug' },
        description: { zh: '下一次工具失败不扣连击（但它偷走了你 20 XP）', en: 'Next failure won\'t break combo (but it costs you 20 XP)' },
        oneShot: true,
    },
    {
        id: 'ev-refactor', kind: 'curse', icon: '🔧',
        name: { zh: '重构之痛', en: 'Refactor Pain' },
        description: { zh: '接下来 15 个完成回合工具 XP 减半（完成 5 个待办可提前解除）', en: 'Tool XP halved for 15 turns (5 todos clears it)' },
        durationTurns: 15,
    },
    {
        id: 'ev-techdebt', kind: 'curse', icon: '🧱',
        name: { zh: '技术债上门', en: 'Tech Debt Collector' },
        description: { zh: '下次回合结算 XP 清零（愤怒的债主）', en: 'Next settlement XP is lost (the debt collector)' },
        oneShot: true,
    },
    // ---- choice（抉择）----
    {
        id: 'ev-easteregg', kind: 'choice', icon: '🥚',
        name: { zh: '神秘彩蛋', en: 'Mystery Egg' },
        description: { zh: '你发现一枚神秘彩蛋……吃掉它（+80 XP）还是留着（获得稀有圣物掉率 ×2 一小时）？', en: 'A mystery egg! Eat it (+80 XP) or keep it (double relic drop chance for an hour)?' },
    },
    {
        id: 'ev-midnight', kind: 'choice', icon: '🌙',
        name: { zh: '深夜抉择', en: 'Midnight Choice' },
        description: { zh: '凌晨的代码格外安静：继续肝（明天活跃奖励 ×2）还是休息（今天 +50 XP）？', en: 'Continue (double streak reward tomorrow) or rest (+50 XP now)?' },
    },
    {
        id: 'ev-gamble', kind: 'choice', icon: '🎲',
        name: { zh: '命运骰子', en: 'Fate Dice' },
        description: { zh: '赌一把：50% 得 +200 XP，50% 失去 100 XP', en: 'Gamble: 50% +200 XP, 50% -100 XP' },
    },
];
/** 事件卡可领取状态（client 弹卡片用：存在未决的 choice 事件）。 */
export function pendingEvent(save) {
    return (save.events ?? []).some(e => EVENT_POOL.find(d => d.id === e.effectId)?.kind === 'choice');
}
/**
 * 触发随机事件卡（每 EVENT_EVERY_TURNS 回合调用一次）：
 * 重置计数并抽取一个效果。choice 型写入 events 待玩家抉择（resolveEvent 结算）；
 * buff/curse 立即写入（持续生效）。
 * 返回事件视图（client 展示用）；无事件时返回 null。
 */
export function rollEvent(save, now, seed) {
    const s = structuredClone(save);
    // 重置触发计数
    s.counters.turnsSinceEvent = 0;
    const idx = hashSeed(seed) % EVENT_POOL.length;
    const def = EVENT_POOL[idx];
    const event = {
        id: `ev-${now}-${idx}`,
        effectId: def.id,
        gainedAt: now,
        ...(def.durationMin !== undefined ? { expiresAt: now + def.durationMin * 60_000 } : {}),
        ...(def.durationTurns !== undefined ? { expiresTurns: def.durationTurns } : {}),
    };
    s.events = [...(s.events ?? []), event];
    return { id: event.id, def, save: s };
}
/** 简单字符串散列（FNV-1a）——事件抽取与怪名随机共用。 */
export function hashSeed(seed) {
    let h = 2166136261;
    for (const ch of seed) {
        h ^= ch.codePointAt(0) ?? 0;
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
/**
 * 结算 choice 类事件：选项编号 0/1。
 * 返回 gained（XP 增减，可为负）与 save（不含 XP 加法——由调用方 addXp 统一入账）。
 * 事件条目从 save.events 移除；选择的 buff（彩蛋/深夜）以新事件条目写入。
 */
export function resolveEvent(save, eventId, option, now, seed) {
    const s = structuredClone(save);
    const ev = (s.events ?? []).find(e => e.id === eventId);
    const fail = (label) => ({ ok: false, gained: 0, label, save: s });
    if (ev === undefined)
        return fail('事件不存在或已过期');
    const def = EVENT_POOL.find(d => d.id === ev.effectId);
    if (def === undefined || def.kind !== 'choice')
        return fail('不可结算');
    s.events = (s.events ?? []).filter(e => e.id !== eventId); // choice 即时结算后移除
    switch (def.id) {
        case 'ev-easteregg': {
            if (option === 0) {
                return { ok: true, gained: 80, label: '吃掉彩蛋：+80 XP', save: s };
            }
            // 保留：双倍圣物掉率 60 分钟（relics 模块读取 events 判断）
            const buff = { id: `evx-${now}`, effectId: 'ev-relicluck', gainedAt: now, expiresAt: now + 60 * 60_000 };
            s.events = [...(s.events ?? []), buff];
            return { ok: true, gained: 0, label: '留下彩蛋：圣物掉率 ×2（1 小时）', save: s };
        }
        case 'ev-midnight': {
            if (option === 0) {
                // 明天连击阶梯奖励 ×2：一次性标记事件（addXp 钩子消费）
                const buff = { id: `evx-${now}`, effectId: 'ev-doublestreak', gainedAt: now };
                s.events = [...(s.events ?? []), buff];
                return { ok: true, gained: 0, label: '继续肝：明日连击奖励 ×2', save: s };
            }
            return { ok: true, gained: 50, label: '休息一下：+50 XP', save: s };
        }
        case 'ev-gamble': {
            const win = (hashSeed(`gamble-${now}-${seed}`) % 2) === 0;
            if (win)
                return { ok: true, gained: 200, label: '🎲 大成功：+200 XP', save: s };
            return { ok: true, gained: -100, label: '🎲 大失败：-100 XP', save: s };
        }
        default:
            return fail('未知事件');
    }
}
/** 连击姿态表（连击 ≥ combo 生效，取最高档）。 */
export const COMBO_STANCES = [
    { combo: 10, id: 'stance-flow', icon: '🌊', name: { zh: '心流', en: 'Flow' }, toolBonus: 1 },
    { combo: 25, id: 'stance-aegis', icon: '⚡', name: { zh: '雷闪', en: 'Surge' }, toolBonus: 2 },
    { combo: 50, id: 'stance-phoenix', icon: '🔥', name: { zh: '凤炎', en: 'Phoenix' }, toolBonus: 3, tokenMultiplier: 1.2 },
    { combo: 100, id: 'stance-ascend', icon: '✨', name: { zh: '飞升', en: 'Ascend' }, toolBonus: 5, tokenMultiplier: 1.5 },
];
/** 按当前连击取生效姿态（无达标返回 null）。 */
export function comboStance(consecutive) {
    let best = null;
    for (const s of COMBO_STANCES)
        if (consecutive >= s.combo)
            best = s;
    return best;
}
/** 是否刚达成新的姿态档位（client 全屏特效用：上一连击 < combo ≤ 当前）。 */
export function stanceJustReached(prevCombo, nowCombo) {
    const now = comboStance(nowCombo);
    if (now === null)
        return null;
    const prev = comboStance(prevCombo);
    if (prev !== null && prev.combo >= now.combo)
        return null;
    return now;
}
/**
 * 结算事件有效期（按时间/回合窗口清理过期项），并消费一次性项。
 * 注意：**原地修改传入存档**（调用方需保证传的是自己的副本，如 applyTurnDetailed 的 clone）；
 * 返回本轮生效的 mods。
 */
export function tickEvents(save, completed, failed, now) {
    const live = (save.events ?? []).filter(e => e.expiresAt === undefined || now <= e.expiresAt);
    const mods = { toolBonus: 0, tokenMultiplier: 1, gainMultiplier: 1, shieldFailure: false, wipeGain: false, todoBonus: false };
    for (const e of live) {
        const def = EVENT_POOL.find(d => d.id === e.effectId);
        if (def === undefined)
            continue;
        switch (def.id) {
            case 'ev-coffee':
                mods.toolBonus += 2; // 工具 XP ×2 ≈ 基础 +2（xpForTool 1/2 → 加 2 即翻倍）
                break;
            case 'ev-focus':
                if (completed)
                    mods.tokenMultiplier *= 1.5;
                break;
            case 'ev-inspire':
                if (completed)
                    mods.gainMultiplier *= 1.1;
                break;
            case 'ev-bugdoc':
                mods.todoBonus = true;
                break;
            case 'ev-ghostbug': {
                // 一次性：本次任何情况都会消费（失败→护盾；成功→无副作用消失）
                e.consumed = true;
                if (failed)
                    mods.shieldFailure = true;
                break;
            }
            case 'ev-refactor':
                if (completed)
                    mods.toolBonus -= 1; // 工具 XP 减半的近似（基础 2 → 1）
                break;
            case 'ev-techdebt':
                e.consumed = true;
                mods.wipeGain = true;
                break;
            default:
                break;
        }
    }
    // 回合窗口递减 + 消费项移除
    const kept = live.filter(e => {
        if (e.consumed === true)
            return false;
        if (e.expiresTurns !== undefined && completed) {
            e.expiresTurns -= 1;
            return e.expiresTurns > 0;
        }
        return true;
    });
    save.events = kept;
    return mods;
}
/** 幽灵 Bug 一次性事件的「失败了也护盾」语义：引擎失败分支调用询问。 */
export function hasFailureShield(events) {
    return (events ?? []).some(e => e.effectId === 'ev-ghostbug' && e.consumed !== true);
}
/** 技术债上门：本轮结算清零（一次性）。 */
export function techDebtConsumed(events) {
    return (events ?? []).some(e => e.effectId === 'ev-techdebt' && e.consumed === true);
}
/** 圣物掉率 ×2 是否生效（神秘彩蛋保留选项）。 */
export function relicLuckActive(events, now) {
    return (events ?? []).some(e => e.effectId === 'ev-relicluck' && (e.expiresAt === undefined || now < e.expiresAt));
}
/** 明日连击阶梯 ×2 标记是否在场（凌晨抉择：继续肝）。 */
export function doubleStreakActive(events) {
    return (events ?? []).some(e => e.effectId === 'ev-doublestreak');
}
/** 消费「明日连击 ×2」标记（addXp 发放阶梯奖励时调用并叠加一次）。 */
export function consumeDoubleStreak(save) {
    const s = structuredClone(save);
    s.events = (s.events ?? []).filter(e => e.effectId !== 'ev-doublestreak');
    return s;
}
/** bugdoc 事件在场：todo 奖励 ×2（15 → 30 XP/个）。 */
export function todoBonusActive(events, now) {
    return (events ?? []).some(e => e.effectId === 'ev-bugdoc' && (e.expiresAt === undefined || now < e.expiresAt));
}
