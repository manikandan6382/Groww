/**
 * Stage 2 Verification Test Suite: Upstox V3 Market Data Feed & Protocol Buffer Pipeline
 * Validates Protobuf decoding, schema integrity, quote normalisation, freshness gates,
 * and RMS/engine integration invariants.
 */

import assert from "node:assert/strict";
import {
  getFeedResponseDecoder,
  decodeV3ProtobufBuffer,
  normaliseV3FeedEntry,
  parseRawMessage,
} from "../src/services/upstox/feedParser.js";
import { sendWebSocketJson, scheduleWebSocketReconnect } from "../src/services/upstox/upstoxWebSocket.js";
import { executeLtpPoll } from "../src/services/upstox/upstoxPolling.js";
import { PaperTradeEngine } from "../src/services/paperTradeEngine.js";
import { evaluateTradeTrigger } from "../src/services/engine/triggerEvaluator.js";

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
console.log("STAGE 2 AUDIT: UPSTOX V3 MARKET DATA FEED & PROTOBUF INTEGRITY GATES");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// GATE 1: Protobuf Schema Loading & Decoder Resolution
// -----------------------------------------------------------------------------
runGate("Gate 1: MarketDataFeed.proto loads schema-backed FeedResponse decoder", () => {
  const decoder = getFeedResponseDecoder();
  assert.ok(decoder, "Decoder must be non-null");
  assert.equal(decoder.name, "FeedResponse", "Decoder name must match FeedResponse");
  assert.ok(decoder.fields.feeds, "FeedResponse must contain feeds map field");
});

// -----------------------------------------------------------------------------
// GATE 2: LTPC Feed Decoding and Normalisation
// -----------------------------------------------------------------------------
runGate("Gate 2: Decodes LTPC feed and extracts last_price and timestamp", () => {
  const decoder = getFeedResponseDecoder();
  const testPayload = {
    type: "live_feed",
    feeds: {
      "NSE_INDEX|Nifty 50": {
        ltpc: {
          ltp: 22525.50,
          ltt: 1718000000000,
          cp: 22450.00,
        },
      },
    },
    currentTs: 1718000000100,
  };

  const buffer = decoder.encode(decoder.create(testPayload)).finish();
  const decoded = decodeV3ProtobufBuffer(buffer);
  assert.ok(decoded, "Decoded object must exist");
  assert.ok(decoded.feeds["NSE_INDEX|Nifty 50"], "Feed entry must exist");

  const tick = normaliseV3FeedEntry("NSE_INDEX|Nifty 50", decoded.feeds["NSE_INDEX|Nifty 50"], 1718000000100);
  assert.ok(tick, "Normalised tick must exist");
  assert.equal(tick.ltp, 22525.50, "LTP must be 22525.50");
  assert.equal(tick.close, 22450.00, "Close must be 22450.00");
  assert.equal(tick.change, 75.50, "Change must be 75.50");
  assert.equal(tick.source, "WEBSOCKET_V3", "Source must be WEBSOCKET_V3");
  assert.equal(tick.isFresh, true, "Tick must be fresh");
});

// -----------------------------------------------------------------------------
// GATE 3: Options FullFeed with Option Greeks & Depth Normalisation
// -----------------------------------------------------------------------------
runGate("Gate 3: Decodes Market FullFeed with IV, Greeks, and 5-level depth", () => {
  const decoder = getFeedResponseDecoder();
  const testPayload = {
    type: "live_feed",
    feeds: {
      "NSE_FO|54321": {
        fullFeed: {
          marketFF: {
            ltpc: {
              ltp: 89.25,
              ltt: 1718000000000,
              cp: 75.00,
            },
            iv: 14.5,
            marketLevel: {
              bidAskQuote: [
                { bidQ: 65, bidP: 89.20, askQ: 130, askP: 89.30 },
              ],
            },
            optionGreeks: {
              delta: 0.52,
              theta: -8.4,
              gamma: 0.003,
              vega: 12.1,
            },
            marketOHLC: {
              ohlc: [
                { open: 70.0, high: 95.0, low: 68.0, close: 75.0, ts: 1718000000000 },
              ],
            },
          },
        },
      },
    },
    currentTs: 1718000000100,
  };

  const buffer = decoder.encode(decoder.create(testPayload)).finish();
  const decoded = decodeV3ProtobufBuffer(buffer);
  const tick = normaliseV3FeedEntry("NSE_FO|54321", decoded.feeds["NSE_FO|54321"], 1718000000100);

  assert.ok(tick, "Normalised option tick must exist");
  assert.equal(tick.ltp, 89.25, "LTP must match 89.25");
  assert.ok(tick.greeks, "Greeks object must be present");
  assert.equal(tick.greeks.iv, 14.5, "IV must match");
  assert.equal(tick.greeks.delta, 0.52, "Delta must match");
  assert.equal(tick.greeks.theta, -8.4, "Theta must match");
  assert.ok(tick.depth, "Depth must be present");
  assert.equal(tick.depth.bids[0].price, 89.20, "Bid price must match");
  assert.equal(tick.depth.asks[0].price, 89.30, "Ask price must match");
});

