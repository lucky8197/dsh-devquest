import { createDevQuestStore } from "./store.js";
import { DevQuestFooterAction, DevQuestOverlay } from "./DevQuestPanel.js";
import { NS, en, zh } from "./locales.js";
/** Required services. */
export const inject = ['slots', 'locale'];
/**
 * Client 插件体：注册字典、建共享 store、把两个入口装进插槽。
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'devquest: dictionaries');
    const store = createDevQuestStore();
    const t = ctx.locale.bind(NS);
    // 1. 侧边栏底部入口（Settings 旁）
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'devquest',
        order: 10,
        label: () => t('dq.open'),
        store,
        locale: NS,
    }, DevQuestFooterAction));
    // 2. 浮动面板 + 成就 toast（常驻轮询，面板可开关）
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'devquest-panel',
        order: 20,
        store,
        locale: NS,
    }, DevQuestOverlay));
}
