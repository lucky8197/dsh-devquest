/**
 * DevQuest 轻量日志通道：统一 `[devquest]` 前缀与 level 门控，
 * 替代散落的 console.log / console.error。
 *
 * 用法：模块级默认 logger（import { log }），或 createLogger(level) 定制。
 * level 缺省 'info'；debug 默认关闭，Config.logLevel = 'debug' 打开。
 */
const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };
/** 按 level 构造 logger（低于阈值的调用直接丢弃）。 */
export function createLogger(level = 'info') {
    const enabled = (l) => LEVEL_ORDER[l] >= LEVEL_ORDER[level];
    return {
        debug(msg) {
            if (enabled('debug'))
                console.debug(`[devquest] ${msg}`);
        },
        info(msg) {
            if (enabled('info'))
                console.log(`[devquest] ${msg}`);
        },
        warn(msg) {
            if (enabled('warn'))
                console.warn(`[devquest] ${msg}`);
        },
        error(msg, err) {
            if (!enabled('error'))
                return;
            if (err === undefined)
                console.error(`[devquest] ${msg}`);
            else
                console.error(`[devquest] ${msg}`, err);
        },
    };
}
/** 模块级默认 logger（各处共享；index.ts 可用 setGlobalLogLevel 调整）。 */
let globalLevel = 'info';
let globalLogger = createLogger(globalLevel);
/** 调整全局 logger 级别（Config.logLevel 生效）。 */
export function setGlobalLogLevel(level) {
    globalLevel = level;
    globalLogger = createLogger(level);
}
/** 全局共享 logger。 */
export const log = {
    debug(msg) { globalLogger.debug(msg); },
    info(msg) { globalLogger.info(msg); },
    warn(msg) { globalLogger.warn(msg); },
    error(msg, err) { globalLogger.error(msg, err); },
};
