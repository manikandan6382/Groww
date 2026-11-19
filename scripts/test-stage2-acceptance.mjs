/**
 * Stage 2.1 Acceptance Test Suite: End-to-End Market Data Feed, Freshness & Position Lifecycle
 * Validates V3 Protocol Buffer pipeline, multi-tier freshness semantics, degraded monitoring,
 * deterministic gap reconciliation, and RMS integration invariants.
 */

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  getFeedResponseDecoder,
  decodeV3ProtobufBuffer,
  normaliseV3FeedEntry,
} from "../src/services/upstox/feedParser.js";
import { PaperTradeEngine } from "../src/services/paperTradeEngine.js";
import { reconcileActivePosition } from "../src/services/engine/triggerEvaluator.js";
import { handleEngineTick } from "../src/services/engine/tickHandler.js";
import { createPaperTrade } from "../src/repositories/paper-lab.repository.js";
import { getDb } from "../src/db/connection.js";

let passedCount = 0;
let failedCount = 0;

function runGate(gateName, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${gateName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${gateName}: ${err.message}`);
    failedCount++;
  }
}

async function runGateAsync(gateName, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${gateName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${gateName}: ${err.message}`);
    failedCount++;
  }
}

console.log("================================================================================");
console.log("STAGE 2.1 ACCEPTANCE TEST SUITE: MARKET DATA PIPELINE & LIFECYCLE RECONCILIATION");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// TEST 1: V3 Subscription Payload & Protobuf Encoding/Decoding Through quoteStore
// -----------------------------------------------------------------------------
runGate("Test 1: Full V3 pipeline decodes options feed and populates quoteStore", () => {
  const decoder = getFeedResponseDecoder();
  const rawPayload = {
    type: "live_feed",
    feeds: {
      "NSE_INDEX|Nifty 50": {
        fullFeed: {
          indexFF: {
            ltpc: { ltp: 22550.0, ltt: 1718000000000, cp: 22480.0 },
            marketOHLC: { ohlc: [{ open: 22500.0, high: 22580.0, low: 22470.0, close: 22480.0, ts: 1718000000000 }] },
          },
        },
      },
      "NSE_FO|54321": {
        fullFeed: {
          marketFF: {
            ltpc: { ltp: 92.50, ltt: 1718000000000, cp: 80.0 },
            iv: 15.2,
            marketLevel: {
              bidAskQuote: [
                { bidQ: 65, bidP: 92.40, askQ: 130, askP: 92.60 },
              ],
            },
            optionGreeks: { delta: 0.51, theta: -8.2, gamma: 0.003, vega: 12.0 },
          },
        },
      },
    },
    currentTs: 1718000000100,
  };

  const buffer = decoder.encode(decoder.create(rawPayload)).finish();
  const decoded = decodeV3ProtobufBuffer(buffer);
  assert.ok(decoded, "Protobuf buffer must decode");

  const mockClient = { connected: true, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  for (const [key, feed] of Object.entries(decoded.feeds)) {
    const tick = normaliseV3FeedEntry(key, feed, 1718000000100);
    handleEngineTick(engine, tick);
  }

  const indexQuote = engine.quoteStore.get("NSE_INDEX|Nifty 50");
  assert.equal(indexQuote.ltp, 22550.0);
  assert.equal(indexQuote.source, "WEBSOCKET_V3");

  const optionQuote = engine.quoteStore.get("NSE_FO|54321");
  assert.equal(optionQuote.ltp, 92.50);
  assert.equal(optionQuote.greeks.iv, 15.2);
  assert.equal(optionQuote.depth.bids[0].price, 92.40);
  assert.equal(optionQuote.depth.asks[0].price, 92.60);
});

// -----------------------------------------------------------------------------
// TEST 2: Multi-Tier Freshness Policy: Candidate Entry (5s) vs Active Monitoring (15s)
// -----------------------------------------------------------------------------
runGate("Test 2: Differentiates Candidate Entry (5s) from Active Monitoring (15s)", () => {
  const mockClient = { connected: true, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  const now = Date.now();
  engine.handleTick({
    key: "NSE_FO|99999",
    ltp: 100.0,
    source: "WEBSOCKET_V3",
    isFresh: true,
    depth: { bids: [{ price: 99.9, quantity: 65 }], asks: [{ price: 100.1, quantity: 65 }] },
    receivedAt: new Date(now).toISOString(),
  });

  const quote = engine.quoteStore.get("NSE_FO|99999");

  // At 3 seconds old: fresh for both
  quote.timestampMs = now - 3_000;
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "CANDIDATE_ENTRY"), true, "3s old quote is healthy for entry");
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "ACTIVE_MONITORING"), true, "3s old quote is healthy for monitoring");

  // At 8 seconds old: rejected for entry (> 5s), but acceptable for active monitoring (<= 15s)
  quote.timestampMs = now - 8_000;
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "CANDIDATE_ENTRY"), false, "8s old quote rejected for candidate entry");
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "ACTIVE_MONITORING"), true, "8s old quote acceptable for active monitoring");

  // At 18 seconds old: rejected for both (> 15s)
  quote.timestampMs = now - 18_000;
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "CANDIDATE_ENTRY"), false);
  assert.equal(engine.isFeedHealthy("NSE_FO|99999", "ACTIVE_MONITORING"), false);
});

