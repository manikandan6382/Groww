import { useCallback, useRef } from "react";
import { soundEngine } from "../../../../utils/soundEngine";
import { deployOrderWithDotnet } from "../../../../services/dotnetTradingService";

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

    try {
      if (state.useDotnetEngine) {
        // High-Performance .NET 8 Institutional Execution with Dynamic Expiry
        const symbol = formatDynamicOptionSymbol(state.activeAsset.key, state.strike, state.optionType);
        const instrumentKey = state.activeAsset.key === "SENSEX" ? "BSE_INDEX|SENSEX" : "NSE_INDEX|Nifty 50";

        const res = await deployOrderWithDotnet({
          symbol,
          instrumentKey,
          transactionType: 1, // Buy
          product: 1,         // Intraday
          orderType: 5,       // MarketableLimit
          quantity: state.quantity,
          price: state.entryPrice,
          stopLoss: state.stopLoss,
          target: state.target
        });

        if (res?.success) {
          soundEngine?.playOrderSuccess?.();
          deployPracticeTrade?.({
            symbol,
            entryPrice: Number(state.entryPrice),
            stopLoss: Number(state.stopLoss),
            target: Number(state.target),
            quantity: Number(state.quantity),
            strategy: "DOTNET_HFT_SHADOW"
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
          stopLoss: Number(state.stopLoss),
          target: Number(state.target),
          quantity: Number(state.quantity),
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
