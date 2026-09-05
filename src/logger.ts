/**
 * DevQuest 轻量日志通道：统一 `[devquest]` 前缀与 level 门控，
 * 替代散落的 console.log / console.error。
 *
 * 用法：模块级默认 logger（import { log }），或 createLogger(level) 定制。
 * level 缺省 'info'；debug 默认关闭，Config.logLevel = 'debug' 打开。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

export interface DevQuestLogger {
  debug(msg: string): void
  info(msg: string): void
  warn(msg: string): void
  error(msg: string, err?: unknown): void
}

/** 按 level 构造 logger（低于阈值的调用直接丢弃）。 */
export function createLogger(level: LogLevel = 'info'): DevQuestLogger {
  const enabled = (l: LogLevel): boolean => LEVEL_ORDER[l] >= LEVEL_ORDER[level]
  return {
    debug(msg: string): void {
      if (enabled('debug')) console.debug(`[devquest] ${msg}`)
    },
    info(msg: string): void {
      if (enabled('info')) console.log(`[devquest] ${msg}`)
    },
    warn(msg: string): void {
      if (enabled('warn')) console.warn(`[devquest] ${msg}`)
    },
    error(msg: string, err?: unknown): void {
      if (!enabled('error')) return
      if (err === undefined) console.error(`[devquest] ${msg}`)
      else console.error(`[devquest] ${msg}`, err)
    },
  }
}

/** 模块级默认 logger（各处共享；index.ts 可用 setGlobalLogLevel 调整）。 */
let globalLevel: LogLevel = 'info'
let globalLogger = createLogger(globalLevel)

/** 调整全局 logger 级别（Config.logLevel 生效）。 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLevel = level
  globalLogger = createLogger(level)
}

/** 全局共享 logger。 */
export const log: DevQuestLogger = {
  debug(msg: string): void { globalLogger.debug(msg) },
  info(msg: string): void { globalLogger.info(msg) },
  warn(msg: string): void { globalLogger.warn(msg) },
  error(msg: string, err?: unknown): void { globalLogger.error(msg, err) },
}