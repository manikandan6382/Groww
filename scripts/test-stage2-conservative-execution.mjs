import { strict as assert } from "node:assert";
import { getDb } from "../src/db/connection.js";
import { createPaperTrade, markPaperTrade } from "../src/repositories/paper-lab.repository.js";
import { calculateFrictionAndCharges } from "../src/repositories/paper-friction.js";
import { reconcileActivePosition, triggerTradeExecution } from "../src/services/engine/triggerEvaluator.js";
import { handleEngineTick } from "../src/services/engine/tickHandler.js";
import { PaperTradeEngine } from "../src/services/paperTradeEngine.js";

console.log("================================================================================");
console.log("STAGE 2.2 CONSERVATIVE GAP-RECOVERY EXECUTION AUDIT TEST SUITE");
console.log("================================================================================");

let passedCount = 0;
let failedCount = 0;

function runGate(title, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${title}: ${err.message}`);
    console.error(err.stack);
    failedCount++;
  }
}

function cleanupTrade(id) {
  if (!id) return;
  try {
    const db = getDb();
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trades WHERE id = ?").run(id);
  } catch {}
}

// Ensure clean test baseline
try {
  getDb().prepare("UPDATE trades SET status = 'CLOSED', close_reason = 'TEST_COMPLETED' WHERE status = 'OPEN'").run();
} catch {}

// -----------------------------------------------------------------------------
// TEST 1: Recovery below the stop with fresh bid/depth available
// -----------------------------------------------------------------------------
runGate("Test 1: Recovery below stop with fresh bid depth fills at adverse bid price", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executedPayload = null;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "stop_loss_hit") executedPayload = payload;
    },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    lastKnownReferencePrice: 98.0,
  };

  const recoveryTick = {
    ltp: 91.20,
    depth: {
      bids: [{ price: 90.80, quantity: 130 }],
      asks: [{ price: 91.40, quantity: 65 }],
    },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, recoveryTick);
    assert.ok(executedPayload, "Trade execution must be triggered");
    assert.equal(executedPayload.reason, "STOP_LOSS_HIT");
    assert.equal(executedPayload.ltp, 90.80, "Fill price must consume available bid depth (₹90.80)");
    
    const closed = db.prepare("SELECT status, exit_price, close_reason FROM trades WHERE id = ?").get(trade.id);
    assert.equal(closed.status, "CLOSED");
    assert.equal(closed.exit_price, 90.80, "Persisted exit price must match exact fill");
  } finally {
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(trade.id);
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 2A: Case 1 - Missing Depth Object (depth is absent) with Valid LTP
// -----------------------------------------------------------------------------
runGate("Test 2a: Missing depth (absent) with valid LTP preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let emittedEvent = null;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => { emittedEvent = { type, payload }; },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "VERIFIED",
    isStale: false,
    lastKnownReferencePrice: 97.0,
  };

  // Case 1: depth is completely absent
  const tickNoDepth = {
    ltp: 90.00,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, tickNoDepth);
    
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED", "Must transition to RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED", "P&L must be marked UNVERIFIED");
    assert.equal(item.degradedReason, "NO_EXECUTABLE_BID", "Reason must identify absent bids");
    assert.equal(item.lastKnownReferencePrice, 90.00, "LTP must be preserved as reference data only");
    assert.equal(emittedEvent.type, "monitoring_reconciliation_required");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN", "Trade must remain OPEN in database");

    const execRows = db.prepare("SELECT COUNT(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
    assert.equal(execRows.count, 0, "No exit execution rows may be inserted without depth");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 2B: Case 2 - Null Depth Object (depth is null) with Valid LTP
// -----------------------------------------------------------------------------
runGate("Test 2b: Null depth with valid LTP preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "VERIFIED",
  };

  // Case 2: depth is explicitly null
  const tickNullDepth = {
    ltp: 89.50,
    depth: null,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, tickNullDepth);
    
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");
    assert.equal(item.degradedReason, "NO_EXECUTABLE_BID");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 2C: Case 3 - Depth exists but bids is absent
// -----------------------------------------------------------------------------
runGate("Test 2c: Depth exists but bids array is absent preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
    removeTrade: () => {},
  };

  const item = { trade, monitoringState: "RECOVERY_RECONCILIATION_REQUIRED" };

  // Case 3: depth exists, but bids array is missing
  const tickNoBidsArray = {
    ltp: 88.00,
    depth: { asks: [{ price: 92.0, quantity: 65 }] },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, tickNoBidsArray);
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 2D: Case 4 - Bids array exists but is empty
// -----------------------------------------------------------------------------
runGate("Test 2d: Empty bids array preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
    removeTrade: () => {},
  };

  const item = { trade, monitoringState: "RECOVERY_RECONCILIATION_REQUIRED" };

  // Case 4: bids is an empty array
  const tickEmptyBids = {
    ltp: 88.00,
    depth: { bids: [], asks: [{ price: 92.0, quantity: 65 }] },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, tickEmptyBids);
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 2E: Case 5 - Best bid is zero, negative, invalid or stale
// -----------------------------------------------------------------------------
runGate("Test 2e: Zero, negative, invalid or stale best bid preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
    removeTrade: () => {},
  };

  const item = { trade, monitoringState: "RECOVERY_RECONCILIATION_REQUIRED" };

  // 5a. Best bid is 0
  reconcileActivePosition(mockEngine, item, {
    ltp: 90.0,
    depth: { bids: [{ price: 0, quantity: 65 }] },
    source: "WEBSOCKET_V3",
    isFresh: true,
  });
  assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED", "Zero bid must mark RECONCILIATION_REQUIRED");

  // 5b. Best bid is negative
  reconcileActivePosition(mockEngine, item, {
    ltp: 90.0,
    depth: { bids: [{ price: -5.0, quantity: 65 }] },
    source: "WEBSOCKET_V3",
    isFresh: true,
  });
  assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED", "Negative bid must mark RECONCILIATION_REQUIRED");

  // 5c. Best bid quantity is 0
  reconcileActivePosition(mockEngine, item, {
    ltp: 90.0,
    depth: { bids: [{ price: 90.0, quantity: 0 }] },
    source: "WEBSOCKET_V3",
    isFresh: true,
  });
  assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED", "Zero quantity bid must mark RECONCILIATION_REQUIRED");

  // 5d. Tick is marked stale (isFresh: false)
  reconcileActivePosition(mockEngine, item, {
    ltp: 90.0,
    depth: { bids: [{ price: 90.0, quantity: 65 }] },
    source: "WEBSOCKET_V3",
    isFresh: false,
  });
  assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED", "Stale tick must mark RECONCILIATION_REQUIRED");

  const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
  assert.equal(persisted.status, "OPEN", "Trade must remain OPEN across all invalid bid tests");
  cleanupTrade(trade.id);
});

// -----------------------------------------------------------------------------
// TEST 3: Recovery above target without sufficient intermediate data
// -----------------------------------------------------------------------------
runGate("Test 3: Recovery above target without sequence evidence marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let targetExecuted = false;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type) => {
      if (type === "target_hit") targetExecuted = true;
    },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "VERIFIED",
    lastKnownReferencePrice: 104.0,
  };

  // Recovered tick above target, but NO interval history / sequence evidence
  const unprovenGapTick = {
    ltp: 114.00,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, unprovenGapTick);

    assert.equal(targetExecuted, false, "Must NOT fabricate a target hit without sequence proof");
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");
    assert.equal(item.degradedReason, "UNRESOLVED_GAP_SEQUENCE");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN", "Trade must remain OPEN pending reconciliation");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 3B: Missing depth after an apparent target gap
// -----------------------------------------------------------------------------
runGate("Test 3b: Missing depth after an apparent target gap preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executed = false;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type) => {
      if (type === "target_hit" || type === "stop_loss_hit") executed = true;
    },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "VERIFIED",
    lastKnownReferencePrice: 102.0,
  };

  // Tick gaps above target with depth absent
  const targetGapNoDepthTick = {
    ltp: 115.00,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, targetGapNoDepthTick);

    assert.equal(executed, false, "Must not execute target fill without verified depth/sequence");
    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN", "Trade must remain OPEN");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 4: Missing-interval evidence showing both touched with executable depth
// -----------------------------------------------------------------------------
runGate("Test 4: Missing interval touching both SL and TP with executable depth triggers STOP_FIRST policy", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executedReason = null;
  let executedFillPrice = null;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "stop_loss_hit" || type === "target_hit") {
        executedReason = payload.reason;
        executedFillPrice = payload.ltp;
      }
    },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
  };

  // Interval OHLC shows price went as low as 94.0 (SL breached) and as high as 112.0 (TP breached)
  // Has executable bid depth at ₹96.0
  const bothTouchedTick = {
    ltp: 110.0,
    intervalOhlc: { high: 112.0, low: 94.0 },
    depth: {
      bids: [{ price: 96.0, quantity: 65 }],
      asks: [{ price: 96.5, quantity: 65 }]
    },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, bothTouchedTick);

    assert.equal(executedReason, "STOP_LOSS_HIT", "Conservative policy MUST prioritize STOP_LOSS_HIT");
    assert.equal(executedFillPrice, 96.0, "Fill price must be capped at stop loss boundary");

    const closed = db.prepare("SELECT status, close_reason FROM trades WHERE id = ?").get(trade.id);
    assert.equal(closed.status, "CLOSED");
    assert.equal(closed.close_reason, "STOP_LOSS_HIT");
  } finally {
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(trade.id);
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 4B: Missing-interval evidence showing both touched with MISSING depth
// -----------------------------------------------------------------------------
runGate("Test 4b: Missing interval touching both SL and TP with missing depth preserves OPEN and marks RECONCILIATION_REQUIRED", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executed = false;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => { executed = true; },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
  };

  // Both touched during outage, but NO market depth object available
  const bothTouchedNoDepth = {
    ltp: 110.0,
    intervalOhlc: { high: 112.0, low: 94.0 },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, bothTouchedNoDepth);

    assert.equal(item.monitoringState, "RECONCILIATION_REQUIRED");
    assert.equal(item.pnlStatus, "UNVERIFIED");

    const persisted = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(persisted.status, "OPEN", "Trade must remain OPEN when depth is missing");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 5: Sufficient recorded events establish unambiguous target-first sequence
// -----------------------------------------------------------------------------
runGate("Test 5: Verified interval with low > SL reconciles as TARGET_HIT at resting limit", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  let executedReason = null;
  let executedFillPrice = null;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "target_hit") {
        executedReason = payload.reason;
        executedFillPrice = payload.ltp;
      }
    },
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
  };

  // Interval OHLC proves low was 98.50 (> SL 96.0), high reached 112.0 (> TP 108.0)
  const targetFirstTick = {
    ltp: 112.0,
    intervalOhlc: { high: 112.0, low: 98.50 },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  try {
    reconcileActivePosition(mockEngine, item, targetFirstTick);

    assert.equal(executedReason, "TARGET_HIT");
    assert.equal(executedFillPrice, 108.0, "Target fill must execute at resting limit price (₹108.00)");

    const closed = db.prepare("SELECT status, exit_price, close_reason FROM trades WHERE id = ?").get(trade.id);
    assert.equal(closed.status, "CLOSED");
    assert.equal(closed.exit_price, 108.0, "Persisted exit price must be ₹108.00 without synthetic drag");
  } finally {
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(trade.id);
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 6: Long CALL and PUT option liquidation semantics (Option Sale consumes BID)
// -----------------------------------------------------------------------------
runGate("Test 6: Long CALL and PUT liquidations consume BID liquidity on stop trigger", () => {
  const db = getDb();
  
  // 1. Long CALL
  const callTrade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    optionType: "CALL",
    entryPrice: 80.0,
    stopLoss: 76.0,
    targetPrice: 88.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  // 2. Long PUT
  const putTrade = createPaperTrade({
    symbol: "NIFTY 22500 PE",
    optionType: "PUT",
    entryPrice: 90.0,
    stopLoss: 86.0,
    targetPrice: 98.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const executedFills = [];
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type, payload) => {
      if (type === "stop_loss_hit") executedFills.push(payload);
    },
    removeTrade: () => {},
  };

  try {
    // Both long options exit by SELLING, consuming BID depth
    const callTick = {
      ltp: 74.0,
      depth: { bids: [{ price: 73.50, quantity: 65 }] },
      source: "WEBSOCKET_V3",
      isFresh: true,
    };
    reconcileActivePosition(mockEngine, { trade: callTrade, monitoringState: "RECOVERY_RECONCILIATION_REQUIRED" }, callTick);

    const putTick = {
      ltp: 84.0,
      depth: { bids: [{ price: 83.20, quantity: 65 }] },
      source: "WEBSOCKET_V3",
      isFresh: true,
    };
    reconcileActivePosition(mockEngine, { trade: putTrade, monitoringState: "RECOVERY_RECONCILIATION_REQUIRED" }, putTick);

    assert.equal(executedFills.length, 2);
    assert.equal(executedFills[0].symbol, "NIFTY 22500 CE");
    assert.equal(executedFills[0].ltp, 73.50, "CALL exit must execute against bid (₹73.50)");

    assert.equal(executedFills[1].symbol, "NIFTY 22500 PE");
    assert.equal(executedFills[1].ltp, 83.20, "PUT exit must execute against bid (₹83.20)");
  } finally {
    cleanupTrade(callTrade.id);
    cleanupTrade(putTrade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 7: Spread/slippage and statutory fees applied exactly once
// -----------------------------------------------------------------------------
runGate("Test 7: Resting Target limit fills have 0 synthetic slippage; fees applied once", () => {
  const dummyTrade = {
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    quantity: 1,
    lotSize: 65,
    direction: "LONG",
  };

  // Case A: Resting Target Limit Fill
  const targetFriction = calculateFrictionAndCharges(dummyTrade, 108.0, "TARGET_HIT");
  assert.equal(targetFriction.filledExit, 108.0, "Target fill must NOT suffer synthetic slippage deduction");
  assert.equal(targetFriction.slippagePts, 0.0);
  assert.equal(targetFriction.brokerage, 40.0, "Brokerage applied once");
  assert.ok(targetFriction.statutoryCharges > 0, "Statutory charges calculated on turnover");

  // Case B: Exact fill from live order book depth
  const exactFriction = calculateFrictionAndCharges(dummyTrade, 90.80, "STOP_LOSS_HIT", { exactFill: true });
  assert.equal(exactFriction.filledExit, 90.80, "Exact fill from depth must NOT subtract duplicate slippage");
  assert.equal(exactFriction.slippagePts, 0.0);
});

// -----------------------------------------------------------------------------
// TEST 8: No duplicate settlement rows or false closed-position state
// -----------------------------------------------------------------------------
runGate("Test 8: Unresolved reconciliation creates zero duplicate rows and preserves OPEN status", () => {
  const db = getDb();
  const trade = createPaperTrade({
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
    quantity: 1,
    direction: "LONG",
    tradeMode: "PAPER",
  });

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
    removeTrade: () => {},
  };

  const item = {
    trade,
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    lastKnownReferencePrice: 100.0,
  };

  // Simulate multiple ticks arriving while market depth is empty
  const noDepthTick = {
    ltp: 92.0,
    depth: { bids: [] },
    source: "WEBSOCKET_V3",
    isFresh: true,
  };

  try {
    reconcileActivePosition(mockEngine, item, noDepthTick);
    reconcileActivePosition(mockEngine, item, noDepthTick);

    const execCount = db.prepare("SELECT COUNT(*) as count FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(trade.id);
    assert.equal(execCount.count, 0, "Must have exactly 0 exit execution records inserted");

    const currentTrade = db.prepare("SELECT status FROM trades WHERE id = ?").get(trade.id);
    assert.equal(currentTrade.status, "OPEN", "Status must remain OPEN");
  } finally {
    cleanupTrade(trade.id);
  }
});

// -----------------------------------------------------------------------------
// TEST 9: P&L remains UNVERIFIED while reconciliation is unresolved
// -----------------------------------------------------------------------------
runGate("Test 9: Engine getStatus exposes UNVERIFIED pnlStatus and RECONCILIATION_REQUIRED", () => {
  const mockClient = { connected: true, on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) };
  const engine = new PaperTradeEngine({ client: mockClient });

  const dummyTrade = {
    id: 9999,
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 96.0,
    targetPrice: 108.0,
  };

  engine.activeTrades.set(9999, {
    trade: dummyTrade,
    tokenKey: "NSE_FO|9999",
    monitoringState: "RECONCILIATION_REQUIRED",
    pnlStatus: "UNVERIFIED",
    isStale: true,
    lastKnownReferencePrice: 114.0,
  });

  const status = engine.getStatus();
  const tradeStatus = status.activeTrades.find((t) => t.id === 9999);

  assert.ok(tradeStatus);
  assert.equal(tradeStatus.monitoringState, "RECONCILIATION_REQUIRED");
  assert.equal(tradeStatus.pnlStatus, "UNVERIFIED");
  assert.equal(tradeStatus.isStale, true);
  assert.equal(tradeStatus.lastKnownReferencePrice, 114.0);
});

// -----------------------------------------------------------------------------
// TEST 10: Fresh recovery restores NORMAL monitoring only after bounds check passes
// -----------------------------------------------------------------------------
runGate("Test 10: In-bounds price recovery without breach restores NORMAL monitoring", () => {
  let restoredPublished = false;

  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: (type) => {
      if (type === "monitoring_restored") restoredPublished = true;
    },
    removeTrade: () => {},
  };

  const item = {
    trade: {
      id: 8888,
      symbol: "NIFTY 22500 CE",
      entryPrice: 100.0,
      stopLoss: 96.0,
      targetPrice: 108.0,
      direction: "LONG",
    },
    monitoringState: "RECOVERY_RECONCILIATION_REQUIRED",
    pnlStatus: "UNVERIFIED",
    isStale: true,
  };

  // Recovered tick inside [96.0, 108.0] and interval OHLC proves no breach
  const safeRecoveryTick = {
    ltp: 102.0,
    intervalOhlc: { high: 104.0, low: 98.0 },
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  };

  reconcileActivePosition(mockEngine, item, safeRecoveryTick);

  assert.equal(item.monitoringState, "NORMAL");
  assert.equal(item.pnlStatus, "VERIFIED");
  assert.equal(item.isStale, false);
  assert.equal(restoredPublished, true, "Must emit monitoring_restored event");
});

console.log("================================================================================");
console.log(`STAGE 2.2 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
