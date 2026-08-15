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
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "devquest";
export declare const inject: readonly ["fs", "sessions", "tools"];
/** 插件配置。 */
export interface Config {
    /** 存档根目录（缺省 ~/.dsh/devquest）。 */
    dataDir?: string;
    /** 赛季名（缺省 2026-S1）。 */
    season?: string;
    /** 浏览器面板不带 cwd 参数时使用的默认目录（缺省进程启动目录）。 */
    defaultCwd?: string;
    /** 状态接口缓存时长（毫秒）。默认 60000。 */
    cacheTtlMs?: number;
}
export declare function apply(ctx: Context, config?: Config): void;
