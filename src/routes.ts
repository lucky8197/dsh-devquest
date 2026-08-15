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
  /** 结果缓存时长（毫秒）。默认 60s。 */
  cacheTtlMs?: number
}

/** 读取 POST JSON body（小请求，最多 64KB）。 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
      if (data.length > 65536) {
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
  }]
}
