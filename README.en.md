# ⚔️ DevQuest — Turn Your Dev Work into an RPG

[中文](README.md) | **English**

> DevQuest is a DSH plugin: every turn, tool call, todo and token output in your agent is converted into XP by fixed rules. XP raises your level, levels unlock titles, and achievements track how far you've come. Install it and do nothing else — normal work scores automatically.

<p align="center">
  <strong>📅 Daily Quests + Chest</strong> · <strong>🗓️ Weekly Challenges</strong> · <strong>🐉 Weekly Boss</strong> · <strong>🎯 Daily Goal</strong> · <strong>🃏 Class System</strong> · <strong>🎁 Daily Lucky Draw</strong> · <strong>🛒 Season Shop</strong> · <strong>🎨 Theme Skins</strong> · <strong>🏆 58 Achievements + Rarity</strong> · <strong>🏷️ Multiple Titles</strong> · <strong>📊 Stats + Hall of Fame</strong>
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

## 🎮 How It Works

Nothing to configure — just work, and XP accrues:

| You do | You get |
|---|---|
| ✅ Complete a turn | +10 XP, combo +1 |
| 🧰 Call a tool | +1 XP (crafting tools like edit/cmd/SSH +2, capped +10 per turn) |
| 📋 Clear todos | +15 XP each |
| 📝 Output tokens | +1 XP per 10k |
| 💥 Fail a turn | +2 XP (consolation) |
| 💪 Rise after a failure | "Rise Again" achievement +100 XP |

### 🎓 Tutorial Chain

A 5-step intro walks you through DevQuest. Each step **+20 XP**; finish all for **+100 XP** and the exclusive title **「Rookie Adventurer」**:

```
🚶 First turn   ✏️ First edit   📋 First todo
⌨️ First command   👀 Check progress   →  🏅 Rookie Adventurer
```

Progress is shown live in the panel (`2/5 steps`).

### 🛒 Season Shop

**Season XP is currency** (resets each season, naturally anti-inflation). The standalone 🛒 Shop section shows your balance in its header:

| Item | Price | Effect |
|---|---|---|
| 🛡️ Combo Shield | 150 / 400 (×3) | Auto-consume on a failed turn, combo survives |
| 🔀 Quest Reroll | 120 | Reroll today's daily quests |
| 👑🌟 Title Badges | 250 | Show crown/star badges next to your title |

### 🎨 Theme Skins

The 🎨 Theme Skins section manages panel colors. **Buy once, own forever, switch free**:

| Skin | Price | Palette |
|---|---|---|
| 🔥 Ember | 300 | Ember orange |
| ❄️ Frost | 300 | Frost blue |
| 🌿 Verdant | 300 | Verdant green |
| 🌇 Sunset | 300 | Sunset coral |
| 🌊 Ocean | 300 | Deep teal |
| 🌸 Sakura | 300 | Sakura pink |
| 💜 Royal | 300 | Royal violet |

Each card shows a color-swatch preview. Owned skins show「Active / Use」— tap Use to switch free; unowned show a buy button.

### 📈 Growth Report

Daily XP and turns are recorded (kept 30 days). The report section shows the last 7 days as an XP bar chart.

### 🗓️ Activity Calendar

A 30-day heatmap — the greener the cell, the more XP that day.

### 📊 Stats + 🏛️ Hall of Fame

- 🏆 Highest combo / ⬆️ highest level ever (across seasons)
- 🔧 Top 5 tools used
- 🏛️ Hall of Fame: each season's best level/combo/season XP, shown as golden medals

### 🎆 Milestone Celebration

Levels at multiples of 5 (Lv.5/10/15…) trigger a full-screen golden confetti celebration with stats.

### 📅 Daily Quests

**3 random quests per day** (deterministic by date, 24-quest pool, same for everyone):

- 🗡️ Finish 5/15/30 turns · 🧰 Call 20/50/100 tools
- ✏️ 10/20 edits · ⌨️ 10/20 commands · 📋 5/10 todos · 📝 50k/150k tokens
- 🛰️ Use SSH · 🤝 Spawn 1/2 subagents · 💪 Rise after failure · 🌙 Night turn · 🎭 8 tools · 👀 Check progress

**XP settles automatically** — nothing to claim manually. Finish all 3 to unlock the day's **🎁 chest** (+50 XP, once per day).

