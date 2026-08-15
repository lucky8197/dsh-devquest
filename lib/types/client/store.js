/**
 * DevQuest 浏览器侧 store：面板开关 + 状态快照 + 成就 toast 队列。
 * 由 apply 创建共享 handle，footer 按钮与 overlay 面板共用。
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/** 创建 store handle（apply 世界内调用，绝不在模块顶层）。 */
export function createDevQuestStore() {
    return defineStore({
        init: () => ({
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
                draft.state = state;
                draft.error = error;
            },
            setOpen: (draft, open) => {
                draft.open = open;
            },
            setStatus: (draft, status) => {
                const unlockedIds = status.achievements
                    .filter(a => a.unlocked)
                    .map(a => a.id);
                const isFirstLoad = draft.status === null;
                if (!isFirstLoad) {
                    for (const id of unlockedIds) {
                        if (draft.seen.includes(id))
                            continue;
                        draft.toasts.push({ id: `${id}-${Date.now()}`, achievementId: id, at: Date.now() });
                    }
                }
                draft.seen = Array.from(new Set([...draft.seen, ...unlockedIds]));
                draft.status = status;
                draft.state = 'ready';
                draft.error = null;
                draft.refreshedAt = Date.now();
            },
            dismissToast: (draft, id) => {
                draft.toasts = draft.toasts.filter(t => t.id !== id);
            },
        },
    });
}
