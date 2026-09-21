import { calculateTradeDuration } from "../../utils/dateUtils";
import { resolveNextExpiryDate } from "../../utils/expiryUtils";
import { resolveIndexLotSize, calculateStatutoryCharges } from "./tradeHelpers";
import { activeSquaringOffIds, tradeIdMap, broadcastTradeAction } from "./tradePersistence";

export const createOrderSquareOffSlice = (set, get) => ({
  squareOffTrade: (id, customExitPrice, explicitReason) => {
    if (activeSquaringOffIds.has(id) || activeSquaringOffIds.has(String(id))) return;
    activeSquaringOffIds.add(id);
    activeSquaringOffIds.add(String(id));

    const trade = get().openAlerts.find(
      (t) => t.id === id || t.serverId === id || String(t.id) === String(id) || String(t.serverId) === String(id)
    );
    if (!trade) return;

    if (trade.id) {
      activeSquaringOffIds.add(trade.id);
      activeSquaringOffIds.add(String(trade.id));
    }
    if (trade.serverId) {
      activeSquaringOffIds.add(trade.serverId);
      activeSquaringOffIds.add(String(trade.serverId));
    }
    setTimeout(() => {
      activeSquaringOffIds.delete(id);
      activeSquaringOffIds.delete(String(id));
      if (trade.id) {
        activeSquaringOffIds.delete(trade.id);
        activeSquaringOffIds.delete(String(trade.id));
      }
      if (trade.serverId) {
        activeSquaringOffIds.delete(trade.serverId);
        activeSquaringOffIds.delete(String(trade.serverId));
      }
    }, 4000);
    const isShort = trade.direction === "SHORT";
    const entry = Number(trade.entryPrice || 0);
    const sl = Number(trade.stopLoss || 0);
    const tp = Number(trade.targetPrice || 0);

    let determinedReason = explicitReason;
    if (!determinedReason) {
      const checkPrice = customExitPrice ?? trade.lastMarkPrice ?? entry;
      if (isShort) {
        if (tp > 0 && checkPrice <= tp) determinedReason = "TARGET_HIT";
        else if (sl > 0 && checkPrice >= sl) determinedReason = sl < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      } else {
        if (tp > 0 && checkPrice >= tp) determinedReason = "TARGET_HIT";
        else if (sl > 0 && checkPrice <= sl) determinedReason = sl > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      }
      if (!determinedReason) determinedReason = "MANUAL_SQUARE_OFF";
    }

    // Anchor execution: When an order hits Stop Loss or Target, anchor to the resting order price!
    let baseExitPrice;
    if (determinedReason.includes("TARGET")) {
      baseExitPrice = tp > 0 ? tp : (customExitPrice ?? entry);
    } else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN")) {
      baseExitPrice = sl > 0 ? sl : (customExitPrice ?? entry);
    } else {
      baseExitPrice = customExitPrice ?? trade.lastMarkPrice ?? entry;
    }

    const shouldSlippage = get().simulateSlippage;
    let slippageDeltaPts = 0;
    if (shouldSlippage) {
      if (determinedReason.includes("TARGET")) slippageDeltaPts = 0.20;
      else if (determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN") || determinedReason.includes("BE_HIT") || determinedReason.includes("RISK_FREE")) slippageDeltaPts = 0.35;
      else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT")) slippageDeltaPts = 0.50;
      else slippageDeltaPts = 0.50;
    }

    let exitPrice = shouldSlippage
      ? (isShort ? Math.max(0.05, baseExitPrice + slippageDeltaPts) : Math.max(0.05, baseExitPrice - slippageDeltaPts))
      : Math.max(0.05, baseExitPrice);
    
    const resolvedLot = resolveIndexLotSize(trade.symbol, trade.lotSize);
    const rawQty = Number(trade.quantity || 1);
    const lots = (rawQty >= resolvedLot && rawQty % resolvedLot === 0) ? (rawQty / resolvedLot) : rawQty;
    const totalQty = trade.totalQty ? Number(trade.totalQty) : (Math.max(1, lots) * resolvedLot);
    let grossPnl = isShort ? (entry - exitPrice) * totalQty : (exitPrice - entry) * totalQty;
    const friction = calculateStatutoryCharges(entry, exitPrice, totalQty);
    let netPnl = grossPnl - friction;

    // Manikandan's Strict Capital Risk Invariant: Loss is physically clamped to ₹300 on single lot!
    if (lots <= 1 && netPnl < -300.00) {
      netPnl = -300.00;
      grossPnl = -300.00 + friction;
      exitPrice = isShort ? (entry - (grossPnl / totalQty)) : (entry + (grossPnl / totalQty));
    }

    // Label Integrity: Never claim a trailing stop profit on a net negative exit
    if (netPnl < 0 && determinedReason === "TRAILING_SL_HIT") {
      determinedReason = "STOP_LOSS_HIT";
    }

    const exitSlippageCost = shouldSlippage ? Math.max(0, slippageDeltaPts * totalQty) : 0;
    const totalSlippageCost = (trade.entrySlippage ? trade.entrySlippage * totalQty : 0) + exitSlippageCost;

    const exitDatetime = new Date().toISOString();
    const tradeDuration = calculateTradeDuration(trade.entryDatetime, exitDatetime);
    const authoritativeId = trade.serverId || trade.id || Date.now();
    tradeIdMap.set(String(trade.id), authoritativeId);
    tradeIdMap.set(String(authoritativeId), authoritativeId);

    const closed = {
      id: authoritativeId,
      serverId: trade.serverId || authoritativeId,
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
      direction: trade.direction || (isShort ? "SHORT" : "LONG"),
      tradeType: "INTRADAY",
      entryDatetime: trade.entryDatetime || new Date().toISOString(),
      exitDatetime,
      expiryDatetime: trade.expiryDatetime || resolveNextExpiryDate(trade.symbol, trade.entryDatetime || exitDatetime).toISOString(),
      expiryDate: trade.expiryDate || (trade.expiryDatetime ? trade.expiryDatetime.split("T")[0] : null),
      duration: tradeDuration,
      entryPrice: trade.entryPrice,
      exitPrice: Number(exitPrice.toFixed(2)),
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      quantity: trade.quantity || 1,
      lotSize: resolvedLot,
      grossPnl: Number(grossPnl.toFixed(2)),
      taxesAndCharges: friction,
      slippageCost: Number(totalSlippageCost.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      closeReason: determinedReason,
      priceHistory: trade.priceHistory || trade.ticks || null,
      strategyTag: trade.entryReason || "Manual Practice Scalp",
      strategyTags: trade.entryReason || "Manual Practice Scalp",
      mistakeTags: netPnl >= 0 ? "None" : "Execution Deviation",
      confidenceScore: 8,
      followedPlan: true,
      catalyst: trade.personalNotes || "Live desk order book momentum scalp.",
      executionDetails: `Executed at ₹${trade.entryPrice}, squared off at ₹${exitPrice.toFixed(2)}. Net P&L: ${netPnl >= 0 ? "+" : ""}₹${netPnl.toFixed(2)} (Friction: ₹${friction} · Slippage: ₹${totalSlippageCost.toFixed(1)}).`,
      mindsetEmotion: netPnl >= 0 ? "Disciplined Execution" : "Controlled Exit",
      lessonsLearned: "Exited at predetermined target/stop cleanly with zero tilt."
    };

    const next = [closed, ...get().masterTrades];
    const nextAlerts = get().openAlerts.filter((t) => t.id !== trade.id && (!trade.serverId || t.serverId !== trade.serverId));
    set({ openAlerts: nextAlerts, masterTrades: next, closedAlerts: next, journalTrades: next, settlementToast: closed });

    // Engage Anti-Tilt Cooling Shield for 30 seconds on any loss or SL hit
    if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT") || (netPnl < 0 && !determinedReason.includes("TARGET"))) {
      get().activateTiltShield?.(30000, "Stop Loss executed. 30s Anti-Tilt Cooling Shield active to prevent revenge trading.");
    }

    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts));
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}

    broadcastTradeAction("TRADE_CLOSED", { id: authoritativeId });
    const backendId = trade.serverId || id;
    try {
      fetch(`/api/paper-lab/trades/${backendId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(exitPrice.toFixed(2)), reason: determinedReason })
      }).then(() => {
        fetch("/api/paper-lab").then((r) => (r.ok ? r.json() : null)).then((data) => {
          if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
          if (data?.openTrades) get().syncBackendOpenTrades(data.openTrades);
        }).catch(() => {});
      }).catch(() => {});
    } catch {}

    return closed;
  },

  squareOffAlert: (id, customExitPrice) => get().squareOffTrade(id, customExitPrice),

  squareOffAll: () => {
    get().openAlerts.forEach((trade) => get().squareOffTrade(trade.id));
    set({ openAlerts: [] });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify([]));
      fetch("/api/paper-lab/square-off-all", { method: "POST" }).catch(() => {});
    } catch {}
  },
});
