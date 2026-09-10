import { getDb } from "../db/connection.js";
import { buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { getRangeWindow } from "../services/trading/trade-calculator.js";
import { createTrade, getTradeById, listTrades } from "./trades.repository.js";

const paperAccountName = "Paper Trading Lab";
const defaultCapital = 100000;

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

export function calculateFrictionAndCharges(trade, exitPrice, closeReason = "") {
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  const entryPrice = Number(trade.entryPrice || 0);
  const rawExit = Number(exitPrice || entryPrice);
  
  // 1. Realistic Execution Slippage (Adjusts effective fill price)
  // - TARGET_HIT (passive limit order fill): 0.15 pts
  // - STOP_LOSS_HIT (urgent market exit under adverse liquidity): 0.60 pts
  // - TRAILING_SL_HIT / BREAKEVEN: 0.30 pts
  // - DISCRETIONARY / MANUAL: 0.25 pts
  let slippagePts = 0.25;
  const reasonUpper = String(closeReason || trade.closeReason || trade.exitReason || "").toUpperCase();
  if (reasonUpper.includes("TARGET")) {
    slippagePts = 0.15;
  } else if (reasonUpper.includes("TRAILING") || reasonUpper.includes("BREAKEVEN") || reasonUpper.includes("BE_HIT") || reasonUpper.includes("RISK_FREE")) {
    slippagePts = 0.30;
  } else if (reasonUpper.includes("STOP_LOSS") || reasonUpper.includes("SL_HIT") || reasonUpper.includes("PROTECTED")) {
    slippagePts = 0.60;
  }

  const isShort = trade.direction === "SHORT";
  const filledExit = isShort 
    ? Number((rawExit + slippagePts).toFixed(2)) 
    : Number(Math.max(0.05, rawExit - slippagePts).toFixed(2));

  const buyTurnover = entryPrice * units;
  const exitTurnover = filledExit * units;
  const totalTurnover = buyTurnover + exitTurnover;

  // 2. Upstox Standard Brokerage (Flat ₹20 buy + ₹20 sell = ₹40 flat)
  const brokerage = 40.0;

  // 3. STT (Securities Transaction Tax: 0.1% on Option SELL premium turnover only, 0% on Buy)
  const sellTurnover = isShort ? buyTurnover : exitTurnover;
  const stt = Number((sellTurnover * 0.001).toFixed(2));

  // 4. Exchange Transaction Charges (NSE Options: 0.0505% on total premium turnover)
  const exchangeCharges = Number((totalTurnover * 0.000505).toFixed(2));

  // 5. SEBI Turnover Charges (₹10 per Crore = 0.0001%)
  const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));

  // 6. Stamp Duty (0.003% on Buy side premium only)
  const buyLegTurnover = isShort ? exitTurnover : buyTurnover;
  const stampDuty = Number((buyLegTurnover * 0.00003).toFixed(2));

  // 7. GST (18% on Brokerage + Exchange Charges + SEBI Charges)
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));

  // 8. Total statutory Upstox charges (Flat ~₹55 - ₹62 for 1 lot)
  const statutoryCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));

  // 9. Gross Realized P&L based on filled exit
  const grossPnl = Number(((isShort ? entryPrice - filledExit : filledExit - entryPrice) * units).toFixed(2));

  // 10. Net Take-Home P&L
  const netPnl = Number((grossPnl - statutoryCharges).toFixed(2));
  const slippageDrag = Number((slippagePts * units).toFixed(2));

  return {
    units,
    rawExit,
    filledExit,
    slippagePts,
    slippageDrag,
    grossPnl,
    statutoryCharges,
    totalFriction: statutoryCharges,
    netPnl,
    brokerage,
    stt,
    exchangeCharges,
    sebiCharges,
    stampDuty,
    gst,
  };
}

function closePaperTradeInTransaction(db, trade, exitPrice, closeReason, exitDatetime) {
  const friction = calculateFrictionAndCharges(trade, exitPrice, closeReason);
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
  `).run(exitDatetime, friction.filledExit, friction.grossPnl, friction.statutoryCharges, friction.netPnl, closeReason, friction.filledExit, exitDatetime, trade.id);

  db.prepare(`
    INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, charges, notes)
    VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
  `).run(trade.id, exitDatetime, friction.filledExit, trade.quantity, friction.statutoryCharges, `${closeReason.replace(/_/g, " ")} (Upstox Charges ₹${friction.statutoryCharges} · Slippage ₹${friction.slippageDrag})`);
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
  // MARK_ONLY is for recording entry/intermediate marks without triggering closures
  if (reason === "MARK_ONLY") return { shouldClose: false, closeReason: null };
  if (trade.status !== "OPEN") return { shouldClose: false, closeReason: trade.closeReason };

  const sl = Number(trade.stopLoss || 0);
  const tp = Number(trade.targetPrice || 0);

  if (trade.direction === "SHORT") {
    if (tp > 0 && markPrice <= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
    if (sl > 0 && markPrice > sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
    return { shouldClose: false, closeReason: null };
  }

  // LONG trade:
  if (tp > 0 && markPrice >= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
  // Strictly less than stopLoss prevents instant kill on initial mark if SL equals entry price
  if (sl > 0 && markPrice < sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
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
