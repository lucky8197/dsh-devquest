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
    readonly 'dq.earned': "已解锁";
    readonly 'dq.notEarned': "未解锁";
    readonly 'dq.hiddenHint': "隐藏成就，解锁后可见";
    readonly 'dq.nextMilestone': "最近的里程碑 · {name}";
    readonly 'dq.progress': "进度";
    readonly 'dq.turnDone': "回合结算";
    readonly 'dq.levelUp': "升级！Lv.{level}";
    readonly 'dq.levelUpTo': "新称号 · {title}";
    readonly 'dq.turnStats': "完成 {turns} 个回合";
    readonly 'dq.chestReady': "领取全清宝箱 +{xp} XP";
    readonly 'dq.chestClaiming': "领取中…";
    readonly 'dq.chestClaimed': "全清宝箱已领取";
    readonly 'dq.tutorial': "新手任务";
    readonly 'dq.tutorialDone': "已完成全部新手任务";
    readonly 'dq.tutorialTitle': "专属称号 · {title}";
    readonly 'dq.tutorialStepDone': "{n}/{m} 步";
    readonly 'dq.levelSince': "本等级已 {days} 天";
    readonly 'dq.seasonSprint': "赛季冲刺";
    readonly 'dq.seasonDaysLeft': "剩 {days} 天";
    readonly 'dq.seasonGoal': "赛季输出 {tokens} / {goal}";
    readonly 'dq.report': "成长周报";
    readonly 'dq.report7d': "最近 7 天";
    readonly 'dq.reportXp': "{xp} XP";
    readonly 'dq.shop': "商店";
    readonly 'dq.shopBalance': "赛季货币 {balance}";
    readonly 'dq.shopBuy': "购买";
    readonly 'dq.shopConfirm': "确认购买？";
    readonly 'dq.shopOwned': "已拥有";
    readonly 'dq.shopNoBalance': "赛季货币不足";
    readonly 'dq.shopBought': "购买成功";
    readonly 'dq.shopReroll': "重掷任务";
    readonly 'dq.shopShields': "保险 ×{n}";
    readonly 'dq.shopRerolls': "重掷 ×{n}";
    readonly 'dq.hiddenNear': "接近解锁的隐藏成就";
    readonly 'dq.rarity.common': "普通";
    readonly 'dq.rarity.rare': "稀有";
    readonly 'dq.rarity.epic': "史诗";
    readonly 'dq.rarity.legendary': "传说";
    readonly 'dq.collections': "分类收藏";
    readonly 'dq.collectionDone': "已集齐";
    readonly 'dq.collectionProgress': "{n}/{m}";
    readonly 'dq.collectionReward': "集齐奖励 +{xp} XP";
    readonly 'dq.lucky': "每日幸运";
    readonly 'dq.luckyDraw': "🎁 今日幸运抽奖";
    readonly 'dq.luckyClaimed': "今日已抽";
    readonly 'dq.luckyResult': "抽到：{label}";
    readonly 'dq.nextTitle': "距 {name}（Lv.{level}）还差 {xp} XP";
    readonly 'dq.export': "导出存档";
    readonly 'dq.import': "导入存档";
    readonly 'dq.exported': "存档已导出";
    readonly 'dq.imported': "存档已导入";
    readonly 'dq.importFailed': "导入失败：存档格式无效";
    readonly 'dq.counters': "计数";
};
declare const en: Record<keyof typeof zh, string>;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'devquest': keyof typeof zh;
    }
}
export { zh, en };
