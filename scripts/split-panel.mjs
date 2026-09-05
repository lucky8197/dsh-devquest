/**
 * DevQuestPanel.tsx 第一轮机械拆分（纯移动，行为零变化）：
 * 按行号区间提取 theme / icons / util / styles 到 src/client/panel/，
 * 主文件删除这些区间并在头部插入生成好的 import 块。
 *
 * 用法：node scripts/split-panel.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SRC = new URL('../src/client/DevQuestPanel.tsx', import.meta.url)
const OUT_DIR = new URL('../src/client/panel/', import.meta.url)

await mkdir(OUT_DIR, { recursive: true })

/** 行号区间（1-based，含端点）。 */
const RANGES = {
  theme: [[35, 84]],
  icons: [[86, 103]],
  util: [[32, 33], [109, 199], [211, 259], [261, 297], [299, 419]],
  styles: [[2217, 3356]],
}

const HEADERS = {
  theme: `/**
 * DevQuest 主题常量：DSH 主题 token、商店主题调色板与面板 CSS 变量覆写。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react'
`,
  icons: `/**
 * DevQuest 内联 SVG 图标（无依赖）。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { ReactElement } from 'react'
`,
  util: `/**
 * DevQuest 面板工具函数与常量：格式/音效/稀有度/localStorage 持久化、
 * 面板设置、拖拽位置约束等。均为纯函数或浏览器端直写。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react'
import type { DevQuestStatus } from '../../types.ts'
import { TONE } from './theme.ts'
`,
  styles: `/**
 * DevQuest 面板全部样式常量（CSSProperties，跟随 DSH CSS 变量 / --dq-fsz 字号缩放）。
 * （自 DevQuestPanel.tsx 机械拆分而来，行为不变。）
 */
import type { CSSProperties } from 'react'
import { TONE } from './theme.ts'
`,
}

/** 解析一行是否为顶层声明，返回 [export?, kind, name] 或 null。 */
function topDecl(line) {
  const m = /^((?:export\s+)?(?:const|function|interface|type))\s+([A-Za-z_$][\w$]*)/.exec(line)
  if (m === null) return null
  const isExport = m[1].startsWith('export ')
  const kind = m[1].replace('export ', '').trim()
  return { isExport, kind, name: m[2] }
}

const text = await readFile(SRC, 'utf8')
const lines = text.split('\n') // 保留原行；末尾空串由 split 产生

/** 提取 [from, to]（1-based 含端点）行，组间以空行分隔；顶层声明自动补 export。 */
function extract(ranges, { exportDecls = true } = {}) {
  const out = []
  for (const [from, to] of ranges) {
    if (from > to) continue
    // from/to 为 1-based，转 0-based
    const slice = lines.slice(from - 1, to).map((line, i) => {
      if (!exportDecls) return line
      const d = topDecl(line)
      if (d === null || d.isExport) return line
      return `export ${line}`
    })
    if (out.length > 0) out.push('')
    out.push(...slice)
  }
  return out
}

/** 由提取区间内的顶层声明【导出名】列表（去重保序）。 */
function exportedNames(ranges) {
  const names = []
  const seen = new Set()
  for (const [from, to] of ranges) {
    for (let i = from - 1; i < to && i < lines.length; i++) {
      const d = topDecl(lines[i])
      if (d === null) continue
      if (seen.has(d.name)) continue
      seen.add(d.name)
      names.push(d)
    }
  }
  return names
}

// ---- 生成 4 个新文件 ----
for (const key of Object.keys(RANGES)) {
  const body = extract(RANGES[key])
  const header = HEADERS[key]
  const content = header + '\n' + body.join('\n') + '\n'
  await writeFile(new URL(`${key}.${key === 'icons' ? 'tsx' : 'ts'}`, OUT_DIR), content)
  console.log(`wrote panel/${key}.${key === 'icons' ? 'tsx' : 'ts'} (${body.length} lines)`)
}

// ---- 主文件：删除区间（从后往前）+ 插入 import 块 ----
const marks = Object.entries(RANGES).flatMap(([key, ranges]) => ranges.map(r => ({ key, from: r[0], to: r[1] })))
  .sort((a, b) => b.from - a.from)

const keep = [...lines]
for (const { from, to } of marks) {
  keep.splice(from - 1, to - from + 1)
}

/** 从提取区间生成主文件 import 语句。 */
function buildImports() {
  const valueByFile = {}
  const typeByFile = {}
  for (const key of Object.keys(RANGES)) {
    const names = exportedNames(RANGES[key])
    for (const d of names) {
      if (d.kind === 'interface' || d.kind === 'type') {
        ;(typeByFile[key] ??= []).push(d.name)
      } else {
        ;(valueByFile[key] ??= []).push(d.name)
      }
    }
  }
  const stmts = []
  const file = (key) => `./panel/${key}.${key === 'icons' ? 'tsx' : 'ts'}`
  for (const key of Object.keys(RANGES)) {
    if (valueByFile[key]?.length > 0) stmts.push(`import { ${valueByFile[key].join(', ')} } from '${file(key)}'`)
    if (typeByFile[key]?.length > 0) stmts.push(`import type { ${typeByFile[key].join(', ')} } from '${file(key)}'`)
  }
  return stmts
}

const importBlock = buildImports()
// 在 `import { NS } from './locales.ts'` 之后插入
const anchor = "import { NS } from './locales.ts'"
const ai = keep.indexOf(anchor)
if (ai < 0) throw new Error('anchor import not found')
keep.splice(ai + 1, 0, '', ...importBlock)

const out = keep.join('\n')
await writeFile(SRC, out)
console.log(`rewrote DevQuestPanel.tsx (${out.split('\n').length} lines, imports: ${importBlock.length + 1})`)