### 🎁 Daily Lucky Draw

One **free draw per day** (weighted):

| Prize | Chance |
|---|---|
| ⚡ +50 XP | 30% |
| ⚡ +100 XP | 20% |
| 💰 +100 season currency | 15% |
| 🛡️ Combo shield ×1 | 15% |
| 🔀 Quest reroll ×1 | 10% |
| 🌟 +200 XP | 10% |

### 🗓️ Weekly Challenges

**3 goals per week** (ISO week, 12-quest pool), progress auto-tracks, complete all 3 for a **+100 XP** weekly bonus.

### 🏷️ Multiple Titles

Level titles follow your level; conditional titles unlock through real effort — switch freely in the Titles section:

| Title | Unlock |
|---|---|
| ⚒️ Hundred Smith | 100 edits/writes |
| 🗡️ Sword Smith | 500 edits/writes |
| 🏇 Centurion | 100 turns completed |
| 🌙 Month Warden | 30 consecutive active days |
| 👑 All-Rounder | Unlock all 58 achievements |

### 📤 Share Card

The 📤 Share button renders a 640×400 level card (level/title/XP bar/stats/achievement icons) as a downloadable PNG.

### 🔥 Combo

Consecutive turns multiply gains; a failure resets it:

| Combo | Multiplier |
|---|---|
| ≥ 5 | ×1.5 |
| ≥ 15 | ×2.0 |
| ≥ 30 | ×2.5 |

### 🏅 Levels & Titles

```
Lv.1-4     Apprentice
Lv.5-9     Artisan
Lv.10-14   Smith
Lv.15-19   Master
Lv.20+     Legend
```

### 🗓️ Seasons

**Auto-rotates by quarter** (`2026-S1` = 2026 Q1). Season XP/tokens reset; level and lifetime XP are permanent. A season sprint bar tracks 100k-token goal + days remaining.

### 🌍 Global Progress

**One player, one save** (`~/.dsh/devquest/player.json`): shared across all sessions/projects. Legacy per-project saves auto-merge on upgrade; event watermark dedup prevents double-counting on replay.

### 🏆 58 Achievements · Six Categories

**Journey** First Steps → Centurion → 250 turns → Iron Will → Never Give Up
**Crafting** First Edit → Hundred Edits → SSH First → Sword Smith → Subagent Commander
**Quest** Quest Accepted → Quest Master → Clean Sweep → Quest Maniac
**Time** Night Owl · Early Bird · Seven Days · Month Streak · Grinder
**Legend** Artisan Path → Master Smith → Master Path → Legend (Lv.20) → Myth (Lv.25) → Sun God (Lv.30)

> 🥚 9 hidden easter eggs (Devil Hour · Keyboard Warrior · Midnight Bell · Combo Master …) — invisible in the panel until unlocked.

- Quantifiable achievements show progress bars; the wall keeps a「Next milestone」guide
- Rarity tiers color + glow the unlock toast and wall cells (common/rare/epic/legendary)
- **Collections**: complete a category for a one-time XP bonus (Journey 10→+300, Crafting 12→+400, Quest 10→+300, Time 8→+400, Legend 8→+800, Egg 10→+500)

## 🖥️ Screenshot

⚔️ entry at the sidebar bottom; click to open the draggable panel. Achievement/turn-settlement toasts pop in the corner:

<p align="center">
  <img src="screenshots/panel.png" alt="DevQuest panel" width="440">
  <img src="screenshots/toast.png" alt="Achievement toast" width="300">
</p>

## ⚙️ Install

**Option 1: npm (recommended)**

```sh
dshpm install dsh-devquest --profile web
# or
dsh plugin --profile web add "dsh-devquest"
```

**Option 2: GitHub source**

```sh
dsh plugin --profile web add "github:lucky8197/dsh-devquest#main"
```

Restart dsh web → ⚔️ appears at the sidebar bottom.

Agents can query progress too:

```
devquest_status        # level / XP / combo / daily quests
devquest_achievements  # full achievement list & unlock state (58)
devquest_shop          # season shop: balance/items, buy=<itemId>
devquest_daily         # daily+weekly brief (plain text, pushable to IM)
devquest_reset         # reset save (dangerous, needs confirm=true)
```

## 📄 License

BSD-3-Clause
