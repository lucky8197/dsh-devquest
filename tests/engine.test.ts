/**
 * DevQuest 引擎纯函数单测（node --test，零依赖）。
 * 运行：npm test（node --test 'tests/*.test.ts'）
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { ACHIEVEMENTS, achievementById, ACHIEVEMENT_RARITY, rarityOf } from '../src/achievements.ts'
import {
  activateTheme, addXp, applyDaily, applyTurn, applyTurnDetailed, applyWeekly, autoSeasonId, buildRecordsView, buyShopItem, checkAchievements, checkCollections, checkTitles,
  checkTutorial, claimDailyChest, claimLucky, claimWeeklyBonus, DAILY_CHEST_REWARD, DAILY_QUEST_POOL, dailyQuestsDone, dayKey, ensureDaily, ensureWeekly,
  freshSave, freshShop, HISTORY_KEEP, mergeSaves, migrateSave, nextTitle, refreshDailyProgress, refreshWeeklyProgress, rollDailyQuests, rollWeeklyQuests, SETTLEMENT_KEEP, setActiveTitle, SHOP_ITEMS,
  shopBalance, titleFor, TITLE_POOL, trimHistory, trimRecords, TUTORIAL_STEPS, updateRecords, useReroll, weekKey, WEEKLY_BONUS_XP, WEEKLY_QUEST_POOL, xpToLevel, xpToNext,
} from '../src/engine.ts'
import type { Action, SaveData } from '../src/types.ts'

/** 固定时间：2026-08-15 12:00:00（本地时区）附近。 */
const NOW = new Date(2026, 7, 15, 12, 0, 0).getTime()

function fresh(): SaveData {
  const s = freshSave('C:/proj', undefined, NOW)
  // 屏蔽每日任务（空任务列表），保证纯 XP 断言精确；每日任务单独测。
  s.daily = { date: dayKey(NOW), quests: [] }
  return s
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
  save.counters.seasonTokensOut = 100_000
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
  const save = migrateSave(raw as never, 'C:/x', undefined)
  assert.equal(save.player.level, 3)
  assert.equal(save.player.title, '学徒')
  assert.equal(save.counters.turnsCompleted, 0)
  assert.deepEqual(save.achievements, {})
  assert.deepEqual(save.lastSeqBySession, {})
  assert.equal(save.daily.quests.length, 3) // 旧档迁移后补上当日任务
})

test('dayKey 格式', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59, 0).getTime()), '2026-01-05')
})

// ---------------------------------------------------------------------------
// 每日任务
// ---------------------------------------------------------------------------

test('rollDailyQuests：同一天结果确定、3 个且不重复', () => {
  const a = rollDailyQuests(NOW)
  const b = rollDailyQuests(NOW)
  assert.deepEqual(a, b) // 确定性
  assert.equal(a.date, dayKey(NOW))
  assert.equal(a.quests.length, 3)
  const ids = new Set(a.quests.map(q => q.id))
  assert.equal(ids.size, 3) // 不重复
  for (const q of a.quests) {
    assert.ok(q.goal > 0 && q.reward > 0)
    assert.equal(q.progress, 0)
    assert.equal(q.done, false)
  }
  // 不同日期任务序列不同（概率极高）
  const c = rollDailyQuests(new Date(2026, 7, 16, 12, 0, 0).getTime())
  assert.notEqual(c.date, a.date)
})

test('每日任务：进度推进、完成自动结算且只结算一次', () => {
  let save = fresh()
  // 手工指定任务：完成 5 个回合
  save.daily = {
    date: dayKey(NOW),
    quests: [{ id: 'dq_turns_5', label: { zh: 't', en: 't' }, goal: 5, reward: 30, progress: 0, done: false }],
  }
  // 前 4 回合：任务未完成
  for (let i = 0; i < 4; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW)
    assert.equal(save.daily.quests[0]?.done, false)
    assert.equal(save.daily.quests[0]?.progress, i + 1)
  }
  // 第 5 回合：任务完成，+30 XP 奖励，dailyQuestsDone +1
  const beforeTotal = save.player.xpTotal
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 5 }], NOW)
  assert.equal(save.daily.quests[0]?.done, true)
  assert.equal(save.counters.dailyQuestsDone, 1)
  // 30 XP 任务奖励 + 回合 XP（第 5 回合连击 ×1.5 = 15）
  assert.equal(save.player.xpTotal, beforeTotal + 30 + 15)
  // 再结算不重复奖励
  const before2Total = save.player.xpTotal
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 6 }], NOW)
  assert.equal(save.player.xpTotal, before2Total + 15) // 只有回合 XP，无任务奖励
  assert.equal(save.counters.dailyQuestsDone, 1)
})

test('每日任务：跨天自动重滚', () => {
  let save = fresh()
  const tomorrow = new Date(2026, 7, 16, 9, 0, 0).getTime()
  assert.equal(save.daily.date, dayKey(NOW))
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], tomorrow)
  assert.equal(save.daily.date, dayKey(tomorrow))
  assert.equal(save.daily.quests.length, 3)
})

test('applyDaily 幂等：不重复发放已完成任务的奖励', () => {
  let save = fresh()
  save.daily = {
    date: dayKey(NOW),
    quests: [{ id: 'dq_turns_5', label: { zh: 't', en: 't' }, goal: 5, reward: 30, progress: 5, done: false }],
  }
  save.counters.turnsCompleted = 5
  assert.equal(applyDaily(save, NOW), 30)
  assert.equal(applyDaily(save, NOW), 0) // done 后不再奖励
  assert.equal(save.counters.dailyQuestsDone, 1)
})

test('refreshDailyProgress：进度即时同步（不发奖），后续结算仍发奖', () => {
  // 场景：计数器已达标但任务还没结算（如手动改存档 / 子代理计数补齐后）
  let save = fresh()
  save.daily = {
    date: dayKey(NOW),
    quests: [{ id: 'dq_subagent_1', label: { zh: 't', en: 't' }, goal: 1, reward: 60, progress: 0, done: false }],
  }
  save.counters.subagentsSpawned = 1
  // 同步视图：progress/done 立即反映计数器
  refreshDailyProgress(save, NOW)
  assert.equal(save.daily.quests[0]!.progress, 1)
  assert.equal(save.daily.quests[0]!.done, true)
  // 但还没发奖（claimedAt 未设、计数未增）
  assert.equal(save.daily.quests[0]!.claimedAt, undefined)
  assert.equal(save.counters.dailyQuestsDone, 0)
  // 下次回合结算：奖励补发，不因 done 已置 true 而跳过
  const gain = applyDaily(save, NOW)
  assert.equal(gain, 60)
  assert.equal(save.counters.dailyQuestsDone, 1)
})

