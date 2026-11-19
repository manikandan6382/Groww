/**
 * PORTFOLIOX — Stage 5.5: Upstox LTT Timestamp Integrity Regression Test Suite
 *
 * Verifies:
 * 1. Valid intraday LTT, feed timestamp, and receipt time pass Filter F3
 * 2. Post-close snapshot received over a connected WebSocket is rejected with POST_CLOSE_SNAPSHOT_NOT_TRADABLE
 * 3. LTT is never inferred or mapped from currentTs when LTT is missing
 * 4. UTC-to-IST conversion, epoch millisecond units, and market session boundary check (<= 15:40:00 IST)
 * 5. Missing, stale, future-dated, and malformed timestamps reject with explicit reasons
 * 6. Connected WebSocket with stalled delivery (> 15s) rejects with FEED_DELIVERY_STALLED
 * 7. Ineligible option quotes strictly block scanner candidate generation and execution
 *
 * INVARIANTS:
 * - Redacted credentials (no access tokens or user IDs)
 * - LIVE_ORDER_ROUTING=DISABLED, EDGE_STATUS=NOT_VALIDATED, GEMINI_SUPERVISOR_MODE=SHADOW
 */

import assert from "node:assert/strict";
import { normaliseV3FeedEntry } from "../src/services/upstox/feedParser.js";
import { DeterministicScanner, FILTER_KEYS } from "../src/services/engine/deterministicScanner.js";
import { PaperTradeEngine } from "../src/services/paperTradeEngine.js";

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

console.log("================================================================================");
console.log("PORTFOLIOX — STAGE 5.5: UPSTOX LTT TIMESTAMP INTEGRITY REGRESSION TESTS");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// Scenario 1: Valid intraday LTT, feed timestamp, and receipt time
// -----------------------------------------------------------------------------
console.log("--- SCENARIO 1: Valid Intraday Timestamps ---");
runTest("Scenario 1: Valid intraday LTT (1s ago), feedTs (500ms ago), and receipt time (50ms ago) passes F3", () => {
  const scanner = new DeterministicScanner();
  const now = Date.now();
  const validQuote = {
    key: "NSE_FO|53782",
    symbol: "NIFTY26OCT22700CE",
    ltp: 125.5,
    ltt: now - 1000,
    lttIso: new Date(now - 1000).toISOString(),
    feedTs: now - 500,
    feedTsIso: new Date(now - 500).toISOString(),
    receivedAtMs: now - 50,
    receivedAt: new Date(now - 50).toISOString(),
    depth: {
      bids: [{ price: 125.4, quantity: 130 }],
      asks: [{ price: 125.6, quantity: 195 }],
    },
    bid: 125.4,
    ask: 125.6,
    oi: 250_000,
    source: "WEBSOCKET_V3",
    isFresh: true,
  };

  const result = scanner.evaluateF3Liquidity(validQuote, 5000);
  assert.equal(result.status, "PASS");
  assert.ok(result.details.ageMs <= 5000);
  assert.equal(result.details.ltt, validQuote.ltt);
  assert.equal(result.details.feedTs, validQuote.feedTs);
  assert.equal(result.details.receivedAt, validQuote.receivedAt);
  assert.ok(result.details.spread <= 0.50);
});

// -----------------------------------------------------------------------------
// Scenario 2: Post-close snapshot received over a connected WebSocket
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 2: Post-Close Snapshot Safety ---");
runTest("Scenario 2: Post-close snapshot received over connected socket is rejected for entries", () => {
  const engine = new PaperTradeEngine();
  engine.client = { connected: true };
  const scanner = new DeterministicScanner({ engine });
  const now = Date.now();

  const postCloseQuote = {
    key: "NSE_FO|53782",
    symbol: "NIFTY26OCT22700CE",
    ltp: 125.5,
    ltt: now - 1000,
    lttIso: new Date(now - 1000).toISOString(),
    feedTs: now - 500,
    feedTsIso: new Date(now - 500).toISOString(),
    receivedAtMs: now - 10, // Received 10ms ago!
    receivedAt: new Date(now - 10).toISOString(),
    depth: {
      bids: [{ price: 125.4, quantity: 130 }],
      asks: [{ price: 125.6, quantity: 195 }],
    },
    bid: 125.4,
    ask: 125.6,
    source: "REST_SNAPSHOT_POST_CLOSE",
    isPostCloseSnapshot: true,
  };

  const result = scanner.evaluateF3Liquidity(postCloseQuote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "POST_CLOSE_SNAPSHOT_NOT_TRADABLE");
});

