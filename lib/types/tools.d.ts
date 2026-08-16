import type { Context } from '@deepseek-ai/cordis';
import type { DevQuestStatus } from './types.ts';
/** 工具依赖（由 index.ts 提供）。 */
export interface DevQuestToolDeps {
    /** 查询全局玩家状态（跨会话/跨项目）。 */
    status: () => Promise<DevQuestStatus>;
    /** 重置全局玩家存档（确认后才执行）。 */
    reset: () => Promise<{
        ok: boolean;
        reset: boolean;
    }>;
    /** 购买商店商品（用赛季货币）。 */
    buy: (itemId: string) => Promise<{
        ok: boolean;
        reason?: string;
        status: DevQuestStatus;
    }>;
}
/** 状态渲染为人类可读文本。 */
export declare function renderStatus(status: DevQuestStatus, detail: 'summary' | 'full'): string;
/** 注册三个 DevQuest 工具。 */
export declare function registerDevQuestTools(ctx: Context, deps: DevQuestToolDeps): void;
