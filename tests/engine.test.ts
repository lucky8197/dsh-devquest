/**
 * DevQuest 引擎纯函数单测（node --test，零依赖）。
 * 运行：npm test（node --test 'tests/*.test.ts'）
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { ACHIEVEMENTS, achievementById } from '../src/achievements.ts'
import {
  addXp, applyTurn, checkAchievements, dayKey, freshSave, migrateSave, titleFor, xpToNext,
} from '../src/engine.ts'
import type { Action, SaveData } from '../src/types.ts'

/** 固定时间：2026-08-15 12:00:00（本地时区）附近。 */
const NOW = new Date(2026, 7, 15, 12, 0, 0).getTime()

function fresh(): SaveData {
  return freshSave('C:/proj', '2026-S1', NOW)
}

function turn(actions: Action[], now = NOW): SaveData {
  return applyTurn(fresh(), actions, now)
}

test('xpToNext 等级曲线（round(100 × level^1.5)）', () => {
  assert.equal(xpToNext(1), 100)
  assert.equal(xpToNext(2), 283)
  assert.equal(xpToNext(3), 520)
  assert.equal(xpToNext(4), 800)
  assert.equal(xpToNext(10), 3162)
})

test('称号分档', () => {
  assert.deepEqual(titleFor(1), { zh: '学徒', en: 'Apprentice' })
  assert.deepEqual(titleFor(5), { zh: '工匠', en: 'Artisan' })
  assert.deepEqual(titleFor(10), { zh: '锻造师', en: 'Forger' })
  assert.deepEqual(titleFor(15), { zh: '宗师', en: 'Master' })
  assert.deepEqual(titleFor(20), { zh: '传说', en: 'Legend' })
})

test('completed 回合 +10 XP', () => {
  const next = turn([{ kind: 'turn-completed', turn: 1 }])
  assert.equal(next.player.xp, 10)
  assert.equal(next.counters.turnsCompleted, 1)
  assert.equal(next.counters.consecutiveSuccess, 1)
})

test('error 回合 +2 XP 且清零连击', () => {
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW)
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 2 }], NOW)
  assert.equal(save.player.xp, 12)
  assert.equal(save.counters.turnsFailed, 1)
  assert.equal(save.counters.consecutiveSuccess, 0)
})

test('aborted 回合不奖励不惩罚', () => {
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW)
  save = applyTurn(save, [{ kind: 'turn-aborted', turn: 2 }], NOW)
  assert.equal(save.player.xp, 10)
  assert.equal(save.counters.consecutiveSuccess, 1)
})

test('工具 XP：锻造师工具 +2，普通 +1', () => {
  const next = turn([
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'tool-call', tool: 'grep' },
    { kind: 'turn-completed', turn: 1 },
  ])
  assert.equal(next.player.xp, 10 + 2 + 1)
  assert.equal(next.counters.toolCalls, 2)
  assert.equal(next.counters.toolCallsByTool.edit, 1)
})

test('工具 XP 单回合封顶 +10', () => {
  const actions: Action[] = []
  for (let i = 0; i < 10; i++) actions.push({ kind: 'tool-call', tool: 'edit' })
  actions.push({ kind: 'turn-completed', turn: 1 })
  const next = turn(actions)
  assert.equal(next.player.xp, 10 + 10) // turn 10 + 工具封顶 10
  assert.equal(next.counters.toolCalls, 10)
})

test('todo completed +15/个，clean_sweep 计数', () => {
  const next = turn([
    { kind: 'todo-completed', count: 2, allCompleted: true },
    { kind: 'turn-completed', turn: 1 },
  ])
  assert.equal(next.player.xp, 10 + 30)
  assert.equal(next.counters.todosCompleted, 2)
  assert.equal(next.counters.cleanSweeps, 1)
})