test('ensureDaily：同天不重抽', () => {
  let save = fresh()
  const first = ensureDaily(save, NOW)
  assert.equal(ensureDaily(save, NOW), first) // 同一对象引用
})

// ---------------------------------------------------------------------------
// 连击多档加成
// ---------------------------------------------------------------------------

test('连击：15 连击 ×2.0', () => {
  let save = fresh()
  for (let i = 0; i < 15; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  }
  // 前 4 轮 +10 = 40；5-14 轮 ×1.5 = 150；第 15 轮 ×2.0 = 20 → 累计 210
  assert.equal(save.counters.consecutiveSuccess, 15)
  assert.equal(save.player.xpTotal, 210)
})

test('连击：30 连击 ×2.5', () => {
  let save = fresh()
  for (let i = 0; i < 30; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  }
  // 40 + 150(5-14 ×1.5) + 300(15-29 ×2.0) + 25(30 ×2.5) = 累计 515
  assert.equal(save.counters.consecutiveSuccess, 30)
  assert.equal(save.player.xpTotal, 515)
})

test('连击：error 清零后加成档位回落', () => {
  let save = fresh()
  for (let i = 0; i < 15; i++) {
    save = applyTurn(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
  }
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 16 }], NOW + 100)
  assert.equal(save.counters.consecutiveSuccess, 0)
  const beforeTotal = save.player.xpTotal
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 17 }], NOW + 200)
  assert.equal(save.player.xpTotal, beforeTotal + 10) // 连击重置后回到 ×1
})

// ---------------------------------------------------------------------------
// 新成就
// ---------------------------------------------------------------------------

test('成就判定：daily_quest_10 与 level_15', () => {
  let save = fresh()
  save.counters.dailyQuestsDone = 10
  save.player.level = 15
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('daily_quest_10'))
  assert.ok(unlocked.includes('level_15'))
  assert.ok(unlocked.includes('level_5'))
  assert.ok(unlocked.includes('level_10'))
  assert.ok(!unlocked.includes('level_20'))
})

test('成就总数：47 枚（含 9 枚隐藏）', () => {
  assert.equal(ACHIEVEMENTS.length, 47)
  assert.equal(ACHIEVEMENTS.filter(a => a.hidden === true).length, 9)
})

test('每日任务池：21 种类型', () => {
  const ids = new Set(DAILY_QUEST_POOL.map(q => q.id))
  assert.equal(DAILY_QUEST_POOL.length, 21)
  assert.equal(ids.size, 21) // 无重复
})

// ---------------------------------------------------------------------------
// 新计数器与成就
// ---------------------------------------------------------------------------

test('comebacks：失误后重新完成计数', () => {
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 1 }], NOW)
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 2 }], NOW + 1)
  assert.equal(save.counters.comebacks, 1)
  save.counters.comebacks = 10
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('comeback_10'))
})

test('nightTurns：凌晨回合计数与成就', () => {
  const nightAt = new Date(2026, 7, 15, 3, 0, 0).getTime()
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], nightAt)
  assert.equal(save.counters.nightTurns, 1)
  save.counters.nightTurns = 10
  const unlocked = checkAchievements(ACHIEVEMENTS, save, nightAt)
  assert.ok(unlocked.includes('night_owl_10'))
})

test('maxTokensTurn：单回合最大输出与沉思者', () => {
  let save = fresh()
  save = applyTurn(save, [
    { kind: 'tokens', tokens: 120_000 },
    { kind: 'turn-completed', turn: 1 },
  ], NOW)
  assert.equal(save.counters.maxTokensTurn, 120_000)
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('thinker'))
})

test('todayTools：今日工具去重与百变大咖', () => {
  let save = fresh()
  const tools = ['read', 'write', 'edit', 'grep', 'pwsh', 'memory', 'dtodo', 'job_output', 'todo_write', 'ssh_exec', 'devquest_status']
  const actions = tools.map(tool => ({ kind: 'tool-call' as const, tool }))
  actions.push({ kind: 'turn-completed', turn: 1 })
  save = applyTurn(save, actions, NOW)
  assert.equal(save.counters.todayTools.length, tools.length)
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('jack_of_all'))
})

test('新成就：数量里程碑与等级', () => {
  let save = fresh()
  save.counters.turnsCompleted = 250
  save.counters.toolCalls = 250
  save.counters.craftTools = 500
  save.counters.todosCompleted = 100
  save.counters.subagentsSpawned = 10
  save.counters.dailyQuestsDone = 30
  save.counters.streakDays = 30
  save.counters.toolCallsByTool.pwsh = 100
  save.player.level = 30
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('turns_25'))
  assert.ok(unlocked.includes('turns_250'))
  assert.ok(unlocked.includes('tools_250'))
  assert.ok(unlocked.includes('edits_500'))
  assert.ok(unlocked.includes('cmd_100'))
  assert.ok(unlocked.includes('todos_100'))
  assert.ok(unlocked.includes('subagents_10'))
  assert.ok(unlocked.includes('daily_quest_30'))
  assert.ok(unlocked.includes('streak_30'))
  assert.ok(unlocked.includes('level_25'))
  assert.ok(unlocked.includes('level_30'))
})

