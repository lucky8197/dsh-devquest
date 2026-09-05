/**
 * DevQuest 浏览器侧 store：面板开关 + 状态快照 + 成就 toast 队列。
 * 由 apply 创建共享 handle，footer 按钮与 overlay 面板共用。
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { DevQuestStatus, TurnSettlementEvent } from '../types.ts'

/** 一条解锁/结算 toast。 */
export interface DevQuestToast {
  id: string
  kind: 'achievement' | 'settlement'
  achievementId?: string
  settlement?: TurnSettlementEvent
  at: number
}

/** DevQuest UI 状态（组件只读快照）。 */
export interface DevQuestUiState {
  state: 'idle' | 'loading' | 'ready' | 'error'
  /** 面板是否打开。 */
  open: boolean
  status: DevQuestStatus | null
  error: string | null
  refreshedAt: number | null
  toasts: DevQuestToast[]
  /** 已见过的解锁成就 id（首拉种子，之后 diff 出 toast）。 */
  seen: string[]
  /** 已见过的结算事件 id（diff 出结算 toast）。 */
  seenSettlements: string[]
}

/** Store 写操作。 */
export type DevQuestUiActions = {
  setState: (draft: DevQuestUiState, state: DevQuestUiState['state'], error: string | null) => void
  setOpen: (draft: DevQuestUiState, open: boolean) => void
  /** 写入状态快照；非首次加载时 diff 新解锁成就 → 入 toast 队列。 */
  setStatus: (draft: DevQuestUiState, status: DevQuestStatus) => void
  dismissToast: (draft: DevQuestUiState, id: string) => void
}

/** 创建 store handle（apply 世界内调用，绝不在模块顶层）。 */
export function createDevQuestStore(): EngineStoreHandle<DevQuestUiState, DevQuestUiActions> {
  return defineStore({
    init: (): DevQuestUiState => ({
      state: 'idle',
      open: false,
      status: null,
      error: null,
      refreshedAt: null,
      toasts: [],
      seen: [],
      seenSettlements: [],
    }),
    actions: {
      setState: (draft, state, error) => {
        draft.state = state
        draft.error = error
      },
      setOpen: (draft, open) => {
        draft.open = open
      },
      setStatus: (draft, status) => {
        const unlockedIds = status.achievements
          .filter(a => a.unlocked)
          .map(a => a.id)
        const isFirstLoad = draft.status === null
        if (!isFirstLoad) {
          for (const id of unlockedIds) {
            if (draft.seen.includes(id)) continue
            draft.toasts.push({ id: `a-${id}-${Date.now()}`, kind: 'achievement', achievementId: id, at: Date.now() })
          }
          // 结算事件 diff：新事件 → 结算 toast（成就优先展示，结算紧随其后）。
          for (const ev of status.settlements ?? []) {
            if (draft.seenSettlements.includes(ev.id)) continue
            draft.toasts.push({ id: `s-${ev.id}`, kind: 'settlement', settlement: ev, at: Date.now() })
          }
        }
        draft.seen = Array.from(new Set([...draft.seen, ...unlockedIds]))
        draft.seenSettlements = Array.from(new Set([...draft.seenSettlements, ...(status.settlements ?? []).map(e => e.id)]))
        // v1.3.3：toast 栈上限（过滤隐藏项由 overlay 即时 dismiss，此处兜底防堆积）。
        draft.toasts = draft.toasts.slice(-16)
        draft.status = status
        draft.state = 'ready'
        draft.error = null
        draft.refreshedAt = Date.now()
      },
      dismissToast: (draft, id) => {
        draft.toasts = draft.toasts.filter(t => t.id !== id)
      },
    },
  })
}