// -----------------------------------------------------------------------------
// GATE 4: Index FullFeed Normalisation
// -----------------------------------------------------------------------------
runGate("Gate 4: Decodes Index FullFeed (indexFF) with OHLC and market info", () => {
  const decoder = getFeedResponseDecoder();
  const testPayload = {
    type: "live_feed",
    feeds: {
      "NSE_INDEX|Nifty Bank": {
        fullFeed: {
          indexFF: {
            ltpc: {
              ltp: 48500.25,
              ltt: 1718000000000,
              cp: 48000.00,
            },
            marketOHLC: {
              ohlc: [
                { open: 48100.0, high: 48600.0, low: 48050.0, close: 48000.0, ts: 1718000000000 },
              ],
            },
          },
        },
      },
    },
  };

  const buffer = decoder.encode(decoder.create(testPayload)).finish();
  const decoded = decodeV3ProtobufBuffer(buffer);
  const tick = normaliseV3FeedEntry("NSE_INDEX|Nifty Bank", decoded.feeds["NSE_INDEX|Nifty Bank"]);

  assert.ok(tick, "Index tick must exist");
  assert.equal(tick.ltp, 48500.25, "BankNifty LTP must match");
  assert.equal(tick.open, 48100.0, "Open must match");
  assert.equal(tick.high, 48600.0, "High must match");
  assert.equal(tick.low, 48050.0, "Low must match");
});

// -----------------------------------------------------------------------------
// GATE 5: Malformed & Truncated Buffer Resilience
// -----------------------------------------------------------------------------
runGate("Gate 5: Malformed and truncated buffers return null without unhandled exceptions", () => {
  assert.equal(decodeV3ProtobufBuffer(null), null, "null input returns null");
  assert.equal(decodeV3ProtobufBuffer(Buffer.alloc(0)), null, "empty buffer returns null");
  assert.equal(decodeV3ProtobufBuffer(Buffer.from([0xFF, 0xFF])), null, "corrupt bytes return null");
  assert.equal(normaliseV3FeedEntry("TEST", null), null, "null feed entry returns null");
  assert.equal(normaliseV3FeedEntry("TEST", {}), null, "empty feed entry returns null");
});

// -----------------------------------------------------------------------------
// GATE 6: Subscription Request Binary Frame Formatting
// -----------------------------------------------------------------------------
runGate("Gate 6: sendWebSocketJson strictly serialises to binary Buffer for V3 WebSocket", () => {
  let sentData = null;
  const mockClient = {
    socket: {
      readyState: 1, // OPEN
      send: (buf) => { sentData = buf; },
    },
  };

  const payload = {
    guid: "test-guid-123",
    method: "sub",
    data: {
      mode: "full",
      instrumentKeys: ["NSE_INDEX|Nifty 50", "NSE_FO|54321"],
    },
  };

  const result = sendWebSocketJson(mockClient, payload);
  assert.equal(result, true, "sendWebSocketJson must succeed");
  assert.ok(Buffer.isBuffer(sentData), "Sent data MUST be a binary Buffer");
  const parsed = JSON.parse(sentData.toString("utf-8"));
  assert.equal(parsed.guid, "test-guid-123");
  assert.equal(parsed.data.mode, "full");
  assert.equal(parsed.data.instrumentKeys.length, 2);
});

// -----------------------------------------------------------------------------
// GATE 7: Token Expiry State & Reconnect Guard
// -----------------------------------------------------------------------------
runGate("Gate 7: TOKEN_EXPIRED state suppresses auto-reconnect loop", () => {
  let timerScheduled = false;
  const mockClient = {
    shouldRun: true,
    isConfigured: () => true,
    connectionState: "TOKEN_EXPIRED",
    reconnectTimer: null,
    connect: () => { timerScheduled = true; },
    emit: () => {},
  };

  scheduleWebSocketReconnect(mockClient);
  assert.equal(timerScheduled, false, "Must NOT schedule reconnect when TOKEN_EXPIRED");
  assert.equal(mockClient.reconnectTimer, null, "reconnectTimer must remain null");
});

