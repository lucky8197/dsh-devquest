/**
 * DevQuest 模型工具：devquest_status / devquest_achievements / devquest_reset。
 * 依赖通过 deps 注入（index.ts 装配），保持本文件无引擎直接耦合。
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
/** 状态渲染为人类可读文本。 */
export function renderStatus(status, detail) {
    const { level, xp, xpToNext, title, season, seasonXp, counters } = status;
    const lines = [
        `⚔️ DevQuest — Lv.${level} ${title.zh}`,
        `   XP: ${xp} / ${xpToNext}（赛季 ${season} · 本赛季 ${seasonXp} XP，累计 ${counters.turnsCompleted} 回合 / ${counters.toolCalls} 次工具调用 / ${counters.todosCompleted} 个待办 / ${counters.tokensOut} tokens）`,
        `   连击: ${counters.consecutiveSuccess} · 今日回合: ${counters.completedToday} · 活跃: ${counters.streakDays} 天`,
    ];
    // 每日任务（summary 也展示：当天 3 个任务 + 进度）
    const quests = status.daily?.quests ?? [];
    if (quests.length > 0) {
        lines.push(`   📅 每日任务（${status.daily.date}）：`);
        for (const q of quests) {
            const mark = q.done ? '✅' : '⬜';
            const progress = Math.min(q.progress, q.goal);
            lines.push(`     ${mark} ${q.label.zh} ${progress}/${q.goal}（+${q.reward} XP）`);
        }
    }
    if (detail === 'full') {
        const unlocked = status.achievements.filter(a => a.unlocked);
        const locked = status.achievements.filter(a => !a.unlocked && !a.hidden);
        lines.push(`   已解锁 ${unlocked.length}/${status.achievements.length} 枚成就：`);
        for (const a of unlocked) {
            lines.push(`     ${a.icon} ${a.name.zh} ${a.name.en}（+${a.xp} XP）`);
        }
        if (locked.length > 0) {
            lines.push(`   未解锁（${locked.length}）：${locked.map(a => a.name.zh).join('、')}`);
        }
    }
    return lines.join('\n');
}
/** 注册三个 DevQuest 工具。 */
export function registerDevQuestTools(ctx, deps) {
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
            render: (_args, value) => [
                { type: 'text', text: renderStatus(value, _args.detail === 'full' ? 'full' : 'summary') },
            ],
        },
        async execute(args, exec) {
            const agentCwd = exec.agent
                ?.session?.header?.cwd;
            const status = await deps.status(agentCwd);
            return status;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'devquest_achievements',
        description: '列出 DevQuest 全部成就：名称/条件/是否已解锁/奖励 XP。',
        parameters: {},
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => {
                const list = value.achievements;
                const lines = list.map(a => {
                    const state = a.unlocked ? '✅' : a.hidden ? '🔒' : '⬜';
                    return `${state} ${a.icon} ${a.name.zh} ${a.name.en} — ${a.description.zh}（+${a.xp} XP）`;
                });
                return [{ type: 'text', text: lines.join('\n') }];
            },
        },
        async execute(_args, exec) {
            const agentCwd = exec.agent
                ?.session?.header?.cwd;
            const status = await deps.status(agentCwd);
            return { achievements: status.achievements };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'devquest_reset',
        description: '清空 DevQuest 存档（重置等级/XP/成就/计数）。危险操作，必须传 confirm=true。',
        parameters: {
            confirm: {
                type: 'boolean',
                description: '必须为 true 才会执行；false 只返回预览',
            },
            cwd: {
                type: 'string',
                description: '要重置的项目工作目录；缺省=当前 agent 会话 cwd',
            },
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [
                { type: 'text', text: String(value.message ?? '') },
            ],
        },
        async execute(args, exec) {
            const agentCwd = exec.agent
                ?.session?.header?.cwd;
            const target = args.cwd ?? agentCwd ?? '<none>';
            if (args.confirm !== true) {
                return { ok: false, message: `未确认：传入 confirm=true 才会清空存档（目标: ${target}）` };
            }
            const result = await deps.reset(target);
            return {
                ok: result.ok,
                message: result.reset
                    ? `✅ DevQuest 存档已重置（目标: ${target}）`
                    : `存档不存在或重置失败（目标: ${target}）`,
            };
        },
    }));
}
