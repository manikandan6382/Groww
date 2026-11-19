import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { MarketScheduler } from "../src/services/engine/marketScheduler.js";
import { ExchangeCalendar } from "../src/services/engine/exchangeCalendar.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../src/db/migrations");
const calendarPath = path.resolve(__dirname, "../data/nse-holidays-2026.json");

console.log("========================================================================");
console.log("   PORTFOLIOX — STAGE 3 STEP 2.1.2: MIGRATION & LEASE VERIFICATION ");
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

function seedTrade(db, { id, status = "OPEN", entryPrice = 100.0, exitPrice = null, symbol = "NIFTY26OCT25000CE" }) {
  db.prepare(`INSERT OR IGNORE INTO accounts (id, name, account_type, market) VALUES (1, 'Paper Account', 'PAPER', 'INDIA')`).run();
  db.prepare(`INSERT OR IGNORE INTO instruments (id, symbol, market, instrument_type, lot_size) VALUES (?, ?, 'INDIA', 'OPTION', 65)`).run(id, symbol);
  db.prepare(`
    INSERT INTO trades (
      id, account_id, instrument_id, trade_mode, trade_type, direction, status,
      entry_datetime, exit_datetime, entry_price, exit_price, quantity, capital_used, position_size
    ) VALUES (
      ?, 1, ?, 'PAPER', 'INTRADAY', 'LONG', ?,
      datetime('now'), ?, ?, ?, 1, 6500.0, 65.0
    )
  `).run(id, id, status, exitPrice ? new Date().toISOString() : null, entryPrice, exitPrice);
  return { id, symbol, status, entryPrice, exitPrice, lotSize: 65, direction: "LONG" };
}

// -----------------------------------------------------------------------------
// PART A: EXISTING-DATABASE MIGRATION COMPATIBILITY
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 1] Existing-Database Migration Compatibility (005 -> 006)");

runTest("Fresh Database: Migrations 001 through 006 apply cleanly with full schema & constraints", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  assert.ok(files.includes("005_eod_squareoff_ledger.sql"), "005 must exist");
  assert.ok(files.includes("006_upgrade_eod_squareoff_ledger.sql"), "006 must exist");

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
  }

  // Verify columns in upgraded table
  const columns = db.prepare("PRAGMA table_info(eod_squareoff_ledger)").all().map(c => c.name);
  const requiredCols = [
    "id", "session_date", "trade_id", "request_key", "worker_id", "lease_epoch",
    "status", "rms_sync_status", "exit_price", "pnl", "reason", "failure_reason",
    "case_code", "claim_expires_at", "created_at", "updated_at"
  ];
  for (const col of requiredCols) {
    assert.ok(columns.includes(col), `Column ${col} must exist in upgraded schema`);
  }

  // Verify unique index
  const index = db.prepare("SELECT * FROM sqlite_master WHERE type = 'index' AND name = 'idx_eod_squareoff_session_trade'").get();
  assert.ok(index, "Unique index idx_eod_squareoff_session_trade must exist");
});

