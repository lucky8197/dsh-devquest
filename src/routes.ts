/**
 * DevQuest HTTP 路由：浏览器面板通过同源 JSON 接口拉取状态
 * （`GET /api/devquest/status`）与领取每日全清宝箱（`POST /api/devquest/claim-chest`）。
 * 60s 缓存 + in-flight 复用（仅 status；claim 会主动失效缓存）。
 * v0.3 起存档为全局玩家档，不再按 cwd/session 分项目。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { DevQuestStatus } from './types.ts'

/** 浏览器侧 API 前缀。 */
export const STATUS_API_PREFIX = '/api/devquest'

/** 路由依赖。 */
export interface DevQuestRoutesConfig {
  /** 取全局玩家状态（读档 + 组装视图）。 */
  status: () => Promise<DevQuestStatus>
  /** 领取每日全清宝箱；返回是否成功、奖励 XP 与最新状态。 */
  claimChest: () => Promise<{ ok: boolean; gained: number; status: DevQuestStatus }>
  /** 购买商店商品；返回是否成功、原因与最新状态。 */
  buy: (itemId: string) => Promise<{ ok: boolean; reason?: string; status: DevQuestStatus }>
  /** 使用任务重掷；返回是否成功与最新状态。 */
  reroll: () => Promise<{ ok: boolean; status: DevQuestStatus }>
  /** 每日幸运抽奖；返回是否成功、奖励与最新状态。 */
  lucky: () => Promise<{ ok: boolean; reward?: { kind: string; amount?: number; count?: number; label: string }; status: DevQuestStatus }>
  /** 导出完整存档 JSON。 */
  exportSave: () => Promise<object>
  /** 导入存档（覆盖）；返回是否成功与最新状态。 */
  importSave: (raw: unknown) => Promise<{ ok: boolean; error?: string; status: DevQuestStatus }>
  /** 切换展示称号；返回是否成功与最新状态。 */
  setTitle: (titleId: string) => Promise<{ ok: boolean; status: DevQuestStatus }>
  /** 切换已拥有主题（空字符串=默认主题）；返回是否成功与最新状态。 */
  setTheme: (themeId: string) => Promise<{ ok: boolean; status: DevQuestStatus }>
  /** 领取每周全清奖励；返回是否成功、奖励 XP 与最新状态。 */
  claimWeeklyBonus: () => Promise<{ ok: boolean; gained: number; status: DevQuestStatus }>
  /** 使用任务跳过卡；返回是否成功与最新状态。 */
  useQuestSkip: () => Promise<{ ok: boolean; status: DevQuestStatus }>
  /** 领取赛季通行证档位奖励；返回是否成功、奖励 XP 与最新状态。 */
  claimPass: (tierId: string) => Promise<{ ok: boolean; gained: number; status: DevQuestStatus }>
  /** v1.3.0 设定每日 XP 目标（0=关闭）；返回是否成功与最新状态。 */
  setDailyGoal: (goal: number) => Promise<{ ok: boolean; status: DevQuestStatus }>
  /** v1.3.0 领取每日目标奖励；返回是否成功、奖励 XP 与最新状态。 */
  claimDailyGoal: () => Promise<{ ok: boolean; gained: number; status: DevQuestStatus }>
  /** v1.3.0 领取每周 BOSS 掉落；返回是否成功、奖励货币与最新状态。 */
  claimWeeklyBoss: () => Promise<{ ok: boolean; gained: number; status: DevQuestStatus }>
  /** 结果缓存时长（毫秒）。默认 60s。 */
  cacheTtlMs?: number
}

/** 读取 POST JSON body（小请求，最多 4MB——导入存档可能较大）。 */
function readBody(req: IncomingMessage, max = 4 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
      if (data.length > max) {
        reject(new Error('body-too-large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** 写 JSON 响应。 */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export function makeDevQuestRoutes(config: DevQuestRoutesConfig): WebRoute[] {
  const { cacheTtlMs = 60_000 } = config
  let cached: { at: number; promise: Promise<DevQuestStatus> } | undefined

  const invalidateCache = (): void => {
    cached = undefined
  }

  const status = (): Promise<DevQuestStatus> => {
    if (cached !== undefined && Date.now() - cached.at < cacheTtlMs) return cached.promise
    const promise = config.status().catch((error: unknown) => {
      cached = undefined
      throw error
    })
    cached = { at: Date.now(), promise }
    return promise
  }

  return [{
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/status`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'GET') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      status().then(
        (result) => json(res, 200, { ok: true, status: result }),
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/claim-chest`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.claimChest().then(
        (result) => {
          invalidateCache() // 状态变了，失效缓存让下次轮询取到新值
          json(res, 200, { ok: result.ok, gained: result.gained, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/shop/buy`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req).then(body => {
        let itemId = ''
        try {
          const parsed = JSON.parse(body) as { itemId?: unknown }
          if (typeof parsed.itemId === 'string') itemId = parsed.itemId
        } catch {
          itemId = ''
        }
        if (itemId === '') {
          json(res, 400, { ok: false, error: 'invalid-item-id' })
          return undefined
        }
        return config.buy(itemId).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, reason: result.reason, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/shop/reroll`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.reroll().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/lucky`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.lucky().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, reward: result.reward, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/export`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'GET') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.exportSave().then(
        (data) => {
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="devquest-player.json"' })
          res.end(JSON.stringify(data, null, 2))
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/import`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req, 16 * 1024 * 1024).then(body => {
        let raw: unknown
        try {
          raw = JSON.parse(body)
        } catch {
          json(res, 400, { ok: false, error: 'invalid-json' })
          return undefined
        }
        return config.importSave(raw).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, error: result.error, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/titles/switch`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req).then(body => {
        let titleId = ''
        try {
          const parsed = JSON.parse(body) as { titleId?: unknown }
          if (typeof parsed.titleId === 'string') titleId = parsed.titleId
        } catch {
          titleId = ''
        }
        return config.setTitle(titleId).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/shop/theme`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req).then(body => {
        let themeId = ''
        try {
          const parsed = JSON.parse(body) as { themeId?: unknown }
          if (typeof parsed.themeId === 'string') themeId = parsed.themeId
        } catch {
          themeId = ''
        }
        return config.setTheme(themeId).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/daily-goal/set`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req).then(body => {
        let goal = 0
        try {
          const parsed = JSON.parse(body) as { goal?: unknown }
          if (typeof parsed.goal === 'number') goal = parsed.goal
        } catch {
          goal = 0
        }
        return config.setDailyGoal(goal).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/daily-goal/claim`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.claimDailyGoal().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, gained: result.gained, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/weekly-boss/claim`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.claimWeeklyBoss().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, gained: result.gained, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/weekly-bonus`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.claimWeeklyBonus().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, gained: result.gained, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/shop/quest-skip`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.useQuestSkip().then(
        (result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, status: result.status })
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  }, {
    kind: 'exact',
    path: `${STATUS_API_PREFIX}/pass/claim`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req).then(body => {
        let tierId = ''
        try {
          const parsed = JSON.parse(body) as { tierId?: unknown }
          if (typeof parsed.tierId === 'string') tierId = parsed.tierId
        } catch {
          tierId = ''
        }
        if (tierId === '') {
          json(res, 400, { ok: false, error: 'invalid-tier-id' })
          return undefined
        }
        return config.claimPass(tierId).then((result) => {
          invalidateCache()
          json(res, 200, { ok: result.ok, gained: result.gained, status: result.status })
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  }]
}
