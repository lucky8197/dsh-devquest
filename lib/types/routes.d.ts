import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { DevQuestStatus } from './types.ts';
/** 浏览器侧 API 前缀。 */
export declare const STATUS_API_PREFIX = "/api/devquest";
/** 路由依赖。 */
export interface DevQuestRoutesConfig {
    /** 按 cwd 取状态（读档 + 组装视图）。 */
    status: (cwd: string) => Promise<DevQuestStatus>;
    /** 会话存储：`session=<id>` 参数存在时用它解析当前会话工作目录。 */
    sessions?: {
        get(id: string): {
            header: {
                cwd?: string;
            };
        } | undefined;
        list(): unknown[];
    };
    /** 默认目录（cwd/session 参数都缺省时使用）。 */
    defaultCwd?: string;
    /** 结果缓存时长（毫秒）。默认 60s。 */
    cacheTtlMs?: number;
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export declare function makeDevQuestRoutes(config: DevQuestRoutesConfig): WebRoute[];