await runAsyncTest("Upgrade from Original Migration 005: Preserves records, audit history & permits new states", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Apply migrations 001 through 004
  for (const file of ["001_trading_journal.sql", "002_paper_lab.sql", "003_add_charges_to_executions.sql", "004_add_idempotency_key.sql"]) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(file);
  }

  // Apply ORIGINAL restrictive migration 005
  const original005Sql = fs.readFileSync(path.join(migrationsDir, "005_eod_squareoff_ledger.sql"), "utf8");
  db.exec(original005Sql);
  db.prepare("INSERT INTO schema_migrations (id) VALUES ('005_eod_squareoff_ledger.sql')").run();

  // Insert mock trades to satisfy foreign key
  seedTrade(db, { id: 101, status: "CLOSED", entryPrice: 100.0, exitPrice: 105.0 });
  seedTrade(db, { id: 102, status: "OPEN", entryPrice: 110.0 });
  seedTrade(db, { id: 103, status: "OPEN", entryPrice: 120.0 });
  seedTrade(db, { id: 104, status: "OPEN", entryPrice: 130.0 });

  // Populate original table with diverse historical states under the restrictive check
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, exit_price, pnl, reason)
    VALUES ('2026-10-14', 101, 'EOD_SQOFF_2026-10-14_101', 'EXECUTED', 105.0, 325.0, 'AUTO_EOD_SQUAREOFF');
  `).run();

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, reason)
    VALUES ('2026-10-14', 102, 'EOD_SQOFF_2026-10-14_102', 'PENDING', 'INITIATING_SQUAREOFF');
  `).run();

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, failure_reason, case_code)
    VALUES ('2026-10-14', 103, 'EOD_SQOFF_2026-10-14_103', 'DEFERRED', 'DEPTH_NULL', 2);
  `).run();

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status, failure_reason)
    VALUES ('2026-10-14', 104, 'EOD_SQOFF_2026-10-14_104', 'FAILED', 'DATABASE_LOCKED');
  `).run();

  // Verify old restrictive check fails on 'CLAIMED'
  assert.throws(() => {
    db.prepare(`
      INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, status)
      VALUES ('2026-10-15', 101, 'TEST_CLAIMED', 'CLAIMED');
    `).run();
  }, /CHECK constraint failed/, "Old schema must reject CLAIMED");

  // NOW APPLY FORWARD MIGRATION 006
  const migration006Sql = fs.readFileSync(path.join(migrationsDir, "006_upgrade_eod_squareoff_ledger.sql"), "utf8");
  db.exec(migration006Sql);
  db.prepare("INSERT INTO schema_migrations (id) VALUES ('006_upgrade_eod_squareoff_ledger.sql')").run();

  // 1. Verify all 4 historical records were preserved intact
  const rows = db.prepare("SELECT * FROM eod_squareoff_ledger ORDER BY trade_id ASC").all();
  assert.equal(rows.length, 4, "All 4 historical records must be preserved");

  const [row101, row102, row103, row104] = rows;
  assert.equal(row101.trade_id, 101);
  assert.equal(row101.status, "RECONCILIATION_REQUIRED", "Ambiguous historical EXECUTED must be marked RECONCILIATION_REQUIRED");
  assert.equal(row101.rms_sync_status, "NOT_STARTED");
  assert.equal(row101.exit_price, 105.0);
  assert.equal(row101.pnl, 325.0);
  assert.equal(row101.lease_epoch, 1);

  assert.equal(row102.trade_id, 102);
  assert.equal(row102.status, "PENDING");
  assert.equal(row102.rms_sync_status, "NOT_STARTED");

  assert.equal(row103.trade_id, 103);
  assert.equal(row103.status, "DEFERRED");
  assert.equal(row103.case_code, 2);

  assert.equal(row104.trade_id, 104);
  assert.equal(row104.status, "FAILED");

  // Verify that on restart, authoritative reconciliation resolves this ambiguity:
  let rmsCalled = false;
  const restartScheduler = new MarketScheduler({
    calendar: new ExchangeCalendar({ calendarPath }),
    workerId: "restart_worker_1",
    db,
    dotnetSquareOffFn: async (id, reason, options) => {
      rmsCalled = true;
      assert.equal(options.idempotencyKey, "EOD_SQOFF_2026-10-14_101");
      return { ok: true, data: { success: true, alreadyClosed: true } };
    },
  });

  const reconResults = await restartScheduler.reconcileAllUnresolvedPositions();
  assert.equal(rmsCalled, true, "Authoritative reconciliation must contact RMS on restart");
  assert.ok(reconResults.some(r => r.tradeId === 101 && r.reconciled === true));

  const reconciledRow101 = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE trade_id = 101").get();
  assert.equal(reconciledRow101.status, "EXECUTED");
  assert.equal(reconciledRow101.rms_sync_status, "RECONCILED");

  // 2. Verify new statuses ('CLAIMED', 'RECONCILIATION_REQUIRED') are now permitted
  seedTrade(db, { id: 105, status: "OPEN", entryPrice: 140.0 });
  seedTrade(db, { id: 106, status: "OPEN", entryPrice: 150.0 });

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at)
    VALUES ('2026-10-15', 105, 'EOD_SQOFF_2026-10-15_105', 'worker_alpha', 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '+30 seconds'));
  `).run();

  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at)
    VALUES ('2026-10-15', 106, 'EOD_SQOFF_2026-10-15_106', 'worker_beta', 1, 'RECONCILIATION_REQUIRED', 'TIMED_OUT', datetime('now', '+30 seconds'));
  `).run();

  const newRows = db.prepare("SELECT status FROM eod_squareoff_ledger WHERE trade_id IN (105, 106)").all();
  assert.equal(newRows[0].status, "CLAIMED");
  assert.equal(newRows[1].status, "RECONCILIATION_REQUIRED");
});

