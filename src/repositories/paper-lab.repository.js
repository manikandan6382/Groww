import { getDb } from "../db/connection.js";
import { getRangeWindow } from "../services/trading/trade-calculator.js";
import { createTrade, getTradeById, listTrades } from "./trades.repository.js";
import { calculateFrictionAndCharges, getTrigger } from "./paper-friction.js";
import {
  getPaperAccount,
  refreshPaperCapital,
  closePaperTradeInTransaction,
  buildPaperAnalytics,
  filterTradesByWindow,
  assertPaperTrade,
  buildPaperTradePayload,
  toLocalDateTimeInput,
} from "./paper-account.js";

export { calculateFrictionAndCharges };

export function getPaperLab({ range = "all", from, to } = {}) {
  const db = getDb();
  const account = getPaperAccount(db);
  const window = getRangeWindow(range, from, to);
  const allPaperTrades = listTrades({ tradeMode: "PAPER", accountId: account.id });
  const rangeTrades = filterTradesByWindow(allPaperTrades, window);
  const openTrades = allPaperTrades.filter((trade) => trade.status === "OPEN");
  const closedTrades = rangeTrades.filter((trade) => trade.status === "CLOSED");
  const analytics = buildPaperAnalytics(account, allPaperTrades, rangeTrades, openTrades);

  return {
    account: { ...account, current_capital: analytics.currentBalance },
    openTrades,
    closedTrades,
    recentTrades: allPaperTrades.slice(0, 12),
    analytics,
  };
}

export function createPaperTrade(input = {}) {
  const account = getPaperAccount(getDb());
  const payload = buildPaperTradePayload(input, account.id);
  const trade = createTrade(payload);
  markPaperTrade(trade.id, { price: Number(input.currentPrice || input.entryPrice), reason: "MARK_ONLY" });
  return getTradeById(trade.id);
}

export function markPaperTrade(id, { price, reason = "MARK_ONLY" } = {}) {
  const db = getDb();
  const trade = getTradeById(id);
  assertPaperTrade(trade);
  const markPrice = Number(price);
  if (!Number.isFinite(markPrice) || markPrice <= 0) {
    const error = new Error("Current price must be greater than zero.");
    error.status = 422;
    throw error;
  }

  const now = toLocalDateTimeInput(new Date());
  const trigger = getTrigger(trade, markPrice, reason);
  db.exec("BEGIN;");
  try {
    db.prepare(`
      UPDATE trades
      SET last_mark_price = ?, last_marked_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(markPrice, now, trade.id);

    if (trigger.shouldClose) {
      closePaperTradeInTransaction(db, trade, markPrice, trigger.closeReason, now);
    }
    refreshPaperCapital(db);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return {
    trade: getTradeById(id),
    triggered: trigger.shouldClose,
    closeReason: trigger.closeReason,
  };
}

export function closePaperTrade(id, { price, reason = "MANUAL_EXIT" } = {}) {
  const db = getDb();
  const trade = getTradeById(id);
  assertPaperTrade(trade);
  if (trade.status !== "OPEN") return { trade, triggered: false, closeReason: trade.closeReason };

  const exitPrice = Number(price || trade.lastMarkPrice || trade.entryPrice);
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    const error = new Error("Exit price must be greater than zero.");
    error.status = 422;
    throw error;
  }

  db.exec("BEGIN;");
  try {
    closePaperTradeInTransaction(db, trade, exitPrice, reason, toLocalDateTimeInput(new Date()));
    refreshPaperCapital(db);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  return { trade: getTradeById(id), triggered: true, closeReason: reason };
}

export function deletePaperTrade(id) {
  const db = getDb();
  const trade = getTradeById(id);
  assertPaperTrade(trade);

  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("BEGIN;");
  try {
    db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(trade.id);
    db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(trade.id);
    db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id = ?").run(trade.id);
    db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id = ?").run(trade.id);
    db.prepare("DELETE FROM trade_attachments WHERE trade_id = ?").run(trade.id);
    db.prepare("DELETE FROM trades WHERE id = ?").run(trade.id);
    refreshPaperCapital(db);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return { deleted: true, id: trade.id };
}
