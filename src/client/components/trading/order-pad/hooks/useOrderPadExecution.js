import { useCallback, useRef } from "react";
import { soundEngine } from "../../../../utils/soundEngine";
import { deployOrderWithDotnet } from "../../../../services/dotnetTradingService";
import { useTradingStore } from "../../../../stores/useTradingStore";
import { openBrokerAuthPopup } from "../../../../utils/brokerPopupAuth";

const DEBOUNCE_COOLDOWN_MS = 1500;
const MONTH_CODES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDynamicOptionSymbol(underlyingKey, strike, optionType) {
  const now = new Date();
  const yearStr = String(now.getFullYear()).slice(-2);
  const monthStr = MONTH_CODES[now.getMonth()];
  const typeCode = optionType === "CALL" || optionType === "CE" ? "CE" : "PE";
  return `${underlyingKey}${yearStr}${monthStr}${strike}${typeCode}`;
}

export function useOrderPadExecution({ isLocked, state, deployPracticeTrade }) {
  const lastSubmitTimeRef = useRef(0);
  const isSubmittingRef = useRef(false);

  const handleExecuteOrder = useCallback(async () => {
    const now = Date.now();
    if (isLocked || state.isExecuting || isSubmittingRef.current) return;
    if (now - lastSubmitTimeRef.current < DEBOUNCE_COOLDOWN_MS) return;

    lastSubmitTimeRef.current = now;
    isSubmittingRef.current = true;
    state.setIsExecuting(true);

    // Strict Capital Risk Invariant Check (Max risk ₹200 to ₹300, target ₹250)
    const entry = Number(state.entryPrice) || 0;
    const sl = Number(state.stopLoss) || 0;
    const qty = Number(state.quantity) || 1;
    const lotSize = state.activeAsset?.key === "BANKNIFTY" ? 30 : state.activeAsset?.key === "SENSEX" ? 20 : 65;
    const units = Math.max(1, qty * lotSize);
    // Invariant Geometry Guard: Ensure valid SL & Target orientation for Long Option Buying (Standard Mode only; Full Freedom in Testing Mode)
    const isTesting = Boolean(state.testingMode || useTradingStore.getState().testingMode);
    const isUnrestricted = Boolean(isTesting && (state.isUnrestricted || useTradingStore.getState().testingRestrictionMode === "UNRESTRICTED"));
    let effectiveSL = Number(state.stopLoss) || 0;
    let effectiveTarget = Number(state.target || state.targetPrice) || 0;
    const isShort = String(state.direction || "LONG").toUpperCase() === "SHORT";

    // Geometry Guard: Prevent self-terminating orders where Stop Loss triggers immediately upon fill!
    if (!isShort && entry > 0 && effectiveSL >= entry) {
      isSubmittingRef.current = false;
      state.setIsExecuting(false);
      soundEngine?.playOrderReject?.();
      alert(`🛑 Invalid Buy/Long Setup:\n\nStop Loss (₹${effectiveSL}) is higher than or equal to Entry Price (₹${entry}).\n\nOn a Buy trade, Stop Loss must be BELOW entry price. Otherwise the trade will trigger exit immediately on fill!\n\nIf you meant a Target of ₹${effectiveSL}, please put it in the Target Price box.`);
      return;
    }
    if (isShort && entry > 0 && effectiveSL > 0 && effectiveSL <= entry) {
      isSubmittingRef.current = false;
      state.setIsExecuting(false);
      soundEngine?.playOrderReject?.();
      alert(`🛑 Invalid Short Setup:\n\nStop Loss (₹${effectiveSL}) is lower than or equal to Entry Price (₹${entry}).\n\nOn a Short trade, Stop Loss must be ABOVE entry price.`);
      return;
    }
    if (!isTesting && entry > 0) {
      if (effectiveSL <= 0 || effectiveSL >= entry) {
        effectiveSL = Number(Math.max(0.05, entry - (250 / units)).toFixed(2));
        state.setStopLoss?.(effectiveSL);
      }
      if (effectiveTarget <= 0 || effectiveTarget <= entry) {
        effectiveTarget = Number((entry + (500 / units)).toFixed(2));
        state.setTarget?.(effectiveTarget);
        state.setTargetPrice?.(effectiveTarget);
      }
    }

    if (effectiveSL > 0 && entry > effectiveSL && !isTesting) {
      const rupeeRisk = (entry - effectiveSL) * units;
      if (rupeeRisk > 300.50) {
        isSubmittingRef.current = false;
        state.setIsExecuting(false);
        soundEngine?.playOrderReject?.();
        alert(`🛑 Order Blocked by Capital Discipline Engine:\n\nTrade risk is ₹${rupeeRisk.toFixed(0)}, which violates Manikandan's strict ₹200–₹300 limit (target ₹250).\n\nPlease tighten Stop Loss to within ${(250 / units).toFixed(1)} pts or reduce lot size.`);
        return;
      }
    }

    // Pre-Flight Broker Session Readiness Guard (Bypassed in testingMode)
    if (!isTesting) {
      const brokerStatus = useTradingStore.getState().brokerStatus;
      const isUpstoxExpired = Boolean(brokerStatus?.upstoxExpired || !brokerStatus?.upstoxConnected);
      if (isUpstoxExpired) {
        isSubmittingRef.current = false;
        state.setIsExecuting(false);
        soundEngine?.playOrderReject?.();
        const shouldReconnect = window.confirm(
          "🛑 Pre-Flight Broker Session Expired:\n\nUpstox Pro market feed session is expired or disconnected.\n\nClick OK to open the 1-Click Reconnect popup now, or Cancel to return to the order pad."
        );
        if (shouldReconnect) {
          openBrokerAuthPopup("upstox");
        }
        return;
      }
    }

    try {
      if (state.useDotnetEngine) {
        // High-Performance .NET 8 Institutional Execution with Dynamic Expiry
        const symbol = formatDynamicOptionSymbol(state.activeAsset.key, state.strike, state.optionType);
        const instrumentKey = state.tokenKey || (state.activeAsset.key === "SENSEX" ? "BSE_INDEX|SENSEX" : "NSE_INDEX|Nifty 50");

        const res = await deployOrderWithDotnet({
          symbol,
          instrumentKey,
          transactionType: 1, // Buy
          product: 1,         // Intraday
          orderType: 5,       // MarketableLimit
          quantity: state.quantity,
          price: state.entryPrice,
          stopLoss: effectiveSL,
          target: effectiveTarget,
          testingMode: isTesting,
          isUnrestricted
        });

        if (res?.success) {
          soundEngine?.playOrderSuccess?.();
          deployPracticeTrade?.({
            symbol,
            entryPrice: Number(state.entryPrice),
            stopLoss: effectiveSL,
            target: effectiveTarget,
            quantity: Number(state.quantity),
            testingMode: isTesting,
            isUnrestricted,
            strategy: "DOTNET_HFT_SHADOW",
            tokenKey: state.tokenKey,
            dotnetPositionId: res.positionId || res.orderId,
            brokerOrderId: res.brokerOrderId,
            slBrokerOrderId: res.slBrokerOrderId
          });
        } else {
          soundEngine?.playOrderReject?.();
          const reason = res?.error || res?.errorMessage || "Risk check failed";
          alert(`Order Rejected by Pre-Trade Risk Engine:\n\n${reason}`);
        }
      } else {
        soundEngine?.playOrderSuccess?.();
        deployPracticeTrade?.({
          symbol: `${state.activeAsset.key} ${state.strike} ${state.optionType}`,
          entryPrice: Number(state.entryPrice),
          stopLoss: effectiveSL,
          target: effectiveTarget,
          quantity: Number(state.quantity),
          testingMode: isTesting,
          isUnrestricted,
          strategy: "MANUAL_ORDER_PAD"
        });
      }
    } finally {
      state.setIsExecuting(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  }, [isLocked, state, deployPracticeTrade]);

  return { handleExecuteOrder };
}
