import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { OPTION_CHAIN_UNDERLYINGS, getPcrSentiment } from "./optionChainUtils";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function useOptionChainData() {
  const [activeSymbol, setActiveSymbol] = useState("NIFTY");
  const [activeExpiry, setActiveExpiry] = useState("");
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [scalpModal, setScalpModal] = useState(null);

  const { deployPracticeTrade, setOrderPadPreFill, setActiveView } = useTradingStore();

  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const consecutiveErrorsRef = useRef(0);

  const activeConfig = useMemo(() => {
    return OPTION_CHAIN_UNDERLYINGS.find((u) => u.symbol === activeSymbol) || OPTION_CHAIN_UNDERLYINGS[0];
  }, [activeSymbol]);

  const fetchOptionChain = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return false;
    isFetchingRef.current = true;

    if (isManual) {
      setRefreshing(true);
      consecutiveErrorsRef.current = 0;
      soundEngine?.playClickTone?.();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let isSuccess = false;

    try {
      const url = `/api/market/option-chain?symbol=${encodeURIComponent(activeSymbol)}${activeExpiry ? `&expiry=${encodeURIComponent(activeExpiry)}` : ""}`;
      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: { Accept: "application/json" }
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && Array.isArray(payload?.strikes)) {
          setChainData(payload);
          if (!activeExpiry && payload.expiry) {
            setActiveExpiry(payload.expiry);
          }
          setLastUpdated(new Date());
          setError(null);
          consecutiveErrorsRef.current = 0;
          isSuccess = true;
          if (isManual) {
            soundEngine?.playSuccessTone?.();
          }
        }
      } else {
        consecutiveErrorsRef.current += 1;
        if (isManual) {
          setError(`HTTP ${res.status}: Option chain telemetry offline`);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        consecutiveErrorsRef.current += 1;
        console.warn("[useOptionChainData] Fetch error:", err.message);
        if (isManual) {
          setError(err.message || "Failed to load option chain");
        }
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }

    return isSuccess;
  }, [activeSymbol, activeExpiry]);

  // Polling loop with adaptive backoff
  useEffect(() => {
    let isMounted = true;

    const scheduleNext = (delayMs) => {
      if (!isMounted) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(async () => {
        if (!isMounted || document.hidden) return;
        const success = await fetchOptionChain(false);
        if (isMounted) {
          let nextDelay = 5000;
          if (!success) {
            const errors = consecutiveErrorsRef.current;
            nextDelay = Math.min(30000, 5000 * Math.pow(2, Math.min(errors, 3)));
          }
          scheduleNext(nextDelay);
        }
      }, delayMs);
    };

    fetchOptionChain(false).then((success) => {
      if (isMounted) scheduleNext(success ? 5000 : 9000);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        consecutiveErrorsRef.current = 0;
        fetchOptionChain(false).then((success) => {
          if (isMounted) scheduleNext(success ? 5000 : 9000);
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchOptionChain]);

  // Toast autoclear
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const pcrSentiment = useMemo(() => {
    return getPcrSentiment(chainData?.pcr);
  }, [chainData?.pcr]);

  // Handle symbol change
  const handleSelectSymbol = useCallback((symbol) => {
    soundEngine?.playClickTone?.();
    setActiveSymbol(symbol);
    setActiveExpiry("");
    setChainData(null);
    setLoading(true);
  }, []);

  // Handle strike scalp modal open
  const openStrikeModal = useCallback((strikeItem, optionType = "CE") => {
    const sideData = optionType === "CE" ? strikeItem.call : strikeItem.put;
    const ltp = Number(sideData?.ltp || 50);
    const strike = strikeItem.strike;
    const lotSize = activeConfig.lotSize;

    soundEngine?.playClickTone?.();
    setScalpModal({
      isOpen: true,
      symbol: activeSymbol,
      name: activeConfig.name,
      strike,
      optionType,
      ltp,
      lotSize,
      lots: 1,
      delta: sideData?.delta || (optionType === "CE" ? 0.5 : -0.5),
      iv: sideData?.iv || 13.5
    });
  }, [activeSymbol, activeConfig]);

  const closeStrikeModal = useCallback(() => {
    setScalpModal(null);
  }, []);

  // Execute practice trade with strict ₹250 risk cap
  const executeStrikeScalp = useCallback(({ symbol, strike, optionType, lots = 1, ltp }) => {
    const lotSize = activeConfig.lotSize;
    const totalUnits = (lots || 1) * lotSize;
    const strikeSymbol = `${symbol} ${strike} ${optionType}`;
    const price = Number(ltp || 50);

    // STRICT ₹250 RISK INVARIANT
    const rawSl = 250 / (totalUnits || 25);
    const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
    const targetPoints = Number((slPoints * 2.0).toFixed(1));
    const stopLoss = Number(Math.max(0.05, price - slPoints).toFixed(2));
    const targetPrice = Number((price + targetPoints).toFixed(2));

    if (deployPracticeTrade) {
      deployPracticeTrade({
        symbol: strikeSymbol,
        underlyingSymbol: symbol,
        strikePrice: strike,
        entryPrice: price,
        plannedEntryPrice: price,
        targetPrice,
        stopLoss,
        quantity: lots || 1,
        lotSize,
        optionType: optionType === "CE" ? "CALL" : "PUT",
        tradeType: "INTRADAY",
        direction: optionType === "CE" ? "LONG" : "SHORT",
        strategyTag: "Option Chain Desk Scalp",
        personalNotes: `F&O Option Chain · ${strikeSymbol} @ ₹${price} (Strict ₹250 Max Risk Invariant)`
      });
      soundEngine?.playOrderFillTone?.();
      setToastMessage(`🎯 Option Chain Scalp Deployed: ${strikeSymbol} (${totalUnits} Qty) @ ₹${price}`);
    }

    setScalpModal(null);
  }, [activeConfig, deployPracticeTrade]);

  const transferStrikeToPad = useCallback(({ symbol, strike, optionType, lots = 1, ltp }) => {
    const lotSize = activeConfig.lotSize;
    const totalUnits = (lots || 1) * lotSize;
    const strikeSymbol = `${symbol} ${strike} ${optionType}`;
    const price = Number(ltp || 50);

    const rawSl = 250 / (totalUnits || 25);
    const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
    const targetPoints = Number((slPoints * 2.0).toFixed(1));

    if (setOrderPadPreFill) {
      setOrderPadPreFill({
        symbol: strikeSymbol,
        underlying: symbol,
        entryPrice: price,
        targetPrice: Number((price + targetPoints).toFixed(2)),
        stopLoss: Number(Math.max(0.05, price - slPoints).toFixed(2)),
        quantity: lots || 1,
        lotSize
      });
    }

    if (setActiveView) {
      setActiveView("paper");
    }

    soundEngine?.playSuccessTone?.();
    setScalpModal(null);
  }, [activeConfig, setOrderPadPreFill, setActiveView]);

  return {
    activeSymbol,
    activeConfig,
    activeExpiry,
    chainData,
    loading,
    refreshing,
    lastUpdated,
    error,
    toastMessage,
    scalpModal,
    pcrSentiment,
    underlyings: OPTION_CHAIN_UNDERLYINGS,
    fetchOptionChain,
    handleSelectSymbol,
    setActiveExpiry,
    openStrikeModal,
    closeStrikeModal,
    executeStrikeScalp,
    transferStrikeToPad,
    setToastMessage
  };
}