test('tokens XP：每 10k 输出 +1', () => {
  const next = turn([
    { kind: 'tokens', tokens: 25_000 },
    { kind: 'turn-completed', turn: 1 },
  ])
  assert.equal(next.player.xp, 10 + 2)
  assert.equal(next.counters.tokensOut, 25_000)
})

test('连击：连续 5 个 completed 后 ×1.5', () => {
  let save = fresh()
  for (let i = 0; i < 5; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  }
  assert.equal(save.counters.consecutiveSuccess, 5)
  assert.equal(save.counters.turnsCompleted, 5)
  // 前 4 轮各 +10 = 40；第 5 轮 10×1.5 = 15 → 55
  assert.equal(save.player.xp, 55)
})

test('升级：跨过等级阈值', () => {
  let save = fresh()
  // 前 4 轮各 +10 = 40；第 5 轮起连击 ×1.5，6 轮各 +15 = 90 → 130 XP。
  for (let i = 0; i < 10; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  }
  // L1→2 需 100：130 - 100 = 30 结余
  assert.equal(save.player.level, 2)
  assert.equal(save.player.xp, 30)
  assert.equal(save.player.xpTotal, 130)
  assert.equal(save.player.title, '学徒') // level 2 < 5
  // 第 11 个回合连击延续 +15：L2 需 283，不升级
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 11 }], NOW + 100)
  assert.equal(save.player.level, 2)
  assert.equal(save.player.xp, 45)
  assert.equal(save.player.xpTotal, 145)
})

test('addXp 活跃日统计与连击天数', () => {
  const day1 = new Date(2026, 7, 15, 9, 0, 0).getTime()
  const day2 = new Date(2026, 7, 16, 9, 0, 0).getTime()
  const day4 = new Date(2026, 7, 18, 9, 0, 0).getTime()
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], day1)
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 2 }], day2)
  assert.equal(save.counters.activeDays, 2)
  assert.equal(save.counters.streakDays, 2)
  // 跳一天（8-17 缺席）：连击重置为 1
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 3 }], day4)
  assert.equal(save.counters.activeDays, 3)
  assert.equal(save.counters.streakDays, 1)
})

test('成就一次性：首次解锁，重复判定为空', () => {
  let save = fresh()
  save.counters.turnsCompleted = 10
  const first = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(first.includes('turns_10'))
  assert.ok(!first.includes('turns_50'))
  const again = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.deepEqual(again, [])
  assert.ok(save.achievements.turns_10 !== undefined)
  assert.equal(save.achievements.turns_10?.xp, 100)
})

test('成就判定：first_turn / steel_will / comeback', () => {
  const started = applyTurn(fresh(), [{ kind: 'turn-completed', turn: 1 }], NOW)
  const first = checkAchievements(ACHIEVEMENTS, started, NOW)
  assert.ok(first.includes('first_turn'))

  let save = fresh()
  save.counters.consecutiveSuccess = 25
  const steel = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(steel.includes('steel_will'))

  let comebackSave = fresh()
  comebackSave.counters.turnsFailed = 1
  const before = checkAchievements(ACHIEVEMENTS, comebackSave, NOW)
  assert.ok(!before.includes('comeback')) // 只有失败没有完成
  comebackSave.counters.turnsCompleted = 1
  const after = checkAchievements(ACHIEVEMENTS, comebackSave, NOW)
  assert.ok(after.includes('comeback'))
})

test('成就判定：等级与 tokens', () => {
  let save = fresh()
  save.player.level = 10
  save.counters.tokensOut = 100_000
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('level_5'))
  assert.ok(unlocked.includes('level_10'))
  assert.ok(unlocked.includes('season_100k'))
  assert.ok(!unlocked.includes('level_20'))
})

