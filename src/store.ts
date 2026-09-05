/**
 * DevQuest 存档读写（ctx.fs，与 sandbox 一致，不直接用 node fs）。
 *
 * v0.3：全局单一玩家存档 <dataDir>/player.json——所有会话/项目共享一份
 * 进度（跨会话）。旧版按项目隔离的 <cwd-hash>.json 存档在首次加载时
 * 自动合并进全局存档（不删除旧文件，可回退）。
 * writeText 后端会自动创建父目录（dsh-fs-local）。
 */
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { log } from './logger.ts'
import type {} from '@deepseek-ai/dsh-fs'
import { freshSave, mergeSaves, migrateSave } from './engine.ts'
import type { SaveData } from './types.ts'

/** 存档配置（来自插件 Config 的 dataDir / season）。 */
export interface StoreConfig {
  dataDir?: string
  season?: string
}

/** 存档根目录。 */
export function dataRoot(config: StoreConfig): string {
  return config.dataDir ?? join(homedir(), '.dsh', 'devquest')
}

/** 全局玩家作用域键（v0.3 起不再按项目隔离）。 */
export function scopeKey(_cwd?: string): string {
  return 'global'
}

/** 旧版 cwd → 存档文件名（sha1 前缀），仅用于识别/合并旧档。 */
export function hashScope(cwd: string): string {
  return createHash('sha1').update(cwd).digest('hex').slice(0, 20)
}

/** 全局存档文件绝对路径。 */
export function savePath(config: StoreConfig): string {
  return join(dataRoot(config), 'player.json')
}

/** 旧档文件名匹配：20 位十六进制 + .json（旧版按 cwd hash 命名）。 */
function isLegacyFileName(name: string): boolean {
  return /^[0-9a-f]{20}\.json$/.test(name)
}

/**
 * 迁移：扫描 dataDir 里的旧版分项目存档（<20hex>.json），合并为全局存档。
 * 没有旧档或读取失败时返回 null（调用方回退到全新存档）。
 */
async function migrateLegacySaves(ctx: Context, config: StoreConfig, now: number): Promise<SaveData | null> {
  try {
    const dirTarget = await ctx.fs.resolve(dataRoot(config))
    const entries = await ctx.fs.listDir(dirTarget)
    const legacy: SaveData[] = []
    for (const entry of entries) {
      if (entry.type !== 'file' || !isLegacyFileName(entry.name)) continue
      try {
        const text = await ctx.fs.readText(entry.target)
        const parsed: unknown = JSON.parse(text)
        legacy.push(migrateSave(parsed as Partial<SaveData>, 'legacy', config.season))
      } catch {
        // 单个旧档损坏则跳过，不影响其余
      }
    }
    if (legacy.length === 0) return null
    const merged = mergeSaves(legacy, now)
    log.info(`已合并 ${legacy.length} 份旧存档 → 全局玩家存档`)
    return merged
  } catch {
    return null
  }
}

/** 读全局存档；不存在时尝试合并旧档，都没有则返回全新存档。 */
export async function loadSave(ctx: Context, config: StoreConfig, _cwd?: string): Promise<SaveData> {
  const file = savePath(config)
  try {
    const target = await ctx.fs.resolve(file)
    const info = await ctx.fs.stat(target)
    if (info === undefined) {
      const merged = await migrateLegacySaves(ctx, config, Date.now())
      if (merged !== null) return merged
      return freshSave(scopeKey(), config.season)
    }
    const text = await ctx.fs.readText(target)
    const parsed: unknown = JSON.parse(text)
    return migrateSave(parsed as Partial<SaveData>, scopeKey(), config.season)
  } catch (error) {
    // 解析失败/IO 异常：退化为全新存档，绝不阻断会话。
    log.error(`load save failed (${file}):`, error)
    return freshSave(scopeKey(), config.season)
  }
}

/** 写全局存档（原子替换）。 */
export async function persistSave(ctx: Context, config: StoreConfig, save: SaveData): Promise<void> {
  const target = await ctx.fs.resolve(savePath(config))
  await ctx.fs.writeText(target, JSON.stringify(save, null, 2))
}

// ---------------------------------------------------------------------------
// 节流写盘：高频改动合并为一次写，避免每回合全量 JSON 写盘。
// 最终一致性：delayMs 窗口内只保留最新快照，flush() 强制立即落盘。
// ---------------------------------------------------------------------------

export interface SaveWriter {
  /** 投递新的存档快照（合并节流，记录最新；不阻塞调用方）。 */
  save(next: SaveData): void
  /** 立即把最新快照落盘（含尚未到期的 pending），返回写完成。 */
  flush(): Promise<void>
  /** 丢弃未落盘的 pending 快照（reset 语义：不写旧档）。 */
  discard(): void
}