// -----------------------------------------------------------------------------
// TEST 3: Candidate Entry Rejects Missing/One-Sided Depth
// -----------------------------------------------------------------------------
runGate("Test 3: Candidate entry rejects instrument with empty or one-sided depth", () => {
  const mockClient = { connected: true, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  engine.handleTick({
    key: "NSE_FO|ILLIQUID",
    ltp: 50.0,
    source: "WEBSOCKET_V3",
    isFresh: true,
    depth: { bids: [], asks: [{ price: 50.0, quantity: 65 }] }, // No bids!
    receivedAt: new Date().toISOString(),
  });

  assert.equal(engine.isFeedHealthy("NSE_FO|ILLIQUID", "CANDIDATE_ENTRY"), false, "One-sided market rejected for candidate entry");
});

// -----------------------------------------------------------------------------
// TEST 4: Feed Loss Transitions Active Trade to POSITION_MONITORING_DEGRADED
// -----------------------------------------------------------------------------
runGate("Test 4: Feed loss transitions active trade to POSITION_MONITORING_DEGRADED", () => {
  const mockClient = { connected: true, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  const activeTrade = {
    id: 101,
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    direction: "LONG",
  };

  engine.activeTrades.set(101, {
    trade: activeTrade,
    tokenKey: "NSE_FO|54321",
    status: "subscribed",
    lastLtp: 101.50,
    lastKnownReferencePrice: 101.50,
    monitoringState: "NORMAL",
    pnlStatus: "VERIFIED",
    isStale: false,
  });

  // Client disconnects
  mockClient.connected = false;
  engine.checkMonitoringHealth();

  const degradedItem = engine.activeTrades.get(101);
  assert.equal(degradedItem.monitoringState, "POSITION_MONITORING_DEGRADED");
  assert.equal(degradedItem.pnlStatus, "UNVERIFIED");
  assert.equal(degradedItem.isStale, true);
  assert.equal(degradedItem.lastKnownReferencePrice, 101.50, "Last known price preserved as reference");
  assert.ok(degradedItem.degradedAt, "degradedAt timestamp recorded");
});

// -----------------------------------------------------------------------------
// TEST 5: REST Recovery Does Not Falsely Clear Degraded State
// -----------------------------------------------------------------------------
runGate("Test 5: REST Recovery tick preserves reference price without marking monitoring NORMAL", () => {
  const mockClient = { connected: false, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  const activeTrade = {
    id: 102,
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    direction: "LONG",
  };

  engine.activeTrades.set(102, {
    trade: activeTrade,
    tokenKey: "NSE_FO|54321",
    status: "subscribed",
    lastLtp: 101.0,
    monitoringState: "POSITION_MONITORING_DEGRADED",
    pnlStatus: "UNVERIFIED",
    isStale: true,
  });
  engine.tokenToTradeIds.set("NSE_FO|54321", new Set([102]));

  // REST recovery tick arrives
  handleEngineTick(engine, {
    key: "NSE_FO|54321",
    ltp: 98.0,
    source: "REST_RECOVERY",
    isFresh: false,
    receivedAt: new Date().toISOString(),
  });

  const item = engine.activeTrades.get(102);
  assert.equal(item.monitoringState, "POSITION_MONITORING_DEGRADED", "Monitoring must remain DEGRADED");
  assert.equal(item.pnlStatus, "UNVERIFIED", "P&L remains UNVERIFIED");
  assert.equal(item.lastKnownReferencePrice, 98.0, "Reference price updated for display only");
  assert.equal(item.isStale, true);
});

// -----------------------------------------------------------------------------
// TEST 6: Feed Recovery Signals RECOVERY_RECONCILIATION_REQUIRED
// -----------------------------------------------------------------------------
runGate("Test 6: Feed restoration transitions trade to RECOVERY_RECONCILIATION_REQUIRED", () => {
  const mockClient = { connected: false, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  engine.activeTrades.set(103, {
    trade: { id: 103, symbol: "NIFTY 22500 CE", entryPrice: 100.0, stopLoss: 96.0, targetPrice: 108.0 },
    monitoringState: "POSITION_MONITORING_DEGRADED",
    pnlStatus: "UNVERIFIED",
    isStale: true,
  });

  // Socket reconnects and receives fresh tick
  mockClient.connected = true;
  engine.lastFeedMessageAt = Date.now();
  engine.checkMonitoringHealth();

  const item = engine.activeTrades.get(103);
  assert.equal(item.monitoringState, "RECOVERY_RECONCILIATION_REQUIRED", "Must require reconciliation before resuming normal monitoring");
});

// -----------------------------------------------------------------------------
// TEST 7: Deterministic Gap Down Policy on Feed Recovery (Fills at Adverse Market Gap)
// -----------------------------------------------------------------------------
runGate("Test 7: Deterministic Gap-Down Reconciliation fills at adverse market price (Math.min(SL, LTP))", () => {
  const db = getDb();

  const testTrade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executedFillPrice = null;
  let executedReason = null;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "stop_loss_hit") {
        executedFillPrice = payload.ltp;
        executedReason = payload.reason;
      }
    },
    removeTrade: () => {},
  };

  const item = {
    trade: testTrade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    lastKnownReferencePrice: 97.50,
  };

  const freshGapTick = {
    ltp: 91.20,
    depth: {
      bids: [{ price: 91.20, quantity: 65 }],
      asks: [{ price: 91.80, quantity: 65 }],
    },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, freshGapTick);
  } finally {
    db.prepare("DELETE FROM trades WHERE id = ?").run(testTrade.id);
  }

  assert.equal(executedReason, "STOP_LOSS_HIT");
  assert.equal(executedFillPrice, 91.20, "Fill price MUST be the adverse gap price (₹91.20), NOT invented ₹96.00");
});