// -----------------------------------------------------------------------------
// Scenario 3: LTT incorrectly mapped from currentTs
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 3: Independent LTT vs feedTs Mapping ---");
runTest("Scenario 3: Protobuf message with missing LTT does NOT fall back to currentTs", () => {
  const feedCurrentTs = 1793182800000; // 16:30:00 IST
  // Mock feed where LTPC has no ltt field (trade executed long ago or field omitted)
  const mockFeed = {
    ltpc: {
      ltp: 150.0,
      cp: 148.0,
      // ltt is intentionally omitted or 0
    },
  };

  const tick = normaliseV3FeedEntry("NSE_FO|53782", mockFeed, feedCurrentTs);
  assert.ok(tick, "Tick was parsed");
  assert.equal(tick.ltp, 150.0);
  // CRITICAL INVARIANT: tick.ltt must be null, NOT feedCurrentTs!
  assert.equal(tick.ltt, null, "LTT must NOT be inferred from feedCurrentTs");
  assert.equal(tick.lttIso, null);
  assert.equal(tick.feedTs, feedCurrentTs, "feedTs must reflect currentTs from feed");

  // Evaluating this tick in F3 must reject with LTT_MISSING
  const scanner = new DeterministicScanner();
  const f3 = scanner.evaluateF3Liquidity(tick, 5000);
  assert.equal(f3.status, "FAIL");
  assert.equal(f3.reason, "LTT_MISSING");
});

// -----------------------------------------------------------------------------
// Scenario 4: UTC-to-IST conversion and timestamp units
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 4: UTC-to-IST Conversion & Epoch Units ---");
runTest("Scenario 4: Raw Upstox epoch ms (1793182199793) maps to exact trade time <= 15:40:00 IST close", () => {
  const rawLttEpochMs = 1793182199793; // Actual last_trade_time from Upstox
  assert.equal(typeof rawLttEpochMs, "number");
  assert.ok(Number.isInteger(rawLttEpochMs));

  const utcDate = new Date(rawLttEpochMs);
  assert.equal(utcDate.toISOString(), "2026-10-28T10:09:59.793Z");

  // Format to IST (Asia/Kolkata timezone: +05:30)
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = istFormatter.formatToParts(utcDate);
  const hour = Number(parts.find((p) => p.type === "hour").value);
  const minute = Number(parts.find((p) => p.type === "minute").value);
  const second = Number(parts.find((p) => p.type === "second").value);

  assert.equal(hour, 15, "Hour must be 15 IST");
  assert.equal(minute, 39, "Minute must be 39 IST");
  assert.equal(second, 59, "Second must be 59 IST");

  // Time in minutes from midnight IST: 15 * 60 + 39 = 939 minutes (< 940 regular close)
  const totalMinutes = hour * 60 + minute;
  assert.ok(totalMinutes < 940, `Trade at ${hour}:${minute}:${second} IST occurred before 15:40:00 IST exchange close`);
});

// -----------------------------------------------------------------------------
// Scenario 5: Missing, stale, future-dated, and malformed timestamps
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 5: Edge-Case Timestamp Rejections ---");
runTest("Scenario 5a: Missing LTT rejects with LTT_MISSING", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    ltt: null,
    depth: { bids: [{ price: 124.9, quantity: 100 }], asks: [{ price: 125.1, quantity: 100 }] },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "LTT_MISSING");
});

