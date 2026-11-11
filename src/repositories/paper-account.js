import { buildTradeAnalytics } from "../services/analytics/performance-engine.js";
import { calculateFrictionAndCharges } from "./paper-friction.js";

export const paperAccountName = "Paper Trading Lab";
export const defaultCapital = 100000;

export function getPaperAccount(db) {
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

export function refreshPaperCapital(db) {
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

export function closePaperTradeInTransaction(db, trade, exitPrice, closeReason, exitDatetime, options = {}) {
  const friction = calculateFrictionAndCharges(trade, exitPrice, closeReason, options);

  // Authoritative Settlement Invariant: Stored Net P&L must strictly reconcile with Gross P&L and Statutory Charges
  const calculatedNet = Number((friction.grossPnl - friction.statutoryCharges).toFixed(2));
  if (Math.abs(friction.netPnl - calculatedNet) > 0.01) {
    const error = new Error(`Settlement P&L mismatch: Net P&L ₹${friction.netPnl} does not reconcile with Gross P&L ₹${friction.grossPnl} - Charges ₹${friction.statutoryCharges} (expected ₹${calculatedNet}).`);
    error.status = 422;
    throw error;
  }

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

export function buildPaperAnalytics(account, allTrades, rangeTrades, openTrades) {
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

export function filterTradesByWindow(trades, { start, end }) {
  if (!start || !end) return trades;
  return trades.filter((trade) => {
    const date = new Date(trade.exitDatetime || trade.entryDatetime);
    return date >= start && date <= end;
  });
}

export function assertPaperTrade(trade) {
  if (trade.tradeMode !== "PAPER") {
    const error = new Error("Only paper trades can be marked in Paper Lab.");
    error.status = 422;
    throw error;
  }
}

export function buildPaperSymbol(input) {
  if (input.symbol && String(input.symbol).trim()) return String(input.symbol).trim();
  const underlying = String(input.underlyingSymbol || "NIFTY").trim().toUpperCase();
  const strike = String(input.strikePrice || "").trim();
  const side = input.optionType === "PUT" ? "PE" : "CE";
  return strike ? `${underlying} ${strike} ${side}` : `${underlying} ${side}`;
}

export function buildPaperTradePayload(input, accountId) {
  const symbol = buildPaperSymbol(input);
  return {
    ...input,
    accountId,
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
  };
}

export function toLocalDateTimeInput(date) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}
