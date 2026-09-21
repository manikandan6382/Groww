import { resolveNextExpiryDate } from "../../utils/expiryUtils";
import { resolveIndexLotSize } from "./tradeHelpers";
import { tradeIdMap, flushPendingPartialClose, broadcastTradeAction } from "./tradePersistence";
import { calculateRiskRewardTargets } from "../../components/trading/order-pad/hooks/orderPadCalculations";
import { useLivePriceStore } from "../useLivePriceStore";

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
  tiltLockoutUntil: 0,
  tiltReason: null,
  activateTiltShield: (durationMs = 30000, reason = "Stop Loss executed. Cooling down for 30s to prevent revenge trading.") => {
    set({
      tiltLockoutUntil: Date.now() + durationMs,
      tiltReason: reason
    });
  },
  clearTiltShield: () => set({ tiltLockoutUntil: 0, tiltReason: null }),

  deployPracticeTrade: (trade) => {
    const isTesting = Boolean(get().testingMode);

    // Anti-Tilt Cooling Shield Check (30s lockout after SL hit)
    if (get().tiltLockoutUntil > Date.now() && !isTesting) {
      const remainingSec = Math.ceil((get().tiltLockoutUntil - Date.now()) / 1000);
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛡️ Anti-Tilt Shield Active: Please pause and breathe for ${remainingSec}s before taking a new trade.`
        }
      });
      return null;
    }

    // Bidirectional Strike Conflict Blocker:
    // Prevent opening an opposing PUT if a CALL is active on the same index (or vice versa)
    const existingOpposing = get().openAlerts.find((t) => {
      const isSameUnderlying = (t.symbol.includes("NIFTY") && trade.symbol.includes("NIFTY") && !t.symbol.includes("BANKNIFTY") && !trade.symbol.includes("BANKNIFTY")) ||
                               (t.symbol.includes("BANKNIFTY") && trade.symbol.includes("BANKNIFTY"));
      if (!isSameUnderlying) return false;
      const isCurrentCall = t.symbol.includes("CE") || t.optionType === "CALL";
      const isIncomingCall = trade.symbol.includes("CE") || trade.optionType === "CALL";
      return isCurrentCall !== isIncomingCall;
    });

    if (existingOpposing && !isTesting) {
      const openType = existingOpposing.symbol.includes("CE") ? "CALL" : "PUT";
      const incomingType = trade.symbol.includes("CE") ? "CALL" : "PUT";
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛑 Bidirectional Conflict Blocked: You have an active ${openType} (${existingOpposing.symbol}). Cannot buy opposing ${incomingType} simultaneously!`
        }
      });
      return null;
    }

    const todayCount = typeof get().getTodayTradesCount === "function" ? get().getTodayTradesCount() : 0;
    if (todayCount >= (get().dailyQuotaLimit || 3) && !get().dailyQuotaBypass && !isTesting) {
      console.warn("[Chaos Guard] Trade deployment blocked: Daily quota reached.");
      return null;
    }

    // Daily Realized Loss Circuit Breaker: ₹300 hard limit
    const todayLoss = typeof get().getTodayRealizedLoss === "function" ? get().getTodayRealizedLoss() : 0;
    if (todayLoss <= -300 && !isTesting && !get().dailyQuotaBypass) {
      console.warn("[Risk Engine] Daily realized loss cap reached (-₹300). Locking cooling vault.");
      get().requestCoolingVaultUnlock?.();
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛡️ Capital Discipline Vault Locked: Daily loss limit (-₹300) hit. 15-min cooling engaged to prevent revenge trading.`
        }
      });
      return null;
    }

    const idempotencyKey = trade.idempotencyKey || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const existing = get().openAlerts.find((t) => t.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const uSym = trade.underlyingSymbol || (trade.symbol?.includes("SENSEX") ? "SENSEX" : trade.symbol?.includes("BANK") ? "BANKNIFTY" : trade.symbol?.includes("FIN") ? "FINNIFTY" : "NIFTY");
    const lotSize = Number(trade.lotSize) || resolveIndexLotSize(uSym);
    const quantity = Number(trade.quantity || 1);
    const totalUnits = quantity * Math.max(1, lotSize);

    const shouldSlippage = get().simulateSlippage;
    const baseEntry = Number(trade.entryPrice || 0);
    const isShort = String(trade.direction || "LONG").toUpperCase() === "SHORT";
    
    // Pessimistic market order execution slippage: 1.05 - 1.45 pts adverse spread fill
    const slippagePts = shouldSlippage ? Number((1.25 + (Math.random() * 0.40 - 0.20)).toFixed(2)) : 0;
    const entryFillPrice = shouldSlippage 
      ? (isShort ? Number(Math.max(0.05, baseEntry - slippagePts).toFixed(2)) : Number((baseEntry + slippagePts).toFixed(2)))
      : baseEntry;
    const entrySlippage = Number(Math.abs(entryFillPrice - baseEntry).toFixed(2));
    const entryDatetime = trade.entryDatetime || new Date().toISOString();

    let stopLoss = Number(trade.stopLoss || 0);
    let targetPrice = Number(trade.targetPrice || trade.target || 0);

    // If adverse slippage occurred on entry, dynamically anchor Stop Loss and Target
    // relative to the actual fill price, strictly preserving Manikandan's planned risk budget (₹200–₹300)
    if (shouldSlippage && stopLoss > 0 && baseEntry > 0) {
      const plannedSlPoints = Number(Math.abs(baseEntry - stopLoss).toFixed(2));
      const plannedTargetPoints = targetPrice > 0 ? Number(Math.abs(targetPrice - baseEntry).toFixed(2)) : Number((plannedSlPoints * 2.0).toFixed(2));
      stopLoss = isShort
        ? Number((entryFillPrice + plannedSlPoints).toFixed(2))
        : Number(Math.max(0.05, entryFillPrice - plannedSlPoints).toFixed(2));
      targetPrice = isShort
        ? Number(Math.max(0.05, entryFillPrice - plannedTargetPoints).toFixed(2))
        : Number((entryFillPrice + plannedTargetPoints).toFixed(2));
    }

    // Strict Capital Risk Invariant Check (Max risk ₹200 to ₹300, target ₹250)
    if (stopLoss > 0 && !isTesting) {
      const rupeeRisk = isShort
        ? (stopLoss - entryFillPrice) * totalUnits
        : (entryFillPrice - stopLoss) * totalUnits;
      if (rupeeRisk > 300.50) {
        console.warn(`[Risk Engine] Trade blocked: Rupee risk ₹${rupeeRisk.toFixed(2)} exceeds ₹300 ceiling.`);
        set({
          deployToast: {
            error: true,
            symbol: trade.symbol,
            message: `🛑 Risk ₹${rupeeRisk.toFixed(0)} exceeds ₹300 max cap! Manikandan rule: ₹200–₹300 risk (target ₹250).`
          }
        });
        return null;
      }
    }

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
      entrySlippage,
      stopLoss,
      targetPrice,
      quantity,
      lotSize,
      underlyingSymbol: uSym,
      ...trade,
      entryPrice: entryFillPrice,
      stopLoss,
      targetPrice
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
      fetch("/api/paper-lab/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: newTrade.idempotencyKey,
          symbol: newTrade.symbol,
          underlyingSymbol: uSym,
          strikePrice: newTrade.strikePrice || Number((newTrade.symbol.match(/\d+/) || [24000])[0]),
          entryPrice: newTrade.entryPrice,
          plannedEntryPrice: baseEntry,
          entrySlippage,
          targetPrice: newTrade.targetPrice,
          stopLoss: newTrade.stopLoss,
          quantity: newTrade.quantity || 1,
          lotSize: newTrade.lotSize,
          optionType: newTrade.optionType,
          tradeType: newTrade.tradeType || "INTRADAY",
          direction: newTrade.direction || "LONG",
          feedMode: get().feedMode || "LIVE",
          testingMode: isTesting,
          strategyTags: [newTrade.strategyTag || "Practice Scalp"],
          personalNotes: newTrade.personalNotes || newTrade.catalyst || "Practice Scalp Order"
        })
      })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          console.warn("[UnifiedExecution] Order rejected by risk guard:", data.error);
          if (r.status === 423) {
            get().requestCoolingVaultUnlock?.();
          }
          set((state) => {
            const rollback = state.openAlerts.filter((t) => t.id !== newTrade.id);
            try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(rollback)); } catch {}
            return {
              openAlerts: rollback,
              deployToast: {
                error: true,
                symbol: newTrade.symbol,
                message: data.error || "Order rejected by risk guard."
              }
            };
          });
          return null;
        }
        return data;
      })
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
    const indices = useLivePriceStore.getState().indices;
    const indexKey = underlying === "BANKNIFTY"
      ? "NSE_INDEX|Nifty Bank"
      : underlying === "SENSEX"
      ? "BSE_INDEX|SENSEX"
      : underlying === "FINNIFTY"
      ? "NSE_INDEX|Nifty Fin Service"
      : "NSE_INDEX|Nifty 50";
    const indexData = indices?.[indexKey];
    const liveSpot = Number(indexData?.ltp || (underlying === "BANKNIFTY" ? 57200 : underlying === "SENSEX" ? 79800 : 23250));
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const strikePrice = params.strikePrice || (Math.round(liveSpot / step) * step);
    const isBullish = (indexData?.change ?? 0) >= 0;
    const optionType = params.optionType || (isBullish ? "CALL" : "PUT");
    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;

    const liveTick = useLivePriceStore.getState().ticks?.[symbol]?.ltp;
    let entryPrice = Number(params.entryPrice || liveTick || 0);
    if (!entryPrice || entryPrice <= 0) {
      entryPrice = underlying === "BANKNIFTY" ? 350.0 : underlying === "SENSEX" ? 420.0 : 150.0;
    }

    const quantity = params.lots || 1;
    const lotSize = resolveIndexLotSize(underlying);
    const totalQty = quantity * lotSize;

    // Strict Capital Protection Rule: ₹200–₹300 max risk (default ₹250), ₹400–₹600 target (default ₹500)
    const targets = calculateRiskRewardTargets({ entryPrice, totalQty, underlying });
    let stopLoss = targets.stopLoss;
    if (params.stopLoss != null && Number(params.stopLoss) > 0) {
      const customSL = Number(params.stopLoss);
      const customRisk = Math.abs(entryPrice - customSL) * totalQty;
      if (customRisk <= 300.50 && customSL < entryPrice) {
        stopLoss = customSL;
      }
    }
    let targetPrice = targets.targetPrice;
    if (params.targetPrice != null && Number(params.targetPrice) > entryPrice) {
      targetPrice = Number(params.targetPrice);
    }

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
      entryReason: `Copilot Prime 1-Click Scalp · R:R 1:${((targetPrice - entryPrice) / Math.max(0.1, entryPrice - stopLoss)).toFixed(2)}`,
      personalNotes: `Institutional ${underlying} Friction-Protected Scalp (1:2.00 R:R)`
    });
  },
});
