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
import { applyTurn, checkAchievements, titleFor, xpToNext } from './engine.ts'
import { watchEvents, type SessionAggregate } from './listener.ts'
import { loadSave, persistSave, deleteSave, scopeKey, type StoreConfig } from './store.ts'
import { registerDevQuestTools } from './tools.ts'
import { makeDevQuestRoutes } from './routes.ts'
import type { Action, DevQuestStatus, SaveData } from './types.ts'

export const name = 'devquest'
export const inject = ['fs', 'sessions', 'tools'] as const

/** 插件配置。 */
export interface Config {
  /** 存档根目录（缺省 ~/.dsh/devquest）。 */
  dataDir?: string
  /** 赛季名（缺省 2026-S1）。 */
  season?: string
  /** 浏览器面板不带 cwd 参数时使用的默认目录（缺省进程启动目录）。 */
  defaultCwd?: string
  /** 状态接口缓存时长（毫秒）。默认 60000。 */
  cacheTtlMs?: number
}

export function apply(ctx: Context, config: Config = {}): void {
  const storeConfig: StoreConfig = {
    ...(config.dataDir !== undefined ? { dataDir: config.dataDir } : {}),
    ...(config.season !== undefined ? { season: config.season } : {}),
  }
  const season = config.season ?? '2026-S1'

  // ---- 引擎状态：存档缓存 + 每作用域串行化队列 ----
  const saveCache = new Map<string, SaveData>()
  const tails = new Map<string, Promise<void>>()

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
      title: titleFor(save.player.level),
      season: save.player.season,
      counters: save.counters,
      achievements: ACHIEVEMENTS.map(a => {
        const rec = save.achievements[a.id]
        return {
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
      }),
      updatedAt: save.updatedAt,
    }
  }

  // ---- 1. 事件监听：缓冲 → 回合结束结算 ----
  watchEvents(ctx, (session: Session, agg: SessionAggregate, action: Action) => {
    const ending = action.kind === 'turn-completed'
      || action.kind === 'turn-failed'
      || action.kind === 'turn-aborted'
    if (!ending) return

    const sessionId = agg.sessionId
    const cwd = session.header.cwd
    const key = scopeKey(cwd)
    const seq = agg.seenSeq // 当前事件（turn/end）的会话内序号
    const actions = agg.actions // 含本次 turn/end 动作
    agg.actions = [] // 同步清空，避免重复结算

    enqueue(key, async () => {
      const save = await getSave(key)
      // 幂等水位：该会话已结算过 ≥ 本次 seq 的回合 → 重放跳过。
      if (seq <= (save.lastSeqBySession[sessionId] ?? -1)) return
      const next = applyTurn(save, actions, Date.now())
      const unlocked = checkAchievements(ACHIEVEMENTS, next)
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
    })
  })

  // ---- 2. 工具 ----
  registerDevQuestTools(ctx, {
    status: async (cwd?: string): Promise<DevQuestStatus> => {
      const save = await getSave(scopeKey(cwd))
      return buildStatus(save)
    },
    reset: async (cwd: string): Promise<{ ok: boolean; reset: boolean }> => {
      const key = scopeKey(cwd)
      saveCache.delete(key)
      try {
        const reset = await deleteSave(ctx, storeConfig, key)
        return { ok: true, reset }
      } catch (error) {
        console.error('[devquest] reset failed:', error)
        return { ok: false, reset: false }
      }
    },
  })

  // ---- 3. HTTP 路由（可选能力：headless 无 webServer 时自动跳过） ----
  const routes = makeDevQuestRoutes({
    status: async (cwd: string): Promise<DevQuestStatus> => {
      const save = await getSave(scopeKey(cwd))
      return buildStatus(save)
    },
    sessions: ctx.sessions as never,
    ...(config.defaultCwd !== undefined ? { defaultCwd: config.defaultCwd } : {}),
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