test('成就判定：devil_hour（凌晨 4:44）', () => {
  const at = new Date(2026, 7, 15, 4, 44, 0).getTime()
  const actions: Action[] = [{ kind: 'turn-completed', turn: 1 }]
  const save = applyTurn(fresh(), actions, at)
  const unlocked = checkAchievements(ACHIEVEMENTS, save, at)
  assert.ok(unlocked.includes('devil_hour'))
  // 非 4:44 不解锁
  const other = applyTurn(fresh(), actions, new Date(2026, 7, 15, 12, 0, 0).getTime())
  assert.ok(!checkAchievements(ACHIEVEMENTS, other, new Date(2026, 7, 15, 12, 0, 0).getTime()).includes('devil_hour'))
})

test('成就判定：night_owl / early_bird 按时段', () => {
  const nightAt = new Date(2026, 7, 15, 3, 0, 0).getTime()
  const night = applyTurn(fresh(), [{ kind: 'turn-completed', turn: 1 }], nightAt)
  assert.ok(checkAchievements(ACHIEVEMENTS, night, nightAt).includes('night_owl'))

  const dawnAt = new Date(2026, 7, 15, 6, 30, 0).getTime()
  const dawn = applyTurn(fresh(), [{ kind: 'turn-completed', turn: 1 }], dawnAt)
  const unlocked = checkAchievements(ACHIEVEMENTS, dawn, dawnAt)
  assert.ok(unlocked.includes('early_bird'))
  assert.ok(!unlocked.includes('night_owl'))
})

test('成就判定：oops（失败后 1 分钟内同工具成功）', () => {
  const t0 = new Date(2026, 7, 15, 12, 0, 0).getTime()
  let save = fresh()
  // 回合 1：edit 失败
  save = applyTurn(save, [
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'tool-failed', tool: 'edit' },
    { kind: 'turn-completed', turn: 1 },
  ], t0)
  assert.ok(!checkAchievements(ACHIEVEMENTS, save, t0).includes('oops')) // 失败后无成功
  // 回合 2：edit 成功（30 秒后）
  save = applyTurn(save, [
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'turn-completed', turn: 2 },
  ], t0 + 30_000)
  assert.ok(checkAchievements(ACHIEVEMENTS, save, t0 + 30_000).includes('oops'))
  // 超过 1 分钟不触发
  let late = fresh()
  late = applyTurn(late, [
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'tool-failed', tool: 'edit' },
    { kind: 'turn-completed', turn: 1 },
  ], t0)
  late = applyTurn(late, [
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'turn-completed', turn: 2 },
  ], t0 + 120_000)
  assert.ok(!checkAchievements(ACHIEVEMENTS, late, t0 + 120_000).includes('oops'))
})

test('成就判定：self_aware 与子代理', () => {
  let save = fresh()
  save = applyTurn(save, [
    { kind: 'tool-call', tool: 'devquest_status' },
    { kind: 'subagent', depth: 1 },
    { kind: 'turn-completed', turn: 1 },
  ], NOW)
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('self_aware'))
  assert.ok(unlocked.includes('first_subagent'))
})

test('隐藏成就：未解锁前 hidden 标记存在', () => {
  const def = achievementById('tool_666')
  assert.ok(def !== undefined)
  assert.equal(def?.hidden, true)
  assert.equal(def?.xp, 666)
})

test('applyTurn 纯函数：不改动原存档', () => {
  const save = fresh()
  const snapshot = JSON.stringify(save)
  applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW)
  assert.equal(JSON.stringify(save), snapshot)
})

test('migrateSave：缺失字段补全', () => {
  const raw = { version: 1, cwd: 'C:/x', player: { level: 3, xp: 5, xpTotal: 305 } }
  const save = migrateSave(raw as never, 'C:/x', '2026-S1')
  assert.equal(save.player.level, 3)
  assert.equal(save.player.title, '学徒')
  assert.equal(save.counters.turnsCompleted, 0)
  assert.deepEqual(save.achievements, {})
  assert.deepEqual(save.lastSeqBySession, {})
})

test('dayKey 格式', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59, 0).getTime()), '2026-01-05')
})
