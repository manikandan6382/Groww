# PortfolioX Live Alerts — Full Redesign Plan

## Goal
Redesign the Live Alerts page (`/paper-lab`) to exactly match the mockup:
`https://cdn.corenexis.com/f/bHJcSFUFaTF.png`

Groww-style premium dark trading terminal. Every section pixel-matched.

---

## Project Context

- **Location**: `c:\Users\LAP-249\Documents\Projects\finance`
- **Stack**: Pure Node.js ESM, SQLite (better-sqlite3), no framework
- **Dashboard URL**: `http://127.0.0.1:3000`
- **CSS Pipeline**: SCSS → sass → tailwindcss → `public/styles.css`
  - Build command: `npm run build:css`
  - MUST run after every SCSS change
- **Start server**: `npm start`

---

## Files That Change

1. `src/styles/app.scss` — CSS redesign (~2000+ lines, full file)
2. `public/js/paper-lab.js` — Frontend JS fixes
3. `public/index.html` — Minor HTML structure fixes only if needed

## Files That NEVER Change (backend complete)

- `src/routes/trades.routes.js`
- `src/repositories/paper-lab.repository.js`
- `src/services/paperTradeEngine.js`
- `src/services/upstoxClient.js`
- `src/services/analytics/performance-engine.js`
- `data/portfoliox.db`
- `src/server.js`, `src/web-server.js`

---

## DOM IDs (from index.html)

### KPI Strip (5 cards)
- `#cardActiveAlerts` → `#paperActiveCount` (strong), "Watching now" (small)
- `#cardTriggeredToday` → `#paperTriggeredToday` (strong), "Alerts triggered" (small)
- `#cardTodayPnl` → `#paperWeekPnl` (strong), `#paperPnlPct` (small)
- `#cardWinRate` → `#paperWinRate` (strong), `#paperTradeCount` (small)
- `#cardMarketFeed` → `#paperMarketFeedStatus` (strong), `#paperTriggeredTotal` (small)

### Live Tracking (center column)
- `#paperOpenTrades` — container for `.live-alert-card` items
- `#paperOpenCount` — badge showing "3 Active" or "WAITING"

### Alert Feed (right column)
- `#paperAlertList` — container for `.paper-alert-row` items
- `#feedCountAll`, `#feedCountActive`, `#feedCountTriggered` — tab badges (referenced in JS but NOT in HTML yet — need to add)

### Bottom Row
- `#paperClosedTrades` — tbody for triggered alerts table
- `#paperDailyBars` — container for `.paper-bar` items
- `#bottomDailyPnl`, `#bottomDailyPnlPct` — daily P&L summary
- `#summaryTotalPnl`, `#summaryTotalPnlPct` — weekly summary
- `#summaryWinRate`, `#summaryWinLossCounts`
- `#summaryTotalTrades`, `#summaryTotalTradesCompare`
- `#paperBestWorst` — container for `.paper-bestworst-item` items

### Form
- `#paperTradeForm` — the create alert form
- `#paperRiskPreview` — 4-cell risk grid (Capital/Max Loss/Target Profit/R:R)
- `#paperLotNote` — lot size note
- `#paperFormStatus` — status pill (Ready/Loading/Error)
- `#liveClock` — live datetime display

---

## JS Functions (from paper-lab.js)

### Data Flow
- `initPaperLab()` — sets up all event listeners, calls `loadPaperLab()`
- `loadPaperLab()` — fetches `/api/live-alerts?range=week`, calls all render functions
- `renderPaperSummary(lab)` — fills all 5 KPI cards + bottom row summary
- `renderOpenPaperTrades(trades)` — fills `#paperOpenTrades` with `.live-alert-card` items
- `renderClosedPaperTrades(trades)` — fills `#paperClosedTrades` tbody
- `renderPaperAlerts(lab)` — fills `#paperAlertList` with `.paper-alert-row` items
- `renderWeeklyVisuals(lab)` — fills `#paperDailyBars` bar chart
- `renderBestWorstAlerts(trades)` — fills `#paperBestWorst`

### Preview Data (shown when no real DB trades)
```js
previewOpenAlerts = [
  { id: "preview-1", symbol: "NIFTY 24500 CE", optionType: "CALL", entryPrice: 26.5, lastMarkPrice: 30.75, targetPrice: 35, stopLoss: 25, quantity: 1, lotSize: 75, ... },
  { id: "preview-2", symbol: "BANKNIFTY 52000 PE", optionType: "PUT", entryPrice: 235.5, lastMarkPrice: 210.4, ... },
  { id: "preview-3", symbol: "NIFTY 24400 CE", optionType: "CALL", entryPrice: 66.5, lastMarkPrice: 88.25, ... },
]
previewClosedAlerts = [5 trades with netPnl values]
```
Logic: if `lab.openTrades.length === 0 && lab.closedTrades.length === 0`, preview data is used.

