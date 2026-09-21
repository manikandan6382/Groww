import { getDb } from "../../db/connection.js";
import { markPaperTrade } from "../../repositories/paper-lab.repository.js";
import { telegramNotifier } from "../notifications/telegramNotifier.js";

export function evaluateTradeTrigger(engine, trade, tick) {
  const id = Number(trade.id);
  if (engine.triggering.has(id)) return;
  const target = Number(trade.targetPrice || 0);
  const stopLoss = Number(trade.stopLoss || 0);
  const entry = Number(trade.entryPrice || 0);
  const ltp = Number(tick.ltp || 0);
  if (!ltp || ltp <= 0) return;

  const entryTime = new Date(trade.entryDatetime || trade.created_at || 0).getTime();
  const tradeAgeMs = entryTime > 0 ? Date.now() - entryTime : 999999;
  if (tradeAgeMs < 2000 && Math.abs(ltp - entry) < 0.50) {
    return;
  }

  if (entry >= 20.0 && ltp <= 0.10) {
    console.warn(`[paperTradeEngine] Ghost zero tick suppressed on trade ${id}: entry ₹${entry} vs tick LTP ₹${ltp}`);
    return;
  }

  if (entry > 0 && tradeAgeMs < 5000 && Math.abs(ltp - entry) / entry > 0.35) {
    console.warn(`[paperTradeEngine] Anomaly suppressed on trade ${id} (${trade.symbol}): entry ₹${entry} vs tick LTP ₹${ltp}. False trigger blocked.`);
    return;
  }

  let reason = null;
  const isShortTrade = trade.direction === "SHORT" || (target < entry && stopLoss > entry);

  if (entry > 0) {
    const units = Number(trade.quantity || 1) * Math.max(1, Number(trade.lotSize || 65));
    const estimatedCharges = 55.20 + entry * units * 0.001;
    const frictionPoints = Math.max(1.50, Number((estimatedCharges / units + 0.30).toFixed(2)));

    if (isShortTrade) {
      const bePrice = Number((entry - frictionPoints).toFixed(2));
      if (ltp <= entry - 8.0 && (stopLoss === 0 || stopLoss > bePrice)) {
        lockBreakeven(engine, trade, bePrice, ltp);
      }
    } else {
      const bePrice = Number((entry + frictionPoints).toFixed(2));
      if (ltp >= entry + 8.0 && (stopLoss === 0 || stopLoss < bePrice)) {
        lockBreakeven(engine, trade, bePrice, ltp);
      }
    }
  }

  if (isShortTrade) {
    if (target > 0 && ltp <= target) reason = "TARGET_HIT";
    if (!reason && stopLoss > 0 && ltp >= stopLoss) {
      reason = isShortTrade ? (stopLoss < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT") : (stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT");
    }
  } else {
    if (target > 0 && ltp >= target) reason = "TARGET_HIT";
    if (!reason && stopLoss > 0 && ltp <= stopLoss) {
      reason = stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
    }
  }

  if (!reason) return;
  triggerTradeExecution(engine, trade, tick, reason);
}

export function lockBreakeven(engine, trade, newStopLoss, currentLtp) {
  const id = Number(trade.id);
  try {
    const db = getDb();
    db.prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(newStopLoss, id);
    trade.stopLoss = newStopLoss;
    const item = engine.activeTrades.get(id);
    if (item) item.trade.stopLoss = newStopLoss;
    engine.publish("breakeven_locked", {
      tradeId: id,
      symbol: trade.symbol,
      newStopLoss,
      entryPrice: trade.entryPrice,
      currentLtp,
      message: `Breakeven Locked at ₹${newStopLoss.toFixed(2)} (+0.50 pt buffer)`,
    });
    telegramNotifier.notifyBreakevenLocked(trade, newStopLoss, currentLtp).catch(() => {});
  } catch (err) {
    console.warn(`[paperTradeEngine] lockBreakeven error on trade ${id}:`, err.message);
  }
}

export function triggerTradeExecution(engine, trade, tick, reason) {
  const id = Number(trade.id);
  if (engine.triggering.has(id)) return;
  engine.triggering.add(id);

  try {
    // Exchange-Grade Anchor: Fill at resting Stop Loss or Target price, not an arbitrary lagged HTTP polling tick
    const fillPrice = reason === "TARGET_HIT" 
      ? Number(trade.targetPrice || tick.ltp)
      : Number(trade.stopLoss || tick.ltp);

    const result = markPaperTrade(id, { price: fillPrice, reason });
    engine.removeTrade(id);
    const eventType = reason === "TARGET_HIT" ? "target_hit" : "stop_loss_hit";
    engine.publish(eventType, {
      tradeId: id,
      symbol: trade.symbol,
      ltp: fillPrice,
      reason,
      exitTime: result.trade.exitDatetime,
      pnl: result.trade.netPnl,
      message: reason === "TARGET_HIT" ? "Target Hit" : "Stop Loss Hit",
    });

    if (reason === "TARGET_HIT") {
      telegramNotifier.notifyTargetHit(trade, tick, result).catch(() => {});
    } else {
      telegramNotifier.notifyStopLossHit(trade, tick, result).catch(() => {});
    }
  } catch (error) {
    engine.publish("error", { tradeId: id, symbol: trade.symbol, message: error.message });
  } finally {
    engine.triggering.delete(id);
  }
}
