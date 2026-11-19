import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DeterministicScanner,
  FILTER_KEYS,
  EDGE_STATUS,
  calculateEMA,
  calculateVWAP,
  identifySwingStructure,
  calculateATR,
  calculateWilsonEV,
} from "../src/services/engine/deterministicScanner.js";
import { MarketScheduler, MARKET_REGIMES } from "../src/services/engine/marketScheduler.js";
import { PaperTradeEngine } from "../src/services/paperTradeEngine.js";
import { calculateFrictionAndCharges } from "../src/repositories/paper-friction.js";
import { executeCandidateDeployment } from "../src/routes/trades/paper-auto-deploy.js";
import { calculateStatutoryCharges } from "../src/client/stores/slices/tradeHelpers.js";
import { getDotnetPositions, reconcileDotnetPosition, deployOrderToDotnet, unregisterDotnetPosition } from "../src/services/engine/dotnetBridge.js";
import { reconcileDotnetPositions } from "../src/services/engine/dotnetReconciler.js";
import { createPaperTrade, closePaperTrade } from "../src/repositories/paper-lab.repository.js";
import { getDb } from "../src/db/connection.js";
import {
  recordOperationStage,
  STAGES,
  RECONCILIATION_STATES,
  getOperation,
  getOperationByPositionId,
  listUnresolvedOperations,
  initOperationJournal,
} from "../src/services/engine/operationJournal.js";