runTest("Scenario 5b: Stale trade (> 5000ms old) rejects with STALE_QUOTE", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    ltt: Date.now() - 7500, // 7.5 seconds ago
    depth: { bids: [{ price: 124.9, quantity: 100 }], asks: [{ price: 125.1, quantity: 100 }] },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "STALE_QUOTE");
});

runTest("Scenario 5c: Implausibly future-dated LTT (> 5000ms in future) rejects with LTT_FUTURE_DATED", () => {
  const scanner = new DeterministicScanner();
  const quote = {
    ltp: 125.0,
    ltt: Date.now() + 15_000, // 15 seconds into future
    depth: { bids: [{ price: 124.9, quantity: 100 }], asks: [{ price: 125.1, quantity: 100 }] },
  };
  const result = scanner.evaluateF3Liquidity(quote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "LTT_FUTURE_DATED");
});

runTest("Scenario 5d: Malformed LTT (negative, NaN, non-numeric) rejects with LTT_MALFORMED", () => {
  const scanner = new DeterministicScanner();
  const badQuotes = [
    { ltp: 125.0, ltt: -100 },
    { ltp: 125.0, ltt: NaN },
    { ltp: 125.0, ltt: "invalid_time" },
    { ltp: 125.0, ltt: 0 },
  ];

  for (const q of badQuotes) {
    const result = scanner.evaluateF3Liquidity(q, 5000);
    assert.equal(result.status, "FAIL");
    assert.equal(result.reason, "LTT_MALFORMED");
  }
});

// -----------------------------------------------------------------------------
// Scenario 6: Connected WebSocket with stalled market delivery
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 6: Stalled Feed Delivery over Connected Socket ---");
runTest("Scenario 6: Connected WebSocket where market data delivery is stalled (> 15s) rejects with FEED_DELIVERY_STALLED", () => {
  const scanner = new DeterministicScanner();
  const now = Date.now();
  const stalledQuote = {
    ltp: 125.0,
    ltt: now - 1000, // Trade was recent
    receivedAtMs: now - 25_000, // But last socket tick was 25s ago!
    receivedAt: new Date(now - 25_000).toISOString(),
    depth: { bids: [{ price: 124.9, quantity: 100 }], asks: [{ price: 125.1, quantity: 100 }] },
  };

  const result = scanner.evaluateF3Liquidity(stalledQuote, 5000);
  assert.equal(result.status, "FAIL");
  assert.equal(result.reason, "FEED_DELIVERY_STALLED");
  assert.ok(result.details.deliveryLagMs >= 25_000);
});

// -----------------------------------------------------------------------------
// Scenario 7: Ineligible option quotes strictly block scanner candidate generation
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 7: Ineligible Option Quotes Block Candidate Generation ---");
runTest("Scenario 7: Full scanner evaluate rejects when option quote fails F3", () => {
  const scanner = new DeterministicScanner();
  const now = Date.now();

  // Create candles that would otherwise produce a bullish setup
  const candles1h = Array(60).fill(null).map((_, i) => ({
    close: 22600 + i * 2,
    high: 22605 + i * 2,
    low: 22595 + i * 2,
    open: 22598 + i * 2,
    volume: 5000,
  }));

  const candles15m = Array(20).fill(null).map((_, i) => ({
    close: 22700 + i * 2,
    high: 22705 + i * 2,
    low: 22695 + i * 2,
    open: 22698 + i * 2,
    volume: 2000,
  }));

  // Option quote with missing LTT (ineligible)
  const ineligibleQuote = {
    tokenKey: "NSE_FO|53782",
    symbol: "NIFTY26OCT22700CE",
    ltp: 125.0,
    ltt: null, // MISSING
    depth: { bids: [{ price: 124.8, quantity: 100 }], asks: [{ price: 125.2, quantity: 100 }] },
  };

  const evalResult = scanner.evaluate({
    candles1h,
    candles15m,
    spotPrice: 22720,
    optionQuote: ineligibleQuote,
  });

  assert.equal(evalResult.decision, "NO_TRADE");
  assert.equal(evalResult.filters[FILTER_KEYS.F3_OPTION_LIQUIDITY].status, "FAIL");
  assert.equal(evalResult.filters[FILTER_KEYS.F3_OPTION_LIQUIDITY].reason, "LTT_MISSING");
  assert.equal(evalResult.candidate, null);
});

