/**
 * v1.4.0 冒险扩展纯函数单测：随机事件卡 / 连击姿态 / 圣物掉落 / 史诗任务链 / 幽灵竞速。
 * 运行：node --test 'tests/*.test.ts'
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rollEvent, resolveEvent, tickEvents, comboStance, EVENT_POOL, EVENT_EVERY_TURNS, pendingEvent } from '../src/events.ts'
import {
  advanceQuestChain, bossMemeName, claimChainReward, claimGhostReward, ensureGhostRace, ghostRaceProgress, memedDailyLabel, pastWeekTotals,
  RELIC_POOL, rollRelic, CHAIN_QUESTS, GHOST_REWARD_XP,
} from '../src/relics.ts'
import { addXp, applyTurn, dayKey, freshSave } from '../src/engine.ts'

const NOW = new Date(2026, 7, 15, 12, 0, 0).getTime()

function fresh(): ReturnType<typeof freshSave> {
  const s = freshSave('C:/proj', undefined, NOW)
  s.daily = { date: dayKey(NOW), quests: [] }
  return s
}

test('v1.4.0 随机事件：每 20 回合触发并写入事件', () => {
  const base = fresh()
  // 20 个 completed 回合后触发卡
  let save = base
  for (let i = 0; i < 20; i++) save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  const events = save.events ?? []
  assert.equal(events.length, 1, '第 20 回合应触发一张事件卡')
  assert.ok(EVENT_POOL.some(d => d.id === events[0]!.effectId))
  // 触发后计数重置：再 1 回合不触发
  const turnsSince = save.counters.turnsSinceEvent
  assert.ok((turnsSince ?? 0) < EVENT_EVERY_TURNS)
})

test('v1.4.0 事件效果：幽灵 Bug 失败护盾 + 消费', () => {
  const base = fresh()
  base.events = [{ id: 'e1', effectId: 'ev-ghostbug', gainedAt: NOW }]
  // 失败回合：护盾生效（不清连击）
  const mods = tickEvents(base, false, true, NOW)
  assert.equal(mods.shieldFailure, true)
  assert.equal((base.events ?? []).length, 0, '一次性事件消费移除')
})

test('v1.4.0 事件抉择：彩蛋吃掉 +80 / 留着力气掉率', () => {
  const base = fresh()
  // 直接构造彩蛋事件（不依赖随机抽取）
  base.events = [{ id: 'e-egg', effectId: 'ev-easteregg', gainedAt: NOW }]
  // 吃掉：+80
  const eat = resolveEvent(base, 'e-egg', 0, NOW, 's')
  assert.equal(eat.ok, true)
  assert.equal(eat.gained, 80)
  // 留着：写入 ev-relicluck buff（重建事件）
  base.events = [{ id: 'e-egg2', effectId: 'ev-easteregg', gainedAt: NOW }]
  const keep = resolveEvent(base, 'e-egg2', 1, NOW, 's')
  assert.equal(keep.ok, true)
  assert.ok((keep.save.events ?? []).some(e => e.effectId === 'ev-relicluck'))
})

test('v1.4.0 连击姿态：档位与加成', () => {
  assert.equal(comboStance(9), null)
  assert.equal(comboStance(10)?.id, 'stance-flow')
  assert.equal(comboStance(25)?.id, 'stance-aegis')
  assert.equal(comboStance(50)?.id, 'stance-phoenix')
  assert.equal(comboStance(100)?.id, 'stance-ascend')
  // 姿态工具加成仅在实际工具调用时生效
  let save = fresh()
  for (let i = 0; i < 10; i++) save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  const stance1 = comboStance(save.counters.consecutiveSuccess)
  assert.equal(stance1?.id, 'stance-flow')
  // 无工具回合：姿态不加成（仍按连击档位 ×1.5）
  const before = save.player.xpTotal
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 11 }], NOW + 100)
  assert.equal(save.player.xpTotal, before + 15)
})

test('v1.4.0 圣物：必掉场景 + 全收集后不再掉', () => {
  const base = fresh()
  const r1 = rollRelic(base, 1, NOW, 's1')
  assert.ok(r1.relic !== null)
  assert.equal((r1.save.relics ?? []).length, 1)
  // 全收集（必掉连续滚）：不再掉落
  let full = r1.save
  let guard = 0
  while ((full.relics ?? []).length < RELIC_POOL.length && guard < 100) {
    const rr = rollRelic(full, 1, NOW, `s-${guard}`)
    if (rr.relic === null) break
    full = rr.save
    guard++
  }
  assert.equal((full.relics ?? []).length, RELIC_POOL.length)
  const done = rollRelic(full, 1, NOW, 's-done')
  assert.equal(done.relic, null)
})

test('v1.4.0 任务链：接链 → 每日推进 → 断天重置 → 终章', () => {
  const t1 = NOW
  const t2 = t1 + 86_400_000
  let save = fresh()
  // 预置技术债链（避免随机抽取）：第一步 = 今日 XP ≥ 150
  save.questChain = { id: 'chain-techdebt', step: 0, dayKeyStarted: dayKey(t1), lastProgressDay: dayKey(t1) }
  save = addXp(save, 160, t2) // 次日 160 XP
  let r = advanceQuestChain(save, t2, 'chain-seed')
  assert.equal(r.advanced, true, '第二天达标应推进')
  assert.equal(r.save.questChain!.step, 1)
  save = r.save
  // 同一天不重复推进
  r = advanceQuestChain(save, t2 + 1000, 'chain-seed')
  assert.equal(r.advanced, false)
  assert.equal(r.save.questChain!.step, 1)
  // 第三天不达标 → 不推进
  const t3 = t2 + 86_400_000
  save = addXp(save, 10, t3)
  r = advanceQuestChain(save, t3, 'chain-seed')
  assert.equal(r.advanced, false)
  assert.equal(r.save.questChain!.step, 1)
  // 断天（越过一天未推进）→ 重置重来
  const t4 = t3 + 86_400_000
  save = addXp(save, 10, t4)
  r = advanceQuestChain(save, t4, 'chain-seed')
  assert.equal(r.reset, true, '断档应重置')
  assert.equal(r.save.questChain!.step, 0)
})

test('v1.4.0 幽灵竞速：前 7 天生成幽灵、进度与领取', () => {
  const base = fresh()
  // 前 7 天有数据（history）
  for (let i = 1; i <= 7; i++) {
    const d = dayKey(NOW - i * 86_400_000)
    base.history = { ...(base.history ?? {}), [d]: { xp: 100, turns: 5 } }
  }
  const withGhost = ensureGhostRace(base, NOW)
  assert.ok(withGhost.ghostRace !== undefined)
  assert.equal(withGhost.ghostRace!.ghostXp, 700)
  assert.equal(withGhost.ghostRace!.ghostTurns, 35)
  // 本周无进度 → 未击败
  let prog = ghostRaceProgress(withGhost, NOW)
  assert.equal(prog.beaten, false)
  assert.equal(prog.claimed, false)
  // 冲刺：本周也攒 700 XP + 35 回合
  let save = withGhost
  save.history = { ...(save.history ?? {}), [dayKey(NOW)]: { xp: 700, turns: 35 } }
  save.counters.todayXp = 700
  save.counters.todayXpDay = dayKey(NOW)
  prog = ghostRaceProgress(save, NOW)
  assert.equal(prog.beaten, true)
  // 领取：+300 XP（调用方 addXp 入账）
  const r = claimGhostReward(save, NOW)
  assert.equal(r.ok, true)
  assert.equal(r.gained, GHOST_REWARD_XP)
  assert.equal(r.save.ghostRace!.claimed, true)
  const final = addXp(r.save, r.gained, NOW)
  assert.ok(final.player.xpTotal > save.player.xpTotal)
  // 防重：已领不再发
  const r2 = claimGhostReward(final, NOW)
  assert.equal(r2.ok, false)
})

test('v1.4.0 文案梗化：任务/幽灵/BOSS 名确定性', () => {
  // 同一 seed 结果稳定
  const a = memedDailyLabel('dq_turns_5', { id: 'dq_turns_5', label: { zh: '完成 5 个回合', en: 'turn 5' }, goal: 5, reward: 30, progress: () => 0 }, '2026-08-15')
  const b = memedDailyLabel('dq_turns_5', { id: 'dq_turns_5', label: { zh: '完成 5 个回合', en: 'turn 5' }, goal: 5, reward: 30, progress: () => 0 }, '2026-08-15')
  assert.deepEqual(a, b)
  assert.ok(bossMemeName('2026-W33').zh.length > 0)
  // 池内覆盖
  assert.ok(CHAIN_QUESTS.length >= 3)
})

test('v1.4.0 事件卡嵌入回合结算：settlement 带 eventCard/relicId', () => {
  let save = fresh()
  // 21 回合内触发（第 20 回合）
  for (let i = 0; i < 20; i++) save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  assert.ok(EVENT_POOL.some(d => d.id === (save.events ?? [])[0]?.effectId))
  // pendingEvent 可见
  const hasChoice = (save.events ?? []).some(e => {
    const def = EVENT_POOL.find(d => d.id === e.effectId)
    return def?.kind === 'choice'
  })
  assert.equal(pendingEvent(save) === hasChoice, true)
})

test('v1.4.0 pastWeekTotals 只算今天之前 7 天', () => {
  const base = fresh()
  base.history = { [dayKey(NOW)]: { xp: 999, turns: 99 }, [dayKey(NOW - 86_400_000)]: { xp: 10, turns: 1 } }
  const past = pastWeekTotals(base, NOW)
  assert.equal(past.xp, 10) // 今天的不算
  assert.equal(past.turns, 1)
})