/**
 * 创建节流写盘器：多次 save 在 delayMs 内合并为最后一次写，
 * 串行化写链（后写不越过前写）。写失败记录，快照回退待下次重试。
 * 缺省 delayMs = 250（毫秒）。
 */
export function createSaveWriter(ctx: Context, config: StoreConfig, delayMs = 250): SaveWriter {
  let latest: SaveData | null = null
  let timer: NodeJS.Timeout | null = null
  let chain: Promise<void> = Promise.resolve()

  /** 单次落盘：写 latest 快照；失败时快照回退（无更新则下次重试）。 */
  const writeOnce = async (): Promise<void> => {
    if (latest === null) return
    const snapshot = latest
    latest = null
    try {
      await persistSave(ctx, config, snapshot)
    } catch (error) {
      log.error(`persist save failed (${savePath(config)}):`, error)
      if (latest === null) latest = snapshot
      throw error
    }
  }

  /** 追加一次延迟写（已有定时器则合并——latest 已被覆盖，无需新调度）。 */
  const schedule = (): void => {
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      chain = chain.then(writeOnce).catch(() => undefined)
    }, delayMs)
  }

  return {
    save(next: SaveData): void {
      latest = next
      schedule()
    },
    async flush(): Promise<void> {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      chain = chain.then(writeOnce).catch(() => undefined)
      await chain.catch(() => undefined)
    },
    discard(): void {
      latest = null
    },
  }
}

/** 重置全局存档（reset 用）。不存在时静默成功。 */
export async function deleteSave(ctx: Context, config: StoreConfig): Promise<boolean> {
  const file = savePath(config)
  try {
    const target = await ctx.fs.resolve(file)
    const info = await ctx.fs.stat(target)
    if (info === undefined) return false
    // ctx.fs 无删除 API（v1 只读子集之外仅写）；用空档覆盖作为可逆重置。
    await ctx.fs.writeText(target, JSON.stringify(freshSave(scopeKey(), config.season), null, 2))
    return true
  } catch (error) {
    log.error(`reset save failed (${file}):`, error)
    return false
  }
}

// ---------------------------------------------------------------------------
// UI 设置（host 侧权威存储）：面板字号/紧凑/toast 过滤/音效/通知。
// 独立于玩家存档（settings.json），不随存档导入导出；浏览器 localStorage
// 仅作 client 启动快照——重启 DSH 后设置由本文件恢复，不依赖浏览器存储。
// ---------------------------------------------------------------------------

export interface UiSettings {
  fontSize: number
  compact: boolean
  toastFilter: 'all' | 'rare' | 'off'
  sound: boolean
  notify: boolean
}

export const DEFAULT_UI_SETTINGS: UiSettings = { fontSize: 1, compact: false, toastFilter: 'all', sound: true, notify: true }

/** UI 设置文件绝对路径。 */
export function settingsPath(config: StoreConfig): string {
  return join(dataRoot(config), 'settings.json')
}

/** 校验并补全设置对象（未知/越界字段回落默认，保证写出的永远是合法形状）。 */
export function sanitizeUiSettings(raw: unknown): UiSettings {
  const p = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<UiSettings>
  return {
    fontSize: typeof p.fontSize === 'number' && p.fontSize >= 0.85 && p.fontSize <= 1.2 ? p.fontSize : DEFAULT_UI_SETTINGS.fontSize,
    compact: p.compact === true,
    toastFilter: p.toastFilter === 'rare' || p.toastFilter === 'off' ? p.toastFilter : 'all',
    sound: p.sound !== false,
    notify: p.notify !== false,
  }
}

/** 读 UI 设置；文件不存在/损坏返回 null（调用方决定迁移或默认）。 */
export async function loadUiSettings(ctx: Context, config: StoreConfig): Promise<UiSettings | null> {
  try {
    const target = await ctx.fs.resolve(settingsPath(config))
    const info = await ctx.fs.stat(target)
    if (info === undefined) return null
    const text = await ctx.fs.readText(target)
    return sanitizeUiSettings(JSON.parse(text) as unknown)
  } catch (error) {
    log.error(`load ui settings failed (${settingsPath(config)}):`, error)
    return null
  }
}

/** 写 UI 设置（原子替换）。 */
export async function saveUiSettings(ctx: Context, config: StoreConfig, settings: UiSettings): Promise<void> {
  const target = await ctx.fs.resolve(settingsPath(config))
  await ctx.fs.writeText(target, JSON.stringify(settings, null, 2))
}