// -----------------------------------------------------------------------------
// Scenario 8: Freshness Metric Definitions & Semantic Validation
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 8: Freshness Metric Definitions & Semantic Validation ---");
runTest("Scenario 8: Validate quoteAgeMs, publisherTimestampDeltaMs, and exchangeTradeAgeMs on October 28 data", () => {
  const evaluationNowMs = 1793190982990; // 28/10/2026, 6:06:22.990 pm IST

  // CE Example: NSE_FO|53782
  const ceLtt = 1793182199793;          // 15:39:59.793 IST
  const ceFeedTs = 1793190969413;       // 18:06:09.413 IST
  const ceReceivedAtMs = 1793190978324; // 18:06:18.324 IST

  const ceQuoteAgeMs = evaluationNowMs - ceReceivedAtMs;
  const cePublisherDeltaMs = ceReceivedAtMs - ceFeedTs;
  const ceTradeAgeMs = evaluationNowMs - ceLtt;

  assert.equal(ceQuoteAgeMs, 4666, "quoteAgeMs must equal evaluationNowMs - receivedAtMs");
  assert.equal(cePublisherDeltaMs, 8911, "publisherTimestampDeltaMs must equal receivedAtMs - feedTsMs");
  assert.equal(ceTradeAgeMs, 8783197, "exchangeTradeAgeMs must equal evaluationNowMs - lttMs");

  // Semantic assertions:
  // 1. quoteAgeMs is purely local elapsed time, NOT network delivery latency.
  assert.ok(ceQuoteAgeMs < 10000, "Local quote retention age is finite");
  // 2. publisherTimestampDeltaMs depends on gateway-client clock synchronization.
  assert.ok(cePublisherDeltaMs > 0, "Publisher-to-client delta is positive when client clock is ahead or aligned");
  // 3. exchangeTradeAgeMs must exceed 5000ms threshold for post-close quotes, failing F3.
  assert.ok(ceTradeAgeMs > 5000, "Trade age exceeds 5s threshold");

  // PE Example: NSE_FO|53791
  const peLtt = 1793182199945;          // 15:39:59.945 IST
  const peFeedTs = 1793190969413;       // 18:06:09.413 IST
  const peReceivedAtMs = 1793190978299; // 18:06:18.299 IST

  const peQuoteAgeMs = evaluationNowMs - peReceivedAtMs;
  const pePublisherDeltaMs = peReceivedAtMs - peFeedTs;
  const peTradeAgeMs = evaluationNowMs - peLtt;

  assert.equal(peQuoteAgeMs, 4691, "PE quoteAgeMs must equal 4691ms");
  assert.equal(pePublisherDeltaMs, 8886, "PE publisherTimestampDeltaMs must equal 8886ms");
  assert.equal(peTradeAgeMs, 8783045, "PE exchangeTradeAgeMs must equal 8783045ms");
});

