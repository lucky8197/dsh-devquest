/**
 * DevQuest 模型工具：devquest_status / devquest_achievements / devquest_reset。
 * 依赖通过 deps 注入（index.ts 装配），保持本文件无引擎直接耦合。
 */
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import type { DevQuestStatus } from './types.ts'

/** 工具依赖（由 index.ts 提供）。 */
export interface DevQuestToolDeps {
  /** 查询全局玩家状态（跨会话/跨项目）。 */
  status: () => Promise<DevQuestStatus>
  /** 重置全局玩家存档（确认后才执行）。 */
  reset: () => Promise<{ ok: boolean; reset: boolean }>
  /** 购买商店商品（用赛季货币）。 */
  buy: (itemId: string) => Promise<{ ok: boolean; reason?: string; status: DevQuestStatus }>
}

/** 状态渲染为人类可读文本。 */
export function renderStatus(status: DevQuestStatus, detail: 'summary' | 'full'): string {
  const { level, xp, xpToNext, title, season, seasonXp, counters } = status
  const lines = [
    `⚔️ DevQuest — Lv.${level} ${title.zh}`,
    `   XP: ${xp} / ${xpToNext}（赛季 ${season} · 本赛季 ${seasonXp} XP，累计 ${counters.turnsCompleted} 回合 / ${counters.toolCalls} 次工具调用 / ${counters.todosCompleted} 个待办 / ${counters.tokensOut} tokens）`,
    `   连击: ${counters.consecutiveSuccess} · 今日回合: ${counters.completedToday} · 活跃: ${counters.streakDays} 天`,
  ]
  // 每日任务（summary 也展示：当天 3 个任务 + 进度）
  const quests = status.daily?.quests ?? []
  if (quests.length > 0) {
    lines.push(`   📅 每日任务（${status.daily.date}）：`)
    for (const q of quests) {
      const mark = q.done ? '✅' : '⬜'
      const progress = Math.min(q.progress, q.goal)
      lines.push(`     ${mark} ${q.label.zh} ${progress}/${q.goal}（+${q.reward} XP）`)
    }
  }
  // 每周挑战
  const weeklyQuests = status.weekly?.quests ?? []
  if (weeklyQuests.length > 0) {
    lines.push(`   🗓️ 每周挑战（${status.weekly.week}）：`)
    for (const q of weeklyQuests) {
      const mark = q.done ? '✅' : '⬜'
      lines.push(`     ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`)
    }
    if (status.weekly.bonusReady) lines.push(`     🎁 周全清奖励可领取（+100 XP）`)
  }
  // 商店 + 当前主题皮肤
  const shop = status.shop
  if (shop !== undefined) {
    const activeTheme = shop.items.find(i => i.id === shop.theme)
    const themeText = shop.theme !== '' && activeTheme !== undefined
      ? `${activeTheme.icon} ${activeTheme.name.zh}`
      : '默认'
    lines.push(`   🛒 赛季货币: ${shop.balance} · 主题皮肤: ${themeText}`)
  }
  if (detail === 'full') {
    const unlocked = status.achievements.filter(a => a.unlocked)
    const locked = status.achievements.filter(a => !a.unlocked && !a.hidden)
    lines.push(`   已解锁 ${unlocked.length}/${status.achievements.length} 枚成就：`)
    for (const a of unlocked) {
      lines.push(`     ${a.icon} ${a.name.zh} ${a.name.en}（+${a.xp} XP）`)
    }
    if (locked.length > 0) {
      lines.push(`   未解锁（${locked.length}）：${locked.map(a => a.name.zh).join('、')}`)
    }
  }
  return lines.join('\n')
}

