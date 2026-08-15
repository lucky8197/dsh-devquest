/**
 * DevQuest locale dictionaries（中英双语）。
 * 面板组件通过框架注入的 `t` seat 读取，key 域即本字典。
 */

export const NS = 'devquest'

const zh = {
  'dq.open': 'DevQuest 进度',
  'dq.level': 'Lv.{level}',
  'dq.xpToNext': '{xp} / {next} XP',
  'dq.season': '赛季 {season}',
  'dq.recent': '最近成就',
  'dq.wall': '成就墙',
  'dq.wallCount': '{n}/{m}',
  'dq.refresh': '刷新',
  'dq.loading': '加载中…',
  'dq.error': '加载失败',
  'dq.close': '关闭',
  'dq.empty': '暂无数据，完成一个回合试试',
  'dq.unlocked': '成就解锁！',
  'dq.cat.journey': '旅程',
  'dq.cat.crafting': '锻造',
  'dq.cat.quest': '使命',
  'dq.cat.time': '时光',
  'dq.cat.legend': '传奇',
  'dq.cat.egg': '彩蛋',
  'dq.updated': '更新于',
  'dq.turns': '{n} 回合',
  'dq.toolCalls': '{n} 次工具调用',
  'dq.todos': '{n} 个待办',
  'dq.tokens': '{n} tokens',
  'dq.consecutive': '连击 {n}',
  'dq.combo': '连击 {n}',
  'dq.streak': '活跃 {n} 天',
  'dq.daily': '每日任务',
  'dq.earned': '已解锁',
  'dq.notEarned': '未解锁',
  'dq.hiddenHint': '隐藏成就，解锁后可见',
  'dq.nextMilestone': '最近的里程碑 · {name}',
  'dq.progress': '进度',
  'dq.turnDone': '回合结算',
  'dq.levelUp': '升级！Lv.{level}',
  'dq.levelUpTo': '新称号 · {title}',
  'dq.turnStats': '完成 {turns} 个回合',
  'dq.chestReady': '领取全清宝箱 +{xp} XP',
  'dq.chestClaiming': '领取中…',
  'dq.chestClaimed': '全清宝箱已领取',
  'dq.counters': '计数',
} as const

const en: Record<keyof typeof zh, string> = {
  'dq.open': 'DevQuest progress',
  'dq.level': 'Lv.{level}',
  'dq.xpToNext': '{xp} / {next} XP',
  'dq.season': 'Season {season}',
  'dq.recent': 'Recent unlocks',
  'dq.wall': 'Achievement wall',
  'dq.wallCount': '{n}/{m}',
  'dq.refresh': 'Refresh',
  'dq.loading': 'Loading…',
  'dq.error': 'Failed to load',
  'dq.close': 'Close',
  'dq.empty': 'No data yet — finish a turn to start',
  'dq.unlocked': 'Achievement unlocked!',
  'dq.cat.journey': 'Journey',
  'dq.cat.crafting': 'Crafting',
  'dq.cat.quest': 'Quest',
  'dq.cat.time': 'Time',
  'dq.cat.legend': 'Legend',
  'dq.cat.egg': 'Eggs',
  'dq.updated': 'Updated',
  'dq.turns': '{n} turns',
  'dq.toolCalls': '{n} tool calls',
  'dq.todos': '{n} todos',
  'dq.tokens': '{n} tokens',
  'dq.consecutive': '{n} streak',
  'dq.combo': 'Combo {n}',
  'dq.streak': '{n} active days',
  'dq.daily': 'Daily quests',
  'dq.earned': 'Earned',
  'dq.notEarned': 'Locked',
  'dq.hiddenHint': 'Hidden — revealed on unlock',
  'dq.nextMilestone': 'Next milestone · {name}',
  'dq.progress': 'Progress',
  'dq.turnDone': 'Turn settled',
  'dq.levelUp': 'Level up! Lv.{level}',
  'dq.levelUpTo': 'New title · {title}',
  'dq.turnStats': 'Finished {turns} turn(s)',
  'dq.chestReady': 'Claim daily chest +{xp} XP',
  'dq.chestClaiming': 'Claiming…',
  'dq.chestClaimed': 'Daily chest claimed',
  'dq.counters': 'Counters',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'devquest': keyof typeof zh
  }
}

export { zh, en }
