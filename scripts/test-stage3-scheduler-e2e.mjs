import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ExchangeCalendar } from "../src/services/engine/exchangeCalendar.js";
import { MarketScheduler, MARKET_REGIMES } from "../src/services/engine/marketScheduler.js";
import { getDb } from "../src/db/connection.js";
import { getTradeById, createTrade as originalCreateTrade } from "../src/repositories/trades.repository.js";

const createdTradeIds = [];
function createTrade(payload) {
  const t = originalCreateTrade(payload);
  if (t && t.id) createdTradeIds.push(t.id);
  return t;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CALENDAR_PATH = path.resolve(__dirname, "../data/nse-holidays-2026.json");

console.log("========================================================================");
console.log("   PORTFOLIOX — STAGE 3 STEP 2.1: SCHEDULER & CALENDAR ACCEPTANCE TESTS ");
console.log("========================================================================");

let totalPassed = 0;
let totalFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    totalFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    totalFailed++;
  }
}

// Helper to construct Date from IST time components (Asia/Kolkata is UTC+5:30)
function makeIstDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second));
  return utcDate;
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: EXCHANGE CALENDAR & F&O SEGMENT VERIFICATION
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 1] Exchange Calendar, F&O Segment Scoping & Circular Verification");

const calendar = new ExchangeCalendar({ calendarPath: CALENDAR_PATH });

runTest("Calendar correctly loads 2026 NSE F&O circular metadata", () => {
  const status = calendar.getStatus();
  assert.equal(status.status, "LOADED");
  assert.equal(status.year, 2026);
  assert.equal(status.segment, "EQUITY_DERIVATIVES");
  assert.match(status.metadata?.source || status.metadata?.baseCircular, /NSE\/FAOP\/71777/);
  assert.ok(status.metadata?.verifiedAt);
  assert.equal(status.holidaysCount, 16);
  assert.equal(status.specialSessionsCount, 1);
});

runTest("Regular weekday (Thursday 2026-10-15) is identified as an active F&O trading day", () => {
  const d = makeIstDate(2026, 10, 15, 10, 0, 0);
  const result = calendar.isTradingDay(d);
  assert.equal(result.isTradingDay, true);
  assert.equal(result.status, "REGULAR_SESSION");
  assert.equal(result.dateStr, "2026-10-15");
});

runTest("Weekend (Saturday 2026-10-17 and Sunday 2026-10-18) are non-trading days", () => {
  const sat = makeIstDate(2026, 10, 17, 11, 0, 0);
  const sun = makeIstDate(2026, 10, 18, 11, 0, 0);

  const satRes = calendar.isTradingDay(sat);
  assert.equal(satRes.isTradingDay, false);
  assert.equal(satRes.status, "WEEKEND");

  const sunRes = calendar.isTradingDay(sun);
  assert.equal(sunRes.isTradingDay, false);
  assert.equal(sunRes.status, "WEEKEND");
});

runTest("Official NSE F&O holidays are non-trading days (Republic Day, Maharashtra Day, Gandhi Jayanti)", () => {
  const republicDay = makeIstDate(2026, 1, 26, 10, 30, 0);
  const repRes = calendar.isTradingDay(republicDay);
  assert.equal(repRes.isTradingDay, false);
  assert.equal(repRes.status, "HOLIDAY");
  assert.match(repRes.reason, /Republic Day/i);

  const mahaDay = makeIstDate(2026, 5, 1, 10, 30, 0);
  const mahaRes = calendar.isTradingDay(mahaDay);
  assert.equal(mahaRes.isTradingDay, false);
  assert.equal(mahaRes.status, "HOLIDAY");

  const gandhiDay = makeIstDate(2026, 10, 2, 12, 0, 0);
  const gandhiRes = calendar.isTradingDay(gandhiDay);
  assert.equal(gandhiRes.isTradingDay, false);
  assert.equal(gandhiRes.status, "HOLIDAY");
});

runTest("Segment Isolation: Equity-only holiday cannot accidentally disable valid NIFTY F&O session", () => {
  // Construct temporary calendar data with an EQUITY-only settlement holiday
  const tempCal = new ExchangeCalendar({ autoLoad: false });
  tempCal.calendarData = {
    year: 2026,
    segment: "EQUITY_DERIVATIVES",
    regularHours: { open: "09:15", close: "15:40" },
    holidays: [
      {
        date: "2026-07-15",
        description: "Cash Equity Clearing Settlement Holiday",
        applicableSegments: ["EQUITY"], // CASH EQUITY ONLY, NOT F&O!
      },
    ],
    specialSessions: [],
  };
  tempCal.status = "LOADED";
  tempCal.holidaysMap.set("2026-07-15", tempCal.calendarData.holidays[0]);

  // Test for EQUITY_DERIVATIVES: Must remain open!
  const foRes = tempCal.isTradingDay(makeIstDate(2026, 7, 15, 10, 0, 0), "EQUITY_DERIVATIVES");
  assert.equal(foRes.isTradingDay, true);
  assert.equal(foRes.status, "REGULAR_SESSION");

  // Test for EQUITY: Must be closed!
  const eqRes = tempCal.isTradingDay(makeIstDate(2026, 7, 15, 10, 0, 0), "EQUITY");
  assert.equal(eqRes.isTradingDay, false);
  assert.equal(eqRes.status, "HOLIDAY");
});

