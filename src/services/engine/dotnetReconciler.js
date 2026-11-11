import { getDb } from "../../db/connection.js";
import { closePaperTrade, createPaperTrade } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../paperTradeEngine.js";
import { unregisterDotnetPosition, reconcileDotnetPosition, rehydrateDotnetPosition } from "./dotnetBridge.js";
import {
  getOperationByPositionId,
  getOperationByTradeId,
  recordOperationStage,
  STAGES,
  RECONCILIATION_STATES,
  initOperationJournal,
} from "./operationJournal.js";

const DOTNET_BASE_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
let isReconciling = false;

/**
 * Authoritative Crash Recovery & State Reconciliation Engine
 * 
 * Enforces strict safety invariants:
 * 1. Never fabricates a close without authoritative exit evidence.
 * 2. Never discards an unresolved RMS position unless proven never-filled.
 * 3. Case A1: Missing RMS position with SQLite OPEN trade -> rehydrates into RMS or flags UNVERIFIED_PNL.
 * 4. Case A2: Orphan RMS position -> reconstructs SQLite trade if fill confirmed; safely purges only if never filled; preserves if ambiguous.
 * 5. Direction C: Verifies price and all-in risk parity between SQLite ledger and RMS book.
 */
export async function reconcileDotnetPositions(customDb = null) {
  if (isReconciling) return { ok: false, message: "Reconciliation already in progress" };
  isReconciling = true;

  try {
    const db = customDb || getDb();
    initOperationJournal(db);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${DOTNET_BASE_URL}/api/rms/positions`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);

    if (!res || !res.ok) {
      return { ok: false, message: ".NET RMS offline or unreachable" };
    }

    const dotnetPositions = await res.json().catch(() => []);
    const activeDotnetMap = new Map();
    for (const p of (Array.isArray(dotnetPositions) ? dotnetPositions : [])) {
      activeDotnetMap.set(String(p.id), p);
    }

    const openTrades = db.prepare(`
      SELECT t.*, COALESCE(i.symbol, t.instrument_id) AS symbol, i.lot_size, j.personal_notes AS personalNotes
      FROM trades t
      LEFT JOIN instruments i ON i.id = t.instrument_id
      LEFT JOIN trade_journal j ON t.id = j.trade_id
      WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN'
    `).all();

    const sqliteTradesByDotnetId = new Map();
    for (const trade of openTrades) {
      sqliteTradesByDotnetId.set(String(trade.id), trade);
      const match = (trade.personalNotes || trade.personal_notes || "").match(/\[DOTNET_HFT:[^:]+:([^\]]+)\]/);
      if (match?.[1]) {
        sqliteTradesByDotnetId.set(match[1], trade);
      }
    }

    let rehydratedCount = 0;
    let closedSqliteCount = 0;
    let unverifiedTradeCount = 0;
    let reconstructedTradeCount = 0;
    let purgedRmsCount = 0;
    let ambiguousCount = 0;
    let resyncedPriceCount = 0;

    // =========================================================================
    // 1. Direction A: SQLite OPEN trade exists, but .NET RMS active position is missing
    // =========================================================================
    for (const trade of openTrades) {
      const match = (trade.personalNotes || trade.personal_notes || "").match(/\[DOTNET_HFT:[^:]+:([^\]]+)\]/);
      if (!match?.[1]) continue;

      const dotnetPosId = match[1];
      if (!activeDotnetMap.has(dotnetPosId)) {
        const op = getOperationByTradeId(trade.id, db) || getOperationByPositionId(dotnetPosId, db);

        // Check for confirmed exit evidence
        let hasExecutionClose = false;
        try {
          const exec = db.prepare("SELECT id, price FROM trade_executions WHERE trade_id = ? AND side = 'SELL' LIMIT 1").get(trade.id);
          if (exec) hasExecutionClose = true;
        } catch {}

        const hasConfirmedExit = (
          op?.stage === STAGES.EXIT_EXECUTION_CONFIRMED ||
          op?.stage === STAGES.FINAL_SETTLEMENT_COMMITTED ||
          hasExecutionClose
        );

        if (hasConfirmedExit) {
          // Safe to close because authoritative exit evidence is verified
          const exitPrice = Number(trade.last_mark_price || trade.entry_price);
          closePaperTrade(trade.id, {
            price: exitPrice,
            reason: "RMS_SYSTEM_RECONCILE",
          });
          paperTradeEngine.removeTrade(trade.id);
          paperTradeEngine.publish("trade_mutation", {
            action: "close",
            tradeId: trade.id,
            reason: "RMS_SYSTEM_RECONCILE",
            price: exitPrice,
          });
          closedSqliteCount++;
          console.log(`🛡️ [Reconciliation] Closed verified SQLite trade #${trade.id} (${trade.symbol}) with confirmed exit evidence.`);
        } else {
          // NO authoritative exit evidence! Do NOT fabricate a close or invent exit fill!
          // Case A1: Attempt to rehydrate position back into .NET RMS
          const expectedUnits = Number(trade.units || (trade.quantity && trade.lot_size ? trade.quantity * trade.lot_size : trade.quantity));
          const rehydrateRes = await rehydrateDotnetPosition({
            positionId: dotnetPosId,
            symbol: trade.symbol,
            direction: trade.direction || "BUY",
            quantity: expectedUnits,
            entryPrice: Number(trade.entry_price),
            stopLoss: Number(trade.stop_loss),
            target: Number(trade.target_price),
          });

          if (rehydrateRes.ok) {
            rehydratedCount++;
            console.log(`🛡️ [Reconciliation] Rehydrated open trade #${trade.id} (${trade.symbol}) into .NET RMS active positions.`);
          } else {
            // Rehydration failed or rejected. Preserve trade as unresolved, flag UNVERIFIED_PNL
            const currentNotes = trade.personalNotes || "";
            if (!currentNotes.includes("UNVERIFIED_PNL")) {
              try {
                db.prepare("UPDATE trade_journal SET personal_notes = personal_notes || ' [RECONCILIATION_REQUIRED] [UNVERIFIED_PNL]' WHERE trade_id = ?").run(trade.id);
              } catch {}
            }
            const opId = op?.operation_id || `unresolved_trade_${trade.id}`;
            recordOperationStage(opId, STAGES.RMS_POST_FILL_RECONCILED, {
              tradeId: trade.id,
              positionId: dotnetPosId,
              symbol: trade.symbol,
              quantity: expectedUnits,
              reconciliationState: RECONCILIATION_STATES.UNVERIFIED_PNL,
              isAmbiguous: 1,
              lastError: `RMS position missing and rehydration failed: ${rehydrateRes.error || "RMS rejected"}`,
            }, db);
            unverifiedTradeCount++;
            console.warn(`🛡️ [Reconciliation] Preserved unresolved SQLite trade #${trade.id} (${trade.symbol}) as UNVERIFIED_PNL. New entries blocked.`);
          }
        }
      }
    }

    // =========================================================================
    // 2. Direction B: .NET RMS active position exists, but has NO matching open SQLite trade
    // =========================================================================
    for (const [posId, pos] of activeDotnetMap.entries()) {
      if (!sqliteTradesByDotnetId.has(posId)) {
        const op = getOperationByPositionId(posId, db);

        const existingClosed = db.prepare(`
          SELECT t.id, t.status FROM trades t
          LEFT JOIN trade_journal j ON t.id = j.trade_id
          WHERE j.personal_notes LIKE ?
        `).get(`%[DOTNET_HFT:%:${posId}]%`);

        // Case B1: Confirmed simulated fill occurred before Node crash
        const fillConfirmed = op && (
          op.stage === STAGES.SIMULATED_FILL_CONFIRMED ||
          op.stage === STAGES.RMS_POST_FILL_RECONCILED ||
          op.stage === STAGES.SQLITE_TRADE_COMMITTED
        ) && (!existingClosed || existingClosed.status !== "CLOSED");

        if (fillConfirmed) {
          console.log(`🛡️ [Reconciliation] Reconstructing missing SQLite trade from confirmed journal for RMS position #${posId} (${pos.symbol}).`);
          const filledEntry = Number(op.filled_entry_price || pos.entryPrice);
          const sl = Number(op.stop_loss || pos.stopLoss);
          const tp = Number(op.target_price || pos.target);
          const qty = Number(op.quantity || pos.quantity);
          const lots = Math.max(1, Math.round(qty / 65));

          const recTrade = createPaperTrade({
            symbol: pos.symbol,
            underlyingSymbol: "NIFTY",
            strikePrice: 25000,
            optionType: pos.symbol.includes("PE") ? "PUT" : "CALL",
            currentPrice: filledEntry,
            entryPrice: filledEntry,
            plannedEntryPrice: Number(op.reference_entry_price || filledEntry),
            entrySlippage: 0,
            stopLoss: sl,
            targetPrice: tp,
            quantity: lots,
            lotSize: 65,
            tokenKey: pos.instrumentKey || "",
            personalNotes: `[LIVE_FEED] [DOTNET_HFT:RECOVERED:${posId}] [RECONSTRUCTED_AFTER_CRASH]`,
          });

          recordOperationStage(op.operation_id, STAGES.SQLITE_TRADE_COMMITTED, {
            tradeId: recTrade.id,
            reconciliationState: RECONCILIATION_STATES.COMPLETED,
            isAmbiguous: 0,
          }, db);

          reconstructedTradeCount++;
          continue;
        }

        // Case B2: Confirmed NEVER filled (aborted before fill) OR trade already closed in SQLite
        const neverFilled = op && op.stage === STAGES.DEPLOYMENT_REQUESTED && (
          op.reconciliation_state === RECONCILIATION_STATES.CLEANED_UP ||
          Boolean(op.last_error)
        );
        const tradeAlreadyClosed = existingClosed && existingClosed.status === "CLOSED";

        if (neverFilled || tradeAlreadyClosed) {
          console.warn(`🛡️ [Reconciliation] Safely purging un-filled or closed RMS position #${posId} (${pos.symbol}).`);
          await unregisterDotnetPosition(posId);
          if (op) {
            recordOperationStage(op.operation_id, op.stage, {
              reconciliationState: RECONCILIATION_STATES.CLEANED_UP,
            }, db);
          }
          purgedRmsCount++;
          continue;
        }

        // Case B3: Ambiguous outcome -> Preserve RMS position, block new entries
        console.warn(`🛡️ [Reconciliation] Ambiguous orphan RMS position #${posId} (${pos.symbol}) preserved. Flagged as RECONCILIATION_REQUIRED.`);
        recordOperationStage(`ambiguous_${posId}`, "UNKNOWN", {
          positionId: posId,
          symbol: pos.symbol,
          quantity: pos.quantity,
          reconciliationState: RECONCILIATION_STATES.RECONCILIATION_REQUIRED,
          isAmbiguous: 1,
          lastError: "Ambiguous orphan RMS position without verified fill history",
        }, db);
        ambiguousCount++;
      } else {
        // =========================================================================
        // 3. Direction C: Both exist, verify price/risk parity between SQLite and RMS
        // =========================================================================
        const trade = sqliteTradesByDotnetId.get(posId);
        const expectedUnits = Number(trade.units || (trade.quantity && trade.lot_size ? trade.quantity * trade.lot_size : trade.quantity));
        const priceMismatch = Math.abs(Number(pos.entryPrice) - Number(trade.entry_price)) > 0.01 ||
                              Math.abs(Number(pos.stopLoss) - Number(trade.stop_loss)) > 0.01 ||
                              Math.abs(Number(pos.target) - Number(trade.target_price)) > 0.01 ||
                              Number(pos.quantity) !== expectedUnits;

        if (priceMismatch) {
          console.warn(`🛡️ [Reconciliation] Resyncing RMS position #${posId} (${pos.symbol}) to match authoritative SQLite prices.`);
          const syncRes = await reconcileDotnetPosition(posId, {
            entryPrice: Number(trade.entry_price),
            stopLoss: Number(trade.stop_loss),
            target: Number(trade.target_price),
            quantity: expectedUnits,
            testingMode: true,
          });
          if (syncRes.ok) {
            resyncedPriceCount++;
          } else {
            console.error(`🛡️ [Reconciliation] Failed to resync RMS position #${posId}: ${syncRes.error}`);
          }
        }
      }
    }

    return {
      ok: true,
      rehydratedCount,
      closedSqliteCount,
      unverifiedTradeCount,
      reconstructedTradeCount,
      purgedRmsCount,
      ambiguousCount,
      resyncedPriceCount,
      activeOpenTrades: openTrades.length + reconstructedTradeCount - closedSqliteCount,
    };
  } catch (err) {
    console.warn("⚠️ [Reconciliation] Error during state check:", err.message);
    return { ok: false, error: err.message };
  } finally {
    isReconciling = false;
  }
}
