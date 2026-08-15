#!/usr/bin/env node
/**
 * setup-dsh-deps — 把本插件的开发依赖指向本机 DSH 安装。
 *
 * 插件源码 import 的 `@deepseek-ai/*` 与 `cordis` 类型来自 DSH 安装
 * （workspace 包 + vendored 框架），不在 npm 上。本脚本：
 *
 * 1. 定位 DSH 安装（`dsh` 在 PATH 时从 bin 反推；否则用 --checkout；
 *    再否则尝试 DSH_HOME/source/current 等常见位置）。同时支持两种布局：
 *    - 源码检出布局：根目录含 `packages/`（monorepo workspace）
 *    - 安装布局：根目录的 `node_modules/@deepseek-ai/*` 直接可用（npx 缓存等）
 * 2. 重建 node_modules 下的依赖软链（@deepseek-ai/*、cordis、react、@types 等）；
 * 3. 把 tsconfig.json 的 compilerOptions.paths 前缀重写为安装路径。
 *
 * 用法：node scripts/setup-dsh-deps.mjs [--checkout <path>]
 * 之后即可 `node <checkout>/node_modules/.bin/tsc -p tsconfig.json` 或
 * `npm run build`（需要 DSH 安装里的 tsc/tsdown；安装布局通常没有，
 * 需另装 typescript/tsdown 到本仓库 devDependencies）。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 依赖名 → checkout 内相对路径（源码检出布局）。安装布局下同名包
 * 直接解析为 <checkout>/node_modules/@deepseek-ai/<name>。
 */
const LINKS = {
  'node_modules/@deepseek-ai/cordis': 'vendor/cordis',
  'node_modules/schemastery': 'vendor/schemastery',
  'node_modules/cosmokit': 'vendor/cosmokit',
  'node_modules/react': 'node_modules/.pnpm/react@18.3.1/node_modules/react',
  'node_modules/lightningcss': 'node_modules/lightningcss',
  'node_modules/tsdown': 'node_modules/tsdown',
  'node_modules/@types': 'node_modules/@types',
  'node_modules/@deepseek-ai/dsh-agent': 'packages/core/agent',
  'node_modules/@deepseek-ai/dsh-brand': 'packages/util/brand',
  'node_modules/@deepseek-ai/dsh-tools': 'packages/core/tools',
  'node_modules/@deepseek-ai/dsh-fs': 'packages/fs/fs',
  'node_modules/@deepseek-ai/dsh-skill': 'packages/skill/skill',
  'node_modules/@deepseek-ai/dsh-host-webserver': 'packages/host/webserver',
  'node_modules/@deepseek-ai/dsh-client-runtime': 'packages/client/runtime',
  'node_modules/@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots',
  'node_modules/@deepseek-ai/dsh-client-ui-conversation': 'packages/client/ui-conversation',
  'node_modules/@deepseek-ai/dsh-client-locale': 'packages/client/locale',
  'node_modules/@deepseek-ai/dsh-client-connection': 'packages/client/connection',
  'node_modules/@deepseek-ai/dsh-llm': 'packages/llm/llm',
  'node_modules/@deepseek-ai/dsh-session': 'packages/core/session',
  'node_modules/@deepseek-ai/dsh-scope': 'packages/core/scope',
  'node_modules/@deepseek-ai/dsh-code-runtime': 'packages/code-runtime/code-runtime',
  'node_modules/@deepseek-ai/dsh-sandbox': 'packages/sandbox/sandbox',
  'node_modules/@deepseek-ai/dsh-invariants': 'packages/runtime-diagnostics/invariants',
  'node_modules/@deepseek-ai/dsh-system-prompt': 'packages/core/system-prompt',
  'node_modules/@deepseek-ai/dsh-timeout': 'packages/util/timeout',
  'node_modules/@deepseek-ai/dsh-user-approval': 'packages/interaction/user-approval',
}

/** 常见 DSH 安装位置（dsh 不在 PATH 时的兜底）。 */
function commonCheckouts() {
  const candidates = []
  for (const base of [process.env.DSH_HOME, join(homedir(), '.dsh')].filter(Boolean)) {
    candidates.push(join(base, 'source', 'current'))
  }
  // npx 缓存布局：npm i -g 或 npx 安装的 dsh 藏在 _npx/<hash>/
  const npxRoots = []
  if (process.env.LOCALAPPDATA) npxRoots.push(join(process.env.LOCALAPPDATA, 'npm-cache', '_npx'))
  if (process.env.npm_config_cache) npxRoots.push(join(process.env.npm_config_cache, '_npx'))
  npxRoots.push(join(homedir(), '.npm', '_npx'))
  for (const root of npxRoots) {
    try {
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory()) candidates.push(join(root, entry.name))
      }
    } catch {
      // 目录不存在则跳过
    }
  }
  return candidates
}

function fail(message) {
  console.error(`setup-dsh-deps: ${message}`)
  process.exit(1)
}

/** 从 `dsh` bin 反推安装根（Windows: where.exe；POSIX: bash command -v）。 */
function checkoutFromDshBin() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('where.exe', ['dsh'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
      if (out === undefined || out === '') return undefined
      // dsh.cmd/dsh.ps1 位于 <root>/node_modules/.bin/
      return resolve(out, '..', '..')
    }
    const out = execFileSync('bash', ['-lc', 'command -v dsh'], { encoding: 'utf8' }).trim()
    if (out === '') return undefined
    return resolve(out, '..', '..')
  } catch {
    return undefined
  }
}