runTest("Diwali Laxmi Pujan (Muhurat Trading 2026-11-08): Unverified timings fail closed and block entries", () => {
  const muhuratDate = makeIstDate(2026, 11, 8, 18, 30, 0); // Sunday evening
  const calRes = calendar.isTradingDay(muhuratDate);
  assert.equal(calRes.isTradingDay, true);
  assert.equal(calRes.isSpecialSession, true);
  assert.equal(calRes.sessionHoursVerified, false);
  assert.equal(calRes.sessionHours, null);
  assert.equal(calRes.status, "SPECIAL_SESSION_TIMINGS_UNVERIFIED");

  // Scheduler evaluation must fail closed
  const testScheduler = new MarketScheduler({ calendar });
  const evalRes = testScheduler.evaluateRegimeForTime(muhuratDate);
  assert.equal(evalRes.isEntryAllowed, false, "Entries must be blocked when timings are unverified");
  assert.equal(evalRes.isMarketOpen, false, "Market must remain closed under unverified guessed hours");
  assert.equal(evalRes.status, "SPECIAL_SESSION_TIMINGS_UNVERIFIED");
});

runTest("Muhurat Trading with officially verified session times enables trading and separates rules", () => {
  const verifiedCalendar = new ExchangeCalendar({ autoLoad: false });
  verifiedCalendar.calendarData = {
    year: 2026,
    segment: "EQUITY_DERIVATIVES",
    regularHours: { open: "09:15", close: "15:40" },
    holidays: [],
    specialSessions: [
      {
        date: "2026-11-08",
        description: "Diwali Laxmi Pujan (Muhurat Trading - Verified Circular)",
        applicableSegments: ["EQUITY", "EQUITY_DERIVATIVES"],
        sessionHoursVerified: true,
        sessionHours: { open: "18:15", close: "19:15" },
      },
    ],
  };
  verifiedCalendar.status = "LOADED";
  verifiedCalendar.specialSessionsMap.set("2026-11-08", verifiedCalendar.calendarData.specialSessions[0]);

  const testScheduler = new MarketScheduler({ calendar: verifiedCalendar });

  // 18:14 IST -> Pre-market (closed)
  const preRes = testScheduler.evaluateRegimeForTime(makeIstDate(2026, 11, 8, 18, 14, 0));
  assert.equal(preRes.isEntryAllowed, false);
  assert.equal(preRes.isMarketOpen, false);

  // 18:30 IST -> SPECIAL_SESSION_ACTIVE (entry allowed on Sunday!)
  const activeRes = testScheduler.evaluateRegimeForTime(makeIstDate(2026, 11, 8, 18, 30, 0));
  assert.equal(activeRes.regime, MARKET_REGIMES.SPECIAL_SESSION_ACTIVE);
  assert.equal(activeRes.isEntryAllowed, true);
  assert.equal(activeRes.isMarketOpen, true);

  // 19:05 IST -> MANDATORY_EOD_SQUAREOFF (15 mins before special session close)
  const sqRes = testScheduler.evaluateRegimeForTime(makeIstDate(2026, 11, 8, 19, 5, 0));
  assert.equal(sqRes.regime, MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF);
  assert.equal(sqRes.isEntryAllowed, false);
  assert.equal(sqRes.isMarketOpen, true);

  // 19:20 IST -> MARKET_CLOSED
  const closeRes = testScheduler.evaluateRegimeForTime(makeIstDate(2026, 11, 8, 19, 20, 0));
  assert.equal(closeRes.regime, MARKET_REGIMES.MARKET_CLOSED);
  assert.equal(closeRes.isMarketOpen, false);
});

runTest("Fail-Closed: Missing calendar file returns CALENDAR_UNAVAILABLE and blocks trading", () => {
  const brokenCalendar = new ExchangeCalendar({
    calendarPath: path.resolve(__dirname, "../data/non-existent-calendar.json"),
  });
  const res = brokenCalendar.isTradingDay(makeIstDate(2026, 10, 15, 10, 0, 0));
  assert.equal(res.isTradingDay, false);
  assert.equal(res.status, "CALENDAR_UNAVAILABLE");
});

