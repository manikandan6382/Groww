import { calculateTradeDuration } from "../../utils/dateUtils";
import { resolveNextExpiryDate } from "../../utils/expiryUtils";
import { resolveIndexLotSize, calculateStatutoryCharges } from "./tradeHelpers";
import { activeSquaringOffIds, tradeIdMap, broadcastTradeAction } from "./tradePersistence";

export const createOrderSquareOffSlice = (set, get) => ({
  squareOffTrade: (id, customExitPrice, explicitReason) => {
    if (activeSquaringOffIds.has(id)) return;
    activeSquaringOffIds.add(id);
    setTimeout(() => activeSquaringOffIds.delete(id), 3000);

    const trade = get().openAlerts.find(
      (t) => t.id === id || t.serverId === id || String(t.id) === String(id) || String(t.serverId) === String(id)
    );
    if (!trade) return;
    const baseExitPrice = customExitPrice ?? trade.lastMarkPrice ?? trade.entryPrice;
    const isShort = trade.direction === "SHORT";

    let determinedReason = explicitReason;
    if (!determinedReason) {
      if (isShort) {
        if (trade.targetPrice && baseExitPrice <= trade.targetPrice) determinedReason = "TARGET_HIT";
        else if (trade.stopLoss && baseExitPrice >= trade.stopLoss) determinedReason = baseExitPrice <= trade.entryPrice ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      } else {
        if (trade.targetPrice && baseExitPrice >= trade.targetPrice) determinedReason = "TARGET_HIT";
        else if (trade.stopLoss && baseExitPrice <= trade.stopLoss) determinedReason = baseExitPrice >= trade.entryPrice ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      }
      if (!determinedReason) determinedReason = "MANUAL_SQUARE_OFF";
    }

    const shouldSlippage = get().simulateSlippage;
    let slippageDeltaPts = 0;
    if (shouldSlippage) {
      if (determinedReason.includes("TARGET")) slippageDeltaPts = 0.20;
      else if (determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN") || determinedReason.includes("BE_HIT") || determinedReason.includes("RISK_FREE")) slippageDeltaPts = 0.60;
      else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT")) slippageDeltaPts = 1.80;
      else slippageDeltaPts = 0.75;
    }

    const exitPrice = shouldSlippage
      ? (isShort ? Math.max(0.05, baseExitPrice + slippageDeltaPts) : Math.max(0.05, baseExitPrice - slippageDeltaPts))
      : Math.max(0.05, baseExitPrice);
    
    const resolvedLot = resolveIndexLotSize(trade.symbol, trade.lotSize);
    const rawQty = Number(trade.quantity || 1);
    const lots = (rawQty >= resolvedLot && rawQty % resolvedLot === 0) ? (rawQty / resolvedLot) : rawQty;
    const totalQty = trade.totalQty ? Number(trade.totalQty) : (Math.max(1, lots) * resolvedLot);
    const grossPnl = isShort ? (trade.entryPrice - exitPrice) * totalQty : (exitPrice - trade.entryPrice) * totalQty;
    const friction = calculateStatutoryCharges(trade.entryPrice, exitPrice, totalQty);
    const netPnl = grossPnl - friction;
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