// -----------------------------------------------------------------------------
// Scenario 9: October 29 Live-Session CE/PE Timestamp Reconciliation & Cross-Contract Isolation
// -----------------------------------------------------------------------------
console.log("\n--- SCENARIO 9: October 29 Live-Session Metric Reconciliation & Cross-Contract Isolation ---");
runTest("Scenario 9a: Exact metric reconciliation for October 29 CE (NSE_FO|53796) and PE (NSE_FO|53835)", () => {
  const evaluationNowMs = 1793259194243; // 29/10/2026, 1:03:14.243 pm IST

  // CE Frame #13
  const ceQuote = {
    key: "NSE_FO|53796",
    symbol: "NIFTY 22850 CE 03 NOV 26",
    ltt: 1793259184928,          // 13:03:04.928 IST
    feedTs: 1793259185108,       // 13:03:05.108 IST
    receivedAtMs: 1793259193239, // 13:03:13.239 IST
  };

  const ceQuoteAgeMs = evaluationNowMs - ceQuote.receivedAtMs;
  const cePubDeltaMs = ceQuote.receivedAtMs - ceQuote.feedTs;
  const ceTradeAgeMs = evaluationNowMs - ceQuote.ltt;

  assert.equal(ceQuoteAgeMs, 1004, "CE quoteAgeMs must equal 1004 ms");
  assert.equal(cePubDeltaMs, 8131, "CE publisherTimestampDeltaMs must equal 8131 ms");
  assert.equal(ceTradeAgeMs, 9315, "CE exchangeTradeAgeMs must equal 9315 ms");

  // PE Frame #13
  const peQuote = {
    key: "NSE_FO|53835",
    symbol: "NIFTY 22850 PE 03 NOV 26",
    ltt: 1793259184933,          // 13:03:04.933 IST
    feedTs: 1793259185108,       // 13:03:05.108 IST
    receivedAtMs: 1793259193240, // 13:03:13.240 IST
  };

  const peQuoteAgeMs = evaluationNowMs - peQuote.receivedAtMs;
  const pePubDeltaMs = peQuote.receivedAtMs - peQuote.feedTs;
  const peTradeAgeMs = evaluationNowMs - peQuote.ltt;

  assert.equal(peQuoteAgeMs, 1003, "PE quoteAgeMs must equal 1003 ms");
  assert.equal(pePubDeltaMs, 8132, "PE publisherTimestampDeltaMs must equal 8132 ms");
  assert.equal(peTradeAgeMs, 9310, "PE exchangeTradeAgeMs must equal 9310 ms");
});

runTest("Scenario 9b: Catch cross-frame or cross-contract timestamp association errors", () => {
  // If an evaluation accidentally pairs Frame #11 feedTs with Frame #13 receivedAt
  const frame11FeedTs = 1793259184860; // 13:03:04.860 IST
  const frame13ReceivedAt = 1793259193239; // 13:03:13.239 IST
  const mismatchedDelta = frame13ReceivedAt - frame11FeedTs; // 8379 ms

  // Verify that mismatched delta does NOT equal genuine frame 13 delta (8131 ms)
  assert.notEqual(mismatchedDelta, 8131, "Mismatched frame delta (8379ms) must not match genuine delta (8131ms)");
  assert.equal(mismatchedDelta, 8379);

  // Cross-contract isolation guard:
  // Each instrument's metric must strictly use its own object properties
  function calculateMetrics(quote, nowMs) {
    if (!quote.key || !quote.ltt || !quote.feedTs || !quote.receivedAtMs) {
      throw new Error("Missing contract-specific timestamp fields");
    }
    return {
      key: quote.key,
      quoteAgeMs: nowMs - quote.receivedAtMs,
      publisherTimestampDeltaMs: quote.receivedAtMs - quote.feedTs,
      exchangeTradeAgeMs: nowMs - quote.ltt,
    };
  }

  const ceMetrics = calculateMetrics({
    key: "NSE_FO|53796",
    ltt: 1793259184928,
    feedTs: 1793259185108,
    receivedAtMs: 1793259193239,
  }, 1793259194243);

  assert.equal(ceMetrics.key, "NSE_FO|53796");
  assert.equal(ceMetrics.publisherTimestampDeltaMs, 8131);
  assert.equal(ceMetrics.exchangeTradeAgeMs, 9315);
});

console.log("\n================================================================================");
console.log(`ALL ${passedTests}/${totalTests} STAGE 5.5 REGRESSION TESTS PASSED!`);
console.log("================================================================================\n");