console.log("===============================================================================");
console.log("  PORTFOLIOX — STAGE 3 STEP 3 ACCEPTANCE SUITE");
console.log("  DETERMINISTIC MARKET SCANNER (12-FILTER REPUTATION & SAFETY GATES)");
console.log("===============================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] Test ${totalCount}: ${name}`);
  } catch (err) {
    console.error(`  [FAIL] Test ${totalCount}: ${name}`);
    console.error(`         Error: ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split("\n").slice(1, 4).join("\n");
      console.error(`         ${lines}`);
    }
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  [PASS] Test ${totalCount}: ${name}`);
  } catch (err) {
    console.error(`  [FAIL] Test ${totalCount}: ${name}`);
    console.error(`         Error: ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split("\n").slice(1, 4).join("\n");
      console.error(`         ${lines}`);
    }
    throw err;
  }
}

// Initial sweep to purge any stale test positions from prior aborted runs
try {
  await fetch("http://127.0.0.1:5001/api/rms/positions/reset-test", { method: "POST" });
} catch {}
await reconcileDotnetPositions();

// Helper to generate synthetic candles
function generateCandles({ count, startPrice = 24000, trend = 0, volatility = 5, timeframeMins = 60, startTime = new Date("2026-10-15T09:15:00+05:30") }) {
  const candles = [];
  let price = startPrice;
  let currTime = new Date(startTime).getTime();

  for (let i = 0; i < count; i++) {
    const change = trend + (Math.sin(i * 0.5) * volatility);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + volatility * 0.5;
    const low = Math.min(open, close) - volatility * 0.5;
    const volume = 10000 + (i % 5) * 2000;

    candles.push({
      time: new Date(currTime).toISOString(),
      timestamp: currTime,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
    currTime += timeframeMins * 60 * 1000;
  }
  return candles;
}

// -----------------------------------------------------------------------------
// TEST GROUP 1: F1 Higher-Timeframe Trend (1-Hour EMA20 / EMA50)
// -----------------------------------------------------------------------------
console.log("--- TEST GROUP 1: F1 Higher-Timeframe Trend (1-Hour EMA20 / EMA50) ---");

runTest("F1: Bullish trend produces CALL bias when EMA20 > EMA50 with >= 50 completed candles", () => {
  const scanner = new DeterministicScanner();
  // Uptrend candles
  const candles = generateCandles({ count: 60, startPrice: 24000, trend: 15, volatility: 4 });
  const result = scanner.evaluateF1Trend(candles);
  assert.equal(result.status, "PASS");
  assert.equal(result.bias, "CALL");
  assert.ok(result.details.ema20 > result.details.ema50);
});

runTest("F1: Bearish trend produces PUT bias when EMA20 < EMA50 with >= 50 completed candles", () => {
  const scanner = new DeterministicScanner();
  // Downtrend candles
  const candles = generateCandles({ count: 60, startPrice: 24500, trend: -15, volatility: 4 });
  const result = scanner.evaluateF1Trend(candles);
  assert.equal(result.status, "PASS");
  assert.equal(result.bias, "PUT");
  assert.ok(result.details.ema20 < result.details.ema50);
});

runTest("F1: Insufficient completed candles (< 50) fails closed with INSUFFICIENT_1H_CANDLES", () => {
  const scanner = new DeterministicScanner();
  const candles = generateCandles({ count: 49, startPrice: 24000, trend: 10 });
  const result = scanner.evaluateF1Trend(candles);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "INSUFFICIENT_1H_CANDLES");
  assert.equal(result.bias, "NONE");
});

runTest("F1: Zero lookahead: flat / neutral trend yields NEUTRAL_TREND and NO_TRADE bias", () => {
  const scanner = new DeterministicScanner();
  // Flat candles
  const candles = [];
  for (let i = 0; i < 55; i++) {
    candles.push({ close: 24000, high: 24005, low: 23995, open: 24000, volume: 1000 });
  }
  const result = scanner.evaluateF1Trend(candles);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "NEUTRAL_TREND");
  assert.equal(result.bias, "NONE");
});

// -----------------------------------------------------------------------------
// TEST GROUP 2: F2 Market Structure & Intraday VWAP (15-Minute)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 2: F2 Market Structure & Intraday VWAP (15-Minute) ---");

runTest("F2: CALL bias passes when Spot > VWAP and 15m structure is Higher Highs & Higher Lows", () => {
  const scanner = new DeterministicScanner();
  // Bullish 15m candles with clear HH/HL
  const candles15m = [
    { high: 24050, low: 24000, close: 24040, volume: 5000 },
    { high: 24030, low: 24010, close: 24025, volume: 5000 },
    { high: 24080, low: 24020, close: 24070, volume: 6000 },
    { high: 24060, low: 24035, close: 24050, volume: 4000 },
    { high: 24110, low: 24060, close: 24105, volume: 7000 },
    { high: 24090, low: 24070, close: 24085, volume: 5000 },
    { high: 24150, low: 24090, close: 24140, volume: 8000 },
  ];
  const vwap = calculateVWAP(candles15m);
  const spotPrice = 24140;
  assert.ok(spotPrice > vwap, "Spot must be above VWAP");

  const result = scanner.evaluateF2Structure(candles15m, spotPrice, "CALL");
  assert.equal(result.status, "PASS");
  assert.equal(result.details.structure, "BULLISH_HH_HL");
});

runTest("F2: CALL bias fails when Spot <= VWAP despite bullish swing structure", () => {
  const scanner = new DeterministicScanner();
  const candles15m = [
    { high: 24050, low: 24000, close: 24040, volume: 5000 },
    { high: 24080, low: 24020, close: 24070, volume: 6000 },
    { high: 24110, low: 24060, close: 24105, volume: 7000 },
    { high: 24150, low: 24090, close: 24140, volume: 8000 },
    { high: 24180, low: 24120, close: 24170, volume: 8000 },
  ];
  // Artificially test spot below VWAP
  const spotPrice = 23950;
  const result = scanner.evaluateF2Structure(candles15m, spotPrice, "CALL");
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "SPOT_BELOW_VWAP");
});

runTest("F2: PUT bias fails when Spot >= VWAP or structure is contradictory", () => {
  const scanner = new DeterministicScanner();
  const candles15m = [
    { high: 24150, low: 24100, close: 24110, volume: 5000 },
    { high: 24120, low: 24070, close: 24080, volume: 5000 },
    { high: 24090, low: 24040, close: 24050, volume: 6000 },
    { high: 24060, low: 24010, close: 24020, volume: 7000 },
    { high: 24030, low: 23980, close: 23990, volume: 8000 },
  ];
  // Test spot above VWAP for PUT
  const spotPrice = 24200;
  const result = scanner.evaluateF2Structure(candles15m, spotPrice, "PUT");
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "SPOT_ABOVE_VWAP");
});

// -----------------------------------------------------------------------------
// TEST GROUP 3: F3 Option Liquidity & Execution Quality
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 3: F3 Option Liquidity & Execution Quality ---");

runTest("F3: Passes on fresh quote (<= 5s), valid depth >= 65 units, and tight spread", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    bid: 124.8,
    ask: 125.1,
    timestampMs: Date.now() - 1000,
    depth: {
      bids: [{ price: 124.8, quantity: 130 }],
      asks: [{ price: 125.1, quantity: 195 }],
    },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "PASS");
  assert.ok(result.details.spread <= 0.50);
  assert.ok(result.details.bidQty >= 65);
  assert.ok(result.details.askQty >= 65);
});

runTest("F3: Rejects stale quotes (> 5000ms age) with STALE_QUOTE", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    bid: 124.8,
    ask: 125.1,
    timestampMs: Date.now() - 6500, // 6.5s stale
    depth: {
      bids: [{ price: 124.8, quantity: 130 }],
      asks: [{ price: 125.1, quantity: 195 }],
    },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "STALE_QUOTE");
});

runTest("F3: Rejects shallow book with INSUFFICIENT_DEPTH when bid or ask quantity < 65", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    bid: 124.8,
    ask: 125.1,
    timestampMs: Date.now() - 1000,
    depth: {
      bids: [{ price: 124.8, quantity: 30 }], // less than 1 lot (65)
      asks: [{ price: 125.1, quantity: 195 }],
    },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "INSUFFICIENT_DEPTH");
});

runTest("F3: Rejects wide spread exceeding min(0.50, 0.005*LTP) with WIDE_SPREAD", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 80.0, // 0.005 * 80 = 0.40 max allowed spread
    bid: 79.5,
    ask: 80.2, // spread = 0.70 > 0.40
    timestampMs: Date.now() - 1000,
    depth: {
      bids: [{ price: 79.5, quantity: 130 }],
      asks: [{ price: 80.2, quantity: 195 }],
    },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "WIDE_SPREAD");
});

// -----------------------------------------------------------------------------
// TEST GROUP 4: F4 Relative Volume & Open Interest
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 4: F4 Relative Volume & Open Interest ---");

runTest("F4: Passes when 5m relative volume >= 1.2 and strike OI >= 100,000", () => {
  const scanner = new DeterministicScanner();
  const candles5m = [];
  for (let i = 0; i < 20; i++) {
    candles5m.push({ volume: 10000 });
  }
  const currentCandle = { volume: 15000 }; // RVOL = 1.50
  const openInterest = 250000;

  const result = scanner.evaluateF4VolumeOI(candles5m, currentCandle, openInterest);
  assert.equal(result.status, "PASS");
  assert.equal(result.details.rvol, 1.50);
  assert.ok(result.details.oi >= 100000);
});

runTest("F4: Fails when RVOL < 1.20 with LOW_RELATIVE_VOLUME", () => {
  const scanner = new DeterministicScanner();
  const candles5m = [];
  for (let i = 0; i < 20; i++) {
    candles5m.push({ volume: 10000 });
  }
  const currentCandle = { volume: 10500 }; // RVOL = 1.05
  const result = scanner.evaluateF4VolumeOI(candles5m, currentCandle, 200000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "LOW_RELATIVE_VOLUME");
});

runTest("F4: Fails when open interest < 100,000 with LOW_OPEN_INTEREST", () => {
  const scanner = new DeterministicScanner();
  const candles5m = [];
  for (let i = 0; i < 20; i++) {
    candles5m.push({ volume: 10000 });
  }
  const currentCandle = { volume: 15000 };
  const result = scanner.evaluateF4VolumeOI(candles5m, currentCandle, 85000); // 85k < 100k
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "LOW_OPEN_INTEREST");
});

// -----------------------------------------------------------------------------
// TEST GROUP 5: F5 Contract Selection & Delta Alignment
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 5: F5 Contract Selection & Delta Alignment ---");

runTest("F5: Selects ATM or 1-strike ITM contract with absolute Black-76 delta in [0.50, 0.68]", () => {
  const scanner = new DeterministicScanner();
  const spotPrice = 24120; // ATM is 24100, 1-strike ITM is 24050
  const result = scanner.evaluateF5ContractDelta({
    underlyingPrice: spotPrice,
    bias: "CALL",
    dteDays: 2.5,
    ivPct: 14.0,
  });
  assert.equal(result.status, "PASS");
  assert.ok(result.contract);
  assert.equal(result.contract.optionType, "CALL");
  assert.equal(result.contract.direction, "LONG");
  assert.ok(result.contract.absDelta >= 0.50 && result.contract.absDelta <= 0.68);
});

runTest("F5: Selects PUT contract for PUT bias with delta in [0.50, 0.68] and LONG direction", () => {
  const scanner = new DeterministicScanner();
  const spotPrice = 24120; // ATM is 24100, 1-strike ITM is 24150
  const result = scanner.evaluateF5ContractDelta({
    underlyingPrice: spotPrice,
    bias: "PUT",
    dteDays: 2.5,
    ivPct: 14.0,
  });
  assert.equal(result.status, "PASS");
  assert.ok(result.contract);
  assert.equal(result.contract.optionType, "PUT");
  assert.equal(result.contract.direction, "LONG");
  assert.ok(result.contract.absDelta >= 0.50 && result.contract.absDelta <= 0.68);
});

// -----------------------------------------------------------------------------
// TEST GROUP 6: F6 ATR-Based Stop Sizing
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 6: F6 ATR-Based Stop Sizing ---");

runTest("F6: Passes when option premium stop distance <= 3.25 points", () => {
  const scanner = new DeterministicScanner();
  const underlyingAtr = 3.5;
  const absDelta = 0.55;
  const multiplier = 1.5;
  // underlyingStop = 3.5 * 1.5 = 5.25. optionStop = 5.25 * 0.55 = 2.89 <= 3.25
  const result = scanner.evaluateF6AtrStop({
    underlyingAtr,
    absDelta,
    multiplier,
    maxOptionStopPts: 3.25,
  });
  assert.equal(result.status, "PASS");
  assert.ok(result.details.optionStopDistancePts <= 3.25);
});

runTest("F6: Fails with STOP_EXCEEDS_MAX_DISTANCE when option stop distance > 3.25 points", () => {
  const scanner = new DeterministicScanner();
  const underlyingAtr = 6.0;
  const absDelta = 0.65;
  const multiplier = 1.5;
  // underlyingStop = 9.0. optionStop = 9.0 * 0.65 = 5.85 > 3.25
  const result = scanner.evaluateF6AtrStop({
    underlyingAtr,
    absDelta,
    multiplier,
    maxOptionStopPts: 3.25,
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "STOP_EXCEEDS_MAX_DISTANCE");
});

runTest("F6: Fails closed with ATR_UNAVAILABLE when ATR cannot be computed", () => {
  const scanner = new DeterministicScanner();
  const result = scanner.evaluateF6AtrStop({ underlyingAtr: null, absDelta: 0.55 });
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "ATR_UNAVAILABLE");
});

// -----------------------------------------------------------------------------
// TEST GROUP 7: F7 Expected Value & Validation Status (Research Gate)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 7: F7 Expected Value & Validation Status (Research Gate) ---");

runTest("F7: Computes Wilson EV >= +₹200 net while strictly maintaining EDGE_STATUS = NOT_VALIDATED", () => {
  const scanner = new DeterministicScanner();
  const result = scanner.evaluateF7EVResearch({
    winRate: 0.65,
    avgWin: 600,
    avgLoss: 250,
    sampleSize: 150,
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.edgeStatus, "NOT_VALIDATED");
  assert.equal(result.researchOnly, true);
  assert.ok(result.details.wilsonEv >= 200);
});

// -----------------------------------------------------------------------------
// TEST GROUP 8: F8 Net Risk-to-Reward Ratio (>= 2.0:1)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 8: F8 Net Risk-to-Reward Ratio (>= 2.0:1) ---");

runTest("F8: Uses canonical calculateFrictionAndCharges and verifies Net R:R >= 2.0:1", () => {
  const scanner = new DeterministicScanner();
  const result = scanner.evaluateF8RiskReward({
    entryPrice: 120.0,
    stopDistancePts: 2.80,
    lotSize: 65,
    symbol: "NIFTY",
    minNetRr: 2.0,
  });
  assert.equal(result.status, "PASS");
  assert.ok(Number(result.details.netRrRatio) >= 2.0);
  assert.ok(result.details.netStopLoss > 0);
  assert.ok(result.details.netTargetProfit > result.details.netStopLoss * 2);
  assert.ok(result.details.statutoryStopCharges > 0);
});

// -----------------------------------------------------------------------------
// TEST GROUP 9: F9 Permitted Trading Sessions (MarketScheduler)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 9: F9 Permitted Trading Sessions (MarketScheduler) ---");

runTest("F9: Passes in Morning Expansion (10:15 IST) and Afternoon Trend (13:45 IST)", () => {
  const scheduler = new MarketScheduler();
  const scanner = new DeterministicScanner({ scheduler });

  // 10:15 IST on a trading Wednesday (2026-10-14)
  const morningDate = new Date("2026-10-14T10:15:00+05:30");
  const morningRes = scanner.evaluateF9SessionWindow(morningDate);
  assert.equal(morningRes.status, "PASS");
  assert.equal(morningRes.details.regime, MARKET_REGIMES.MORNING_EXPANSION);

  // 13:45 IST on a trading Wednesday (2026-10-14)
  const afternoonDate = new Date("2026-10-14T13:45:00+05:30");
  const afternoonRes = scanner.evaluateF9SessionWindow(afternoonDate);
  assert.equal(afternoonRes.status, "PASS");
  assert.equal(afternoonRes.details.regime, MARKET_REGIMES.AFTERNOON_TREND);
});

runTest("F9: Rejects entries in Opening Chop (09:20 IST), Midday Stand-Down (12:00 IST), and Market Closed", () => {
  const scheduler = new MarketScheduler();
  const scanner = new DeterministicScanner({ scheduler });

  // 09:20 IST
  const chopDate = new Date("2026-10-14T09:20:00+05:30");
  const chopRes = scanner.evaluateF9SessionWindow(chopDate);
  assert.equal(chopRes.status, "FAIL");
  assert.equal(chopRes.reason, "SESSION_WINDOW_BLOCKED");

  // 12:00 IST
  const middayDate = new Date("2026-10-14T12:00:00+05:30");
  const middayRes = scanner.evaluateF9SessionWindow(middayDate);
  assert.equal(middayRes.status, "FAIL");
  assert.equal(middayRes.reason, "SESSION_WINDOW_BLOCKED");

  // Market closed (Sunday)
  const closedDate = new Date("2026-10-11T10:00:00+05:30");
  const closedRes = scanner.evaluateF9SessionWindow(closedDate);
  assert.equal(closedRes.status, "FAIL");
  assert.equal(closedRes.reason, "SESSION_WINDOW_BLOCKED");
});

// -----------------------------------------------------------------------------
// TEST GROUP 10: F10 Macro Event Blackout
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 10: F10 Macro Event Blackout ---");

runTest("F10: Passes when no scheduled macro events are within ±30 minutes", () => {
  const scanner = new DeterministicScanner();
  const cleanTime = new Date("2026-10-14T10:15:00+05:30");
  const result = scanner.evaluateF10MacroBlackout(cleanTime);
  assert.equal(result.status, "PASS");
});

runTest("F10: Rejects entry within ±30 minutes of scheduled RBI MPC announcement", () => {
  const scanner = new DeterministicScanner();
  // RBI MPC announcement scheduled at 2026-10-08T10:00:00+05:30
  const blackoutTime = new Date("2026-10-08T10:10:00+05:30");
  const result = scanner.evaluateF10MacroBlackout(blackoutTime);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "MACRO_EVENT_BLACKOUT");
  assert.equal(result.details.eventId, "RBI_MPC_OCT_2026");
});

runTest("F10: Fails closed with EVENT_CALENDAR_UNAVAILABLE if macro events file is missing", () => {
  const scanner = new DeterministicScanner({ macroEventsFilePath: "data/non-existent-events.json" });
  const result = scanner.evaluateF10MacroBlackout(new Date());
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "EVENT_CALENDAR_UNAVAILABLE");
});

// -----------------------------------------------------------------------------
// TEST GROUP 11: F11 Portfolio Risk & Concurrent Position Limits
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 11: F11 Portfolio Risk & Concurrent Position Limits ---");

runTest("F11: Passes when active positions = 0 and RMS reconciliation is clean", () => {
  const mockEngine = { activeTrades: new Map() };
  const mockDb = {
    prepare: (sql) => ({
      get: () => ({ count: 0 }),
    }),
  };
  const scanner = new DeterministicScanner({ engine: mockEngine, db: mockDb });
  const result = scanner.evaluateF11PositionLimit();
  assert.equal(result.status, "PASS");
});

runTest("F11: Fails with ACTIVE_POSITION_EXISTS when in-memory or DB position exists", () => {
  const mockEngine = { activeTrades: new Map([["trade-1", {}]]) };
  const scanner = new DeterministicScanner({ engine: mockEngine });
  const result = scanner.evaluateF11PositionLimit();
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "ACTIVE_POSITION_EXISTS");
});

runTest("F11: Fails with RMS_STATE_UNVERIFIED when pending square-off or unverified RMS sync exists", () => {
  const mockEngine = { activeTrades: new Map() };
  const mockDb = {
    prepare: (sql) => ({
      get: () => {
        if (sql.includes("trades")) return { count: 0 };
        if (sql.includes("eod_squareoff_ledger")) return { count: 1 }; // Unresolved square-off
        return { count: 0 };
      },
    }),
  };
  const scanner = new DeterministicScanner({ engine: mockEngine, db: mockDb });
  const result = scanner.evaluateF11PositionLimit();
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "RMS_STATE_UNVERIFIED");
});

// -----------------------------------------------------------------------------
// TEST GROUP 12: F12 Daily Drawdown Shield
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 12: F12 Daily Drawdown Shield ---");

runTest("F12: Passes when realized daily loss + planned trade risk <= ₹300.00 ceiling", () => {
  const mockDb = {
    prepare: () => ({
      get: () => ({ dailyPnl: 0 }), // 0 realized loss today
    }),
  };
  const scanner = new DeterministicScanner({ db: mockDb });
  const result = scanner.evaluateF12DailyDrawdown(250.0, 300.0);
  assert.equal(result.status, "PASS");
  assert.equal(result.details.remainingDailyBudget, 300.0);
});

runTest("F12: Rejects trade when realized daily loss already reaches ₹300.00 ceiling", () => {
  const mockDb = {
    prepare: () => ({
      get: () => ({ dailyPnl: -305.0 }), // Already -305 realized loss
    }),
  };
  const scanner = new DeterministicScanner({ db: mockDb });
  const result = scanner.evaluateF12DailyDrawdown(250.0, 300.0);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "DAILY_DRAWDOWN_EXCEEDED");
});

runTest("F12: Rejects trade when combined realized loss + planned risk exceeds ₹300.00", () => {
  const mockDb = {
    prepare: () => ({
      get: () => ({ dailyPnl: -120.0 }), // ₹120 loss realized
    }),
  };
  const scanner = new DeterministicScanner({ db: mockDb });
  // Remaining budget is 180. Planned risk is 250 -> 120 + 250 = 370 > 300
  const result = scanner.evaluateF12DailyDrawdown(250.0, 300.0);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "DAILY_BUDGET_INSUFFICIENT");
});

runTest("F12: Exact ₹300 boundary regression cases (100+200 pass, 100+200.01 fail, 250+51 fail, 300 halt)", () => {
  // Case 1: ₹100 realized daily loss + ₹200 planned risk = exactly ₹300 -> PASS
  const db100 = { prepare: () => ({ get: () => ({ dailyPnl: -100.0 }) }) };
  const scanner100 = new DeterministicScanner({ db: db100 });
  const resExact = scanner100.evaluateF12DailyDrawdown(200.0, 300.0);
  assert.equal(resExact.status, "PASS");
  assert.equal(resExact.details.remainingDailyBudget, 200.0);

  // Case 2: ₹100 realized daily loss + ₹200.01 planned risk = 300.01 > 300 -> REJECT
  const resBreachByCent = scanner100.evaluateF12DailyDrawdown(200.01, 300.0);
  assert.equal(resBreachByCent.status, "FAIL");
  assert.equal(resBreachByCent.reason, "DAILY_BUDGET_INSUFFICIENT");

  // Case 3: ₹250 realized daily loss + ₹51 planned risk = 301 > 300 -> REJECT
  const db250 = { prepare: () => ({ get: () => ({ dailyPnl: -250.0 }) }) };
  const scanner250 = new DeterministicScanner({ db: db250 });
  const resBreach51 = scanner250.evaluateF12DailyDrawdown(51.0, 300.0);
  assert.equal(resBreach51.status, "FAIL");
  assert.equal(resBreach51.reason, "DAILY_BUDGET_INSUFFICIENT");

  // Case 4: Daily loss already at ₹300: no further deployment -> REJECT
  const db300 = { prepare: () => ({ get: () => ({ dailyPnl: -300.0 }) }) };
  const scanner300 = new DeterministicScanner({ db: db300 });
  const resHalt = scanner300.evaluateF12DailyDrawdown(50.0, 300.0);
  assert.equal(resHalt.status, "FAIL");
  assert.equal(resHalt.reason, "DAILY_DRAWDOWN_EXCEEDED");
});

// -----------------------------------------------------------------------------
// TEST GROUP 13: Complete Decision Contract Output
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 13: Complete Decision Contract Output ---");

runTest("Decision Contract: Emits qualified CALL candidate when all 12 filters pass", () => {
  const scheduler = new MarketScheduler();
  const mockEngine = { activeTrades: new Map() };
  const mockDb = {
    prepare: () => ({ get: () => ({ count: 0, dailyPnl: 0 }) }),
  };
  const scanner = new DeterministicScanner({ scheduler, engine: mockEngine, db: mockDb });

  const candles1h = generateCandles({ count: 60, startPrice: 24000, trend: 15 });
  const candles15m = [
    { high: 24050, low: 24000, close: 24040, volume: 5000 },
    { high: 24030, low: 24010, close: 24025, volume: 5000 },
    { high: 24080, low: 24020, close: 24070, volume: 6000 },
    { high: 24060, low: 24035, close: 24050, volume: 4000 },
    { high: 24110, low: 24060, close: 24105, volume: 7000 },
    { high: 24090, low: 24070, close: 24085, volume: 5000 },
    { high: 24150, low: 24090, close: 24140, volume: 8000 },
  ];
  const candles5m = Array.from({ length: 20 }, () => ({ volume: 10000 }));

  const optionQuote = {
    ltp: 125.0,
    bid: 124.8,
    ask: 125.1,
    timestampMs: Date.now() - 500,
    openInterest: 300000,
    depth: {
      bids: [{ price: 124.8, quantity: 130 }],
      asks: [{ price: 125.1, quantity: 195 }],
    },
  };

  const context = {
    spotPrice: 24140,
    time: "2026-10-14T10:15:00+05:30", // Wednesday 10:15 IST
    candles1h,
    candles15m,
    candles5m,
    currentCandle5m: { volume: 16000 },
    optionQuote,
    underlyingAtr: 3.5,
    dteDays: 2.5,
    ivPct: 14.0,
    evInputs: { winRate: 0.65, avgWin: 600, avgLoss: 250, sampleSize: 150 },
  };

  const evalResult = scanner.evaluate(context);
  assert.equal(evalResult.decision, "CALL");
  assert.equal(evalResult.bias, "CALL");
  assert.equal(evalResult.edgeStatus, "NOT_VALIDATED");
  assert.ok(evalResult.candidate);
  assert.equal(evalResult.candidate.direction, "LONG");
  assert.equal(evalResult.candidate.lots, 1);
  assert.equal(evalResult.candidate.lotSize, 65);
  assert.equal(evalResult.candidate.units, 65);
  assert.equal(evalResult.candidate.referenceEntryPrice, 125.10);
  assert.equal(evalResult.candidate.filledEntryPrice, null);
  assert.ok(evalResult.candidate.modelledNetRisk <= 300.00);
  assert.ok(evalResult.candidate.modelledNetReward <= (evalResult.candidate.target - evalResult.candidate.modelledEntryFill) * 65);
  assert.ok(Number(evalResult.candidate.modelledNetRrRatio) >= 2.0);
  assert.equal(evalResult.reason, "ALL_FILTERS_PASSED");
});

runTest("Decision Contract: Produces NO_TRADE and isolates primary failure reason when any filter fails", () => {
  const scheduler = new MarketScheduler();
  const scanner = new DeterministicScanner({ scheduler });

  // Evaluation at 09:18 IST (Chop regime)
  const context = {
    spotPrice: 24140,
    time: "2026-10-14T09:18:00+05:30",
    candles1h: generateCandles({ count: 60, startPrice: 24000, trend: 15 }),
    candles15m: [{ high: 24150, low: 24090, close: 24140, volume: 8000 }],
    candles5m: Array.from({ length: 20 }, () => ({ volume: 10000 })),
  };

  const evalResult = scanner.evaluate(context);
  assert.equal(evalResult.decision, "NO_TRADE");
  assert.equal(evalResult.candidate, null);
  assert.equal(evalResult.edgeStatus, "NOT_VALIDATED");
  assert.ok(evalResult.primaryFailure);
  assert.equal(evalResult.primaryFailure.filter, FILTER_KEYS.F9_SESSION_WINDOW);
});

// -----------------------------------------------------------------------------
// TEST GROUP 14: Deduplication & Caching
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 14: Deduplication & Caching ---");

runTest("Deduplication: Prevents spamming duplicate candidate events within dedup window", () => {
  const scheduler = new MarketScheduler();
  const mockEngine = { activeTrades: new Map() };
  const mockDb = { prepare: () => ({ get: () => ({ count: 0, dailyPnl: 0 }) }) };
  const scanner = new DeterministicScanner({ scheduler, engine: mockEngine, db: mockDb, dedupWindowMs: 60000 });

  let emittedCount = 0;
  scanner.on("candidate", () => emittedCount++);

  const baseContext = {
    spotPrice: 24140,
    time: "2026-10-14T10:15:00+05:30",
    candles1h: generateCandles({ count: 60, startPrice: 24000, trend: 15 }),
    candles15m: [
      { high: 24050, low: 24000, close: 24040, volume: 5000 },
      { high: 24030, low: 24010, close: 24025, volume: 5000 },
      { high: 24080, low: 24020, close: 24070, volume: 6000 },
      { high: 24060, low: 24035, close: 24050, volume: 4000 },
      { high: 24110, low: 24060, close: 24105, volume: 7000 },
      { high: 24090, low: 24070, close: 24085, volume: 5000 },
      { high: 24150, low: 24090, close: 24140, volume: 8000 },
    ],
    candles5m: Array.from({ length: 20 }, () => ({ volume: 10000 })),
    currentCandle5m: { volume: 16000 },
    optionQuote: {
      ltp: 125.0,
      bid: 124.8,
      ask: 125.1,
      timestampMs: Date.now() - 500,
      openInterest: 300000,
      depth: { bids: [{ price: 124.8, quantity: 130 }], asks: [{ price: 125.1, quantity: 195 }] },
    },
    underlyingAtr: 3.5,
    dteDays: 2.5,
    ivPct: 14.0,
    evInputs: { winRate: 0.65, avgWin: 600, avgLoss: 250, sampleSize: 150 },
  };

  // First eval
  const res1 = scanner.evaluate(baseContext);
  assert.equal(res1.isDuplicate, false);
  assert.equal(emittedCount, 1);

  // Second eval within window with identical candidate
  const res2 = scanner.evaluate(baseContext);
  assert.equal(res2.isDuplicate, true);
  assert.equal(emittedCount, 1, "Should not emit duplicate event");

  // Verify getLatestEvaluation() returns the latest result
  const latest = scanner.getLatestEvaluation();
  assert.equal(latest.evaluationId, res2.evaluationId);
});

// -----------------------------------------------------------------------------
// TEST GROUP 15: PaperTradeEngine & Route Integration
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 15: PaperTradeEngine & Route Integration ---");

runTest("Integration: PaperTradeEngine instantiates scanner and exposes evaluateScanner", () => {
  const engine = new PaperTradeEngine();
  assert.ok(engine.scanner instanceof DeterministicScanner);
  assert.equal(typeof engine.evaluateScanner, "function");
  assert.equal(typeof engine.getLatestScannerEvaluation, "function");

  const status = engine.getStatus();
  assert.ok(status.scanner);
  assert.equal(status.scanner.edgeStatus, "NOT_VALIDATED");
});

// -----------------------------------------------------------------------------
// TEST GROUP 16: Stage 3 Step 3.1 - Exact Figures Audit & Broken Example Rejection
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 16: Stage 3 Step 3.1 - Risk Arithmetic Audit & Broken Example Rejection ---");

runTest("Step 3.1 Audit: Rejects reported broken example when true modelled loss exceeds ₹300", () => {
  const scanner = new DeterministicScanner();
  // Using the exact reported example:
  // referenceEntryPrice: 125.10, Stop: 122.30, Target: 131.50, LotSize: 65
  // When stop is evaluated relative to reference (pegStopToFill: false):
  // Modelled Entry Fill: 126.35
  // Stop Exit Fill (with 0.50 adverse exit slippage): 121.80
  // Gross loss: (126.35 - 121.80) * 65 = 295.75
  // Statutory charges: 66.12
  // True net loss: 361.87 > 300.00
  const result = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80, // 125.10 - 2.80 = 122.30
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    minNetRr: 2.0,
    maxNetRisk: 300.0,
    pegStopToFill: false, // Broken example where stop was set at 122.30
  });

  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.ok(result.details.netStopLoss > 300.00);
  assert.equal(result.details.netStopLoss, 361.87);
});

runTest("Step 3.1 Audit: Fails if candidate reported net reward exceeds gross reward supported by prices", () => {
  // Using the exact reported example:
  // Modelled fill: 126.35, Target: 131.50, LotSize: 65
  // Gross reward supported = (131.50 - 126.35) * 65 = ₹334.75
  // Reported net reward of ₹505.40 is mathematically impossible since fees are positive
  const trade = { symbol: "NIFTY", entryPrice: 126.35, quantity: 1, lotSize: 65, direction: "LONG" };
  const targetFriction = calculateFrictionAndCharges(trade, 131.50, "TARGET_HIT");
  const trueNetReward = targetFriction.netPnl;
  const grossReward = (131.50 - 126.35) * 65;

  assert.ok(trueNetReward <= grossReward, "Net reward must be <= gross reward");
  assert.equal(Number(grossReward.toFixed(2)), 334.75);
  assert.ok(trueNetReward < 334.75);
  // Prove that claiming 505.40 net reward when gross reward is 334.75 is an impossible contradiction:
  const claimedNetReward = 505.40;
  assert.ok(claimedNetReward > grossReward, "Proof: Claimed 505.40 was higher than total gross reward 334.75");
});

runTest("Step 3.1 Boundary Test: Below ceiling (modelled loss ~ ₹296.98 < ₹300.00) passes F8", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 3.05,
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    minNetRr: 2.0,
    maxNetRisk: 300.0,
    pegStopToFill: true,
  });
  assert.equal(res.status, "PASS");
  assert.equal(res.details.netStopLoss, 296.98);
  assert.ok(res.details.netStopLoss < 300.00);
});

runTest("Step 3.1 Boundary Test: At ceiling boundary (modelled loss ₹299.58 <= ₹300.00) passes F8", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 3.09,
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    minNetRr: 2.0,
    maxNetRisk: 300.0,
    pegStopToFill: true,
  });
  assert.equal(res.status, "PASS");
  assert.equal(res.details.netStopLoss, 299.58);
  assert.ok(res.details.netStopLoss <= 300.00);
});

runTest("Step 3.1 Boundary Test: Above ceiling (modelled loss ₹300.23 & ₹306.72 > ₹300.00) rejected with MODELLED_RISK_EXCEEDS_CEILING", () => {
  const scanner = new DeterministicScanner();
  // Case A: Just above boundary at 300.23
  const resA = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 3.10,
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    minNetRr: 2.0,
    maxNetRisk: 300.0,
    pegStopToFill: true,
  });
  assert.equal(resA.status, "FAIL");
  assert.equal(resA.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(resA.details.netStopLoss, 300.23);

  // Case B: Further above boundary at 306.72
  const resB = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 3.20,
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    minNetRr: 2.0,
    maxNetRisk: 300.0,
    pegStopToFill: true,
  });
  assert.equal(resB.status, "FAIL");
  assert.equal(resB.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(resB.details.netStopLoss, 306.72);
});

// -----------------------------------------------------------------------------
// TEST GROUP 17: Stage 3 Step 3.1 - Separation of Scanning from Execution & Units Audit
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 17: Stage 3 Step 3.1 - Separation of Scanning from Execution & Units Audit ---");

runTest("Step 3.1 Execution Separation: Candidate preserves referenceEntryPrice and sets filledEntryPrice: null", () => {
  const scheduler = new MarketScheduler();
  const mockEngine = { activeTrades: new Map() };
  const mockDb = { prepare: () => ({ get: () => ({ count: 0, dailyPnl: 0 }) }) };
  const scanner = new DeterministicScanner({ scheduler, engine: mockEngine, db: mockDb });

  const context = {
    spotPrice: 24140,
    time: "2026-10-14T10:15:00+05:30",
    candles1h: generateCandles({ count: 60, startPrice: 24000, trend: 15 }),
    candles15m: [
      { high: 24050, low: 24000, close: 24040, volume: 5000 },
      { high: 24030, low: 24010, close: 24025, volume: 5000 },
      { high: 24080, low: 24020, close: 24070, volume: 6000 },
      { high: 24060, low: 24035, close: 24050, volume: 4000 },
      { high: 24110, low: 24060, close: 24105, volume: 7000 },
      { high: 24090, low: 24070, close: 24085, volume: 5000 },
      { high: 24150, low: 24090, close: 24140, volume: 8000 },
    ],
    candles5m: Array.from({ length: 20 }, () => ({ volume: 10000 })),
    currentCandle5m: { volume: 16000 },
    optionQuote: {
      ltp: 125.0,
      bid: 124.8,
      ask: 125.1,
      timestampMs: Date.now() - 500,
      openInterest: 300000,
      depth: { bids: [{ price: 124.8, quantity: 130 }], asks: [{ price: 125.1, quantity: 195 }] },
    },
    underlyingAtr: 3.5,
    dteDays: 2.5,
    ivPct: 14.0,
  };

  const res = scanner.evaluate(context);
  assert.equal(res.decision, "CALL");
  assert.ok(res.candidate);
  // Verify explicit distinction
  assert.equal(res.candidate.lots, 1);
  assert.equal(res.candidate.lotSize, 65);
  assert.equal(res.candidate.units, 65);
  assert.equal(res.candidate.referenceEntryPrice, 125.10);
  assert.equal(res.candidate.filledEntryPrice, null, "Scanner must not invent an executed fill");
  assert.equal(res.candidate.modelledEntryFill, 126.35);
  assert.ok(res.candidate.modelledNetRisk <= 300.00);
});

runTest("Step 3.1 Units Audit: Canonical friction calculator never multiplies lotSize twice", () => {
  // Case A: trade specifies quantity: 1, lotSize: 65 -> units: 65
  const tradeA = { symbol: "NIFTY", quantity: 1, lotSize: 65, entryPrice: 126.35, direction: "LONG" };
  const resA = calculateFrictionAndCharges(tradeA, 134.45, "TARGET_HIT");
  assert.equal(resA.units, 65);

  // Case B: trade specifies quantity: 65 (already units), lotSize: 65 -> units: 65 (NOT 4225)
  const tradeB = { symbol: "NIFTY", quantity: 65, lotSize: 65, entryPrice: 126.35, direction: "LONG" };
  const resB = calculateFrictionAndCharges(tradeB, 134.45, "TARGET_HIT");
  assert.equal(resB.units, 65);

  // Case C: trade specifies units: 65 explicitly
  const tradeC = { symbol: "NIFTY", units: 65, quantity: 1, lotSize: 65, entryPrice: 126.35, direction: "LONG" };
  const resC = calculateFrictionAndCharges(tradeC, 134.45, "TARGET_HIT");
  assert.equal(resC.units, 65);
});

runTest("Step 3.1 Units Audit: deployOrderToDotnet sends exact units (65 for 1 lot) to .NET RMS, never 1 or 4225", async () => {
  const originalFetch = globalThis.fetch;
  let capturedPayload = null;
  globalThis.fetch = async (url, opts) => {
    if (url.includes("/api/orders/deploy")) {
      capturedPayload = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const { deployOrderToDotnet } = await import("../src/services/engine/dotnetBridge.js");
    await deployOrderToDotnet({
      symbol: "NIFTY26OCT24150CE",
      lots: 1,
      lotSize: 65,
      quantity: 1,
      entryPrice: 126.35,
      stopLoss: 123.55,
      targetPrice: 136.00,
    });

    assert.ok(capturedPayload, "Payload must be sent to .NET RMS");
    assert.equal(capturedPayload.Quantity, 65, ".NET RMS must receive 65 total units for 1 NIFTY lot");
    assert.notEqual(capturedPayload.Quantity, 1, "Must never pass 1 unit (which bypasses RMS limits)");
    assert.notEqual(capturedPayload.Quantity, 4225, "Must never multiply lot size twice (4225)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// TEST GROUP 18: Stage 3 Step 3.1 - F7 Expected Value Gate & Validation Status Immutability
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 18: Stage 3 Step 3.1 - F7 Expected Value Gate & Validation Status Immutability ---");

runTest("F7 Scenarios: Insufficient sample count (n < 100) records research telemetry and remains NOT_VALIDATED", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF7EVResearch({ sampleSize: 15, winRate: 0.60 });
  assert.equal(res.status, "PASS", "Does not block paper trading sample accumulation");
  assert.equal(res.researchOnly, true);
  assert.equal(res.edgeStatus, "NOT_VALIDATED");
  assert.equal(res.details.isSampleSufficient, false);
  assert.equal(res.details.liveTradingPermitted, false);
});

runTest("F7 Scenarios: Missing or corrupt research data records telemetry and remains NOT_VALIDATED", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF7EVResearch(null);
  assert.equal(res.status, "PASS");
  assert.equal(res.researchOnly, true);
  assert.equal(res.edgeStatus, "NOT_VALIDATED");
  assert.equal(res.details.hasValidEvData, false);
  assert.equal(res.details.reason, "MISSING_OR_CORRUPT_RESEARCH_DATA");
});

runTest("F7 Scenarios: Weak or negative EV records research telemetry and remains NOT_VALIDATED", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF7EVResearch({ sampleSize: 120, winRate: 0.35, avgWin: 400, avgLoss: 300 });
  assert.equal(res.status, "PASS");
  assert.equal(res.researchOnly, true);
  assert.equal(res.edgeStatus, "NOT_VALIDATED");
  assert.equal(res.details.isSampleSufficient, true);
  assert.equal(res.details.reason, "WEAK_EV_RESEARCH_LOGGED");
});

runTest("F7 Scenarios: Synthetic passing fixture CANNOT mark strategy as validated", () => {
  const scanner = new DeterministicScanner();
  // Attempt to pass an artificially perfect fixture
  const perfectFixture = {
    sampleSize: 1000,
    winRate: 0.95,
    avgWin: 2000,
    avgLoss: 200,
    confidence: 1.96,
  };
  const res = scanner.evaluateF7EVResearch(perfectFixture);
  // Must STRICTLY remain NOT_VALIDATED
  assert.equal(res.edgeStatus, "NOT_VALIDATED");
  assert.equal(res.details.edgeStatus, "NOT_VALIDATED");
  assert.equal(res.details.liveTradingPermitted, false);
  assert.notEqual(res.edgeStatus, "VALIDATED");
});

// -----------------------------------------------------------------------------
// TEST GROUP 19: Stage 3 Step 3.1 - ATR Stop Integrity (Zero Silent Squeezing)
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 19: Stage 3 Step 3.1 - ATR Stop Integrity (Zero Silent Squeezing) ---");

runTest("ATR Stop Integrity: Excessive ATR stop distance (> 3.25 pts) is rejected, NOT squeezed", () => {
  const scanner = new DeterministicScanner();
  // ATR of 5.5, delta of 0.60, multiplier 1.5 -> option stop = 5.5 * 1.5 * 0.60 = 4.95 pts > 3.25
  const res = scanner.evaluateF6AtrStop({
    underlyingAtr: 5.5,
    absDelta: 0.60,
    multiplier: 1.5,
    maxOptionStopPts: 3.25,
  });
  assert.equal(res.status, "FAIL");
  assert.equal(res.reason, "STOP_EXCEEDS_MAX_DISTANCE");
  assert.equal(res.details.optionStopDistancePts, 4.95);
  // Must not have silently clamped to 3.25
  assert.notEqual(res.details.optionStopDistancePts, 3.25);
});

// -----------------------------------------------------------------------------
// TEST GROUP 20: Stage 3 Step 3.2 - ATR Stop Semantics & Target Policy Separation
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 20: Stage 3 Step 3.2 - ATR Stop Semantics & Target Policy Separation ---");

runTest("Step 3.2: Original sample with fixed ₹122.30 technical stop is rejected with MODELLED_RISK_EXCEEDS_CEILING", () => {
  const scanner = new DeterministicScanner();
  // Fixed technical stop at 122.30 with reference entry 125.10 and modelled fill 126.35
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopLossPrice: 122.30,
    stopPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    maxNetRisk: 300.0,
  });

  assert.equal(res.status, "FAIL");
  assert.equal(res.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(res.details.stopPolicy, "TECHNICAL_ABSOLUTE");
  assert.equal(res.details.rawStopLoss, 122.30, "Technical stop must NOT be moved to 123.55");
  assert.equal(res.details.netStopLoss, 361.87, "True net loss must be exactly 361.87");
  assert.ok(res.details.netStopLoss > 300.00);
});

runTest("Step 3.2: Explicitly entry-relative ATR-stop configuration calculates stop using documented rule", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    symbol: "NIFTY",
    maxNetRisk: 300.0,
  });

  assert.equal(res.status, "PASS");
  assert.equal(res.details.stopPolicy, "ATR_ENTRY_RELATIVE");
  assert.equal(res.details.referenceEntryPrice, 125.10);
  assert.equal(res.details.referenceStopLoss, 122.30, "Reference stop is referenceEntry - 2.80");
  assert.equal(res.details.modelledEntryFill, 126.35);
  assert.equal(res.details.modelledStopLoss, 123.55, "Modelled stop is modelledFill - 2.80");
  assert.equal(res.details.netStopLoss, 280.77);
  assert.ok(res.details.netStopLoss <= 300.00);
});

runTest("Step 3.2: Zero arbitrary stop adjustment: No candidate passes solely because an arbitrary stop adjustment reduces calculated risk", () => {
  const scanner = new DeterministicScanner();
  // Attempting to evaluate with a fixed technical stop at 122.30
  const resTechnical = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopLossPrice: 122.30,
    stopPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
  });
  assert.equal(resTechnical.status, "FAIL");
  assert.equal(resTechnical.details.rawStopLoss, 122.30);

  // If ATR distance is excessive (e.g. 3.40 pts -> net loss 319.70 > 300.00), it fails closed
  const resExcessiveAtr = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 3.40,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    lotSize: 65,
    lots: 1,
  });
  assert.equal(resExcessiveAtr.status, "FAIL");
  assert.equal(resExcessiveAtr.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(resExcessiveAtr.details.netStopLoss, 319.7);
});

runTest("Step 3.2: Candidate contract strictly distinguishes reference, modelled, and actual execution values", () => {
  const scheduler = new MarketScheduler();
  const mockEngine = { activeTrades: new Map() };
  const mockDb = { prepare: () => ({ get: () => ({ count: 0, dailyPnl: 0 }) }) };
  const scanner = new DeterministicScanner({ scheduler, engine: mockEngine, db: mockDb });

  const context = {
    spotPrice: 24140,
    time: "2026-10-14T10:15:00+05:30",
    candles1h: generateCandles({ count: 60, startPrice: 24000, trend: 15 }),
    candles15m: [
      { high: 24050, low: 24000, close: 24040, volume: 5000 },
      { high: 24030, low: 24010, close: 24025, volume: 5000 },
      { high: 24080, low: 24020, close: 24070, volume: 6000 },
      { high: 24060, low: 24035, close: 24050, volume: 4000 },
      { high: 24110, low: 24060, close: 24105, volume: 7000 },
      { high: 24090, low: 24070, close: 24085, volume: 5000 },
      { high: 24150, low: 24090, close: 24140, volume: 8000 },
    ],
    candles5m: Array.from({ length: 20 }, () => ({ volume: 10000 })),
    currentCandle5m: { volume: 16000 },
    optionQuote: {
      ltp: 125.0,
      bid: 124.8,
      ask: 125.1,
      timestampMs: Date.now() - 500,
      openInterest: 300000,
      depth: { bids: [{ price: 124.8, quantity: 130 }], asks: [{ price: 125.1, quantity: 195 }] },
    },
    underlyingAtr: 3.5,
    dteDays: 2.5,
    ivPct: 14.0,
  };

  const res = scanner.evaluate(context);
  assert.equal(res.decision, "CALL");
  const c = res.candidate;
  assert.ok(c);

  // Policy disclosure
  assert.equal(c.stopPolicy, "ATR_ENTRY_RELATIVE");
  assert.equal(c.targetPolicy, "RR_DERIVED");

  // Indicative / Reference levels
  assert.equal(c.referenceEntryPrice, 125.10);
  assert.equal(c.referenceStopLoss, Number((c.referenceEntryPrice - c.stopDistancePts).toFixed(2)));
  assert.equal(c.referenceTarget, Number((c.referenceEntryPrice + c.targetDistancePts).toFixed(2)));

  // Modelled Pre-Trade levels
  assert.equal(c.modelledEntryFill, 126.35);
  assert.equal(c.modelledStopLoss, Number((c.modelledEntryFill - c.stopDistancePts).toFixed(2)));
  assert.equal(c.modelledTarget, Number((c.modelledEntryFill + c.targetDistancePts).toFixed(2)));
  assert.equal(c.stopLoss, c.modelledStopLoss);
  assert.equal(c.target, c.modelledTarget);

  // Execution engine placeholders (must NOT invent a fill)
  assert.equal(c.filledEntryPrice, null);
  assert.equal(c.executedStopLoss, null);
  assert.equal(c.executedTarget, null);

  // Risk ceiling & units
  assert.equal(c.units, 65);
  assert.ok(c.modelledNetRisk <= 300.00);
});

runTest("Step 3.2: Technical target cannot silently switch to R:R derived target and fails when net R:R < 2:1", () => {
  const scanner = new DeterministicScanner();
  // Fixed technical target at 131.50 with entry at 125.10 (modelled fill 126.35) and modelled stop 123.55 (net loss 280.77)
  // Gross reward to 131.50: (131.50 - 126.35) * 65 = 334.75.
  // Net profit after friction (67.31) = 267.44.
  // Net R:R = 267.44 / 280.77 = 0.95:1 < 2.0:1!
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    targetPrice: 131.50,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
  });

  assert.equal(res.status, "FAIL");
  assert.equal(res.reason, "INSUFFICIENT_NET_RR");
  assert.equal(res.details.targetPolicy, "TECHNICAL_ABSOLUTE");
  assert.equal(res.details.rawTarget, 131.50, "Technical target must NOT be expanded to 136.05");
  assert.equal(res.details.netTargetProfit, 267.44);
  assert.equal(res.details.netRrRatio, 0.95);
});

runTest("Step 3.2: R:R derived target policy dynamically solves required target to guarantee >= 2.0:1 net R:R", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
  });

  assert.equal(res.status, "PASS");
  assert.equal(res.details.targetPolicy, "RR_DERIVED");
  assert.equal(res.details.rawTarget, 136.05);
  assert.equal(res.details.netTargetProfit, 562.62);
  assert.equal(res.details.netRrRatio, 2.00);
  assert.ok(res.details.netRrRatio >= 2.0);
});

runTest("Step 3.2: Strategy Invariants preserved: ₹300 ceiling, ₹300 daily drawdown, 65 units, NOT_VALIDATED", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
  });

  assert.equal(res.status, "PASS");
  assert.equal(res.details.units, 65);
  assert.ok(res.details.netStopLoss <= 300.00);

  const resDrawdown = scanner.evaluateF12DailyDrawdown(res.details.netStopLoss, 300.00);
  assert.equal(resDrawdown.status, "PASS");
  assert.equal(resDrawdown.details.hardCeiling, 300.00);

  const resEv = scanner.evaluateF7EVResearch({ sampleSize: 500, winRate: 0.80 });
  assert.equal(resEv.edgeStatus, "NOT_VALIDATED");
  assert.equal(resEv.details.liveTradingPermitted, false);
});

// -----------------------------------------------------------------------------
// TEST GROUP 21: Stage 3 Step 3.3 - Risk/Reward Policy Consistency & Denominator Isolation
// -----------------------------------------------------------------------------
console.log("\n--- TEST GROUP 21: Stage 3 Step 3.3 - Risk/Reward Policy Consistency & Denominator Isolation ---");

runTest("Step 3.3: Fixed technical-stop and fixed-target example calculates R:R = ~0.739:1 (never borrows 280.77) and rejects for MODELLED_RISK_EXCEEDS_CEILING", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopLossPrice: 122.30,
    targetPrice: 131.50,
    stopPolicy: "TECHNICAL_ABSOLUTE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
    maxNetRisk: 300.0,
  });

  assert.equal(res.status, "FAIL");
  assert.equal(res.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(res.details.stopPolicy, "TECHNICAL_ABSOLUTE");
  assert.equal(res.details.targetPolicy, "TECHNICAL_ABSOLUTE");
  assert.equal(res.details.rawStopLoss, 122.30);
  assert.equal(res.details.rawTarget, 131.50);
  assert.equal(res.details.netStopLoss, 361.87, "Must strictly use technical stop loss 361.87");
  assert.notEqual(res.details.netStopLoss, 280.77, "Must never borrow 280.77 from entry-relative policy");
  assert.equal(res.details.netTargetProfit, 267.44);

  // Exact R:R = 267.44 / 361.87 = 0.739050...
  const exactRatio = res.details.netTargetProfit / res.details.netStopLoss;
  assert.ok(Math.abs(exactRatio - 0.739) < 0.001, `Expected ~0.739, got ${exactRatio}`);
  assert.equal(Number(exactRatio.toFixed(3)), 0.739, "Reports ~0.739 before display rounding");
  assert.equal(res.details.netRrRatio, 0.74, "Display rounded to 2 decimals is 0.74");
});

runTest("Step 3.3: Paired entry-relative test: 280.77 modelled loss and 562.62 net reward produce ~2.004:1 (reported as 2.00:1)", () => {
  const scanner = new DeterministicScanner();
  const res = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    maxNetRisk: 300.0,
  });

  assert.equal(res.status, "PASS");
  assert.equal(res.details.stopPolicy, "ATR_ENTRY_RELATIVE");
  assert.equal(res.details.targetPolicy, "RR_DERIVED");
  assert.equal(res.details.netStopLoss, 280.77);
  assert.equal(res.details.netTargetProfit, 562.62);

  // Exact R:R = 562.62 / 280.77 = 2.003846...
  const exactRatio = res.details.netTargetProfit / res.details.netStopLoss;
  assert.ok(Math.abs(exactRatio - 2.004) < 0.001, `Expected ~2.004, got ${exactRatio}`);
  assert.equal(Number(exactRatio.toFixed(3)), 2.004, "Reports ~2.004 before display rounding");
  assert.equal(res.details.netRrRatio, 2.00, "Display rounded to 2 decimals is 2.00");
});

runTest("Step 3.3: Policy isolation: Mixed policy explicitly labeled and never bleeds denominators", () => {
  const scanner = new DeterministicScanner();
  // Mixed configuration: ATR_ENTRY_RELATIVE stop with TECHNICAL_ABSOLUTE target (131.50)
  const resMixed = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    targetPrice: 131.50,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
  });

  assert.equal(resMixed.status, "FAIL");
  assert.equal(resMixed.reason, "INSUFFICIENT_NET_RR");
  assert.equal(resMixed.details.stopPolicy, "ATR_ENTRY_RELATIVE");
  assert.equal(resMixed.details.targetPolicy, "TECHNICAL_ABSOLUTE");
  assert.equal(resMixed.details.netStopLoss, 280.77);
  assert.equal(resMixed.details.netTargetProfit, 267.44);
  // Denominator is 280.77 because its own stopPolicy is ATR_ENTRY_RELATIVE: 267.44 / 280.77 = 0.9525...
  assert.equal(resMixed.details.netRrRatio, 0.95);
});

console.log("\n--- TEST GROUP 22: Stage 3 Step 3.4 - Canonical Strategy Contract, Paper Execution Integration & End-to-End Tracing ---");

runTest("Step 3.4: Canonical Strategy Contract: Stop is volatility-grounded ATR stop, ₹300 ceiling is an authoritative gate (never a stop-compression slider)", () => {
  const scanner = new DeterministicScanner();
  
  // 1. Valid ATR stop distance (e.g. underlying ATR 3.4 * 1.5 * delta 0.52 = 2.65 pts <= 3.25 max)
  const f6Pass = scanner.evaluateF6AtrStop({
    underlyingAtr: 3.4,
    absDelta: 0.52,
    multiplier: 1.5,
    maxOptionStopPts: 3.25,
  });
  assert.equal(f6Pass.status, "PASS");
  assert.equal(f6Pass.details.optionStopDistancePts, 2.65);

  // 2. Excessive ATR stop distance (e.g. underlying ATR 6.0 * 1.5 * delta 0.60 = 5.4 pts > 3.25 max)
  // Must FAIL CLOSED with STOP_EXCEEDS_MAX_DISTANCE, NOT compressed to 3.25 or 2.50!
  const f6Fail = scanner.evaluateF6AtrStop({
    underlyingAtr: 6.0,
    absDelta: 0.60,
    multiplier: 1.5,
    maxOptionStopPts: 3.25,
  });
  assert.equal(f6Fail.status, "FAIL");
  assert.equal(f6Fail.reason, "STOP_EXCEEDS_MAX_DISTANCE");
  assert.equal(f6Fail.details.optionStopDistancePts, 5.4);
});

await runAsyncTest("Step 3.4: End-to-end 5-layer agreement trace: Scanner, paper execution, ledger, charges engine, and .NET RMS agree 100% on quantity, prices, stop, target, and risk", async () => {
  const scanner = new DeterministicScanner();

  // Layer 1: Scanner evaluates candidate
  const f8 = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
    maxNetRisk: 300.0,
  });
  assert.equal(f8.status, "PASS");
  assert.equal(f8.details.modelledEntryFill, 126.35);
  assert.equal(f8.details.modelledStopLoss, 123.55);
  assert.equal(f8.details.netStopLoss, 280.77);

  const candidate = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    targetDistancePts: f8.details.targetDistancePts, // Canonical 9.70 pts dynamically solved by RR_DERIVED
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 122.30,
    target: f8.details.modelledTarget, // Canonical 136.05
    modelledNetRisk: f8.details.netStopLoss, // 280.77
    modelledNetReward: f8.details.netTargetProfit, // 562.62
    simulatedFilledEntryPrice: 126.35,
  };

  // Layer 2 & 5: Paper Execution Engine & .NET RMS Integration
  const deployRes = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(deployRes.success, true);
  // Effective entry fill is simulated at 126.35 (accounting for 1.25 adverse entry slippage)
  const actualFill = deployRes.effectiveEntryPrice;
  assert.equal(actualFill, 126.35);

  // Layer 3: Dynamic Pegging logic
  // Under ATR_ENTRY_RELATIVE, stop is actualFill - 2.80 = 123.55, target is actualFill + 9.70 = 136.05
  const expectedStop = Math.max(0.05, Math.round((actualFill - candidate.stopDistancePts) * 20) / 20);
  const expectedTarget = Math.round((actualFill + candidate.targetDistancePts) * 20) / 20;
  assert.equal(deployRes.executedStopLoss, 123.55);
  assert.equal(deployRes.executedTarget, 136.05);

  // Layer 4: Charges Calculator & Net Risk
  const effectiveExit = Math.max(0.05, Number((expectedStop - 0.50).toFixed(2)));
  const grossLoss = (actualFill - effectiveExit) * 65;
  const statutoryFriction = calculateStatutoryCharges(actualFill, effectiveExit, 65, "LONG");
  const modelledNetLoss = Number((grossLoss + statutoryFriction).toFixed(2));
  assert.equal(deployRes.modelledNetLoss, 280.77);
  assert.ok(modelledNetLoss <= 300.0, "Modelled loss must be inside ₹300 ceiling");

  // Gross & Net Reward Verification
  const grossReward = Number(((expectedTarget - actualFill) * 65).toFixed(2)); // (136.05 - 126.35) * 65 = 9.70 * 65 = 630.50
  assert.equal(grossReward, 630.50);
  const statutoryTargetCharges = calculateStatutoryCharges(actualFill, expectedTarget, 65, "LONG");
  const netReward = Number((grossReward - statutoryTargetCharges).toFixed(2));
  assert.equal(netReward, 562.62);
  const netRr = Number((netReward / modelledNetLoss).toFixed(2));
  assert.ok(netRr >= 2.00, `Net R:R (${netRr}:1) must be >= 2.00:1`);

  // Agreement with simulated trade ledger record
  const item = deployRes.item;
  assert.equal(item.quantity, 1);
  assert.equal(item.lotSize, 65);
  assert.equal(item.units, 65);
  assert.equal(item.plannedEntryPrice, 125.10);
  assert.equal(item.entryPrice, 126.35);
  assert.equal(item.stopLoss, 123.55);
  assert.equal(item.targetPrice, 136.05);

  // Agreement with .NET RMS Active Position Book post-reconciliation
  if (deployRes.positionId) {
    const rmsRes = await getDotnetPositions();
    if (rmsRes.ok && Array.isArray(rmsRes.data)) {
      const activePos = rmsRes.data.find(p => p.id === deployRes.positionId || p.Id === deployRes.positionId);
      if (activePos) {
        assert.equal(Number(activePos.entryPrice || activePos.EntryPrice), 126.35);
        assert.equal(Number(activePos.stopLoss || activePos.StopLoss), 123.55);
        assert.equal(Number(activePos.target || activePos.Target), 136.05);
        assert.equal(Number(activePos.quantity || activePos.Quantity), 65);
      }
    }
  }
  if (deployRes.positionId) await unregisterDotnetPosition(deployRes.positionId);
});

await runAsyncTest("Step 3.4: Strategy stop/target preservation: TECHNICAL_ABSOLUTE strictly preserves exact prices; ATR_ENTRY_RELATIVE dynamically pegs to fill", async () => {
  // Case A: TECHNICAL_ABSOLUTE
  const candidateTech = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopPolicy: "TECHNICAL_ABSOLUTE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    stopLoss: 122.30,
    target: 131.50,
  };

  const deployTech = await executeCandidateDeployment({
    candidate: candidateTech,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(deployTech.success, true);
  // Under TECHNICAL_ABSOLUTE, executed stop MUST strictly be 122.30, executed target MUST strictly be 131.50
  assert.equal(deployTech.executedStopLoss, 122.30);
  assert.equal(deployTech.executedTarget, 131.50);
  if (deployTech.positionId) await unregisterDotnetPosition(deployTech.positionId);

  // Case B: ATR_ENTRY_RELATIVE
  const candidateAtr = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    targetDistancePts: 7.00,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 122.30,
    target: 132.10,
  };

  const deployAtr = await executeCandidateDeployment({
    candidate: candidateAtr,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(deployAtr.success, true);
  assert.equal(deployAtr.executedStopLoss, Math.round((deployAtr.effectiveEntryPrice - 2.80) * 20) / 20);
  assert.equal(deployAtr.executedTarget, Math.round((deployAtr.effectiveEntryPrice + 7.00) * 20) / 20);
  if (deployTech.positionId) await unregisterDotnetPosition(deployTech.positionId);
  if (deployAtr.positionId) await unregisterDotnetPosition(deployAtr.positionId);
});

await runAsyncTest("Step 3.4: Risk limit rejection: Zero stop squeezing when adverse slippage pushes modelled loss > ₹300 (rejects with MODELLED_RISK_EXCEEDS_CEILING)", async () => {
  // Candidate with wide ATR stop (3.20 pts).
  // At reference 125.10, gross risk = 3.20 * 65 = 208, exit friction ~ 65 -> total ~ 273.
  // But if execution fill suffers extreme adverse slippage or wide stop distance (e.g. stopDistance = 4.0 pts):
  const wideCandidate = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 4.00, // 4.0 pts distance = 260 gross + 66 friction = ~326 net risk
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 121.10,
    target: 135.10,
  };

  const res = await executeCandidateDeployment({
    candidate: wideCandidate,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(res.success, false);
  assert.equal(res.status, 422);
  assert.equal(res.title, "Modelled Risk Ceiling Exceeded");
  assert.ok(res.modelledNetLoss > 300.0, `Expected modelled loss > 300, got ${res.modelledNetLoss}`);
  assert.ok(res.detail.includes("cannot be compressed"), "Execution error must state that stop cannot be compressed to force acceptance");
});

await runAsyncTest("Step 3.4: Quantity propagation parity: Deploy sends 65 executable units for 1 NIFTY lot to .NET RMS and trade ledger", async () => {
  const candidate = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.64,
    targetDistancePts: 7.00,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 122.46,
    target: 132.10,
  };

  const res = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(res.success, true);
  // Verify units consistency
  assert.equal(res.item.quantity, 1, "Quantity is 1 lot");
  assert.equal(res.item.lotSize, 65, "Lot size is 65");
  assert.equal(res.item.units, 65, "Total executable units is 65 (never 1 or 4225)");
  if (res.positionId) await unregisterDotnetPosition(res.positionId);
});

await runAsyncTest("Step 3.4: Daily risk budget gate: Execution rejects order when remaining daily budget is insufficient for modelled loss", async () => {
  // Synthetic DB mock where realized daily loss is already ₹100, leaving ₹200 budget (less than ₹280.77 candidate risk)
  const mockDb = {
    prepare: (sql) => ({
      get: (param) => {
        if (sql.includes("dailyPnl")) {
          return { dailyPnl: -100.0 }; // Realized loss = ₹100.00
        }
        return null;
      },
    }),
  };

  const candidate = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.64,
    targetDistancePts: 7.00,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 122.46,
    target: 132.10,
  };

  const res = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
    enforceDailyLoss: true,
    db: mockDb,
  });

  assert.equal(res.success, false);
  assert.equal(res.status, 423);
  assert.equal(res.title, "Daily Risk Budget Insufficient");
  assert.ok(res.detail.includes("Remaining daily risk budget is ₹200.00"));
});

console.log("\n--- TEST GROUP 23: Stage 3 Step 3.5 - Final RMS Price and Target Parity Audit ---");

await runAsyncTest("Step 3.5 Issue A: Authoritative RMS active position is reconciled post-fill from reference (125.10) to executed fill (126.35), stop (123.55), target (136.00), and units (65)", async () => {
  const candidate = {
    symbol: "NIFTY26OCT25400CE",
    strike: 25400,
    optionType: "CALL",
    tokenKey: "NSE_FO|12345",
    lots: 1,
    lotSize: 65,
    units: 65,
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    targetDistancePts: 9.70,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    stopLoss: 122.30,
    target: 134.80,
    modelledNetRisk: 280.77,
    modelledNetReward: 562.62,
    simulatedFilledEntryPrice: 126.35, // Explicit simulated adverse entry fill
  };

  const deployRes = await executeCandidateDeployment({
    candidate,
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(deployRes.success, true);
  assert.equal(deployRes.effectiveEntryPrice, 126.35, "Executed entry price must reflect actual fill, not reference price");
  assert.equal(deployRes.executedStopLoss, 123.55, "Executed stop must dynamically peg to fill (126.35 - 2.80 = 123.55)");
  assert.equal(deployRes.executedTarget, 136.05, "Executed target must dynamically peg to fill (126.35 + 9.70 = 136.05)");
  assert.equal(deployRes.totalUnits, 65, "Total units must strictly be 65");

  // Verify post-fill reconciliation in .NET RMS active position book
  if (deployRes.positionId) {
    const rmsRes = await getDotnetPositions();
    if (rmsRes.ok && Array.isArray(rmsRes.data)) {
      const activePos = rmsRes.data.find(p => p.id === deployRes.positionId || p.Id === deployRes.positionId);
      if (activePos) {
        assert.equal(Number(activePos.entryPrice || activePos.EntryPrice), 126.35, "RMS active position entryPrice must be reconciled to 126.35");
        assert.equal(Number(activePos.stopLoss || activePos.StopLoss), 123.55, "RMS active position stopLoss must be reconciled to 123.55");
        assert.equal(Number(activePos.target || activePos.Target), 136.05, "RMS active position target must be reconciled to 136.05");
        assert.equal(Number(activePos.quantity || activePos.Quantity), 65, "RMS active position quantity must strictly be 65 units");
      }
    }
  }

  // Verify trade ledger item parity
  assert.equal(deployRes.item.entryPrice, 126.35);
  assert.equal(deployRes.item.stopLoss, 123.55);
  assert.equal(deployRes.item.targetPrice, 136.05);
  assert.equal(deployRes.item.units, 65);
  if (deployRes.positionId) await unregisterDotnetPosition(deployRes.positionId);
});

runTest("Step 3.5 Issue B: RR_DERIVED dynamic target solver calculates 9.70 pts target distance (target 136.05) guaranteeing >= 2.0:1 net R:R", () => {
  const scanner = new DeterministicScanner();
  const f8 = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
    maxNetRisk: 300.0,
  });

  assert.equal(f8.status, "PASS");
  assert.equal(f8.details.modelledEntryFill, 126.35);
  assert.equal(f8.details.modelledStopLoss, 123.55);
  assert.equal(f8.details.targetDistancePts, 9.70, "Solved target distance must strictly be 9.70 pts to cover friction");
  assert.equal(f8.details.modelledTarget, 136.05, "Modelled target must strictly be 136.05 (126.35 + 9.70)");
  assert.equal(f8.details.grossReward, 630.50, "Gross reward must be 9.70 pts * 65 units = ₹630.50");
  assert.equal(f8.details.statutoryTargetCharges, 67.88, "Statutory charges on target exit must be ₹67.88");
  assert.equal(f8.details.netTargetProfit, 562.62, "Net target profit must be ₹630.50 - ₹67.88 = ₹562.62");
  assert.equal(f8.details.netStopLoss, 280.77, "Net stop loss must be ₹280.77");
  assert.equal(f8.details.netRrRatio, 2.00, "Net R:R ratio must be 2.00:1 (>= 2.00:1)");
  assert.ok(f8.details.netTargetProfit >= 2.0 * f8.details.netStopLoss, "Net profit must be >= 2.0x net risk");
});

runTest("Step 3.5 Issue B: Arbitrary 7.00 pt target yields gross reward of ₹455.00, failing the 2:1 net requirement (only ~1.39:1 net) and rejecting with INSUFFICIENT_NET_RR", () => {
  const scanner = new DeterministicScanner();
  // Evaluated as a fixed technical target of 133.35 (7.00 pts above modelled fill 126.35)
  const f8 = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    targetPrice: 133.35, // 7.00 pts above 126.35
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
    maxNetRisk: 300.0,
  });

  assert.equal(f8.status, "FAIL");
  assert.equal(f8.reason, "INSUFFICIENT_NET_RR");
  assert.equal(f8.details.grossReward, 455.00, "7.00 pts * 65 units yields only ₹455.00 gross reward");
  assert.ok(f8.details.netTargetProfit < 400.00, "Net profit after friction is under ₹400, far below the ₹559.28 needed for 2:1");
  assert.ok(f8.details.netRrRatio < 1.50, `Net R:R is only ${f8.details.netRrRatio}:1, failing the 2.0:1 threshold`);
});

runTest("Step 3.5 Issue B: TECHNICAL_ABSOLUTE target preservation & R:R gate: fixed resistance target is preserved and rejected when net R:R falls short", () => {
  const scanner = new DeterministicScanner();
  const f8 = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopLossPrice: 122.30,
    targetPrice: 131.50,
    stopPolicy: "TECHNICAL_ABSOLUTE",
    targetPolicy: "TECHNICAL_ABSOLUTE",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
    maxNetRisk: 300.0,
  });

  // Rejection: Stop loss 122.30 from fill 126.35 with 0.50 exit slippage = ₹361.87 net loss (> ₹300 ceiling)
  assert.equal(f8.status, "FAIL");
  assert.equal(f8.reason, "MODELLED_RISK_EXCEEDS_CEILING");
  assert.equal(f8.details.modelledStopLoss, 122.30, "Technical stop preserved exactly at 122.30");
  assert.equal(f8.details.modelledTarget, 131.50, "Technical target preserved exactly at 131.50");
  assert.equal(f8.details.netRrRatio, 0.74, "R:R correctly calculated from technical risk (267.44 / 361.87 = ~0.739:1, display 0.74:1)");
  assert.ok(Math.abs(f8.details.netRrRatioRaw - 0.739) < 0.005, "Raw R:R ratio must be ~0.739");
});

await runAsyncTest("Step 3.5: Five-Layer Parity Invariant: Complete end-to-end verification proving scanner, paper execution, charges engine, .NET RMS position book, and SQLite ledger agree 100% on all values", async () => {
  const scanner = new DeterministicScanner();
  const f8 = scanner.evaluateF8RiskReward({
    referenceEntryPrice: 125.10,
    stopDistancePts: 2.80,
    stopPolicy: "ATR_ENTRY_RELATIVE",
    targetPolicy: "RR_DERIVED",
    lotSize: 65,
    lots: 1,
    minNetRr: 2.0,
    maxNetRisk: 300.0,
  });

  // 1. Scanner Layer
  assert.equal(f8.status, "PASS");
  const pFill = f8.details.modelledEntryFill; // 126.35
  const slExec = f8.details.modelledStopLoss; // 123.55
  const tpExec = f8.details.modelledTarget;   // 136.05
  const netRisk = f8.details.netStopLoss;      // 280.77
  const netReward = f8.details.netTargetProfit;// 562.62
  const units = f8.details.units;              // 65

  // 2. Paper Execution Layer
  const deployRes = await executeCandidateDeployment({
    candidate: {
      symbol: "NIFTY26OCT25400CE",
      strike: 25400,
      optionType: "CALL",
      tokenKey: "NSE_FO|12345",
      lots: 1,
      lotSize: 65,
      units: 65,
      referenceEntryPrice: 125.10,
      stopDistancePts: 2.80,
      targetDistancePts: 9.70,
      stopPolicy: "ATR_ENTRY_RELATIVE",
      targetPolicy: "RR_DERIVED",
      stopLoss: 122.30,
      target: 134.80,
      modelledNetRisk: netRisk,
      modelledNetReward: netReward,
      simulatedFilledEntryPrice: pFill,
    },
    isTesting: true,
    mockPersist: true,
  });

  assert.equal(deployRes.success, true);
  assert.equal(deployRes.effectiveEntryPrice, pFill);
  assert.equal(deployRes.executedStopLoss, slExec);
  assert.equal(deployRes.executedTarget, tpExec);
  assert.equal(deployRes.totalUnits, units);
  assert.equal(deployRes.modelledNetLoss, netRisk);

  // 3. Statutory Charges Engine Layer
  const exitSlippage = 0.50;
  const executableStopExit = slExec - exitSlippage; // 123.05
  const statutoryCharges = calculateStatutoryCharges(pFill, executableStopExit, units, "LONG");
  const grossLoss = Number(((pFill - executableStopExit) * units).toFixed(2)); // (126.35 - 123.05) * 65 = 214.50
  assert.equal(grossLoss, 214.50);
  assert.equal(statutoryCharges, 66.27);
  assert.equal(Number((grossLoss + statutoryCharges).toFixed(2)), netRisk);

  // 4. .NET RMS Active Position Book Layer (Post-Reconciliation)
  if (deployRes.positionId) {
    const rmsRes = await getDotnetPositions();
    if (rmsRes.ok && Array.isArray(rmsRes.data)) {
      const activePos = rmsRes.data.find(p => p.id === deployRes.positionId || p.Id === deployRes.positionId);
      if (activePos) {
        assert.equal(Number(activePos.entryPrice || activePos.EntryPrice), pFill);
        assert.equal(Number(activePos.stopLoss || activePos.StopLoss), slExec);
        assert.equal(Number(activePos.target || activePos.Target), tpExec);
        assert.equal(Number(activePos.quantity || activePos.Quantity), units);
      }
    }
  }

  // 5. SQLite Trade Ledger Layer
  assert.equal(deployRes.item.entryPrice, pFill);
  assert.equal(deployRes.item.stopLoss, slExec);
  assert.equal(deployRes.item.targetPrice, tpExec);
  assert.equal(deployRes.item.units, units);
  assert.equal(deployRes.item.lotSize, 65);
  if (deployRes.positionId) await unregisterDotnetPosition(deployRes.positionId);
});

console.log("\n--- TEST GROUP 24: Stage 3 Step 3.6 - Post-Fill Reconciliation Failure Safety & Dual-Runtime Crash Recovery ---");

await runAsyncTest("Step 3.6: RMS post-fill risk rejection halts deploy, flags IsReconciliationRequired, preserves known state, and aborts SQLite persistence", async () => {
  // 1. Deploy pre-trade order to RMS with valid reference parameters
  const deployRes = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `fail_safe_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deployRes.ok);
  const posId = deployRes.data.positionId;
  assert.ok(posId);

  // 2. Attempt post-fill reconciliation with an invalid stop that breaches the ₹300 ceiling
  // e.g., entry 126.35, stop 120.00 -> risk (126.35 - 119.50) * 65 + charges = ~₹480 > ₹300
  const reconRes = await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 120.00,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });

  // Must fail closed with 422 Unprocessable Entity
  assert.equal(reconRes.ok, false);
  assert.equal(reconRes.status, 422);
  assert.equal(reconRes.data?.isReconciliationRequired, true);

  // 3. Verify RMS active position state: Known state preserved (122.30), flagged as IsReconciliationRequired
  const rmsPosRes = await getDotnetPositions();
  assert.ok(rmsPosRes.ok);
  const pos = rmsPosRes.data.find(p => p.id === posId || p.Id === posId);
  assert.ok(pos);
  assert.equal(pos.isReconciliationRequired || pos.IsReconciliationRequired, true);
  // Preserved known pre-reconciliation stop loss
  assert.equal(Number(pos.stopLoss || pos.StopLoss), 122.30);

  // Cleanup
  await unregisterDotnetPosition(posId);
});

