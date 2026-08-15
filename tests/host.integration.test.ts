/**
 * DevQuest host 半区集成测试：用最小 fake ctx 驱动完整管线
 * （session/event → 归一化 → 回合结算 → 存档 → status 工具）。
 *
 * 依赖构建产物 lib/index.js（先 `npm run build`；无产物时测试自动跳过）。
 * 纯引擎单测见 tests/engine.test.ts。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const LIB = new URL('../lib/index.js', import.meta.url)

/** 加载构建产物；依赖缺失（如 CI 无 DSH 安装）时返回 null 以便测试跳过。 */
async function loadLib(): Promise<{ apply: (ctx: never, config: unknown) => void } | null> {
  if (!existsSync(LIB)) return null
  try {
    const mod = await import(LIB.href)
    if (typeof mod.apply !== 'function') return null
    return mod as never
  } catch {
    return null // lib/index.js 外部依赖（@deepseek-ai/dsh-tools 等）不可解析时跳过
  }
}

/** 内存文件系统（模拟 ctx.fs 的最小写子集）。 */
function memFs() {
  const files = new Map<string, string>()
  return {
    files,
    async resolve(path: string) { return { targetKey: path } },
    async stat(target: { targetKey: string }) {
      return files.has(target.targetKey) ? { exists: true } : undefined
    },
    async readText(target: { targetKey: string }) {
      const text = files.get(target.targetKey)
      if (text === undefined) throw new Error('not found')
      return text
    },
    async writeText(target: { targetKey: string }, content: string) {
      files.set(target.targetKey, content)
      return {}
    },
  }
}

