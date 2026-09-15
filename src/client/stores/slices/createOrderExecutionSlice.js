import { resolveNextExpiryDate } from "../../utils/expiryUtils";
import { resolveIndexLotSize } from "./tradeHelpers";
import { tradeIdMap, flushPendingPartialClose, broadcastTradeAction } from "./tradePersistence";
import { calculateRiskRewardTargets } from "../../components/trading/order-pad/hooks/orderPadCalculations";

export const createOrderExecutionSlice = (set, get) => ({
  openAlerts: (() => {
    try {
      const saved = localStorage.getItem("portfoliox_open_alerts");
      return saved !== null ? JSON.parse(saved) : [];
    } catch { return []; }
  })(),
  feedMode: "LIVE",
  setFeedMode: (mode) => set({ feedMode: mode }),
  strategyMode: "NAKED",
  setStrategyMode: (mode) => set({ strategyMode: mode }),
  simulateSlippage: true,
  setSimulateSlippage: (enabled) => set({ simulateSlippage: enabled }),
  deployToast: null,
  setDeployToast: (toast) => set({ deployToast: toast }),
  settlementToast: null,
  setSettlementToast: (toast) => set({ settlementToast: toast }),

  deployPracticeTrade: (trade) => {
    const isTesting = Boolean(get().testingMode);
    const todayCount = typeof get().getTodayTradesCount === "function" ? get().getTodayTradesCount() : 0;
    if (todayCount >= (get().dailyQuotaLimit || 3) && !get().dailyQuotaBypass && !isTesting) {
      console.warn("[Chaos Guard] Trade deployment blocked: Daily quota reached.");
      return null;
    }

    const idempotencyKey = trade.idempotencyKey || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const existing = get().openAlerts.find((t) => t.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const shouldSlippage = get().simulateSlippage;
    const baseEntry = Number(trade.entryPrice || 0);
    const entryFillPrice = shouldSlippage 
      ? Number((baseEntry * (1 + (0.002 + Math.random() * 0.0025))).toFixed(2))
      : baseEntry;
    const entrySlippage = Math.max(0, entryFillPrice - baseEntry);
    const entryDatetime = trade.entryDatetime || new Date().toISOString();

    let expiryDatetime = trade.expiryDatetime;
    if (!expiryDatetime) {
      try { expiryDatetime = resolveNextExpiryDate(trade.symbol, entryDatetime).toISOString(); } catch { expiryDatetime = null; }
    }
    const expiryDate = trade.expiryDate || (expiryDatetime ? expiryDatetime.split("T")[0] : null);

    const newTrade = {
      id: Date.now(),
      idempotencyKey,
      entryDatetime,
      expiryDatetime,
      expiryDate,
      plannedEntryPrice: baseEntry,
      entryPrice: entryFillPrice,
      lastMarkPrice: entryFillPrice,
      entrySlippage: Number(entrySlippage.toFixed(2)),
      ...trade,
      entryPrice: entryFillPrice
    };
    const nextAlerts = [newTrade, ...get().openAlerts];
    if (get().dailyQuotaBypass || isTesting) {
      try { localStorage.removeItem("finance_cooling_vault_unlock_time"); } catch {}
    }
    set({ 
      openAlerts: nextAlerts, 
      deployToast: newTrade,
      dailyQuotaBypass: isTesting ? true : false,
      coolingVaultUnlockTime: null
    });
    try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts)); } catch {}

    try {
      const uSym = newTrade.underlyingSymbol || (newTrade.symbol.includes("SENSEX") ? "SENSEX" : newTrade.symbol.includes("BANK") ? "BANKNIFTY" : newTrade.symbol.includes("FIN") ? "FINNIFTY" : "NIFTY");
      fetch("/api/paper-lab/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: newTrade.idempotencyKey,
          symbol: newTrade.symbol,
          underlyingSymbol: uSym,
          strikePrice: newTrade.strikePrice || Number((newTrade.symbol.match(/\d+/) || [24000])[0]),
          entryPrice: newTrade.entryPrice,
          targetPrice: newTrade.targetPrice,
          stopLoss: newTrade.stopLoss,
          quantity: newTrade.quantity || 1,
          lotSize: newTrade.lotSize,
          optionType: newTrade.optionType,
          tradeType: newTrade.tradeType || "INTRADAY",
          direction: newTrade.direction || "LONG",
          feedMode: get().feedMode || "LIVE",
          strategyTags: [newTrade.strategyTag || "Practice Scalp"],
          personalNotes: newTrade.personalNotes || newTrade.catalyst || "Practice Scalp Order"
        })
      })
      .then((r) => r.json())
      .then((res) => {
        if (res?.item?.id) {
          const authId = res.item.id;
          [newTrade.id, String(newTrade.id), authId, String(authId)].forEach((k) => tradeIdMap.set(k, authId));
          set((state) => {
            const updated = state.openAlerts.map((t) => t.id === newTrade.id ? { ...t, id: authId, serverId: authId, tokenKey: res.item.tokenKey } : t);
            try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated)); } catch {}
            return { openAlerts: updated };
          });
          flushPendingPartialClose(newTrade.id, authId);
          broadcastTradeAction("TRADE_CREATED", { id: authId });
          fetch("/api/paper-lab").then((r) => r.ok ? r.json() : null).then((data) => {
            if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
            if (data?.openTrades) get().syncBackendOpenTrades(data.openTrades);
          }).catch(() => {});
        }
      }).catch(() => {});
    } catch {}

    return newTrade;
  },

  autoDeployCopilotTrade: (params = {}) => {
    const underlying = params.underlying || "NIFTY";
    const strikePrice = params.strikePrice || (underlying === "BANKNIFTY" ? 57200 : 24500);
    const optionType = params.optionType || "CALL";
    const entryPrice = params.entryPrice || (underlying === "BANKNIFTY" ? 180.0 : 85.0);
    const quantity = params.lots || 1;
    const lotSize = resolveIndexLotSize(underlying);
    const totalQty = quantity * lotSize;

    // Strict Capital Protection Rule: ₹200–₹300 max risk (default ₹250), ₹400–₹600 target (default ₹500)
    const targets = calculateRiskRewardTargets({ entryPrice, totalQty, underlying });
    const stopLoss = params.stopLoss != null && Number(params.stopLoss) > 0 ? Number(params.stopLoss) : targets.stopLoss;
    const targetPrice = params.targetPrice != null && Number(params.targetPrice) > 0 ? Number(params.targetPrice) : targets.targetPrice;
    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;

    return get().deployPracticeTrade({
      symbol,
      underlyingSymbol: underlying,
      strikePrice,
      optionType,
      entryPrice,
      stopLoss,
      targetPrice,
      quantity,
      lotSize,
      feedMode: "LIVE",
      strategyMode: "NAKED",
      entryReason: `Copilot Prime 1-Click Scalp · R:R 1:${((targetPrice - entryPrice) / Math.max(1, entryPrice - stopLoss)).toFixed(2)}`,
      personalNotes: `Institutional ${underlying} Friction-Protected Scalp (1:2.00 R:R)`
    });
  },
});
