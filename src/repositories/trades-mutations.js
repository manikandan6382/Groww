export function resolveAccountId(db, trade) {
  if (trade.accountId) {
    const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(Number(trade.accountId));
    if (account) return account.id;
  }

  const account = db
    .prepare("SELECT id FROM accounts WHERE account_type = ? AND market = ? ORDER BY id LIMIT 1")
    .get(trade.tradeMode, trade.market);
  if (account) return account.id;

  const result = db
    .prepare(`
      INSERT INTO accounts(name, account_type, market, currency)
      VALUES (?, ?, ?, ?)
    `)
    .run(`${trade.market} ${trade.tradeMode} Trading`, trade.tradeMode, trade.market, trade.currency);
  return Number(result.lastInsertRowid);
}

export function upsertInstrument(db, trade) {
  const existing = db
    .prepare(`
      SELECT id FROM instruments
      WHERE symbol = ?
        AND market = ?
        AND instrument_type = ?
        AND COALESCE(option_type, '') = COALESCE(?, '')
        AND COALESCE(strike_price, -1) = COALESCE(?, -1)
        AND COALESCE(expiry_date, '') = COALESCE(?, '')
      ORDER BY id DESC
      LIMIT 1
    `)
    .get(trade.symbol, trade.market, trade.instrumentType, trade.optionType, trade.strikePrice, trade.expiryDate);

  let cleanLotSize = Number(trade.lotSize || 1);
  const symUpper = (trade.symbol || trade.underlyingSymbol || "").toUpperCase();
  if (cleanLotSize <= 1) {
    if (symUpper.includes("BANKNIFTY")) cleanLotSize = 30;
    else if (symUpper.includes("FINNIFTY")) cleanLotSize = 65;
    else if (symUpper.includes("MIDCPNIFTY")) cleanLotSize = 75;
    else if (symUpper.includes("SENSEX")) cleanLotSize = 20;
    else if (symUpper.includes("NIFTY")) cleanLotSize = 65;
  }

  if (existing) {
    db.prepare(`
      UPDATE instruments
      SET display_name = ?, exchange = ?, currency = ?, underlying_symbol = ?, lot_size = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(trade.displayName || trade.symbol, trade.exchange, trade.currency, trade.underlyingSymbol, cleanLotSize, existing.id);
    return existing.id;
  }

  const result = db
    .prepare(`
      INSERT INTO instruments(
        symbol, display_name, market, instrument_type, exchange, currency,
        underlying_symbol, option_type, strike_price, expiry_date, lot_size
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      trade.symbol,
      trade.displayName || trade.symbol,
      trade.market,
      trade.instrumentType,
      trade.exchange,
      trade.currency,
      trade.underlyingSymbol,
      trade.optionType,
      trade.strikePrice,
      trade.expiryDate,
      cleanLotSize,
    );
  return Number(result.lastInsertRowid);
}

export function insertTrade(db, trade) {
  if (trade.idempotencyKey) {
    const existing = db.prepare("SELECT id FROM trades WHERE idempotency_key = ?").get(trade.idempotencyKey);
    if (existing) return Number(existing.id);
  }

  const result = db
    .prepare(`
      INSERT INTO trades(
        account_id, instrument_id, trade_mode, trade_type, direction, status,
        entry_datetime, exit_datetime, entry_price, exit_price, quantity,
        capital_used, position_size, target_price, stop_loss,
        risk_amount, risk_percentage, expected_reward, risk_reward_ratio,
        realized_pnl, charges, net_pnl, idempotency_key
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      trade.accountId,
      trade.instrumentId,
      trade.tradeMode,
      trade.tradeType,
      trade.direction,
      trade.status,
      trade.entryDatetime,
      trade.exitDatetime || null,
      trade.entryPrice,
      trade.exitPrice,
      trade.quantity,
      trade.capitalUsed,
      trade.positionSize,
      trade.targetPrice,
      trade.stopLoss,
      trade.riskAmount,
      trade.riskPercentage,
      trade.expectedReward,
      trade.riskRewardRatio,
      trade.realizedPnl,
      trade.charges,
      trade.netPnl,
      trade.idempotencyKey || null,
    );
  return Number(result.lastInsertRowid);
}
