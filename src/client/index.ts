/**
 * DevQuest 浏览器半区：注册侧边栏入口 + 浮动面板/toast，双语字典。
 *
 * 插槽（按本机实时 Slot 树实测）：
 * - `sidebar.footer.action`：侧边栏底部操作位（list/root，无替换风险）→ 入口按钮
 * - `shell.overlay`：全屏浮层（list/root，无替换风险）→ 面板卡片 + 成就 toast 栈
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { createDevQuestStore } from './store.ts'
import { DevQuestFooterAction, DevQuestOverlay } from './DevQuestPanel.tsx'
import { NS, en, zh } from './locales.ts'

/** Required services. */
export const inject = ['slots', 'locale']

export type { DevQuestFooterActionProps, DevQuestOverlayProps } from './DevQuestPanel.tsx'
export type { DevQuestUiState } from './store.ts'

/**
 * Client 插件体：注册字典、建共享 store、把两个入口装进插槽。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'devquest: dictionaries')

  const store = createDevQuestStore()
  const t = ctx.locale.bind(NS)

  // 1. 侧边栏底部入口（Settings 旁）
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'devquest',
      order: 10,
      label: () => t('dq.open'),
      store,
      locale: NS,
    }, DevQuestFooterAction))

  // 2. 浮动面板 + 成就 toast（常驻轮询，面板可开关）
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({
      name: 'shell.overlay',
      id: 'devquest-panel',
      order: 20,
      store,
      locale: NS,
    }, DevQuestOverlay))
}