### Key HTML generators
- `renderLiveAlertCard(trade)` — returns HTML string for `.live-alert-card`
- `renderMiniSparkline(trade, movePct)` — returns SVG sparkline
- `renderBestWorstItem(trade, label, tone)` — returns HTML for best/worst item

### SSE
- `connectPaperSse()` — connects to `/api/live-alerts/live-events`
- `updateTradeLtpInUi(tradeId, ltp)` — updates LTP in existing card without re-render

---

## CSS Classes (from app.scss)

### Layout
- `.paper-lab-board` / `.live-alerts-board` — page wrapper, `display: grid; gap: 16px`
- `.paper-page-head` — header row with title + datetime badge
- `.live-alert-metrics` — KPI strip, `grid-template-columns: repeat(5, 1fr)`
- `.live-alert-grid` — 3-column main grid: `360px / 1fr / 290px`
- `.live-alert-column` — each column wrapper
- `.paper-bottom-grid` — 4-column bottom: `1.6fr / 1fr / 1fr / 0.9fr`

### KPI Cards
- `.paper-metric` — each KPI card
- `.paper-metric-icon` — icon box (40×40, colored per card)
- `.paper-metric span` — label (uppercase, muted)
- `.paper-metric strong` — big number (22px, white)
- `.paper-metric small` — subtitle (11px, muted)
- Per-card icon colors: `#cardActiveAlerts`=blue, `#cardTriggeredToday`=cyan, `#cardTodayPnl`=green, `#cardWinRate`=blue, `#cardMarketFeed`=cyan

### Live Alert Cards
- `.live-alert-card` — card wrapper (`.call` or `.put` modifier)
- `.live-alert-card-head` — top row: symbol + CALL/PUT badge + WATCHING pill
- `.paper-side-badge.call` — cyan badge
- `.paper-side-badge.put` — red badge
- `.paper-live-pill` — "WATCHING" green pill with pulsing dot
- `.live-alert-card-body` — `grid: 1fr auto`
- `.live-alert-main-metrics` — 3-col metrics (LTP / Target / SL)
- `.live-alert-side` — right side with time + sparkline
- `.live-alert-sparkline` — SVG sparkline (green for CALL, red for PUT)
- `.live-alert-progress-row` — P&L + progress bar row
- `.paper-progress` — progress bar container
- `.paper-mark-row` — manual LTP input + action buttons
- `.action-btn-group` — Check LTP / Close Alert / Delete buttons
- `.live-alert-card-reason` — entry reason text at bottom

### Alert Feed
- `.paper-alert-tabs` — tab bar (All / Active / Triggered)
- `.tab-badge` — count badge inside tab button
- `.paper-alert-list` — scrollable feed container
- `.paper-alert-row` — each feed item (`.win` / `.loss` / `.active` / `.risk`)
- `.alert-icon` — colored dot icon (`.target-hit` / `.stop-loss` / `.watching`)
- `.alert-info` — text content
- `.alert-title-row` — title + time
- `.alert-badge-pill` — P&L badge (`.gain` / `.loss` / `.watching`)

### Bottom Row
- `.paper-recent` — triggered alerts table panel
- `.compact-table` — table wrapper with max-height scroll
- `.type-badge.call` / `.type-badge.put` — CALL/PUT badges in table
- `.outcome-badge.gain` / `.outcome-badge.loss` — result badges
- `.paper-daily-pnl` — daily P&L chart panel
- `.daily-pnl-summary` — big P&L number + pct
- `.paper-daily-bars` — bar chart container
- `.paper-bar` — each bar (`.gain` / `.loss` / `.quiet`)
- `.paper-weekly-summary` — weekly summary panel
- `.summary-stats-grid` — 3-col grid
- `.summary-stat-box` — each stat box
- `.paper-best-worst` — best/worst panel
- `.paper-bestworst-list` — container
- `.paper-bestworst-item` — each item (`.best` / `.worst`)

### Colors (CSS vars)
```css
--bg: #020812
--panel: #061423
--cyan: #00d5ff
--green: #00f5c4
--red: #ff5d6c
--blue: #168fff
--text: #f4f8ff
--muted: #8fa6bd
--muted-2: #5f7890
--line: rgba(0, 184, 255, 0.22)
--line-soft: rgba(115, 183, 229, 0.11)
--accent-gradient: linear-gradient(90deg, #0d8cff, #00d5ff)
```

