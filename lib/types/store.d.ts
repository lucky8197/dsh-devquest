import type { Context } from '@deepseek-ai/cordis';
import type { SaveData } from './types.ts';
/** 存档配置（来自插件 Config 的 dataDir / season）。 */
export interface StoreConfig {
    dataDir?: string;
    season?: string;
}
/** 存档根目录。 */
export declare function dataRoot(config: StoreConfig): string;
/** 项目作用域键：有 cwd 用 cwd，无 cwd 的会话共用 '<none>'。 */
export declare function scopeKey(cwd: string | undefined): string;
/** cwd → 存档文件名（sha1 前缀，防路径字符问题）。 */
export declare function hashScope(cwd: string): string;
/** 存档文件绝对路径。 */
export declare function savePath(config: StoreConfig, cwd: string | undefined): string;
/** 读存档；不存在或损坏时返回全新存档。 */
export declare function loadSave(ctx: Context, config: StoreConfig, cwd: string | undefined): Promise<SaveData>;
/** 写存档（原子替换）。save.cwd 已存作用域键（cwd 或 '<none>'）。 */
export declare function persistSave(ctx: Context, config: StoreConfig, save: SaveData): Promise<void>;
/** 删除存档（reset 用）。不存在时静默成功。 */
export declare function deleteSave(ctx: Context, config: StoreConfig, cwd: string | undefined): Promise<boolean>;
