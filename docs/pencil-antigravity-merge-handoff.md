# Pencil + Antigravity Merge Handoff

## Context
Existujú 4 Pencil screeny v `untitled.pen` (dark mode, Nitro design system) a Antigravity UX handoff (`docs/claude_handoff_13.2.md`). Cieľ je modifikovať Pencil dizajn podľa užitočných princípov z Antigravity handoffu.

## Pencil File
- Path: `/Users/_xvadur/singularity/untitled.pen`
- Design system: Nitro (97 reusable components)
- Theme: Dark mode `{"Mode": "Dark"}`

## Existujúce 4 Pencil Screeny

### Screen 1: Jarvis Command Center Dashboard (`pgZ00` at 0,4400)
- **Layout**: Sidebar (220px) + Main Content (absolute positioned)
- **Sidebar** (`HNWTp`): Jarvis logo, MAIN (Dashboard active, Capture, Tasks), THREADS (Runtime, Business, Jedlo, Cvičenie, Karol), SYSTEM (Systems, Settings), footer XVADUR
- **Main Content** (`38e3u`): layout=none, children have explicit x/y positions
  - Hero Card (`A8D2w`): Morning greeting, session title "Utorok 12.2 — Main Quest", Jarvis Ready status, Lv 12, XP 4280/5000, 7 day streak
  - Stats Row (`SJb7K`): 4 cards — Today PU (847/2500), XP Earned (+156), Coins (89), Cap Remaining (1653)
  - Row 3 (`dYPXy`): Active Quests table + Quick Capture card (420px)
  - Row 4 (`WdPrQ`): Recent Activity + System Status (420px)
- **Note**: Main content children have absolute positioning (layout=none) for manual editing

### Screen 2: ChatUI - Runtime Thread (`cSmAZ` at 1600,4400)
- **Layout**: Sidebar (220px, Runtime active) + Chat Center (fill) + Metrics Panel (320px)
- **Chat Header**: "Runtime Thread" title, Jarvis ON toggle
- **Messages Area**: User bubbles (blue, right-aligned) + Jarvis bubbles (dark, left with bot avatar)
- **Chat Input Bar**: Slash command buttons (/capture, /status, /queue, /brief, /journal), text input, send button
- **Metrics Panel**: Writing Metrics title, Session Stats (4 grid: Words 1247, Focus 42min, Messages 18, Commands 5), Rolling Totals (24h/7d/30d), Economy Quick View (PU/XP/Coins/Streak), Last Prompt card

### Screen 3: Tasks - PowerUnit Board (`fNPnB` at 0,5500)
- **Layout**: Sidebar (220px, Tasks active) + Main Content
- **Page Header**: "Task Management" title + New Task button
- **PU Stats Row**: 4 cards — Daily PU Budget (847/2500 with progress bar), Repeat Factor (0.77x), Soft Slowdown (1.00x), Claims Today (7)
- **Task Board**: Card with tabs (All/Habits/Dailies/Todos/Rewards), Filter button, data table with columns (Task, Type, Priority, Progress, Planned PU, Earned PU, Status), 5 data rows
- **Bottom Row**: Scoring Formula card (code block with rawDelta/repeatFactor/softFactor/deltaPU formulas) + Recent Claims card (3 claim entries with PU values)

### Screen 4: Capture Hub (`sxzmI` at 1600,5500)
- **Layout**: Sidebar (220px, Capture active) + Main Content
- **Page Header**: "Capture Hub" title + "3 pending" badge
- **Top Row**: Capture Form (type/priority selects, content textarea, planned EEU, tags, type quick buttons, Clear/Capture actions) + Economy Preview card (380px, delta PU/XP/Coins, repeat/soft factor, new total)
- **Bottom Row**: Inbox table (tabs All/Pending/Processed, 4 data rows with item/type/source/status) + Command Queue card (380px, 3 command entries with status/schedule)

## Key Component IDs (Nitro Design System)
- Sidebar: `k1Tgo` (content: `2c8Tk`, logo: `lSLqU`, name: `iv8Ku`, email: `dIC1K`)
- Sidebar Item Active: `4jfFd` (icon: `JTWa5`, text: `wawnU`)
- Sidebar Item Default: `cpj5L`
- Sidebar Section Title: `hZwCK` (text: `ypbD4`)
- Card: `tcMJ2` (header: `Ad3wl`, content: `dgIRA`, actions: `XQCHD`)
- Button Default: `bf6GF` (icon: `mXH06`, text: `MBpWS`)
- Button Ghost: `ycIFH` (icon: `mIsYg`, text: `OvCBb`)
- Button Outline: `zR7aJ` (text: `PRqbh`)
- Button Secondary: `Simex`
- Label Success: `Flr2U` (text: `nrDvY`)
- Label Warning: `SAgX1`
- Label Info: `Cq7qy`
- Progress: `ZaNGp` (fill: `Lvl5A`)
- Switch Checked: `iSf6e` (label: `pioH2`)
- Switch Unchecked: `nE3IN`
- Input Group: `5wVfn` (label: `u8QE6`, input: `QEFFJ`)
- Textarea Group: `mFYne` (label: `Bh1if`, value: `RsVzA`)
- Select Group: `O03YO` (label: `EJCCp`, value: `7Thbt`)
- Tabs: `zX0Hk`, Tab Active: `ahgnz` (text: `z2WJL`), Tab Inactive: `wf5LJ`
- Table Row: `UvBer`, Table Cell: `mOJ51`, Column Header: `YHeNj`
- Alert Info: `vnlpI`

