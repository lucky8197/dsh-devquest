/**
 * DevQuest locale dictionaries（中英双语）。
 * 面板组件通过框架注入的 `t` seat 读取，key 域即本字典。
 */
export declare const NS = "devquest";
declare const zh: {
    readonly 'dq.open': "DevQuest 进度";
    readonly 'dq.level': "Lv.{level}";
    readonly 'dq.xpToNext': "{xp} / {next} XP";
    readonly 'dq.season': "赛季 {season}";
    readonly 'dq.recent': "最近成就";
    readonly 'dq.wall': "成就墙";
    readonly 'dq.wallCount': "{n}/{m}";
    readonly 'dq.refresh': "刷新";
    readonly 'dq.loading': "加载中…";
    readonly 'dq.error': "加载失败";
    readonly 'dq.close': "关闭";
    readonly 'dq.empty': "暂无数据，完成一个回合试试";
    readonly 'dq.unlocked': "成就解锁！";
    readonly 'dq.cat.journey': "旅程";
    readonly 'dq.cat.crafting': "锻造";
    readonly 'dq.cat.quest': "使命";
    readonly 'dq.cat.time': "时光";
    readonly 'dq.cat.legend': "传奇";
    readonly 'dq.cat.egg': "彩蛋";
    readonly 'dq.updated': "更新于";
    readonly 'dq.turns': "{n} 回合";
    readonly 'dq.toolCalls': "{n} 次工具调用";
    readonly 'dq.todos': "{n} 个待办";
    readonly 'dq.tokens': "{n} tokens";
    readonly 'dq.consecutive': "连击 {n}";
    readonly 'dq.combo': "连击 {n}";
    readonly 'dq.streak': "活跃 {n} 天";
    readonly 'dq.daily': "每日任务";
    readonly 'dq.counters': "计数";
};
declare const en: Record<keyof typeof zh, string>;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'devquest': keyof typeof zh;
    }
}
export { zh, en };
