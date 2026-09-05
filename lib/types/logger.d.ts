/**
 * DevQuest 轻量日志通道：统一 `[devquest]` 前缀与 level 门控，
 * 替代散落的 console.log / console.error。
 *
 * 用法：模块级默认 logger（import { log }），或 createLogger(level) 定制。
 * level 缺省 'info'；debug 默认关闭，Config.logLevel = 'debug' 打开。
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface DevQuestLogger {
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string, err?: unknown): void;
}
/** 按 level 构造 logger（低于阈值的调用直接丢弃）。 */
export declare function createLogger(level?: LogLevel): DevQuestLogger;
/** 调整全局 logger 级别（Config.logLevel 生效）。 */
export declare function setGlobalLogLevel(level: LogLevel): void;
/** 全局共享 logger。 */
export declare const log: DevQuestLogger;