await runAsyncTest("Recovery Integrity: Existing unresolved square-offs from older schema remain fully recoverable", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");

  // Run full migrations
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }

  // Mock trade that was left in PENDING prior to migration upgrade
  seedTrade(db, { id: 201, status: "CLOSED", entryPrice: 100.0, exitPrice: 102.5 });

  // Ledger record migrated from older schema (lease_epoch = 1, worker_id = null, status = 'PENDING')
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, reason)
    VALUES ('2026-10-14', 201, 'EOD_SQOFF_2026-10-14_201', NULL, 1, 'PENDING', 'NOT_STARTED', 'HISTORICAL_UNRESOLVED')
  `).run();

  // A new recovery worker starts up and takes over the historical unowned square-off
  const calendar = new ExchangeCalendar({ calendarPath });
  const scheduler = new MarketScheduler({
    calendar,
    workerId: "recovery_worker_omega",
    db,
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
  });

  // Reconcile pending square-off
  const reconRes = await scheduler.reconcilePendingSquareOff(201, "2026-10-14");
  assert.equal(reconRes.reconciled, true);
  assert.equal(reconRes.status, "EXECUTED");
  assert.equal(reconRes.rmsSyncStatus, "RECONCILED");

  // Verify status is updated to EXECUTED and RECONCILED
  const ledgerRow = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE trade_id = 201").get();
  assert.equal(ledgerRow.status, "EXECUTED");
  assert.equal(ledgerRow.rms_sync_status, "RECONCILED");
});

// -----------------------------------------------------------------------------
// PART B: LEASE EXPIRY, STALE-WORKER SAFETY & FENCING TOKENS
// -----------------------------------------------------------------------------
console.log("\n[TEST GROUP 2] Lease Expiry, Stale-Worker Safety & Distributed Fencing Tokens");

function createTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
  for (const file of files) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  return db;
}

await runAsyncTest("Scenario 1 & 2: Worker A stalls beyond 30s lease; Worker B safely acquires expired claim via CAS takeover", async () => {
  const db = createTestDb();
  const calendar = new ExchangeCalendar({ calendarPath });

  const trade = seedTrade(db, { id: 301, status: "OPEN", entryPrice: 100.0 });

  const mockQuote = {
    ltp: 105.0,
    depth: {
      bids: [{ price: 104.5, quantity: 130 }],
      asks: [{ price: 105.0, quantity: 130 }],
    },
  };

  const item = { trade, tokenKey: "NSE_FO|301" };

  // Worker A claims the trade, but its lease expired 10 seconds ago
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
    ) VALUES (
      '2026-10-15', 301, 'EOD_SQOFF_2026-10-15_301', 'worker_A', 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '-10 seconds'), 'STALLED_CLAIM'
    )
  `).run();

  // Worker B runs recovery square-off
  const workerB = new MarketScheduler({
    calendar,
    workerId: "worker_B",
    db,
    engine: {
      activeTrades: new Map([[301, item]]),
      quoteStore: new Map([["NSE_FO|301", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
    closePaperTradeFn: (tradeId, { price, reason, exactFill }, targetDb) => {
      targetDb.prepare(`
        UPDATE trades
        SET status = 'CLOSED', exit_price = ?, exit_datetime = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(price, tradeId);
      targetDb.prepare(`
        INSERT INTO trade_executions (trade_id, execution_type, price, quantity, execution_datetime)
        VALUES (?, 'EXIT', ?, 65, datetime('now'))
      `).run(tradeId, price);
      return { trade: { id: tradeId, netPnl: (price - 100.0) * 65 } };
    },
  });

  const resB = await workerB._processSinglePositionSquareOff(item, "2026-10-15", db);

  // Worker B must have successfully acquired claim and executed square-off
  assert.equal(resB.executed, true);
  assert.equal(resB.status, "EXECUTED");
  assert.equal(resB.rmsSyncStatus, "SYNCED");

  // Check ledger in DB: worker_id must be worker_B, and lease_epoch must have incremented to 2!
  const ledger = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE trade_id = 301").get();
  assert.equal(ledger.worker_id, "worker_B");
  assert.equal(ledger.lease_epoch, 2, "Lease epoch must increment on CAS takeover");
  assert.equal(ledger.status, "EXECUTED");
  assert.equal(ledger.rms_sync_status, "SYNCED");
});

await runAsyncTest("Scenario 3: Worker A resumes after Worker B took ownership and is strictly FENCED OUT", async () => {
  const db = createTestDb();
  const calendar = new ExchangeCalendar({ calendarPath });

  const trade = seedTrade(db, { id: 302, status: "OPEN", entryPrice: 100.0 });

  const mockQuote = {
    ltp: 105.0,
    depth: {
      bids: [{ price: 104.5, quantity: 130 }],
      asks: [{ price: 105.0, quantity: 130 }],
    },
  };

  const item = { trade, tokenKey: "NSE_FO|302" };

  // Initial state: Worker B currently holds active lease with epoch = 2
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
    ) VALUES (
      '2026-10-15', 302, 'EOD_SQOFF_2026-10-15_302', 'worker_B', 2, 'CLAIMED', 'NOT_STARTED', datetime('now', '+30 seconds'), 'ACTIVE_OWNERSHIP'
    )
  `).run();

  // Worker A wakes up thinking it still owns epoch 1
  const workerA = new MarketScheduler({
    calendar,
    workerId: "worker_A",
    db,
    engine: {
      activeTrades: new Map([[302, item]]),
      quoteStore: new Map([["NSE_FO|302", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
  });

  const resA = await workerA._processSinglePositionSquareOff(item, "2026-10-15", db);

  // Worker A must be rejected due to active claim conflict
  assert.equal(resA.executed, false, "Stale worker A must not execute");
  assert.equal(resA.skipped, true, "Worker A must skip execution");
  assert.match(resA.reason, /CLAIM_CONFLICT/, "Reason must indicate worker B owns claim");

  // Verify database was untouched by Worker A
  const dbTrade = db.prepare("SELECT status FROM trades WHERE id = 302").get();
  assert.equal(dbTrade.status, "OPEN", "Trade must remain OPEN until true lease owner executes");
});

await runAsyncTest("Scenario 4: Stale in-flight Worker A attempting finalize after lease expiry is FENCED OUT at settlement gate", async () => {
  const db = createTestDb();
  const calendar = new ExchangeCalendar({ calendarPath });

  const trade = seedTrade(db, { id: 303, status: "OPEN", entryPrice: 100.0 });

  const mockQuote = {
    ltp: 105.0,
    depth: {
      bids: [{ price: 104.5, quantity: 130 }],
      asks: [{ price: 105.0, quantity: 130 }],
    },
  };

  const item = { trade, tokenKey: "NSE_FO|303" };

  const workerA = new MarketScheduler({
    calendar,
    workerId: "worker_A",
    db,
    engine: {
      activeTrades: new Map([[303, item]]),
      quoteStore: new Map([["NSE_FO|303", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
  });

  // Step 1: Worker A claims the trade
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
    ) VALUES (
      '2026-10-15', 303, 'EOD_SQOFF_2026-10-15_303', 'worker_A', 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '-5 seconds'), 'EXPIRED_LEASE'
    )
  `).run();

  // Step 2: While Worker A was stalled, Worker B acquired the claim and bumped lease_epoch to 2
  db.prepare(`
    UPDATE eod_squareoff_ledger
    SET worker_id = 'worker_B',
        lease_epoch = 2,
        claim_expires_at = datetime('now', '+30 seconds')
    WHERE trade_id = 303
  `).run();

  // Step 3: Worker A now attempts settlement
  // When Worker A calls _processSinglePositionSquareOff, it detects Worker B holds active lease -> Skipped with CLAIM_CONFLICT
  const resA = await workerA._processSinglePositionSquareOff(item, "2026-10-15", db);
  assert.equal(resA.executed, false);
  assert.equal(resA.skipped, true);

  // Verify only 0 exits occurred so far
  const exitCount = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = 303 AND execution_type = 'EXIT'").get();
  assert.equal(exitCount.count, 0, "Zero unauthorized exits from stale worker");
});

await runAsyncTest("Scenario 4b: Worker A validates lease, pauses, Worker B takes ownership & executes; Worker A resumes and is atomically fenced out at SQLite transaction gate", async () => {
  const db = createTestDb();
  const calendar = new ExchangeCalendar({ calendarPath });

  const trade = seedTrade(db, { id: 305, status: "OPEN", entryPrice: 100.0 });

  const mockQuote = {
    ltp: 105.0,
    depth: {
      bids: [{ price: 104.5, quantity: 130 }],
      asks: [{ price: 105.0, quantity: 130 }],
    },
  };

  const item = { trade, tokenKey: "NSE_FO|305" };

  // Worker B
  const workerB = new MarketScheduler({
    calendar,
    workerId: "worker_B",
    db,
    engine: {
      activeTrades: new Map([[305, item]]),
      quoteStore: new Map([["NSE_FO|305", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => ({ ok: true, data: { success: true } }),
    closePaperTradeFn: (tradeId, { price, reason, exactFill }, targetDb) => {
      targetDb.prepare(`
        UPDATE trades
        SET status = 'CLOSED', exit_price = ?, exit_datetime = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(price, tradeId);
      targetDb.prepare(`
        INSERT INTO trade_executions (trade_id, execution_type, price, quantity, execution_datetime)
        VALUES (?, 'EXIT', ?, 65, datetime('now'))
      `).run(tradeId, price);
      return { trade: { id: tradeId, netPnl: (price - 100.0) * 65 } };
    },
  });

  // Step 1: Worker A claimed the trade with epoch 1, but then paused for 35 seconds (lease expired)
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
    ) VALUES (
      '2026-10-15', 305, 'EOD_SQOFF_2026-10-15_305', 'worker_A', 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '-5 seconds'), 'PAUSED_WORKER_A'
    )
  `).run();

  // Step 2: Worker B acquires claim via atomic CAS takeover, bumps epoch to 2, and executes settlement
  const resB = await workerB._processSinglePositionSquareOff(item, "2026-10-15", db);
  assert.equal(resB.executed, true);
  assert.equal(resB.status, "EXECUTED");

  // Step 3: Now Worker A resumes, thinking it still owns epoch 1, and attempts atomic settlement
  let workerAExecutedSettlement = false;
  const workerA = new MarketScheduler({
    calendar,
    workerId: "worker_A",
    db,
    engine: {
      activeTrades: new Map([[305, item]]),
      quoteStore: new Map([["NSE_FO|305", mockQuote]]),
      removeTrade: () => {},
      publish: () => {},
    },
    closePaperTradeFn: () => {
      workerAExecutedSettlement = true;
      return { trade: { id: 305, netPnl: 0 } };
    },
  });

  // Worker A attempts square-off with stale state
  const resA = await workerA._processSinglePositionSquareOff(item, "2026-10-15", db);
  assert.equal(resA.executed, false || resA.alreadyExecuted, "Worker A must not execute new settlement");
  assert.equal(workerAExecutedSettlement, false, "Worker A must be strictly fenced out from trade settlement callback");

  // Invariant check: Exactly 1 exit execution in trade_executions (zero duplicates)
  const exitRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = 305 AND execution_type = 'EXIT'").get();
  assert.equal(exitRows.count, 1, "Strictly 1 exit execution row across both workers");
});

await runAsyncTest("Scenario 5: Crash immediately after SQLite settlement reconciles with 0 duplicate exit rows", async () => {
  const db = createTestDb();
  const calendar = new ExchangeCalendar({ calendarPath });

  // Simulate trade that was closed in SQLite right before crash
  seedTrade(db, { id: 304, status: "CLOSED", entryPrice: 100.0, exitPrice: 105.0 });

  // 1 exit execution already recorded in trade_executions
  db.prepare(`
    INSERT INTO trade_executions (trade_id, execution_type, price, quantity, execution_datetime)
    VALUES (304, 'EXIT', 105.0, 65, datetime('now'))
  `).run();

  // Crashed worker left ledger in CLAIMED with expired lease
  db.prepare(`
    INSERT INTO eod_squareoff_ledger (
      session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
    ) VALUES (
      '2026-10-15', 304, 'EOD_SQOFF_2026-10-15_304', 'crashed_worker', 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '-20 seconds'), 'CRASH_AFTER_SETTLEMENT'
    )
  `).run();

  const trade = { id: 304, symbol: "NIFTY26OCT25000CE", status: "CLOSED", exitPrice: 105.0 };
  const item = { trade, tokenKey: "NSE_FO|304" };

  let rmsCalled = false;
  const recoveryWorker = new MarketScheduler({
    calendar,
    workerId: "recovery_worker_Z",
    db,
    engine: {
      activeTrades: new Map([[304, item]]),
      quoteStore: new Map(),
      removeTrade: () => {},
      publish: () => {},
    },
    dotnetSquareOffFn: async () => {
      rmsCalled = true;
      return { ok: true, data: { success: true } };
    },
  });

  const res = await recoveryWorker._processSinglePositionSquareOff(item, "2026-10-15", db);

  assert.equal(rmsCalled, true, "Recovery worker must call RMS square-off");
  assert.equal(res.executed, true);
  assert.equal(res.alreadyExecuted, true);
  assert.equal(res.status, "EXECUTED");
  assert.equal(res.rmsSyncStatus, "SYNCED");

  // Verify ledger updated
  const ledger = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE trade_id = 304").get();
  assert.equal(ledger.worker_id, "recovery_worker_Z");
  assert.equal(ledger.status, "EXECUTED");
  assert.equal(ledger.rms_sync_status, "SYNCED");

  // Crucial invariant: Exactly 1 exit execution in trade_executions (zero duplicates)
  const execRows = db.prepare("SELECT count(*) as count FROM trade_executions WHERE trade_id = 304 AND execution_type = 'EXIT'").get();
  assert.equal(execRows.count, 1, "Exactly 1 exit execution row must exist, zero duplicate executions");
});

console.log("\n========================================================================");
console.log(`   TOTAL TESTS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log("========================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
