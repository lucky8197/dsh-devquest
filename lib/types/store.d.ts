import type { Context } from '@deepseek-ai/cordis';
import type { SaveData } from './types.ts';
/** 存档配置（来自插件 Config 的 dataDir / season）。 */
export interface StoreConfig {
    dataDir?: string;
    season?: string;
}
/** 存档根目录。 */
export declare function dataRoot(config: StoreConfig): string;
/** 全局玩家作用域键（v0.3 起不再按项目隔离）。 */
export declare function scopeKey(_cwd?: string): string;
/** 旧版 cwd → 存档文件名（sha1 前缀），仅用于识别/合并旧档。 */
export declare function hashScope(cwd: string): string;
/** 全局存档文件绝对路径。 */
export declare function savePath(config: StoreConfig): string;
/** 读全局存档；不存在时尝试合并旧档，都没有则返回全新存档。 */
export declare function loadSave(ctx: Context, config: StoreConfig, _cwd?: string): Promise<SaveData>;
/** 写全局存档（原子替换）。 */
export declare function persistSave(ctx: Context, config: StoreConfig, save: SaveData): Promise<void>;
/** 重置全局存档（reset 用）。不存在时静默成功。 */
export declare function deleteSave(ctx: Context, config: StoreConfig): Promise<boolean>;
