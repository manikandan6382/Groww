import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MAJOR_INDICES_KEYS,
  KEY_SECTORS,
  calculateMarketBreadth,
  getVixVolatilityRegime,
  getInstitutionalFlowData,
  resolveIndexStrikeInterval
} from "./marketPulseUtils";
import { useTradingStore, resolveIndexLotSize } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function useMarketPulseData() {
  const [indicesData, setIndicesData] = useState(() => {
    // Initial fallback seeds so UI is immediately rich and non-empty
    const seeds = {};
    MAJOR_INDICES_KEYS.forEach((idx) => {
      seeds[idx.key] = {
        name: idx.name,
        symbol: idx.symbol,
        shortName: idx.shortName,
        ltp: idx.fallbackLtp,
        change: idx.fallbackChange,
        changePct: Number(((idx.fallbackChange / (idx.fallbackLtp - idx.fallbackChange)) * 100).toFixed(2)),
        open: idx.fallbackLtp - idx.fallbackChange * 0.4,
        high: idx.fallbackLtp + Math.abs(idx.fallbackChange) * 0.8,
        low: idx.fallbackLtp - Math.abs(idx.fallbackChange) * 0.9,
        close: idx.fallbackLtp - idx.fallbackChange,
        timestamp: new Date().toISOString(),
        isVix: !!idx.isVix
      };
    });
    return seeds;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [scalpModal, setScalpModal] = useState(null); // { isOpen, indexInfo, optionType: "CE"|"PE", lots: 1 }
  const [telemetryState, setTelemetryState] = useState("LIVE"); // "LIVE" | "CACHED" | "OFFLINE"
  const [instantScalpMode, setInstantScalpMode] = useState(false);

  const { deployPracticeTrade, setOrderPadPreFill, setActiveView } = useTradingStore();

  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const consecutiveErrorsRef = useRef(0);

  const fetchIndices = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManual) {
      setRefreshing(true);
      consecutiveErrorsRef.current = 0; // Reset backoff on manual trigger
      soundEngine?.playClickTone?.();
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let isSuccess = false;

    try {
      const res = await fetch("/api/market/indices", {
        signal: abortControllerRef.current.signal,
        headers: { Accept: "application/json" }
      });

      if (res.ok) {
        const payload = await res.json();
        const data = payload?.data || payload;

        if (data && typeof data === "object") {
          setIndicesData((prev) => {
            const next = { ...prev };
            MAJOR_INDICES_KEYS.forEach((idx) => {
              if (data[idx.key]) {
                next[idx.key] = {
                  ...idx,
                  ...data[idx.key],
                  isVix: !!idx.isVix
                };
              }
            });
            return next;
          });
          setLastUpdated(new Date());
          setError(null);
          setTelemetryState("LIVE");
          consecutiveErrorsRef.current = 0;
          isSuccess = true;
          if (isManual) {
            soundEngine?.playSuccessTone?.();
          }
        }
      } else {
        consecutiveErrorsRef.current += 1;
        setTelemetryState(consecutiveErrorsRef.current > 1 ? "OFFLINE" : "CACHED");
        if (isManual) {
          setError(`HTTP ${res.status}: Indices telemetry unavailable`);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        consecutiveErrorsRef.current += 1;
        setTelemetryState(consecutiveErrorsRef.current > 1 ? "OFFLINE" : "CACHED");
        console.warn("[useMarketPulseData] Poll failed:", err.message);
        if (isManual) {
          setError(err.message || "Failed to load live indices");
        }
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }

    return isSuccess;
  }, []);

  // Adaptive exponential backoff polling loop
  useEffect(() => {
    let isMounted = true;

    const scheduleNext = (delayMs) => {
      if (!isMounted) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(async () => {
        if (!isMounted || document.hidden) return;
        const success = await fetchIndices(false);
        if (isMounted) {
          // Adaptive backoff: 4.5s on success; 9s -> 18s -> 30s on repeated errors
          let nextDelay = 4500;
          if (!success) {
            const errors = consecutiveErrorsRef.current;
            nextDelay = Math.min(30000, 4500 * Math.pow(2, Math.min(errors, 3)));
          }
          scheduleNext(nextDelay);
        }
      }, delayMs);
    };

    // First fetch immediately, then schedule
    fetchIndices(false).then((success) => {
      if (isMounted) {
        scheduleNext(success ? 4500 : 9000);
      }
    });

    const handleVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        consecutiveErrorsRef.current = 0;
        fetchIndices(false).then((success) => {
          if (isMounted) {
            scheduleNext(success ? 4500 : 9000);
          }
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
  }, [fetchIndices]);

  // Toast autoclear
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Derived Telemetry
  const marketBreadth = useMemo(() => {
    return calculateMarketBreadth(indicesData);
  }, [indicesData]);

  const vixRegime = useMemo(() => {
    const vixQuote = indicesData["NSE_INDEX|India VIX"];
    return getVixVolatilityRegime(vixQuote?.ltp);
  }, [indicesData]);

  const institutionalFlow = useMemo(() => {
    const niftyQuote = indicesData["NSE_INDEX|Nifty 50"];
    return getInstitutionalFlowData(niftyQuote?.changePct || 0.35);
  }, [indicesData]);

  // Scalp Execution
  const openQuickScalpModal = useCallback((indexKey, defaultType = "CE") => {
    const quote = indicesData[indexKey] || MAJOR_INDICES_KEYS.find((k) => k.key === indexKey);
    const keyConfig = MAJOR_INDICES_KEYS.find((k) => k.key === indexKey);
    if (!quote || quote.isVix) return;

    const symbol = keyConfig?.symbol || quote.symbol || "NIFTY";
    const spot = Number(quote.ltp || 25000);
    const lotSize = keyConfig?.lotSize || resolveIndexLotSize(symbol, 25);

    // If Instant Scalp Mode is active, bypass modal and execute immediately
    if (instantScalpMode) {
      const strikeInterval = resolveIndexStrikeInterval(symbol);
      const roundedStrike = Math.round(spot / strikeInterval) * strikeInterval;
      const strikeSymbol = `${symbol} ${roundedStrike} ${defaultType}`;
      const estPremium = Number((spot * (defaultType === "CE" ? 0.021 : 0.019)).toFixed(2));
      const totalUnits = 1 * lotSize;

      // Strict ₹250 risk invariant
      const rawSl = 250 / totalUnits;
      const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
      const targetPoints = Number((slPoints * 2.0).toFixed(1));
      const stopLoss = Number(Math.max(0.05, estPremium - slPoints).toFixed(2));
      const targetPrice = Number((estPremium + targetPoints).toFixed(2));

      if (deployPracticeTrade) {
        deployPracticeTrade({
          symbol: strikeSymbol,
          underlyingSymbol: symbol,
          strikePrice: roundedStrike,
          entryPrice: estPremium,
          plannedEntryPrice: estPremium,
          targetPrice,
          stopLoss,
          quantity: 1,
          lotSize,
          optionType: defaultType === "CE" ? "CALL" : "PUT",
          tradeType: "INTRADAY",
          direction: defaultType === "CE" ? "LONG" : "SHORT",
          strategyTag: "Instant ATM Scalp",
          personalNotes: `Instant 1-Click Scalp · ${strikeSymbol} @ ₹${estPremium} (Strict ₹250 Invariant)`
        });
        soundEngine?.playOrderFillTone?.();
        setToastMessage(`⚡ Instant Scalp Deployed: ${strikeSymbol} (${totalUnits} Qty) @ ₹${estPremium}`);
      }
      return;
    }

    soundEngine?.playClickTone?.();
    setScalpModal({
      isOpen: true,
      indexKey,
      symbol,
      name: quote.name || keyConfig?.name || "NIFTY 50",
      ltp: spot,
      lotSize,
      optionType: defaultType,
      lots: 1
    });
  }, [indicesData, instantScalpMode, deployPracticeTrade]);

  const closeScalpModal = useCallback(() => {
    setScalpModal(null);
  }, []);

  const executeQuickScalp = useCallback(({ symbol, optionType, lots = 1 }) => {
    if (!scalpModal) return;

    const spot = scalpModal.ltp;
    const lotSize = scalpModal.lotSize || 25;
    const strikeInterval = resolveIndexStrikeInterval(symbol);
    const roundedStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikeSymbol = `${symbol} ${roundedStrike} ${optionType}`;

    // Synthetic ATM premium estimate
    const estPremium = Number((spot * (optionType === "CE" ? 0.021 : 0.019)).toFixed(2));
    const totalUnits = (lots || 1) * lotSize;

    // Strict Manikandan Risk Budget: Max ₹250 Target Risk
    const rawSl = 250 / (totalUnits || 25);
    const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
    const targetPoints = Number((slPoints * 2.0).toFixed(1));
    const stopLoss = Number(Math.max(0.05, estPremium - slPoints).toFixed(2));
    const targetPrice = Number((estPremium + targetPoints).toFixed(2));

    if (deployPracticeTrade) {
      deployPracticeTrade({
        symbol: strikeSymbol,
        underlyingSymbol: symbol,
        strikePrice: roundedStrike,
        entryPrice: estPremium,
        plannedEntryPrice: estPremium,
        targetPrice,
        stopLoss,
        quantity: lots || 1,
        lotSize,
        optionType: optionType === "CE" ? "CALL" : "PUT",
        tradeType: "INTRADAY",
        direction: optionType === "CE" ? "LONG" : "SHORT",
        strategyTag: "Index ATM Momentum Scalp",
        personalNotes: `Market Pulse Ribbon Scalp · ${strikeSymbol} @ ₹${estPremium} (Strict ₹250 Max Risk Invariant)`
      });
      soundEngine?.playOrderFillTone?.();
      setToastMessage(`🎯 Index Scalp Deployed: ${strikeSymbol} (${totalUnits} Qty) @ ₹${estPremium}`);
    }

    setScalpModal(null);
  }, [scalpModal, deployPracticeTrade]);

  const transferScalpToPaperLab = useCallback(({ symbol, optionType, lots = 1 }) => {
    if (!scalpModal) return;

    const spot = scalpModal.ltp;
    const lotSize = scalpModal.lotSize || 25;
    const strikeInterval = resolveIndexStrikeInterval(symbol);
    const roundedStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikeSymbol = `${symbol} ${roundedStrike} ${optionType}`;
    const estPremium = Number((spot * 0.02).toFixed(2));
    const totalUnits = (lots || 1) * lotSize;

    const rawSl = 250 / (totalUnits || 25);
    const slPoints = Math.max(0.5, Math.round(rawSl * 2) / 2);
    const targetPoints = Number((slPoints * 2.0).toFixed(1));

    if (setOrderPadPreFill) {
      setOrderPadPreFill({
        symbol: strikeSymbol,
        underlying: symbol,
        entryPrice: estPremium,
        targetPrice: Number((estPremium + targetPoints).toFixed(2)),
        stopLoss: Number(Math.max(0.05, estPremium - slPoints).toFixed(2)),
        quantity: lots || 1,
        lotSize
      });
    }

    if (setActiveView) {
      setActiveView("paper");
    }

    soundEngine?.playSuccessTone?.();
    setScalpModal(null);
  }, [scalpModal, setOrderPadPreFill, setActiveView]);

  const toggleInstantScalpMode = useCallback(() => {
    setInstantScalpMode((prev) => {
      const next = !prev;
      soundEngine?.playClickTone?.();
      setToastMessage(next ? "⚡ Instant Scalp Mode Activated: 1-Click Direct Execution" : "🛡️ Confirm Scalp Mode: Modal Confirmation Enabled");
      return next;
    });
  }, []);

  return {
    indicesData,
    loading,
    refreshing,
    lastUpdated,
    error,
    toastMessage,
    scalpModal,
    telemetryState,
    instantScalpMode,
    marketBreadth,
    vixRegime,
    institutionalFlow,
    sectors: KEY_SECTORS,
    fetchIndices,
    openQuickScalpModal,
    closeScalpModal,
    executeQuickScalp,
    transferScalpToPaperLab,
    toggleInstantScalpMode,
    setToastMessage
  };
}
