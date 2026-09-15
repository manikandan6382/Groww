import { getDb } from "../../db/connection.js";
import { closePaperTrade } from "../../repositories/paper-lab.repository.js";
import { paperTradeEngine } from "../paperTradeEngine.js";

const DOTNET_BASE_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
let isReconciling = false;

export async function reconcileDotnetPositions() {
  if (isReconciling) return;
  isReconciling = true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${DOTNET_BASE_URL}/api/rms/positions`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);

    if (!res || !res.ok) {
      return { ok: false, message: ".NET RMS offline or unreachable" };
    }

    const dotnetPositions = await res.json().catch(() => []);
    const activeDotnetIds = new Set(
      (Array.isArray(dotnetPositions) ? dotnetPositions : []).map((p) => String(p.id))
    );

    const db = getDb();
    const openTrades = db.prepare(`
      SELECT t.*, t.instrument_id AS symbol, j.personal_notes AS personalNotes
      FROM trades t
      LEFT JOIN trade_journal j ON t.id = j.trade_id
      WHERE t.trade_mode = 'PAPER' AND t.status = 'OPEN'
    `).all();

    let reconciledCount = 0;
    for (const trade of openTrades) {
      const match = (trade.personalNotes || trade.personal_notes || "").match(/\[DOTNET_HFT:[^:]+:([^\]]+)\]/);
      if (match?.[1]) {
        const dotnetPosId = match[1];
        // If trade was tagged with .NET position but is no longer in .NET active positions
        if (!activeDotnetIds.has(dotnetPosId)) {
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
          reconciledCount++;
          console.log(`🛡️ [Reconciliation] Closed orphaned position #${trade.id} (${trade.symbol}) from previous session.`);
        }
      }
    }

    return { ok: true, reconciledCount, openTradesCount: openTrades.length - reconciledCount };
  } catch (err) {
    console.warn("⚠️ [Reconciliation] Error during state check:", err.message);
    return { ok: false, error: err.message };
  } finally {
    isReconciling = false;
  }
}
