/**
 * DevQuestPanel.tsx 第二轮拆分：把 DevQuestPanelCard 中的 JSX 分区
 * 抽为 panel/sections.tsx 里的独立展示组件（纯搬移，状态/回调仍在主组件，
 * 经 props 传入——行为零变化）。主文件替换为组件调用序列。
 *
 * 用法：node scripts/split-sections.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'

const SRC = new URL('../src/client/DevQuestPanel.tsx', import.meta.url)
const DST = new URL('../src/client/panel/sections.tsx', import.meta.url)

const text = await readFile(SRC, 'utf8')
const lines = text.split('\n')

/** 找锚点行（首个精确匹配），找不到抛错。 */
function anchorIndex(anchor) {
  const i = lines.findIndex(l => l === anchor)
  if (i < 0) throw new Error(`anchor not found: ${anchor}`)
  return i
}

/** 块：{ start: 起始锚点（含）, end: 结束锚点（不含）, name, propsDef, propsList } */
const BLOCKS = [
  {
    name: 'HeroSection', start: '      {/* 等级环 + XP */}',
    propsDef: `{
  status: DevQuestStatus
  t: TFunc
  c: DevQuestStatus['counters']
  percent: number
  refresh: () => void
  claimPassTier: (tierId: string) => unknown
}`,
    propsList: ['status', 't', 'c', 'percent', 'refresh', 'claimPassTier'],
  },
  {
    name: 'SeasonSummaryCard', start: '      {/* v1.3.0 赛季结束结算卡：换季自动生成，展示上赛季战绩 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc }',
    propsList: ['status', 't'],
  },
  {
    name: 'DailyGoalCard', start: '      {/* v1.3.0 每日 XP 目标条：设定目标后显示进度 + 达标领取 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; claimDailyGoalF: () => unknown }',
    propsList: ['status', 't', 'claimDailyGoalF'],
  },
]

// 保留块：面板消息条（主组件原地保留）
const MSG_ANCHOR = '      {/* v1.2.3：全局操作结果条（成功/失败，4s 自动消失） */}'
const MSG_END_ANCHOR = '      {/* 每日开工仪式：问候 + 昨日总结 + 今日目标 */}'

