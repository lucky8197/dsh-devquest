/**
 * DevQuest HTTP 路由：浏览器面板通过同源 JSON 接口拉取状态
 * （`GET /api/devquest/status`）与领取/购买等操作（POST）。
 * 60s 缓存 + in-flight 复用（仅 status；写操作会主动失效缓存）。
 *
 * 实现：工厂函数收敛 15 个路由的样板（方法校验 / body 解析 / 缓存失效 / 错误响应），
 * 每个路由只剩一行数据声明。v0.3 起存档为全局玩家档，不再按 cwd/session 分项目。
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
  /** 读 UI 设置（host 权威存储；无文件返回 null）。 */
  uiSettings: () => Promise<unknown | null>
  /** 保存 UI 设置（整体替换 + sanitize）；返回保存后的设置。 */
  saveUiSettings: (raw: unknown) => Promise<unknown>
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

  /** POST 无 body 路由工厂：写成功即失效缓存。 */
  const post = (path: string, run: () => Promise<unknown>): WebRoute => ({
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      run().then(
        (result) => {
          invalidateCache()
          json(res, 200, result)
        },
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  })

  /** POST + JSON body 路由工厂：parse 校验并取出参数；返回 null 时 400。 */
  const postJson = (
    path: string,
    parse: (raw: unknown) => unknown | null,
    run: (arg: unknown) => Promise<unknown>,
    options: { maxBytes?: number; badRequestError?: string } = {},
  ): WebRoute => ({
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      readBody(req, options.maxBytes).then(bodyText => {
        let raw: unknown
        try {
          raw = JSON.parse(bodyText)
        } catch {
          json(res, 400, { ok: false, error: 'invalid-json' })
          return undefined
        }
        const arg = parse(raw)
        if (arg === null) {
          json(res, 400, { ok: false, error: options.badRequestError ?? 'invalid-request' })
          return undefined
        }
        return run(arg).then((result) => {
          invalidateCache()
          json(res, 200, result)
        })
      }).then(undefined, (error: unknown) => json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    },
  })

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
    path: `${STATUS_API_PREFIX}/ui-settings`,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'GET') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      config.uiSettings().then(
        (settings) => json(res, 200, { ok: true, settings }),
        (error: unknown) => json(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    },
  },
    // ---- 无 body 的写操作 ----
    post(`${STATUS_API_PREFIX}/claim-chest`, () => config.claimChest()),
    post(`${STATUS_API_PREFIX}/shop/reroll`, () => config.reroll()),
    post(`${STATUS_API_PREFIX}/lucky`, () => config.lucky()),
    post(`${STATUS_API_PREFIX}/daily-goal/claim`, () => config.claimDailyGoal()),
    post(`${STATUS_API_PREFIX}/weekly-boss/claim`, () => config.claimWeeklyBoss()),
    post(`${STATUS_API_PREFIX}/weekly-bonus`, () => config.claimWeeklyBonus()),
    post(`${STATUS_API_PREFIX}/shop/quest-skip`, () => config.useQuestSkip()),
    // ---- 带 JSON body 的写操作 ----
    // 导入存档（更大体积限制）。
    postJson(`${STATUS_API_PREFIX}/import`,
      (raw) => raw, // 原样传（结构校验在 importSave 内）
      (raw) => config.importSave(raw),
      { maxBytes: 16 * 1024 * 1024 }),
    // shop/buy: { itemId: string }（空 → 400）。
    postJson(`${STATUS_API_PREFIX}/shop/buy`,
      (raw) => {
        const itemId = (raw as { itemId?: unknown } | null)?.itemId
        return typeof itemId === 'string' && itemId !== '' ? itemId : null
      },
      (itemId) => config.buy(itemId as string),
      { badRequestError: 'invalid-item-id' }),
    // titles/switch: { titleId: string }（空串合法 = 跟随等级）。
    postJson(`${STATUS_API_PREFIX}/titles/switch`,
      (raw) => {
        const titleId = (raw as { titleId?: unknown } | null)?.titleId
        return typeof titleId === 'string' ? titleId : null
      },
      (titleId) => config.setTitle(titleId as string)),
    // shop/theme: { themeId: string }（空串合法 = 默认主题）。
    postJson(`${STATUS_API_PREFIX}/shop/theme`,
      (raw) => {
        const themeId = (raw as { themeId?: unknown } | null)?.themeId
        return typeof themeId === 'string' ? themeId : null
      },
      (themeId) => config.setTheme(themeId as string)),
    // daily-goal/set: { goal: number }（0 = 关闭；缺省 0）。
    postJson(`${STATUS_API_PREFIX}/daily-goal/set`,
      (raw) => {
        const goal = (raw as { goal?: unknown } | null)?.goal
        return typeof goal === 'number' ? goal : 0
      },
      (goal) => config.setDailyGoal(goal as number)),
    // pass/claim: { tierId: string }（空 → 400）。
    postJson(`${STATUS_API_PREFIX}/pass/claim`,
      (raw) => {
        const tierId = (raw as { tierId?: unknown } | null)?.tierId
        return typeof tierId === 'string' && tierId !== '' ? tierId : null
      },
      (tierId) => config.claimPass(tierId as string),
      { badRequestError: 'invalid-tier-id' }),
    // ui-settings: 整体替换（sanitize 在 host 侧）。
    postJson(`${STATUS_API_PREFIX}/ui-settings`,
      (raw) => raw,
      (raw) => config.saveUiSettings(raw)),
  ]
}