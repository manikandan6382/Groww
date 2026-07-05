import fs from "node:fs";
import path from "node:path";
import { getDb, getProjectRoot } from "../db/connection.js";
import { normalizeTradeInput, validateTradeInput } from "../services/trading/trade-calculator.js";

const attachmentTypes = new Set(["ENTRY_SCREENSHOT", "EXIT_SCREENSHOT", "SETUP_IMAGE"]);
const imageExtensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function getTradingBootstrap() {
  const db = getDb();
  return {
    accounts: db.prepare("SELECT * FROM accounts ORDER BY account_type, name").all(),
    strategyTags: db.prepare("SELECT name FROM strategy_tags ORDER BY name").all().map((row) => row.name),
    mistakeTags: db.prepare("SELECT name FROM mistake_tags ORDER BY name").all().map((row) => row.name),
  };
}

export function createTrade(input) {
  const db = getDb();
  const trade = normalizeTradeInput(input);
  const errors = validateTradeInput(trade);
  if (errors.length) {
    const error = new Error(errors.join(" "));
    error.status = 422;
    throw error;
  }

  db.exec("BEGIN;");
  try {
    const accountId = resolveAccountId(db, trade);
    const instrumentId = upsertInstrument(db, trade);
    const tradeId = insertTrade(db, { ...trade, accountId, instrumentId });
    insertExecutions(db, tradeId, trade);
    insertJournal(db, tradeId, trade.journal);
    insertTags(db, tradeId, "strategy", trade.strategyTags);
    insertTags(db, tradeId, "mistake", trade.mistakeTags);
    insertAttachments(db, tradeId, trade.attachments);
    db.exec("COMMIT;");
    return getTradeById(tradeId);
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function listTrades({ start, end, tradeMode, status, accountId } = {}) {
  const db = getDb();
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

export function getTradeById(id) {
  const trade = listTrades({}).find((item) => item.id === Number(id));
  if (!trade) {
    const error = new Error("Trade not found.");
    error.status = 404;
    throw error;
  }
  return trade;
}

function resolveAccountId(db, trade) {
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

function upsertInstrument(db, trade) {
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

  if (existing) {
    db.prepare(`
      UPDATE instruments
      SET display_name = ?, exchange = ?, currency = ?, underlying_symbol = ?, lot_size = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(trade.displayName || trade.symbol, trade.exchange, trade.currency, trade.underlyingSymbol, trade.lotSize, existing.id);
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
      trade.lotSize,
    );
  return Number(result.lastInsertRowid);
}

function insertTrade(db, trade) {
  const result = db
    .prepare(`
      INSERT INTO trades(
        account_id, instrument_id, trade_mode, trade_type, direction, status,
        entry_datetime, exit_datetime, entry_price, exit_price, quantity,
        capital_used, position_size, target_price, stop_loss,
        risk_amount, risk_percentage, expected_reward, risk_reward_ratio,
        realized_pnl, charges, net_pnl
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    );
  return Number(result.lastInsertRowid);
}

function insertExecutions(db, tradeId, trade) {
  db.prepare(`
    INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, notes)
    VALUES (?, 'ENTRY', ?, ?, ?, ?)
  `).run(tradeId, trade.entryDatetime, trade.entryPrice, trade.quantity, "Initial MVP entry");

  if (trade.exitPrice != null && trade.exitDatetime) {
    db.prepare(`
      INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, brokerage, notes)
      VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
    `).run(tradeId, trade.exitDatetime, trade.exitPrice, trade.quantity, trade.charges, "Initial MVP exit");
  }
}

function insertJournal(db, tradeId, journal) {
  db.prepare(`
    INSERT INTO trade_journal(
      trade_id, entry_reason, confidence_score, emotion_before, emotion_after,
      followed_plan, lessons_learned, personal_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tradeId,
    journal.entryReason,
    journal.confidenceScore,
    journal.emotionBefore,
    journal.emotionAfter,
    journal.followedPlan ? 1 : 0,
    journal.lessonsLearned,
    journal.personalNotes,
  );
}

function insertTags(db, tradeId, type, tags) {
  const tagTable = type === "strategy" ? "strategy_tags" : "mistake_tags";
  const linkTable = type === "strategy" ? "trade_strategy_tags" : "trade_mistake_tags";
  const linkColumn = type === "strategy" ? "strategy_tag_id" : "mistake_tag_id";

  for (const tag of tags) {
    db.prepare(`INSERT OR IGNORE INTO ${tagTable}(name) VALUES (?)`).run(tag);
    const row = db.prepare(`SELECT id FROM ${tagTable} WHERE name = ?`).get(tag);
    db.prepare(`INSERT OR IGNORE INTO ${linkTable}(trade_id, ${linkColumn}) VALUES (?, ?)`).run(tradeId, row.id);
  }
}

function insertAttachments(db, tradeId, attachments) {
  attachments.forEach((attachment, index) => {
    if (!attachment?.dataUrl || !attachmentTypes.has(attachment.type)) return;
    const saved = saveAttachmentFile(tradeId, attachment, index);
    if (!saved) return;
    db.prepare(`
      INSERT INTO trade_attachments(trade_id, attachment_type, file_path, original_name, caption)
      VALUES (?, ?, ?, ?, ?)
    `).run(tradeId, attachment.type, saved.publicPath, attachment.name || "", attachment.caption || "");
  });
}

function saveAttachmentFile(tradeId, attachment, index) {
  const match = String(attachment.dataUrl).match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const data = Buffer.from(match[2], "base64");
  if (data.length > 4 * 1024 * 1024) return null;

  const root = getProjectRoot();
  const uploadDir = path.join(root, "data", "uploads", "trades");
  fs.mkdirSync(uploadDir, { recursive: true });
  const safeType = attachment.type.toLowerCase().replace(/[^a-z_]/g, "");
  const fileName = `${tradeId}-${safeType}-${Date.now()}-${index}.${imageExtensions[mimeType]}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, data);
  return {
    filePath,
    publicPath: `/evidence/trades/${fileName}`,
  };
}

function hydrateTradeRelations(db, trades) {
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

function rowToTrade(row) {
  return {
    ...row,
    followedPlan: Boolean(row.followedPlan),
    strategyTags: [],
    mistakeTags: [],
    attachments: [],
  };
}

function formatDateTimeKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (item) => String(item).padStart(2, "0");
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-") + `T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
