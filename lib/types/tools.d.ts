import type { Context } from '@deepseek-ai/cordis';
import type { DevQuestStatus } from './types.ts';
/** 工具依赖（由 index.ts 提供）。 */
export interface DevQuestToolDeps {
    /** 查询某 cwd（缺省=当前 agent 会话 cwd）的状态。 */
    status: (cwd?: string) => Promise<DevQuestStatus>;
    /** 清空某 cwd 的存档（确认后才执行）。 */
    reset: (cwd: string) => Promise<{
        ok: boolean;
        reset: boolean;
    }>;
}
/** 状态渲染为人类可读文本。 */
export declare function renderStatus(status: DevQuestStatus, detail: 'summary' | 'full'): string;
/** 注册三个 DevQuest 工具。 */
export declare function registerDevQuestTools(ctx: Context, deps: DevQuestToolDeps): void;