test('新每日任务：comeback / night / distinct 进度推进', () => {
  let save = fresh()
  // 手工指定 3 个新任务
  save.daily = {
    date: dayKey(NOW),
    quests: [
      { id: 'dq_comeback_1', label: { zh: 't', en: 't' }, goal: 1, reward: 80, progress: 0, done: false },
      { id: 'dq_night_1', label: { zh: 't', en: 't' }, goal: 1, reward: 90, progress: 0, done: false },
      { id: 'dq_distinct_8', label: { zh: 't', en: 't' }, goal: 8, reward: 100, progress: 0, done: false },
    ],
  }
  // 失败后凌晨完成一个回合，用 8 种不同工具
  const nightAt = new Date(2026, 7, 15, 3, 0, 0).getTime()
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 1 }], nightAt)
  const tools = ['read', 'write', 'edit', 'grep', 'pwsh', 'memory', 'dtodo', 'job_output']
  const actions = tools.map(tool => ({ kind: 'tool-call' as const, tool }))
  actions.push({ kind: 'turn-completed', turn: 2 })
  const before = save.player.xpTotal
  save = applyTurn(save, actions, nightAt + 1)
  // 三个任务全部完成：80 + 90 + 100
  assert.equal(save.daily.quests[0]?.done, true)
  assert.equal(save.daily.quests[1]?.done, true)
  assert.equal(save.daily.quests[2]?.done, true)
  // 任务奖励 270 + 工具 XP 10（封顶）+ 回合 10（连击 1，无加成）
  assert.equal(save.player.xpTotal, before + 270 + 20)
  assert.equal(save.counters.dailyQuestsDone, 3)
})

// ---------------------------------------------------------------------------
// 赛季系统
// ---------------------------------------------------------------------------

test('autoSeasonId：按季度推导赛季', () => {
  const at = (y: number, m: number, d = 15) => new Date(y, m - 1, d, 12, 0, 0).getTime()
  assert.equal(autoSeasonId(at(2026, 1)), '2026-S1')
  assert.equal(autoSeasonId(at(2026, 3)), '2026-S1')
  assert.equal(autoSeasonId(at(2026, 4)), '2026-S2')
  assert.equal(autoSeasonId(at(2026, 7)), '2026-S3')
  assert.equal(autoSeasonId(at(2026, 8)), '2026-S3')
  assert.equal(autoSeasonId(at(2026, 10)), '2026-S4')
  assert.equal(autoSeasonId(at(2026, 12)), '2026-S4')
  assert.equal(autoSeasonId(at(2027, 1)), '2027-S1') // 跨年
})

test('赛季换季：跨季度自动开启新赛季，赛季 XP/tokens 清零重计', () => {
  const q1 = new Date(2026, 0, 15, 12, 0, 0).getTime() // 2026-S1
  const q3 = new Date(2026, 7, 15, 12, 0, 0).getTime() // 2026-S3
  let save = freshSave('C:/proj', undefined, q1)
  // 屏蔽每日任务：避免 tokens 任务干扰赛季 XP 断言（每日任务单独测）。
  save.daily = { date: dayKey(q1), quests: [] }
  // Q1 内两个回合：赛季 XP 累计
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], q1)
  save = applyTurn(save, [
    { kind: 'tokens', tokens: 60_000 },
    { kind: 'turn-completed', turn: 2 },
  ], q1 + 1000)
  assert.equal(save.player.season, '2026-S1')
  // 纯引擎 applyTurn 不含新手链（host 层才调用），10 + (10+6) = 26
  assert.equal(save.player.seasonXp, 26)
  assert.equal(save.counters.seasonTokensOut, 60_000)
  const xpTotalBefore = save.player.xpTotal
  // 跨季度：Q3 首次活跃 → 换季（先屏蔽每日任务，避免累计 tokens 秒完成任务干扰断言）
  save.daily = { date: dayKey(q3), quests: [] }
  save = applyTurn(save, [
    { kind: 'tokens', tokens: 10_000 },
    { kind: 'turn-completed', turn: 3 },
  ], q3)
  assert.equal(save.player.season, '2026-S3')
  assert.equal(save.player.seasonXp, 10 + 1) // 新赛季从 0 开始：回合 10 + tokens 1
  assert.equal(save.counters.seasonTokensOut, 10_000)
  assert.equal(save.player.xpTotal, xpTotalBefore + 11) // 累计 XP 保留并继续增长
})

test('season_100k：按本赛季 tokens 判定', () => {
  let save = fresh()
  save.counters.seasonTokensOut = 100_000
  save.counters.tokensOut = 50_000 // 累计不足不算
  const unlocked = checkAchievements(ACHIEVEMENTS, save, NOW)
  assert.ok(unlocked.includes('season_100k'))
  // 只有累计足够、本赛季不足时不触发
  let save2 = fresh()
  save2.counters.seasonTokensOut = 50_000
  save2.counters.tokensOut = 500_000
  assert.ok(!checkAchievements(ACHIEVEMENTS, save2, NOW).includes('season_100k'))
})

test('seasonOverride：固定赛季不换季', () => {
  const q1 = new Date(2026, 0, 15, 12, 0, 0).getTime()
  const q3 = new Date(2026, 7, 15, 12, 0, 0).getTime()
  let save = freshSave('C:/proj', 'CUSTOM-S1', q1)
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], q3, 'CUSTOM-S1')
  assert.equal(save.player.season, 'CUSTOM-S1') // 固定赛季不随日期换季
  assert.equal(save.player.seasonXp, 10)
})

// ---------------------------------------------------------------------------
// 全局存档合并（v0.3：跨会话/跨项目）
// ---------------------------------------------------------------------------

test('mergeSaves：累计求和、等级重算、成就/水位并集', () => {
  const t1 = new Date(2026, 6, 20, 10, 0, 0).getTime()
  const t2 = new Date(2026, 6, 21, 10, 0, 0).getTime()
  // 存档 A：3 回合 30 XP，解锁 first_turn
  let a = freshSave('C:/projA', undefined, t1)
  a = applyTurn(a, [{ kind: 'turn-completed', turn: 1 }], t1)
  a = applyTurn(a, [{ kind: 'turn-completed', turn: 2 }], t1 + 1000)
  a = applyTurn(a, [{ kind: 'turn-completed', turn: 3 }], t1 + 2000)
  a.achievements = { first_turn: { acquiredAt: t1, xp: 50 } }
  a.lastSeqBySession = { 'sess-a': 100 }
  // 存档 B：2 回合 20 XP，解锁 first_edit，活跃日更晚
  let b = freshSave('C:/projB', undefined, t2)
  b = applyTurn(b, [{ kind: 'turn-completed', turn: 1 }], t2)
  b = applyTurn(b, [{ kind: 'turn-completed', turn: 2 }], t2 + 1000)
  b.achievements = { first_edit: { acquiredAt: t2, xp: 50 } }
  b.lastSeqBySession = { 'sess-b': 50 }

  const merged = mergeSaves([a, b], t2)
  assert.equal(merged.cwd, 'global')
  // 累计：5 回合，xpTotal = 30 + 20 = 50
  assert.equal(merged.counters.turnsCompleted, 5)
  assert.equal(merged.player.xpTotal, 50)
  // 等级从累计重算：L1 需 100 → 仍 1 级，xp 50
  assert.equal(merged.player.level, 1)
  assert.equal(merged.player.xp, 50)
  // 成就并集
  assert.ok(merged.achievements.first_turn !== undefined)
  assert.ok(merged.achievements.first_edit !== undefined)
  // 水位并集（各会话最大 seq）
  assert.equal(merged.lastSeqBySession['sess-a'], 100)
  assert.equal(merged.lastSeqBySession['sess-b'], 50)
  // 状态字段取最新存档（活跃日）
  assert.equal(merged.counters.lastActiveDay, b.counters.lastActiveDay)
})

