import { useState, useEffect, useRef } from 'react';
import { getCachedTimeline, setCachedTimeline } from './timelineCache';
import { calculateDirectionalExcursions } from './flightSplineUtils';
import { synthesizeMarketFlightPath } from './flightSynthesis';
import { buildTimelineQueryParams } from './timelineDataHelpers';
import { resolveFlightScopeWindow } from './flightTimeUtils';

export function useTimelineData(trade, scenarioVariant, flightScope) {
  const containerRef = useRef(null);
  const requestIdRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(860);
  const [candleData, setCandleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const symbol = trade?.symbol || trade?.tradingsymbol || 'INDEX';
  const entryPrice = Math.max(0.1, Number(trade?.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade?.exitPrice || entryPrice));
  const targetPrice = trade?.targetPrice ? Math.max(0.1, Number(trade.targetPrice)) : null;
  const stopLoss = trade?.stopLoss ? Math.max(0.1, Number(trade.stopLoss)) : null;
  const entryTime = trade?.entryDatetime || trade?.timestamp;
  const exitTime = trade?.exitDatetime || trade?.closedAt;
  const closeReason = String(trade?.closeReason || '');
  const direction = trade?.direction || 'LONG';

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) setContainerWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const currentReqId = ++requestIdRef.current;
    const scopeWindow = resolveFlightScopeWindow(entryTime, exitTime, flightScope, trade);
    const fromTime = scopeWindow.fromTime;
    const toTime = scopeWindow.toTime;
    const cacheKey = `timeline_${trade?.tokenKey || symbol}_${fromTime}_${toTime}_${entryPrice}_${exitPrice}_${scenarioVariant}_${flightScope}`;
    const cached = getCachedTimeline(cacheKey);
    if (cached) {
      if (currentReqId === requestIdRef.current) {
        setCandleData(cached);
        setIsLoading(false);
      }
      return;
    }

    if (flightScope === 'scalp' && trade?.priceHistory && Array.isArray(trade.priceHistory) && trade.priceHistory.length >= 2) {
      const excursions = calculateDirectionalExcursions(direction, entryPrice, trade.priceHistory);
      const liveData = {
        success: true, source: 'live-recorded', candles: trade.priceHistory,
        entryPrice, exitPrice, targetPrice, stopLoss, mfe: excursions.mfe, mae: excursions.mae
      };
      setCachedTimeline(cacheKey, liveData);
      if (currentReqId === requestIdRef.current) {
        setCandleData(liveData);
        setIsLoading(false);
      }
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    const params = buildTimelineQueryParams({
      symbol, entryPrice, exitPrice, closeReason, flightScope, trade, targetPrice, stopLoss, entryTime, exitTime, fromTime, toTime
    });

    fetch(`/api/market/trade-candles?${params.toString()}`, { signal: abortController.signal })
      .then((res) => res.json())
      .then((data) => {
        if (abortController.signal.aborted || currentReqId !== requestIdRef.current) return;
        if (data.success && data.candles?.length >= 2 && data.source === 'upstox') {
          const excursions = calculateDirectionalExcursions(direction, entryPrice, data.candles);
          const enriched = { ...data, mfe: excursions.mfe, mae: excursions.mae };
          setCachedTimeline(cacheKey, enriched);
          if (currentReqId === requestIdRef.current) {
            setCandleData(enriched);
            setIsLoading(false);
          }
        } else {
          const fallbackCandles = synthesizeMarketFlightPath(trade, scenarioVariant, flightScope);
          const excursions = calculateDirectionalExcursions(direction, entryPrice, fallbackCandles);
          const fallbackData = {
            success: true, source: 'synthesized', candles: fallbackCandles,
            entryPrice, exitPrice, targetPrice, stopLoss, mfe: excursions.mfe, mae: excursions.mae
          };
          setCachedTimeline(cacheKey, fallbackData);
          if (currentReqId === requestIdRef.current) {
            setCandleData(fallbackData);
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || abortController.signal.aborted || currentReqId !== requestIdRef.current) return;
        const fallbackCandles = synthesizeMarketFlightPath(trade, scenarioVariant, flightScope);
        const excursions = calculateDirectionalExcursions(direction, entryPrice, fallbackCandles);
        const fallbackData = {
          success: true, source: 'synthesized', candles: fallbackCandles,
          entryPrice, exitPrice, targetPrice, stopLoss, mfe: excursions.mfe, mae: excursions.mae
        };
        if (currentReqId === requestIdRef.current) {
          setCandleData(fallbackData);
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [symbol, entryPrice, exitPrice, targetPrice, stopLoss, entryTime, exitTime, closeReason, trade, scenarioVariant, flightScope, direction]);

  return { containerRef, containerWidth, candleData, isLoading };
}