/** 构造 fake Cordis ctx。 */
function fakeCtx() {
  const fs = memFs()
  const listeners = new Map<string, Set<(session: unknown, event: unknown) => void>>()
  const tools: Array<{ name: string; execute: (args: never, exec: never) => Promise<never>; render?: unknown }> = []
  const sessions = {
    get: () => undefined,
    list: () => [],
  }
  let routes: unknown[] = []
  const ctx = {
    fs,
    sessions,
    tools: { register: (def: never) => { tools.push(def as never); return () => undefined } },
    on: (name: string, cb: (session: unknown, event: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(cb)
      return () => listeners.get(name)?.delete(cb)
    },
    inject: (services: string[], fn: (httpCtx: unknown) => void) => {
      fn({
        webServer: {
          register: (route: unknown) => { routes = [...routes, route]; return () => undefined },
        },
        effect: (cb: () => unknown) => { cb() },
      })
      return () => undefined
    },
  } as never
  return { ctx, fs, listeners, tools, getRoutes: () => routes }
}

test('host 集成：事件流 → XP/存档 → status 工具', async (t) => {
  const module = await loadLib()
  if (module === null) {
    t.skip('缺少 lib/index.js 或其 DSH 依赖（先 npm run build）')
    return
  }
  const dir = mkdtempSync(join(tmpdir(), 'devquest-test-'))
  try {
    const env = fakeCtx()
    module.apply(env.ctx, { dataDir: dir, season: 'TEST-S1' })

    const session = { id: 'session-test-1', header: { cwd: 'C:/proj' } }
    const emit = [...env.listeners.get('session/event')!][0]!
    let seq = 0
    const event = (type: string, data: unknown) => ({ type, seq: ++seq, time: Date.now(), data })

    // 回合 1：工具调用 + todo 完成 + 输出 tokens + completed
    emit(session, event('turn/start', { turn: 1 }))
    emit(session, event('tool/call', { turn: 1, step: 1, callId: 'c1', name: 'edit', arguments: '{}' }))
    emit(session, event('assistant/message', { turn: 1, step: 1, message: { id: 'm1' }, usage: { inputTokens: 100, outputTokens: 12000 } }))
    emit(session, event('todo/write', { todos: [{ content: 'a', status: 'completed' }] }))
    emit(session, event('turn/end', { turn: 1, reason: { kind: 'completed' } }))

    // 等待异步结算
    await new Promise(r => setTimeout(r, 200))

    // 存档已落盘
    const files = [...env.fs.files.keys()]
    assert.equal(files.length, 1, '应生成一份存档')

    // status 工具可查
    const statusTool = env.tools.find(t => t.name === 'devquest_status')
    assert.ok(statusTool !== undefined, 'devquest_status 已注册')
    const status = await statusTool!.execute({ detail: 'summary' } as never, { agent: { session: { header: { cwd: 'C:/proj' } } } } as never) as unknown as {
      level: number; xp: number; counters: { turnsCompleted: number; toolCalls: number; todosCompleted: number; tokensOut: number }
    }
    // turn 10 + edit 2 + tokens 1 + todo 15 = 28
    assert.equal(status.counters.turnsCompleted, 1)
    assert.equal(status.counters.toolCalls, 1)
    assert.equal(status.counters.todosCompleted, 1)
    assert.equal(status.counters.tokensOut, 12100)
    assert.equal(status.xp, 28)
    assert.equal(status.level, 1)

    // 解锁 first_turn / first_edit / first_todo
    const achTool = env.tools.find(t => t.name === 'devquest_achievements')
    const ach = await achTool!.execute({} as never, { agent: { session: { header: { cwd: 'C:/proj' } } } } as never) as unknown as { achievements: Array<{ id: string; unlocked: boolean }> }
    const unlocked = ach.achievements.filter(a => a.unlocked).map(a => a.id)
    assert.ok(unlocked.includes('first_turn'))
    assert.ok(unlocked.includes('first_edit'))
    assert.ok(unlocked.includes('first_todo'))

    // 幂等：重放同一回合不重复计分
    emit(session, event('turn/start', { turn: 2 }))
    emit(session, event('tool/call', { turn: 2, step: 1, callId: 'c2', name: 'edit', arguments: '{}' }))
    emit(session, event('turn/end', { turn: 2, reason: { kind: 'completed' } }))
    await new Promise(r => setTimeout(r, 200))
    const replay = await statusTool!.execute({ detail: 'summary' } as never, { agent: { session: { header: { cwd: 'C:/proj' } } } } as never) as unknown as { xp: number }
    // 回合 2 是新回合（seq 继续），仍计分：28 + 10 + 2 = 40
    assert.equal(replay.xp, 40)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('host 集成：失败回合 + 幂等水位（重放跳过）', async (t) => {
  const module = await loadLib()
  if (module === null) {
    t.skip('缺少 lib/index.js 或其 DSH 依赖（先 npm run build）')
    return
  }
  const dir = mkdtempSync(join(tmpdir(), 'devquest-test-'))
  try {
    const makeEnv = () => fakeCtx()
    const applyPlugin = async (env: ReturnType<typeof fakeCtx>) => {
      module.apply(env.ctx, { dataDir: dir, season: 'TEST-S1' })
      return env
    }

    // 实例 A：处理回合 1（error，seq=1）
    const envA = await applyPlugin(makeEnv())
    const session = { id: 'session-test-2', header: { cwd: 'C:/proj2' } }
    const emitA = [...envA.listeners.get('session/event')!][0]!
    const errorEvent = { type: 'turn/end', seq: 1, time: Date.now(), data: { turn: 1, reason: { kind: 'error', error: { name: 'LlmError', code: 'E1' } } } }
    emitA(session, errorEvent)
    await new Promise(r => setTimeout(r, 200))

    const statusToolA = envA.tools.find(t => t.name === 'devquest_status')!
    const s1 = await statusToolA.execute({} as never, { agent: { session: { header: { cwd: 'C:/proj2' } } } } as never) as unknown as { counters: { turnsFailed: number; turnsCompleted: number } }
    assert.equal(s1.counters.turnsFailed, 1)
    assert.equal(s1.counters.turnsCompleted, 0)

    // 实例 B（模拟重启：内存清空）：重放同一 seq=1 事件 → 存档水位应跳过
    const envB = await applyPlugin(makeEnv())
    const emitB = [...envB.listeners.get('session/event')!][0]!
    emitB(session, errorEvent)
    await new Promise(r => setTimeout(r, 200))

    const statusToolB = envB.tools.find(t => t.name === 'devquest_status')!
    const s2 = await statusToolB.execute({} as never, { agent: { session: { header: { cwd: 'C:/proj2' } } } } as never) as unknown as { counters: { turnsFailed: number } }
    assert.equal(s2.counters.turnsFailed, 1, '重放不应重复计分')

    // 新事件（seq=2）正常计分
    emitB(session, { type: 'turn/end', seq: 2, time: Date.now(), data: { turn: 2, reason: { kind: 'error', error: { name: 'LlmError', code: 'E1' } } } })
    await new Promise(r => setTimeout(r, 200))
    const s3 = await statusToolB.execute({} as never, { agent: { session: { header: { cwd: 'C:/proj2' } } } } as never) as unknown as { counters: { turnsFailed: number } }
    assert.equal(s3.counters.turnsFailed, 2)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
