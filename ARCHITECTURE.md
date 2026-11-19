# PortfolioX — System Architecture & Developer Blueprint

> **Quick Reference for AI Agents & Developers**: Read this file first when starting any new session to immediately grasp the system runtime, state slices, risk invariants, and verification protocols.

---

## 1. Runtime Topology & Services

| Service | Port / URL | Tech Stack | Role |
|---|---|---|---|
| **Frontend UI** | `http://localhost:3003` | React 18, Vite, Tailwind CSS, Lucide Icons | Real-time trading cockpit, option chains, charts, and telemetry |
| **RMS Engine & Quotes API** | `http://127.0.0.1:5001` | .NET 8 Minimal API, C# | High-speed risk management, rate-limited Upstox v2 quotes, order routing |
| **Fallback / Local Server** | `http://localhost:3003/api` | Node.js (ESM), SQLite (`better-sqlite3`) | Paper trade persistence, SQLite WAL journal, portfolio sync |
| **Dev Daemon** | `npm run dev` | `concurrently` | Starts .NET API and Vite frontend simultaneously |

---

## 2. Core State Management (Zustand Slices)

All global client state lives in `src/client/stores/useTradingStore.js`, composed of modular slices in `src/client/stores/slices/`:

- **`createOrderExecutionSlice.js`**: `deployPracticeTrade()`, pre-flight risk checks, adverse slippage simulation, `openAlerts`, `closedAlerts`, `deployToast`.
- **`createPreferencesSlice.js`**: `brokerStatus` (`upstoxConnected`, `kiteConnected`, `upstoxExpired`, `kiteExpired`), `authenticatingBroker`.
- **`createSlManagementSlice.js`** & **`createTpManagementSlice.js`**: Real-time stop loss, take-profit trailing, and partial profit locks.
- **`createCoolingVaultSlice.js`**: Anti-tilt cooldown lockout and 15-minute capital discipline vault.
- **`createOrderSquareOffSlice.js`**: Instant individual or mass square-off (`squareOffAll`).

---

## 3. Manikandan's Immutable Capital Risk & Reward Invariants

All trade deployment logic in `useOrderPadExecution.js`, `createOrderExecutionSlice.js`, and `paper-orders-routes.js` strictly enforces:

1. **Maximum Loss per trade**: Strictly **₹200 to ₹300** (Default target risk = **₹250**, hard cap **₹300**).
2. **Aim / Target per trade**: Strictly **₹400 to ₹600** (Default target gain = **₹500**, exact 1:2.00 Risk-to-Reward).
3. **Dynamic Slippage Pegging**: When entry slippage is applied (`entryFillPrice = baseEntry + slippage`), Stop Loss and Target MUST anchor to the filled price using planned SL points (`slPoints = baseEntry - stopLoss`). This prevents slippage from inflating risk beyond the ₹300 ceiling.
4. **NO Percentage-Based Stop Loss**: Never use `ltp * 0.85`. Always derive SL points from the ₹250 risk budget (`slPoints = 250 / qty`).

---

## 4. Live Broker Authentication Lifecycle

- **Popup Tab Flow (`brokerPopupAuth.js`)**:
  - Reconnects via `window.open` in a clean popup tab.
  - Handshake completes via `window.opener.postMessage` (`UPSTOX_AUTH_SUCCESS`, `KITE_AUTH_SUCCESS`).
  - Strict CSRF `state` nonce validated by backend with 15-minute sliding TTL.
- **SEBI 06:00 AM IST Auto-Trip (`feedApiSync.js`)**:
  - Automatically trips Kite token status to expired at 06:00 AM IST.
- **Runtime 401 Circuit Breaker (`UpstoxMarketService.cs`)**:
  - Any HTTP 401 Unauthorized from Upstox instantly trips `IsTokenExpired() = true` and purges cached quotes, preventing frozen UI states.
- **Pre-Flight Order Pad Guard (`useOrderPadExecution.js`)**:
  - Blocks orders if the broker session is expired and prompts 1-click popup reconnect.

---

## 5. Mandatory Verification Commands

Before reporting any task complete in any chat:
1. **AST Bindings & Scope Audit**:
   ```powershell
   node scripts/audit-bindings.mjs
   ```
   *Must report 100% clean, 0 undeclared variables.*
2. **.NET Backend Test Suite**:
   ```powershell
   dotnet test server-dotnet/TradingSystem.Tests
   ```
   *All 59+ unit tests must pass.*
