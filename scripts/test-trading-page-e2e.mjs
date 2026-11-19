/**
 * scripts/test-trading-page-e2e.mjs
 * End-to-End Trading Page Integration Test Suite (Round 2 Remediation)
 * 
 * Verifies all 14 required E2E assertions with genuine HTTP calls:
 * 1. Deploy (HTTP 201)
 * 2. HTTP server confirmation
 * 3. Exactly one active position
 * 4. Mark update
 * 5. BE/trailing SL update
 * 6. Square-off
 * 7. RMS/server settlement
 * 8. SQLite settlement
 * 9. Client/server settlement parity
 * 10. History/ledger visibility
 * 11. No duplicate lifecycle
 * 12. RMS-unavailable rejection (GENUINE HTTP BOUNDARY)
 * 13. No orphan trade after rejection
 * 14. Deterministic test cleanup
 */

import http from "node:http";
import { getDb } from "../src/db/connection.js";
import { calculateStatutoryCharges, resolveIndexLotSize, isMarketOpenHours } from "../src/client/stores/slices/tradeHelpers.js";
import { normalizeBackendTrade } from "../src/client/stores/slices/tradeNormalizers.js";
import { handleTradingRequest } from "../src/routes/trades.routes.js";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3003";
const DOTNET_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
const TEST_NAMESPACE = "E2E_AUTOMATED_REMEDIATION_VALIDATION";

const results = [];
let passedCount = 0;
let failedCount = 0;
const createdTestTradeIds = [];

