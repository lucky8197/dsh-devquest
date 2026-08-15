/**
 * DevQuest — 把开发变成 RPG 的 DSH 插件（host 半区）。
 *
 * 装配：
 * 1. 订阅 session/event → 归一化 Action → 回合结算（计分 + 成就 + 存档）
 * 2. 注册 devquest_status / devquest_achievements / devquest_reset 工具
 * 3. 注册 GET /api/devquest/status 路由（浏览器面板数据源，60s 缓存）
 *
 * 关键不变式：
 * - 引擎纯函数（engine.ts），listener 只做归一化与聚合
 * - 幂等：内存 seenSeq + 存档 lastSeqBySession 水位，重启重放不重复计分
 * - 事件处理绝不抛出，任何异常只记录不影响 session 提交
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { Session } from '@deepseek-ai/dsh-session'
import { ACHIEVEMENTS, achievementById } from './achievements.ts'
import {
  applyTurnDetailed, buyShopItem, checkAchievements, checkTutorial, claimDailyChest, dailyQuestsDone, dayKey, ensureDaily,
  HISTORY_KEEP, SETTLEMENT_KEEP, SHOP_ITEMS, shopBalance, titleFor, TUTORIAL_STEPS, TUTORIAL_TITLE, useReroll, xpToNext,
} from './engine.ts'
import { watchEvents, type SessionAggregate } from './listener.ts'
import { loadSave, persistSave, deleteSave, scopeKey, type StoreConfig } from './store.ts'
import { registerDevQuestTools } from './tools.ts'
import { makeDevQuestRoutes } from './routes.ts'
import type { Action, AchievementView, DevQuestStatus, SaveData, TurnSettlementEvent } from './types.ts'

export const name = 'devquest'
export const inject = ['fs', 'sessions', 'tools'] as const

/** 插件配置。 */
export interface Config {
  /** 存档根目录（缺省 ~/.dsh/devquest）。 */
  dataDir?: string
  /** 赛季固定覆盖（缺省按日期自动推导季度赛季）。 */
  season?: string
  /** 状态接口缓存时长（毫秒）。默认 60000。 */
  cacheTtlMs?: number
}