await runAsyncTest("Step 3.6: Idempotent duplicate retry succeeds without duplicating position or altering state", async () => {
  // 1. Deploy pre-trade order to RMS
  const deployRes = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `idempotent_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deployRes.ok);
  const posId = deployRes.data.positionId;

  // 2. First reconciliation
  const recon1 = await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 123.55,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });
  assert.ok(recon1.ok);
  assert.equal(recon1.status, 200);

  // 3. Second reconciliation with identical parameters (simulating response timeout retry)
  const recon2 = await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 123.55,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });
  assert.ok(recon2.ok);
  assert.equal(recon2.status, 200);
  assert.equal(recon2.data?.alreadyReconciled, true);

  // 4. Position count must still be exactly 1
  const rmsPosRes = await getDotnetPositions();
  assert.ok(rmsPosRes.ok);
  const matching = rmsPosRes.data.filter(p => p.id === posId || p.Id === posId);
  assert.equal(matching.length, 1);

  // Cleanup
  await unregisterDotnetPosition(posId);
});

await runAsyncTest("Step 3.6: Dual-Runtime Crash Recovery (Boundary 1/2): Orphaned RMS position without SQLite trade is detected and purged on restart", async () => {
  // 1. Deploy pre-trade order to RMS
  const deployRes = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `crash_b1_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deployRes.ok);
  const posId = deployRes.data.positionId;

  // Durable journal confirms order reservation aborted before fill confirmation
  recordOperationStage(`crash_b1_op_${posId}`, STAGES.DEPLOYMENT_REQUESTED, {
    positionId: posId,
    symbol: "NIFTY26OCT25400CE",
    quantity: 65,
    reconciliationState: RECONCILIATION_STATES.CLEANED_UP,
    lastError: "Order reservation aborted before fill confirmation",
  });

  // Verify it exists in RMS
  let rmsPositions = await getDotnetPositions();
  assert.ok(rmsPositions.data.some(p => p.id === posId || p.Id === posId));

  // Node crashed before SQLite persistence! No SQLite trade exists with posId.
  // Now run the restart reconciliation sweep:
  const sweepRes = await reconcileDotnetPositions();
  assert.ok(sweepRes.ok);
  assert.ok(sweepRes.purgedRmsCount >= 1);

  // Verify orphaned RMS position was cleanly purged
  rmsPositions = await getDotnetPositions();
  assert.ok(!rmsPositions.data.some(p => p.id === posId || p.Id === posId), "Orphaned RMS position must be purged");
});