test('mergeSaves：等级升级重算', () => {
  let a = freshSave('C:/projA', undefined, NOW)
  a.player.xpTotal = 400 // 400 XP：L1(100)+L2(283) = 383 → 升到 3 级剩 17
  let b = freshSave('C:/projB', undefined, NOW)
  b.player.xpTotal = 100
  const merged = mergeSaves([a, b], NOW)
  assert.equal(merged.player.xpTotal, 500)
  assert.equal(merged.player.level, 3) // 100+283+520>500，L3 需 520 不够
  assert.equal(merged.player.xp, 500 - 100 - 283)
  assert.equal(merged.player.title, '学徒') // level 3 < 5
})

// ---------------------------------------------------------------------------
// P0：回合结算明细 / 成就进度 / 每日全清宝箱
// ---------------------------------------------------------------------------

test('applyTurnDetailed：返回结算明细（XP/连击/每日任务/升级）', () => {
  // 完成 1 回合：+10 XP；连击 1 无加成
  const r1 = applyTurnDetailed(fresh(), [{ kind: 'turn-completed', turn: 1 }], NOW)
  assert.equal(r1.settlement.xp, 10)
  assert.equal(r1.settlement.combo, null)
  assert.equal(r1.settlement.questXp, 0)
  assert.equal(r1.settlement.leveledUp, false)
  assert.equal(r1.settlement.levelBefore, 1)
  assert.equal(r1.settlement.levelAfter, 1)
  assert.equal(r1.settlement.turnsDone, 1)
  assert.equal(r1.save.player.xp, 10)

  // 失败回合：+2 XP，combo null，turnsDone 1
  const r2 = applyTurnDetailed(fresh(), [{ kind: 'turn-failed', turn: 1 }], NOW)
  assert.equal(r2.settlement.xp, 2)
  assert.equal(r2.settlement.turnsDone, 1)

  // 升级：+300 XP 从 L1 → L2（100）+ 部分 L3
  const r3 = applyTurnDetailed(fresh(), [
    { kind: 'turn-completed', turn: 1 },
    { kind: 'todo-completed', count: 20 },
    { kind: 'tokens', tokens: 100_000 },
  ], NOW)
  assert.equal(r3.settlement.leveledUp, true)
  assert.equal(r3.settlement.levelBefore, 1)
  assert.equal(r3.settlement.levelAfter, 2)
  assert.equal(r3.save.player.level, 2)
})

test('applyTurnDetailed：连击倍率计入结算明细', () => {
  // 连续 5 回合（turns 1-5）→ 第 5 回合 combo ×1.5
  let save = fresh()
  let last: { combo: number | null } | undefined
  for (let i = 0; i < 5; i++) {
    const r = applyTurnDetailed(save, [{ kind: 'turn-completed', turn: i + 1 }], NOW + i)
    save = r.save
    last = r.settlement
  }
  assert.equal(last?.combo, 1.5)
  assert.equal(save.counters.consecutiveSuccess, 5)
})

test('claimDailyChest：3 任务全完成才可领取一次 +50 XP', () => {
  // 构造当日 3 个任务全 done 的存档
  let save = fresh()
  const daily = rollDailyQuests(NOW)
  for (const q of daily.quests) { q.done = true }
  save.daily = daily
  assert.equal(dailyQuestsDone(save.daily), true)

  const r1 = claimDailyChest(save, NOW)
  assert.equal(r1.ok, true)
  assert.equal(r1.gained, DAILY_CHEST_REWARD)
  assert.equal(r1.save.player.xp, DAILY_CHEST_REWARD)
  assert.equal(r1.save.daily.chestClaimed, true)

  // 重复领取：拒绝
  const r2 = claimDailyChest(r1.save, NOW)
  assert.equal(r2.ok, false)
  assert.equal(r2.gained, 0)
  assert.equal(r2.save.player.xp, DAILY_CHEST_REWARD) // 不变
})

test('claimDailyChest：任务未完成时不可领取', () => {
  const save = fresh() // fresh() 里 daily.quests = []
  const r = claimDailyChest(save, NOW)
  assert.equal(r.ok, false)
  assert.equal(r.gained, 0)
})

test('每日任务跨天：宝箱状态随新一天重置', () => {
  let save = fresh()
  const tomorrow = NOW + 86_400_000
  const daily = rollDailyQuests(NOW)
  for (const q of daily.quests) { q.done = true }
  save.daily = daily
  const r = claimDailyChest(save, NOW)
  assert.equal(r.ok, true)
  // 下一天 ensureDaily 重滚 → chestClaimed 重置为 false
  const nextDay = ensureDaily(r.save, tomorrow)
  assert.equal(nextDay.date, dayKey(tomorrow))
  assert.equal(nextDay.chestClaimed, false)
})

test('成就进度：可量化成就带 current/goal，纯条件成就没有', () => {
  const s = fresh()
  s.counters.turnsCompleted = 35
  s.counters.toolCalls = 666
  const turns50 = achievementById('turns_50')
  assert.ok(turns50 !== undefined)
  assert.deepEqual(turns50.progress?.(s), { current: 35, goal: 50 })
  const steel = achievementById('steel_will')
  assert.ok(steel !== undefined)
  assert.deepEqual(steel.progress?.(s), { current: 0, goal: 25 })
  // 纯条件成就（comeback）无 progress
  const comeback = achievementById('comeback')
  assert.ok(comeback !== undefined)
  assert.equal(comeback.progress, undefined)
  // 进度封顶：current 不超 goal
  const tool666 = achievementById('tool_666')
  assert.ok(tool666 !== undefined)
  assert.deepEqual(tool666.progress?.(s), { current: 666, goal: 666 })
})

