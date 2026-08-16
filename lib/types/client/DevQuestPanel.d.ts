/**
 * DevQuest 浏览器侧 UI：
 * - DevQuestFooterAction：侧边栏底部操作位（sidebar.footer.action）的入口按钮
 * - DevQuestOverlay：shell.overlay 里的浮动面板 + 成就解锁 toast 栈
 *
 * 数据源：GET /api/devquest/status（v0.3 起为全局玩家档，与 cwd/session 无关）。
 * 主题：跟随 DSH CSS 变量（--dsw-alias-*）。
 */
import { type ReactElement } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createDevQuestStore } from './store.ts';
import { NS } from './locales.ts';
export type DevQuestFooterActionProps = PropsRuntime<'sidebar.footer.action'> & PropsStore<ReturnType<typeof createDevQuestStore>> & PropsLocale<typeof NS>;
export type DevQuestOverlayProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createDevQuestStore>> & PropsLocale<typeof NS>;
export interface DevQuestSettings {
    /** 面板字号缩放（0.85 - 1.2）。 */
    fontSize: number;
    /** 紧凑模式：缩小间距/字号。 */
    compact: boolean;
    /** toast 过滤：all=全部；rare=仅稀有及以上；off=关闭。 */
    toastFilter: 'all' | 'rare' | 'off';
}
/** 面板卡片（overlay 内容，可拖拽定位）。refresh 由常驻 overlay 传入（页面加载即开始轮询）。 */
export declare function DevQuestPanelCard(props: Pick<DevQuestFooterActionProps, 'useStore' | 'actions' | 't'> & {
    refresh: () => void;
}): ReactElement;
/** 侧边栏底部操作位：DevQuest 入口按钮。wide=false（56px rail）时只显示图标+角标，避免被裁切。 */
export declare function DevQuestFooterAction(props: DevQuestFooterActionProps): ReactElement;
/** shell.overlay：浮动面板 + toast 栈。常驻挂载：页面加载即拉取全局状态并 60s 轮询，
 * 保证侧边栏等级与面板数据在打开面板前就已就绪。 */
export declare function DevQuestOverlay(props: DevQuestOverlayProps): ReactElement;
