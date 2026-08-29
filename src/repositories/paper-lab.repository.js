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

export function calculateFrictionAndCharges(trade, exitPrice) {
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  const entryPrice = Number(trade.entryPrice || 0);
  const exit = Number(exitPrice || entryPrice);
  
  const buyTurnover = entryPrice * units;
  const exitTurnover = exit * units;
  const totalTurnover = buyTurnover + exitTurnover;

  // 1. Brokerage (Standard institutional/discount broker: ₹20 buy + ₹20 sell = ₹40 flat)
  const brokerage = 40.0;

  // 2. STT (Securities Transaction Tax: 0.1% on Option Sell turnover)
  const stt = Number((exitTurnover * 0.001).toFixed(2));

  // 3. Exchange Transaction Charges (NSE Options: 0.05% on total turnover)
  const exchangeCharges = Number((totalTurnover * 0.0005).toFixed(2));

  // 4. GST (18% on Brokerage + Exchange Charges)
  const gst = Number(((brokerage + exchangeCharges) * 0.18).toFixed(2));

  // 5. Stamp Duty (0.003% on buy side)
  const stampDuty = Number((buyTurnover * 0.00003).toFixed(2));

  // 6. Total statutory charges
  const statutoryCharges = Number((brokerage + stt + exchangeCharges + gst + stampDuty).toFixed(2));

  // 7. Slippage drag (0.50 pt per unit on simulated execution)
  const slippagePts = 0.50;
  const slippageDrag = Number((slippagePts * units).toFixed(2));

  // 8. Gross P&L
  const grossPnl = Number(((trade.direction === "SHORT" ? entryPrice - exit : exit - entryPrice) * units).toFixed(2));

  // 9. Net Realized P&L
  const totalFriction = Number((statutoryCharges + slippageDrag).toFixed(2));
  const netPnl = Number((grossPnl - totalFriction).toFixed(2));

  return {
    units,
    grossPnl,
    statutoryCharges,
    slippageDrag,
    totalFriction,
    netPnl,
    brokerage,
    stt,
    exchangeCharges,
    gst,
    stampDuty,
  };
}

function closePaperTradeInTransaction(db, trade, exitPrice, closeReason, exitDatetime) {
  const friction = calculateFrictionAndCharges(trade, exitPrice);
  db.prepare(`
    UPDATE trades
    SET status = 'CLOSED',
        exit_datetime = ?,
        exit_price = ?,
        realized_pnl = ?,
        charges = ?,
        net_pnl = ?,
        close_reason = ?,
        last_mark_price = ?,
        last_marked_at = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(exitDatetime, exitPrice, friction.grossPnl, friction.totalFriction, friction.netPnl, closeReason, exitPrice, exitDatetime, trade.id);

  db.prepare(`
    INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, charges, notes)
    VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
  `).run(trade.id, exitDatetime, exitPrice, trade.quantity, friction.totalFriction, `${closeReason.replace(/_/g, " ")} (Charges ₹${friction.statutoryCharges} + Slippage ₹${friction.slippageDrag})`);
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
  if (input.symbol && String(input.symbol).trim()) return String(input.symbol).trim();
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