const REST_BLOCKS = [
  {
    name: 'RitualSection', start: '      {/* 每日开工仪式：问候 + 昨日总结 + 今日目标 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; questReminderMsg: string | null }',
    propsList: ['status', 't', 'questReminderMsg'],
  },
  {
    name: 'LuckyRow', start: '      {/* 下一称号预览 + 每日幸运抽奖 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; claimingLucky: boolean; luckyMsg: string | null; claimLuckyDraw: () => unknown }',
    propsList: ['status', 't', 'claimingLucky', 'luckyMsg', 'claimLuckyDraw'],
  },
  {
    name: 'DailySection', start: '      {/* 每日任务 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; claiming: boolean; claimChest: () => unknown }',
    propsList: ['status', 't', 'claiming', 'claimChest'],
  },
  {
    name: 'WeeklySection', start: '      {/* 每周挑战：独立分区 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; weeklyClaiming: boolean; claimBossF: () => unknown; claimWeekly: () => unknown }',
    propsList: ['status', 't', 'weeklyClaiming', 'claimBossF', 'claimWeekly'],
  },
  {
    name: 'ShopSection', start: '      {/* 商店：赛季货币消费（连击保险 / 任务重掷 / 徽章） */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; buying: string | null; confirmBuyId: string | null; buy: (itemId: string) => unknown; rerolling: boolean; rerollQuests: () => unknown; useQuestSkipCard: () => unknown }',
    propsList: ['status', 't', 'buying', 'confirmBuyId', 'buy', 'rerolling', 'rerollQuests', 'useQuestSkipCard'],
  },
  {
    name: 'SkinsSection', start: '      {/* 主题皮肤：已购可切换，未购可购买（独立功能） */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; buying: string | null; confirmBuyId: string | null; buy: (itemId: string) => unknown; activateTheme: (themeId: string) => unknown }',
    propsList: ['status', 't', 'buying', 'confirmBuyId', 'buy', 'activateTheme'],
  },
  {
    name: 'TutorialSection', start: '      {/* 新手任务链 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc }',
    propsList: ['status', 't'],
  },
  {
    name: 'TitlesSection', start: '      {/* 多称号：条件解锁称号可切换展示 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; sharing: boolean; shareCard: () => unknown; shareSeason: () => unknown; switchTitle: (titleId: string) => unknown }',
    propsList: ['status', 't', 'sharing', 'shareCard', 'shareSeason', 'switchTitle'],
  },
  {
    name: 'CollectionsSection', start: '      {/* 分类收藏 + 存档管理 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; importing: boolean; exportSave: () => unknown; importSave: (file: File) => unknown }',
    propsList: ['status', 't', 'importing', 'exportSave', 'importSave'],
  },
  {
    name: 'PokedexSection', start: '      {/* 收藏图鉴总览：成就 / 皮肤 / 称号 完成度 */}',
    propsDef: "{ status: DevQuestStatus; t: TFunc; unlocked: DevQuestStatus['achievements'] }",
    propsList: ['status', 't', 'unlocked'],
  },
  {
    name: 'RecentSection', start: '      {/* 最近成就 */}',
    propsDef: `{
  status: DevQuestStatus
  t: TFunc
  state: DevQuestUiState
  recent: DevQuestStatus['achievements']
}`,
    propsList: ['status', 't', 'state', 'recent'],
  },
  {
    name: 'WallSection', start: '      {/* 成就墙 */}',
    propsDef: `{
  status: DevQuestStatus
  t: TFunc
  category: (typeof CATEGORY_KEYS)[number]
  setCategory: (c: (typeof CATEGORY_KEYS)[number]) => void
  wallSearch: string
  setWallSearch: (s: string) => void
  wallRarity: 'all' | 'common' | 'rare' | 'epic' | 'legendary'
  setWallRarity: (r: 'all' | 'common' | 'rare' | 'epic' | 'legendary') => void
  wallStatus: 'all' | 'unlocked' | 'locked'
  setWallStatus: (s: 'all' | 'unlocked' | 'locked') => void
  hover: { a: DevQuestStatus['achievements'][number]; x: number; y: number } | null
  setHover: (h: { a: DevQuestStatus['achievements'][number]; x: number; y: number } | null) => void
  wallItems: DevQuestStatus['achievements']
  milestone: { a: DevQuestStatus['achievements'][number]; ratio: number } | undefined
  unlocked: DevQuestStatus['achievements']
}`,
    propsList: ['status', 't', 'category', 'setCategory', 'wallSearch', 'setWallSearch', 'wallRarity', 'setWallRarity', 'wallStatus', 'setWallStatus', 'hover', 'setHover', 'wallItems', 'milestone', 'unlocked'],
  },
  {
    name: 'ReportSection', start: '      {/* 成长周报：最近 7 天 XP 柱状图 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc }',
    propsList: ['status', 't'],
  },
  {
    name: 'CalendarSection', start: '      {/* 活跃日历：近 30 天热力图 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc }',
    propsList: ['status', 't'],
  },
  {
    name: 'StatsSection', start: '      {/* 统计 + 荣誉墙 */}',
    propsDef: "{ status: DevQuestStatus; t: TFunc; c: DevQuestStatus['counters'] }",
    propsList: ['status', 't', 'c'],
  },
  {
    name: 'SettingsSection', start: '      {/* 设置：字号 / 紧凑模式 / toast 过滤 */}',
    propsDef: '{ status: DevQuestStatus; t: TFunc; settings: DevQuestSettings; updateSettings: (patch: Partial<DevQuestSettings>) => void; setGoalF: (goal: number) => unknown }',
    propsList: ['status', 't', 'settings', 'updateSettings', 'setGoalF'],
  },
]

// ---- 解析各 block 的区间 ----
const regions = []
for (let i = 0; i < BLOCKS.length; i++) {
  const start = anchorIndex(BLOCKS[i].start)
  const end = i + 1 < BLOCKS.length ? anchorIndex(BLOCKS[i + 1].start) : anchorIndex(MSG_ANCHOR)
  regions.push({ block: BLOCKS[i], from: start, to: end })
}
// 保留消息条：MSG_ANCHOR → ritual 锚点前
const msgFrom = anchorIndex(MSG_ANCHOR)
const msgTo = anchorIndex(MSG_END_ANCHOR)
// 后段：ritual → settings 结束（settings 块的第一个 </SectionCard> 闭合 + 空行）
const restRegions = []
for (let i = 0; i < REST_BLOCKS.length; i++) {
  const start = anchorIndex(REST_BLOCKS[i].start)
  let end
  if (i + 1 < REST_BLOCKS.length) {
    end = anchorIndex(REST_BLOCKS[i + 1].start)
  } else {
    // settings：找其后第一个 `      </SectionCard>`（块内可能有其它 SectionCard？取其后的首个）
    const cardEnd = lines.findIndex((l, idx) => idx > start && l === '      </SectionCard>')
    if (cardEnd < 0) throw new Error('settings SectionCard end not found')
    end = cardEnd + 1 // 跳过空行：主文件保留该空行亦可，这里含到 </SectionCard> 行本身后
  }
  restRegions.push({ block: REST_BLOCKS[i], from: start, to: end })
}

