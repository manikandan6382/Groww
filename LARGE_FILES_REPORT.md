# 📊 Codebase File Size Audit Report (> 200 Lines)

**Audit Timestamp:** 2026-09-11 12:12 IST  
**Scope:** Full Workspace (`f:\project\finance`)  
**Threshold:** > 200 Lines of Code  
**Excluded Directories:** `node_modules`, `.git`, `dist`, `bin`, `obj`, `.agents`, `.gemini`, `coverage`

---

## Executive Summary

* **Total Source Code Files > 200 Lines:** **0 files (100% Micro-Modularized)**
  * ✅ **React & Frontend (`src/client/`):** **0 files > 200 lines (401 client files 100% clean)**
  * ✅ **.NET 8 HFT / RMS Engine (`server-dotnet/`):** **0 files > 200 lines (45 C# files, 19/19 tests passing)**
  * ✅ **Node.js API & Routes (`src/routes/`):** **0 files > 200 lines**
  * ✅ **Node.js Repositories (`src/repositories/`):** **0 files > 200 lines**
  * ✅ **Core Trading Services (`src/services/`):** **0 files > 200 lines**
  * ✅ **Vanilla Terminal Scripts (`public/js/`):** **0 files > 200 lines**
* **Stylesheets (CSS/SCSS Bundles):** 3 global asset bundles (`public/styles.css`, `src/styles/app.scss`, `src/styles/.app.compiled.css`)

---

## 1. Modular Decomposition Map (`src/client/`)

All previous monolithic files have been systematically extracted, restored from the local session logs, and organized into dedicated single-responsibility submodules:

| Previous Monolithic File | Original Lines | New Architecture & Submodules | Status |
| :--- | :--- | :--- | :--- |
| [`TradeMarketJourneyTimeline.jsx`](file:///f:/project/finance/src/client/components/trading/TradeMarketJourneyTimeline.jsx) | **3,115** | Split into 35 micro-modules under `src/client/components/trading/timeline/` (canvas, splines, scrubber, playback, metrics) | ✅ All $\le 148$ lines |
| [`OrderPadSection.jsx`](file:///f:/project/finance/src/client/components/trading/OrderPadSection.jsx) | **2,528** | Split into 12 micro-modules under `src/client/components/trading/order-pad/` (asset pills, strike picker, steppers, vault) | ✅ All $\le 114$ lines |
| [`TriggeredHistorySection.jsx`](file:///f:/project/finance/src/client/components/trading/TriggeredHistorySection.jsx) | **2,501** | Split into 11 micro-modules under `src/client/components/trading/history/` (macro stats, filters, settled cards, audit drawer) | ✅ All $\le 148$ lines |
| [`useTradingStore.js`](file:///f:/project/finance/src/client/stores/useTradingStore.js) | **2,154** | Split into 19 slice modules under `src/client/stores/slices/` (orders, SL/TP, journal, undo, sync, telemetry) | ✅ All $\le 148$ lines |
| [`LiveAlertCard.jsx`](file:///f:/project/finance/src/client/components/trading/LiveAlertCard.jsx) | **1,864** | Split into 10 micro-modules under `src/client/components/trading/live-card/` (TV micro HUD, tape box, hero metrics, SL/TP dock) | ✅ All $\le 145$ lines |
| [`EquityCurveDeck.jsx`](file:///f:/project/finance/src/client/components/trading/EquityCurveDeck.jsx) | **1,672** | Split into 24 micro-modules under `src/client/components/trading/equity/` (Monte Carlo, drawdown valley, trade reel, SVG curves) | ✅ All $\le 138$ lines |
| [`PerformanceStudioSection.jsx`](file:///f:/project/finance/src/client/components/trading/PerformanceStudioSection.jsx) | **1,335** | Split into 16 micro-modules under `src/client/components/trading/studio/` (session deck, discipline matrix, alpha review) | ✅ All $\le 148$ lines |
| [`WatchlistSection.jsx`](file:///f:/project/finance/src/client/components/trading/WatchlistSection.jsx) | **1,281** | Split into 16 micro-modules under `src/client/components/trading/watchlist/` (cards grid, matrix table, depth modal, radar utils) | ✅ All $\le 150$ lines |
| [`ApplePayoffCanvas.jsx`](file:///f:/project/finance/src/client/components/trading/ApplePayoffCanvas.jsx) | **1,248** | Split into 13 micro-modules under `src/client/components/trading/payoff/` (simulator capsule, SVG canvas, math engine, presets) | ✅ All $\le 146$ lines |
| [`JournalStoryDeck.jsx`](file:///f:/project/finance/src/client/components/trading/JournalStoryDeck.jsx) | **1,037** | Split into 14 micro-modules under `src/client/components/trading/journal-story/` (story card acts, trade integrity, toolbar) | ✅ All $\le 125$ lines |
| [`LiveAlertsView.jsx`](file:///f:/project/finance/src/client/views/LiveAlertsView.jsx) | **914** | Split into 15 micro-modules under `src/client/views/live-alerts/` (hero banner, scoreboard matrix, emergency exit dock) | ✅ All $\le 139$ lines |
| [`ForeignStocksView.jsx`](file:///f:/project/finance/src/client/views/ForeignStocksView.jsx) | **859** | Split into 14 micro-modules under `src/client/views/foreign-stocks/` (simulator, grid, table, sparklines, HUD) | ✅ All $\le 147$ lines |
| [`TradeLifecycleCanvas.jsx`](file:///f:/project/finance/src/client/components/trading/TradeLifecycleCanvas.jsx) | **834** | Split into 12 micro-modules under `src/client/components/trading/lifecycle/` (spline engine, scrubber, SVG curves, levels) | ✅ All $\le 145$ lines |
| [`CustomTradeModal.jsx`](file:///f:/project/finance/src/client/components/trading/CustomTradeModal.jsx) | **783** | Split into 8 micro-modules under `src/client/components/trading/custom-trade/` (manual form, presets, brain backup, import) | ✅ All $\le 142$ lines |
| [`RosettaDrawer.jsx`](file:///f:/project/finance/src/client/components/layout/RosettaDrawer.jsx) | **637** | Split into 8 micro-modules under `src/client/components/layout/rosetta/` (basics, math risk, expectancy lab, preflight) | ✅ All $\le 139$ lines |
| [`TradeLoggerForm.jsx`](file:///f:/project/finance/src/client/components/trading/TradeLoggerForm.jsx) | **614** | Split into 14 micro-modules under `src/client/components/trading/logger/` (circuit breaker, bridge, presets, summary) | ✅ All $\le 115$ lines |
| [`PortfolioHeroBento.jsx`](file:///f:/project/finance/src/client/components/trading/PortfolioHeroBento.jsx) | **605** | Split into 8 micro-modules under `src/client/components/trading/portfolio/` (valuation header, spline chart, telemetry strip) | ✅ All $\le 158$ lines |
| [`HoldingsTable.jsx`](file:///f:/project/finance/src/client/components/trading/HoldingsTable.jsx) | **509** | Split into 9 micro-modules under `src/client/components/trading/holdings/` (concentration horizon, table row, filters) | ✅ All $\le 151$ lines |
| [`JournalAnalyticsDeck.jsx`](file:///f:/project/finance/src/client/components/trading/JournalAnalyticsDeck.jsx) | **492** | Split into 7 micro-modules under `src/client/components/trading/analytics/` (session aggregation, strategy edge, leaderboard) | ✅ All $\le 110$ lines |
| [`SettledTradesReel.jsx`](file:///f:/project/finance/src/client/components/trading/SettledTradesReel.jsx) | **490** | Split into 6 micro-modules under `src/client/components/trading/settled/` (reel header, item card, inspector dock, pagination) | ✅ All $\le 129$ lines |
| [`Topbar.jsx`](file:///f:/project/finance/src/client/components/layout/Topbar.jsx) | **483** | Split into 6 micro-modules under `src/client/components/layout/topbar/` (brand, theme vibe switcher, broker session modal) | ✅ All $\le 143$ lines |
| [`MarketIndicesStrip.jsx`](file:///f:/project/finance/src/client/components/layout/MarketIndicesStrip.jsx) | **385** | Split into 6 micro-modules under `src/client/components/layout/indices/` (index card, India VIX card, session P&L card) | ✅ All $\le 98$ lines |
| [`App.jsx`](file:///f:/project/finance/src/client/App.jsx) | **345** | Split into 7 micro-modules under `src/client/app/` (safeLazy, shortcuts, bootstrap, skeleton, toasts) | ✅ All $\le 82$ lines |
| [`useLiveAlertsFeed.js`](file:///f:/project/finance/src/client/hooks/useLiveAlertsFeed.js) | **338** | Split into 3 micro-modules under `src/client/hooks/feed/` (api sync, sse client, live feed) | ✅ All $\le 136$ lines |
| [`LuxuryDateRangePicker.jsx`](file:///f:/project/finance/src/client/components/common/LuxuryDateRangePicker.jsx) | **315** | Split into 6 micro-modules under `src/client/components/common/date-picker/` (presets, month nav, grid, range inputs) | ✅ All $\le 139$ lines |
| [`expiryUtils.js`](file:///f:/project/finance/src/client/utils/expiryUtils.js) | **309** | Split into 4 micro-modules under `src/client/utils/expiry/` (contract engine, constants, held metrics, alpha verdict) | ✅ All $\le 110$ lines |
| [`JournalMaster2CardDeck.jsx`](file:///f:/project/finance/src/client/components/trading/JournalMaster2CardDeck.jsx) | **282** | Split into 4 micro-modules under `src/client/components/trading/journal-deck/` (take-home profit, target discipline) | ✅ All $\le 122$ lines |
| [`AssetAllocationDeck.jsx`](file:///f:/project/finance/src/client/components/trading/AssetAllocationDeck.jsx) | **264** | Split into 5 micro-modules under `src/client/components/trading/asset-allocation/` (margin extractor, donut chart, telemetry) | ✅ All $\le 116$ lines |
| [`JournalView.jsx`](file:///f:/project/finance/src/client/views/JournalView.jsx) | **251** | Split into 5 micro-modules under `src/client/views/journal/` (hero banner, timeframe tabs, tax CSV export) | ✅ All $\le 90$ lines |
| [`CommandPaletteModal.jsx`](file:///f:/project/finance/src/client/components/common/CommandPaletteModal.jsx) | **242** | Split into 4 micro-modules under `src/client/components/common/command-palette/` (scalp actions, nav actions, theme actions) | ✅ All $\le 102$ lines |
| [`Sidebar.jsx`](file:///f:/project/finance/src/client/components/layout/Sidebar.jsx) | **214** | Split into 5 micro-modules under `src/client/components/layout/sidebar/` (brand profile, session odometer, nav, broker hub) | ✅ All $\le 82$ lines |
| [`AlertCreatorForm.jsx`](file:///f:/project/finance/src/client/components/trading/AlertCreatorForm.jsx) | **201** | Split into 4 micro-modules under `src/client/components/trading/alert-creator/` (strikes, inputs, form, state hook) | ✅ All $\le 86$ lines |

---

## 2. Quality & Verification Gates Passed

1. **AST Scope & Undeclared Variable Audit:**
   * Command: `npm run audit:scope`
   * Result: **100% CLEAN — 401 client files scanned, 0 undeclared variables, 0 broken bindings.**
2. **Vite Production Build:**
   * Command: `npm run build`
   * Result: **SUCCESS (2,298 modules transformed, built clean).**
3. **.NET 8 HFT Backend Tests:**
   * Command: `dotnet test server-dotnet`
   * Result: **19/19 PASSED (134 ms, 0 failed, 0 skipped).**
4. **Live Dev Server Health:**
   * Port 3003 (Vite): HTTP 200 OK
   * Port 3004 (Express): HTTP 200 OK
