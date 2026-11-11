import { getDb } from "../../db/connection.js";
import { markPaperTrade } from "../../repositories/paper-lab.repository.js";
import { telegramNotifier } from "../notifications/telegramNotifier.js";
import { calculateStatutoryCharges } from "../../client/stores/slices/tradeHelpers.js";
import { updateStopLossDotnet } from "./dotnetBridge.js";

export function evaluateTradeTrigger(engine, trade, tick) {
  const id = Number(trade.id);
  if (engine?.triggering?.has?.(id)) return;
  const target = Number(trade.targetPrice || 0);
  const stopLoss = Number(trade.stopLoss || 0);
  const entry = Number(trade.entryPrice || 0);
  const ltp = Number(tick.ltp || 0);
  if (!ltp || ltp <= 0) return;
  if (tick.isFresh === false) return;

  const isTesting = Boolean(
    trade.testingMode ||
    trade.testing_mode ||
    trade.personalNotes?.includes("[TESTING_MODE]") ||
    trade.personal_notes?.includes("[TESTING_MODE]") ||
    trade.personalNotes?.includes("Testing") ||
    trade.personal_notes?.includes("Testing") ||
    engine?.activeTrades?.get(id)?.trade?.testingMode ||
    engine?.testingMode
  );

  const rawCreatedAt = trade.created_at || trade.createdAt;
  const createdAtUtc = rawCreatedAt
    ? (rawCreatedAt.includes("Z") ? rawCreatedAt : rawCreatedAt.replace(" ", "T") + "Z")
    : null;
  const entryTime = createdAtUtc ? new Date(createdAtUtc).getTime() : 0;
  const subscribedAt = engine?.activeTrades?.get(id)?.subscribedAtMs || 0;
  const baseTime = Math.max(entryTime, subscribedAt);
  const tradeAgeMs = baseTime > 0 ? Math.max(0, Date.now() - baseTime) : 0;
  const isShortTrade = trade.direction === "SHORT" || (target < entry && stopLoss > entry);

  // Institutional Warm-up & Settling Grace Window:
  // Prevent immediate square-off on order fill due to initial quote arrival or opening bid-ask bounce.
  // Standard: 6s grace window. Testing Mode: 30s settling window so trades never close in seconds.
  const graceWindowMs = isTesting ? 30000 : 6000;
  if (tradeAgeMs < graceWindowMs) {
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

  if (entry > 0) {
    const units = Number(trade.quantity || 1) * Math.max(1, Number(trade.lotSize || 65));
    const estimatedCharges = calculateStatutoryCharges(entry, entry, units, isShortTrade ? "SHORT" : "LONG");
    const frictionPoints = Math.max(1.50, Number((estimatedCharges / units + 0.30).toFixed(2)));
    const targetDistance = Math.abs(target - entry);
    const beThreshold = Math.max(4.0, Number((targetDistance * 0.50).toFixed(2)));

    if (!isTesting && targetDistance >= 6.0) {
      if (isShortTrade) {
        const bePrice = Number((entry - frictionPoints).toFixed(2));
        if (ltp <= entry - beThreshold && (stopLoss === 0 || stopLoss > bePrice) && (bePrice - ltp) >= 0.50) {
          lockBreakeven(engine, trade, bePrice, ltp);
        }
      } else {
        const bePrice = Number((entry + frictionPoints).toFixed(2));
        if (ltp >= entry + beThreshold && (stopLoss === 0 || stopLoss < bePrice) && (ltp - bePrice) >= 0.50) {
          lockBreakeven(engine, trade, bePrice, ltp);
        }
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
  const currentSl = Number(trade.stopLoss || 0);
  const entry = Number(trade.entryPrice || 0);
  const isShort = trade.direction === "SHORT";

  // Ratchet Guard: Stop loss can only move in the profitable/protective direction, NEVER widen!
  if (currentSl > 0) {
    if (isShort && newStopLoss >= currentSl) return;
    if (!isShort && newStopLoss <= currentSl) return;
  }

  try {
    const db = getDb();
    db.prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(newStopLoss, id);
    trade.stopLoss = newStopLoss;
    const item = engine.activeTrades.get(id);
    if (item) item.trade.stopLoss = newStopLoss;

    // Authoritative Sync: Update .NET RMS in-memory position stop loss
    updateStopLossDotnet(id, newStopLoss, currentLtp).catch(() => {});

    engine.publish("breakeven_locked", {
      tradeId: id,
      symbol: trade.symbol,
      newStopLoss,
      stopLoss: newStopLoss,
      entryPrice: trade.entryPrice,
      currentLtp,
      message: `Breakeven Locked at ₹${newStopLoss.toFixed(2)} (+0.50 pt buffer)`,
    });
    engine.publish("trade_mutation", {
      action: "stop_loss",
      tradeId: id,
      stopLoss: newStopLoss,
      isBreakevenLocked: true,
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
    let fillPrice = Number(tick.ltp);
    const isTarget = reason === "TARGET_HIT";
    if (isTarget) {
      fillPrice = Number(trade.targetPrice || tick.ltp);
    } else {
      const sl = Number(trade.stopLoss || 0);
      const isShort = trade.direction === "SHORT";
      if (sl > 0) {
        fillPrice = isShort ? Math.max(sl, tick.ltp) : Math.min(sl, tick.ltp);
      }
    }
    fillPrice = Math.round(fillPrice * 100) / 100;

    const exactFill = Boolean(tick.exactFill || isTarget);
    const result = markPaperTrade(id, { price: fillPrice, reason, exactFill });
    engine.removeTrade(id);
    const eventType = isTarget ? "target_hit" : "stop_loss_hit";
    engine.publish(eventType, {
      tradeId: id,
      symbol: trade.symbol,
      ltp: fillPrice,
      exitPrice: result.trade.exit_price || fillPrice,
      reason,
      exitTime: result.trade.exitDatetime,
      pnl: result.trade.netPnl,
      message: isTarget ? "Target Hit" : "Stop Loss Hit",
      isReconciled: Boolean(tick.isReconciled),
    });

    if (isTarget) {
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

/**
 * Resolves executable exit fill price strictly from verified market depth.
 * 
 * Invariants:
 * 1. For Long option positions (CE/PE), liquidation is a SALE -> consumes BID liquidity.
 * 2. For Short positions, liquidation is a BUY -> consumes ASK liquidity.
 * 3. LTP is strictly reference data and MUST NEVER be used as an assumed exit fill when depth is missing.
 * 
 * Distinguishes all 6 cases:
 * Case 1: depth is absent (undefined).
 * Case 2: depth is null.
 * Case 3: depth exists, but bids (or asks) is absent.
 * Case 4: bids (or asks) exists, but is empty (length === 0).
 * Case 5: best bid (or ask) is zero, negative, non-numeric, zero-quantity, or stale.
 * Case 6: fresh, valid executable bid (or ask) with positive price and depth is available.
 */
export function extractExecutableLiquidity(tick, isShort = false) {
  if (!tick || tick.depth === undefined) {
    return { hasExecutableLiquidity: false, executablePrice: null, caseCode: 1, reason: "DEPTH_ABSENT" };
  }
  if (tick.depth === null || typeof tick.depth !== "object") {
    return { hasExecutableLiquidity: false, executablePrice: null, caseCode: 2, reason: "DEPTH_NULL" };
  }

  const depth = tick.depth;
  const bookSide = isShort ? depth.asks : depth.bids;
  const sideName = isShort ? "ASK" : "BID";

  if (bookSide === undefined) {
    return { hasExecutableLiquidity: false, executablePrice: null, caseCode: 3, reason: `NO_${sideName}S_ARRAY` };
  }

  if (!Array.isArray(bookSide) || bookSide.length === 0) {
    return { hasExecutableLiquidity: false, executablePrice: null, caseCode: 4, reason: `EMPTY_${sideName}S` };
  }

  const bestEntry = bookSide[0];
  if (!bestEntry || typeof bestEntry !== "object") {
    return { hasExecutableLiquidity: false, executablePrice: null, caseCode: 5, reason: `INVALID_BEST_${sideName}` };
  }

  const price = Number(bestEntry.price);
  const quantity = Number(bestEntry.quantity ?? bestEntry.orders ?? 1);
  const isStale = tick.isFresh === false || tick.isStale === true || depth.isStale === true;

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0 || isStale) {
    return {
      hasExecutableLiquidity: false,
      executablePrice: null,
      caseCode: 5,
      reason: isStale ? `STALE_BEST_${sideName}` : `INVALID_OR_ZERO_${sideName}`
    };
  }

  return {
    hasExecutableLiquidity: true,
    executablePrice: price,
    depthQuantity: quantity,
    caseCode: 6,
    reason: "VALID_DEPTH"
  };
}

export function reconcileActivePosition(engine, item, tick) {
  const trade = item.trade;
  const id = Number(trade.id);
  const ltp = Number(tick.ltp || 0);
  const stopLoss = Number(trade.stopLoss || 0);
  const target = Number(trade.targetPrice || 0);
  const entry = Number(trade.entryPrice || 0);
  const isShort = trade.direction === "SHORT" || (target < entry && stopLoss > entry);

  // 1. Resolve executable liquidity from market depth (Cases 1-6)
  const liquidity = extractExecutableLiquidity(tick, isShort);
  const hasExecutableLiquidity = liquidity.hasExecutableLiquidity;
  const executablePrice = liquidity.executablePrice;

  // 2. Evaluate breaches using LTP as reference data
  const isStopBreached = isShort ? (stopLoss > 0 && ltp >= stopLoss) : (stopLoss > 0 && ltp <= stopLoss);
  const isTargetBreached = isShort ? (target > 0 && ltp <= target) : (target > 0 && ltp >= target);

  // Missing-interval evidence: sequence events or interval OHLC (strictly bounded to outage; never all-day candle)
  const intervalOhlc = tick.intervalOhlc || null;
  const intervalLow = intervalOhlc ? Number(intervalOhlc.low ?? NaN) : NaN;
  const intervalHigh = intervalOhlc ? Number(intervalOhlc.high ?? NaN) : NaN;
  const hasIntervalOhlc = Number.isFinite(intervalLow) && Number.isFinite(intervalHigh);

  const sequenceEvents = Array.isArray(tick.sequenceEvents) ? tick.sequenceEvents : null;

  // Case A: Missing-interval sequence events establish exact order
  if (sequenceEvents && sequenceEvents.length > 0) {
    let firstTrigger = null;
    let eventFill = null;
    for (const ev of sequenceEvents) {
      const evP = Number(ev.ltp ?? ev.price ?? 0);
      const evBid = ev.depth?.bids?.[0]?.price ?? ev.bid ?? evP;
      const evAsk = ev.depth?.asks?.[0]?.price ?? ev.ask ?? evP;
      const checkP = isShort ? evAsk : evBid;

      if (!firstTrigger) {
        if (isShort) {
          if (stopLoss > 0 && checkP >= stopLoss) {
            firstTrigger = "STOP_LOSS_HIT";
            eventFill = Math.max(stopLoss, checkP);
          } else if (target > 0 && checkP <= target) {
            firstTrigger = "TARGET_HIT";
            eventFill = target;
          }
        } else {
          if (stopLoss > 0 && checkP <= stopLoss) {
            firstTrigger = stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
            eventFill = Math.min(stopLoss, checkP);
          } else if (target > 0 && checkP >= target) {
            firstTrigger = "TARGET_HIT";
            eventFill = target;
          }
        }
      }
    }

    if (firstTrigger) {
      console.warn(`[paperTradeEngine] Reconciled trade ${id} via verified sequence events: ${firstTrigger} at ₹${eventFill}`);
      triggerTradeExecution(engine, trade, { ...tick, ltp: eventFill, exactFill: true, isReconciled: true }, firstTrigger);
      return;
    }
  }

  // Case B: Recovered below Stop Loss (Stop Breached)
  if (isStopBreached) {
    if (!hasExecutableLiquidity) {
      item.monitoringState = "RECONCILIATION_REQUIRED";
      item.pnlStatus = "UNVERIFIED";
      item.isStale = true;
      item.degradedReason = isShort ? "NO_EXECUTABLE_ASK" : "NO_EXECUTABLE_BID";
      item.lastKnownReferencePrice = ltp;
      engine.publish("monitoring_reconciliation_required", {
        tradeId: id,
        symbol: trade.symbol,
        reason: item.degradedReason,
        ltp,
        message: `Recovery below stop loss on ${trade.symbol}, but zero executable ${isShort ? "asks" : "bids"} available in depth. Position remains unresolved.`,
      });
      return;
    }

    const breachReason = isShort ? (stopLoss < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT") : (stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT");
    const fillPrice = isShort ? Math.max(stopLoss, executablePrice) : Math.min(stopLoss, executablePrice);
    console.warn(`[paperTradeEngine] Reconciled trade ${id} on feed recovery: gapped through ${breachReason} to fill at ₹${fillPrice}`);
    triggerTradeExecution(engine, trade, { ...tick, ltp: fillPrice, exactFill: true, isReconciled: true }, breachReason);
    return;
  }

  // Case C: Recovered at or beyond Target (Target Breached)
  if (isTargetBreached) {
    if (hasIntervalOhlc) {
      const stopTouchedDuringOutage = isShort ? (intervalHigh >= stopLoss) : (intervalLow <= stopLoss);
      const targetTouchedDuringOutage = isShort ? (intervalLow <= target) : (intervalHigh >= target);

      if (stopTouchedDuringOutage && targetTouchedDuringOutage) {
        // Both touched during outage and chronological sequence is unknown:
        // Apply existing conservative STOP_FIRST policy!
        if (!hasExecutableLiquidity) {
          item.monitoringState = "RECONCILIATION_REQUIRED";
          item.pnlStatus = "UNVERIFIED";
          item.isStale = true;
          item.degradedReason = isShort ? "NO_EXECUTABLE_ASK" : "NO_EXECUTABLE_BID";
          item.lastKnownReferencePrice = ltp;
          engine.publish("monitoring_reconciliation_required", {
            tradeId: id,
            symbol: trade.symbol,
            reason: item.degradedReason,
            ltp,
            message: `Conservative STOP_FIRST policy on ${trade.symbol}, but zero executable ${isShort ? "asks" : "bids"} available in depth. Position remains unresolved.`,
          });
          return;
        }

        const breachReason = isShort ? (stopLoss < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT") : (stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT");
        const fillPrice = isShort ? Math.max(stopLoss, executablePrice) : Math.min(stopLoss, executablePrice);
        console.warn(`[paperTradeEngine] Reconciled trade ${id} via conservative STOP_FIRST policy (interval touched both SL & TP): ${breachReason} at ₹${fillPrice}`);
        triggerTradeExecution(engine, trade, { ...tick, ltp: fillPrice, exactFill: true, isReconciled: true }, breachReason);
        return;
      }

      if (!stopTouchedDuringOutage && targetTouchedDuringOutage) {
        // Target touched, stop was NEVER breached during outage!
        console.warn(`[paperTradeEngine] Reconciled trade ${id} via verified interval OHLC: TARGET_HIT at resting limit ₹${target}`);
        triggerTradeExecution(engine, trade, { ...tick, ltp: target, exactFill: true, isReconciled: true }, "TARGET_HIT");
        return;
      }
    }

    // No interval evidence to prove that target occurred without stop breach:
    // Mark RECONCILIATION_REQUIRED, do NOT invent a target hit!
    item.monitoringState = "RECONCILIATION_REQUIRED";
    item.pnlStatus = "UNVERIFIED";
    item.isStale = true;
    item.degradedReason = "UNRESOLVED_GAP_SEQUENCE";
    item.lastKnownReferencePrice = ltp;
    engine.publish("monitoring_reconciliation_required", {
      tradeId: id,
      symbol: trade.symbol,
      reason: "UNRESOLVED_GAP_SEQUENCE",
      ltp,
      message: `Recovered above target price on ${trade.symbol}, but missing-interval trigger sequence is unproven. Position marked RECONCILIATION_REQUIRED.`,
    });
    return;
  }

  // Case D: Price recovered within [StopLoss, Target]
  if (hasIntervalOhlc) {
    const stopTouchedDuringOutage = isShort ? (intervalHigh >= stopLoss) : (intervalLow <= stopLoss);
    if (stopTouchedDuringOutage) {
      if (!hasExecutableLiquidity) {
        item.monitoringState = "RECONCILIATION_REQUIRED";
        item.pnlStatus = "UNVERIFIED";
        item.isStale = true;
        item.degradedReason = isShort ? "NO_EXECUTABLE_ASK" : "NO_EXECUTABLE_BID";
        item.lastKnownReferencePrice = ltp;
        engine.publish("monitoring_reconciliation_required", {
          tradeId: id,
          symbol: trade.symbol,
          reason: item.degradedReason,
          ltp,
          message: `Stop touched during outage on ${trade.symbol}, but zero executable ${isShort ? "asks" : "bids"} available in depth. Position remains unresolved.`,
        });
        return;
      }

      const breachReason = isShort ? (stopLoss < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT") : (stopLoss > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT");
      const fillPrice = isShort ? Math.max(stopLoss, executablePrice) : Math.min(stopLoss, executablePrice);
      console.warn(`[paperTradeEngine] Reconciled trade ${id} via conservative STOP_FIRST policy (stop touched during outage): ${breachReason} at ₹${fillPrice}`);
      triggerTradeExecution(engine, trade, { ...tick, ltp: fillPrice, exactFill: true, isReconciled: true }, breachReason);
      return;
    }
  }

  // Neither stop nor target was breached; monitoring restored to NORMAL
  item.monitoringState = "NORMAL";
  item.pnlStatus = "VERIFIED";
  item.isStale = false;
  item.lastLtp = ltp;
  item.degradedAt = null;
  item.degradedReason = null;
  engine.publish("monitoring_restored", {
    tradeId: id,
    symbol: trade.symbol,
    ltp,
    message: "Monitoring restored to NORMAL. Live quotes and P&L verified.",
  });
}
