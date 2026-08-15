# DevQuest — 把开发变成 RPG

> **DSH 开发游戏化成就插件**：你的每一次 agent 协作都在积累 XP。完成回合、调用工具、关闭 todo、深夜赶工——都会点亮徽章、提升等级。生态里全是给你摸鱼的小游戏；DevQuest 反其道：**你的工作就是游戏**。

<p align="center">
  <strong>事件流驱动</strong> · <strong>纯函数计分引擎</strong> · <strong>可单测</strong> · <strong>中英双语</strong>
</p>

## 它做什么

| 你做了什么 | 你会得到 |
|---|---|
| 完成一轮干净收尾的回合 | +10 XP |
| 连续 25 回合零失败 | 「钢铁意志」徽章 |
| 累计第 666 次工具调用 | 「恶魔的低语」隐藏徽章 |
| 凌晨 4:44 还在干活 | 「夜猫子」彩蛋徽章 |
| 等级 5 / 10 / 20 | 「学徒 → 宗师 → 传说」称号 |

## 快速安装

```sh
dsh plugin --profile web add "github:<your-org>/dsh-devquest#main"
```

重启 dsh web 后，侧边栏出现 DevQuest 面板；模型可调用 `devquest` 工具查询进度。

## 架构速览

```
host 侧                    client 侧
session/event ──► listener ──► engine(纯函数) ──► store(JSON)
      ▲                                                │
      └────────── devquest 工具 ◄── routes(HTTP) ◄──────┘
                                                        │
                                            slots.inject ──► DevQuestPanel
```

- **事件流驱动**：订阅 `session/event` firehose，不侵入任何 agent 循环
- **纯函数计分**：`Action → (XP, 成就判定)` 无副作用，全部可单测
- **存档本地化**：`~/.dsh/devquest/<cwd-hash>.json`，按项目作用域隔离

## 文档

- [完整开发文档](docs/开发文档.md)（架构 / API 调研 / 数据模型 / 数值 / 成就清单 / 里程碑 / 发布流程）

## License

BSD-3-Clause