// -----------------------------------------------------------------------------
// GATE 8: Exponential Backoff Timing Progression
// -----------------------------------------------------------------------------
runGate("Gate 8: Reconnection backoff doubles correctly and caps at 30,000ms", () => {
  const delays = [];
  const mockClient = {
    shouldRun: true,
    isConfigured: () => true,
    connectionState: "DISCONNECTED",
    reconnectMs: 1000,
    reconnectTimer: null,
    emit: (event, payload) => {
      if (event === "status" && payload.state === "RECONNECTING") {
        delays.push(payload.delay);
      }
    },
  };

  scheduleWebSocketReconnect(mockClient);
  mockClient.reconnectTimer = null;
  scheduleWebSocketReconnect(mockClient);
  mockClient.reconnectTimer = null;
  scheduleWebSocketReconnect(mockClient);
  mockClient.reconnectTimer = null;
  mockClient.reconnectMs = 25000;
  scheduleWebSocketReconnect(mockClient);

  assert.deepEqual(delays, [1000, 2000, 4000, 25000], "Delays must scale exponentially");
  assert.equal(mockClient.reconnectMs, 30000, "Must cap at 30,000ms ceiling");
});

// -----------------------------------------------------------------------------
// GATE 9: REST Recovery Quote Tagging & Stale Overwrite Protection
// -----------------------------------------------------------------------------
runGate("Gate 9: REST fallback cannot overwrite newer live WebSocket tick in quoteStore", () => {
  const engine = new PaperTradeEngine({ client: { on: () => {}, start: () => {}, stop: () => {}, getStatus: () => ({}) } });

  // 1. Receive live WebSocket tick at T = 1000
  const wsTick = {
    key: "NSE_FO|54321",
    symbol: "NIFTY24OCT22500CE",
    ltp: 85.50,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date(Date.now()).toISOString(),
  };
  engine.handleTick(wsTick);

  const initialQuote = engine.quoteStore.get("NSE_FO|54321");
  assert.equal(initialQuote.ltp, 85.50, "Initial LTP must be 85.50");
  assert.equal(initialQuote.source, "WEBSOCKET_V3");

  // 2. Simulate stale REST poll arriving with older timestamp
  const staleRestTick = {
    key: "NSE_FO|54321",
    symbol: "NIFTY24OCT22500CE",
    ltp: 82.00, // Older price
    source: "REST_RECOVERY",
    isFresh: false,
    receivedAt: new Date(Date.now() - 5000).toISOString(), // 5 seconds older
  };
  engine.handleTick(staleRestTick);

  const preservedQuote = engine.quoteStore.get("NSE_FO|54321");
  assert.equal(preservedQuote.ltp, 85.50, "LTP must NOT be overwritten by stale REST poll");
  assert.equal(preservedQuote.source, "WEBSOCKET_V3", "Source must remain WEBSOCKET_V3");
});

// -----------------------------------------------------------------------------
// GATE 10: Quote Freshness & Feed Health Evaluation
// -----------------------------------------------------------------------------
runGate("Gate 10: isFeedHealthy strictly rejects quotes older than 10,000ms", () => {
  const mockClient = {
    connected: true,
    on: () => {},
    start: () => {},
    stop: () => {},
    getStatus: () => ({}),
  };
  const engine = new PaperTradeEngine({ client: mockClient });

  // Fresh quote within 10s
  engine.handleTick({
    key: "NSE_INDEX|Nifty 50",
    ltp: 22500.0,
    source: "WEBSOCKET_V3",
    isFresh: true,
    receivedAt: new Date().toISOString(),
  });

  assert.equal(engine.isFeedHealthy("NSE_INDEX|Nifty 50"), true, "Fresh quote must be healthy");
  assert.equal(engine.isFeedHealthy(), true, "General feed must be healthy");

  // Artificially age the quote to 15 seconds old
  const quote = engine.quoteStore.get("NSE_INDEX|Nifty 50");
  quote.timestampMs = Date.now() - 15000;

  assert.equal(engine.isFeedHealthy("NSE_INDEX|Nifty 50"), false, "15s old quote must be marked unhealthy");
  assert.equal(engine.isFeedHealthy(), false, "General feed with only stale quotes must be unhealthy");

  // Authoritative quote accessor
  const authQuote = engine.getAuthoritativeQuote("NSE_INDEX|Nifty 50");
  assert.equal(authQuote.isFresh, false, "Authoritative quote must report isFresh = false when age > 10s");
  assert.ok(authQuote.ageMs >= 15000, "Reported ageMs must reflect stale elapsed time");
});