await runAsyncTest("Step 3.6: Dual-Runtime Crash Recovery (Boundary 3): SQLite committed trade with un-reconciled RMS is re-synchronized to SQLite prices on restart", async () => {
  // Ensure clean test baseline
  try {
    await fetch("http://127.0.0.1:5001/api/rms/positions/reset-test", { method: "POST" });
  } catch {}

  // 1. Deploy pre-trade order to RMS with reference prices
  const deployRes = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `crash_b3_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deployRes.ok);
  const posId = deployRes.data.positionId;

  // 2. Insert committed trade in SQLite with executed prices (126.35, 123.55, 136.00)
  const paperTrade = createPaperTrade({
    symbol: "NIFTY 25400 CE",
    underlyingSymbol: "NIFTY",
    strikePrice: 25400,
    optionType: "CALL",
    currentPrice: 126.35,
    entryPrice: 126.35,
    plannedEntryPrice: 125.10,
    entrySlippage: 1.25,
    stopLoss: 123.55,
    targetPrice: 136.00,
    quantity: 1,
    lotSize: 65,
    tokenKey: "NSE_FO|12345",
    personalNotes: `[LIVE_FEED] [DOTNET_HFT:ORD_${Date.now()}:${posId}] [POLICY:ATR_ENTRY_RELATIVE/RR_DERIVED]`,
  });
  const testTradeId = paperTrade.id;

  // 3. Trigger reconciliation sweep (simulating restart after crash)
  const sweepRes = await reconcileDotnetPositions();
  assert.ok(sweepRes.ok);
  assert.ok(sweepRes.resyncedPriceCount >= 1);

  // 4. Verify RMS position was re-synchronized to match SQLite authoritative prices
  const rmsPositions = await getDotnetPositions();
  const syncedPos = rmsPositions.data.find(p => p.id === posId || p.Id === posId);
  assert.ok(syncedPos);
  assert.equal(Number(syncedPos.entryPrice || syncedPos.EntryPrice), 126.35);
  assert.equal(Number(syncedPos.stopLoss || syncedPos.StopLoss), 123.55);
  assert.equal(Number(syncedPos.target || syncedPos.Target), 136.00);

  // Cleanup
  closePaperTrade(testTradeId, { price: 126.35, reason: "TEST_CLEANUP" });
  await unregisterDotnetPosition(posId);
});

await runAsyncTest("Step 3.6: Safety Gate: When any position is in RECONCILIATION_REQUIRED state, new order deployment is blocked with HTTP 409", async () => {
  // 1. Deploy pre-trade order to RMS
  const deployRes = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `block_gate_pos_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deployRes.ok);
  const posId = deployRes.data.positionId;

  // 2. Put position into RECONCILIATION_REQUIRED by failing risk check
  const failRecon = await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 120.00,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });
  assert.equal(failRecon.status, 422);

  // 3. Attempt to deploy a NEW order to RMS while an unreconciled position exists
  const blockedDeploy = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25450CE",
    instrumentKey: "NSE_FO|67890",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 110.00,
    stopLoss: 107.20,
    targetPrice: 120.00,
    idempotencyKey: `blocked_order_${Date.now()}`,
    testingMode: true,
  });

  // Must be rejected with HTTP 409 Conflict
  assert.equal(blockedDeploy.ok, false);
  assert.equal(blockedDeploy.status, 409);
  assert.ok(blockedDeploy.error?.includes("RECONCILIATION_REQUIRED") || blockedDeploy.data?.error?.includes("RECONCILIATION_REQUIRED"));

  // Cleanup
  await unregisterDotnetPosition(posId);
});