test('成就进度：封顶到 goal（turns 超量只显示 goal）', () => {
  const s = fresh()
  s.counters.turnsCompleted = 120
  const turns100 = achievementById('turns_100')
  assert.ok(turns100 !== undefined)
  assert.deepEqual(turns100.progress?.(s), { current: 100, goal: 100 })
})

test('settlements：存档保留最近 SETTLEMENT_KEEP 条且跨存档合并去重', () => {
  const a = fresh()
  a.settlements = Array.from({ length: SETTLEMENT_KEEP + 5 }, (_, i) => ({
    id: `ev-a-${i}`, at: NOW + i, xp: 10 + i, combo: null, questXp: 0,
    levelBefore: 1, levelAfter: 1, leveledUp: false, turnsDone: 1,
  }))
  const b = fresh()
  b.settlements = [{ id: 'ev-b-0', at: NOW + 1000, xp: 99, combo: 1.5, questXp: 30, levelBefore: 1, levelAfter: 2, leveledUp: true, turnsDone: 1 }]
  const merged = mergeSaves([a, b], NOW + 2000)
  // 去重合并后截断到最近 SETTLEMENT_KEEP 条，按时间倒序，最新在前
  assert.equal(merged.settlements!.length, SETTLEMENT_KEEP)
  assert.equal(merged.settlements![0]!.id, 'ev-b-0') // 最新在前
  assert.equal(merged.settlements![0]!.xp, 99)
  const ids = new Set(merged.settlements!.map(e => e.id))
  assert.equal(ids.size, merged.settlements!.length)
})

// ---------------------------------------------------------------------------
// P1/P2：商店 / 连击保险 / 重掷 / 新手链 / 历史 / 等级起点
// ---------------------------------------------------------------------------

test('商店：余额 = seasonXp - spent，购买扣款并加库存', () => {
  let save = fresh()
  save.player.seasonXp = 500
  save.shop = freshShop()
  assert.equal(shopBalance(save), 500)

  // 买连击保险（150）
  const r1 = buyShopItem(save, 'shield-1', NOW)
  assert.equal(r1.ok, true)
  assert.equal(r1.save.shop!.shields, 1)
  assert.equal(r1.save.shop!.spent, 150)
  assert.equal(shopBalance(r1.save), 350)

  // 余额不足：买 3 连击保险（400）不够 350
  const r2 = buyShopItem(r1.save, 'shield-3', NOW)
  assert.equal(r2.ok, false)
  assert.equal(r2.reason, 'insufficient-balance')

  // 主题：买一次后重复买 → already-owned（按已购列表判断，不依赖当前激活）
  save.player.seasonXp = 1000
  const r3 = buyShopItem(save, 'theme-ember', NOW)
  assert.equal(r3.ok, true)
  assert.equal(r3.save.shop!.theme, 'theme-ember')
  assert.deepEqual(r3.save.shop!.themes, ['theme-ember'])
  const r4 = buyShopItem(r3.save, 'theme-ember', NOW)
  assert.equal(r4.ok, false)
  assert.equal(r4.reason, 'already-owned')

  // 再买第二个主题：已拥有列表累积，当前激活切到新主题
  save.player.seasonXp = 2000
  const r5 = buyShopItem(r3.save, 'theme-frost', NOW)
  assert.equal(r5.ok, true)
  assert.deepEqual(r5.save.shop!.themes, ['theme-ember', 'theme-frost'])
  assert.equal(r5.save.shop!.theme, 'theme-frost')

  // 切换回已拥有的 ember：成功且不扣款
  const r6 = activateTheme(r5.save, 'theme-ember')
  assert.equal(r6.ok, true)
  assert.equal(r6.save.shop!.theme, 'theme-ember')
  assert.equal(r6.save.shop!.spent, r5.save.shop!.spent)

  // 未拥有的主题不可切换
  const r7 = activateTheme(r6.save, 'theme-verdant')
  assert.equal(r7.ok, false)

  // 空 id = 回到默认主题
  const r8 = activateTheme(r6.save, '')
  assert.equal(r8.ok, true)
  assert.equal(r8.save.shop!.theme, '')
})

test('商店：旧档迁移——已激活的主题回填为已拥有', () => {
  // 模拟 v0.9.4 及之前的存档：只有 theme 字段，没有 themes 列表
  const old = fresh()
  old.shop = { spent: 300, shields: 0, rerolls: 0, theme: 'theme-ember', badges: [] }
  const migrated = migrateSave(old as unknown as Partial<SaveData>, 'C:/proj', undefined)
  assert.deepEqual(migrated.shop!.themes, ['theme-ember'])
  // 已是列表的保持不变
  old.shop = { spent: 300, shields: 0, rerolls: 0, theme: 'theme-ember', themes: ['theme-ember', 'theme-frost'], badges: [] }
  const migrated2 = migrateSave(old as unknown as Partial<SaveData>, 'C:/proj', undefined)
  assert.deepEqual(migrated2.shop!.themes, ['theme-ember', 'theme-frost'])
})

test('商店：双保险——旧档只有 theme 时也不能重复买/切换', () => {
  // 模拟未迁移的旧档：shop.theme 已设但 themes 为空
  let save = fresh()
  save.player.seasonXp = 1000
  save.shop = { spent: 300, shields: 0, rerolls: 0, theme: 'theme-ember', badges: [] }
  // 已激活主题不能再买（即使 themes 列表为空）
  const r1 = buyShopItem(save, 'theme-ember', NOW)
  assert.equal(r1.ok, false)
  assert.equal(r1.reason, 'already-owned')
  // 已激活主题可切换（视为已拥有）
  const r2 = activateTheme(save, 'theme-ember')
  assert.equal(r2.ok, true)
  // 未激活的仍可购买
  const r3 = buyShopItem(save, 'theme-frost', NOW)
  assert.equal(r3.ok, true)
  assert.deepEqual(r3.save.shop!.themes, ['theme-ember', 'theme-frost'])
})

