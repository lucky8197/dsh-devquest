/**
 * DevQuest 事件监听：订阅 `session/event`，按 (sessionId, seq) 幂等去重，
 * 把会话事件归一化为 Action 流。监听器绝不抛出——任何异常只记录，
 * 不影响 session 提交（session/event 为 fire-and-forget 的 append feed）。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import type { Action } from './types.ts';
/** 单会话聚合上下文：动作缓冲 + 已见水位（内存，防同进程重复投递）。 */
export interface SessionAggregate {
    sessionId: string;
    actions: Action[];
    /** 已投递的最大 seq（同步判定，重启后由存档水位兜底）。 */
    seenSeq: number;
    /** callId → 工具名（tool/result 失败时与 tool/call 配对）。 */
    toolNames: Map<string, string>;
    /**
     * 已计数的已完成 todo（按 content 指纹，v1.3.3 防重复计数）：
     * todo/write 是 whole-list 快照，同一已完成条目会在后续每次写入中重复出现，
     * 只把「先前未计数、本次变为已完成」的条目计入新增。
     */
    seenCompletedTodos: Set<string>;
}
/**
 * 订阅 session/event，逐事件去重并归一化，回调收到 (session, aggregate, action)。
 * 返回取消订阅函数（随 ctx 生命周期自动清理）。
 */
export declare function watchEvents(ctx: Context, onAction: (session: Session, agg: SessionAggregate, action: Action) => void): () => void;
