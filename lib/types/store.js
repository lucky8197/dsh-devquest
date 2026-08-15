/**
 * DevQuest 存档读写（ctx.fs，与 sandbox 一致，不直接用 node fs）。
 *
 * v0.3：全局单一玩家存档 <dataDir>/player.json——所有会话/项目共享一份
 * 进度（跨会话）。旧版按项目隔离的 <cwd-hash>.json 存档在首次加载时
 * 自动合并进全局存档（不删除旧文件，可回退）。
 * writeText 后端会自动创建父目录（dsh-fs-local）。
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { freshSave, mergeSaves, migrateSave } from "./engine.js";
/** 存档根目录。 */
export function dataRoot(config) {
    return config.dataDir ?? join(homedir(), '.dsh', 'devquest');
}
/** 全局玩家作用域键（v0.3 起不再按项目隔离）。 */
export function scopeKey(_cwd) {
    return 'global';
}
/** 旧版 cwd → 存档文件名（sha1 前缀），仅用于识别/合并旧档。 */
export function hashScope(cwd) {
    return createHash('sha1').update(cwd).digest('hex').slice(0, 20);
}
/** 全局存档文件绝对路径。 */
export function savePath(config) {
    return join(dataRoot(config), 'player.json');
}
/** 旧档文件名匹配：20 位十六进制 + .json（旧版按 cwd hash 命名）。 */
function isLegacyFileName(name) {
    return /^[0-9a-f]{20}\.json$/.test(name);
}
/**
 * 迁移：扫描 dataDir 里的旧版分项目存档（<20hex>.json），合并为全局存档。
 * 没有旧档或读取失败时返回 null（调用方回退到全新存档）。
 */
async function migrateLegacySaves(ctx, config, now) {
    try {
        const dirTarget = await ctx.fs.resolve(dataRoot(config));
        const entries = await ctx.fs.listDir(dirTarget);
        const legacy = [];
        for (const entry of entries) {
            if (entry.type !== 'file' || !isLegacyFileName(entry.name))
                continue;
            try {
                const text = await ctx.fs.readText(entry.target);
                const parsed = JSON.parse(text);
                legacy.push(migrateSave(parsed, 'legacy', config.season));
            }
            catch {
                // 单个旧档损坏则跳过，不影响其余
            }
        }
        if (legacy.length === 0)
            return null;
        const merged = mergeSaves(legacy, now);
        console.log(`[devquest] 已合并 ${legacy.length} 份旧存档 → 全局玩家存档`);
        return merged;
    }
    catch {
        return null;
    }
}
/** 读全局存档；不存在时尝试合并旧档，都没有则返回全新存档。 */
export async function loadSave(ctx, config, _cwd) {
    const file = savePath(config);
    try {
        const target = await ctx.fs.resolve(file);
        const info = await ctx.fs.stat(target);
        if (info === undefined) {
            const merged = await migrateLegacySaves(ctx, config, Date.now());
            if (merged !== null)
                return merged;
            return freshSave(scopeKey(), config.season);
        }
        const text = await ctx.fs.readText(target);
        const parsed = JSON.parse(text);
        return migrateSave(parsed, scopeKey(), config.season);
    }
    catch (error) {
        // 解析失败/IO 异常：退化为全新存档，绝不阻断会话。
        console.error(`[devquest] load save failed (${file}):`, error);
        return freshSave(scopeKey(), config.season);
    }
}
/** 写全局存档（原子替换）。 */
export async function persistSave(ctx, config, save) {
    const target = await ctx.fs.resolve(savePath(config));
    await ctx.fs.writeText(target, JSON.stringify(save, null, 2));
}
/** 重置全局存档（reset 用）。不存在时静默成功。 */
export async function deleteSave(ctx, config) {
    const file = savePath(config);
    try {
        const target = await ctx.fs.resolve(file);
        const info = await ctx.fs.stat(target);
        if (info === undefined)
            return false;
        // ctx.fs 无删除 API（v1 只读子集之外仅写）；用空档覆盖作为可逆重置。
        await ctx.fs.writeText(target, JSON.stringify(freshSave(scopeKey(), config.season), null, 2));
        return true;
    }
    catch (error) {
        console.error(`[devquest] reset save failed (${file}):`, error);
        return false;
    }
}
