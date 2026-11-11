import { calculateTradeDuration } from "../../utils/dateUtils.js";
import { resolveNextExpiryDate } from "../../utils/expiryUtils.js";
import { resolveIndexLotSize, calculateStatutoryCharges } from "./tradeHelpers.js";
import { normalizeBackendTrade } from "./tradeNormalizers.js";
import { activeSquaringOffIds, tradeIdMap, broadcastTradeAction, recordTradeTombstone, isTradeTombstoned } from "./tradePersistence.js";
import { recordLifecycleEvent, assertTradeInvariants } from "../../utils/tradeLifecycleAuditor.js";

export const createOrderSquareOffSlice = (set, get) => ({
  squareOffTrade: async (id, customExitPrice, explicitReason) => {
    if (isTradeTombstoned(id) || isTradeTombstoned(String(id))) {
      console.warn(`[SquareOff Idempotency] Ignored duplicate exit call for already tombstoned trade #${id}`);
      return null;
    }
    if (activeSquaringOffIds.has(id) || activeSquaringOffIds.has(String(id))) return;
    activeSquaringOffIds.add(id);
    activeSquaringOffIds.add(String(id));

    const resolvedServerId = tradeIdMap.get(String(id));
    const trade = get().openAlerts.find(
      (t) => t.id === id || t.serverId === id || String(t.id) === String(id) || String(t.serverId) === String(id) ||
             (resolvedServerId && (t.id === resolvedServerId || t.serverId === resolvedServerId || String(t.id) === String(resolvedServerId) || String(t.serverId) === String(resolvedServerId)))
    );
    if (!trade) {
      activeSquaringOffIds.delete(id);
      activeSquaringOffIds.delete(String(id));
      get().hydrateFromSqlite?.();
      return;
    }

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
    const checkPrice = customExitPrice ?? trade.lastMarkPrice ?? entry;
    // Target Breach Invariant: If price reached or breached target, it is unconditionally TARGET_HIT
    if (tp > 0 && (isShort ? checkPrice <= tp : checkPrice >= tp)) {
      determinedReason = "TARGET_HIT";
    } else if (!determinedReason) {
      if (isShort) {
        if (sl > 0 && checkPrice >= sl) determinedReason = sl < entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      } else {
        if (sl > 0 && checkPrice <= sl) determinedReason = sl > entry ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      }
      if (!determinedReason) determinedReason = "MANUAL_SQUARE_OFF";
    }

    // Anchor execution: Dynamic Gap Slippage Pass-Through
    // If the market gapped up through target, preserve positive slippage!
    // If the market crashed through stop loss, capture real negative slippage!
    let baseExitPrice;
    if (determinedReason.includes("TARGET")) {
      baseExitPrice = tp > 0 
        ? (isShort ? Math.min(tp, checkPrice) : Math.max(tp, checkPrice))
        : (customExitPrice ?? entry);
    } else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN") || determinedReason.includes("HARD_CAP")) {
      baseExitPrice = sl > 0 
        ? (isShort ? Math.max(sl, checkPrice) : Math.min(sl, checkPrice))
        : (customExitPrice ?? entry);
    } else {
      baseExitPrice = checkPrice;
    }

    let executionAttribution = "💻 PAPER SIMULATOR";
    if (determinedReason.includes("TARGET")) {
      executionAttribution = "⚡ NSE RESTING LIMIT";
    } else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("TRAILING") || determinedReason.includes("HARD_CAP")) {
      executionAttribution = "🛡️ RMS ALGO MLO";
    } else if (determinedReason.includes("MANUAL")) {
      executionAttribution = "🖱️ MANUAL DISPATCH";
    }

    const shouldSlippage = get().simulateSlippage;
    let slippageDeltaPts = 0;
    if (shouldSlippage) {
      if (determinedReason.includes("TARGET")) slippageDeltaPts = 0.15;
      else if (determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN") || determinedReason.includes("BE_HIT") || determinedReason.includes("RISK_FREE")) slippageDeltaPts = 0.30;
      else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT") || determinedReason.includes("PROTECTED") || determinedReason.includes("HARD_CAP")) slippageDeltaPts = 0.60;
      else slippageDeltaPts = 0.25;
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

    // Actual execution loss reflects real market fill; capital risk limits govern pre-trade sizing and RMS triggers, never artificial post-trade accounting fabrication.

    // Label Integrity: Never claim a trailing stop profit on a net negative exit
    if (netPnl < 0 && determinedReason === "TRAILING_SL_HIT") {
      determinedReason = "STOP_LOSS_HIT";
    }

    const exitSlippageCost = shouldSlippage ? Math.max(0, slippageDeltaPts * totalQty) : 0;
    const totalSlippageCost = (trade.entrySlippage ? trade.entrySlippage * totalQty : 0) + exitSlippageCost;

    const exitDatetime = new Date().toISOString();
    const tradeDuration = calculateTradeDuration(trade.entryDatetime, exitDatetime);
    const authoritativeId = trade.serverId || trade.id || Date.now();
    const nextRev = (trade.revision || 1) + 1;
    tradeIdMap.set(String(trade.id), authoritativeId);
    tradeIdMap.set(String(authoritativeId), authoritativeId);
    recordTradeTombstone(trade.id, nextRev);
    if (trade.serverId) recordTradeTombstone(trade.serverId, nextRev);
    recordTradeTombstone(authoritativeId, nextRev);

    const closed = {
      id: authoritativeId,
      serverId: trade.serverId || authoritativeId,
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
      direction: trade.direction || (isShort ? "SHORT" : "LONG"),
      tradeType: "INTRADAY",
      status: "CLOSED",
      revision: nextRev,
      initialStopLoss: trade.initialStopLoss || trade.stopLoss,
      currentStopLoss: trade.stopLoss,
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
      executionAttribution,
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

    recordLifecycleEvent({
      tradeId: authoritativeId,
      revision: nextRev,
      event: "EXIT_CONFIRMED",
      state_before: trade.status || "ACTIVE",
      state_after: "CLOSED",
      currentPrice: exitPrice,
      entryPrice: trade.entryPrice,
      initialSL: trade.initialStopLoss || trade.stopLoss,
      currentSL: trade.stopLoss,
      target: trade.targetPrice,
      source: determinedReason.includes("MANUAL") ? "MANUAL_DISPATCH" : "RMS_AUTHORITATIVE",
      details: `Exit reason: ${determinedReason} at ₹${exitPrice.toFixed(2)}`
    });
    assertTradeInvariants(closed, "CLOSED");

    const next = [closed, ...get().masterTrades.filter((t) => t.id !== authoritativeId && String(t.id) !== String(authoritativeId) && String(t.id) !== String(trade.id))];
    const nextAlerts = get().openAlerts.filter((t) => t.id !== trade.id && (!trade.serverId || t.serverId !== trade.serverId));
    set({ openAlerts: nextAlerts, masterTrades: next, closedAlerts: next, journalTrades: next, settlementToast: closed });

    // Engage Anti-Tilt Cooling Shield for 30 seconds on any loss or SL hit
    if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT") || (netPnl < 0 && !determinedReason.includes("TARGET"))) {
      get().activateTiltShield?.(30000, "Stop Loss executed. 30s Anti-Tilt Cooling Shield active to prevent revenge trading.");
    }

    recordTradeTombstone(authoritativeId, closed.revision || 1);
    if (trade.id) recordTradeTombstone(trade.id, closed.revision || 1);
    if (trade.serverId) recordTradeTombstone(trade.serverId, closed.revision || 1);

    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts));
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}

    broadcastTradeAction("TRADE_CLOSED", { id: authoritativeId, localId: trade.id, serverId: trade.serverId });
    const backendId = trade.serverId || tradeIdMap.get(String(trade.id)) || tradeIdMap.get(String(id)) || id;
    try {
      const res = await fetch(`/api/paper-lab/trades/${backendId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ price: Number(exitPrice.toFixed(2)), reason: determinedReason })
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.trade) {
          const authoritativeTrade = normalizeBackendTrade(data.trade, closed);
          const currentClosed = get().closedAlerts || [];
          const mergedClosed = currentClosed.map((t) =>
            (t.id === authoritativeId || t.serverId === authoritativeId || String(t.id) === String(authoritativeId) ||
             (data.trade.id && (t.id === data.trade.id || String(t.id) === String(data.trade.id))))
              ? authoritativeTrade
              : t
          );
          set({
            closedAlerts: mergedClosed,
            masterTrades: mergedClosed,
            journalTrades: mergedClosed,
            settlementToast: authoritativeTrade
          });
          recordLifecycleEvent({
            tradeId: authoritativeTrade.id,
            revision: nextRev,
            event: "EXIT_SETTLED_AUTHORITATIVE",
            state_before: "CLOSED",
            state_after: "CLOSED",
            currentPrice: authoritativeTrade.exitPrice,
            entryPrice: authoritativeTrade.entryPrice,
            source: "SERVER_RMS_SQLITE",
            details: `Authoritative exit settled: gross ₹${authoritativeTrade.grossPnl}, charges ₹${authoritativeTrade.taxesAndCharges}, net ₹${authoritativeTrade.netPnl}`
          });
          try {
            localStorage.setItem("portfolio-master-trades", JSON.stringify(mergedClosed));
            localStorage.setItem("portfolio-journal-trades", JSON.stringify(mergedClosed));
          } catch {}
          get().hydrateFromSqlite?.();
          return authoritativeTrade;
        }
      }
      get().hydrateFromSqlite?.();
    } catch (err) {
      console.warn("[AuthoritativeExit] Backend close sync error:", err.message);
      get().hydrateFromSqlite?.();
    }

    return closed;
  },

  squareOffAlert: (id, customExitPrice) => get().squareOffTrade(id, customExitPrice),

  isGlobalLiquidating: false,
  setIsGlobalLiquidating: (val) => set({ isGlobalLiquidating: Boolean(val) }),

  squareOffAll: () => {
    set({ isGlobalLiquidating: true });
    get().openAlerts.forEach((trade) => get().squareOffTrade(trade.id));
    set({ openAlerts: [] });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify([]));
      fetch("/api/paper-lab/square-off-all", { method: "POST" }).catch(() => {});
    } catch {}
    setTimeout(() => {
      set({ isGlobalLiquidating: false });
    }, 1500);
  },
});