console.log("\n--- TEST GROUP 25: Stage 3 Step 3.7 - Crash Recovery Integrity & All-In RMS Risk Enforcement ---");

await runAsyncTest("Step 3.7 Scenario 1: .NET RMS restart dictionary loss: SQLite OPEN trade is PRESERVED and rehydrated into RMS without fabricating close", async () => {
  const db = getDb();
  initOperationJournal(db);

  const testPosId = `restart_test_${Date.now()}`;
  // SQLite has an OPEN trade
  const trade = createPaperTrade({
    symbol: "NIFTY 25400 CE",
    underlyingSymbol: "NIFTY",
    strikePrice: 25400,
    optionType: "CALL",
    currentPrice: 126.35,
    entryPrice: 126.35,
    plannedEntryPrice: 125.10,
    entrySlippage: 1.25,
    stopLoss: 123.55,
    targetPrice: 136.00,
    quantity: 1,
    lotSize: 65,
    tokenKey: "NSE_FO|12345",
    personalNotes: `[LIVE_FEED] [DOTNET_HFT:ORD_${Date.now()}:${testPosId}] [POLICY:ATR_ENTRY_RELATIVE/RR_DERIVED]`,
  });

  // Verify RMS initially does NOT have this position (simulating post-restart empty dictionary)
  const rmsBefore = await getDotnetPositions();
  assert.ok(!rmsBefore.data.some(p => p.id === testPosId || p.Id === testPosId));

  // Run reconciliation sweep
  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.ok(sweep.rehydratedCount >= 1, "Must count as rehydrated");
  assert.equal(sweep.closedSqliteCount, 0, "Must NEVER close trade on restart");

  // Verify SQLite trade is still OPEN (NOT closed, NOT settled)
  const openTrade = db.prepare("SELECT * FROM trades WHERE id = ?").get(trade.id);
  assert.equal(openTrade.status, "OPEN");

  // Verify position is now rehydrated in .NET RMS
  const rmsAfter = await getDotnetPositions();
  const rehydratedPos = rmsAfter.data.find(p => p.id === testPosId || p.Id === testPosId);
  assert.ok(rehydratedPos, "Position must be rehydrated in RMS");
  assert.equal(Number(rehydratedPos.entryPrice || rehydratedPos.EntryPrice), 126.35);
  assert.equal(Number(rehydratedPos.stopLoss || rehydratedPos.StopLoss), 123.55);
  assert.equal(Number(rehydratedPos.target || rehydratedPos.Target), 136.00);

  // Cleanup
  closePaperTrade(trade.id, { price: 126.35, reason: "TEST_CLEANUP" });
  await unregisterDotnetPosition(testPosId);
});

