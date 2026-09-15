import { getDb } from "../../db/connection.js";
import { getTradeById } from "../../repositories/trades.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { sendJson } from "./route-helpers.js";

export function handlePaperPartialClose(id, body, res) {
  const db = getDb();
  const remainingQty = Number(body.remainingQuantity ?? body.quantity ?? 1);
  const newStopLoss = Number(body.stopLoss || 0);
  const exitPrice = Number(body.exitPrice || 0);
  const scaledLots = Number(body.scaledLots || 0);
  const netPnl = Number(body.netPnl || 0);
  const grossPnl = Number(body.grossPnl || netPnl);
  const charges = Number(body.charges || 56.0);
  const closeReason = body.closeReason || "PAY_MYSELF_T1";
  const exitDatetime = new Date().toISOString().replace("T", " ").substring(0, 19);

  let trade = null;
  try {
    trade = getTradeById(id);
  } catch (e) { /* ignore */ }

  db.exec("BEGIN;");
  try {
    if (trade && scaledLots > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO trades (
          account_id, instrument_id, trade_mode, trade_type, direction,
          status, entry_datetime, exit_datetime, entry_price, exit_price,
          quantity, target_price, stop_loss, realized_pnl, charges, net_pnl,
          close_reason, last_mark_price, last_marked_at
        ) VALUES (?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(
        trade.accountId || 1,
        trade.instrumentId || 1,
        trade.tradeMode || "PAPER",
        trade.tradeType || "INTRADAY",
        trade.direction || "LONG",
        trade.entryDatetime || exitDatetime,
        exitDatetime,
        trade.entryPrice,
        exitPrice,
        scaledLots,
        trade.targetPrice,
        newStopLoss,
        grossPnl,
        charges,
        netPnl,
        closeReason,
        exitPrice,
        exitDatetime
      );

      try {
        db.prepare(`
          INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, charges, notes)
          VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
        `).run(trade.id, exitDatetime, exitPrice, scaledLots, charges, `${closeReason} Scalp Exit`);
      } catch (e) { /* ignore */ }

      try {
        const result = db.prepare("SELECT COALESCE(SUM(net_pnl), 0) AS pnl FROM trades WHERE trade_mode = 'PAPER' AND status = 'CLOSED'").get();
        db.prepare("UPDATE accounts SET current_capital = starting_capital + ? WHERE account_type = 'PAPER'").run(Number(result.pnl || 0));
      } catch (e) { /* ignore */ }
    }

    db.prepare("UPDATE trades SET quantity = ?, stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(remainingQty, newStopLoss, id);
    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    console.warn("Partial close DB transaction notice:", e.message);
  }

  if (paperTradeEngine.activeTrades.has(id)) {
    const activeObj = paperTradeEngine.activeTrades.get(id);
    if (activeObj?.trade) {
      activeObj.trade.quantity = remainingQty;
      activeObj.trade.stopLoss = newStopLoss;
      activeObj.trade.isRiskFreeRunner = true;
    }
  }

  paperTradeEngine.publish("trade_mutation", {
    action: "partial_close",
    tradeId: id,
    remainingQuantity: remainingQty,
    stopLoss: newStopLoss,
    exitPrice,
    scaledLots,
    netPnl,
    closeReason
  });

  sendJson(res, { success: true, tradeId: id, remainingQuantity: remainingQty, stopLoss: newStopLoss, scaledLots, netPnl });
}
