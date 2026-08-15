/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（host 解析「最近活跃会话」的项目目录）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { type ReactElement } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createDevQuestStore } from './store.ts';
import { NS } from './locales.ts';
export type DevQuestFooterActionProps = PropsRuntime<'sidebar.footer.action'> & PropsStore<ReturnType<typeof createDevQuestStore>> & PropsLocale<typeof NS>;
export type DevQuestOverlayProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createDevQuestStore>> & PropsLocale<typeof NS>;
/** 面板卡片（overlay 内容，可拖拽定位）。 */
export declare function DevQuestPanelCard(props: Pick<DevQuestFooterActionProps, 'useStore' | 'actions' | 't'>): ReactElement;
/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
export declare function DevQuestFooterAction(props: DevQuestFooterActionProps): ReactElement;
/** shell.overlay：浮动面板 + toast 栈。 */
export declare function DevQuestOverlay(props: DevQuestOverlayProps): ReactElement;
