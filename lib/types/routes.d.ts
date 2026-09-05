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
    /** 购买商店商品；返回是否成功、原因与最新状态。 */
    buy: (itemId: string) => Promise<{
        ok: boolean;
        reason?: string;
        status: DevQuestStatus;
    }>;
    /** 使用任务重掷；返回是否成功与最新状态。 */
    reroll: () => Promise<{
        ok: boolean;
        status: DevQuestStatus;
    }>;
    /** 每日幸运抽奖；返回是否成功、奖励与最新状态。 */
    lucky: () => Promise<{
        ok: boolean;
        reward?: {
            kind: string;
            amount?: number;
            count?: number;
            label: string;
        };
        status: DevQuestStatus;
    }>;
    /** 导出完整存档 JSON。 */
    exportSave: () => Promise<object>;
    /** 导入存档（覆盖）；返回是否成功与最新状态。 */
    importSave: (raw: unknown) => Promise<{
        ok: boolean;
        error?: string;
        status: DevQuestStatus;
    }>;
    /** 切换展示称号；返回是否成功与最新状态。 */
    setTitle: (titleId: string) => Promise<{
        ok: boolean;
        status: DevQuestStatus;
    }>;
    /** 切换已拥有主题（空字符串=默认主题）；返回是否成功与最新状态。 */
    setTheme: (themeId: string) => Promise<{
        ok: boolean;
        status: DevQuestStatus;
    }>;
    /** 领取每周全清奖励；返回是否成功、奖励 XP 与最新状态。 */
    claimWeeklyBonus: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** 使用任务跳过卡；返回是否成功与最新状态。 */
    useQuestSkip: () => Promise<{
        ok: boolean;
        status: DevQuestStatus;
    }>;
    /** 领取赛季通行证档位奖励；返回是否成功、奖励 XP 与最新状态。 */
    claimPass: (tierId: string) => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** v1.3.0 设定每日 XP 目标（0=关闭）；返回是否成功与最新状态。 */
    setDailyGoal: (goal: number) => Promise<{
        ok: boolean;
        status: DevQuestStatus;
    }>;
    /** v1.3.0 领取每日目标奖励；返回是否成功、奖励 XP 与最新状态。 */
    claimDailyGoal: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** v1.3.0 领取每周 BOSS 掉落；返回是否成功、奖励货币与最新状态。 */
    claimWeeklyBoss: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** v1.4.0 结算随机事件卡抉择（eventId + option）；返回是否成功、XP 变化与最新状态。 */
    resolveEvent: (eventId: string, option: number) => Promise<{
        ok: boolean;
        gained: number;
        label: string;
        status: DevQuestStatus;
    }>;
    /** v1.4.0 领史诗任务链终章奖励；返回是否成功、奖励 XP 与最新状态。 */
    claimChainReward: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** v1.4.0 领幽灵竞速奖励（击败上周的自己）；返回是否成功、奖励 XP 与最新状态。 */
    claimGhostReward: () => Promise<{
        ok: boolean;
        gained: number;
        status: DevQuestStatus;
    }>;
    /** 读 UI 设置（host 权威存储；无文件返回 null）。 */
    uiSettings: () => Promise<unknown | null>;
    /** 保存 UI 设置（整体替换 + sanitize）；返回保存后的设置。 */
    saveUiSettings: (raw: unknown) => Promise<unknown>;
    /** 结果缓存时长（毫秒）。默认 60s。 */
    cacheTtlMs?: number;
}
/** 构造 DevQuest 状态路由（含 60s 缓存与 in-flight 复用）。 */
export declare function makeDevQuestRoutes(config: DevQuestRoutesConfig): WebRoute[];