// -----------------------------------------------------------------------------
// GATE 11: Stale Quotes Suppress Stop Loss / Trigger Execution
// -----------------------------------------------------------------------------
runGate("Gate 11: Stale tick (isFresh=false) is suppressed by trigger evaluator", () => {
  let executed = false;
  const mockEngine = {
    triggering: new Set(),
    activeTrades: new Map(),
    publish: () => {},
  };

  const trade = {
    id: 99,
    symbol: "NIFTY22500CE",
    entryPrice: 100.0,
    stopLoss: 90.0,
    targetPrice: 120.0,
    direction: "LONG",
  };

  // Tick breaches SL (ltp = 85.0 <= 90.0) but has isFresh: false
  const staleBreachTick = {
    ltp: 85.0,
    isFresh: false,
    source: "REST_RECOVERY",
  };

  evaluateTradeTrigger(mockEngine, trade, staleBreachTick);
  assert.equal(mockEngine.triggering.has(99), false, "Must NOT trigger trade execution on stale tick");
});

// -----------------------------------------------------------------------------
// GATE 12: REST Polling Pause When WebSocket Is Active
// -----------------------------------------------------------------------------
async function testRestPollingPause() {
  let fetchCalled = false;
  const mockClient = {
    shouldRun: true,
    connected: true, // WebSocket is CONNECTED
    polling: false,
    isConfigured: () => true,
    refreshAccessToken: () => "mock-token",
    pendingSubscriptions: new Set(["NSE_INDEX|Nifty 50"]),
    activeSubscriptions: new Set(),
    emit: () => {},
  };

  // Monkey-patch global fetch temporarily to detect calls
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({}) };
  };

  try {
    await executeLtpPoll(mockClient);
    assert.equal(fetchCalled, false, "REST poll MUST be skipped when WebSocket is actively connected");
  } finally {
    globalThis.fetch = origFetch;
  }
}

await runGateAsync("Gate 12: REST polling pauses immediately when WebSocket is connected", testRestPollingPause);

// -----------------------------------------------------------------------------
// GATE 13: Stale / Disconnected Feed Rejection in Order Deployment Routes
// -----------------------------------------------------------------------------
async function testFeedHealthOrderRejection() {
  const { handlePaperOrdersRoutes } = await import("../src/routes/trades/paper-orders-routes.js");
  const { paperTradeEngine: globalEngine } = await import("../src/services/paperTradeEngine.js");

  const originalConnected = globalEngine.client?.connected;
  if (globalEngine.client) globalEngine.client.connected = false;

  let responseStatus = null;
  let responseBody = null;
  const mockRes = {
    writeHead: (status) => { responseStatus = status; },
    end: (data) => {
      try { responseBody = JSON.parse(data); } catch { responseBody = data; }
    },
    setHeader: () => {},
  };

  const payload = {
    symbol: "NIFTY 22500 CE",
    entryPrice: 100.0,
    stopLoss: 97.20,
    targetPrice: 106.0,
    quantity: 1,
    feedMode: "LIVE",
    isManual: false,
    bypassDailyLoss: true,
    idempotencyKey: `test-feed-health-${Date.now()}`,
  };

  const mockReq = {
    method: "POST",
    headers: { "content-type": "application/json" },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(payload));
    },
  };

  const url = new URL("http://localhost:3003/api/paper-lab/trades");
  await handlePaperOrdersRoutes(mockReq, mockRes, url);

  if (globalEngine.client) globalEngine.client.connected = originalConnected;

  assert.equal(responseStatus, 503, "Order must be rejected with HTTP 503 when feed is unhealthy");
  assert.equal(responseBody.title, "Market Data Feed Unhealthy", "Problem details title must indicate feed unhealthy");
}

await runGateAsync("Gate 13: Stale/disconnected feed rejects live order deployment with HTTP 503", testFeedHealthOrderRejection);

// -----------------------------------------------------------------------------
// GATE 14: Historical SQLite Audit Ledger Integrity
// -----------------------------------------------------------------------------
async function testTradeJournalIntegrity() {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync("data/portfoliox.db");
  const trade447 = db.prepare("SELECT id, entry_price, exit_price, net_pnl, close_reason FROM trades WHERE id = 447").get();
  assert.ok(trade447, "Historical trade #447 must exist in database");
  assert.equal(trade447.id, 447, "Trade #447 id must match");
  assert.equal(trade447.close_reason, "TARGET_HIT", "Trade #447 close_reason must match");
  assert.equal(trade447.net_pnl, 539.55, "Trade #447 net_pnl must match");
}

await runGateAsync("Gate 14: Historical SQLite audit ledger and trade #447 are intact", testTradeJournalIntegrity);

console.log("\n================================================================================");
console.log(`STAGE 2 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