test('商店：商品表完备（4 类商品齐备）', () => {
  const kinds = new Set(SHOP_ITEMS.map(i => i.kind))
  assert.ok(kinds.has('shield'))
  assert.ok(kinds.has('reroll'))
  assert.ok(kinds.has('theme'))
  assert.ok(kinds.has('badge'))
  assert.ok(SHOP_ITEMS.length >= 12)
  // v0.11.0：7 款主题皮肤
  const themeCount = SHOP_ITEMS.filter(i => i.kind === 'theme').length
  assert.equal(themeCount, 7)
})

test('连击保险：失误回合消耗一个，连击不清零', () => {
  let save = fresh()
  save.shop = { ...freshShop(), shields: 1 }
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW) // 连击 1
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 2 }], NOW + 1) // 连击 2
  assert.equal(save.counters.consecutiveSuccess, 2)
  // 失误：消耗保险，连击保留
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 3 }], NOW + 2)
  assert.equal(save.counters.turnsFailed, 1)
  assert.equal(save.counters.consecutiveSuccess, 2)
  assert.equal(save.shop!.shields, 0)
  // 再失误：无保险，连击清零
  save = applyTurn(save, [{ kind: 'turn-failed', turn: 4 }], NOW + 3)
  assert.equal(save.counters.consecutiveSuccess, 0)
})

test('任务重掷：消耗库存且任务与默认不同', () => {
  let save = fresh()
  save.shop = { ...freshShop(), rerolls: 1 }
  const before = save.daily.quests.map(q => q.id).join(',')
  const r = useReroll(save, NOW)
  assert.equal(r.ok, true)
  assert.equal(r.save.shop!.rerolls, 0)
  assert.notEqual(r.save.daily.quests.map(q => q.id).join(','), before)
  // 无库存时拒绝
  const r2 = useReroll(r.save, NOW)
  assert.equal(r2.ok, false)
})

test('新手链：逐步完成，全部完成解锁称号', () => {
  let save = fresh()
  // 第 1 步：完成首个回合
  const r1 = checkTutorial(save, NOW)
  assert.equal(r1.stepIds.length, 0) // 什么都没做
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW)
  const r2 = checkTutorial(save, NOW)
  assert.ok(r2.stepIds.includes('first-turn'))
  assert.equal(r2.complete, false)
  // 编辑 + 待办 + 命令
  save = applyTurn(save, [
    { kind: 'turn-completed', turn: 2 },
    { kind: 'tool-call', tool: 'edit' },
    { kind: 'todo-completed', count: 1 },
    { kind: 'tool-call', tool: 'pwsh' },
  ], NOW + 1)
  const r3 = checkTutorial(save, NOW)
  assert.ok(r3.stepIds.includes('first-edit'))
  assert.ok(r3.stepIds.includes('first-todo'))
  assert.ok(r3.stepIds.includes('first-command'))
  // 最后一步：查看进度（devquestCalls）
  save.counters.devquestCalls = 1
  const r4 = checkTutorial(save, NOW + 2)
  assert.ok(r4.stepIds.includes('first-check'))
  assert.equal(r4.complete, true)
  assert.equal(r4.save.tutorial!.done, true) // 纯函数：r4.save 才是新存档
  // 全部完成有额外奖励：5 步 × 20 + 100
  assert.ok(r4.save.player.xpTotal >= 100 + 5 * 20)
})

test('新手链：已完成步骤不重复奖励', () => {
  let save = fresh()
  save.counters.turnsCompleted = 1
  const r1 = checkTutorial(save, NOW)
  assert.equal(r1.stepIds.length, 1)
  const r2 = checkTutorial(r1.save, NOW + 1)
  assert.equal(r2.stepIds.length, 0) // 不重复
})

test('每日历史：addXp 累计当日 XP，applyTurn 累计回合，跨天分桶', () => {
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW) // 10 XP + 1 turn
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 2 }], NOW + 1000) // 10 XP + 1 turn
  const today = dayKey(NOW)
  assert.equal(save.history![today]!.xp, 20)
  assert.equal(save.history![today]!.turns, 2)
  // 跨天
  const tomorrow = NOW + 86_400_000
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 3 }], tomorrow)
  const t2 = dayKey(tomorrow)
  assert.equal(save.history![t2]!.xp, 10)
  assert.equal(save.history![t2]!.turns, 1)
})

test('每日历史：裁剪到最近 HISTORY_KEEP 天', () => {
  const save = fresh()
  const oldDate = dayKey(NOW - 40 * 86_400_000)
  save.history = { [oldDate]: { xp: 999, turns: 5 } }
  const cut = trimHistory(save.history!, NOW)
  assert.equal(cut[oldDate], undefined)
  // 近 5 天保留
  const recentDate = dayKey(NOW - 3 * 86_400_000)
  save.history![recentDate] = { xp: 10, turns: 1 }
  const cut2 = trimHistory(save.history!, NOW)
  assert.equal(cut2[recentDate]!.xp, 10)
})

test('等级起点：升级时记录 levelStartedAt', () => {
  const save = fresh()
  const r = applyTurnDetailed(save, [
    { kind: 'turn-completed', turn: 1 },
    { kind: 'todo-completed', count: 10 }, // 150 XP → L1(100) → L2
  ], NOW)
  assert.equal(r.settlement.leveledUp, true)
  assert.equal(r.save.player.levelStartedAt, NOW)
})

// ---------------------------------------------------------------------------
// v0.6.0：稀有度 / 分类收藏 / 每日抽奖 / 下一称号
// ---------------------------------------------------------------------------

test('稀有度：47 枚成就都有明确稀有度（映射完备）', () => {
  assert.equal(ACHIEVEMENTS.length, 47)
  for (const a of ACHIEVEMENTS) {
    const r = rarityOf(a.id)
    assert.ok(['common', 'rare', 'epic', 'legendary'].includes(r), `${a.id} 稀有度缺失`)
  }
  assert.equal(ACHIEVEMENT_RARITY['turns_250'], 'legendary')
  assert.equal(ACHIEVEMENT_RARITY['first_turn'], 'common')
  assert.equal(rarityOf('unknown-id'), 'common') // 缺省
})

