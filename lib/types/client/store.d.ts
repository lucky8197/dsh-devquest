import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
import type { DevQuestStatus, TurnSettlementEvent } from '../types.ts';
/** 一条解锁/结算 toast。 */
export interface DevQuestToast {
    id: string;
    kind: 'achievement' | 'settlement';
    achievementId?: string;
    settlement?: TurnSettlementEvent;
    at: number;
}
/** DevQuest UI 状态（组件只读快照）。 */
export interface DevQuestUiState {
    state: 'idle' | 'loading' | 'ready' | 'error';
    /** 面板是否打开。 */
    open: boolean;
    status: DevQuestStatus | null;
    error: string | null;
    refreshedAt: number | null;
    toasts: DevQuestToast[];
    /** 已见过的解锁成就 id（首拉种子，之后 diff 出 toast）。 */
    seen: string[];
    /** 已见过的结算事件 id（diff 出结算 toast）。 */
    seenSettlements: string[];
}
/** Store 写操作。 */
export type DevQuestUiActions = {
    setState: (draft: DevQuestUiState, state: DevQuestUiState['state'], error: string | null) => void;
    setOpen: (draft: DevQuestUiState, open: boolean) => void;
    /** 写入状态快照；非首次加载时 diff 新解锁成就 → 入 toast 队列。 */
    setStatus: (draft: DevQuestUiState, status: DevQuestStatus) => void;
    dismissToast: (draft: DevQuestUiState, id: string) => void;
};
/** 创建 store handle（apply 世界内调用，绝不在模块顶层）。 */
export declare function createDevQuestStore(): EngineStoreHandle<DevQuestUiState, DevQuestUiActions>;
