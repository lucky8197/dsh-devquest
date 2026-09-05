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
export interface SaveWriter {
    /** 投递新的存档快照（合并节流，记录最新；不阻塞调用方）。 */
    save(next: SaveData): void;
    /** 立即把最新快照落盘（含尚未到期的 pending），返回写完成。 */
    flush(): Promise<void>;
    /** 丢弃未落盘的 pending 快照（reset 语义：不写旧档）。 */
    discard(): void;
}
/**
 * 创建节流写盘器：多次 save 在 delayMs 内合并为最后一次写，
 * 串行化写链（后写不越过前写）。写失败记录，快照回退待下次重试。
 * 缺省 delayMs = 250（毫秒）。
 */
export declare function createSaveWriter(ctx: Context, config: StoreConfig, delayMs?: number): SaveWriter;
/** 重置全局存档（reset 用）。不存在时静默成功。 */
export declare function deleteSave(ctx: Context, config: StoreConfig): Promise<boolean>;
export interface UiSettings {
    fontSize: number;
    compact: boolean;
    toastFilter: 'all' | 'rare' | 'off';
    sound: boolean;
    notify: boolean;
}
export declare const DEFAULT_UI_SETTINGS: UiSettings;
/** UI 设置文件绝对路径。 */
export declare function settingsPath(config: StoreConfig): string;
/** 校验并补全设置对象（未知/越界字段回落默认，保证写出的永远是合法形状）。 */
export declare function sanitizeUiSettings(raw: unknown): UiSettings;
/** 读 UI 设置；文件不存在/损坏返回 null（调用方决定迁移或默认）。 */
export declare function loadUiSettings(ctx: Context, config: StoreConfig): Promise<UiSettings | null>;
/** 写 UI 设置（原子替换）。 */
export declare function saveUiSettings(ctx: Context, config: StoreConfig, settings: UiSettings): Promise<void>;
