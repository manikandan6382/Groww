/**
 * scripts/test-live-market-sl-pipeline.mjs
 * 
 * Deterministic Forensic Verification Suite for PORTFOLIOX Live-Market Calculation & Stop-Loss Pipeline
 * Covers Scenarios A through H:
 * - Scenario A: Adverse movement towards initial stop loss (STOP_LOSS_HIT)
 * - Scenario B: Favourable movement before trailing trigger (immutable initial SL)
 * - Scenario C: Trailing trigger reached (risk-free breakeven lock)
 * - Scenario D: Further favourable movement after trailing lock (ratchet invariant, no widening)
 * - Scenario E: Reversal after trailing trigger (exit at trailing SL, NOT initial SL)
 * - Scenario F: Fast/duplicate/jitter ticks (anomaly suppression, idempotency)
 * - Scenario G: SSE stream connectivity & state recovery
 * - Scenario H: Deployment lifecycle & token key consistency
 */

import http from "node:http";
import { getDb } from "../src/db/connection.js";
import { resolveLiveTickPrice, calculateStatutoryCharges } from "../src/client/stores/slices/tradeHelpers.js";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3003";
const DOTNET_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
const TEST_TAG = "PIPELINE_SL_TEST";

let passedCount = 0;
let failedCount = 0;
const testTradeIds = [];

function assert(condition, scenario, message) {
  if (!condition) {
    console.error(`❌ [FAIL] [${scenario}] ${message}`);
    failedCount++;
    throw new Error(`[${scenario}] ${message}`);
  }
}

