import { getDb } from "../../db/connection.js";
import { buildReviewReports, buildTradeAnalytics } from "../../services/analytics/performance-engine.js";
import { rangeLabel } from "../../services/trading/trade-calculator.js";
import { createTrade, getTradeById, getTradingBootstrap } from "../../repositories/trades.repository.js";
import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { getRange, getTradesForUrl, readJsonBody, sendJson, serveEvidence } from "./route-helpers.js";

export async function handleJournalRoutes(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/trading/bootstrap") {
    sendJson(res, getTradingBootstrap());
    return true;
  }

  const tradeGetMatch = url.pathname.match(/^\/api\/trades\/(\d+)$/);
  if (req.method === "GET" && tradeGetMatch) {
    const id = Number(tradeGetMatch[1]);
    try {
      const trade = getTradeById(id);
      sendJson(res, { success: true, trade, item: trade });
    } catch {
      sendJson(res, { success: false, error: "Trade not found" }, 404);
    }
    return true;
  }

  const journalDeleteMatch = url.pathname.match(/^\/api\/trades\/(\d+)(?:\/delete)?$/);
  if (["DELETE", "POST"].includes(req.method) && journalDeleteMatch) {
    const id = Number(journalDeleteMatch[1]);
    const db = getDb();
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("BEGIN;");
    try {
      db.prepare("DELETE FROM trade_executions WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_journal WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_strategy_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_mistake_tags WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trade_attachments WHERE trade_id = ?").run(id);
      db.prepare("DELETE FROM trades WHERE id = ?").run(id);
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }
    paperTradeEngine.removeTrade(id);
    paperTradeEngine.publish("trade_mutation", { action: "delete", tradeId: id });
    sendJson(res, { success: true, deleted: true, id });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trades") {
    sendJson(res, { items: getTradesForUrl(url) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/trades") {
    const body = await readJsonBody(req);
    const trade = createTrade(body);
    sendJson(res, { item: trade, deduplicated: Boolean(trade.deduplicated) }, trade.deduplicated ? 200 : 201);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/analytics") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    sendJson(res, { range, label: rangeLabel(range), analytics: buildTradeAnalytics(trades) });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/trading/reviews") {
    const range = getRange(url);
    const trades = getTradesForUrl(url);
    const analytics = buildTradeAnalytics(trades);
    sendJson(res, { range, label: rangeLabel(range), reports: buildReviewReports(trades, analytics, rangeLabel(range)) });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/evidence/trades/")) {
    serveEvidence(url.pathname, res);
    return true;
  }

  return false;
}