function assert(condition, testName, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${testName}: ${message}`);
    results.push({ test: testName, status: "FAIL", message });
    failedCount++;
    throw new Error(`${testName}: ${message}`);
  }
}

function pass(testName, message) {
  console.log(`✅ [PASS] ${testName}: ${message}`);
  results.push({ test: testName, status: "PASS", message });
  passedCount++;
}

function cleanupTradeRecords(db, id) {
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

async function run() {
  console.log("================================================================================");
  console.log("   🧪 PORTFOLIOX — Trading Page E2E Integration Suite (14 Invariant Gates)       ");
  console.log("================================================================================\n");

  const db = getDb();

  // Purge any legacy test leftovers before running
  const staleRows = db.prepare("SELECT trade_id AS id FROM trade_journal WHERE personal_notes LIKE ? UNION SELECT id FROM trades WHERE idempotency_key LIKE 'e2e_%'").all(`%${TEST_NAMESPACE}%`);
  for (const r of staleRows) {
    cleanupTradeRecords(db, r.id);
  }

  try {
    // ---------------------------------------------------------------------------
    // Gate 0: Pre-Flight Health Check
    // ---------------------------------------------------------------------------
    console.log("--- Pre-Flight Server Connectivity ---");
    const dotnetHealth = await fetch(`${DOTNET_URL}/api/health`).then(r => r.json()).catch(() => null);
    assert(dotnetHealth && dotnetHealth.status === "healthy", "PREFLIGHT-01", `.NET RMS backend must be healthy at ${DOTNET_URL}`);
    pass("PREFLIGHT-01", `.NET RMS gateway active: ${dotnetHealth.engine} (status: ${dotnetHealth.status})`);

    const nodeStatus = await fetch(`${BASE_URL}/api/paper-lab/live-status`).then(r => r.json()).catch(() => null);
    assert(nodeStatus && nodeStatus.running === true, "PREFLIGHT-02", `Frontend/API server must be responsive at ${BASE_URL}`);
    pass("PREFLIGHT-02", `Trading server live: status=${nodeStatus.status}, activePositions=${nodeStatus.activeTrades}`);

    // ---------------------------------------------------------------------------
    // Gate 1 & 2: Deploy & Server Confirmation (HTTP 201)
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 1 & 2: Deploy & HTTP Server Confirmation ---");
    const idempotencyKey = `e2e_deploy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderPayload = {
      symbol: "NIFTY 24500 CE",
      underlyingSymbol: "NIFTY",
      strikePrice: 24500,
      entryPrice: 100.0,
      stopLoss: 96.0,
      targetPrice: 108.0,
      quantity: 1,
      lotSize: 65,
      direction: "LONG",
      feedMode: "LIVE",
      simulateSlippage: false,
      bypassDailyLoss: true,
      testingMode: true,
      personalNotes: `[${TEST_NAMESPACE}] Verification Order`,
      idempotencyKey
    };

    const deployRes = await fetch(`${BASE_URL}/api/paper-lab/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    assert(deployRes.status === 201, "GATE-01", `Deploy request must return HTTP 201 Created (got ${deployRes.status})`);
    pass("GATE-01", "Order deployment returned HTTP 201 Created");

    const deployData = await deployRes.json();
    assert(deployData.item && deployData.item.id > 0, "GATE-02", "Deploy response must contain created trade with valid ID");
    const tradeId = deployData.item.id;
    createdTestTradeIds.push(tradeId);
    pass("GATE-02", `HTTP server confirmation verified: Trade #${tradeId} created with valid server ID`);

    // ---------------------------------------------------------------------------
    // Gate 3: Exactly One Active Position
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 3: Exactly One Active Position ---");
    const openTradeCount = db.prepare("SELECT COUNT(*) AS c FROM trades WHERE status = 'OPEN' AND trade_mode = 'PAPER'").get().c;
    assert(openTradeCount === 1, "GATE-03", `Exactly one active position must exist in SQLite (got ${openTradeCount})`);
    pass("GATE-03", `Active position invariant verified: Exactly ${openTradeCount} open position running in SQLite`);

    // ---------------------------------------------------------------------------
    // Gate 4: Mark-Price Update
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 4: Mark-Price Telemetry Update ---");
    const markRes = await fetch(`${BASE_URL}/api/paper-lab/trades/${tradeId}/mark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: 104.0, reason: "MARK_ONLY" })
    });
    assert(markRes.status === 200, "GATE-04", `Mark endpoint must return HTTP 200 (got ${markRes.status})`);
    const markedTrade = db.prepare("SELECT last_mark_price, status FROM trades WHERE id = ?").get(tradeId);
    assert(Number(markedTrade.last_mark_price) === 104.0, "GATE-04-DB", `Last mark price in SQLite must update to 104.0 (got ${markedTrade.last_mark_price})`);
    assert(markedTrade.status === "OPEN", "GATE-04-STATUS", "Trade must remain OPEN after non-triggering mark");
    pass("GATE-04", `Mark price telemetry updated to ₹104.00 in SQLite with OPEN status preserved`);

    // ---------------------------------------------------------------------------
    // Gate 5: Canonical Breakeven Friction & Trailing SL Update
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 5: Canonical BE Friction & Trailing SL Update ---");
    const entry = 100.0;
    const units = 65;
    const canonicalCharges = calculateStatutoryCharges(entry, entry, units, "LONG");
    assert(canonicalCharges > 0 && canonicalCharges < 100, "GATE-05-CHARGES", `Canonical statutory charges must be realistic (got ₹${canonicalCharges})`);

    const newSl = 102.0; // Trailed SL locked in profit
    const slRes = await fetch(`${BASE_URL}/api/paper-lab/trades/${tradeId}/stop-loss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopLoss: newSl })
    });
    assert(slRes.status === 200, "GATE-05", `Stop-loss update must return HTTP 200 (got ${slRes.status})`);
    const sqliteSl = db.prepare("SELECT stop_loss FROM trades WHERE id = ?").get(tradeId);
    assert(Number(sqliteSl.stop_loss) === newSl, "GATE-05-DB", `Stop-loss in SQLite must be ₹${newSl} (got ₹${sqliteSl.stop_loss})`);
    pass("GATE-05", `Stop-loss trailed to ₹${newSl} with canonical statutory charges (₹${canonicalCharges})`);

    // ---------------------------------------------------------------------------
    // Gate 6, 7 & 8: Square-off & Authoritative Settlement (RMS + SQLite)
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 6, 7 & 8: Square-off & Authoritative Settlement ---");
    const exitPriceTarget = 105.0;
    const closeRes = await fetch(`${BASE_URL}/api/paper-lab/trades/${tradeId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: exitPriceTarget, reason: "MANUAL_EXIT" })
    });
    assert(closeRes.status === 200, "GATE-06", `Close endpoint must return HTTP 200 (got ${closeRes.status})`);
    const closeData = await closeRes.json();
    const returnedTrade = closeData.trade || closeData.item;
    assert(returnedTrade != null, "GATE-07-ITEM", "Close response must contain settled trade");
    assert(returnedTrade.status === "CLOSED", "GATE-07-STATUS", `Trade status in close response must be CLOSED (got ${returnedTrade.status})`);
    pass("GATE-06", "Square-off dispatch returned HTTP 200 OK");
    pass("GATE-07", "Server RMS settlement confirmed trade status as CLOSED");

    const settledDbTrade = db.prepare("SELECT * FROM trades WHERE id = ?").get(tradeId);
    assert(settledDbTrade.status === "CLOSED", "GATE-08-STATUS", `SQLite status must be CLOSED (got ${settledDbTrade.status})`);
    assert(Number(settledDbTrade.exit_price) > 0, "GATE-08-EXIT", "SQLite exit price must be positive");
    const grossPnl = Number(settledDbTrade.realized_pnl);
    const charges = Number(settledDbTrade.charges);
    const netPnl = Number(settledDbTrade.net_pnl);
    const expectedNet = Number((grossPnl - charges).toFixed(2));
    assert(Math.abs(netPnl - expectedNet) < 0.02, "GATE-08-MATH",
      `Financial math Net = Gross - Charges: ${netPnl} vs ${expectedNet} (Gross: ${grossPnl}, Charges: ${charges})`);
    pass("GATE-08", `SQLite authoritative settlement confirmed: Exit=₹${settledDbTrade.exit_price}, Gross=₹${grossPnl}, Charges=₹${charges}, Net=₹${netPnl}`);

    // ---------------------------------------------------------------------------
    // Gate 9: Client/Server Settlement Parity (Zero Drift)
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 9: Client/Server Settlement Parity ---");
    const clientNormalized = normalizeBackendTrade(returnedTrade);
    assert(clientNormalized.status === "CLOSED", "GATE-09-STATUS", "Client normalized trade status must be CLOSED");
    assert(Math.abs(clientNormalized.netPnl - netPnl) < 0.02, "GATE-09-NET",
      `Zero Parity Drift: Client Net ₹${clientNormalized.netPnl} === SQLite Net ₹${netPnl}`);
    assert(Math.abs(clientNormalized.grossPnl - grossPnl) < 0.02, "GATE-09-GROSS",
      `Zero Parity Drift: Client Gross ₹${clientNormalized.grossPnl} === SQLite Gross ₹${grossPnl}`);
    pass("GATE-09", `Client/Server settlement parity verified: Zero parity drift across Net (₹${netPnl}) and Gross (₹${grossPnl})`);

    // ---------------------------------------------------------------------------
    // Gate 10: History / Ledger Visibility Over HTTP
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 10: History / Ledger Visibility Over HTTP ---");
    const historyRes = await fetch(`${BASE_URL}/api/trades?range=today&tradeMode=PAPER`);
    assert(historyRes.status === 200, "GATE-10-HTTP", `History endpoint must return HTTP 200 (got ${historyRes.status})`);
    const historyData = await historyRes.json();
    const tradeInHistory = (historyData.items || []).find(t => t.id === tradeId);
    assert(tradeInHistory != null, "GATE-10-FOUND", `Trade #${tradeId} must be visible in history items ledger over HTTP`);
    assert(tradeInHistory.status === "CLOSED", "GATE-10-STATUS", "History trade status must be CLOSED");
    pass("GATE-10", `History ledger visibility confirmed: Trade #${tradeId} present in GET /api/trades with CLOSED status`);

    // ---------------------------------------------------------------------------
    // Gate 11: No Duplicate Lifecycle Execution
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 11: No Duplicate Lifecycle Execution ---");
    const duplicateCloseRes = await fetch(`${BASE_URL}/api/paper-lab/trades/${tradeId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: exitPriceTarget, reason: "MANUAL_EXIT" })
    });
    assert(duplicateCloseRes.status === 200, "GATE-11-HTTP", `Duplicate close must return HTTP 200 indicating settled/no-op (got ${duplicateCloseRes.status})`);
    const duplicateData = await duplicateCloseRes.json();
    assert(duplicateData.success === true || duplicateData.message?.includes("already closed") || duplicateData.message?.includes("settled"),
      "GATE-11-NOOP", "Duplicate close must report trade already settled");
    // Ensure no duplicate execution record was added in trade_executions
    const executionRows = db.prepare("SELECT COUNT(*) AS c FROM trade_executions WHERE trade_id = ? AND execution_type = 'EXIT'").get(tradeId).c;
    assert(executionRows === 1, "GATE-11-COUNT", `Exactly one EXIT execution must exist in DB (got ${executionRows})`);
    pass("GATE-11", "Duplicate lifecycle prevention verified: Second close call rejected duplicate execution");

    // ---------------------------------------------------------------------------
    // Gate 12 & 13: RMS Unavailable Rejection & No Orphan Trade (GENUINE HTTP FLOW)
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 12 & 13: RMS-Unavailable Rejection (GENUINE HTTP BOUNDARY) ---");
    const originalRmsUrl = process.env.DOTNET_RMS_URL;
    let ephemeralServer = null;
    try {
      // Set unroutable RMS URL to trigger gateway connection failure
      process.env.DOTNET_RMS_URL = "http://127.0.0.1:59999";

      // Spin up an ephemeral Node HTTP server on an OS-assigned port
      ephemeralServer = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const handled = await handleTradingRequest(req, res, url);
          if (!handled) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
          }
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      await new Promise((resolve) => ephemeralServer.listen(0, "127.0.0.1", resolve));
      const ephemeralPort = ephemeralServer.address().port;
      const ephemeralUrl = `http://127.0.0.1:${ephemeralPort}`;

      const countBefore = db.prepare("SELECT COUNT(*) AS c FROM trades").get().c;
      const negIdempotencyKey = `e2e_neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Execute genuine HTTP fetch request across network boundary
      const negRes = await fetch(`${ephemeralUrl}/api/paper-lab/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "NIFTY 24500 CE",
          underlyingSymbol: "NIFTY",
          strikePrice: 24500,
          entryPrice: 100.0,
          stopLoss: 96.0,
          targetPrice: 108.0,
          quantity: 1,
          lotSize: 65,
          direction: "LONG",
          feedMode: "LIVE",
          bypassDailyLoss: true,
          testingMode: true,
          personalNotes: `[${TEST_NAMESPACE}] RMS Negative Test Order`,
          idempotencyKey: negIdempotencyKey
        })
      });

      assert(negRes.status === 503, "GATE-12", `Must return HTTP 503 Service Unavailable when RMS is unreachable (got ${negRes.status})`);
      const negProblem = await negRes.json();
      assert(negProblem.type === "https://tools.ietf.org/html/rfc7807", "GATE-12-TYPE", "Response must be RFC 7807 problem details format");
      assert(negProblem.title === "RMS Gateway Unavailable", "GATE-12-TITLE", `Title must indicate 'RMS Gateway Unavailable' (got '${negProblem.title}')`);
      assert(Array.isArray(negProblem.errors) && negProblem.errors.length > 0, "GATE-12-ERRORS", "Problem must contain error details array");
      pass("GATE-12", `RMS-unavailable rejection verified over genuine HTTP: HTTP 503 RFC 7807 Problem Details returned`);

      const countAfter = db.prepare("SELECT COUNT(*) AS c FROM trades").get().c;
      assert(countBefore === countAfter, "GATE-13", `No active trade may be created when RMS fails (trades count before=${countBefore}, after=${countAfter})`);
      pass("GATE-13", `No orphan trade persisted: SQLite trade count unchanged (${countBefore}) on RMS rejection`);
    } finally {
      process.env.DOTNET_RMS_URL = originalRmsUrl || "http://127.0.0.1:5001";
      if (ephemeralServer) {
        await new Promise((resolve) => ephemeralServer.close(resolve));
      }
    }

  } finally {
    // ---------------------------------------------------------------------------
    // Gate 14: Deterministic E2E Test Cleanup
    // ---------------------------------------------------------------------------
    console.log("\n--- Gate 14: Deterministic E2E Test Cleanup ---");
    let cleanedCount = 0;
    for (const id of createdTestTradeIds) {
      cleanupTradeRecords(db, id);
      cleanedCount++;
    }
    // Also clean up any namespace-tagged or idempotency-tagged test records
    const leftoverRows = db.prepare("SELECT trade_id AS id FROM trade_journal WHERE personal_notes LIKE ? UNION SELECT id FROM trades WHERE idempotency_key LIKE 'e2e_%'").all(`%${TEST_NAMESPACE}%`);
    for (const r of leftoverRows) {
      cleanupTradeRecords(db, r.id);
      cleanedCount++;
    }

    const lingering = db.prepare("SELECT COUNT(*) AS c FROM trades WHERE idempotency_key LIKE 'e2e_%'").get().c;
    assert(lingering === 0, "GATE-14", `All test trades must be purged from database (lingering: ${lingering})`);
    pass("GATE-14", `Deterministic cleanup confirmed: ${cleanedCount} test trade records purged; zero ledger pollution`);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`   🏁 ALL 14 INVARIANT GATES PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
