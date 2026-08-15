import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { DevQuestStatus } from './types.ts';
/** 浏览器侧 API 前缀。 */
export declare const STATUS_API_PREFIX = "/api/devquest";
/** 路由依赖。 */
export interface DevQuestRoutesConfig {
    /** 取全局玩家状态（读档 + 组装视图）。 */
    status: () => Promise<DevQuestStatus>;
    /** 领取每日全清宝箱；返回是否成功、奖励 XP 与最新状态。 */
    claimChest: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** 结果缓存时长（毫秒）。默认 60s。 */
    cacheTtlMs?: number;
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export declare function makeDevQuestRoutes(config: DevQuestRoutesConfig): WebRoute[];