/** 提取块正文（区间 my 数组，含起点不含终点）。 */
function sliceBody(from, to) {
  return lines.slice(from, to)
}

/** 从切块文本收集标识符 → 与某文件的导出名交集（用于生成 import）。 */
function collectIdentifiers(bodies) {
  const ids = new Set()
  for (const body of bodies) {
    for (const m of body.join('\n').matchAll(/\b[A-Za-z_$][\w$]*\b/g)) ids.add(m[0])
  }
  return ids
}

async function exportNames(fileUrl) {
  const t = await readFile(fileUrl, 'utf8')
  const names = new Set()
  for (const line of t.split('\n')) {
    const m = /^(?:export\s+)?(?:const|function|interface|type)\s+([A-Za-z_$][\w$]*)/.exec(line)
    if (m !== null) names.add(m[1])
  }
  return names
}

const themeNames = await exportNames(new URL('theme.ts', DST))
const iconsNames = await exportNames(new URL('icons.tsx', DST))
const utilNames = await exportNames(new URL('util.ts', DST))
const stylesNames = await exportNames(new URL('styles.ts', DST))

/** 从 startIdx 起的函数体结束行（含）：首个 `{` 开始配对，行末 depth===0 且行以 `}` 结尾。 */
function bodyEnd(startIdx, srcLines = lines) {
  let depth = 0
  let started = false
  for (let i = startIdx; i < srcLines.length; i++) {
    const line = srcLines[i]
    for (const ch of line) {
      if (ch === '{') { depth++; started = true }
      else if (ch === '}') depth--
    }
    if (started && depth === 0 && line.trimEnd().endsWith('}')) return i + 1
  }
  throw new Error('body end not found')
}

// AchievementTooltip / LevelRing / SectionCard：从主文件搬入 sections.tsx（先提取再算 ids）
const TOOLTIP_ANCHOR = 'function AchievementTooltip('
const tooltipStart = lines.findIndex(l => l.startsWith(TOOLTIP_ANCHOR))
if (tooltipStart < 0) throw new Error('AchievementTooltip not found')
const tooltipEnd = bodyEnd(tooltipStart)
// 主组件 props 类型在拆分后不可引用：t 改为 TFunc（等价签名）；raw 版本用于主文件删除
const tooltipBodyRaw = lines.slice(tooltipStart, tooltipEnd).join('\n')
const tooltipBody = tooltipBodyRaw.replaceAll("DevQuestFooterActionProps['t']", 'TFunc')

const LEVELRING_ANCHOR = 'function LevelRing('
const levelRingStart = lines.findIndex(l => l.startsWith(LEVELRING_ANCHOR))
if (levelRingStart < 0) throw new Error('LevelRing not found')
const levelRingEnd = bodyEnd(levelRingStart)
const levelRingBody = lines.slice(levelRingStart, levelRingEnd).join('\n')

const SECTIONCARD_ANCHOR = 'function SectionCard('
const sectionCardStart = lines.findIndex(l => l.startsWith(SECTIONCARD_ANCHOR))
if (sectionCardStart < 0) throw new Error('SectionCard not found')
const sectionCardEnd = bodyEnd(sectionCardStart)
const sectionCardBody = lines.slice(sectionCardStart, sectionCardEnd).join('\n')

const allBodies = [...regions, ...restRegions].map(r => sliceBody(r.from, r.to))
const ids = collectIdentifiers(allBodies)
for (const extra of [tooltipBody, levelRingBody, sectionCardBody]) {
  for (const m of extra.matchAll(/\b[A-Za-z_$][\w$]*\b/g)) ids.add(m[0])
}
ids.add('loadCollapsed')
ids.add('saveCollapsed')
const pick = (set) => [...set].filter(n => ids.has(n)).sort()

const importTheme = pick(themeNames)
const importIcons = pick(iconsNames)
const importUtilRaw = pick(utilNames)
const importStyles = pick(stylesNames)
// value import 排除 type-only 导出（DevQuestSettings 已在 import type 中）
const TYPE_ONLY = new Set(['DevQuestSettings'])
const importUtil = importUtilRaw.filter(n => !TYPE_ONLY.has(n))

