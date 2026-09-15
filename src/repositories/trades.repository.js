import { getDb } from "../db/connection.js";
import { normalizeTradeInput, validateTradeInput } from "../services/trading/trade-calculator.js";
import { insertAttachments } from "./trades-attachments.js";
import {
  resolveAccountId,
  upsertInstrument,
  insertTrade,
} from "./trades-mutations.js";
import {
  insertExecutions,
  insertJournal,
  insertTags,
} from "./trades-journal-helpers.js";
import {
  queryTradesList,
} from "./trades-query-helpers.js";

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

  if (trade.idempotencyKey) {
    const existing = db.prepare("SELECT id FROM trades WHERE idempotency_key = ?").get(trade.idempotencyKey);
    if (existing) {
      const existingTrade = getTradeById(existing.id);
      return { ...existingTrade, deduplicated: true };
    }
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

export function listTrades(filter = {}) {
  return queryTradesList(getDb(), filter);
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