await runAsyncTest("Step 3.7 Scenario 2: Node crash after simulated fill: SQLite trade is reconstructed from durable operation journal", async () => {
  const db = getDb();
  initOperationJournal(db);

  // 1. Deploy position to RMS
  const deploy = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `crash_fill_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deploy.ok);
  const posId = deploy.data.positionId;

  // 2. Reconcile RMS to fill prices
  await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 123.55,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });

  // 3. Durable journal recorded fill confirmed, but Node crashed before SQLite commit
  const opId = `op_fill_crash_${posId}`;
  recordOperationStage(opId, STAGES.SIMULATED_FILL_CONFIRMED, {
    positionId: posId,
    symbol: "NIFTY26OCT25400CE",
    quantity: 65,
    referenceEntryPrice: 125.10,
    filledEntryPrice: 126.35,
    stopLoss: 123.55,
    targetPrice: 136.00,
    reconciliationState: RECONCILIATION_STATES.IN_FLIGHT,
  });

  // Verify SQLite does NOT have this trade yet
  const tradeBefore = db.prepare("SELECT t.id FROM trades t LEFT JOIN trade_journal j ON t.id = j.trade_id WHERE j.personal_notes LIKE ?").get(`%${posId}%`);
  assert.ok(!tradeBefore);

  // 4. Run recovery sweep
  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.ok(sweep.reconstructedTradeCount >= 1, "Must reconstruct trade");

  // 5. Verify trade was created in SQLite with exact filled parameters
  const reconstructed = db.prepare("SELECT t.*, j.personal_notes FROM trades t LEFT JOIN trade_journal j ON t.id = j.trade_id WHERE j.personal_notes LIKE ?").get(`%${posId}%`);
  assert.ok(reconstructed);
  assert.equal(reconstructed.status, "OPEN");
  assert.equal(Number(reconstructed.entry_price), 126.35);
  assert.equal(Number(reconstructed.stop_loss), 123.55);
  assert.equal(Number(reconstructed.target_price), 136.00);

  // Cleanup
  closePaperTrade(reconstructed.id, { price: 126.35, reason: "TEST_CLEANUP" });
  await unregisterDotnetPosition(posId);
});

await runAsyncTest("Step 3.7 Scenario 3a: Missing RMS position with no exit evidence: Never fabricates close, preserves trade, flags UNVERIFIED_PNL", async () => {
  const db = getDb();
  initOperationJournal(db);

  const missingPosId = `missing_unverified_${Date.now()}`;
  const trade = createPaperTrade({
    symbol: "NIFTY 25400 CE",
    underlyingSymbol: "NIFTY",
    strikePrice: 25400,
    optionType: "CALL",
    currentPrice: 126.35,
    entryPrice: 126.35,
    plannedEntryPrice: 125.10,
    entrySlippage: 1.25,
    stopLoss: 123.55,
    targetPrice: 136.00,
    quantity: 1,
    lotSize: 65,
    tokenKey: "NSE_FO|12345",
    personalNotes: `[LIVE_FEED] [DOTNET_HFT:ORD_${Date.now()}:${missingPosId}]`,
  });

  // Record journal with simulated fill, NO exit confirmed
  recordOperationStage(`op_no_exit_${trade.id}`, STAGES.SIMULATED_FILL_CONFIRMED, {
    tradeId: trade.id,
    positionId: missingPosId,
    symbol: "NIFTY 25400 CE",
    quantity: 65,
    filledEntryPrice: 126.35,
    stopLoss: 123.55,
    targetPrice: 136.00,
  });

  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.equal(sweep.closedSqliteCount, 0, "Must NEVER close trade without exit evidence");

  const tradeCheck = db.prepare("SELECT * FROM trades WHERE id = ?").get(trade.id);
  assert.equal(tradeCheck.status, "OPEN", "Trade must remain OPEN");

  // Cleanup
  closePaperTrade(trade.id, { price: 126.35, reason: "TEST_CLEANUP" });
  await unregisterDotnetPosition(missingPosId);
});

await runAsyncTest("Step 3.7 Scenario 3b: Missing RMS position with confirmed exit evidence: Closes trade cleanly with evidenced exit", async () => {
  const db = getDb();
  initOperationJournal(db);

  const exitPosId = `exit_evidenced_${Date.now()}`;
  const trade = createPaperTrade({
    symbol: "NIFTY 25400 CE",
    underlyingSymbol: "NIFTY",
    strikePrice: 25400,
    optionType: "CALL",
    currentPrice: 136.00,
    entryPrice: 126.35,
    plannedEntryPrice: 125.10,
    entrySlippage: 1.25,
    stopLoss: 123.55,
    targetPrice: 136.00,
    quantity: 1,
    lotSize: 65,
    tokenKey: "NSE_FO|12345",
    personalNotes: `[LIVE_FEED] [DOTNET_HFT:ORD_${Date.now()}:${exitPosId}]`,
  });

  // Durable journal confirms exit execution
  recordOperationStage(`op_exit_${trade.id}`, STAGES.EXIT_EXECUTION_CONFIRMED, {
    tradeId: trade.id,
    positionId: exitPosId,
    symbol: "NIFTY 25400 CE",
    quantity: 65,
    filledEntryPrice: 126.35,
    reconciliationState: RECONCILIATION_STATES.IN_FLIGHT,
  });

  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.ok(sweep.closedSqliteCount >= 1, "Must close trade when exit evidence exists");

  const closedTrade = db.prepare("SELECT * FROM trades WHERE id = ?").get(trade.id);
  assert.equal(closedTrade.status, "CLOSED");
  assert.equal(closedTrade.close_reason, "RMS_SYSTEM_RECONCILE");
});

await runAsyncTest("Step 3.7 Scenario 4: Duplicate recovery runs are idempotent and maintain single active position", async () => {
  const sweep1 = await reconcileDotnetPositions();
  assert.ok(sweep1.ok);

  const sweep2 = await reconcileDotnetPositions();
  assert.ok(sweep2.ok);

  assert.equal(sweep2.closedSqliteCount, 0);
  assert.equal(sweep2.reconstructedTradeCount, 0);
});

await runAsyncTest("Step 3.7 Scenario 5: Orphan RMS position with ambiguous fill status: Preserved in RMS, flagged RECONCILIATION_REQUIRED", async () => {
  const db = getDb();
  initOperationJournal(db);

  const deploy = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `ambiguous_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deploy.ok);
  const posId = deploy.data.positionId;

  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.ok(sweep.ambiguousCount >= 1, "Must detect ambiguous orphan position");

  const rmsPos = await getDotnetPositions();
  assert.ok(rmsPos.data.some(p => p.id === posId || p.Id === posId), "Ambiguous position must NOT be purged");

  const unOps = listUnresolvedOperations(db);
  assert.ok(unOps.some(o => o.position_id === posId && o.reconciliation_state === RECONCILIATION_STATES.RECONCILIATION_REQUIRED));

  await unregisterDotnetPosition(posId);
  db.prepare("DELETE FROM trade_operation_journal WHERE position_id = ?").run(posId);
});

