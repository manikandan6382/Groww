import { getDb } from "../../db/connection.js";

export const STAGES = {
  DEPLOYMENT_REQUESTED: "DEPLOYMENT_REQUESTED",
  RISK_RESERVATION_ACCEPTED: "RISK_RESERVATION_ACCEPTED",
  SIMULATED_FILL_CONFIRMED: "SIMULATED_FILL_CONFIRMED",
  RMS_POST_FILL_RECONCILED: "RMS_POST_FILL_RECONCILED",
  SQLITE_TRADE_COMMITTED: "SQLITE_TRADE_COMMITTED",
  EXIT_EXECUTION_CONFIRMED: "EXIT_EXECUTION_CONFIRMED",
  FINAL_SETTLEMENT_COMMITTED: "FINAL_SETTLEMENT_COMMITTED",
};

export const RECONCILIATION_STATES = {
  IN_FLIGHT: "IN_FLIGHT",
  COMPLETED: "COMPLETED",
  RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
  UNVERIFIED_PNL: "UNVERIFIED_PNL",
  CLEANED_UP: "CLEANED_UP",
};

export function initOperationJournal(customDb = null) {
  const db = customDb || getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS trade_operation_journal (
      operation_id TEXT PRIMARY KEY,
      client_order_id TEXT,
      order_id TEXT,
      position_id TEXT,
      trade_id INTEGER,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_entry_price REAL,
      filled_entry_price REAL,
      stop_loss REAL,
      target_price REAL,
      stop_policy TEXT,
      target_policy TEXT,
      modelled_risk REAL,
      stage TEXT NOT NULL,
      reconciliation_state TEXT NOT NULL DEFAULT 'IN_FLIGHT',
      is_ambiguous INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_op_journal_position ON trade_operation_journal(position_id);
    CREATE INDEX IF NOT EXISTS idx_op_journal_stage ON trade_operation_journal(stage);
    CREATE INDEX IF NOT EXISTS idx_op_journal_trade ON trade_operation_journal(trade_id);
  `);
}

export function recordOperationStage(operationId, stage, updates = {}, customDb = null) {
  if (!operationId) return null;
  const db = customDb || getDb();
  initOperationJournal(db);

  const existing = db.prepare("SELECT * FROM trade_operation_journal WHERE operation_id = ?").get(operationId);

  if (!existing) {
    db.prepare(`
      INSERT INTO trade_operation_journal (
        operation_id, client_order_id, order_id, position_id, trade_id, symbol,
        direction, quantity, reference_entry_price, filled_entry_price, stop_loss,
        target_price, stop_policy, target_policy, modelled_risk, stage,
        reconciliation_state, is_ambiguous, last_error, updated_at
      ) VALUES (
        @operationId, @clientOrderId, @orderId, @positionId, @tradeId, @symbol,
        @direction, @quantity, @referenceEntryPrice, @filledEntryPrice, @stopLoss,
        @targetPrice, @stopPolicy, @targetPolicy, @modelledRisk, @stage,
        @reconciliationState, @isAmbiguous, @lastError, datetime('now')
      )
    `).run({
      operationId,
      clientOrderId: updates.clientOrderId || operationId,
      orderId: updates.orderId || null,
      positionId: updates.positionId || null,
      tradeId: updates.tradeId || null,
      symbol: updates.symbol || "UNKNOWN",
      direction: updates.direction || "BUY",
      quantity: Number(updates.quantity || updates.units || 65),
      referenceEntryPrice: updates.referenceEntryPrice !== undefined ? Number(updates.referenceEntryPrice) : null,
      filledEntryPrice: updates.filledEntryPrice !== undefined ? Number(updates.filledEntryPrice) : null,
      stopLoss: updates.stopLoss !== undefined ? Number(updates.stopLoss) : null,
      targetPrice: updates.targetPrice !== undefined ? Number(updates.targetPrice) : null,
      stopPolicy: updates.stopPolicy || null,
      targetPolicy: updates.targetPolicy || null,
      modelledRisk: updates.modelledRisk !== undefined ? Number(updates.modelledRisk) : null,
      stage,
      reconciliationState: updates.reconciliationState || RECONCILIATION_STATES.IN_FLIGHT,
      isAmbiguous: updates.isAmbiguous ? 1 : 0,
      lastError: updates.lastError || null,
    });
  } else {
    db.prepare(`
      UPDATE trade_operation_journal SET
        order_id = COALESCE(@orderId, order_id),
        position_id = COALESCE(@positionId, position_id),
        trade_id = COALESCE(@tradeId, trade_id),
        filled_entry_price = COALESCE(@filledEntryPrice, filled_entry_price),
        stop_loss = COALESCE(@stopLoss, stop_loss),
        target_price = COALESCE(@targetPrice, target_price),
        modelled_risk = COALESCE(@modelledRisk, modelled_risk),
        stage = @stage,
        reconciliation_state = COALESCE(@reconciliationState, reconciliation_state),
        is_ambiguous = COALESCE(@isAmbiguous, is_ambiguous),
        last_error = COALESCE(@lastError, last_error),
        updated_at = datetime('now')
      WHERE operation_id = @operationId
    `).run({
      operationId,
      orderId: updates.orderId !== undefined ? updates.orderId : null,
      positionId: updates.positionId !== undefined ? updates.positionId : null,
      tradeId: updates.tradeId !== undefined ? updates.tradeId : null,
      filledEntryPrice: updates.filledEntryPrice !== undefined ? Number(updates.filledEntryPrice) : null,
      stopLoss: updates.stopLoss !== undefined ? Number(updates.stopLoss) : null,
      targetPrice: updates.targetPrice !== undefined ? Number(updates.targetPrice) : null,
      modelledRisk: updates.modelledRisk !== undefined ? Number(updates.modelledRisk) : null,
      stage,
      reconciliationState: updates.reconciliationState || null,
      isAmbiguous: updates.isAmbiguous !== undefined ? (updates.isAmbiguous ? 1 : 0) : null,
      lastError: updates.lastError !== undefined ? updates.lastError : null,
    });
  }

  return db.prepare("SELECT * FROM trade_operation_journal WHERE operation_id = ?").get(operationId);
}

export function getOperation(operationId, customDb = null) {
  if (!operationId) return null;
  const db = customDb || getDb();
  initOperationJournal(db);
  return db.prepare("SELECT * FROM trade_operation_journal WHERE operation_id = ?").get(operationId);
}

export function getOperationByPositionId(positionId, customDb = null) {
  if (!positionId) return null;
  const db = customDb || getDb();
  initOperationJournal(db);
  return db.prepare("SELECT * FROM trade_operation_journal WHERE position_id = ? ORDER BY created_at DESC LIMIT 1").get(positionId);
}

export function getOperationByTradeId(tradeId, customDb = null) {
  if (!tradeId) return null;
  const db = customDb || getDb();
  initOperationJournal(db);
  return db.prepare("SELECT * FROM trade_operation_journal WHERE trade_id = ? ORDER BY updated_at DESC LIMIT 1").get(tradeId);
}

export function listUnresolvedOperations(customDb = null) {
  const db = customDb || getDb();
  initOperationJournal(db);
  return db.prepare(`
    SELECT * FROM trade_operation_journal
    WHERE reconciliation_state IN ('IN_FLIGHT', 'RECONCILIATION_REQUIRED', 'UNVERIFIED_PNL')
    ORDER BY created_at DESC
  `).all();
}