/** 注册三个 DevQuest 工具。 */
export function registerDevQuestTools(ctx: Context, deps: DevQuestToolDeps): void {
  ctx.tools.register(defineTool({
    name: 'devquest_status',
    description: '查询 DevQuest 开发游戏化进度：等级/XP/称号/计数器/成就。',
    parameters: {
      detail: {
        type: 'string',
        enum: ['summary', 'full'],
        description: 'summary=等级+XP+关键计数；full=含成就列表（默认 summary）',
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value: Record<string, JsonValue>) => [
        { type: 'text', text: renderStatus(value as unknown as DevQuestStatus, _args.detail === 'full' ? 'full' : 'summary') },
      ],
    },
    async execute(args): Promise<Record<string, JsonValue>> {
      const status = await deps.status()
      return status as unknown as Record<string, JsonValue>
    },
  }))

  ctx.tools.register(defineTool({
    name: 'devquest_achievements',
    description: '列出 DevQuest 全部成就：名称/条件/是否已解锁/奖励 XP。',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value: Record<string, JsonValue>) => {
        const list = value.achievements as unknown as DevQuestStatus['achievements']
        const lines = list.map(a => {
          const state = a.unlocked ? '✅' : a.hidden ? '🔒' : '⬜'
          return `${state} ${a.icon} ${a.name.zh} ${a.name.en} — ${a.description.zh}（+${a.xp} XP）`
        })
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(): Promise<Record<string, JsonValue>> {
      const status = await deps.status()
      return { achievements: status.achievements } as unknown as Record<string, JsonValue>
    },
  }))

  ctx.tools.register(defineTool({
    name: 'devquest_reset',
    description: '清空 DevQuest 全局存档（重置等级/XP/成就/计数，跨会话统一）。危险操作，必须传 confirm=true。',
    parameters: {
      confirm: {
        type: 'boolean',
        description: '必须为 true 才会执行；false 只返回预览',
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value: Record<string, JsonValue>) => [
        { type: 'text', text: String(value.message ?? '') },
      ],
    },
    async execute(args): Promise<Record<string, JsonValue>> {
      if (args.confirm !== true) {
        return { ok: false, message: '未确认：传入 confirm=true 才会清空 DevQuest 全局存档' }
      }
      const result = await deps.reset()
      return {
        ok: result.ok,
        message: result.reset
          ? '✅ DevQuest 全局存档已重置'
          : '存档不存在或重置失败',
      }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'devquest_shop',
    description: '查看 DevQuest 赛季商店余额/商品，或用赛季货币购买商品（连击保险 shield-1/shield-3、任务重掷 reroll-1、主题 theme-ember/frost/verdant、徽章 badge-crown/star）。',
    parameters: {
      buy: {
        type: 'string',
        description: '可选：要购买的商品 id（不传则只查看余额与商品列表）',
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value: Record<string, JsonValue>) => {
        const lines = [
          `💰 赛季货币: ${String(value.balance ?? 0)}`,
          ...(Array.isArray(value.itemsText)
            ? (value.itemsText as string[])
            : []),
          ...(value.result !== undefined ? [String(value.result)] : []),
        ]
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args): Promise<Record<string, JsonValue>> {
      const status = await deps.status()
      const balance = status.shop?.balance ?? 0
      const items = status.shop?.items ?? []
      const itemsText = items.map(i =>
        `${i.owned ? '✅' : '⬜'} ${i.icon} ${i.name.zh}（${i.id}）— ${i.price} 货币${i.owned ? '（已拥有）' : ''}`)
      if (typeof args.buy === 'string' && args.buy !== '') {
        const r = await deps.buy(args.buy)
        if (r.ok) return { balance: r.status.shop?.balance ?? 0, itemsText: (r.status.shop?.items ?? []).map(i => `${i.owned ? '✅' : '⬜'} ${i.icon} ${i.name.zh}（${i.id}）— ${i.price} 货币${i.owned ? '（已拥有）' : ''}`), result: `✅ 购买成功：${args.buy}` }
        const reason = r.reason === 'insufficient-balance'
          ? '赛季货币不足'
          : r.reason === 'already-owned'
            ? '已拥有该商品'
            : r.reason === 'unknown-item'
              ? '未知商品 id'
              : '购买失败'
        return { balance: r.status.shop?.balance ?? 0, itemsText, result: `❌ ${reason}` }
      }
      return { balance, itemsText }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'devquest_daily',
    description: '生成 DevQuest 每日/每周任务简报（纯文本，适合推送到 IM 渠道）：今日 3 个每日任务 + 本周 3 个每周挑战的进度与奖励。若用户要求把任务推送到飞书/QQ 等，调用本工具后用 de_channel_send 发送返回的 text。',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value: Record<string, JsonValue>) => [
        { type: 'text', text: String(value.text ?? '') },
      ],
    },
    async execute(): Promise<Record<string, JsonValue>> {
      const status = await deps.status()
      const lines: string[] = []
      lines.push(`⚔️ DevQuest 任务简报（Lv.${status.level} ${status.title.zh} · ${status.season}）`)
      // 每日任务
      const daily = status.daily?.quests ?? []
      if (daily.length > 0) {
        lines.push(`📅 今日任务（${status.daily.date}）：`)
        for (const q of daily) {
          const mark = q.done ? '✅' : '⬜'
          lines.push(`  ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`)
        }
        if (status.dailyChest?.ready === true) lines.push('  🎁 全清宝箱可领取 +50 XP！')
      }
      // 每周挑战
      const weekly = status.weekly?.quests ?? []
      if (weekly.length > 0) {
        lines.push(`🗓️ 本周挑战（${status.weekly.week}）：`)
        for (const q of weekly) {
          const mark = q.done ? '✅' : '⬜'
          lines.push(`  ${mark} ${q.label.zh} ${Math.min(q.progress, q.goal)}/${q.goal}（+${q.reward} XP）`)
        }
        if (status.weekly.bonusReady === true) lines.push('  🎁 全清周奖励可领取 +100 XP！')
      }
      if (status.lucky?.available === true) lines.push('🎁 今日幸运抽奖可抽！')
      return { text: lines.join('\n') }
    },
  }))
}