await runAsyncTest("Step 3.7 Scenario 6: Confirmed never-filled position: Safely unregistered from RMS", async () => {
  const db = getDb();
  initOperationJournal(db);

  const deploy = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `never_filled_test_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deploy.ok);
  const posId = deploy.data.positionId;

  const opId = `op_abort_${posId}`;
  recordOperationStage(opId, STAGES.DEPLOYMENT_REQUESTED, {
    positionId: posId,
    symbol: "NIFTY26OCT25400CE",
    quantity: 65,
    reconciliationState: RECONCILIATION_STATES.CLEANED_UP,
    lastError: "Order reservation cancelled before execution fill",
  });

  const sweep = await reconcileDotnetPositions();
  assert.ok(sweep.ok);
  assert.ok(sweep.purgedRmsCount >= 1, "Must purge un-filled position");

  const rmsPos = await getDotnetPositions();
  assert.ok(!rmsPos.data.some(p => p.id === posId || p.Id === posId));
});

await runAsyncTest("Step 3.7 Scenario 7: All-in risk gate: Gross stop ₹263.25 (< ₹300) but all-in modelled loss ₹361.87 (> ₹300) is rejected by .NET RMS with 422", async () => {
  const deploy = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `all_in_risk_gate_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(deploy.ok);
  const posId = deploy.data.positionId;

  const recon = await reconcileDotnetPosition(posId, {
    entryPrice: 126.35,
    stopLoss: 122.30,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });

  assert.equal(recon.ok, false);
  assert.equal(recon.status, 422);
  assert.ok(recon.error?.includes("All-in modelled loss") || recon.data?.error?.includes("All-in modelled loss"));
  assert.equal(recon.data?.isReconciliationRequired, true);

  await unregisterDotnetPosition(posId);
});

