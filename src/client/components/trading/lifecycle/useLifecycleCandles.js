import { useState, useEffect } from "react";
import { clientCandleCache, CLIENT_CACHE_TTL } from "./lifecycleSplineEngine";

export function useLifecycleCandles(trade) {
  const [candleData, setCandleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    symbol,
    entryPrice,
    exitPrice,
    targetPrice,
    stopLoss,
    entryTime,
    exitTime,
    closeReason,
    tokenKey
  } = trade;

  useEffect(() => {
    const cacheKey = `${tokenKey || symbol}_${entryTime}_${exitTime}_${entryPrice}_${exitPrice}`;
    const cached = clientCandleCache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt < CLIENT_CACHE_TTL)) {
      if (cached.data.source !== "interpolated" || (Date.now() - cached.cachedAt < 25000)) {
        setCandleData(cached.data);
        setIsLoading(false);
        return;
      }
    }

    let isCancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({
      symbol,
      entryPrice: String(entryPrice),
      exitPrice: String(exitPrice),
      closeReason: closeReason || "",
    });
    if (targetPrice) params.set("targetPrice", String(targetPrice));
    if (stopLoss) params.set("stopLoss", String(stopLoss));
    if (entryTime) params.set("from", entryTime);
    if (exitTime) params.set("to", exitTime);
    if (tokenKey) params.set("tokenKey", tokenKey);

    fetch(`/api/market/trade-candles?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && data.candles?.length) {
          clientCandleCache.set(cacheKey, { cachedAt: Date.now(), data });
          setCandleData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("Trade candles fetch notice:", err.message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, entryPrice, exitPrice, targetPrice, stopLoss, entryTime, exitTime, closeReason, tokenKey]);

  return { candleData, isLoading };
}
