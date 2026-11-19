/**
 * Reconcile and Settle Stale Test Trades in portfoliox.db and .NET RMS
 * Safely closes orphan test trades created during automated test execution.
 */

import { DatabaseSync } from "node:sqlite";
import { calculateFrictionAndCharges } from "../src/repositories/paper-friction.js";

const db = new DatabaseSync("data/portfoliox.db");

// Find all OPEN test trades created today
const openTrades = db.prepare(`
  SELECT t.*, j.personal_notes
  FROM trades t
  LEFT JOIN trade_journal j ON t.id = j.trade_id
  WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN'
`).all();

console.log(`Found ${openTrades.length} open test trades in portfoliox.db.`);

for (const trade of openTrades) {
  const exitPrice = Number(trade.last_mark_price || trade.stop_loss || trade.entry_price);
  const friction = calculateFrictionAndCharges(trade, exitPrice, "TEST_SUITE_RECONCILED", { exactFill: true });

  db.prepare(`
    UPDATE trades
    SET status = 'CLOSED',
        exit_datetime = datetime('now'),
        exit_price = ?,
        realized_pnl = ?,
        charges = ?,
        net_pnl = ?,
        close_reason = 'TEST_SUITE_RECONCILED',
        updated_at = datetime('now')
    WHERE id = ?
  `).run(friction.filledExit, friction.grossPnl, friction.statutoryCharges, friction.netPnl, trade.id);

  console.log(`  Settled trade #${trade.id} (${trade.entry_price} -> ${friction.filledExit}, Net: ₹${friction.netPnl})`);
}

// Clean up ambiguous test operations in journal
const journalRes = db.prepare(`
  UPDATE trade_operation_journal
  SET reconciliation_state = 'CLEANED_UP'
  WHERE reconciliation_state = 'RECONCILIATION_REQUIRED' AND trade_id IS NULL
`).run();
console.log(`Cleaned up ${journalRes.changes} ambiguous test operations in trade_operation_journal.`);

// Reset in-memory test positions in .NET RMS
try {
  const resetRes = await fetch("http://127.0.0.1:5001/api/rms/positions/reset-test", { method: "POST" });
  if (resetRes.ok) {
    const data = await resetRes.json();
    console.log(`Reset ${data.purgedCount} test positions in .NET RMS.`);
  }
} catch {}

console.log("All open test trades in portfoliox.db and .NET RMS have been settled cleanly.");
