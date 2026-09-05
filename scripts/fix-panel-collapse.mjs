/**
 * 折叠状态回归修复（v1.3.1 hotfix）：
 * 拆分重构时把折叠状态下放到各分区组件内部，导致顶部 ⤢/⤡（expandAll/collapseAll）
 * 只更新主组件 state、无人消费 → 点击无效，需重开面板才生效（重挂载读 localStorage）。
 *
 * 修复：折叠状态收回主组件统一管理（受控模式）——sections 组件把 collapsedMap/toggle
 * 改为 props；主文件调用列补传 collapsedMap={collapsed} toggle={toggleSection}。
 *
 * 处理当前工作树（不重跑拆分脚本，保留 v1.3.1 其他改动）。
 */
import { readFile, writeFile } from 'node:fs/promises'

const SECTIONS = new URL('../src/client/panel/sections.tsx', import.meta.url)
const PANEL = new URL('../src/client/DevQuestPanel.tsx', import.meta.url)

// 含折叠交互的分区组件（来自 isCollapsed/toggleSection 使用点）。
const FOLD_COMPONENTS = [
  'RitualSection', 'DailySection', 'WeeklySection', 'ShopSection', 'SkinsSection',
  'TutorialSection', 'TitlesSection', 'CollectionsSection', 'PokedexSection',
  'RecentSection', 'WallSection', 'ReportSection', 'CalendarSection', 'StatsSection', 'SettingsSection',
]

// ---- 1. sections.tsx ----
let s = await readFile(SECTIONS, 'utf8')
const parts = s.split(/(?=export function )/)
for (let i = 0; i < parts.length; i++) {
  const p = parts[i]
  if (!p.includes('collapsedMap[')) continue
  let body = p
  // a) propsDef 末尾加两个字段（props: { ... }): ReactElement {）
  body = body.replace(/^(export function \w+\(props: [\s\S]*?)\}\): ReactElement \{/, '$1; collapsedMap: Record<string, boolean>; toggle: (id: string) => void }): ReactElement {')
  // b) 解构行加 props
  body = body.replace(/const \{ ([^}]+) \} = props/, 'const { $1, collapsedMap, toggle } = props')
  // c) 删除内部折叠 state 块（块后直接跟 `  return <>`，无空行）
  body = body.replace(/  const \[collapsedMap, setCollapsedMap\] = useState<Record<string, boolean>>\(loadCollapsed\)\n  const toggle = \(id: string\): void => \{\n[\s\S]*?\n  \}\n  return /, '  return ')
  parts[i] = body
}
s = parts.join('')
// 头部 import 清理：useState / loadCollapsed / saveCollapsed 不再使用
s = s.replace("import { useState, type ReactElement, type ReactNode } from 'react'", "import { type ReactElement, type ReactNode } from 'react'")
s = s.replace(', loadCollapsed,', ',')
s = s.replace(', saveCollapsed,', ',')
await writeFile(SECTIONS, s)
console.log('sections.tsx patched')

// ---- 2. DevQuestPanel.tsx：调用列补传折叠 props ----
let p2 = await readFile(PANEL, 'utf8')
for (const name of FOLD_COMPONENTS) {
  const before = `<${name} `
  if (!p2.includes(before)) throw new Error(`call site not found: ${name}`)
  p2 = p2.split(before).join(`<${name} collapsedMap={collapsed} toggle={toggleSection} `)
}
await writeFile(PANEL, p2)
console.log('DevQuestPanel.tsx patched')