test('分类收藏：集齐某分类全部成就 → 奖励 XP（一次性）', () => {
  let save = fresh()
  // 集齐 journey 分类（9 枚）
  const journeyIds = ['first_turn', 'turns_10', 'turns_25', 'turns_50', 'turns_100', 'turns_250', 'comeback', 'comeback_10', 'steel_will']
  for (const id of journeyIds) save.achievements[id] = { acquiredAt: NOW, xp: 0 }
  const r1 = checkCollections(save, NOW)
  assert.ok(r1.completed.includes('journey'))
  assert.ok(r1.save.player.xpTotal >= 300) // journey 奖励 300
  assert.equal(r1.save.collections!.completed['journey'], NOW)
  // 二次检查不再奖励
  const r2 = checkCollections(r1.save, NOW + 1000)
  assert.ok(!r2.completed.includes('journey'))
})

test('每日幸运抽奖：每天一次，跨天重置，奖励入账', () => {
  let save = fresh()
  const r1 = claimLucky(save, NOW)
  assert.equal(r1.ok, true)
  assert.ok(r1.reward !== undefined)
  assert.equal(r1.save.lucky!.date, dayKey(NOW))
  assert.equal(r1.save.lucky!.claimed, true)
  // 同一天再抽：拒绝
  const r2 = claimLucky(r1.save, NOW + 1000)
  assert.equal(r2.ok, false)
  // 跨天：可再抽
  const tomorrow = NOW + 86_400_000
  const r3 = claimLucky(r1.save, tomorrow)
  assert.equal(r3.ok, true)
  // 奖励类型合法
  const kind = r1.reward.kind
  assert.ok(['xp', 'currency', 'shield', 'reroll'].includes(kind))
  if (kind === 'xp' || kind === 'currency') assert.ok(r1.reward.amount !== undefined)
  if (kind === 'shield') assert.equal(r1.save.shop!.shields, 1)
  if (kind === 'reroll') assert.equal(r1.save.shop!.rerolls, 1)
})

test('下一称号预览：当前等级下方最近的称号与所需 XP', () => {
  assert.deepEqual(nextTitle(1), { level: 5, name: { zh: '工匠', en: 'Artisan' } })
  assert.deepEqual(nextTitle(9), { level: 10, name: { zh: '锻造师', en: 'Forger' } })
  assert.equal(nextTitle(20), null) // 传说封顶
  // xpToLevel：L1→L5 累计 100+283+520+800 = 1703
  assert.equal(xpToLevel(1, 5), 1703)
})

test('存档迁移：collections/lucky 字段补全', () => {
  const raw = { version: 1, cwd: 'C:/p', player: { level: 3, xp: 10, xpTotal: 110, title: '学徒', season: '2026-S3', seasonXp: 20 }, counters: { turnsCompleted: 1 } }
  const migrated = migrateSave(raw as never, 'global', undefined)
  assert.deepEqual(migrated.collections!.completed, {})
  assert.deepEqual(migrated.lucky, { date: '', claimed: false })
})

// ---------------------------------------------------------------------------
// v0.7.0：每周挑战 / 多称号
// ---------------------------------------------------------------------------

test('weekKey：ISO 周键（周一为一周开始）', () => {
  // 2026-08-15 是周六 → 2026-W33（2026-08-10 周一所在周）
  const sat = new Date(2026, 7, 15, 12, 0, 0).getTime()
  assert.equal(weekKey(sat), '2026-W33')
  // 同周内两天相同
  const mon = new Date(2026, 7, 10, 9, 0, 0).getTime()
  assert.equal(weekKey(mon), '2026-W33')
  // 周一之前（周日 08-09）属于上一周 W32
  const sun = new Date(2026, 7, 9, 12, 0, 0).getTime()
  assert.equal(weekKey(sun), '2026-W32')
})

test('每周挑战：滚动 3 个，同周确定，推进并结算', () => {
  const w1 = rollWeeklyQuests(NOW)
  assert.equal(w1.quests.length, 3)
  assert.equal(w1.week, weekKey(NOW))
  // 同周再滚相同
  const w2 = rollWeeklyQuests(NOW + 3600_000)
  assert.deepEqual(w1.quests.map(q => q.id), w2.quests.map(q => q.id))
  // 任务来自池
  for (const q of w1.quests) assert.ok(WEEKLY_QUEST_POOL.some(d => d.id === q.id))
})

test('每周挑战：applyWeekly 推进进度并结算奖励', () => {
  let save = fresh()
  // fresh() 屏蔽了 daily，但 weekly 是独立字段——手动屏蔽避免干扰
  save.weekly = { week: weekKey(NOW), quests: [] }
  // 直接用池里第一个任务构造
  const def = WEEKLY_QUEST_POOL[0]!
  save.weekly = {
    week: weekKey(NOW),
    quests: [{ id: def.id, label: def.label, goal: def.goal, reward: def.reward, progress: 0, done: false }],
  }
  // 累计回合数达成
  save.counters.turnsCompleted = def.goal
  const gain = applyWeekly(save, NOW)
  assert.ok(gain >= def.reward)
  assert.equal(save.weekly!.quests[0]!.done, true)
})

test('refreshWeeklyProgress：进度即时同步（不发奖），后续结算仍发奖', () => {
  let save = fresh()
  save.weekly = { week: weekKey(NOW), quests: [] }
  const def = WEEKLY_QUEST_POOL[0]!
  save.weekly = {
    week: weekKey(NOW),
    quests: [{ id: def.id, label: def.label, goal: def.goal, reward: def.reward, progress: 0, done: false }],
  }
  save.counters.turnsCompleted = def.goal
  // 同步视图：progress/done 立即反映计数器，但不发奖
  refreshWeeklyProgress(save, NOW)
  assert.equal(save.weekly!.quests[0]!.progress, def.goal)
  assert.equal(save.weekly!.quests[0]!.done, true)
  assert.equal(save.weekly!.quests[0]!.claimedAt, undefined)
  // 后续结算补发奖励（不因 done 已置 true 而跳过）
  const gain = applyWeekly(save, NOW)
  assert.ok(gain >= def.reward)
  assert.notEqual(save.weekly!.quests[0]!.claimedAt, undefined)
})

