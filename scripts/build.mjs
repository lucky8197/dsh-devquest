#!/usr/bin/env node
/**
 * 跨平台构建脚本（Windows / macOS / Linux 通用）。
 * 步骤：链接 DSH 依赖 → tsc 产出 lib/types → tsdown 打包 host + client。
 * 依赖：本机 DSH 安装（setup-dsh-deps 自动定位）+ typescript + tsdown
 *       （`npm i -D typescript tsdown lightningcss @types/react @types/node`）。
 *
 * 用法：node scripts/build.mjs [--checkout <path>]
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argCheckout = process.argv.indexOf('--checkout')
const checkoutArg = argCheckout >= 0 ? process.argv[argCheckout + 1] : undefined

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  // Windows 的 .bin 是 .cmd shim，execFileSync 无法直接执行，需 shell 展开。
  const isWinShim = process.platform === 'win32' && cmd.endsWith('.cmd')
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: isWinShim, ...opts })
}

// 1. 链接依赖 + 重写 tsconfig paths
run(process.execPath, [join(ROOT, 'scripts', 'setup-dsh-deps.mjs'), ...(checkoutArg ? ['--checkout', checkoutArg] : [])])

// 2. tsc 产物（lib/types/*.js + .d.ts）
const tscBin = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')
const tsdownBin = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsdown.cmd' : 'tsdown')
if (!existsSync(tscBin) || !existsSync(tsdownBin)) {
  console.error('build: 缺少 typescript/tsdown。先执行：npm i -D typescript tsdown lightningcss @types/react @types/node')
  process.exit(1)
}

console.log('=== Compiling src → lib (tsc) ===')
run(tscBin, ['-p', 'tsconfig.json'])

console.log('=== Bundling host + client (tsdown) ===')
run(tsdownBin, ['-c', 'tsdown.config.ts', '--tsconfig', 'tsconfig.down.json'])

console.log('=== Build complete ===')