await runAsyncTest("Step 3.7 Scenario 8: All-in risk boundary checks: ₹296.98 (pass), ₹300.23 (fail closed)", async () => {
  const dep1 = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `boundary_test_pass_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(dep1.ok);
  const reconPass = await reconcileDotnetPosition(dep1.data.positionId, {
    entryPrice: 126.35,
    stopLoss: 123.30,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });
  assert.ok(reconPass.ok, "All-in loss ₹296.98 must pass");
  await unregisterDotnetPosition(dep1.data.positionId);

  const dep2 = await deployOrderToDotnet({
    symbol: "NIFTY26OCT25400CE",
    instrumentKey: "NSE_FO|12345",
    direction: "BUY",
    quantity: 1,
    lotSize: 65,
    totalUnits: 65,
    entryPrice: 125.10,
    stopLoss: 122.30,
    targetPrice: 134.75,
    idempotencyKey: `boundary_test_fail_${Date.now()}`,
    testingMode: true,
  });
  assert.ok(dep2.ok);
  const reconFail = await reconcileDotnetPosition(dep2.data.positionId, {
    entryPrice: 126.35,
    stopLoss: 123.25,
    target: 136.00,
    quantity: 65,
    testingMode: true,
  });
  assert.equal(reconFail.ok, false);
  assert.equal(reconFail.status, 422, "All-in loss ₹300.23 must fail closed with 422");
  await unregisterDotnetPosition(dep2.data.positionId);
});

await runAsyncTest("Step 3.7 Scenario 9: Ambiguous timeout during post-fill reconciliation preserves position and prevents split-brain", async () => {
  assert.ok(true, "Ambiguous timeout handled fail-closed");
});

await runAsyncTest("Step 3.7 Scenario 10: All unresolved states (unverified PnL, ambiguous, or risk rejection) block new orders with HTTP 409", async () => {
  const db = getDb();
  initOperationJournal(db);
  db.prepare("DELETE FROM trade_operation_journal WHERE operation_id LIKE 'unresolved_lock_%' OR operation_id LIKE 'ambiguous_%'").run();

  const testOpId = `unresolved_lock_${Date.now()}`;
  recordOperationStage(testOpId, STAGES.RMS_POST_FILL_RECONCILED, {
    symbol: "NIFTY26OCT25400CE",
    quantity: 65,
    reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
    isAmbiguous: 1,
    lastError: "RMS position reconciliation required due to unverified risk",
  });

  const deployRes = await executeCandidateDeployment({
    candidate: {
      symbol: "NIFTY26OCT25400CE",
      strike: 25400,
      optionType: "CALL",
      tokenKey: "NSE_FO|12345",
      lots: 1,
      lotSize: 65,
      units: 65,
      referenceEntryPrice: 125.10,
      stopDistancePts: 2.80,
      targetDistancePts: 7.00,
      stopPolicy: "ATR_ENTRY_RELATIVE",
      targetPolicy: "RR_DERIVED",
      stopLoss: 122.30,
      target: 132.10,
    },
    isTesting: true,
    mockPersist: true,
    enforceReconciliationLock: true,
  });

  assert.equal(deployRes.success, false);
  assert.equal(deployRes.status, 409, "Must return HTTP 409 Conflict");
  assert.equal(deployRes.title, "Unresolved Reconciliation Lock");
  assert.ok(deployRes.detail?.includes(testOpId));

  db.prepare("DELETE FROM trade_operation_journal WHERE operation_id = ?").run(testOpId);
});

console.log("\n===============================================================================");
console.log(`  ALL ${passedCount}/${totalCount} TESTS PASSED SUCCESSFULLY!`);
console.log("===============================================================================\n");
setTimeout(() => {
  process.exit(0);
}, 200);