runTest("Fail-Closed: Calendar year mismatch (e.g. 2027 query against 2026 calendar) blocks trading", () => {
  const res = calendar.isTradingDay(makeIstDate(2027, 10, 15, 10, 0, 0));
  assert.equal(res.isTradingDay, false);
  assert.equal(res.status, "YEAR_UNSUPPORTED");
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: MARKET REGIMES & BOUNDARY VERIFICATION
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 2] Standard Market Regimes & Boundary Verification (IST Timezone)");

let mockTime = makeIstDate(2026, 10, 15, 9, 0, 0);
const scheduler = new MarketScheduler({
  calendar,
  timeProvider: () => mockTime,
});

runTest("09:14:59 IST -> MARKET_CLOSED (Entry Disallowed, Market Closed)", () => {
  mockTime = makeIstDate(2026, 10, 15, 9, 14, 59);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MARKET_CLOSED);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, false);
});

runTest("09:15:00 IST -> OPENING_CHOP (Entry Disallowed, Market Open)", () => {
  mockTime = makeIstDate(2026, 10, 15, 9, 15, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.OPENING_CHOP);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("09:30:00 IST -> MORNING_EXPANSION (Entry ALLOWED, Market Open)", () => {
  mockTime = makeIstDate(2026, 10, 15, 9, 30, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MORNING_EXPANSION);
  assert.equal(evalResult.isEntryAllowed, true);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("11:15:00 IST -> MIDDAY_STAND_DOWN (Entry Disallowed, Monitoring Active)", () => {
  mockTime = makeIstDate(2026, 10, 15, 11, 15, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MIDDAY_STAND_DOWN);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("13:15:00 IST -> AFTERNOON_TREND (Entry ALLOWED, Market Open)", () => {
  mockTime = makeIstDate(2026, 10, 15, 13, 15, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.AFTERNOON_TREND);
  assert.equal(evalResult.isEntryAllowed, true);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("14:45:00 IST -> ENTRY_SHUTDOWN (Entry Disallowed, Monitoring Active)", () => {
  mockTime = makeIstDate(2026, 10, 15, 14, 45, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.ENTRY_SHUTDOWN);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("15:15:00 IST -> MANDATORY_EOD_SQUAREOFF (Entry Disallowed, Square-Off Active)", () => {
  mockTime = makeIstDate(2026, 10, 15, 15, 15, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("15:30:00 IST -> MANDATORY_EOD_SQUAREOFF (Exchange Open, Entry Disallowed, Square-Off Active)", () => {
  mockTime = makeIstDate(2026, 10, 15, 15, 30, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, true);
});

runTest("15:40:00 IST -> MARKET_CLOSED (Entry Disallowed, Exchange Market Closed)", () => {
  mockTime = makeIstDate(2026, 10, 15, 15, 40, 0);
  const evalResult = scheduler.evaluateRegimeForTime(mockTime);
  assert.equal(evalResult.regime, MARKET_REGIMES.MARKET_CLOSED);
  assert.equal(evalResult.isEntryAllowed, false);
  assert.equal(evalResult.isMarketOpen, false);
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: RESTART RECOVERY & DETERMINISTIC RESYNCHRONIZATION
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 3] Restart Recovery & Resynchronization");

runTest("Restart at 11:45 IST initializes immediately in MIDDAY_STAND_DOWN without scanning", () => {
  const restartTime = makeIstDate(2026, 10, 15, 11, 45, 0);
  const freshScheduler = new MarketScheduler({
    calendar,
    timeProvider: () => restartTime,
  });

  const evaluation = freshScheduler.evaluateRegimeForTime(restartTime);
  assert.equal(evaluation.regime, MARKET_REGIMES.MIDDAY_STAND_DOWN);
  assert.equal(evaluation.isEntryAllowed, false);
  assert.equal(evaluation.isMarketOpen, true);
});

runTest("Restart at 15:05 IST initializes immediately in ENTRY_SHUTDOWN without scanning", () => {
  const restartTime = makeIstDate(2026, 10, 15, 15, 5, 0);
  const freshScheduler = new MarketScheduler({
    calendar,
    timeProvider: () => restartTime,
  });

  const evaluation = freshScheduler.evaluateRegimeForTime(restartTime);
  assert.equal(evaluation.regime, MARKET_REGIMES.ENTRY_SHUTDOWN);
  assert.equal(evaluation.isEntryAllowed, false);
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: MANDATORY EOD SQUARE-OFF EXECUTION & DEPTH SAFETY
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 4] Mandatory EOD Square-Off Execution & Missing-Depth Protection");

await runAsyncTest("EOD Square-Off successfully liquidates position when valid bid depth exists (Case 6)", async () => {
  const db = getDb();
  const tradePayload = {
    symbol: "NIFTY26OCT25000CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 100.0,
    stopLoss: 95.0,
    targetPrice: 110.0,
    status: "OPEN",
    tradeMode: "PAPER",
    accountId: 1,
  };

  const created = createTrade(tradePayload);
  const tradeId = created.id;

  const mockActiveTrades = new Map();
  const mockItem = {
    trade: getTradeById(tradeId),
    tokenKey: "NSE_FO|12345",
    monitoringState: "NORMAL",
    pnlStatus: "VERIFIED",
    lastLtp: 105.0,
  };
  mockActiveTrades.set(tradeId, mockItem);

  const mockQuotes = new Map();
  mockQuotes.set("NSE_FO|12345", {
    ltp: 105.0,
    timestampMs: Date.now(),
    isFresh: true,
    depth: {
      bids: [{ price: 104.50, quantity: 1300, orders: 12 }],
      asks: [{ price: 105.00, quantity: 1950, orders: 15 }],
    },
  });

  const mockEngine = {
    activeTrades: mockActiveTrades,
    quoteStore: mockQuotes,
    getAuthoritativeQuote: (key) => mockQuotes.get(key),
    removeTrade: (id) => mockActiveTrades.delete(id),
    publish: () => {},
  };

  const eodTime = makeIstDate(2026, 10, 15, 15, 15, 0);
  const testScheduler = new MarketScheduler({
    calendar,
    engine: mockEngine,
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
    timeProvider: () => eodTime,
  });

  const report = await testScheduler.executeMandatoryEodSquareOff("2026-10-15");

  assert.equal(report.totalPositions, 1);
  assert.equal(report.executedCount, 1);
  assert.equal(report.deferredCount, 0);

  // Position removed from engine active trades
  assert.equal(mockActiveTrades.has(tradeId), false);

  // DB trade must be closed with one execution row
  const updatedDbTrade = getTradeById(tradeId);
  assert.equal(updatedDbTrade.status, "CLOSED");
  assert.match(updatedDbTrade.closeReason, /AUTO_EOD_SQUAREOFF/);

  // Durable SQLite ledger must record EXECUTED
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(tradeId);
  assert.ok(ledgerRow);
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.exit_price, 104.50);
});

await runAsyncTest("EOD Square-Off preserves OPEN status when depth is missing (Cases 1-5)", async () => {
  const db = getDb();
  const tradePayload = {
    symbol: "NIFTY26OCT25100PE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 80.0,
    stopLoss: 75.0,
    targetPrice: 90.0,
    status: "OPEN",
    tradeMode: "PAPER",
    accountId: 1,
  };

  const created = createTrade(tradePayload);
  const tradeId = created.id;

  const mockActiveTrades = new Map();
  const mockItem = {
    trade: getTradeById(tradeId),
    tokenKey: "NSE_FO|99999",
    monitoringState: "NORMAL",
    pnlStatus: "VERIFIED",
    lastLtp: 82.0,
  };
  mockActiveTrades.set(tradeId, mockItem);

  const mockQuotes = new Map();
  mockQuotes.set("NSE_FO|99999", {
    ltp: 82.0,
    timestampMs: Date.now(),
    isFresh: true,
    depth: null, // Zero executable bid depth (Case 2)
  });

  let publishedAlert = null;
  const mockEngine = {
    activeTrades: mockActiveTrades,
    quoteStore: mockQuotes,
    getAuthoritativeQuote: (key) => mockQuotes.get(key),
    removeTrade: (id) => mockActiveTrades.delete(id),
    publish: (type, payload) => {
      if (type === "monitoring_reconciliation_required") {
        publishedAlert = payload;
      }
    },
  };

  const eodTime = makeIstDate(2026, 10, 15, 15, 15, 0);
  const testScheduler = new MarketScheduler({
    calendar,
    engine: mockEngine,
    timeProvider: () => eodTime,
  });

  const report = await testScheduler.executeMandatoryEodSquareOff("2026-10-15");

  assert.equal(report.totalPositions, 1);
  assert.equal(report.executedCount, 0);
  assert.equal(report.deferredCount, 1);

  // Position must STAY OPEN in engine!
  assert.equal(mockActiveTrades.has(tradeId), true);
  assert.equal(mockItem.monitoringState, "RECONCILIATION_REQUIRED");
  assert.equal(mockItem.pnlStatus, "UNVERIFIED");

  // Position must STAY OPEN in database! Zero false settlements!
  const dbTrade = getTradeById(tradeId);
  assert.equal(dbTrade.status, "OPEN");

  // Durable SQLite ledger must record DEFERRED
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(tradeId);
  assert.ok(ledgerRow);
  assert.equal(ledgerRow.status, "DEFERRED");
  assert.equal(ledgerRow.failure_reason, "DEPTH_NULL");

  // Alert must have been emitted
  assert.ok(publishedAlert);
  assert.equal(publishedAlert.tradeId, tradeId);
  assert.match(publishedAlert.reason, /DEPTH_NULL/);
});

// -----------------------------------------------------------------------------
// TEST SUITE 5: DURABLE IDEMPOTENCY, RECOVERY & OVERNIGHT EXPOSURE
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 5] Durable SQLite Idempotency across Ticks, Restarts & Crash Recovery");

await runAsyncTest("Subsequent ticks do not re-execute EOD square-off on same session date", async () => {
  let executeCallCount = 0;
  const mockEngine = {
    activeTrades: new Map(),
    quoteStore: new Map(),
    getAuthoritativeQuote: () => null,
    publish: () => {},
  };

  const testScheduler = new MarketScheduler({
    calendar,
    engine: mockEngine,
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 15, 0),
  });

  testScheduler.on("eod_squareoff_started", () => {
    executeCallCount++;
  });

  // Tick 1 at 15:15:00
  await testScheduler.evaluate(makeIstDate(2026, 10, 15, 15, 15, 0));
  assert.equal(executeCallCount, 1);

  // Tick 2 at 15:15:01
  await testScheduler.evaluate(makeIstDate(2026, 10, 15, 15, 15, 1));
  assert.equal(executeCallCount, 1, "Tick 2 must not re-trigger square-off");

  // Tick 3 at 15:20:00
  await testScheduler.evaluate(makeIstDate(2026, 10, 15, 15, 20, 0));
  assert.equal(executeCallCount, 1, "Tick 3 must not re-trigger square-off");
});

await runAsyncTest("Durable Idempotency: Process restart after successful close reads SQLite ledger without duplicate close", async () => {
  const db = getDb();
  // Create an open trade, then simulate an already executed square-off in SQLite ledger
  const trade = createTrade({
    symbol: "NIFTY26OCT25200CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 110.0,
    exitPrice: 112.5,
    exitDatetime: new Date().toISOString(),
    stopLoss: 105.0,
    targetPrice: 120.0,
    status: "CLOSED",
    tradeMode: "PAPER",
    accountId: 1,
  });

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, exit_price, pnl, reason)
    VALUES ('2026-10-15', ?, 'EOD_SQOFF_2026-10-15_${trade.id}', 'EXECUTED', 112.5, 162.5, 'AUTO_EOD_SQUAREOFF')
    ON CONFLICT(session_date, trade_id) DO NOTHING
  `).run(trade.id);

  // Simulate brand new process restart (fresh MarketScheduler instance with empty in-memory set)
  const restartedScheduler = new MarketScheduler({
    calendar,
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|1111" }]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 16, 0),
  });

  assert.equal(restartedScheduler.completedSquareOffDates.size, 0, "New process has empty in-memory set");

  const report = await restartedScheduler.executeMandatoryEodSquareOff("2026-10-15");

  // Must recognize it was already executed via durable ledger!
  assert.equal(report.details[0].alreadyExecuted, true);
  assert.equal(report.details[0].exitPrice, 112.5);

  // Verify only ONE exit execution exists in trade_executions
  const executionCount = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
  assert.equal(executionCount.count, 1, "Only initial execution row exists, no duplicates created");
});

await runAsyncTest("Crash Recovery: PENDING ledger status is reconciled against authoritative SQLite state", async () => {
  const db = getDb();
  // Create trade that was closed before crash
  const trade = createTrade({
    symbol: "NIFTY26OCT25300CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 90.0,
    exitPrice: 92.5,
    exitDatetime: new Date().toISOString(),
    stopLoss: 85.0,
    targetPrice: 100.0,
    status: "CLOSED",
    tradeMode: "PAPER",
    accountId: 1,
  });

  // Simulate crashed process leaving PENDING status in ledger
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, reason)
    VALUES ('2026-10-15', ?, 'EOD_SQOFF_2026-10-15_${trade.id}', 'PENDING', 'INITIATING_SQUARE_OFF')
    ON CONFLICT(session_date, trade_id) DO UPDATE SET status = 'PENDING'
  `).run(trade.id);

  const recoveryScheduler = new MarketScheduler({
    calendar,
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|2222" }]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 20, 0),
  });

  const report = await recoveryScheduler.executeMandatoryEodSquareOff("2026-10-15");

  assert.equal(report.details[0].alreadyExecuted, true);

  // Ledger status must be updated to EXECUTED upon reconciliation
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(trade.id);
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.reason, "RECONCILED_ALREADY_CLOSED");
});

await runAsyncTest("Unresolved positions at 15:40 produce visible critical overnight exposure alert", async () => {
  let emittedOvernightAlert = null;
  const mockActiveTrades = new Map();
  mockActiveTrades.set(9999, {
    trade: { id: 9999, symbol: "NIFTY26OCT25000CE" },
    monitoringState: "RECONCILIATION_REQUIRED",
    pnlStatus: "UNVERIFIED",
    degradedReason: "NO_EXECUTABLE_DEPTH",
  });

  const schedulerWithOpenTrades = new MarketScheduler({
    calendar,
    engine: {
      activeTrades: mockActiveTrades,
      publish: (type, payload) => {
        if (type === "overnight_exposure_alert") emittedOvernightAlert = payload;
      },
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 40, 0),
  });

  schedulerWithOpenTrades.on("overnight_exposure_alert", (payload) => {
    emittedOvernightAlert = payload;
  });

  // Evaluate at 15:40:00 (Market Closed)
  await schedulerWithOpenTrades.evaluate(makeIstDate(2026, 10, 15, 15, 40, 0));

  assert.ok(emittedOvernightAlert, "Critical overnight exposure alert must be emitted");
  assert.equal(emittedOvernightAlert.unresolvedPositionsCount, 1);
  assert.match(emittedOvernightAlert.message, /Overnight exposure exists/);
  assert.match(emittedOvernightAlert.message, /Zero overnight risk cannot be assumed/);

  // Status must reflect overnight risk
  const status = schedulerWithOpenTrades.getStatus();
  assert.equal(status.overnightExposure.hasUnresolvedPositions, true);
  assert.equal(status.overnightExposure.unresolvedCount, 1);
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: STAGE 3 STEP 2.1.1 REMEDIATION & CONCURRENCY ACCEPTANCE TESTS
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 4] RMS Timeout, Concurrency Protection & Restart Safety Acceptance Tests");

// Helper for testing order deployment pre-trade rejection
async function testOrderDeploymentRejection() {
  const { handlePaperOrdersRoutes } = await import("../src/routes/trades/paper-orders-routes.js");
  let responseStatus = null;
  let responseBody = null;
  const mockRes = {
    writeHead: (status) => { responseStatus = status; },
    end: (data) => {
      try { responseBody = JSON.parse(data); } catch { responseBody = data; }
    },
    setHeader: () => {},
  };
  const mockReq = {
    method: "POST",
    headers: { "content-type": "application/json" },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify({
        symbol: "NIFTY26OCT25000CE",
        entryPrice: 100.0,
        stopLoss: 97.20,
        targetPrice: 106.0,
        quantity: 1,
        feedMode: "MANUAL",
        isManual: true,
        bypassDailyLoss: true,
        idempotencyKey: `test-pretrade-recon-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      }));
    },
  };
  const url = new URL("http://localhost:3003/api/paper-lab/trades");
  await handlePaperOrdersRoutes(mockReq, mockRes, url);
  return { status: responseStatus, body: responseBody };
}

let test1TradeId = null;

// Acceptance Test 1: RMS timeout while position active
await runAsyncTest("Acceptance Test 1: RMS timeout during square-off records TIMED_OUT, persists 1 exit, and blocks new entries", async () => {
  const db = getDb();
  // Ensure clean slate in ledger
  db.prepare("DELETE FROM eod_squareoff_ledger WHERE session_date = '2026-10-15'").run();

  const trade = createTrade({
    symbol: "NIFTY26OCT25100CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 100.0,
    stopLoss: 95.0,
    targetPrice: 110.0,
    status: "OPEN",
    tradeMode: "PAPER",
    accountId: 1,
  });
  test1TradeId = trade.id;

  const mockQuote = {
    ltp: 102.5,
    depth: {
      bids: [{ price: 102.0, quantity: 130 }],
      asks: [{ price: 103.0, quantity: 65 }],
    },
  };

  const timeoutScheduler = new MarketScheduler({
    calendar,
    workerId: "test_worker_timeout",
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|9001" }]]),
      quoteStore: new Map([["NSE_FO|9001", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => {
      // Simulate .NET RMS network timeout
      return { ok: false, error: "RMS request timed out after 5000ms" };
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 15, 0),
  });

  const report = await timeoutScheduler.executeMandatoryEodSquareOff("2026-10-15");

  // Verify SQLite settlement succeeded
  assert.equal(report.details[0].executed, true);
  assert.equal(report.details[0].status, "RECONCILIATION_REQUIRED");
  assert.equal(report.details[0].rmsSyncStatus, "TIMED_OUT");
  assert.equal(report.details[0].exitPrice, 102.0);

  // Verify trade status in SQLite is CLOSED
  const dbTrade = getTradeById(trade.id);
  assert.equal(dbTrade.status, "CLOSED");

  // Verify exactly ONE exit execution row exists in trade_executions
  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
  assert.equal(execRows.count, 1, "Exactly 1 exit execution row must be persisted");

  // Verify ledger record
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(trade.id);
  assert.equal(ledgerRow.status, "RECONCILIATION_REQUIRED");
  assert.equal(ledgerRow.rms_sync_status, "TIMED_OUT");

  // Verify pre-trade gate: new orders are BLOCKED with HTTP 409
  const orderRes = await testOrderDeploymentRejection();
  assert.equal(orderRes.status, 409, "New entries must be blocked with HTTP 409 while RMS reconciliation is pending");
  assert.equal(orderRes.body.title, "RMS Reconciliation Pending");
});

// Acceptance Test 2: RMS close succeeds during reconciliation -> Resolves to RECONCILED without duplicate close
await runAsyncTest("Acceptance Test 2: Subsequent reconciliation resolves TIMED_OUT to RECONCILED without duplicate execution row", async () => {
  const db = getDb();
  assert.ok(test1TradeId, "Test 1 trade ID must be defined");

  const reconScheduler = new MarketScheduler({
    calendar,
    workerId: "test_worker_recon",
    dotnetSquareOffFn: async () => {
      // RMS now responds ok
      return { ok: true, data: { success: true, positionClosed: true } };
    },
  });

  const reconRes = await reconScheduler.reconcilePendingSquareOff(test1TradeId, "2026-10-15");
  assert.equal(reconRes.reconciled, true);
  assert.equal(reconRes.status, "EXECUTED");
  assert.equal(reconRes.rmsSyncStatus, "RECONCILED");

  // Verify ledger row updated
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(test1TradeId);
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.rms_sync_status, "RECONCILED");

  // Verify trade_executions still has exactly ONE exit execution row (zero duplicates)
  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(test1TradeId);
  assert.equal(execRows.count, 1, "No duplicate exit execution row created during reconciliation");

  // Clean up ledger row so next tests start cleanly
  db.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(test1TradeId);
});

// Acceptance Test 3: Crash after SQLite settlement before RMS sync completes
await runAsyncTest("Acceptance Test 3: Crash after SQLite settlement reconciles closed state and syncs RMS with 0 duplicate exit rows", async () => {
  const db = getDb();
  const trade = createTrade({
    symbol: "NIFTY26OCT25150CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 95.0,
    exitPrice: 98.0,
    exitDatetime: new Date().toISOString(),
    stopLoss: 90.0,
    targetPrice: 105.0,
    status: "CLOSED",
    tradeMode: "PAPER",
    accountId: 1,
  });

  // Simulate crash state: SQLite settled and closed, but ledger left in PENDING/NOT_STARTED
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, worker_id, status, rms_sync_status, reason)
    VALUES ('2026-10-15', ?, 'EOD_SQOFF_2026-10-15_${trade.id}', 'crashed_worker', 'PENDING', 'NOT_STARTED', 'CRASH_BEFORE_RMS_SYNC')
    ON CONFLICT(session_date, trade_id) DO UPDATE SET status = 'PENDING', rms_sync_status = 'NOT_STARTED'
  `).run(trade.id);

  let rmsCalled = false;
  const crashRecoveryScheduler = new MarketScheduler({
    calendar,
    workerId: "test_worker_recovery",
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|9002" }]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => {
      rmsCalled = true;
      return { ok: true, data: { success: true } };
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 16, 0),
  });

  const report = await crashRecoveryScheduler.executeMandatoryEodSquareOff("2026-10-15");

  assert.equal(rmsCalled, true, "RMS square-off must be called during authoritative recovery");
  assert.equal(report.details[0].alreadyExecuted, true);
  assert.equal(report.details[0].rmsSyncStatus, "SYNCED");

  // Ledger must reflect EXECUTED and SYNCED
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(trade.id);
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.rms_sync_status, "SYNCED");

  // Exactly 1 exit execution row in trade_executions
  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
  assert.equal(execRows.count, 1, "Zero duplicate exit rows created on crash recovery");

  db.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(trade.id);
});

// Acceptance Test 4: Crash after RMS close before ledger final state
await runAsyncTest("Acceptance Test 4: Crash after RMS close before ledger update reconciles to EXECUTED with 0 duplicate executions", async () => {
  const db = getDb();
  const trade = createTrade({
    symbol: "NIFTY26OCT25250CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 85.0,
    exitPrice: 87.5,
    exitDatetime: new Date().toISOString(),
    stopLoss: 80.0,
    targetPrice: 95.0,
    status: "CLOSED",
    tradeMode: "PAPER",
    accountId: 1,
  });

  // Simulate crash: SQLite closed, RMS closed, but ledger row left as CLAIMED with expired lease
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, worker_id, status, rms_sync_status, claim_expires_at, reason)
    VALUES ('2026-10-15', ?, 'EOD_SQOFF_2026-10-15_${trade.id}', 'crashed_worker_2', 'CLAIMED', 'NOT_STARTED', datetime('now', '-10 seconds'), 'CRASH_AFTER_RMS_CLOSE')
    ON CONFLICT(session_date, trade_id) DO UPDATE SET status = 'CLAIMED', rms_sync_status = 'NOT_STARTED', claim_expires_at = datetime('now', '-10 seconds')
  `).run(trade.id);

  const recoveryScheduler2 = new MarketScheduler({
    calendar,
    workerId: "test_worker_recovery_2",
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|9003" }]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => {
      // RMS is already closed, returns success/already closed
      return { ok: true, data: { success: true, alreadyClosed: true } };
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 18, 0),
  });

  const report = await recoveryScheduler2.executeMandatoryEodSquareOff("2026-10-15");
  assert.equal(report.details[0].alreadyExecuted, true);

  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = '2026-10-15' AND trade_id = ?").get(trade.id);
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.rms_sync_status, "SYNCED");

  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
  assert.equal(execRows.count, 1, "Zero duplicate exit rows");

  db.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(trade.id);
});

// Acceptance Test 5: Two concurrent scheduler workers attempting same close
await runAsyncTest("Acceptance Test 5: Concurrency protection via atomic durable claim ensures exactly 1 execution and CLAIM_CONFLICT", async () => {
  const db = getDb();
  const trade = createTrade({
    symbol: "NIFTY26OCT25350CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 70.0,
    stopLoss: 65.0,
    targetPrice: 80.0,
    status: "OPEN",
    tradeMode: "PAPER",
    accountId: 1,
  });

  const mockQuote = {
    ltp: 72.0,
    depth: {
      bids: [{ price: 71.5, quantity: 195 }],
      asks: [{ price: 72.5, quantity: 65 }],
    },
  };

  const item = { trade, tokenKey: "NSE_FO|9004" };

  const worker1 = new MarketScheduler({
    calendar,
    workerId: "worker_alpha",
    engine: {
      activeTrades: new Map([[trade.id, item]]),
      quoteStore: new Map([["NSE_FO|9004", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => {
      // Small async delay so Worker 1 is actively in-flight holding the CLAIMED lock
      await new Promise((r) => setTimeout(r, 40));
      return { ok: true, data: { success: true } };
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 15, 0),
  });

  const worker2 = new MarketScheduler({
    calendar,
    workerId: "worker_beta",
    engine: {
      activeTrades: new Map([[trade.id, item]]),
      quoteStore: new Map([["NSE_FO|9004", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 15, 0),
  });

  // Both workers attempt square-off concurrently
  const [res1, res2] = await Promise.all([
    worker1._processSinglePositionSquareOff(item, "2026-10-15", db),
    worker2._processSinglePositionSquareOff(item, "2026-10-15", db),
  ]);

  // Exactly one must succeed with execution, the other must skip with CLAIM_CONFLICT
  assert.equal(res1.executed, true, "Worker 1 must acquire claim and execute square-off");
  assert.equal(res1.status, "EXECUTED");
  assert.equal(res1.rmsSyncStatus, "SYNCED");

  assert.equal(res2.executed, false, "Worker 2 must not execute");
  assert.equal(res2.skipped, true, "Worker 2 must skip execution due to active claim conflict");
  assert.match(res2.reason, /CLAIM_CONFLICT/, "Worker 2 reason must indicate atomic claim conflict");

  // Verify only 1 exit execution row in database
  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
  assert.equal(execRows.count, 1, "Exactly 1 exit execution row in database despite concurrent workers");

  db.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(trade.id);
});

// Acceptance Test 6: Process restart with pending/unresolved square-off
await runAsyncTest("Acceptance Test 6: Process restart with unresolved square-off maintains RECONCILIATION_REQUIRED and blocks entries", async () => {
  const db = getDb();
  const trade = createTrade({
    symbol: "NIFTY26OCT25400CE",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 60.0,
    stopLoss: 55.0,
    targetPrice: 70.0,
    status: "OPEN",
    tradeMode: "PAPER",
    accountId: 1,
  });

  // Simulate unresolved EOD square-off (e.g. no bid depth at 15:15)
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, status, rms_sync_status, failure_reason, case_code
    ) VALUES (
      '2026-10-15', ?, 'EOD_SQOFF_2026-10-15_${trade.id}', 'prior_worker', 'RECONCILIATION_REQUIRED', 'TIMED_OUT', 'RMS_TIMEOUT', 6
    )
    ON CONFLICT(session_date, trade_id) DO UPDATE SET status = 'RECONCILIATION_REQUIRED', rms_sync_status = 'TIMED_OUT'
  `).run(trade.id);

  // Fresh scheduler instance after restart
  const restartedScheduler = new MarketScheduler({
    calendar,
    workerId: "restarted_worker_fresh",
    engine: {
      activeTrades: new Map([[trade.id, { trade, tokenKey: "NSE_FO|9005", monitoringState: "RECONCILIATION_REQUIRED" }]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    timeProvider: () => makeIstDate(2026, 10, 15, 15, 30, 0),
  });

  // Evaluate at market close
  await restartedScheduler.evaluate(makeIstDate(2026, 10, 15, 15, 30, 0));

  // Verify status maintains unresolved overnight risk
  const status = restartedScheduler.getStatus();
  assert.equal(status.overnightExposure.hasUnresolvedPositions, true);
  assert.equal(status.overnightExposure.unresolvedCount, 1);

  // Verify new entries remain blocked with HTTP 409
  const orderRes = await testOrderDeploymentRejection();
  assert.equal(orderRes.status, 409, "New entries must remain blocked after process restart until reconciled");
  assert.equal(orderRes.body.title, "RMS Reconciliation Pending");

  // Clean up ledger row
  db.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(trade.id);
});

// Clean up all created test trades in SQLite database
const cleanupDb = getDb();
for (const id of createdTradeIds) {
  try {
    cleanupDb.prepare("DELETE FROM trades WHERE id = ?").run(id);
    cleanupDb.prepare("DELETE FROM eod_squareoff_ledger WHERE trade_id = ?").run(id);
  } catch {}
}
cleanupDb.prepare("UPDATE trades SET status = 'CLOSED', exit_datetime = datetime('now') WHERE status = 'OPEN' AND trade_mode = 'PAPER'").run();

console.log("\n========================================================================");
console.log(`   TOTAL TESTS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log("========================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

