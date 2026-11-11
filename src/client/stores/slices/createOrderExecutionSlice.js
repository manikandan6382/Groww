import { resolveNextExpiryDate } from "../../utils/expiryUtils";
import { resolveIndexLotSize } from "./tradeHelpers";
import { tradeIdMap, flushPendingPartialClose, broadcastTradeAction, lockDeploySync, debounceOpenAlertsStorage, debounceNetworkSync } from "./tradePersistence";
import { calculateRiskRewardTargets } from "../../components/trading/order-pad/hooks/orderPadCalculations";
import { useLivePriceStore } from "../useLivePriceStore";
import { recordLifecycleEvent, assertTradeInvariants } from "../../utils/tradeLifecycleAuditor";
import { calculateCanonicalExecutionPlan } from "../../utils/canonicalExecutionPlan.js";

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
    lockDeploySync(1500);
    const isTesting = Boolean(get().testingMode || trade?.testingMode);
    const isUnrestricted = Boolean(isTesting && (get().testingRestrictionMode === "UNRESTRICTED" || trade?.isUnrestricted));

    // Exchange Holiday Gate: Strictly block deployment on NSE market holidays (bypassed in Unrestricted Sandbox)
    if (!isUnrestricted && get().brokerStatus?.marketHoliday) {
      const holidayName = get().brokerStatus?.holidayName || "Exchange Holiday";
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛑 Trade Rejected: Market is closed today for ${holidayName}. Paper orders cannot be deployed on exchange holidays.`
        }
      });
      return null;
    }

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
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛡️ Daily 3-Trade Quota Locked: Maximum 3 disciplined trades permitted per day. Capital preserved.`
        }
      });
      return null;
    }

    // Daily Realized Loss Circuit Breaker: ₹600 hard limit (2-Bullet model: 2 x ₹250 risk + statutory friction)
    const todayLoss = typeof get().getTodayRealizedLoss === "function" ? get().getTodayRealizedLoss() : 0;
    if (todayLoss <= -600 && !isTesting && !get().dailyQuotaBypass) {
      console.warn("[Risk Engine] Daily realized loss cap reached (-₹600). Locking cooling vault.");
      get().requestCoolingVaultUnlock?.();
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: `🛡️ Capital Discipline Vault Locked: Daily loss limit (-₹600) hit. 15-min cooling engaged to prevent revenge trading.`
        }
      });
      return null;
    }

    // Concurrency Lock: Strictly Max 1 Concurrent Active Position (Zero testing-mode bypass in Like Real)
    if (!isUnrestricted && get().openAlerts.length >= 1) {
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: "🔒 Active Position Lock: You already have an open active trade (1/1 Max). Close it before opening another."
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

    const isLiveFeed = get().feedMode === "LIVE";
    const shouldSlippage = isLiveFeed ? false : Boolean(get().simulateSlippage);
    const baseEntry = Number(trade.entryPrice || 0);
    const isShort = String(trade.direction || "LONG").toUpperCase() === "SHORT";
    
    // Stage 7: Deterministic slippage (no Math.random()) for reproducible lifecycle validation
    const slippagePts = shouldSlippage ? 1.25 : 0;
    const entryFillPrice = shouldSlippage 
      ? (isShort ? Number(Math.max(0.05, baseEntry - slippagePts).toFixed(2)) : Number((baseEntry + slippagePts).toFixed(2)))
      : baseEntry;
    const entrySlippage = Number(Math.abs(entryFillPrice - baseEntry).toFixed(2));
    const entryDatetime = trade.entryDatetime || new Date().toISOString();

    let stopLoss = Number(trade.stopLoss || 0);
    let targetPrice = Number(trade.targetPrice || trade.target || 0);

    const canonicalPlan = calculateCanonicalExecutionPlan({
      symbol: trade.symbol,
      underlying: uSym,
      entryPrice: baseEntry,
      stopLoss,
      targetPrice,
      quantity,
      lotSize,
      totalUnits,
      direction: trade.direction || "LONG",
      stopPolicy: trade.stopPolicy || "ATR_ENTRY_RELATIVE",
      targetPolicy: trade.targetPolicy || "RR_DERIVED",
      adverseSlippageAllowance: 0.50,
      testingMode: isTesting,
      isUnrestricted
    });

    // Strict Capital Risk & Reward Gate: Enforced in LIVE & LIKE_REAL; Bypassed in Unrestricted Sandbox
    if (isUnrestricted) {
      if (!canonicalPlan.isStopLossValid || !canonicalPlan.isTargetValid) {
        const errorMsg = !canonicalPlan.isStopLossValid
          ? "🛑 Trade Rejected: Invalid Stop Loss (must be strictly below Entry for CALL/Long)."
          : "🛑 Trade Rejected: Invalid Target Price (must be strictly above Entry for CALL/Long).";
        set({
          deployToast: {
            error: true,
            symbol: trade.symbol,
            message: errorMsg
          }
        });
        return null;
      }
    } else if (!canonicalPlan.isCompliant) {
      const errorMsg = !canonicalPlan.isRiskCeilingSatisfied
        ? `🛑 Trade Rejected: Modelled net risk ₹${canonicalPlan.modelledNetRisk.toFixed(0)} exceeds ₹300 ceiling (Cap ₹300.00).`
        : !canonicalPlan.isRewardToRiskSatisfied
        ? `🛑 Trade Rejected: Net R:R 1:${canonicalPlan.netRewardToRiskRatio.toFixed(2)} is below 2:1 minimum requirement.`
        : `🛑 Trade Rejected: ${canonicalPlan.rejectionReasonCodes.join(", ")}`;

      console.warn(`[Risk Engine] Trade blocked:`, errorMsg);
      set({
        deployToast: {
          error: true,
          symbol: trade.symbol,
          message: errorMsg
        }
      });
      return null;
    }

    // Dynamic slippage pegging: preserve canonical stop distance strictly relative to actual entry fill price
    if (shouldSlippage && baseEntry > 0) {
      stopLoss = isShort
        ? Number((entryFillPrice + canonicalPlan.stopDistancePts).toFixed(2))
        : Number(Math.max(0.05, entryFillPrice - canonicalPlan.stopDistancePts).toFixed(2));
      targetPrice = isShort
        ? Number(Math.max(0.05, entryFillPrice - canonicalPlan.targetDistancePts).toFixed(2))
        : Number((entryFillPrice + canonicalPlan.targetDistancePts).toFixed(2));
    } else {
      stopLoss = Number(canonicalPlan.stopLoss.toFixed(2));
      targetPrice = Number(canonicalPlan.targetPrice.toFixed(2));
    }

    let expiryDatetime = trade.expiryDatetime;
    if (!expiryDatetime) {
      try { expiryDatetime = resolveNextExpiryDate(trade.symbol, entryDatetime).toISOString(); } catch { expiryDatetime = null; }
    }
    const expiryDate = trade.expiryDate || (expiryDatetime ? expiryDatetime.split("T")[0] : null);

    // STAGES 2 & 5: Immutable parameters and PENDING_SERVER_CONFIRMATION status
    const newTrade = {
      id: Date.now(),
      idempotencyKey,
      entryDatetime,
      expiryDatetime,
      expiryDate,
      plannedEntryPrice: baseEntry,
      entryPrice: entryFillPrice,
      actualFillPrice: entryFillPrice,
      lastMarkPrice: entryFillPrice,
      entrySlippage,
      initialStopLoss: stopLoss,
      currentStopLoss: stopLoss,
      stopLoss,
      initialTargetPrice: targetPrice,
      targetPrice,
      breakevenTrigger: null,
      quantity,
      lotSize,
      underlyingSymbol: uSym,
      status: "PENDING_SERVER_CONFIRMATION",
      revision: 1,
      ...trade,
      entryPrice: entryFillPrice,
      actualFillPrice: entryFillPrice,
      initialStopLoss: stopLoss,
      currentStopLoss: stopLoss,
      stopLoss,
      targetPrice,
      status: "PENDING_SERVER_CONFIRMATION",
      revision: 1
    };

    assertTradeInvariants(newTrade, "PENDING_SERVER_CONFIRMATION");
    recordLifecycleEvent({
      tradeId: newTrade.id,
      revision: 1,
      event: "TRADE_CREATED",
      state_before: "IDLE",
      state_after: "PENDING_SERVER_CONFIRMATION",
      currentPrice: entryFillPrice,
      entryPrice: entryFillPrice,
      initialSL: stopLoss,
      currentSL: stopLoss,
      target: targetPrice,
      source: "CLIENT_STORE"
    });

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
    debounceOpenAlertsStorage(nextAlerts);

    try {
      fetch("/api/paper-lab/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: newTrade.idempotencyKey,
          symbol: newTrade.symbol,
          underlyingSymbol: uSym,
          tokenKey: newTrade.tokenKey,
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
          tradeMode: (isTesting && (get().testingRestrictionMode === "UNRESTRICTED" || newTrade.isUnrestricted)) ? "SANDBOX" : "PAPER",
          isUnrestricted: Boolean(isTesting && (get().testingRestrictionMode === "UNRESTRICTED" || newTrade.isUnrestricted)),
          testingRestrictionMode: get().testingRestrictionMode || "UNRESTRICTED",
          strategyTags: [newTrade.strategyTag || "Practice Scalp"],
          personalNotes: newTrade.personalNotes || (newTrade.dotnetPositionId ? `[LIVE_FEED] [DOTNET_HFT:LIVE:${newTrade.dotnetPositionId}] ${newTrade.strategy || "Practice Scalp"}` : (newTrade.catalyst || "Practice Scalp Order"))
        })
      })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          const errMsg = data.detail || data.title || data.error || data.message || "Order rejected by risk guard.";
          console.warn("[UnifiedExecution] Order rejected by risk guard:", errMsg);
          if (r.status === 423) {
            get().requestCoolingVaultUnlock?.();
          }
          set((state) => {
            const rollback = state.openAlerts.filter((t) => t.id !== newTrade.id);
            debounceOpenAlertsStorage(rollback);
            return {
              openAlerts: rollback,
              deployToast: {
                error: true,
                symbol: newTrade.symbol,
                message: errMsg
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
          const authTrade = res.item;
          [newTrade.id, String(newTrade.id), authId, String(authId)].forEach((k) => tradeIdMap.set(k, authId));
          set((state) => {
            const updated = state.openAlerts.map((t) =>
              t.id === newTrade.id
                ? {
                    ...t,
                    id: authId,
                    serverId: authId,
                    tokenKey: authTrade.tokenKey || res.item.tokenKey || t.tokenKey || null,
                    instrumentKey: authTrade.instrumentKey || res.item.instrumentKey || t.instrumentKey || authTrade.tokenKey || res.item.tokenKey || t.tokenKey || null,
                    status: "ACTIVE",
                    revision: authTrade.revision || 2,
                    initialStopLoss: authTrade.initialStopLoss || t.initialStopLoss,
                    currentStopLoss: authTrade.stopLoss || t.currentStopLoss,
                    stopLoss: authTrade.stopLoss || t.stopLoss,
                    targetPrice: authTrade.targetPrice || t.targetPrice,
                    entryPrice: authTrade.entryPrice || t.entryPrice,
                    actualFillPrice: authTrade.entryPrice || t.actualFillPrice
                  }
                : t
            );
            debounceOpenAlertsStorage(updated);
            return { openAlerts: updated };
          });

          recordLifecycleEvent({
            tradeId: authId,
            revision: 2,
            event: "SERVER_CONFIRMED",
            state_before: "PENDING_SERVER_CONFIRMATION",
            state_after: "ACTIVE",
            currentPrice: authTrade.entryPrice || newTrade.entryPrice,
            entryPrice: authTrade.entryPrice || newTrade.entryPrice,
            initialSL: authTrade.initialStopLoss || newTrade.initialStopLoss,
            currentSL: authTrade.stopLoss || newTrade.currentStopLoss,
            target: authTrade.targetPrice || newTrade.targetPrice,
            source: "DOTNET_RMS"
          });

          flushPendingPartialClose(newTrade.id, authId);
          broadcastTradeAction("TRADE_CREATED", { id: authId });
          debounceNetworkSync("POST_DEPLOY_PAPER_LAB_SYNC", () => {
            fetch("/api/paper-lab").then((r) => r.ok ? r.json() : null).then((data) => {
              if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
              if (data?.openTrades) get().syncBackendOpenTrades(data.openTrades);
            }).catch(() => {});
          }, 1500);
        }
      }).catch(() => {});
    } catch {}

    return newTrade;
  },

  autoDeployCopilotTrade: async (params = {}) => {
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
    const liveSpot = Number(indexData?.ltp || (underlying === "BANKNIFTY" ? 57200 : underlying === "SENSEX" ? 79800 : 22520));
    const step = underlying === "BANKNIFTY" || underlying === "SENSEX" ? 100 : 50;
    const strikePrice = params.strikePrice || (Math.round(liveSpot / step) * step);
    const isBullish = (indexData?.change ?? 0) >= 0;
    const optionType = params.optionType || (isBullish ? "CALL" : "PUT");
    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;

    // 1. Fetch authentic real-time market quote for this exact strike directly from Upstox
    let verifiedLtp = null;
    let resolvedTokenKey = null;
    try {
      const qRes = await fetch(`/api/market/option-quote?symbol=${encodeURIComponent(symbol)}`);
      if (qRes.ok) {
        const qData = await qRes.json();
        const qObj = qData?.quotes?.[symbol] || (qData?.quotes ? Object.values(qData.quotes)[0] : null);
        if (qObj && Number(qObj.ltp) > 0) {
          verifiedLtp = Number(qObj.ltp);
          resolvedTokenKey = qObj.tokenKey;
          useLivePriceStore.getState().updateTick?.(symbol, verifiedLtp, Number(qObj.change || 0));
        }
      }
    } catch (err) {
      console.warn("[autoDeployCopilotTrade] Live option quote fetch failed:", err);
    }

    const liveTick = verifiedLtp || useLivePriceStore.getState().ticks?.[symbol]?.ltp;
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
      tokenKey: resolvedTokenKey,
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