---

## Known Issues to Fix

### Issue 1: Alert Feed tab badges missing in HTML
`renderPaperAlerts()` in JS tries to update `#feedCountAll`, `#feedCountActive`, `#feedCountTriggered` but these IDs don't exist in `index.html`. The tab buttons in HTML are plain text with no badge spans.

**Fix needed in index.html**: Add badge spans to the 3 tab buttons:
```html
<button class="active" type="button">All <span class="tab-badge" id="feedCountAll">0</span></button>
<button type="button">Active <span class="tab-badge" id="feedCountActive">0</span></button>
<button type="button">Triggered <span class="tab-badge" id="feedCountTriggered">0</span></button>
```

### Issue 2: Progress bar CSS uses `::after` pseudo-element
`.paper-progress i::after` sets the actual bar width to 100% always (ignores inline `style="width:X%"`). The `i` element has `style="width:X%"` set by JS but the `::after` fills 100%.

**Fix needed in app.scss**: Change progress bar to use the `i` element width directly, not `::after`.

### Issue 3: `.live-alert-card` has duplicate/conflicting CSS
The class appears multiple times in app.scss with different rules. The later rules override earlier ones. Need to consolidate.

---

## Phase Plan

### PHASE 1 — Fix KPI Strip
**Files**: `app.scss` only
**Problem**: Cards render but styling needs polish to match mockup
**Target**: All 5 KPI cards show correct values with proper colors, icons, glow

Cards in mockup:
- Active Alerts → bell icon, blue accent, count + "Watching now"
- Triggered Today → target icon, cyan accent, count + "Alerts triggered"
- Today P&L → ₹ symbol, green accent, `+₹1,250.75` green + `+1.27%`
- Win Rate → % symbol, blue accent, `64.29%` + "9 Wins / 5 Losses"
- Market Feed → wifi icon, cyan accent, "Live" green / "Waiting" muted

### PHASE 2 — Fix Alert Feed Tab Badges
**Files**: `index.html` (add badge spans), `app.scss` (tab styling)
**Problem**: Tab count badges not showing because IDs missing in HTML
**Target**: Tabs show "All (8) | Active (3) | Triggered (5)" with styled badges

### PHASE 3 — Fix Progress Bar
**Files**: `app.scss` only
**Problem**: `::after` pseudo-element ignores inline width, always shows 100%
**Target**: Progress bar correctly shows % to target (e.g. 45% filled)

### PHASE 4 — Live Tracking Cards Polish
**Files**: `app.scss` only
**Problem**: Cards render but sparklines/layout need polish
**Target**: 3 cards showing NIFTY/BANKNIFTY with all data visible, sparklines glowing

### PHASE 5 — Alert Feed Items Polish
**Files**: `app.scss` only
**Problem**: Feed items render but colored dots/badges need polish
**Target**: Feed shows items with green/red/blue dots, correct P&L badges

### PHASE 6 — Bottom Row Polish
**Files**: `app.scss` only
**Problem**: All 4 bottom panels need visual polish
**Target**: Table, bar chart, weekly summary, best/worst all styled correctly

### PHASE 7 — Final Glow & Color Polish
**Files**: `app.scss` only
**Problem**: Missing glow effects, border accents, hover states
**Target**: Matches mockup exactly — card glows, cyan borders, gradient buttons

---

## Execution Rules

- Read ALL needed files before writing ANY file
- Make all changes to a single file in ONE call (no incremental edits)
- Max 2-3 files per response turn
- After each phase: take screenshot to verify before continuing
- Run `npm run build:css` after every SCSS change
- Never touch backend files

---

## API Endpoints (for reference)

- `GET /api/live-alerts?range=week` — returns `{ openTrades, closedTrades, analytics }`
- `POST /api/live-alerts/trades` — create alert
- `POST /api/live-alerts/trades/:id/mark` — check LTP
- `POST /api/live-alerts/trades/:id/close` — close alert
- `POST /api/live-alerts/trades/:id/delete` — delete alert
- `GET /api/live-alerts/live-events` — SSE stream

---

## Success Criteria

- All 5 KPI cards show correct data with proper colors
- 3 Live Tracking cards visible with sparklines + progress bars working
- Alert Feed shows 8+ items with correct color coding + tab counts
- Create Alert form is polished and functional
- All 4 bottom panels populated and styled
- Colors match mockup: `#020812` bg, `#00d5ff` cyan, `#00f5c4` green, `#ff5d6c` red
- Overall rating: 9/10 matching the mockup
