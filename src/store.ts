/**
 * DevQuest 存档读写（ctx.fs，与 sandbox 一致，不直接用 node fs）。
 * 存档路径：<dataDir>/<cwd-hash>.json，dataDir 缺省 ~/.dsh/devquest。
 * writeText 后端会自动创建父目录（dsh-fs-local）。
 */
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import { freshSave, migrateSave } from './engine.ts'
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

/** 项目作用域键：有 cwd 用 cwd，无 cwd 的会话共用 '<none>'。 */
export function scopeKey(cwd: string | undefined): string {
  return cwd !== undefined && cwd.trim() !== '' ? cwd : '<none>'
}

/** cwd → 存档文件名（sha1 前缀，防路径字符问题）。 */
export function hashScope(cwd: string): string {
  return createHash('sha1').update(cwd).digest('hex').slice(0, 20)
}

/** 存档文件绝对路径。 */
export function savePath(config: StoreConfig, cwd: string | undefined): string {
  return join(dataRoot(config), `${hashScope(scopeKey(cwd))}.json`)
}

/** 读存档；不存在或损坏时返回全新存档。 */
export async function loadSave(ctx: Context, config: StoreConfig, cwd: string | undefined): Promise<SaveData> {
  const file = savePath(config, cwd)
  try {
    const target = await ctx.fs.resolve(file)
    const info = await ctx.fs.stat(target)
    if (info === undefined) return freshSave(scopeKey(cwd), config.season)
    const text = await ctx.fs.readText(target)
    const parsed: unknown = JSON.parse(text)
    return migrateSave(parsed as Partial<SaveData>, scopeKey(cwd), config.season)
  } catch (error) {
    // 解析失败/IO 异常：退化为全新存档，绝不阻断会话。
    console.error(`[devquest] load save failed (${file}):`, error)
    return freshSave(scopeKey(cwd), config.season)
  }
}

/** 写存档（原子替换）。save.cwd 已存作用域键（cwd 或 '<none>'）。 */
export async function persistSave(ctx: Context, config: StoreConfig, save: SaveData): Promise<void> {
  const file = savePath(config, save.cwd)
  const target = await ctx.fs.resolve(file)
  await ctx.fs.writeText(target, JSON.stringify(save, null, 2))
}

/** 删除存档（reset 用）。不存在时静默成功。 */
export async function deleteSave(ctx: Context, config: StoreConfig, cwd: string | undefined): Promise<boolean> {
  const file = savePath(config, cwd)
  try {
    const target = await ctx.fs.resolve(file)
    const info = await ctx.fs.stat(target)
    if (info === undefined) return false
    // ctx.fs 无删除 API（v1 只读子集之外仅写）；用空档覆盖作为可逆重置。
    await ctx.fs.writeText(target, JSON.stringify(freshSave(scopeKey(cwd), config.season), null, 2))
    return true
  } catch (error) {
    console.error(`[devquest] reset save failed (${file}):`, error)
    return false
  }
}

