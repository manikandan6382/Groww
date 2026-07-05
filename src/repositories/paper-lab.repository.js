import { getDb } from "../db/connection.js";
import { buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { getRangeWindow } from "../services/trading/trade-calculator.js";
import { createTrade, getTradeById, listTrades } from "./trades.repository.js";

const paperAccountName = "Paper Trading Lab";
const defaultCapital = 100000;

export function getPaperLab({ range = "week", from, to } = {}) {
  const db = getDb();
  const account = getPaperAccount(db);
  const window = getRangeWindow(range, from, to);
  const allPaperTrades = listTrades({ tradeMode: "PAPER", accountId: account.id });
  const rangeTrades = filterTradesByWindow(allPaperTrades, window);
  const openTrades = allPaperTrades.filter((trade) => trade.status === "OPEN");
  const closedTrades = rangeTrades.filter((trade) => trade.status === "CLOSED");
  const analytics = buildPaperAnalytics(account, allPaperTrades, rangeTrades, openTrades);

  return {
    account: {
      ...account,
      current_capital: analytics.currentBalance,
    },
    openTrades,
    closedTrades,
    recentTrades: allPaperTrades.slice(0, 12),
    analytics,
  };
}

export function createPaperTrade(input = {}) {
  const symbol = buildPaperSymbol(input);
  const trade = createTrade({
    ...input,
    accountId: getPaperAccount(getDb()).id,
    tradeMode: "PAPER",
    tradeType: input.tradeType || "INTRADAY",
    direction: input.direction || "LONG",
    status: "OPEN",
    market: input.market || "INDIA",
    instrumentType: "OPTION",
    optionType: input.optionType || "CALL",
    underlyingSymbol: input.underlyingSymbol || symbol,
    symbol,
    displayName: symbol,
    entryDatetime: input.entryDatetime || toLocalDateTimeInput(new Date()),
    entryPrice: input.entryPrice || input.currentPrice,
    targetPrice: input.targetPrice,
    stopLoss: input.stopLoss,
    quantity: input.quantity || 1,
    lotSize: input.lotSize || 1,
    strategyTags: input.strategyTags || ["Paper trade"],
    mistakeTags: input.mistakeTags || [],
    confidenceScore: input.confidenceScore || 6,
    followedPlan: true,
    entryReason: input.entryReason || "Paper trade based on market movement.",
    personalNotes: input.personalNotes || "",
  });
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

  db.exec("BEGIN;");
  try {
    db.prepare("DELETE FROM trades WHERE id = ?").run(trade.id);
    refreshPaperCapital(db);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return { deleted: true, id: trade.id };
}

function closePaperTradeInTransaction(db, trade, exitPrice, closeReason, exitDatetime) {
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  const pnl = (trade.direction === "SHORT" ? trade.entryPrice - exitPrice : exitPrice - trade.entryPrice) * units;
  db.prepare(`
    UPDATE trades
    SET status = 'CLOSED',
        exit_datetime = ?,
        exit_price = ?,
        realized_pnl = ?,
        net_pnl = ?,
        close_reason = ?,
        last_mark_price = ?,
        last_marked_at = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(exitDatetime, exitPrice, pnl, pnl, closeReason, exitPrice, exitDatetime, trade.id);

  db.prepare(`
    INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, notes)
    VALUES (?, 'EXIT', ?, ?, ?, ?)
  `).run(trade.id, exitDatetime, exitPrice, trade.quantity, closeReason.replace(/_/g, " "));
}

function getPaperAccount(db) {
  let account = db
    .prepare("SELECT * FROM accounts WHERE account_type = 'PAPER' AND name = ? ORDER BY id LIMIT 1")
    .get(paperAccountName);
  if (!account) {
    const result = db
      .prepare(`
        INSERT INTO accounts(name, account_type, market, currency, starting_capital, current_capital)
        VALUES (?, 'PAPER', 'INDIA', 'INR', ?, ?)
      `)
      .run(paperAccountName, defaultCapital, defaultCapital);
    account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(Number(result.lastInsertRowid));
  }
  return account;
}

function refreshPaperCapital(db) {
  const account = getPaperAccount(db);
  const result = db.prepare(`
    SELECT COALESCE(SUM(net_pnl), 0) AS pnl
    FROM trades
    WHERE account_id = ?
      AND trade_mode = 'PAPER'
      AND status = 'CLOSED'
  `).get(account.id);
  const current = Number(account.starting_capital || defaultCapital) + Number(result.pnl || 0);
  db.prepare("UPDATE accounts SET current_capital = ? WHERE id = ?").run(current, account.id);
  return current;
}

function buildPaperAnalytics(account, allTrades, rangeTrades, openTrades) {
  const base = buildTradeAnalytics(rangeTrades);
  const closedAll = allTrades.filter((trade) => trade.status === "CLOSED");
  const realizedAll = closedAll.reduce((sum, trade) => sum + Number(trade.netPnl || 0), 0);
  const openPnl = openTrades.reduce((sum, trade) => {
    if (!trade.lastMarkPrice) return sum;
    const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
    return sum + (Number(trade.lastMarkPrice) - Number(trade.entryPrice)) * units;
  }, 0);
  const currentBalance = Number(account.starting_capital || defaultCapital) + realizedAll;
  return {
    ...base,
    startingCapital: Number(account.starting_capital || defaultCapital),
    currentBalance,
    realizedAll,
    openPnl,
    projectedBalance: currentBalance + openPnl,
    activeTrades: openTrades.length,
  };
}

function filterTradesByWindow(trades, { start, end }) {
  if (!start || !end) return trades;
  return trades.filter((trade) => {
    const date = new Date(trade.exitDatetime || trade.entryDatetime);
    return date >= start && date <= end;
  });
}

function getTrigger(trade, markPrice, reason) {
  if (reason === "MANUAL_EXIT") return { shouldClose: true, closeReason: "MANUAL_EXIT" };
  if (trade.status !== "OPEN") return { shouldClose: false, closeReason: trade.closeReason };
  if (trade.direction === "SHORT") {
    if (trade.targetPrice && markPrice <= trade.targetPrice) return { shouldClose: true, closeReason: "TARGET_HIT" };
    if (trade.stopLoss && markPrice >= trade.stopLoss) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
    return { shouldClose: false, closeReason: null };
  }
  if (trade.targetPrice && markPrice >= trade.targetPrice) return { shouldClose: true, closeReason: "TARGET_HIT" };
  if (trade.stopLoss && markPrice <= trade.stopLoss) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
  return { shouldClose: false, closeReason: null };
}

function assertPaperTrade(trade) {
  if (trade.tradeMode !== "PAPER") {
    const error = new Error("Only paper trades can be marked in Paper Lab.");
    error.status = 422;
    throw error;
  }
}

function buildPaperSymbol(input) {
  const raw = String(input.symbol || "").trim().toUpperCase();
  if (raw) return raw;
  const underlying = String(input.underlyingSymbol || "NIFTY").trim().toUpperCase();
  const strike = String(input.strikePrice || "").trim();
  const side = input.optionType === "PUT" ? "PE" : "CE";
  return strike ? `${underlying} ${strike} ${side}` : `${underlying} ${side}`;
}

function toLocalDateTimeInput(date) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}