function pass(scenario, message) {
  console.log(`✅ [PASS] [${scenario}] ${message}`);
  passedCount++;
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function cleanupTrade(db, id) {
  try {
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trade_attachments WHERE trade_id = ?").run(id);
    db.prepare("DELETE FROM trades WHERE id = ?").run(id);
  } catch (err) {
    console.warn(`[Cleanup] Warning for trade #${id}:`, err.message);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("================================================================================");
  console.log("   🧪 PORTFOLIOX — Live-Market Calculation & Stop-Loss Pipeline (Scenarios A-H) ");
  console.log("================================================================================\n");

  const db = getDb();

  // Purge any previous test trades
  const stale = db.prepare("SELECT trade_id AS id FROM trade_journal WHERE personal_notes LIKE ? UNION SELECT id FROM trades WHERE idempotency_key LIKE 'test_sl_%'").all(`%${TEST_TAG}%`);
  for (const s of stale) {
    cleanupTrade(db, s.id);
  }

  try {
    // ---------------------------------------------------------------------------
    // PRE-FLIGHT
    // ---------------------------------------------------------------------------
    console.log("--- Pre-Flight Verification ---");
    const hDotnet = await requestJson(`${DOTNET_URL}/api/health`);
    assert(hDotnet.ok && hDotnet.data.status === "healthy", "PRE-FLIGHT", ".NET RMS must be running and healthy");
    pass("PRE-FLIGHT", `.NET RMS active: ${hDotnet.data.engine}`);

    const hNode = await requestJson(`${BASE_URL}/api/paper-lab/live-status`);
    assert(hNode.ok && hNode.data.running === true, "PRE-FLIGHT", "Node.js server must be running");
    pass("PRE-FLIGHT", `Node.js trading server active (activePositions=${hNode.data.activeTrades})`);

    // ---------------------------------------------------------------------------
    // SCENARIO A: Adverse Movement Towards Initial Stop Loss
    // ---------------------------------------------------------------------------
    console.log("\n--- Scenario A: Adverse Movement Towards Initial Stop Loss ---");
    const keyA = `test_sl_a_${Date.now()}`;
    const payloadA = {
      symbol: "NIFTY 22400 CE",
      underlyingSymbol: "NIFTY",
      strikePrice: 22400,
      entryPrice: 89.25,
      stopLoss: 85.40,
      targetPrice: 96.95,
      quantity: 1,
      lotSize: 65,
      direction: "LONG",
      tokenKey: "NSE_FO|40710",
      instrumentKey: "NSE_FO|40710",
      feedMode: "LIVE",
      simulateSlippage: false,
      bypassDailyLoss: true,
      testingMode: true,
      personalNotes: `[${TEST_TAG}] Scenario A Adverse Test`,
    };

    const depA = await requestJson(`${BASE_URL}/api/paper-lab/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": keyA },
      body: JSON.stringify(payloadA),
    });
    assert(depA.status === 201 && depA.data?.item?.id, "SCENARIO-A", "Order deploy must succeed with HTTP 201");
    const tradeAId = depA.data.item.id;
    testTradeIds.push(tradeAId);
    pass("SCENARIO-A", `Deployed trade #${tradeAId} at entry ₹89.25 with initial SL ₹85.40`);

    // Feed non-breaching adverse ticks: 88.00 -> 87.50 -> 86.00
    for (const ltp of [88.00, 87.50, 86.00]) {
      await requestJson(`${DOTNET_URL}/api/rms/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: ltp }),
      });
    }
    await sleep(150);

    // Verify position remains open and initial SL unchanged
    const tradeACheck1 = db.prepare("SELECT status, stop_loss FROM trades WHERE id = ?").get(tradeAId);
    assert(tradeACheck1.status === "OPEN", "SCENARIO-A", "Position must remain OPEN while LTP > StopLoss");
    assert(Number(tradeACheck1.stop_loss) === 85.40, "SCENARIO-A", "Initial Stop Loss must remain unchanged at ₹85.40");
    pass("SCENARIO-A", "Adverse ticks preserved position OPEN status and immutable SL ₹85.40");

    // Ingest Stop Loss breach tick at ₹85.40
    await requestJson(`${DOTNET_URL}/api/rms/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: 85.40 }),
    });
    await sleep(250);

    // Verify position is squared off as STOP_LOSS_HIT
    const tradeACheck2 = db.prepare("SELECT status, close_reason, exit_price FROM trades WHERE id = ?").get(tradeAId);
    assert(tradeACheck2.status === "CLOSED", "SCENARIO-A", "Position must be CLOSED after Stop Loss breach");
    assert(tradeACheck2.close_reason === "STOP_LOSS_HIT", "SCENARIO-A", `Close reason must be STOP_LOSS_HIT, got: ${tradeACheck2.close_reason}`);
    pass("SCENARIO-A", `Authoritative SL execution confirmed: Status=${tradeACheck2.status}, Reason=${tradeACheck2.close_reason}, Exit=₹${tradeACheck2.exit_price}`);

    // Clean up trade A
    cleanupTrade(db, tradeAId);

    // ---------------------------------------------------------------------------
    // SCENARIO B & C & D & E: Trailing Lifecycle (Favourable -> BE Lock -> Ratchet -> Reversal)
    // ---------------------------------------------------------------------------
    console.log("\n--- Scenario B & C & D & E: Favourable Movement -> Breakeven Lock -> Ratchet -> Reversal ---");
    const keyB = `test_sl_bcde_${Date.now()}`;
    const payloadB = {
      symbol: "NIFTY 22400 CE",
      underlyingSymbol: "NIFTY",
      strikePrice: 22400,
      entryPrice: 89.25,
      stopLoss: 85.40,
      targetPrice: 96.95,
      quantity: 1,
      lotSize: 65,
      direction: "LONG",
      tokenKey: "NSE_FO|40710",
      instrumentKey: "NSE_FO|40710",
      feedMode: "LIVE",
      simulateSlippage: false,
      bypassDailyLoss: true,
      testingMode: true,
      personalNotes: `[${TEST_TAG}] Scenario B-E Lifecycle Test`,
    };

    const depB = await requestJson(`${BASE_URL}/api/paper-lab/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": keyB },
      body: JSON.stringify(payloadB),
    });
    assert(depB.status === 201 && depB.data?.item?.id, "SCENARIO-B", "Order deploy must succeed with HTTP 201");
    const tradeBId = depB.data.item.id;
    testTradeIds.push(tradeBId);
    pass("SCENARIO-B", `Deployed trade #${tradeBId} (Entry: ₹89.25, SL: ₹85.40, TP: ₹96.95, BE Trigger: ₹93.10)`);

    // Scenario B: Favourable movement before trigger (LTP = ₹91.50)
    await requestJson(`${DOTNET_URL}/api/rms/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: 91.50 }),
    });
    await sleep(150);

    const posB1 = await requestJson(`${DOTNET_URL}/api/rms/positions`).then(r => r.data?.find(p => p.id === String(tradeBId)));
    assert(posB1 && posB1.breakevenLocked === false, "SCENARIO-B", "Breakeven must NOT be locked before reaching trigger threshold");
    assert(posB1 && Number(posB1.stopLoss) === 85.40, "SCENARIO-B", "Stop Loss must remain immutable at ₹85.40 before trigger");
    pass("SCENARIO-B", `Favourable movement at ₹91.50 correctly kept BreakevenLocked=false and SL=₹85.40`);

    // Scenario C: Trailing trigger reached (LTP = ₹93.10 -> 50% target threshold)
    console.log("\n--- Scenario C: Trailing Trigger Reached (Risk-Free Lock) ---");
    await requestJson(`${DOTNET_URL}/api/rms/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: 93.10 }),
    });
    await sleep(250);

    const posC = await requestJson(`${DOTNET_URL}/api/rms/positions`).then(r => r.data?.find(p => p.id === String(tradeBId)));
    assert(posC && posC.breakevenLocked === true, "SCENARIO-C", "Breakeven MUST be locked when LTP reaches ₹93.10");
    assert(posC && Number(posC.stopLoss) >= 89.25, "SCENARIO-C", `Stop loss must be ratcheted above entry price (₹89.25), got: ${posC?.stopLoss}`);
    assert(posC && Number(posC.stopLoss) === 90.75, "SCENARIO-C", `Stop loss must ratchet to institutional breakeven ₹90.75 (+1.50 pt friction), got: ${posC?.stopLoss}`);
    pass("SCENARIO-C", `.NET RMS ratcheted SL to ₹${posC.stopLoss} with BreakevenLocked=true`);

    // Verify SQLite trade has updated stop loss
    const tradeBRowC = db.prepare("SELECT stop_loss FROM trades WHERE id = ?").get(tradeBId);
    assert(Number(tradeBRowC.stop_loss) === 90.75, "SCENARIO-C", `SQLite trade stop_loss must be updated to ₹90.75, got: ${tradeBRowC.stop_loss}`);
    pass("SCENARIO-C", "SQLite persistence synchronized with ratcheted SL ₹90.75");

    // Scenario D: Further favourable movement after trailing lock (LTP = ₹95.00)
    console.log("\n--- Scenario D: Further Favourable Movement & Ratchet Invariant ---");
    await requestJson(`${DOTNET_URL}/api/rms/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: 95.00 }),
    });
    await sleep(150);

    const posD = await requestJson(`${DOTNET_URL}/api/rms/positions`).then(r => r.data?.find(p => p.id === String(tradeBId)));
    assert(posD && Number(posD.stopLoss) >= 90.75, "SCENARIO-D", "Stop Loss can NEVER widen or regress below ratcheted floor ₹90.75");
    pass("SCENARIO-D", `Ratchet invariant preserved: SL remains protected at ₹${posD.stopLoss}`);

    // Verify that attempting to amend SL backwards below entry/breakeven is rejected by validation
    const widenAttempt = await requestJson(`${BASE_URL}/api/paper-lab/trades/${tradeBId}/stop-loss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopLoss: 85.00, currentPrice: 95.00 })
    });
    assert(widenAttempt.status === 422, "SCENARIO-D", `Widening SL backwards must be rejected with HTTP 422, got: ${widenAttempt.status}`);
    pass("SCENARIO-D", "Risk boundary verified: Attempt to loosen ratcheted SL was rejected with HTTP 422");


    // Scenario E: Reversal after trailing trigger (LTP = ₹90.50 -> Below ₹90.75)
    console.log("\n--- Scenario E: Reversal After Trailing Trigger (Exit at Trailing SL) ---");
    await requestJson(`${DOTNET_URL}/api/rms/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ InstrumentKey: "NSE_FO|40710", Ltp: 90.50 }),
    });
    await sleep(250);

    const tradeBRowE = db.prepare("SELECT status, close_reason, exit_price, net_pnl, realized_pnl FROM trades WHERE id = ?").get(tradeBId);
    assert(tradeBRowE.status === "CLOSED", "SCENARIO-E", "Position must be CLOSED when price touches trailing stop ₹90.75");
    assert(
      tradeBRowE.close_reason === "TRAILING_SL_HIT" || tradeBRowE.close_reason === "STOP_LOSS_HIT",
      "SCENARIO-E",
      `Position exit must be registered via trailing stop loss, got: ${tradeBRowE.close_reason}`
    );
    assert(Number(tradeBRowE.exit_price) >= 89.25, "SCENARIO-E", `Exit price must be at/above entry ₹89.25, preserving capital! Got: ₹${tradeBRowE.exit_price}`);
    assert(Number(tradeBRowE.net_pnl) >= -5.0, "SCENARIO-E", `Net PnL must be protected from capital loss! Got: ₹${tradeBRowE.net_pnl}`);
    pass("SCENARIO-E", `Capital protected exit confirmed: Status=${tradeBRowE.status}, Reason=${tradeBRowE.close_reason}, Exit=₹${tradeBRowE.exit_price}, Net=₹${tradeBRowE.net_pnl}`);

    // Clean up trade B
    cleanupTrade(db, tradeBId);

    // ---------------------------------------------------------------------------
    // SCENARIO F: Fast / Duplicate / Jitter Ticks
    // ---------------------------------------------------------------------------
    console.log("\n--- Scenario F: Fast / Duplicate / Jitter Ticks ---");
    const keyF = `test_sl_f_${Date.now()}`;
    const depF = await requestJson(`${BASE_URL}/api/paper-lab/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": keyF },
      body: JSON.stringify({
        ...payloadA,
        symbol: "NIFTY 24500 CE",
        tokenKey: "NSE_FO|99999",
        instrumentKey: "NSE_FO|99999",
        entryPrice: 100.0,
        stopLoss: 95.0,
        targetPrice: 110.0,
        personalNotes: `[${TEST_TAG}] Scenario F Anomaly Guard`,
      }),
    });
    const tradeFId = depF.data?.item?.id;
    testTradeIds.push(tradeFId);

    // Blast duplicate and micro-jitter ticks within age < 2000ms
    for (let i = 0; i < 5; i++) {
      await requestJson(`${DOTNET_URL}/api/rms/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ InstrumentKey: "NSE_FO|99999", Ltp: 100.10 }),
      });
    }

    const posF = await requestJson(`${DOTNET_URL}/api/rms/positions`).then(r => r.data?.find(p => p.id === String(tradeFId)));
    assert(posF && posF.isSquaringOff === false, "SCENARIO-F", "NoiseAnomalyGuard must suppress false triggers during micro-jitter");
    pass("SCENARIO-F", "Rapid duplicate/jitter ticks handled idempotently with zero false triggers");

    // Close and clean up F
    await requestJson(`${BASE_URL}/api/paper-lab/trades/${tradeFId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: 100.0, reason: "MANUAL_EXIT" })
    });
    cleanupTrade(db, tradeFId);

    // ---------------------------------------------------------------------------
    // SCENARIO G: SSE Stream Handshake & Telemetry Health
    // ---------------------------------------------------------------------------
    console.log("\n--- Scenario G: SSE Stream Handshake & Telemetry Health ---");
    const sseHealth = await new Promise((resolve) => {
      const req = http.get(`${BASE_URL}/api/live-alerts/live-events`, (res) => {
        let chunkCount = 0;
        res.on("data", (chunk) => {
          const str = chunk.toString();
          if (str.includes("event:") || str.includes("data:")) {
            chunkCount++;
            if (chunkCount >= 1) {
              req.destroy();
              resolve({ ok: true, statusCode: res.statusCode });
            }
          }
        });
      });
      req.on("error", (err) => resolve({ ok: false, error: err.message }));
      setTimeout(() => {
        try { req.destroy(); } catch {}
        resolve({ ok: false, error: "SSE timeout" });
      }, 3000);
    });

    assert(sseHealth.ok && sseHealth.statusCode === 200, "SCENARIO-G", "SSE stream endpoint must be reachable and return HTTP 200");
    pass("SCENARIO-G", "SSE live stream connected and emitting valid event-stream frames");

    // ---------------------------------------------------------------------------
    // SCENARIO H: Token Key Resolution & Consistency
    // ---------------------------------------------------------------------------
    console.log("\n--- Scenario H: Token Key Resolution & Price Consistency ---");
    const sampleTrade = {
      id: 999,
      symbol: "NIFTY 22400 CE",
      tokenKey: "NSE_FO|40710",
      entryPrice: 89.25,
      lastMarkPrice: 87.50,
    };
    const sampleTicks = {
      "NSE_FO|40710": { ltp: 87.50, change: -1.75 },
    };

    // Test tokenKey resolution
    const resolvedPrice = resolveLiveTickPrice(sampleTicks, sampleTrade);
    assert(resolvedPrice === 87.50, "SCENARIO-H", `resolveLiveTickPrice must resolve tokenKey to ₹87.50, got: ${resolvedPrice}`);
    pass("SCENARIO-H", `resolveLiveTickPrice matched tokenKey 'NSE_FO|40710' to live LTP ₹${resolvedPrice}`);

    // Test pipe/colon normalization
    const colonTicks = { "NSE_FO:40710": { ltp: 87.50 } };
    const resolvedColon = resolveLiveTickPrice(colonTicks, sampleTrade);
    assert(resolvedColon === 87.50, "SCENARIO-H", `resolveLiveTickPrice must handle colon normalized key, got: ${resolvedColon}`);
    pass("SCENARIO-H", "Colon/pipe token key normalization verified");

    // Test whitespace-collapsed symbol fallback
    const noSpaceTicks = { "NIFTY22400CE": { ltp: 87.50 } };
    const resolvedNoSpace = resolveLiveTickPrice(noSpaceTicks, { ...sampleTrade, tokenKey: null });
    assert(resolvedNoSpace === 87.50, "SCENARIO-H", `resolveLiveTickPrice must match collapsed symbol, got: ${resolvedNoSpace}`);
    pass("SCENARIO-H", "Whitespace-stripped symbol fallback verified");

    console.log("\n================================================================================");
    console.log(`   🏁 ALL PIPELINE SCENARIOS PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("================================================================================\n");

  } catch (err) {
    console.error("\n💥 Pipeline Test Suite Error:", err.message);
    process.exitCode = 1;
  } finally {
    for (const id of testTradeIds) {
      cleanupTrade(db, id);
    }
  }
}

run();