/** 判定一个目录是否为有效 DSH 安装（源码检出或安装布局均可）。 */
function isValidCheckout(dir) {
  if (existsSync(join(dir, 'packages'))) return true
  return existsSync(join(dir, 'node_modules', '@deepseek-ai', 'dsh-session'))
}

function resolveCheckout(explicit) {
  if (explicit !== undefined && isValidCheckout(explicit)) return resolve(explicit)
  for (const candidate of [checkoutFromDshBin(), ...commonCheckouts()]) {
    if (candidate !== undefined && isValidCheckout(candidate)) return candidate
  }
  fail('无法定位 DSH 安装：dsh 不在 PATH，且常见位置不存在。用 --checkout <path> 显式指定。')
}

/** 源码检出布局：workspace 相对路径 → 绝对路径。 */
function sourceLayoutPath(checkout, rel) {
  return join(checkout, rel)
}

/** 安装布局：包名 → node_modules 绝对路径。 */
function installLayoutPath(checkout, target) {
  const name = target.split('/').pop()
  if (name === '@types') return join(checkout, 'node_modules', '@types')
  return join(checkout, 'node_modules', '@deepseek-ai', name)
}

/** 重建一个软链（先删旧链接；真实目录则跳过不动）。Windows 无管理员时退回 junction。 */
function relink(target, source) {
  let current
  try {
    current = readlinkSync(target) // dangling symlink 也能读
  } catch (error) {
    if (error.code !== 'ENOENT') return // 真实目录或非链接：不动
  }
  if (current !== undefined) {
    if (resolve(current) === resolve(source)) return
    unlinkSync(target)
  }
  mkdirSync(dirname(target), { recursive: true })
  try {
    symlinkSync(source, target, 'dir')
  } catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') {
      // 目录 junction 不需要管理员权限
      symlinkSync(source, target, 'junction')
    } else {
      throw error
    }
  }
}

const argCheckout = process.argv.indexOf('--checkout')
const explicit = argCheckout >= 0 ? process.argv[argCheckout + 1] : undefined

const checkout = resolveCheckout(explicit)
const layout = existsSync(join(checkout, 'packages')) ? 'source' : 'install'
console.log(`setup-dsh-deps: DSH 安装 = ${checkout}（${layout} 布局）`)

// 1. 依赖软链
let linked = 0
for (const [target, rel] of Object.entries(LINKS)) {
  const source = layout === 'source'
    ? sourceLayoutPath(checkout, rel)
    : installLayoutPath(checkout, target)
  if (!existsSync(source)) {
    console.warn(`  skip ${target}: 安装缺少 ${layout === 'source' ? rel : target}`)
    continue
  }
  relink(join(ROOT, target), source)
  linked++
}
console.log(`setup-dsh-deps: ${linked} 个依赖软链已就位`)

// 2. tsconfig paths 重写（前缀统一为 checkout 路径）
const tsconfigPath = join(ROOT, 'tsconfig.json')
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))
const paths = tsconfig.compilerOptions?.paths
if (paths !== undefined) {
  let changed = 0
  for (const [name, targets] of Object.entries(paths)) {
    if (layout === 'install') {
      // 安装布局：@deepseek-ai/* → node_modules 下同名包的 lib/types/{index,client/index}.d.ts
      let mapped
      if (name.endsWith('/client')) {
        const pkg = name.slice(0, -'/client'.length)
        mapped = join(checkout, 'node_modules', pkg, 'lib', 'types', 'client', 'index.d.ts')
      } else if (name === 'react' || name === 'react/jsx-runtime') {
        mapped = undefined // 由插件自身 node_modules 的 @types/react 提供类型
      } else {
        mapped = join(checkout, 'node_modules', name, 'lib', 'types', 'index.d.ts')
      }
      if (mapped !== undefined && existsSync(mapped)) {
        if (!targets.includes(mapped)) { paths[name] = [mapped]; changed++ }
      } else if (mapped === undefined) {
        delete paths[name]
        changed++
      }
      continue
    }
    paths[name] = targets.map((t) => {
      // 匹配 /PLACEHOLDER/... 或既有 checkout 前缀：捕获紧邻的 packages/ 或 node_modules/ 段名，
      // 段名之后的内容（含 .pnpm 等）原样保留。
      const m = /^(?:\/[^/]+)*?\/(packages\/|node_modules\/)/.exec(t)
      if (m !== null && !t.startsWith(`${checkout}/`)) {
        changed++
        return join(checkout, m[1] + t.slice(m[0].length))
      }
      return t
    })
  }
  if (changed > 0) {
    writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`)
    console.log(`setup-dsh-deps: tsconfig.json paths 已重写 ${changed} 处 → ${checkout}`)
  } else {
    console.log('setup-dsh-deps: tsconfig.json paths 无需改动')
  }
}

console.log('setup-dsh-deps: 完成。构建：tsc -p tsconfig.json && tsdown -c tsdown.config.ts --tsconfig tsconfig.down.json')
