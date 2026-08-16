# ⚔️ DevQuest — 把开发变成 RPG

**中文** | [English](README.en.md)

> DevQuest 是一个 DSH 插件：你在 agent 里做的回合、工具调用、待办、输出 tokens，都会按规则换算成 XP。XP 推等级，等级出称号，成就记录你走到哪一步。装好之后不用做任何额外操作，正常干活就会自动计分。

<p align="center">
  <strong>📅 每日任务+宝箱</strong> · <strong>🗓️ 每周挑战</strong> · <strong>🐉 每周 BOSS</strong> · <strong>🎯 每日目标</strong> · <strong>🃏 职业专精</strong> · <strong>🎁 每日幸运抽奖</strong> · <strong>🛒 赛季商店</strong> · <strong>🎨 主题皮肤</strong> · <strong>🏆 58 枚成就+稀有度</strong> · <strong>🏷️ 多称号</strong> · <strong>📊 统计+荣誉墙</strong>
</p>

<p align="center">
  <a href="https://github.com/lucky8197/dsh-devquest/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause-blue" alt="license: BSD-3-Clause"></a>
  <a href="https://github.com/lucky8197/dsh-devquest"><img src="https://img.shields.io/badge/dsh-plugin-informational" alt="DSH plugin"></a>
  <a href="https://www.npmjs.com/package/dsh-devquest"><img src="https://img.shields.io/npm/v/dsh-devquest" alt="npm version"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="0 runtime dependencies">
  <a href="https://github.com/lucky8197/dsh-devquest/actions/workflows/test.yml"><img src="https://github.com/lucky8197/dsh-devquest/actions/workflows/test.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/tests-93%20%E2%9C%93-brightgreen" alt="93 tests passing">
  <img src="https://img.shields.io/badge/achievements-58-gold" alt="58 achievements">
</p>

---

## 🎮 怎么玩

装上插件后什么都不用配置，正常干活就自动计分：

| 你做了什么 | 你会得到 |
|---|---|
| ✅ 完成一个回合 | +10 XP，连击 +1 |
| 🧰 调用工具 | +1 XP（编辑/命令/SSH 等「锻造师」工具 +2，单回合封顶 +10） |
| 📋 清空待办 | 每个 +15 XP |
| 📝 输出 tokens | 每 10k +1 XP |
| 💥 犯错的回合 | +2 XP（安慰奖） |
| 💪 犯错后爬起来 | 「东山再起」成就 +100 XP |

## ✨ 主要功能

### 🎮 成长系统
- ⚔️ **回合/工具/待办/tokens → XP → 等级 → 称号**：每 5 级一档称号（30+ 档），连击越高加成越大
- 🏆 **58 枚成就**：六大类（旅程/锻造/使命/时光/传奇/彩蛋），按稀有度着色，含隐藏彩蛋与分类集齐奖励

### 📅 每日 & 每周
- 📅 **每日任务**：每天 3 个随机任务（24 种任务池），全清领宝箱
- 🎯 **每日 XP 目标**：设定今日目标，达成领奖励
- 🗓️ **每周挑战**：每周 3 个目标，全清领周奖励
- 🐉 **每周 BOSS**：3 个周挑战合成一只 BOSS，击败掉落赛季货币
- 🎁 **每日幸运抽奖**：免费抽 XP / 货币 / 道具

### 🗓️ 赛季 & 商店
- 🗓️ **季度赛季**：赛季 XP 即商店货币（换季清零防通胀），赛季冲刺条 + 通行证里程碑 + 赛季结束自动结算
- 🛒 **赛季商店**：连击保险 / 任务重掷 / 经验加成卡 / 跳过卡 / 称号徽章

### 🎨 个性 & 外观
- 🎨 **主题皮肤**：10 款配色，买了永久拥有、随时切换
- 🏷️ **多称号**：等级称号 + 条件称号（全成就之主等），可切换展示
- 🃏 **职业画像**：按工具使用习惯自动识别（编辑大师 / 命令行者 / 多面手…）

### 📊 数据 & 体验
- 📈 **成长周报 / 活跃日历 / 统计 / 荣誉墙**：每日 XP 柱状图、30 天热力图、工具 TOP5、赛季纪录
- 📤 **成就分享卡**：一键生成 PNG 晒等级 / 称号 / 战绩
- 🔊 **音效 + 桌面通知**：成就解锁 / 升级 / BOSS 击败有反馈（可开关）
- 🎨 **面板可调**：字号缩放、紧凑模式、toast 过滤、拖拽定位

## 🖥️ 长这样

侧边栏底部 ⚔️ 入口，点击弹出面板；成就解锁与回合结算时弹出 toast：

<p align="center">
  <img src="screenshots/panel.png" alt="DevQuest 面板：等级环 / 冲刺条 / 每日+每周任务 / 商店 / 新手链 / 称号 / 收藏 / 成就墙 / 周报" width="440">
  <img src="screenshots/toast.png" alt="成就解锁 toast（稀有度着色）" width="300">
</p>

## ⚙️ 安装

**方式一：npm（推荐）**

```sh
dshpm install dsh-devquest --profile web
# 或
dsh plugin --profile web add "dsh-devquest"
```

**方式二：GitHub 源**

```sh
dsh plugin --profile web add "github:lucky8197/dsh-devquest#main"
```

重启 dsh web → 侧边栏底部出现 ⚔️ → 开始使用。

模型也能查进度、逛商店、发任务简报（连 agent 自己都会好奇）：

```
devquest_status        # 等级 / XP / 连击 / 今日任务 / 职业 / BOSS
devquest_achievements  # 58 枚成就全清单与解锁状态
devquest_shop          # 赛季商店：查余额/商品，buy=<商品id> 直接购买
devquest_daily         # 今日任务+本周挑战简报（纯文本，可配 de_channel 推送到 IM）
devquest_reset         # 重置存档（危险，需 confirm=true）
```

## 📄 License

BSD-3-Clause
