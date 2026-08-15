/**
 * DevQuest 事件监听：订阅 `session/event`，按 (sessionId, seq) 幂等去重，
 * 把会话事件归一化为 Action 流。监听器绝不抛出——任何异常只记录，
 * 不影响 session 提交（session/event 为 fire-and-forget 的 append feed）。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session'
import type { Action } from './types.ts'

/** 单会话聚合上下文：动作缓冲 + 已见水位（内存，防同进程重复投递）。 */
export interface SessionAggregate {
  sessionId: string
  actions: Action[]
  /** 已投递的最大 seq（同步判定，重启后由存档水位兜底）。 */
  seenSeq: number
  /** callId → 工具名（tool/result 失败时与 tool/call 配对）。 */
  toolNames: Map<string, string>
}

/**
 * 订阅 session/event，逐事件去重并归一化，回调收到 (session, aggregate, action)。
 * 返回取消订阅函数（随 ctx 生命周期自动清理）。
 */
export function watchEvents(
  ctx: Context,
  onAction: (session: Session, agg: SessionAggregate, action: Action) => void,
): () => void {
  const aggregates = new Map<string, SessionAggregate>()

  const dispose = ctx.on('session/event', (session: Session, event: SessionEvent) => {
    const sessionId = String(session.id)
    let agg = aggregates.get(sessionId)
    if (agg === undefined) {
      agg = { sessionId, actions: [], seenSeq: 0, toolNames: new Map() }
      aggregates.set(sessionId, agg)
    }
    // 同进程内按 seq 单调去重（重启后由存档水位兜底）。
    if (event.seq <= agg.seenSeq) return
    agg.seenSeq = event.seq

    try {
      const action = normalize(event, agg)
      if (action === null) return
      agg.actions.push(action)
      onAction(session, agg, action)
    } catch (error) {
      // 监听器绝不抛出：只记录，不影响 session 提交。
      console.error('[devquest] event error:', error)
    }
  })

  return dispose
}

/**
 * 归一化：SessionEvent → Action | null。
 * 事件载荷按本机 DSH 版本实测（dsh-session types.d.ts）。
 */
function normalize(event: SessionEvent, agg: SessionAggregate): Action | null {
  switch (event.type) {
    case 'turn/end': {
      const reason = event.data.reason
      switch (reason.kind) {
        case 'completed':
          return { kind: 'turn-completed', turn: event.data.turn }
        case 'error':
          return { kind: 'turn-failed', turn: event.data.turn }
        case 'aborted':
        case 'blocked':
        case 'max-tokens':
        case 'interrupted':
          return { kind: 'turn-aborted', turn: event.data.turn }
        default:
          return null // 未知 reason（merge-extensible）：安全跳过
      }
    }
    case 'tool/call': {
      agg.toolNames.set(String(event.data.callId), event.data.name)
      return { kind: 'tool-call', tool: event.data.name }
    }
    case 'tool/result': {
      // 工具失败：与 tool/call 配对取工具名（callId 在 message.source 上）。
      if (event.data.error !== undefined) {
        const tool = agg.toolNames.get(String(event.data.message.source.callId)) ?? '?'
        return { kind: 'tool-failed', tool }
      }
      return null
    }
    case 'todo/write': {
      const todos = event.data.todos
      const newly = todos.filter(t => t.status === 'completed').length
      if (newly <= 0) return null
      const allCompleted = todos.length > 0 && todos.every(t => t.status === 'completed')
      return { kind: 'todo-completed', count: newly, allCompleted }
    }
    case 'assistant/message': {
      const usage = event.data.usage
      if (usage === undefined) return null
      // TokenUsage：inputTokens + outputTokens（本机版本无 totalTokens）。
      const tokens = usage.inputTokens + usage.outputTokens
      if (tokens <= 0) return null
      return { kind: 'tokens', tokens }
    }
    case 'user/message': {
      const source = event.data.source
      if (typeof source === 'string' && source !== 'agent.inject') {
        return { kind: 'session-start', hourOfDay: new Date(event.time).getHours(), source }
      }
      return null
    }
    default:
      return null
  }
}