export function apply(ctx: Context, config: Config = {}): void {
  const storeConfig: StoreConfig = {
    ...(config.dataDir !== undefined ? { dataDir: config.dataDir } : {}),
    ...(config.season !== undefined ? { season: config.season } : {}),
  }
  // 赛季：config.season 可选固定覆盖；缺省按日期自动推导季度赛季（见 autoSeasonId）。
  const seasonOverride = config.season

  // ---- 引擎状态：存档缓存 + 每作用域串行化队列 ----
  const saveCache = new Map<string, SaveData>()
  const tails = new Map<string, Promise<void>>()
  let settlementSeq = 0

  /** 取存档（缓存优先，无则从盘读）。 */
  async function getSave(key: string): Promise<SaveData> {
    let save = saveCache.get(key)
    if (save === undefined) {
      save = await loadSave(ctx, storeConfig, key)
      saveCache.set(key, save)
    }
    return save
  }

  /** 按作用域串行化写操作（同 cwd 的回合结算不互相覆盖）。 */
  function enqueue(key: string, task: () => Promise<void>): void {
    const prev = tails.get(key) ?? Promise.resolve()
    const next = prev.catch(() => undefined).then(task)
    tails.set(key, next.catch(() => undefined))
  }

  /** 组装状态视图。 */
  function buildStatus(save: SaveData): DevQuestStatus {
    const unlocked = new Set(Object.keys(save.achievements))
    return {
      cwd: save.cwd,
      level: save.player.level,
      xp: save.player.xp,
      xpToNext: xpToNext(save.player.level),
      ...(save.player.levelStartedAt !== undefined ? { levelStartedAt: save.player.levelStartedAt } : {}),
      title: titleFor(save.player.level),
      season: save.player.season,
      seasonXp: save.player.seasonXp,
      counters: save.counters,
      achievements: ACHIEVEMENTS.map(a => {
        const rec = save.achievements[a.id]
        const view: AchievementView = {
          id: a.id,
          category: a.category,
          name: a.name,
          description: a.description,
          icon: a.icon,
          xp: a.xp,
          hidden: a.hidden === true,
          unlocked: rec !== undefined,
          ...(rec !== undefined ? { acquiredAt: rec.acquiredAt } : {}),
        }
        // 未解锁成就附带进度（面板显示「还差多少」）。
        if (rec === undefined && a.progress !== undefined) view.progress = a.progress(save)
        return view
      }),
      // 每日任务：跨天自动重滚（就地更新缓存存档，随下次结算持久化）。
      daily: ensureDaily(save, Date.now()),
      dailyChest: {
        ready: dailyQuestsDone(save.daily) && save.daily.chestClaimed !== true,
        claimed: save.daily.chestClaimed === true,
      },
      settlements: save.settlements ?? [],
      shop: {
        balance: shopBalance(save),
        items: SHOP_ITEMS.map(item => {
          const owned = item.kind === 'theme'
            ? save.shop?.theme === item.id
            : item.kind === 'badge'
              ? (save.shop?.badges ?? []).includes(item.id)
              : false
          return { ...item, owned }
        }),
        theme: save.shop?.theme ?? '',
        badges: save.shop?.badges ?? [],
        shields: save.shop?.shields ?? 0,
        rerolls: save.shop?.rerolls ?? 0,
      },
      tutorial: {
        steps: TUTORIAL_STEPS.map(step => {
          const at = save.tutorial?.steps[step.id]
          return {
            id: step.id,
            name: step.name,
            icon: step.icon,
            xp: step.xp,
            done: at !== undefined,
            ...(at !== undefined ? { acquiredAt: at } : {}),
          }
        }),
        done: save.tutorial?.done === true,
        title: TUTORIAL_TITLE,
      },
      history: buildHistory(save, Date.now()),
      updatedAt: save.updatedAt,
    }
  }

  /** 组装成长周报（最近 HISTORY_KEEP 天，时间正序）。 */
  function buildHistory(save: SaveData, now: number): DevQuestStatus['history'] {
    const out: DevQuestStatus['history'] = []
    const map = save.history ?? {}
    for (let i = HISTORY_KEEP - 1; i >= 0; i--) {
      const date = dayKey(now - i * 86_400_000)
      const h = map[date]
      out.push({ date, xp: h?.xp ?? 0, turns: h?.turns ?? 0 })
    }
    return out
  }

  // ---- 1. 事件监听：缓冲 → 回合结束结算 ----
  watchEvents(ctx, (session: Session, agg: SessionAggregate, action: Action) => {
    const ending = action.kind === 'turn-completed'
      || action.kind === 'turn-failed'
      || action.kind === 'turn-aborted'
    if (!ending) return

    const sessionId = agg.sessionId
    const key = scopeKey() // 全局玩家存档（跨会话/跨项目）
    const seq = agg.seenSeq // 当前事件（turn/end）的会话内序号
    const actions = agg.actions // 含本次 turn/end 动作
    agg.actions = [] // 同步清空，避免重复结算

    enqueue(key, async () => {
      const save = await getSave(key)
      // 幂等水位：该会话已结算过 ≥ 本次 seq 的回合 → 重放跳过。
      if (seq <= (save.lastSeqBySession[sessionId] ?? -1)) return
      const at = Date.now()
      const { save: next, settlement } = applyTurnDetailed(save, actions, at, seasonOverride)
      // 结算事件入存档（面板 toast 数据源，保留最近 N 条）。
      const event: TurnSettlementEvent = {
        id: `${at}-${settlementSeq++}`,
        at,
        xp: settlement.xp,
        combo: settlement.combo,
        questXp: settlement.questXp,
        levelBefore: settlement.levelBefore,
        levelAfter: settlement.levelAfter,
        leveledUp: settlement.leveledUp,
        turnsDone: settlement.turnsDone,
      }
      next.settlements = [...(next.settlements ?? []), event].slice(-SETTLEMENT_KEEP)
      const unlocked = checkAchievements(ACHIEVEMENTS, next)
      // 新手任务链：步骤推进（每步 +20 XP，全清 +100 XP + 专属称号）。
      const tut = checkTutorial(next, at, seasonOverride)
      Object.assign(next, tut.save)
      next.lastSeqBySession[sessionId] = seq
      saveCache.set(key, next)
      await persistSave(ctx, storeConfig, next)
      if (unlocked.length > 0) {
        const names = unlocked.map(id => {
          const def = achievementById(id)
          return def !== undefined ? `${def.icon} ${def.name.zh} ${def.name.en}` : id
        })
        console.log(`[devquest] 🏆 成就解锁：${names.join('、')}`)
      }
      if (tut.stepIds.length > 0) {
        const names = tut.stepIds.map(id => {
          const def = TUTORIAL_STEPS.find(s => s.id === id)
          return def !== undefined ? `${def.icon} ${def.name.zh}` : id
        })
        console.log(`[devquest] 🎓 新手任务：${names.join('、')}${tut.complete ? '（全部完成，解锁「见习冒险者」称号！）' : ''}`)
      }
    })
  })

  // ---- 2. 工具 ----
  registerDevQuestTools(ctx, {
    status: async (): Promise<DevQuestStatus> => {
      const save = await getSave(scopeKey())
      return buildStatus(save)
    },
    reset: async (): Promise<{ ok: boolean; reset: boolean }> => {
      const key = scopeKey()
      saveCache.delete(key)
      try {
        const reset = await deleteSave(ctx, storeConfig)
        return { ok: true, reset }
      } catch (error) {
        console.error('[devquest] reset failed:', error)
        return { ok: false, reset: false }
      }
    },
  })

  // ---- 3. HTTP 路由（可选能力：headless 无 webServer 时自动跳过） ----
  /** 串行执行一个改档操作：读 → 纯函数改 → 缓存/持久化 → 返回最新状态。 */
  async function mutateSave<T extends { save: SaveData }>(
    mutate: (save: SaveData) => T,
    pick: (result: T) => { ok: boolean; reason?: string },
  ): Promise<{ ok: boolean; reason?: string; status: DevQuestStatus }> {
    const key = scopeKey()
    let picked: { ok: boolean; reason?: string } = { ok: false }
    let fresh: SaveData | undefined
    await new Promise<void>((resolve, reject) => {
      enqueue(key, async () => {
        try {
          const save = await getSave(key)
          const result = mutate(save)
          picked = pick(result)
          fresh = result.save
          if (picked.ok) {
            saveCache.set(key, result.save)
            await persistSave(ctx, storeConfig, result.save)
          }
        } catch (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    return { ...picked, status: buildStatus(fresh ?? (await getSave(key))) }
  }

  const routes = makeDevQuestRoutes({
    status: async (): Promise<DevQuestStatus> => {
      const save = await getSave(scopeKey())
      return buildStatus(save)
    },
    claimChest: async (): Promise<{ ok: boolean; gained: number; status: DevQuestStatus }> => {
      const key = scopeKey()
      let result: { ok: boolean; gained: number } = { ok: false, gained: 0 }
      let fresh: SaveData | undefined
      await new Promise<void>((resolve, reject) => {
        enqueue(key, async () => {
          try {
            const save = await getSave(key)
            const claimed = claimDailyChest(save, Date.now(), seasonOverride)
            result = { ok: claimed.ok, gained: claimed.gained }
            fresh = claimed.save
            if (claimed.ok) {
              saveCache.set(key, claimed.save)
              await persistSave(ctx, storeConfig, claimed.save)
            }
          } catch (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
      return { ...result, status: buildStatus(fresh ?? (await getSave(key))) }
    },
    buy: async (itemId: string) => mutateSave(save => buyShopItem(save, itemId, Date.now(), seasonOverride), result => ({ ok: result.ok, ...(result.reason !== undefined ? { reason: result.reason } : {}) })),
    reroll: async () => mutateSave(save => useReroll(save, Date.now()), result => ({ ok: result.ok })),
    ...(config.cacheTtlMs !== undefined ? { cacheTtlMs: config.cacheTtlMs } : {}),
  })
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(() => {
      const disposers = routes.map((route) => httpCtx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'devquest: routes')
  })
}
