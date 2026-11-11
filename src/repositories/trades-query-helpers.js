export function queryTradesList(db, { start, end, tradeMode, status, accountId } = {}) {
  const params = [];
  const where = [];
  if (start) {
    where.push("t.entry_datetime >= ?");
    params.push(formatDateTimeKey(start));
  }
  if (end) {
    where.push("t.entry_datetime <= ?");
    params.push(formatDateTimeKey(end));
  }
  if (tradeMode) {
    where.push("t.trade_mode = ?");
    params.push(tradeMode);
  }
  if (status) {
    where.push("t.status = ?");
    params.push(status);
  }
  if (accountId) {
    where.push("t.account_id = ?");
    params.push(Number(accountId));
  }

  const rows = db
    .prepare(`
      SELECT
        t.id,
        t.trade_mode AS tradeMode,
        t.trade_type AS tradeType,
        t.direction,
        t.status,
        t.entry_datetime AS entryDatetime,
        t.exit_datetime AS exitDatetime,
        t.entry_price AS entryPrice,
        t.exit_price AS exitPrice,
        t.quantity,
        t.capital_used AS capitalUsed,
        t.position_size AS positionSize,
        t.target_price AS targetPrice,
        t.stop_loss AS stopLoss,
        t.risk_amount AS riskAmount,
        t.risk_percentage AS riskPercentage,
        t.expected_reward AS expectedReward,
        t.risk_reward_ratio AS riskRewardRatio,
        t.realized_pnl AS realizedPnl,
        t.charges,
        t.net_pnl AS netPnl,
        t.close_reason AS closeReason,
        t.last_mark_price AS lastMarkPrice,
        t.last_marked_at AS lastMarkedAt,
        t.idempotency_key AS idempotencyKey,
        t.created_at AS createdAt,
        i.symbol,
        i.display_name AS displayName,
        i.market,
        i.instrument_type AS instrumentType,
        i.exchange,
        i.currency,
        i.underlying_symbol AS underlyingSymbol,
        i.option_type AS optionType,
        i.strike_price AS strikePrice,
        i.expiry_date AS expiryDate,
        i.lot_size AS lotSize,
        j.entry_reason AS entryReason,
        j.confidence_score AS confidenceScore,
        j.emotion_before AS emotionBefore,
        j.emotion_after AS emotionAfter,
        j.followed_plan AS followedPlan,
        j.lessons_learned AS lessonsLearned,
        j.personal_notes AS personalNotes
      FROM trades t
      JOIN instruments i ON i.id = t.instrument_id
      LEFT JOIN trade_journal j ON j.trade_id = t.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY t.entry_datetime DESC, t.id DESC
    `)
    .all(...params)
    .map(rowToTrade);

  hydrateTradeRelations(db, rows);
  return rows;
}

export function hydrateTradeRelations(db, trades) {
  if (!trades.length) return;
  const ids = trades.map((trade) => trade.id);
  const placeholders = ids.map(() => "?").join(",");
  const byId = new Map(trades.map((trade) => [trade.id, trade]));

  for (const row of db.prepare(`
    SELECT tst.trade_id AS tradeId, st.name
    FROM trade_strategy_tags tst
    JOIN strategy_tags st ON st.id = tst.strategy_tag_id
    WHERE tst.trade_id IN (${placeholders})
  `).all(...ids)) {
    byId.get(row.tradeId)?.strategyTags.push(row.name);
  }

  for (const row of db.prepare(`
    SELECT tmt.trade_id AS tradeId, mt.name
    FROM trade_mistake_tags tmt
    JOIN mistake_tags mt ON mt.id = tmt.mistake_tag_id
    WHERE tmt.trade_id IN (${placeholders})
  `).all(...ids)) {
    byId.get(row.tradeId)?.mistakeTags.push(row.name);
  }

  for (const row of db.prepare(`
    SELECT trade_id AS tradeId, attachment_type AS type, file_path AS filePath, original_name AS originalName, caption
    FROM trade_attachments
    WHERE trade_id IN (${placeholders})
    ORDER BY id
  `).all(...ids)) {
    byId.get(row.tradeId)?.attachments.push(row);
  }
}

export function rowToTrade(row) {
  const lotSize = Math.max(1, Number(row.lotSize || 1));
  const qty = Number(row.quantity || 1);
  const lots = (qty >= lotSize && qty % lotSize === 0) ? Math.round(qty / lotSize) : Math.max(1, Math.round(qty));
  return {
    ...row,
    lots,
    followedPlan: Boolean(row.followedPlan),
    strategyTags: [],
    mistakeTags: [],
    attachments: [],
  };
}

export function formatDateTimeKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (item) => String(item).padStart(2, "0");
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-") + `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
