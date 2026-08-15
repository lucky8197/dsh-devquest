# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。
版本号格式 `MAJOR.MINOR.PATCH`：

- **MAJOR**：破坏性变更（存档格式不兼容 / 移除功能）
- **MINOR**：新增功能（向后兼容）
- **PATCH**：Bug 修复 / 文档 / 小改动

格式约定（每个版本一条）：

```
## [x.y.z] - YYYY-MM-DD

### Added / Changed / Fixed / Docs
- 条目
```

版本与 git tag 一一对应（`v0.4.0` ↔ tag `v0.4.0`），tag 推送到 GitHub Releases。

---

## [0.4.0] - 2026-08-15

### Added
- **成就进度可视化**：38 枚可量化成就带 `current/goal` 进度；成就墙格子底部微进度条、悬浮简介显示进度、顶部常驻「最近的里程碑」引导条
- **回合结算 toast**：每回合结算弹出 XP/连击/每日奖励明细，升级时金色高亮显示新称号（`applyTurnDetailed` 返回结算明细，存档保留最近 12 条事件）
- **每日全清宝箱**：当天 3 个任务全完成后可领取一次 +50 XP；新增 `POST /api/devquest/claim-chest`

### Changed
- 引擎测试 48 → 56 全绿

## [0.3.0] - 2026-08-15

### Added
- **全局玩家存档**（`~/.dsh/devquest/player.json`）：跨会话/跨项目统一进度
- 旧版按项目隔离的存档升级时自动合并进全局档（`mergeSaves`）

### Fixed
- 侧边栏启动时显示错误等级（Lv.1）→ 改为 overlay 常驻拉取真实状态

## [0.2.0] - 2026-08-14

### Added
- 真实赛季系统：自动按季度换季（`2026-S1` = Q1），赛季 XP/tokens 清零重计
- 每日任务：21 种任务池、每天按日期确定性抽取 3 个、自动结算
- 连击倍率：≥5 ×1.5 / ≥15 ×2.0 / ≥30 ×2.5
- 44 枚成就 · 六大门类（含隐藏彩蛋）
- `devquest_status` / `devquest_achievements` / `devquest_reset` 工具
- 侧边栏入口 + 可拖拽面板 + 成就解锁 toast
- 面板 UI 打磨：称号分档配色、成就墙悬停简介、已获得/未获得区分、「点住才能拖动」

## [0.1.0] - 2026-08-13

### Added
- 初始版本：事件流驱动计分（回合/工具/todo/tokens → XP）、等级与称号、按项目隔离存档
- 纯函数计分引擎（`engine.ts`）+ 事件监听归一化（`listener.ts`）