function renderComponent(region) {
  const { block, from, to } = region
  let body = sliceBody(from, to).join('\n')
  // 分区折叠：由各组件自持（loadCollapsed 初始值 + toggle 保存），行为与主组件集中管理一致。
  const sectionIds = [...new Set([...body.matchAll(/isCollapsed\('([^']+)'\)/g)].map(m => m[1]))]
  if (sectionIds.length > 0) {
    body = body
      .replace(/isCollapsed\('[^']+'\)/g, (m) => `collapsedMap[${JSON.stringify(m.match(/'([^']+)'/)[1])}] === true`)
      .replace(/toggleSection\('[^']+'\)/g, (m) => `toggle(${JSON.stringify(m.match(/'([^']+)'/)[1])})`)
    const state = `  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(loadCollapsed)
  const toggle = (id: string): void => {
    // 从 localStorage 读最新再合并：多个分区各自持 map，避免旧 map 覆盖他区新保存。
    const latest = loadCollapsed()
    const next = { ...latest, [id]: !(latest[id] ?? false) }
    saveCollapsed(next)
    setCollapsedMap(next)
  }
`
    return `export function ${block.name}(props: ${block.propsDef}): ReactElement {
  const { ${block.propsList.join(', ')} } = props
${state}  return <>
${body}
  </>
}
`
  }
  return `export function ${block.name}(props: ${block.propsDef}): ReactElement {
  const { ${block.propsList.join(', ')} } = props
  return <>
${body}
  </>
}
`
}

const header = `/**
 * DevQuest 面板分区组件（从 DevQuestPanelCard 机械拆分，纯展示：
 * 状态与回调由 DevQuestPanel.tsx 持有并经 props 传入——行为不变）。
 */
import { useState, type ReactElement, type ReactNode } from 'react'
import type { DevQuestStatus } from '../../types.ts'
import type { DevQuestUiState } from '../store.ts'
import type { DevQuestSettings } from './util.ts'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
${importTheme.length > 0 ? `import { ${importTheme.join(', ')} } from './theme.ts'` : ''}
${importIcons.length > 0 ? `import { ${importIcons.join(', ')} } from './icons.tsx'` : ''}
${importUtil.length > 0 ? `import { ${importUtil.join(', ')} } from './util.ts'` : ''}
${importStyles.length > 0 ? `import { ${importStyles.join(', ')} } from './styles.ts'` : ''}

/** 翻译函数（与主面板一致）。 */
export type TFunc = PropsLocale<typeof NS>['t']
`

// ---- 组装 sections.tsx ----
const components = [...regions, ...restRegions].map(renderComponent)
const tooltipComponent = `/** 成就墙悬浮提示（wall 分区使用）。 */
${tooltipBody}
`
const levelRingComponent = `/** 等级环（hero 分区使用）。 */
${levelRingBody}
`
const sectionCardComponent = `/** 通用分区卡片（各分区组件使用）。 */
${sectionCardBody}
`

const sectionsFull =
  header + '\n' +
  sectionCardComponent + '\n' +
  levelRingComponent + '\n' +
  components.join('\n') +
  '\n// ---------------------------------------------------------------------------\n// 成就悬浮简介（wall 分区使用）\n// ---------------------------------------------------------------------------\n\n' +
  tooltipComponent
await writeFile(DST, sectionsFull)
console.log(`wrote panel/sections.tsx (${sectionsFull.split('\n').length} lines, ${components.length + 1} components)`)

// ---- 主文件：替换 JSX 区为组件调用列 ----
const call = (region) => {
  const list = region.block.propsList.map(k => `${k}={${k}}`).join(' ')
  return `      <${region.block.name} ${list} />`
}
const frontCalls = regions.map(region => call(region)).join('\n')
const restCalls = restRegions.map(region => call(region)).join('\n')

const firstStart = regions[0].from
const lastRestEnd = restRegions[restRegions.length - 1].to
const msgText = lines.slice(msgFrom, msgTo).join('\n')

const newMiddle = [
  frontCalls,
  '',
  msgText,
  '',
  restCalls,
].join('\n')

const out = [...lines.slice(0, firstStart), ...newMiddle.split('\n'), ...lines.slice(lastRestEnd)]
// 删除已搬入 sections.tsx 的 AchievementTooltip / LevelRing / SectionCard 定义
let finalText = out.join('\n')
for (const body of [tooltipBodyRaw, levelRingBody, sectionCardBody]) {
  if (!finalText.includes(body)) throw new Error('moved body not found in output')
  finalText = finalText.replace(body, '')
}
// 主文件插入 sections import
const sectionNames = [...regions, ...restRegions].map(r => r.block.name)
const SECTIONS_IMPORT_ANCHOR = "import type { DevQuestSettings } from './panel/util.ts'"
if (!finalText.includes(SECTIONS_IMPORT_ANCHOR)) throw new Error('sections import anchor not found')
finalText = finalText.replace(
  SECTIONS_IMPORT_ANCHOR,
  `${SECTIONS_IMPORT_ANCHOR}
import { ${sectionNames.join(', ')} } from './panel/sections.tsx'`,
)
await writeFile(SRC, finalText)
console.log(`rewrote DevQuestPanel.tsx (${finalText.split('\n').length} lines)`)