test('每周全清奖励：3 个全完成可领一次 +100 XP', () => {
  let save = fresh()
  const w = rollWeeklyQuests(NOW)
  for (const q of w.quests) q.done = true
  save.weekly = w
  const r1 = claimWeeklyBonus(save, NOW)
  assert.equal(r1.ok, true)
  assert.equal(r1.gained, WEEKLY_BONUS_XP)
  assert.equal(r1.save.weekly!.bonusClaimed, true)
  // 二次领取拒绝
  const r2 = claimWeeklyBonus(r1.save, NOW + 1000)
  assert.equal(r2.ok, false)
})

test('多称号：条件达标自动解锁', () => {
  let save = fresh()
  const r0 = checkTitles(save, NOW)
  assert.equal(r0.unlocked.length, 0)
  // 达成 100 次编辑 → t-100edits 解锁
  save.counters.craftTools = 100
  const r1 = checkTitles(save, NOW)
  assert.ok(r1.unlocked.includes('t-100edits'))
  assert.ok(r1.save.titles!.unlocked.includes('t-100edits'))
  // 不重复
  const r2 = checkTitles(r1.save, NOW + 1)
  assert.equal(r2.unlocked.length, 0)
})

test('多称号：切换展示（未解锁的不可切换，空=跟随等级）', () => {
  let save = fresh()
  save.titles = { unlocked: ['t-100edits'], active: '' }
  // 切到已解锁
  const r1 = setActiveTitle(save, 't-100edits')
  assert.equal(r1.ok, true)
  assert.equal(r1.save.titles!.active, 't-100edits')
  // 切到未解锁 → 拒绝
  const r2 = setActiveTitle(save, 't-30streak')
  assert.equal(r2.ok, false)
  assert.equal(r2.save.titles!.active, '')
  // 切回跟随等级
  const r3 = setActiveTitle(r1.save, '')
  assert.equal(r3.ok, true)
  assert.equal(r3.save.titles!.active, '')
})

test('存档迁移：weekly/titles 字段补全', () => {
  const raw = { version: 1, cwd: 'C:/p', player: { level: 1, xp: 0, xpTotal: 0, title: '学徒', season: '2026-S3', seasonXp: 0 }, counters: {} }
  const migrated = migrateSave(raw as never, 'global', undefined)
  assert.ok(migrated.weekly !== undefined)
  assert.equal(migrated.weekly!.week, weekKey(migrated.updatedAt))
  assert.deepEqual(migrated.titles, { unlocked: [], active: '' })
  // 称号池完备
  assert.ok(TITLE_POOL.length >= 5)
})

// ---------------------------------------------------------------------------
// v0.8.0：新彩蛋 / 荣誉墙
// ---------------------------------------------------------------------------

test('v0.8.0 新彩蛋：键盘侠 / 午夜钟声 / 连击大师 判定', () => {
  // 键盘侠：任一工具 ≥100 次
  let s1 = fresh()
  s1.counters.toolCallsByTool['pwsh'] = 100
  assert.ok(checkAchievements(ACHIEVEMENTS, s1, NOW).includes('keyboard_warrior'))
  // 午夜钟声：23:58 完成回合
  let s2 = fresh()
  s2.counters.lastTurnCompletedAt = new Date(2026, 7, 15, 23, 58, 0).getTime()
  assert.ok(checkAchievements(ACHIEVEMENTS, s2, NOW).includes('midnight_bell'))
  // 连击大师：连击 40
  let s3 = fresh()
  s3.counters.consecutiveSuccess = 40
  assert.ok(checkAchievements(ACHIEVEMENTS, s3, NOW).includes('combo_master'))
})

test('荣誉墙：updateRecords 记录赛季最高等级/连击/赛季XP', () => {
  let save = fresh()
  save.player.season = '2026-S3'
  save.player.level = 12
  save.player.seasonXp = 500
  save.counters.consecutiveSuccess = 30
  const r1 = updateRecords(save, NOW)
  assert.equal(r1.records!['2026-S3']!.level, 12)
  assert.equal(r1.records!['2026-S3']!.combo, 30)
  assert.equal(r1.records!['2026-S3']!.seasonXp, 500)
  // 提升后更新，降级不覆盖（基于 r1 副本修改）
  const upgraded = structuredClone(r1)
  upgraded.player.level = 15
  upgraded.counters.consecutiveSuccess = 45
  const r2 = updateRecords(upgraded, NOW)
  assert.equal(r2.records!['2026-S3']!.level, 15)
  assert.equal(r2.records!['2026-S3']!.combo, 45)
  // 换季：旧纪录保留，新赛季新开
  const newSeason = structuredClone(r2)
  newSeason.player.season = '2026-S4'
  newSeason.player.level = 3
  const r3 = updateRecords(newSeason, NOW)
  assert.equal(r3.records!['2026-S3']!.level, 15) // 保留
  assert.equal(r3.records!['2026-S4']!.level, 3) // 新赛季
})

test('荣誉墙：applyTurn 自动更新纪录 + 视图按赛季倒序', () => {
  let save = fresh()
  save = applyTurn(save, [{ kind: 'turn-completed', turn: 1 }], NOW)
  const season = save.player.season
  assert.equal(save.records![season]!.level, 1)
  assert.equal(save.records![season]!.combo, 1)
  const view = buildRecordsView(save)
  assert.equal(view.length, 1)
  assert.equal(view[0]!.season, season)
})

test('荣誉墙：trimRecords 只保留最近 RECORDS_KEEP 个赛季', () => {
  let save = fresh()
  const rec: Record<string, { level: number; combo: number; seasonXp: number }> = {}
  for (let i = 0; i < 12; i++) rec[`20${String(i).padStart(2, '0')}-S1`] = { level: i + 1, combo: i, seasonXp: 100 }
  save.records = rec
  const trimmed = trimRecords(save)
  const seasons = Object.keys(trimmed.records!)
  assert.equal(seasons.length, 8)
  assert.ok(seasons.includes('2011-S1')) // 最近的保留
  assert.ok(!seasons.includes('2000-S1')) // 最老的裁掉
})

test('成就总数：44 → 47（新增 3 枚彩蛋）', () => {
  assert.equal(ACHIEVEMENTS.length, 47)
  const eggIds = ACHIEVEMENTS.filter(a => a.category === 'egg').map(a => a.id)
  assert.ok(eggIds.includes('keyboard_warrior'))
  assert.ok(eggIds.includes('midnight_bell'))
  assert.ok(eggIds.includes('combo_master'))
})