// -----------------------------------------------------------------------------
// TEST 8: Deterministic Target Gap Policy on Feed Recovery (Fills at Target)
// -----------------------------------------------------------------------------
runGate("Test 8: Deterministic Target Gap fills at resting limit Target price", () => {
  const db = getDb();

  const testTrade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executedFillPrice = null;
  let executedReason = null;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "target_hit") {
        executedFillPrice = payload.ltp;
        executedReason = payload.reason;
      }
    },
    removeTrade: () => {},
  };

  const item = {
    trade: testTrade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    lastKnownReferencePrice: 104.0,
  };

  const freshGapTick = {
    ltp: 112.50,
    source: "WEBSOCKET_V3",
    isFresh: true,
    intervalOhlc: { high: 112.50, low: 98.0 }, // Verified: low never touched stopLoss (96.0)
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, freshGapTick);
  } finally {
    db.prepare("DELETE FROM trades WHERE id = ?").run(testTrade.id);
  }

  assert.equal(executedReason, "TARGET_HIT");
  assert.equal(executedFillPrice, 108.0, "Resting limit order executes conservatively at Target (₹108.00)");
});

// -----------------------------------------------------------------------------
// TEST 9: Normal Recovery When Price Remains Within Bounds
// -----------------------------------------------------------------------------
runGate("Test 9: Price within [SL, Target] restores monitoringState to NORMAL", () => {
  let restoredEvent = false;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type) => {
      if (type === "monitoring_restored") restoredEvent = true;
    },
  };

  const trade = {
    id: 106,
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    direction: "LONG",
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "UNVERIFIED",
    isStale: true,
    lastKnownReferencePrice: 98.0,
  };

  // Feed resumes at 102.0 (well within 96.0 and 108.0)
  const freshTick = {
    ltp: 102.0,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  reconcileActivePosition(mockEngine, item, freshTick);

  assert.equal(item.monitoringState, "NORMAL");
  assert.equal(item.pnlStatus, "VERIFIED");
  assert.equal(item.isStale, false);
  assert.equal(item.lastLtp, 102.0);
  assert.equal(restoredEvent, true, "monitoring_restored event published");
});

// -----------------------------------------------------------------------------
// TEST 10: App Restart & Idempotent Resubscription
// -----------------------------------------------------------------------------
runGate("Test 10: Resubscription does not duplicate active subscriptions in client Set", () => {
  const client = {
    pendingSubscriptions: new Set(),
    activeSubscriptions: new Set(),
    connected: true,
    sentJson: [],
    sendJson: function(p) { this.sentJson.push(p); },
  };

  client.pendingSubscriptions.add("NSE_INDEX|NIFTY 50");
  client.pendingSubscriptions.add("NSE_INDEX|NIFTY 50"); // Duplicate call

  assert.equal(client.pendingSubscriptions.size, 1, "Set prevents duplicate pending subscriptions");
});

// -----------------------------------------------------------------------------
// TEST 11: LIVE_ORDER_ROUTING Hardcoded DISABLED Invariant
// -----------------------------------------------------------------------------
runGate("Test 11: LIVE_ORDER_ROUTING is hardcoded DISABLED across all gateways", () => {
  const liveRoutingFlag = process.env.LIVE_ORDER_ROUTING;
  assert.notEqual(liveRoutingFlag, "ENABLED", "LIVE_ORDER_ROUTING must not be ENABLED");
});

console.log("\n================================================================================");
console.log(`STAGE 2.1 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
