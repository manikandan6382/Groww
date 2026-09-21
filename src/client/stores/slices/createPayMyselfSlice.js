import { tradeIdMap, pendingPartialCloseQueue, debounceNetworkSync } from "./tradePersistence";

export const createPayMyselfSlice = (set, get) => ({
  payMyself: (id, customExitPrice) => {
    const trade = get().openAlerts.find((t) => t.id === id);
    if (!trade) return null;

    const entry = Number(trade.entryPrice || 0);
    const rawExit = Number(customExitPrice || trade.currentPrice || entry);
    const exitPrice = get().simulateSlippage
      ? Number((trade.direction === "SHORT" ? (rawExit * 1.002) : (rawExit * 0.998)).toFixed(2))
      : rawExit;

    const isShort = trade.direction === "SHORT";
    const grossPts = isShort ? (entry - exitPrice) : (exitPrice - entry);

    // Guard: Cannot Pay Myself or Lock Breakeven if position is at a loss or flat
    if (grossPts < 0.5) {
      console.warn("Cannot Pay Myself or Lock Breakeven while position is at a loss or flat.");
      return null;
    }

    const totalLots = Number(trade.quantity || 1);
    const resolvedLot = Math.max(1, Number(trade.lotSize || (trade.symbol.includes("BANKNIFTY") ? 30 : trade.symbol.includes("SENSEX") ? 20 : 65)));
    const trancheIndex = (trade.scaledOutCount || 0) + 1;
    const isSingleLot = totalLots <= 1;

    const scaledLots = isSingleLot ? 0 : 1;
    const remainingLots = isSingleLot ? 1 : Math.max(1, totalLots - 1);
    const scaledUnits = scaledLots * resolvedLot;
    const remainingUnits = remainingLots * resolvedLot;

    const grossPnl = scaledUnits > 0 ? Number((grossPts * scaledUnits).toFixed(2)) : 0;
    const friction = scaledUnits > 0 ? Number((28.50 + (exitPrice * scaledUnits * 0.001)).toFixed(2)) : 0;
    const netPnl = scaledUnits > 0 ? Number((grossPnl - friction).toFixed(2)) : 0;

    const estimatedRemainingCharges = 28.50 + (entry * remainingUnits * 0.001);
    const frictionPts = Math.max(1.50, Number((estimatedRemainingCharges / remainingUnits + 0.30).toFixed(2)));
    const trueBePrice = isShort ? Number((entry - frictionPts).toFixed(2)) : Number((entry + frictionPts).toFixed(2));

    let newSlPrice = trueBePrice;
    let trancheLabel = isSingleLot ? "1-Lot Risk-Free BE Lock" : "Tranche 1 (T1 Scalp)";
    let closeReason = isSingleLot ? "LOCK_TRUE_BE" : "PAY_MYSELF_T1";

    if (isSingleLot && grossPts >= 2.5) {
      const profitLockPts = Number((grossPts * 0.75).toFixed(2));
      newSlPrice = isShort ? Number((entry - profitLockPts).toFixed(2)) : Number((entry + profitLockPts).toFixed(2));
      trancheLabel = "1-Lot 75% Profit Lock";
      closeReason = "PAY_MYSELF_75PCT_LOCK";
    } else if (!isSingleLot && trancheIndex >= 2) {
      const lockOffset = Math.max(frictionPts + 3.0, Math.abs(grossPts) * 0.45);
      newSlPrice = isShort ? Number((entry - lockOffset).toFixed(2)) : Number((entry + lockOffset).toFixed(2));
      trancheLabel = "Tranche 2 (T2 Structural)";
      closeReason = "PAY_MYSELF_T2";
    }

    // Guard: Prevent Stop Loss from being placed above current market price in LONG (or below in SHORT)
    if (!isShort && newSlPrice >= exitPrice) {
      newSlPrice = Math.max(entry, Number((exitPrice - 0.50).toFixed(2)));
    } else if (isShort && newSlPrice <= exitPrice) {
      newSlPrice = Math.min(entry, Number((exitPrice + 0.50).toFixed(2)));
    }

    let closedPartial = null;
    let nextMaster = get().masterTrades;

    if (scaledLots > 0) {
      closedPartial = {
        id: Date.now(),
        parentTradeId: trade.id,
        symbol: trade.symbol,
        optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
        direction: trade.direction || (isShort ? "SHORT" : "LONG"),
        tradeType: "INTRADAY",
        entryDatetime: trade.entryDatetime || new Date().toISOString(),
        exitDatetime: new Date().toISOString(),
        duration: `Scale-Out ${trancheLabel}`,
        entryPrice: entry,
        exitPrice: Number(exitPrice.toFixed(2)),
        targetPrice: trade.targetPrice,
        stopLoss: newSlPrice,
        quantity: scaledLots,
        lotSize: resolvedLot,
        grossPnl,
        taxesAndCharges: friction,
        slippageCost: 0,
        netPnl,
        closeReason,
        strategyTag: `Mark Douglas Principle #5 (${trancheLabel})`,
        strategyTags: `Mark Douglas Principle #5: Pay Myself (${trancheLabel})`,
        mistakeTags: "None",
        confidenceScore: 10,
        followedPlan: true,
        catalyst: `Mark Douglas Principle #5: 'I pay myself as the market makes money available to me.' Booked ${trancheLabel} profit.`,
        executionDetails: `Scaled ${scaledLots} lot (${scaledUnits} Qty) at ₹${exitPrice.toFixed(2)} (+${grossPts.toFixed(2)} pts). Net: +₹${netPnl.toFixed(2)}. Remaining ${remainingLots} lot runner secured at SL ₹${newSlPrice.toFixed(2)}.`,
        mindsetEmotion: "Disciplined Execution / The Zone",
        lessonsLearned: trancheIndex === 1 ? "Banked cash early to establish Risk-Free Opportunity." : "Locked secondary gains."
      };
      nextMaster = [closedPartial, ...get().masterTrades];
    }

    let updatedActiveTrade = null;
    const updatedAlerts = get().openAlerts.map((t) => {
      if (t.id === id) {
        updatedActiveTrade = {
          ...t,
          quantity: remainingLots,
          stopLoss: newSlPrice,
          isTrueBeLocked: true,
          isRiskFreeRunner: true,
          trancheLevel: trancheIndex,
          bankedProfit: Number(((t.bankedProfit || 0) + netPnl).toFixed(2)),
          scaledOutCount: trancheIndex
        };
        return updatedActiveTrade;
      }
      return t;
    });

    set({
      openAlerts: updatedAlerts,
      masterTrades: nextMaster,
      closedAlerts: nextMaster,
      journalTrades: nextMaster,
      settlementToast: closedPartial || null
    });

    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updatedAlerts));
      localStorage.setItem("portfolio-master-trades", JSON.stringify(nextMaster));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(nextMaster));
      
      const backendId = trade.serverId || tradeIdMap.get(id);
      const syncPayload = { remainingQuantity: remainingLots, stopLoss: newSlPrice, exitPrice: Number(exitPrice.toFixed(2)), scaledLots, netPnl, grossPnl, charges: friction, closeReason };

      if (backendId) {
        debounceNetworkSync(`trade_${id}_partial_close`, () => {
          fetch(`/api/paper-lab/trades/${backendId}/partial-close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(syncPayload)
          }).catch(() => {});
        }, 100);
      } else {
        pendingPartialCloseQueue.set(id, syncPayload);
        fetch(`/api/paper-lab/trades/${id}/partial-close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncPayload)
        }).catch(() => {});
      }
    } catch {}

    return { closedPartial, updatedActiveTrade };
  },
});