## Antigravity Handoff Princípy (z `docs/claude_handoff_13.2.md`)

### Užitočné — APLIKOVAŤ na Pencil:

1. **`/chat` = Denný Feed (nie klasický chat)**
   - Chronologický feed všetkého čo user za deň napíše (capture, logy, journal)
   - Jarvis ako "anotátor" — jeho odpovede sú vložené bloky medzi user textom
   - Lifecycle: O 03:00 sa feed zabaľuje a archivuje, nový deň = čistý štít
   - **Zmena v Pencile**: Prebudovať Screen 2 z chat bubbles na denný feed s rôznymi blokmi (capture entry, log entry, journal entry, Jarvis annotation)

2. **BottomCaptureBar — persistentná lišta**
   - Vždy po ruke, na všetkých stránkach
   - Módové prepínanie: Capture (Cmd+C), Log (Cmd+L), Tasks (Cmd+T), Daily (Cmd+D)
   - "Prose-first" dizajn — písanie textu je hlavné
   - **Zmena v Pencile**: Pridať BottomCaptureBar na všetky 4 screeny

3. **Morning Brief Card vylepšenie**
   - Polia: Topic, Energia (slider), Sľub dňa (daily promise)
   - Tým sa otvorí runtime thread pre daný deň
   - **Zmena v Pencile**: Rozšíriť hero card na Screen 1 o Morning Brief flow

4. **Stats Grid na Dashboard**
   - Level, XP, Počet napísaných slov (dnes vs včera), Word count (LotR benchmark)
   - **Zmena v Pencile**: Pridať word count metriky do stats row na Screen 1

5. **Inbox sekcia na `/tasks`**
   - Nespracované veci z Capture ako prvá sekcia pred task boardom
   - **Zmena v Pencile**: Pridať Inbox kartu na Screen 3

### Už v Pencile dobre — NECHAŤ:
- Sidebar navigácia s thread kategóriami
- PU ekonomika (štatistiky, scoring formula, claim history)
- Task board s Habitica tabmi
- System Status panel
- Writing Metrics panel
- Economy Preview na capture

### Z handoffu IGNOROVAŤ (duplicitné alebo príliš implementačné):
- Technická architektúra (to je pre kód, nie dizajn)
- Dátový tok detaily (file-first, JSONL — backend concern)
- Gamifikácia formuly (už v Pencile ako Scoring Formula card)

## Execution Plan

### Phase 1: Dashboard Upgrade (Screen 1)
- Rozšíriť Hero Card o Morning Brief flow (topic input, energy slider, daily promise)
- Pridať word count metriky do Stats Row (dnes vs včera, LotR benchmark progress)
- Pridať BottomCaptureBar (persistentná lišta na spodku)

### Phase 2: Chat → Denný Feed (Screen 2)
- Prebudovať messages area na chronologický denný feed
- Rôzne typy blokov: capture entry, log entry, journal prose, Jarvis annotation
- Zachovať metrics panel vpravo
- Pridať denný header (dátum, morning brief summary)
- Pridať BottomCaptureBar

### Phase 3: Tasks + Inbox (Screen 3)
- Pridať Inbox kartu pred task board (nespracované veci z capture)
- Zachovať PU ekonomiku, task board, scoring formula
- Pridať BottomCaptureBar

### Phase 4: Capture Refinement (Screen 4)
- Pridať módové prepínanie (Capture/Log/Tasks/Daily) do capture formu
- Klávesové skratky indikátory
- Prose-first textarea dizajn
- Integrovať BottomCaptureBar ako hlavný capture povrch

## API Contracts (pre referenčný kontext)
- `GET /api/status` → player, overview, economy, quests, tasks, inbox, commands, vitality, systems
- `POST /api/capture` → { type, content, priority, tags, meta } → { ok, item, economyEffect }
- `POST /api/jarvis/chat` → { threadId, message } → { reply, history }
- `GET /api/jarvis/history` → { messages[] }
- `GET /api/jarvis/commands` → { queue[], stats }
- `POST /api/jarvis/inbox/process` → { summary }

## Design Variables (Nitro theme)
- Background: `$--background`
- Foreground: `$--foreground`
- Card: `$--card`
- Primary: `$--primary`
- Border: `$--border`
- Muted: `$--muted`, `$--muted-foreground`
- Success: `$--color-success-foreground`
- Warning: `$--color-warning-foreground`
- Destructive: `$--destructive`
- Sidebar: `$--sidebar`
- Fonts: Roboto (primary), Roboto Mono (code/numbers)
