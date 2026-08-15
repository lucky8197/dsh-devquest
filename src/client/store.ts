/**
 * DevQuest 浏览器侧 store：面板开关 + 状态快照 + 成就 toast 队列。
 * 由 apply 创建共享 handle，footer 按钮与 overlay 面板共用。
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { DevQuestStatus } from '../types.ts'

/** 一条成就解锁 toast。 */
export interface DevQuestToast {
  id: string
  achievementId: string
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
            draft.toasts.push({ id: `${id}-${Date.now()}`, achievementId: id, at: Date.now() })
          }
        }
        draft.seen = Array.from(new Set([...draft.seen, ...unlockedIds]))
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
