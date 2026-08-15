/**
 * DevQuest 浏览器半区：注册侧边栏入口 + 浮动面板/toast，双语字典。
 *
 * 插槽（按本机实时 Slot 树实测）：
 * - `sidebar.footer.action`：侧边栏底部操作位（list/root，无替换风险）→ 入口按钮
 * - `shell.overlay`：全屏浮层（list/root，无替换风险）→ 面板卡片 + 成就 toast 栈
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services. */
export declare const inject: string[];
export type { DevQuestFooterActionProps, DevQuestOverlayProps } from './DevQuestPanel.tsx';
export type { DevQuestUiState } from './store.ts';
/**
 * Client 插件体：注册字典、建共享 store、把两个入口装进插槽。
 */
export declare function apply(ctx: ClientContext): void;
