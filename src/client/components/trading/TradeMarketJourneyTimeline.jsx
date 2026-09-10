import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Compass,
  Zap,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Award,
  AlertTriangle,
  Info,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  ShieldCheck,
  BookOpen,
  Maximize2,
  Minimize2,
  Brain,
  FileText,
  BarChart2,
  CandlestickChart
} from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../utils/soundEngine';
import { normalizeTrade, formatTimeShort } from '../../utils/tradeNormalizer';
import { calculateTradeDuration, formatLocalDateTime } from '../../utils/dateUtils';
import { RollingTicker } from '../common/RollingTicker';

// =========================================================================
// MODULE-LEVEL BOUNDED LRU CLIENT CACHE & TIMERS (STRICT TDZ HOISTING)
// =========================================================================
const timelineCandleCache = new Map();
const MAX_CACHE_ENTRIES = 40;
const CLIENT_CACHE_TTL = 10 * 60 * 1000;
let lastScrubAudioTime = 0;

function getCachedTimeline(key) {
  const cached = timelineCandleCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CLIENT_CACHE_TTL) {
    timelineCandleCache.delete(key);
    return null;
  }
  timelineCandleCache.delete(key);
  timelineCandleCache.set(key, cached);
  return cached.data;
}

function setCachedTimeline(key, data) {
  if (timelineCandleCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = timelineCandleCache.keys().next().value;
    if (oldestKey) timelineCandleCache.delete(oldestKey);
  }
  timelineCandleCache.set(key, { cachedAt: Date.now(), data });
}

function triggerScrubHaptic(speed = 1) {
  const now = Date.now();
  const throttleMs = speed === 4 ? 15 : speed === 2 ? 22 : 35;
  if (now - lastScrubAudioTime > throttleMs) {
    lastScrubAudioTime = now;
    if (typeof soundEngine?.playScrub === 'function') {
      soundEngine.playScrub();
    }
  }
}

// Discrete ₹0.05 tick quantization helper (Indian exchange tick rule)
const snapTick = (val) => Math.max(0.05, Math.round(val * 20) / 20);

// Pure Directional MFE & MAE Calculator with Parity for LONG and SHORT Trades
function calculateDirectionalExcursions(direction, entryPrice, candles) {
  if (!candles || !candles.length) {
    return { mfe: 0, mae: 0, maxPrice: entryPrice, minPrice: entryPrice };
  }
  const isShort = direction === 'SHORT';
  const highs = candles.map((c) => Number(c.high ?? c.close ?? c.price ?? entryPrice));
  const lows = candles.map((c) => Number(c.low ?? c.close ?? c.price ?? entryPrice));
  const closes = candles.map((c) => Number(c.close ?? c.price ?? entryPrice));

  const rawMax = Math.max(...highs, ...closes, entryPrice);
  const rawMin = Math.min(...lows, ...closes, entryPrice);

  const mfe = isShort
    ? Math.max(0, Number((entryPrice - rawMin).toFixed(2)))
    : Math.max(0, Number((rawMax - entryPrice).toFixed(2)));

  const mae = isShort
    ? Math.max(0, Number((rawMax - entryPrice).toFixed(2)))
    : Math.max(0, Number((entryPrice - rawMin).toFixed(2)));

  return { mfe, mae, maxPrice: rawMax, minPrice: rawMin };
}

// Silky cubic-bezier spline interpolation
function calculateSplinePath(points) {
  if (!points || points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Multi-Scenario Flight Path Generator:
// Supports "rollercoaster" (100 -> 110 -> 90), "direct" (100 -> 90), and "target" (100 -> 120)
// Uses smooth polynomial easing curves and discrete ₹0.05 tick quantization (ZERO fake Math.sin noise)
function synthesizeMarketFlightPath(trade, scenarioVariant = 'rollercoaster', flightScope = 'scalp') {
  const entryPrice = Math.max(0.1, Number(trade.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade.exitPrice || entryPrice));
  const targetPrice = trade.targetPrice ? Math.max(0.1, Number(trade.targetPrice)) : null;
  const stopLoss = trade.stopLoss ? Math.max(0.1, Number(trade.stopLoss)) : null;
  const closeReason = String(trade.closeReason || '');
  const terminalIntrinsic = Number(trade.terminalIntrinsic ?? (closeReason.includes('STOP') ? 0.0 : exitPrice * 1.15));

  const fromTime = new Date(trade.entryDatetime || Date.now() - 20 * 60000).getTime();
  const exitTime = new Date(trade.exitDatetime || Date.now()).getTime();

  let toTime = exitTime;
  if (flightScope === 'expiry') {
    let expDate = trade.expiryDatetime ? new Date(trade.expiryDatetime).getTime() : null;
    if (!expDate || expDate <= fromTime) {
      const d = new Date(fromTime);
      d.setHours(15, 30, 0, 0);
      expDate = d.getTime();
      if (expDate <= fromTime) expDate = fromTime + 4 * 3600 * 1000;
    }
    toTime = expDate;
  }

  const isTarget = closeReason.includes('TARGET') || scenarioVariant === 'target';
  const isStop = closeReason.includes('STOP') || exitPrice <= (stopLoss || entryPrice * 0.95);

  let peakPrice;
  let dipPrice;

  if (scenarioVariant === 'direct') {
    peakPrice = entryPrice + 0.35;
    dipPrice = stopLoss ? Math.min(stopLoss, exitPrice) : exitPrice;
  } else if (isTarget || scenarioVariant === 'target') {
    peakPrice = targetPrice ? Math.max(targetPrice, exitPrice) : exitPrice;
    dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.15 : entryPrice * 0.985;
  } else if (isStop || scenarioVariant === 'rollercoaster') {
    const targetDelta = targetPrice ? Math.abs(targetPrice - entryPrice) : Math.abs(entryPrice - (stopLoss || 90));
    peakPrice = entryPrice + Math.max(3.0, targetDelta * 0.50);
    dipPrice = stopLoss ? Math.min(stopLoss, exitPrice) : exitPrice;
  } else {
    peakPrice = entryPrice + (targetPrice ? Math.abs(targetPrice - entryPrice) * 0.6 : entryPrice * 0.08);
    dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.2 : entryPrice * 0.98;
  }

  const candles = [];
  let prevClose = entryPrice;

  if (flightScope === 'expiry') {
    const scalpSteps = 16;
    const postSteps = 18;
    const totalSteps = scalpSteps + postSteps;
    const scalpStepMs = Math.max(1000, (exitTime - fromTime) / scalpSteps);
    const postStepMs = Math.max(1000, (toTime - exitTime) / postSteps);

    for (let i = 0; i <= totalSteps; i++) {
      let t;
      let p;
      let isExitPoint = false;
      let isPostExit = false;

      if (i <= scalpSteps) {
        const progress = i / scalpSteps;
        t = fromTime + i * scalpStepMs;
        if (i === scalpSteps) isExitPoint = true;

        if (progress === 0) {
          p = entryPrice;
        } else if (progress === 1) {
          p = exitPrice;
        } else if (scenarioVariant === 'direct') {
          p = entryPrice - (entryPrice - exitPrice) * Math.pow(progress, 0.9);
        } else if (scenarioVariant === 'target' || isTarget) {
          if (progress < 0.20) {
            const sub = progress / 0.20;
            p = entryPrice - (entryPrice - dipPrice) * sub * (2 - sub);
          } else {
            const sub = (progress - 0.20) / 0.80;
            p = dipPrice + (exitPrice - dipPrice) * (1 - Math.pow(1 - sub, 2));
          }
        } else if (scenarioVariant === 'rollercoaster' || isStop) {
          if (progress < 0.35) {
            const sub = progress / 0.35;
            p = entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
          } else if (progress < 0.48) {
            const sub = (progress - 0.35) / 0.13;
            const dipAmount = (peakPrice - entryPrice) * 0.05;
            p = peakPrice - dipAmount * (4 * sub * (1 - sub));
          } else {
            const sub = (progress - 0.48) / 0.52;
            p = peakPrice - (peakPrice - exitPrice) * Math.pow(sub, 1.2);
          }
        } else {
          if (progress < 0.40) {
            const sub = progress / 0.40;
            p = entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
          } else {
            const sub = (progress - 0.40) / 0.60;
            p = peakPrice - (peakPrice - exitPrice) * (1 - Math.pow(1 - sub, 2));
          }
        }
      } else {
        isPostExit = true;
        const postIdx = i - scalpSteps;
        const progress = postIdx / postSteps;
        t = exitTime + postIdx * postStepMs;

        const decayCurve = Math.pow(progress, 0.85);
        p = exitPrice + (terminalIntrinsic - exitPrice) * decayCurve;
        if (terminalIntrinsic <= 0.05 && progress > 0.6) {
          p = Math.max(0.05, p * (1 - (progress - 0.6) * 1.5));
        }
      }

      const closeVal = snapTick(p);
      const openVal = snapTick(i === 0 ? entryPrice : prevClose);
      const wickOffsetHigh = (i % 3 === 0) ? 0.15 : 0.05;
      const wickOffsetLow = (i % 2 === 0) ? 0.15 : 0.05;
      const highVal = snapTick(Math.max(openVal, closeVal) + wickOffsetHigh);
      const lowVal = snapTick(Math.min(openVal, closeVal) - wickOffsetLow);
      const isBullish = closeVal >= openVal;
      const vol = Math.round(1200 + (i % 6) * 320);

      candles.push({
        time: new Date(t).toISOString(),
        timestamp: t,
        open: openVal,
        high: highVal,
        low: lowVal,
        close: closeVal,
        volume: vol,
        isBullish,
        isExitPoint,
        isPostExit
      });

      prevClose = closeVal;
    }

    return candles;
  }

  const totalMs = Math.max(60000, toTime - fromTime);
  const totalSteps = 28;
  const stepMs = totalMs / totalSteps;

  for (let i = 0; i <= totalSteps; i++) {
    const progress = i / totalSteps;
    const t = fromTime + i * stepMs;
    let p;

    if (progress === 0) {
      p = entryPrice;
    } else if (progress === 1) {
      p = exitPrice;
    } else if (scenarioVariant === 'direct') {
      p = entryPrice - (entryPrice - exitPrice) * Math.pow(progress, 0.9);
    } else if (scenarioVariant === 'target' || isTarget) {
      if (progress < 0.20) {
        const sub = progress / 0.20;
        p = entryPrice - (entryPrice - dipPrice) * sub * (2 - sub);
      } else {
        const sub = (progress - 0.20) / 0.80;
        p = dipPrice + (exitPrice - dipPrice) * (1 - Math.pow(1 - sub, 2));
      }
    } else if (scenarioVariant === 'rollercoaster' || isStop) {
      if (progress < 0.35) {
        const sub = progress / 0.35;
        p = entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
      } else if (progress < 0.48) {
        const sub = (progress - 0.35) / 0.13;
        const dipAmount = (peakPrice - entryPrice) * 0.05;
        p = peakPrice - dipAmount * (4 * sub * (1 - sub));
      } else {
        const sub = (progress - 0.48) / 0.52;
        p = peakPrice - (peakPrice - exitPrice) * Math.pow(sub, 1.2);
      }
    } else {
      if (progress < 0.40) {
        const sub = progress / 0.40;
        p = entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
      } else {
        const sub = (progress - 0.40) / 0.60;
        p = peakPrice - (peakPrice - exitPrice) * (1 - Math.pow(1 - sub, 2));
      }
    }

    const closeVal = snapTick(p);
    const openVal = snapTick(i === 0 ? entryPrice : prevClose);
    const wickOffsetHigh = (i % 3 === 0) ? 0.15 : 0.05;
    const wickOffsetLow = (i % 2 === 0) ? 0.15 : 0.05;
    const highVal = snapTick(Math.max(openVal, closeVal) + wickOffsetHigh);
    const lowVal = snapTick(Math.min(openVal, closeVal) - wickOffsetLow);
    const isBullish = closeVal >= openVal;
    const vol = Math.round(1400 + (i % 5) * 450 + (progress > 0.7 ? 900 : 0));

    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: openVal,
      high: highVal,
      low: lowVal,
      close: closeVal,
      volume: vol,
      isBullish,
      isExitPoint: i === totalSteps,
      isPostExit: false
    });

    prevClose = closeVal;
  }

  return candles;
}

/**
 * Adaptive Multi-Minute Candle Clustered Aggregator
 * Clusters high-density 1-minute streams (e.g. 375 candles in Start-to-Expiry mode)
 * into clean 3m/5m display bars to prevent sub-pixel candle crowding and visual zebra aliasing.
 */
function aggregateCandlesForDisplay(candles, targetMax = 90) {
  if (!candles || candles.length <= targetMax) return candles;
  const bucketSize = Math.ceil(candles.length / targetMax);
  const aggregated = [];

  for (let i = 0; i < candles.length; i += bucketSize) {
    const chunk = candles.slice(i, i + bucketSize);
    if (!chunk.length) continue;

    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const highs = chunk.map(c => Number(c.high ?? c.close ?? c.price));
    const lows = chunk.map(c => Number(c.low ?? c.close ?? c.price));
    const volumes = chunk.map(c => Number(c.volume || 0));

    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const open = Number(first.open ?? first.close ?? first.price);
    const close = Number(last.close ?? last.price);
    const totalVol = volumes.reduce((acc, v) => acc + v, 0);

    const isExitPoint = chunk.some(c => c.isExitPoint);
    const isEntryPoint = chunk.some(c => c.isEntryPoint || c.index === 0);
    const isPostExit = chunk.every(c => c.isPostExit);

    aggregated.push({
      ...last,
      open,
      high,
      low,
      close,
      volume: totalVol,
      timestamp: first.timestamp || first.time,
      time: first.time || first.timestamp,
      isExitPoint,
      isEntryPoint,
      isPostExit
    });
  }

  return aggregated;
}

export function TradeMarketJourneyTimeline({ trade: rawTrade, onClose, isModalView = false, carouselNav = null, initialFlightScope = "scalp", onSwitchFlightScope = null }) {
  const trade = useMemo(() => normalizeTrade(rawTrade), [rawTrade]);

  // Scoped SVG IDs
  const reactId = useId();
  const profitAreaGradId = `profitAreaGrad_${reactId.replace(/:/g, '_')}`;
  const lossAreaGradId = `lossAreaGrad_${reactId.replace(/:/g, '_')}`;
  const pathStrokeGradId = `pathStrokeGrad_${reactId.replace(/:/g, '_')}`;
  const glowFilterId = `glowFilter_${reactId.replace(/:/g, '_')}`;

  const containerRef = useRef(null);
  const studioContainerRef = useRef(null);
  const rAFRef = useRef(null);
  const pendingClientX = useRef(null);
  const replayTimerRef = useRef(null);

  const [containerWidth, setContainerWidth] = useState(860);
  const [candleData, setCandleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [scenarioVariant, setScenarioVariant] = useState('rollercoaster'); // 'rollercoaster' | 'direct' | 'target'
  
  // Dual View Mode: 'spline' vs 'candles'
  const [chartMode, setChartMode] = useState('spline'); // 'spline' | 'candles'
  const [flightScope, setFlightScope] = useState(initialFlightScope || 'scalp'); // 'scalp' | 'expiry'
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'journal'
  const [pinnedIndex, setPinnedIndex] = useState(null);

  useEffect(() => {
    if (initialFlightScope) {
      setFlightScope(initialFlightScope);
    }
  }, [initialFlightScope]);

  // Teardown & Reset handles whenever trade.id changes (prevents stale timers & mismatch)
  useEffect(() => {
    setIsPlaying(false);
    setReplayIndex(null);
    setScrubIndex(null);
    setPinnedIndex(null);
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    pendingClientX.current = null;
  }, [trade?.id]);
  
  // Fullscreen Focus Studio Modal State
  const [isStudioModalOpen, setStudioModalOpen] = useState(false);
  const [studioActiveTab, setStudioActiveTab] = useState('chart'); // 'chart' | 'journal'

  // Replay Simulator State
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(null);
  const [replaySpeed, setReplaySpeed] = useState(1); // 1x, 2x, 4x

  const {
    symbol,
    entryPrice,
    exitPrice,
    targetPrice,
    stopLoss,
    entryTime,
    exitTime,
    closeReason,
    direction,
    totalQty,
    charges,
    catalyst,
    executionDetails,
    mindsetEmotion,
    lessonsLearned,
    confidenceScore,
    followedPlan
  } = trade;

  const effectiveStopLoss = trade.stopLoss ? Number(trade.stopLoss) : Number((entryPrice * 0.90).toFixed(2));
  const isShort = direction === 'SHORT';
  const grossPts = isShort ? (entryPrice - exitPrice) : (exitPrice - entryPrice);
  const grossPnl = trade.grossPnl !== undefined ? Number(trade.grossPnl) : Number((grossPts * totalQty).toFixed(2));
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = isShort ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;

  // 1R Risk Metric calculation
  const riskPerShare = stopLoss ? Math.abs(entryPrice - stopLoss) : entryPrice * 0.08;
  const oneRTargetPrice = isShort ? entryPrice - riskPerShare : entryPrice + riskPerShare;
  const twoRTargetPrice = isShort ? entryPrice - 2 * riskPerShare : entryPrice + 2 * riskPerShare;

  // Responsive width tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch or Synthesize Trade Journey Candles with Bounded LRU Cache & AbortController Resilience
  useEffect(() => {
    const cacheKey = `timeline_${trade?.tokenKey || symbol}_${entryTime}_${exitTime}_${entryPrice}_${exitPrice}_${scenarioVariant}_${flightScope}`;
    const cached = getCachedTimeline(cacheKey);
    if (cached) {
      setCandleData(cached);
      setIsLoading(false);
      return;
    }

    // Check if real ticks are already stored on trade record
    if (trade.priceHistory && Array.isArray(trade.priceHistory) && trade.priceHistory.length >= 2) {
      const excursions = calculateDirectionalExcursions(direction, entryPrice, trade.priceHistory);
      const liveData = {
        success: true,
        source: 'live-recorded',
        candles: trade.priceHistory,
        entryPrice,
        exitPrice,
        targetPrice,
        stopLoss,
        mfe: excursions.mfe,
        mae: excursions.mae
      };
      setCachedTimeline(cacheKey, liveData);
      setCandleData(liveData);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    const params = new URLSearchParams({
      symbol,
      entryPrice: String(entryPrice),
      exitPrice: String(exitPrice),
      closeReason,
    });
    if (flightScope === 'expiry') {
      params.set('toExpiry', 'true');
      if (trade.expiryDatetime) params.set('expiryTime', trade.expiryDatetime);
    }
    if (targetPrice) params.set('targetPrice', String(targetPrice));
    if (stopLoss) params.set('stopLoss', String(stopLoss));
    if (entryTime) params.set('from', entryTime);
    if (exitTime) params.set('to', exitTime);
    if (trade?.tokenKey) params.set('tokenKey', trade.tokenKey);
    if (trade?.expiryDate || trade?.expiry) params.set('expiryDate', trade.expiryDate || trade.expiry);
    if (trade?.strikePrice) params.set('strikePrice', String(trade.strikePrice));
    if (trade?.optionType) params.set('optionType', trade.optionType);

    fetch(`/api/market/trade-candles?${params.toString()}`, { signal: abortController.signal })
      .then((res) => res.json())
      .then((data) => {
        if (abortController.signal.aborted) return;
        if (data.success && data.candles?.length >= 2 && data.source === 'upstox') {
          const excursions = calculateDirectionalExcursions(direction, entryPrice, data.candles);
          const enrichedData = {
            ...data,
            mfe: excursions.mfe,
            mae: excursions.mae
          };
          setCachedTimeline(cacheKey, enrichedData);
          setCandleData(enrichedData);
          setIsLoading(false);
        } else {
          const fallbackCandles = synthesizeMarketFlightPath(trade, scenarioVariant, flightScope);
          const excursions = calculateDirectionalExcursions(direction, entryPrice, fallbackCandles);
          const fallbackData = {
            success: true,
            source: 'synthesized',
            candles: fallbackCandles,
            entryPrice,
            exitPrice,
            targetPrice,
            stopLoss,
            mfe: excursions.mfe,
            mae: excursions.mae
          };
          setCachedTimeline(cacheKey, fallbackData);
          setCandleData(fallbackData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }
        const fallbackCandles = synthesizeMarketFlightPath(trade, scenarioVariant, flightScope);
        const excursions = calculateDirectionalExcursions(direction, entryPrice, fallbackCandles);
        const fallbackData = {
          success: true,
          source: 'synthesized',
          candles: fallbackCandles,
          entryPrice,
          exitPrice,
          targetPrice,
          stopLoss,
          mfe: excursions.mfe,
          mae: excursions.mae
        };
        setCandleData(fallbackData);
        setIsLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [symbol, entryPrice, exitPrice, targetPrice, stopLoss, entryTime, exitTime, closeReason, trade, scenarioVariant, flightScope, direction]);

  // Clean up animation frame and replay interval on unmount
  useEffect(() => {
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, []);

  // Responsive Dimensions
  const isMobile = containerWidth < 620;
  const height = isMobile ? 220 : 260;
  const padding = { 
    top: 36, 
    bottom: 38, 
    left: isMobile ? 12 : 20, 
    right: isMobile ? 16 : Math.min(95, Math.max(38, Math.round(containerWidth * 0.08)))
  };
  const graphWidth = Math.max(160, containerWidth - padding.left - padding.right);
  const graphHeight = height - padding.top - padding.bottom;

  const rawCandles = candleData?.candles || [];
  const source = candleData?.source || 'synthesized';
  const isVerifiedTicks = source === 'upstox' || source === 'upstox-micro' || source === 'live-recorded';

  // Adaptive Multi-Minute Candle Aggregation (Eliminates sub-pixel zebra aliasing on 375-bar streams)
  const displayCandles = useMemo(() => {
    return aggregateCandlesForDisplay(rawCandles, isMobile ? 55 : 85);
  }, [rawCandles, isMobile]);

  // Safe Range & Coordinate Scaling with Volume Normalization
  const { 
    allPoints, 
    exitPoint,
    minVal, 
    maxVal, 
    entryY, 
    netZeroY, 
    targetY, 
    stopY, 
    exitY, 
    oneRY,
    peakPoint, 
    troughPoint,
    maxVolume,
    scaleY
  } = useMemo(() => {
    if (!displayCandles.length) {
      return {
        allPoints: [],
        exitPoint: null,
        minVal: entryPrice * 0.95,
        maxVal: entryPrice * 1.05,
        entryY: 0,
        netZeroY: 0,
        targetY: null,
        stopY: null,
        exitY: 0,
        oneRY: null,
        peakPoint: null,
        troughPoint: null,
        maxVolume: 1,
        scaleY: () => 0
      };
    }

    const prices = displayCandles.map((c) => c.close ?? c.price);
    prices.push(entryPrice, exitPrice, netZeroPrice, oneRTargetPrice);
    if (targetPrice) prices.push(targetPrice);
    if (stopLoss) prices.push(stopLoss);

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const rawRange = rawMax - rawMin;
    const range = rawRange > 0.05 ? rawRange : 1.0;
    const minVal = rawMin - range * 0.10;
    const maxVal = rawMax + range * 0.10;
    const safeRange = maxVal - minVal > 0.01 ? maxVal - minVal : 1.0;

    const scaleY = (p) => padding.top + (1 - (p - minVal) / safeRange) * graphHeight;

    const maxVol = Math.max(...displayCandles.map(c => Number(c.volume || 1000)), 1000);

    const pts = displayCandles.map((c, i) => {
      const p = c.close ?? c.price;
      
      // Uniform linear time series mapping across entire flight path
      const x = padding.left + (i / (displayCandles.length - 1 || 1)) * graphWidth;

      const y = scaleY(p);
      const openP = c.open ?? p;
      const highP = c.high ?? (p + 0.3);
      const lowP = c.low ?? (p - 0.3);
      const isBullish = p >= openP;
      return { 
        ...c, 
        close: p, 
        open: openP, 
        high: highP, 
        low: lowP, 
        x, 
        y, 
        openY: scaleY(openP), 
        highY: scaleY(highP), 
        lowY: scaleY(lowP), 
        index: i, 
        isBullish 
      };
    });

    let peak = pts[0];
    let trough = pts[0];
    pts.forEach((pt) => {
      const highVal = pt.high ?? pt.close;
      const lowVal = pt.low ?? pt.close;
      if (!isShort) {
        if (highVal > (peak.high ?? peak.close)) peak = pt;
        if (lowVal < (trough.low ?? trough.close)) trough = pt;
      } else {
        if (lowVal < (peak.low ?? peak.close)) peak = pt;
        if (highVal > (trough.high ?? trough.close)) trough = pt;
      }
    });

    const exitPoint = pts.find(p => p.isExitPoint) || pts.find(p => {
      const exitMs = new Date(exitTime || Date.now()).getTime();
      return Math.abs(p.timestamp - exitMs) < 60000;
    }) || pts[Math.min(pts.length - 1, 16)];


    return {
      allPoints: pts,
      exitPoint,
      minVal,
      maxVal,
      entryY: scaleY(entryPrice),
      netZeroY: scaleY(netZeroPrice),
      targetY: targetPrice ? scaleY(targetPrice) : null,
      stopY: stopLoss ? scaleY(stopLoss) : null,
      exitY: scaleY(exitPrice),
      oneRY: scaleY(oneRTargetPrice),
      peakPoint: peak,
      troughPoint: trough,
      maxVolume: maxVol,
      scaleY
    };
  }, [displayCandles, entryPrice, exitPrice, targetPrice, stopLoss, netZeroPrice, oneRTargetPrice, graphWidth, graphHeight, padding.top, padding.left, flightScope, isShort]);

  // Points currently revealed based on replayIndex
  const renderedPoints = useMemo(() => {
    if (replayIndex === null || replayIndex >= allPoints.length - 1) {
      return allPoints;
    }
    return allPoints.slice(0, Math.max(2, replayIndex + 1));
  }, [allPoints, replayIndex]);

  const postExitPoints = useMemo(() => {
    if (!allPoints || allPoints.length === 0) return [];
    const exitIdx = allPoints.findIndex(p => p.isExitPoint);
    if (exitIdx !== -1 && exitIdx < allPoints.length - 1) {
      return allPoints.slice(exitIdx + 1);
    }
    return allPoints.filter(p => p.isPostExit);
  }, [allPoints]);

  const firstBreachPt = useMemo(() => {
    if (!postExitPoints || postExitPoints.length === 0) return null;
    return postExitPoints.find(p => Number(p.low ?? p.close) <= effectiveStopLoss) || null;
  }, [postExitPoints, effectiveStopLoss]);

  const isDrawdownBreached = useMemo(() => {
    if (trade.closeReason?.includes("STOP")) return true;
    if (firstBreachPt) return true;
    return Boolean(trade.isDrawdownBreached);
  }, [trade, firstBreachPt]);

  const splinePath = useMemo(() => calculateSplinePath(renderedPoints), [renderedPoints]);

  // Volumetric Area under curve anchored to entry line
  const areaPath = useMemo(() => {
    if (!renderedPoints.length) return '';
    const first = renderedPoints[0];
    const last = renderedPoints[renderedPoints.length - 1];
    return `${splinePath} L ${last.x.toFixed(1)} ${entryY.toFixed(1)} L ${first.x.toFixed(1)} ${entryY.toFixed(1)} Z`;
  }, [splinePath, renderedPoints, entryY]);

  // Replay Animation Engine with Robust Teardown & Milestone Haptic Telemetry
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(25, Math.round(180 / replaySpeed));
      replayTimerRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          const next = (prev === null ? 0 : prev) + 1;
          if (next >= allPoints.length) {
            setIsPlaying(false);
            return allPoints.length - 1;
          }
          triggerScrubHaptic();
          if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
            soundEngine.playMilestoneTone?.();
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    }
    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [isPlaying, replaySpeed, allPoints.length, peakPoint, troughPoint, exitPoint]);

  const handleTogglePlay = () => {
    soundEngine.playTabSwitchTone();
    // Seamless Auto-Rewind: if at terminal point or initial unscrubbed state, rewind to 0 and play
    if (replayIndex === null || replayIndex >= allPoints.length - 1) {
      setReplayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetReplay = () => {
    soundEngine.playTabSwitchTone();
    setIsPlaying(false);
    setReplayIndex(null);
    setScrubIndex(null);
  };

  // Step Forward (Micro-Transport: Candle-by-Candle)
  const handleStepForward = () => {
    soundEngine.playTabSwitchTone();
    setIsPlaying(false);
    setReplayIndex((prev) => {
      const current = prev === null ? allPoints.length - 1 : prev;
      const next = Math.min(allPoints.length - 1, current + 1);
      triggerScrubHaptic();
      if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
        soundEngine.playMilestoneTone?.();
      }
      return next;
    });
  };

  // Step Backward (Micro-Transport: Candle-by-Candle)
  const handleStepBack = () => {
    soundEngine.playTabSwitchTone();
    setIsPlaying(false);
    setReplayIndex((prev) => {
      const current = prev === null ? allPoints.length - 1 : prev;
      const next = Math.max(0, current - 1);
      triggerScrubHaptic();
      if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
        soundEngine.playMilestoneTone?.();
      }
      return next;
    });
  };

  // Keyboard shortcut listener for Modal, Carousel & Flight Scope (Esc, ←, →, j, k, Space, T, 1, 2, 4)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;

      if (e.key === 'Escape') {
        if (isStudioModalOpen) {
          setStudioModalOpen(false);
        } else if (typeof onClose === 'function') {
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J' || e.key === '[') {
        if (carouselNav?.hasPrev && typeof carouselNav.onPrev === 'function') {
          e.preventDefault();
          carouselNav.onPrev();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K' || e.key === ']') {
        if (carouselNav?.hasNext && typeof carouselNav.onNext === 'function') {
          e.preventDefault();
          carouselNav.onNext();
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        soundEngine.playTabSwitchTone?.();
        setFlightScope((prev) => {
          const next = prev === 'scalp' ? 'expiry' : 'scalp';
          if (typeof onSwitchFlightScope === 'function') {
            onSwitchFlightScope(next);
          }
          return next;
        });
      } else if (e.key === '1') {
        setReplaySpeed(1);
      } else if (e.key === '2') {
        setReplaySpeed(2);
      } else if (e.key === '4') {
        setReplaySpeed(4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudioModalOpen, onClose, carouselNav, handleTogglePlay, onSwitchFlightScope]);

  // 120Hz rAF-Throttled Cursor Tracker with Milestone Haptics
  const flushScrub = useCallback(() => {
    rAFRef.current = null;
    if (pendingClientX.current === null || !renderedPoints.length || !containerRef.current) return;
    const activeContainer = isStudioModalOpen && studioContainerRef.current ? studioContainerRef.current : containerRef.current;
    const rect = activeContainer.getBoundingClientRect();
    const mouseX = pendingClientX.current - rect.left - padding.left;
    const ratio = Math.max(0, Math.min(1, mouseX / graphWidth));
    const index = Math.round(ratio * (renderedPoints.length - 1));
    setScrubIndex((prev) => {
      if (prev !== index) {
        triggerScrubHaptic();
        if (index === 0 || (peakPoint && index === peakPoint.index) || (troughPoint && index === troughPoint.index) || (exitPoint && index === exitPoint.index)) {
          soundEngine.playMilestoneTone?.();
        }
      }
      return index;
    });
  }, [renderedPoints, graphWidth, padding.left, isStudioModalOpen, peakPoint, troughPoint, exitPoint]);

  const updateScrubFromClientX = useCallback((clientX) => {
    pendingClientX.current = clientX;
    if (!rAFRef.current) {
      rAFRef.current = requestAnimationFrame(flushScrub);
    }
  }, [flushScrub]);

  const handleMouseMove = (e) => updateScrubFromClientX(e.clientX);
  const handleClickCanvas = (e) => {
    updateScrubFromClientX(e.clientX);
    if (scrubIndex !== null) {
      setPinnedIndex((prev) => (prev === scrubIndex ? null : scrubIndex));
    }
  };
  const handleTouch = (e) => {
    if (e.touches && e.touches[0]) {
      updateScrubFromClientX(e.touches[0].clientX);
    }
  };
  const handleEndScrub = () => {
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    pendingClientX.current = null;
    setScrubIndex(null);
  };

  // Active Point Telemetry
  const currentActivePoint = useMemo(() => {
    if (scrubIndex !== null && renderedPoints[scrubIndex]) {
      return renderedPoints[scrubIndex];
    }
    if (replayIndex !== null && renderedPoints[renderedPoints.length - 1]) {
      return renderedPoints[renderedPoints.length - 1];
    }
    if (pinnedIndex !== null && renderedPoints[pinnedIndex]) {
      return renderedPoints[pinnedIndex];
    }
    return null;
  }, [scrubIndex, replayIndex, pinnedIndex, renderedPoints]);

  // Post-Mortem Diagnostics: Quantitative All-Time High (Peak / MFE) and Low (Trough / MAE)
  const isTargetHit = closeReason.includes('TARGET');
  const isStopHit = closeReason.includes('STOP') || (isShort ? exitPrice >= (stopLoss || entryPrice) : exitPrice <= (stopLoss || entryPrice));

  // Determine Highest and Lowest observed prices across all points
  const observedHighs = allPoints.map(p => p.high ?? p.close);
  const observedLows = allPoints.map(p => p.low ?? p.close);

  const rawObservedMax = observedHighs.length ? Math.max(entryPrice, exitPrice, ...observedHighs) : Math.max(entryPrice, exitPrice);
  const rawObservedMin = observedLows.length ? Math.min(entryPrice, exitPrice, ...observedLows) : Math.min(entryPrice, exitPrice);

  // In Long: Peak is highest price, Trough is lowest price
  // In Short: Peak is lowest price (profit), Trough is highest price (drawdown)
  const peakPrice = isShort ? rawObservedMin : rawObservedMax;
  const troughPrice = isShort ? rawObservedMax : rawObservedMin;

  const peakPts = Number((isShort ? Math.max(0, entryPrice - rawObservedMin) : Math.max(0, rawObservedMax - entryPrice)).toFixed(2));
  const peakRupees = Number((peakPts * totalQty).toFixed(2));
  const peakPct = entryPrice > 0 ? Number(((peakPts / entryPrice) * 100).toFixed(1)) : 0;

  const drawdownPts = Number((isShort ? Math.max(0, rawObservedMax - entryPrice) : Math.max(0, entryPrice - rawObservedMin)).toFixed(2));
  const drawdownRupees = Number((drawdownPts * totalQty).toFixed(2));
  const drawdownPct = entryPrice > 0 ? Number(((drawdownPts / entryPrice) * 100).toFixed(1)) : 0;

  // Backward-compatible aliases for existing references
  const mfePts = peakPts;
  const mfeRupees = peakRupees;
  const maePts = drawdownPts;
  const maeRupees = drawdownRupees;

  const targetTotalDistance = targetPrice ? Math.abs(targetPrice - entryPrice) : Math.max(1, peakPts || 1);
  const stopTotalDistance = stopLoss ? Math.abs(entryPrice - stopLoss) : Math.max(1, drawdownPts || 1);

  const mfeTargetEfficiencyPct = Math.min(100, Math.max(0, Math.round((peakPts / targetTotalDistance) * 100)));
  const maeRiskConsumedPct = Math.min(100, Math.max(0, Math.round((drawdownPts / stopTotalDistance) * 100)));

  const hadSignificantPeak = peakPts >= (targetPrice ? Math.abs(targetPrice - entryPrice) * 0.35 : 3.5);
  const isPeakGiveback = isStopHit && hadSignificantPeak;

  const targetCaptureDelta = targetPrice ? (isShort ? targetPrice - exitPrice : exitPrice - targetPrice) : 0;
  const stopDisciplineDelta = stopLoss ? (isShort ? exitPrice - stopLoss : stopLoss - exitPrice) : 0;

  // 🛡️ Execution Discipline Engine: Evaluates trade compliance based on plan adherence rather than FOMO post-exit drift
  const executionDiscipline = useMemo(() => {
    if (isTargetHit) {
      return {
        grade: "A+",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        label: "Target Captured 100%",
        detail: targetPrice 
          ? `Filled @ ₹${entryPrice.toFixed(1)} ➔ Scalp secured @ ₹${exitPrice.toFixed(1)} (Target: ₹${targetPrice.toFixed(1)}). Zero hesitation.` 
          : "Planned target reached cleanly."
      };
    }
    if (isStopHit) {
      const isCleanCut = Math.abs(stopDisciplineDelta) <= 1.5;
      return {
        grade: isCleanCut ? "A" : "B-",
        badgeClass: isCleanCut 
          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
          : "bg-amber-500/20 text-amber-300 border-amber-500/40",
        label: isCleanCut ? "Disciplined Stop Cut" : "Slippage on Cut",
        detail: isCleanCut 
          ? "Cut cleanly at predefined risk boundary. Capital protected for next probability setup." 
          : `Exited with ${Math.abs(stopDisciplineDelta).toFixed(1)} pts slippage beyond initial stop.`
      };
    }
    if (grossPts > 0) {
      return {
        grade: "B+",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        label: "Discretionary Take-Profit",
        detail: `Secured profit of +${grossPts.toFixed(1)} pts before target was reached.`
      };
    }
    return {
      grade: "C",
      badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      label: "Discretionary Early Exit",
      detail: `Exited position before reaching either planned target or stop boundary.`
    };
  }, [isTargetHit, isStopHit, targetPrice, stopLoss, entryPrice, exitPrice, stopDisciplineDelta, grossPts]);

  const scrubTelemetry = useMemo(() => {
    if (!currentActivePoint) return null;
    const currentP = currentActivePoint.close;
    const ptsDelta = isShort ? entryPrice - currentP : currentP - entryPrice;
    const rupeesDelta = ptsDelta * totalQty;
    const isNetGain = currentP >= netZeroPrice;
    const pctReturn = entryPrice > 0 ? ((ptsDelta / entryPrice) * 100).toFixed(1) : 0;

    const distToTarget = targetPrice ? Math.abs(targetPrice - currentP) : null;
    const distToStop = stopLoss ? Math.abs(currentP - stopLoss) : null;
    const distToPeak = Math.abs(currentP - peakPrice);
    const distToTrough = Math.abs(currentP - troughPrice);

    // Counterfactual Exit Economics (What if exited here?)
    const counterfactualGross = ptsDelta * totalQty;
    const counterfactualNet = Number((counterfactualGross - charges).toFixed(2));
    const counterfactualAlpha = Number((counterfactualNet - Number(trade.netPnl || 0)).toFixed(2));

    return {
      currentP,
      ptsDelta: Number(ptsDelta.toFixed(2)),
      rupeesDelta: Number(rupeesDelta.toFixed(2)),
      pctReturn,
      isNetGain,
      distToTarget: distToTarget !== null ? Number(distToTarget.toFixed(2)) : null,
      distToStop: distToStop !== null ? Number(distToStop.toFixed(2)) : null,
      distToPeak: Number(distToPeak.toFixed(2)),
      distToTrough: Number(distToTrough.toFixed(2)),
      timeStr: formatTimeShort(currentActivePoint.time || currentActivePoint.timestamp),
      isPostExit: Boolean(currentActivePoint.isPostExit),
      counterfactualNet,
      counterfactualAlpha,
      index: currentActivePoint.index ?? 0
    };
  }, [currentActivePoint, entryPrice, targetPrice, stopLoss, netZeroPrice, isShort, totalQty, charges, trade.netPnl, peakPrice, troughPrice]);

  // Active Live P&L for Background Watermark
  const activeWatermarkPnl = useMemo(() => {
    if (scrubTelemetry) {
      return scrubTelemetry.rupeesDelta;
    }
    return Number(trade.netPnl || 0);
  }, [scrubTelemetry, trade.netPnl]);

  // Stalling/Resistance Phase midpoint index
  const stallPoint = useMemo(() => {
    if (!peakPoint || !allPoints.length || allPoints.length < 6) return null;
    const peakIdx = peakPoint.index;
    if (peakIdx >= allPoints.length - 2) return null;
    const stallIdx = Math.min(allPoints.length - 2, peakIdx + Math.round((allPoints.length - peakIdx) * 0.4));
    return allPoints[stallIdx];
  }, [peakPoint, allPoints]);

  // Render SVG Chart Canvas (Dual Mode: Spline or Japanese Candlesticks)
  const renderSvgCanvas = (chartH = height) => {
    const bottomBaseY = chartH - padding.bottom;
    const volHeightLimit = 38;

    return (
      <svg
        width={containerWidth}
        height={chartH}
        className="overflow-visible block w-full select-none"
      >
        <defs>
          <linearGradient id={profitAreaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id={lossAreaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
            <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.32" />
          </linearGradient>

          <linearGradient id={pathStrokeGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor={peakPts > 0.5 ? "#10b981" : "#cbd5e1"} />
            <stop offset="75%" stopColor={exitPrice >= entryPrice ? "#34d399" : "#fb7185"} />
            <stop offset="100%" stopColor={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} />
          </linearGradient>

          <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* GPU Accelerated Split ClipPaths: Profit Above Entry, Loss Below Entry */}
          <clipPath id={`${reactId}_clipAbove`}>
            <rect x="0" y="0" width={containerWidth} height={Math.max(0, entryY)} />
          </clipPath>
          <clipPath id={`${reactId}_clipBelow`}>
            <rect x="0" y={Math.max(0, entryY)} width={containerWidth} height={Math.max(0, chartH - entryY)} />
          </clipPath>
        </defs>

        {/* 🏆 LIVE DYNAMIC P&L WATERMARK (Bloomberg Style Ambient HUD) */}
        <text
          x={padding.left + graphWidth / 2}
          y={padding.top + graphHeight / 2 + 16}
          textAnchor="middle"
          fill={activeWatermarkPnl >= 0 ? "#10b981" : "#f43f5e"}
          fillOpacity="0.06"
          fontSize={isMobile ? "46" : "68"}
          fontFamily="monospace"
          fontWeight="900"
          className="pointer-events-none select-none tabular-nums tracking-tighter"
        >
          {activeWatermarkPnl >= 0 ? "+" : ""}₹{Math.abs(activeWatermarkPnl).toFixed(2)}
        </text>

        {/* 🛡️ R-MULTIPLE RISK ZONES SHADING (Suppressed in Start-to-Expiry Mode) */}
        {flightScope !== 'expiry' && stopLoss !== null && stopY !== null && (
          /* -1R Risk Cushion Box (Red Shading between Entry and Stop Loss) */
          <rect
            x={padding.left}
            y={Math.min(entryY, stopY)}
            width={graphWidth}
            height={Math.max(2, Math.abs(entryY - stopY))}
            fill="#f43f5e"
            fillOpacity="0.035"
            stroke="#f43f5e"
            strokeOpacity="0.12"
            strokeDasharray="2 4"
            className="pointer-events-none"
          />
        )}

        {flightScope !== 'expiry' && oneRY !== null && (
          /* +1R Expansion Zone (Champagne Gold Shading between Entry and 1R) */
          <rect
            x={padding.left}
            y={Math.min(entryY, oneRY)}
            width={graphWidth}
            height={Math.max(2, Math.abs(entryY - oneRY))}
            fill="#f59e0b"
            fillOpacity="0.035"
            stroke="rgba(255,255,255,0.45)"
            strokeOpacity="0.12"
            strokeDasharray="2 4"
            className="pointer-events-none"
          />
        )}

        {/* Faint Horizontal Scale Gridlines */}
        {[0.25, 0.5, 0.75].map((fraction, idx) => {
          const gridY = padding.top + fraction * graphHeight;
          return (
            <line
              key={idx}
              x1={padding.left}
              y1={gridY}
              x2={padding.left + graphWidth}
              y2={gridY}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          );
        })}

        {/* 📊 Volume Density Histogram along bottom baseline */}
        {allPoints.map((pt, i) => {
          const barW = Math.max(2, Math.min(8, (graphWidth / allPoints.length) * 0.65));
          const volRatio = Math.min(1, Math.max(0.1, Number(pt.volume || 1000) / maxVolume));
          const barH = volRatio * volHeightLimit;
          const barY = bottomBaseY - barH;
          const isRevealed = replayIndex === null || i <= replayIndex;
          return (
            <rect
              key={`vol-${i}`}
              x={pt.x - barW / 2}
              y={barY}
              width={barW}
              height={barH}
              rx={1.5}
              fill={pt.isBullish ? '#10b981' : '#f43f5e'}
              fillOpacity={!isRevealed ? '0.05' : currentActivePoint && currentActivePoint.index === i ? '0.80' : '0.22'}
              className="transition-all duration-150"
            />
          );
        })}

        
        {/* ⚡ Scalp Exit Line & Divider (In Start-to-Expiry View) */}
        {flightScope === 'expiry' && exitPoint && (
          <g className="transition-all duration-300">
            <line
              x1={exitPoint.x}
              y1={padding.top}
              x2={exitPoint.x}
              y2={bottomBaseY}
              stroke="#38bdf8"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            <g transform={`translate(${Math.min(padding.left + graphWidth - 120, Math.max(padding.left + 5, exitPoint.x - 60))}, ${padding.top + 8})`}>
              <rect width="120" height="20" rx="6" fill="#082f49" stroke="#38bdf8" strokeOpacity="0.8" />
              <text x="60" y="14" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                ⚡ Exit @ ₹{exitPrice.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* 🏁 Terminal Expiry Settlement Value Marker */}
        {flightScope === 'expiry' && allPoints.length > 0 && (
          <g className="transition-all duration-300">
            <g transform={`translate(${padding.left + graphWidth - 130}, ${bottomBaseY - 26})`}>
              <rect width="126" height="22" rx="6" fill={trade.terminalIntrinsic > 0 ? "#064e3b" : "#4c0519"} stroke={trade.terminalIntrinsic > 0 ? "#10b981" : "#f43f5e"} strokeOpacity="0.8" />
              <text x="63" y="15" textAnchor="middle" fill={trade.terminalIntrinsic > 0 ? "#a7f3d0" : "#fecdd3"} fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                🏁 15:30: ₹{Number(trade.terminalIntrinsic || 0).toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* 🟢 1. TARGET PRICE LEVEL (Suppressed in Start-to-Expiry Mode) */}
        {flightScope !== 'expiry' && targetPrice !== null && targetY !== null && (
          <g className="transition-all duration-300">
            <line
              x1={padding.left}
              y1={targetY}
              x2={padding.left + graphWidth}
              y2={targetY}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth="1.6"
              strokeOpacity="0.85"
            />
            {!isMobile ? (
              <g transform={`translate(${padding.left + graphWidth + 8}, ${targetY - 11})`}>
                <rect width="96" height="22" rx="7" fill="#064e3b" stroke="#10b981" strokeOpacity="0.7" />
                <text x="7" y="15" fill="#a7f3d0" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  🎯 TP ₹{targetPrice.toFixed(1)}
                </text>
              </g>
            ) : (
              <text x={padding.left + 4} y={targetY - 4} fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                TP ₹{targetPrice.toFixed(1)}
              </text>
            )}
          </g>
        )}

        {/* ⚖️ 2. FRICTION-ADJUSTED TRUE BREAKEVEN LINE (Suppressed in Start-to-Expiry Mode) */}
        {flightScope !== 'expiry' && netZeroY > 0 && Math.abs(netZeroY - entryY) > 2 && (
          <g className="transition-all duration-300 opacity-80">
            <line
              x1={padding.left}
              y1={netZeroY}
              x2={padding.left + graphWidth}
              y2={netZeroY}
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="2 3"
              strokeWidth="1.2"
            />
            {!isMobile && (
              <g transform={`translate(${padding.left + graphWidth + 8}, ${netZeroY - 9})`}>
                <rect width="96" height="19" rx="5" fill="#451a03" stroke="rgba(255,255,255,0.45)" strokeOpacity="0.5" />
                <text x="6" y="13.5" fill="#cbd5e1" fontSize="9" fontFamily="monospace" className="tabular-nums">
                  BE ₹{netZeroPrice.toFixed(1)}
                </text>
              </g>
            )}
          </g>
        )}

        {/* 🔵 3. ENTRY PRICE LEVEL BASELINE */}
        <g className="transition-all duration-300">
          <line
            x1={padding.left}
            y1={entryY}
            x2={padding.left + graphWidth}
            y2={entryY}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.6"
            strokeOpacity="0.85"
          />
          {!isMobile ? (
            <g transform={`translate(${padding.left + graphWidth + 8}, ${entryY - 11})`}>
              <rect width="96" height="22" rx="7" fill="#261b0a" stroke="rgba(255,255,255,0.45)" strokeOpacity="0.7" />
              <text x="7" y="15" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                ⚡ EP ₹{entryPrice.toFixed(1)}
              </text>
            </g>
          ) : (
            <text x={padding.left + 4} y={entryY - 4} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
              EP ₹{entryPrice.toFixed(1)}
            </text>
          )}
        </g>

        {/* 🔴 4. STOP LOSS LEVEL (Suppressed in Start-to-Expiry Mode) */}
        {flightScope !== 'expiry' && stopLoss !== null && stopY !== null && (
          <g className="transition-all duration-300">
            <line
              x1={padding.left}
              y1={stopY}
              x2={padding.left + graphWidth}
              y2={stopY}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1.6"
              strokeOpacity="0.85"
            />
            {!isMobile ? (
              <g transform={`translate(${padding.left + graphWidth + 8}, ${stopY - 11})`}>
                <rect width="96" height="22" rx="7" fill="#881337" stroke="#f43f5e" strokeOpacity="0.7" />
                <text x="7" y="15" fill="#fecdd3" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  🛑 SL ₹{stopLoss.toFixed(1)}
                </text>
              </g>
            ) : (
              <text x={padding.left + 4} y={stopY + 13} fill="#fecdd3" fontSize="9" fontFamily="monospace" fontWeight="bold">
                SL ₹{stopLoss.toFixed(1)}
              </text>
            )}
          </g>
        )}

        {/* DUAL VIEW ENGINE: 'spline' VS 'candles' */}
        {chartMode === 'spline' ? (
          <>
            {/* Split Area Fills: Emerald Green in Profit, Ruby Red in Loss */}
            {!isShort ? (
              <>
                <path d={areaPath} fill={`url(#${profitAreaGradId})`} clipPath={`url(#${reactId}_clipAbove)`} />
                <path d={areaPath} fill={`url(#${lossAreaGradId})`} clipPath={`url(#${reactId}_clipBelow)`} />
              </>
            ) : (
              <>
                <path d={areaPath} fill={`url(#${profitAreaGradId})`} clipPath={`url(#${reactId}_clipBelow)`} />
                <path d={areaPath} fill={`url(#${lossAreaGradId})`} clipPath={`url(#${reactId}_clipAbove)`} />
              </>
            )}

            {/* 🌊 Neon Glowing Spline Path */}
            <path
              d={splinePath}
              fill="none"
              stroke={`url(#${pathStrokeGradId})`}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowFilterId})`}
            />
          </>
        ) : (
          /* 🕯️ PRECISION JAPANESE CANDLESTICKS ENGINE (Pixel-Snapped Needle-Sharp Rendering) */
          <g className="candlesticks-layer" shapeRendering="crispEdges">
            {renderedPoints.map((pt, i) => {
              const candleW = Math.max(3, Math.min(10, (graphWidth / allPoints.length) * 0.60));
              const bodyTop = Math.min(pt.openY, pt.y);
              const bodyHeight = Math.max(2, Math.abs(pt.openY - pt.y));
              return (
                <g key={`candle-${i}`} className="transition-opacity duration-150">
                  {/* Upper & Lower Wicks */}
                  <line
                    x1={pt.x}
                    y1={pt.highY}
                    x2={pt.x}
                    y2={pt.lowY}
                    stroke={pt.isBullish ? "#10b981" : "#f43f5e"}
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                  />
                  {/* Real Candlestick Body */}
                  <rect
                    x={pt.x - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyHeight}
                    rx={1}
                    fill={pt.isBullish ? "#10b981" : "#f43f5e"}
                    fillOpacity="0.85"
                    stroke={pt.isBullish ? "#34d399" : "#fb7185"}
                    strokeWidth="0.8"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* =========================================================================
            4-PHASE TRADE JOURNEY ANNOTATIONS ON THE CURVE (High, Low, Entry, Exit)
            ========================================================================= */}
        {/* Milestone 1: ⚡ ORDER ENTRY (Ignition) */}
        {renderedPoints[0] && (
          <g transform={`translate(${renderedPoints[0].x}, ${renderedPoints[0].y})`}>
            <circle r="9" fill="#ffffff" fillOpacity="0.25" className="animate-ping" />
            <circle r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
            <g transform="translate(-40, -26)">
              <rect width="80" height="18" rx="5" fill="#18181b" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <text x="40" y="12.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                ⚡ Entry ₹{entryPrice.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* Milestone 2: 🟢 ALL-TIME TRADE HIGH (Peak Excursion) */}
        {peakPoint && (() => {
          const isNearEntry = Math.abs(peakPoint.x - (renderedPoints[0]?.x || 0)) < 55;
          const isNearExit = renderedPoints.length > 1 && Math.abs(peakPoint.x - renderedPoints[renderedPoints.length - 1].x) < 55;
          const isNearTrough = troughPoint && Math.abs(peakPoint.x - troughPoint.x) < 75;
          
          let yOffset = peakPoint.y < padding.top + 26 ? 14 : -28;
          if (isNearTrough && yOffset > 0) {
            yOffset = -28;
          }
          let xOffset = peakPoint.x > graphWidth - 60 ? -80 : isNearEntry ? 10 : -45;

          return (
            <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
              <circle r="11" fill="#10b981" fillOpacity="0.28" className="animate-pulse" />
              <circle r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.8" />
              <g transform={`translate(${xOffset}, ${yOffset})`}>
                <rect width="90" height="20" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                <text x="45" y="14" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  ▲ High ₹{peakPrice.toFixed(1)}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Milestone 3: 🔴 ALL-TIME TRADE LOW (Deepest Drawdown) */}
        {troughPoint && Math.abs(troughPoint.x - (peakPoint?.x || 0)) > 15 && (() => {
          const isNearPeak = peakPoint && Math.abs(troughPoint.x - peakPoint.x) < 75;
          const isNearExit = renderedPoints.length > 1 && Math.abs(troughPoint.x - renderedPoints[renderedPoints.length - 1].x) < 55;
          
          let yOffset = troughPoint.y > chartH - 40 ? -28 : 14;
          if (isNearPeak) {
            yOffset = 14;
          }
          let xOffset = troughPoint.x > graphWidth - 60 ? -80 : isNearExit ? -85 : -45;

          return (
            <g transform={`translate(${troughPoint.x}, ${troughPoint.y})`}>
              <circle r="11" fill="#f43f5e" fillOpacity="0.28" className="animate-pulse" />
              <circle r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.8" />
              <g transform={`translate(${xOffset}, ${yOffset})`}>
                <rect width="90" height="20" rx="6" fill="#881337" stroke="#f43f5e" strokeWidth="1.2" />
                <text x="45" y="14" textAnchor="middle" fill="#fecdd3" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  ▼ Low ₹{troughPrice.toFixed(1)}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Path-Dependency Stop Invalidation Marker */}
        {flightScope === 'expiry' && firstBreachPt && (
          <g transform={`translate(${firstBreachPt.x}, ${firstBreachPt.y})`}>
            <circle r="10" fill="#f43f5e" fillOpacity="0.25" className="animate-ping" />
            <circle r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
            <g transform="translate(-60, -28)">
              <rect width="120" height="20" rx="5" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
              <text x="60" y="14" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                🛑 Stop Invalidation
              </text>
            </g>
          </g>
        )}

        {/* Milestone 4: 🎯 / 🛑 REALIZED EXIT PIN */}
        {renderedPoints.length > 1 && (
          <g transform={`translate(${renderedPoints[renderedPoints.length - 1].x}, ${renderedPoints[renderedPoints.length - 1].y})`}>
            <circle 
              r="10" 
              fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} 
              fillOpacity="0.35" 
              className="animate-ping" 
            />
            <circle 
              r="5.5" 
              fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} 
              stroke="#ffffff" 
              strokeWidth="1.8" 
            />
            <g transform={`translate(${renderedPoints[renderedPoints.length - 1].x > graphWidth - 50 ? -85 : -45}, 14)`}>
              <rect 
                width="90" 
                height="20" 
                rx="6" 
                fill={exitPrice >= entryPrice ? "#064e3b" : "#881337"} 
                stroke={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} 
                strokeWidth="1.2" 
              />
              <text 
                x="45" 
                y="14" 
                textAnchor="middle"
                fill={exitPrice >= entryPrice ? "#a7f3d0" : "#fecdd3"} 
                fontSize="9" 
                fontFamily="monospace" 
                fontWeight="bold"
              >
                {isTargetHit ? '🎯 Target Hit' : isStopHit ? '🛑 Stop Cut' : 'Exit'} ₹{exitPrice.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* ⚡ TradingView-Style Orthogonal Inspection Crosshairs (Zero Blue, Cool Platinum & Emerald Glow) */}
        {currentActivePoint && (
          <g className="pointer-events-none select-none">
            {/* Vertical Time Projection Line */}
            <line
              x1={currentActivePoint.x}
              y1={padding.top}
              x2={currentActivePoint.x}
              y2={bottomBaseY}
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="3 3"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
            {/* Horizontal Price Projection Line */}
            <line
              x1={padding.left}
              y1={currentActivePoint.y}
              x2={padding.left + graphWidth}
              y2={currentActivePoint.y}
              stroke="rgba(255,255,255,0.45)"
              strokeDasharray="3 3"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />

            {/* Target Reticle Vertex Aura */}
            <circle
              cx={currentActivePoint.x}
              cy={currentActivePoint.y}
              r="10"
              fill="#f59e0b"
              fillOpacity="0.18"
              className="animate-ping"
            />
            <circle
              cx={currentActivePoint.x}
              cy={currentActivePoint.y}
              r="5.5"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2"
              className="shadow-[0_0_12px_rgba(245,158,11,0.8)]"
            />

            {/* TradingView-Style Dynamic Price Level Badge on Right Axis Gutter */}
            {!isMobile && (
              <g transform={`translate(${padding.left + graphWidth + 6}, ${currentActivePoint.y - 10})`}>
                <rect width="68" height="20" rx="5" fill="#1c160c" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
                <text x="6" y="14" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                  ₹{currentActivePoint.close.toFixed(1)}
                </text>
              </g>
            )}

            {/* TradingView-Style Dynamic Time Badge on Bottom X-Axis */}
            <g transform={`translate(${Math.max(padding.left, Math.min(padding.left + graphWidth - 54, currentActivePoint.x - 27))}, ${chartH - 22})`}>
              <rect width="54" height="18" rx="4" fill="#1c160c" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" />
              <text x="27" y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold" className="tabular-nums">
                {formatTimeShort(currentActivePoint.time || currentActivePoint.timestamp)}
              </text>
            </g>
          </g>
        )}

        {/* X-Axis Timeline Timestamps */}
        {allPoints.length > 0 && (
          <g className="text-slate-400 text-[9.5px] font-mono tabular-nums" fill="#94a3b8">
            <text x={padding.left} y={chartH - 8} textAnchor="start">
              {formatTimeShort(allPoints[0].time || allPoints[0].timestamp)}
            </text>
            {allPoints[Math.floor(allPoints.length / 2)] && (
              <text x={allPoints[Math.floor(allPoints.length / 2)].x} y={chartH - 8} textAnchor="middle">
                {formatTimeShort(allPoints[Math.floor(allPoints.length / 2)].time || allPoints[Math.floor(allPoints.length / 2)].timestamp)}
              </text>
            )}
            <text x={padding.left + graphWidth} y={chartH - 8} textAnchor="end">
              {formatTimeShort(allPoints[allPoints.length - 1].time || allPoints[allPoints.length - 1].timestamp)}
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "relative select-none animate-in fade-in duration-300",
        isModalView
          ? "p-1.5 sm:p-2.5 bg-transparent"
          : "rounded-3xl bg-[#090b12]/95 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
      )}
    >
      {/* Ambient Lighting Gradients in Luxury Champagne & Emerald */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-slate-400/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================================
          STRIP 1: PRIMARY TOPBAR (Pristine, 3-Zone Unclipped Executive Header)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08] shrink-0">
        {/* Zone 1: Left Identity Cluster */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.03] border border-white/20 flex items-center justify-center text-white shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-white font-black text-base sm:text-lg tracking-tight whitespace-nowrap font-sans">
                {symbol}
              </strong>

              {/* Option Type Badge */}
              <span className={clsx(
                "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm whitespace-nowrap shrink-0 tracking-wider",
                trade.optionType === "CALL" || symbol.includes("CE") 
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              )}>
                {trade.optionType === "CALL" || symbol.includes("CE") ? "CALL CE" : "PUT PE"}
              </span>

              {/* Status Outcome Badge */}
              <span className={clsx(
                "text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0",
                isTargetHit ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]" :
                isStopHit ? "bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]" :
                "bg-white/10 border-white/20 text-zinc-300"
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isTargetHit ? "bg-emerald-400" : isStopHit ? "bg-rose-400" : "bg-white")} />
                <span>{closeReason.replace(/_/g, " ")}</span>
              </span>
            </div>

            <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-1 whitespace-nowrap">
              <span>Entry: <strong className="text-zinc-200">₹{entryPrice.toFixed(2)}</strong></span>
              <span className="text-zinc-600">·</span>
              <span>Exit: <strong className="text-zinc-200">₹{exitPrice.toFixed(2)}</strong></span>
              <span className="text-zinc-600">·</span>
              <span>Duration: <strong className="text-cyan-300 font-bold">{trade.duration || calculateTradeDuration(trade.entryDatetime, trade.exitDatetime)}</strong></span>
              {totalQty > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span>Qty: <strong className="text-zinc-300">{totalQty}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Center Telemetry Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Realized Net P&L Capsule */}
          <div className={clsx(
            "text-xs font-mono font-black px-3.5 py-1.5 rounded-2xl border shadow-sm whitespace-nowrap shrink-0 tabular-nums flex items-center gap-2 backdrop-blur-xl",
            trade.netPnl >= 0 
              ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/35 shadow-[inset_0_1px_0_rgba(16,185,129,0.3),0_8px_20px_-5px_rgba(16,185,129,0.3)]" 
              : "bg-gradient-to-r from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/35 shadow-[inset_0_1px_0_rgba(244,63,94,0.3),0_8px_20px_-5px_rgba(244,63,94,0.3)]"
          )}>
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Net P&amp;L</span>
            <span className="text-sm font-black tracking-tight">{trade.netPnl >= 0 ? "+" : ""}₹{Number(trade.netPnl || 0).toFixed(2)}</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-white/10 text-white font-bold">
              {trade.netReturnPct > 0 ? "+" : ""}{Number(trade.netReturnPct || 0).toFixed(2)}%
            </span>
          </div>

          {/* Tax & Friction Drag Pill */}
          <span 
            className="text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 whitespace-nowrap shrink-0 shadow-sm flex items-center gap-1.5" 
            title="Exchange statutory taxes & brokerage friction"
          >
            <span className="text-zinc-500 text-[10px]">TAX</span>
            <strong className="text-cyan-300 font-bold">₹{charges.toFixed(2)}</strong>
          </span>

          {/* Data Provenance Badge */}
          <span 
            className={clsx(
              "text-[10.5px] font-mono font-bold px-2.5 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-help",
              isVerifiedTicks 
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.12)]" 
                : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
            )}
            title={isVerifiedTicks 
              ? "Verified Upstox 1-Minute OHLCV Candles: Historical order tape authenticated." 
              : "Geometric Lifecycle Spline: Interpolated from verified entry, exit, high and low metrics. Connect active Upstox session for raw 1m tape."
            }
          >
            {isVerifiedTicks ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Upstox REST 1m</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Simulated</span>
              </>
            )}
          </span>
        </div>

        {/* Zone 3: Right Actions (Carousel & Close) */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          {carouselNav && (
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10 text-xs font-mono shadow-inner backdrop-blur-xl">
              <button
                type="button"
                onClick={carouselNav.onPrev}
                disabled={!carouselNav.hasPrev}
                className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
                title="Previous Trade (Hotkey: ← or J)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-bold">Prev</span>
              </button>

              <div className="px-2.5 py-0.5 text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
                Trade {carouselNav.currentIndex + 1} of {carouselNav.totalCount}
              </div>

              <button
                type="button"
                onClick={carouselNav.onNext}
                disabled={!carouselNav.hasNext}
                className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
                title="Next Trade (Hotkey: → or K)"
              >
                <span className="hidden sm:inline text-[11px] font-bold">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {typeof onClose === "function" && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone?.();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-slate-300 text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Close Timeline Modal (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="font-bold">Close</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          STRIP 2: COMMAND & EXECUTION TOOLBAR DECK (Apple Spatial Segmented Bar)
          ========================================================================= */}
      <div className="my-2.5 h-12 px-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        {/* Left Control Group: Primary Tabs & Dual Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Tabs */}
          <div className="h-8 flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone?.();
                setActiveTab('chart');
              }}
              className={clsx(
                "h-6 px-3 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                activeTab === 'chart' 
                  ? "bg-white text-zinc-950 font-black shadow-[0_2px_10px_rgba(255,255,255,0.3)]" 
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap font-bold text-xs">Flight Path</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone?.();
                setActiveTab('journal');
              }}
              className={clsx(
                "h-6 px-3 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                activeTab === 'journal' 
                  ? "bg-white text-zinc-950 font-black shadow-[0_2px_10px_rgba(255,255,255,0.3)]" 
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap font-bold text-xs">Trade Journal</span>
            </button>
          </div>

          {/* Chart Scope & Style Controls */}
          {activeTab === 'chart' && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Flight Scope Arc Toggle: Scalp vs Start-to-Expiry */}
              <div className="h-8 flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone?.();
                    setFlightScope('scalp');
                    if (typeof onSwitchFlightScope === 'function') {
                      onSwitchFlightScope('scalp');
                    }
                  }}
                  className={clsx(
                    "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                    flightScope === 'scalp'
                      ? "bg-cyan-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="View Execution Scope: From Order Entry to Square Off (Hotkey: T)"
                >
                  <Zap className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Active Scalp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone?.();
                    setFlightScope('expiry');
                    if (typeof onSwitchFlightScope === 'function') {
                      onSwitchFlightScope('expiry');
                    }
                  }}
                  className={clsx(
                    "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                    flightScope === 'expiry'
                      ? "bg-emerald-400 text-zinc-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="View Full Arc: From Order Entry Through Exit to 15:30 Expiry Settlement (Hotkey: T)"
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Start to Expiry</span>
                </button>
              </div>

              {/* Dual View Engine Toggle: Spline vs Candlesticks */}
              <div className="h-8 flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone?.();
                    setChartMode('spline');
                  }}
                  className={clsx(
                    "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                    chartMode === 'spline' 
                      ? "bg-white text-zinc-950 font-black shadow-sm" 
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="View Smooth Spline Trajectory"
                >
                  <Activity className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Spline</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone?.();
                    setChartMode('candles');
                  }}
                  className={clsx(
                    "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                    chartMode === 'candles' 
                      ? "bg-white text-zinc-950 font-black shadow-sm" 
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="View Precision Japanese Candlesticks"
                >
                  <CandlestickChart className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Candles</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Control Group: Replay Transport Simulator */}
        {activeTab === 'chart' && (
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 shadow-inner shrink-0">
            <button
              type="button"
              onClick={handleStepBack}
              disabled={replayIndex === 0}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Step Backward (Previous Candle)"
            >
              <SkipBack className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className={clsx(
                "h-6 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                isPlaying 
                  ? "bg-emerald-500 text-black font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                  : "bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 shadow-sm"
              )}
              title={isPlaying ? "Pause Replay (Space)" : "Play Flight Path Simulator (Space)"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 text-black shrink-0" />
                  <span className="whitespace-nowrap">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">Replay</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              disabled={replayIndex === allPoints.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Step Forward (Next Candle)"
            >
              <SkipForward className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleResetReplay}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 shrink-0"
              title="Reset to Full Trajectory"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-white/10 pl-1 h-5">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setReplaySpeed(spd)}
                  className={clsx(
                    "h-5 px-1.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 shrink-0",
                    replaySpeed === spd ? "bg-white text-zinc-950 font-black shadow-sm" : "hover:text-white text-zinc-400"
                  )}
                  title={`Set playback speed to ${spd}x (Hotkey: ${spd})`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      {activeTab === 'chart' ? (
        <>
          {/* Scenario Presets Bar (When Synthetic) */}
      {!isVerifiedTicks && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 my-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-[10.5px] font-mono text-zinc-300 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="whitespace-nowrap">
              <strong>Simulated Market Movement:</strong> Demonstrating price path from entry (₹{entryPrice.toFixed(2)}) through peak excursion to exit.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="text-[9.5px] text-slate-400 uppercase font-bold whitespace-nowrap">Scenario Preset:</span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setScenarioVariant('rollercoaster');
              }}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
                scenarioVariant === 'rollercoaster' 
                  ? "bg-white text-zinc-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              )}
              title="Simulate Peak Rally (100 -> 110) then Rollover into Stop Loss (90)"
            >
              🎢 Peak Roller-Coaster (110 ➔ 90)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setScenarioVariant('direct');
              }}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
                scenarioVariant === 'direct' 
                  ? "bg-white text-zinc-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              )}
              title="Simulate Direct Breakdown into Stop Loss"
            >
              ⚡ Direct Drop
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setScenarioVariant('target');
              }}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
                scenarioVariant === 'target' 
                  ? "bg-emerald-400 text-black font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              )}
              title="Simulate Trending Expansion into Target"
            >
              🚀 Target Run
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STRIP 3: ALL-TIME HIGH / LOW TELEMETRY & SCRUB HUD (4-Column Luxury Grid)
          ========================================================================= */}
      <div className="my-2.5">
        {scrubTelemetry ? (
          /* Live Interactive Scrub Cursor Telemetry HUD */
          <div className="p-3.5 rounded-2xl bg-black/70 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 flex-wrap tabular-nums">
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[10.5px] flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>CURSOR TELEMETRY</span>
              </span>
              <span className="text-zinc-400">@{scrubTelemetry.timeStr} IST</span>
              <span className="text-white font-black px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-sm shadow-inner">
                ₹{scrubTelemetry.currentP.toFixed(2)}
              </span>
              <span className={clsx("font-black text-sm", scrubTelemetry.isNetGain ? "text-emerald-400" : "text-rose-400")}>
                {scrubTelemetry.ptsDelta >= 0 ? "+" : ""}₹{scrubTelemetry.rupeesDelta.toFixed(2)} ({scrubTelemetry.ptsDelta >= 0 ? "+" : ""}{scrubTelemetry.ptsDelta} pts / {scrubTelemetry.pctReturn}%)
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shadow-sm">
                To High: <strong className="font-bold">{scrubTelemetry.distToPeak > 0 ? `-${scrubTelemetry.distToPeak} pts` : "At High"}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 shadow-sm">
                To Low: <strong className="font-bold">{scrubTelemetry.distToTrough > 0 ? `+${scrubTelemetry.distToTrough} pts` : "At Low"}</strong>
              </span>
              {scrubTelemetry.distToTarget !== null && (
                <span className="hidden md:inline text-zinc-400 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                  TP: <strong className="text-emerald-300 font-bold">₹{scrubTelemetry.distToTarget}</strong>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Default 4-Column High/Low & Execution Telemetry HUD (Apple Ceramic Glass Bento) */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
            {/* Card 1: 🟢 All-Time High (Peak / MFE) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-emerald-500/[0.07] to-white/[0.02] border border-emerald-500/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(16,185,129,0.3),0_12px_30px_-10px_rgba(0,0,0,0.6)] flex flex-col justify-between hover:border-emerald-500/40 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.06] rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>Trade Peak (High)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20">
                  MFE
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                ₹{peakPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
                <span className="text-emerald-400 font-bold">+{peakPts.toFixed(2)} pts</span>
                <span className="text-zinc-400 text-[10px]">
                  {peakPts > 0 ? `+₹${peakRupees.toFixed(2)}` : "Flat at Entry"}
                </span>
              </div>
              {/* Mini Target Capture Progress */}
              <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Capture Efficiency</span>
                <span className="text-emerald-300 font-bold">{mfeTargetEfficiencyPct}%</span>
              </div>
            </div>

            {/* Card 2: 🔴 All-Time Low (Deepest Drawdown / MAE) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-rose-500/[0.07] to-white/[0.02] border border-rose-500/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(244,63,94,0.3),0_12px_30px_-10px_rgba(0,0,0,0.6)] flex flex-col justify-between hover:border-rose-500/40 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.06] rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Deepest Low (MAE)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold border border-rose-500/20">
                  DRAWDOWN
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                ₹{troughPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
                <span className="text-rose-400 font-bold">-{drawdownPts.toFixed(2)} pts</span>
                <span className="text-zinc-400 text-[10px]">
                  {drawdownPts > 0 ? `-₹${drawdownRupees.toFixed(2)}` : "Zero Drawdown"}
                </span>
              </div>
              {/* Mini Stop Cushion Consumed Progress */}
              <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Cushion Used</span>
                <span className={clsx("font-bold", maeRiskConsumedPct > 75 ? "text-rose-400" : "text-amber-300")}>
                  {maeRiskConsumedPct}%
                </span>
              </div>
            </div>

            {/* Card 3: ⚖️ True Breakeven (Friction Gate) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/[0.04] to-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_-10px_rgba(0,0,0,0.6)] flex flex-col justify-between hover:border-amber-500/30 transition-all relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>True Breakeven (BE)</span>
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  FRICTION
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                ₹{netZeroPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between tabular-nums">
                <span>Tax Friction:</span>
                <strong className="text-amber-300 font-bold">+{frictionPerUnit.toFixed(2)} pts/qty</strong>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Total Charges</span>
                <span className="text-zinc-300 font-bold font-mono">₹{charges.toFixed(2)}</span>
              </div>
            </div>

            {/* Card 4: ⏱️ Holding Duration & Timing */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-cyan-500/[0.04] to-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_-10px_rgba(0,0,0,0.6)] flex flex-col justify-between hover:border-cyan-500/30 transition-all relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Holding Duration</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  {trade.duration || calculateTradeDuration(trade.entryDatetime, trade.exitDatetime)}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-white tabular-nums flex items-center gap-2 mt-0.5">
                <span>{formatTimeShort(entryTime)}</span>
                <span className="text-zinc-500 text-xs font-normal">➔</span>
                <span>{formatTimeShort(exitTime)}</span>
              </div>
              <div className="text-[10.5px] text-zinc-400 mt-1 truncate" title={closeReason.replace(/_/g, " ")}>
                Reason: <strong className="text-zinc-300">{closeReason.replace(/_/g, " ")}</strong>
              </div>
              <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
                <span>Settlement</span>
                <span className="text-cyan-300 font-bold font-mono">Realized</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ Honest Data Provenance Banner: Clarifies Discrete Execution vs Continuous Tape */}
      {!isVerifiedTicks && (
        <div className="mb-2 px-3.5 py-2 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 text-amber-300/90 text-[11px] font-mono flex items-center justify-between gap-2 shadow-sm backdrop-blur-md">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <strong className="text-amber-200">Discrete Execution Anchor:</strong>
            <span className="text-zinc-300 font-sans hidden sm:inline">Path is an illustrative geometric model anchored to verified fill levels. Exchange 1m order book unrecorded.</span>
          </span>
          <span className="text-[9.5px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold shrink-0">
            Geometric Model
          </span>
        </div>
      )}

      {/* 3. Interactive SVG Flight Path Canvas Frame (Apple Vision Pro Cockpit) */}
      <div 
        className="relative rounded-3xl bg-[#04060e]/85 border border-white/[0.08] p-2 sm:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden cursor-crosshair group my-1 select-none touch-none"
        style={{ touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onClick={handleClickCanvas}
        onMouseLeave={handleEndScrub}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleEndScrub}
      >
        {isLoading ? (
          <div className="h-56 flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Streaming intraday trade lifecycle candles...</span>
          </div>
        ) : allPoints.length < 2 ? (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 my-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-white font-bold text-sm">Flash Order Execution Diagnostic</h4>
            <p className="text-slate-400 text-xs mt-1 max-w-md">
              Order filled at <strong className="text-white">₹{entryPrice.toFixed(2)}</strong> and squared off at <strong className="text-white">₹{exitPrice.toFixed(2)}</strong> ({closeReason.replace(/_/g, " ")}).
              Execution settled within sub-second volatility with zero intermediate ticks.
            </p>
            <div className="mt-3 flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
                Delta: {exitPrice >= entryPrice ? "+" : ""}₹{(exitPrice - entryPrice).toFixed(2)}
              </span>
              <span className={clsx(
                "px-2.5 py-1 rounded-lg font-bold border",
                trade.netPnl >= 0 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-rose-500/15 border-rose-500/30 text-rose-300"
              )}>
                P&amp;L: ₹{Number(trade.netPnl || 0).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          renderSvgCanvas(height)
        )}
      </div>

      {/* Interactive Timeline Slider Scrubber Track (Ergonomic 32px Touch Target with Hairline Track) */}
      {allPoints.length > 1 && (
        <div className="px-2 py-0.5 flex items-center gap-3 font-mono text-[10.5px] text-slate-400 border-t border-white/5 mt-1">
          <span className="tabular-nums shrink-0">{allPoints[0] ? formatTimeShort(allPoints[0].time || allPoints[0].timestamp) : "09:15"}</span>
          <div className="relative flex-1 h-8 flex items-center">
            <input
              type="range"
              min={0}
              max={Math.max(1, allPoints.length - 1)}
              value={replayIndex !== null ? replayIndex : scrubIndex !== null ? scrubIndex : allPoints.length - 1}
              onChange={(e) => {
                const val = Number(e.target.value);
                setIsPlaying(false);
                setReplayIndex(val);
                setScrubIndex(val);
                triggerScrubHaptic();
              }}
              className="w-full h-8 py-3 bg-transparent cursor-ew-resize accent-emerald-400 hover:accent-emerald-300 transition-all touch-none"
            />
          </div>
          <span className="tabular-nums shrink-0">{allPoints[allPoints.length - 1] ? formatTimeShort(allPoints[allPoints.length - 1].time || allPoints[allPoints.length - 1].timestamp) : "15:30"}</span>
        </div>
      )}

      {/* 🧭 Level 3 Elite: Interactive Counterfactual Scrubber Callout with Path-Dependency Invalidation Guard */}
      {scrubTelemetry && (() => {
        const isScrubPostExit = currentActivePoint?.isPostExit || (exitPoint && currentActivePoint?.x > exitPoint.x);
        const isBreachedScrub = isScrubPostExit && isDrawdownBreached && firstBreachPt && (currentActivePoint?.timestamp >= firstBreachPt.timestamp);

        return (
          <div className={clsx(
            "px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono transition-all",
            isBreachedScrub
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx("w-2 h-2 rounded-full animate-pulse", isBreachedScrub ? "bg-rose-400" : "bg-cyan-400")} />
              <span className="text-slate-400">Scrubber Position:</span>
              <strong className="text-white">{scrubTelemetry.timeStr} @ ₹{scrubTelemetry.currentP.toFixed(2)}</strong>
              <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold border", scrubTelemetry.isNetGain ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30")}>
                Yield: {scrubTelemetry.counterfactualNet >= 0 ? "+" : ""}₹{scrubTelemetry.counterfactualNet.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="text-[11px]">
              {isBreachedScrub ? (
                <span className="text-rose-300 font-bold flex items-center gap-1">
                  <span>🛑 Invalidation Breach: Low ₹{Number(firstBreachPt.low ?? firstBreachPt.close).toFixed(1)} breached stop ₹{effectiveStopLoss.toFixed(1)}. Continuation unexecutable.</span>
                </span>
              ) : (
                <div>
                  <span className="text-slate-400">vs Actual Exit: </span>
                  <strong className={clsx("font-bold", scrubTelemetry.counterfactualAlpha >= 0 ? "text-emerald-400" : "text-amber-400")}>
                    {scrubTelemetry.counterfactualAlpha >= 0 ? "+" : ""}₹{scrubTelemetry.counterfactualAlpha.toLocaleString("en-IN")} {scrubTelemetry.counterfactualAlpha >= 0 ? "(Feasible Continuation Drift)" : "(Discipline Edge Saved)"}
                  </strong>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ⌨️ Hotkey Navigation Deck (Apple Spatial Glass Minimalist) */}
      <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[10.5px] font-mono text-zinc-400 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">Space</kbd>
            <span>Play / Pause Replay</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">T</kbd>
            <span>Toggle Scope (Scalp / Expiry)</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">← / →</kbd>
            <span>Prev / Next Trade</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">1 / 2 / 4</kbd>
            <span>Replay Speed</span>
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">Esc</kbd>
          <span>Close Cockpit</span>
        </span>
      </div>

      {/* ⏳ Dedicated Order Lifecycle & Execution Discipline HUD (Start to Expiry Telemetry - Scoped to Expiry Mode Only) */}
      {flightScope === 'expiry' && (
        <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0a1120]/90 to-slate-900/90 border border-cyan-500/25 shadow-lg backdrop-blur-xl relative overflow-hidden font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Start to Expiry Telemetry
              </span>
              <span className="text-xs font-bold text-white">
                {symbol} · Expiry 15:30 IST ({trade.expiryDate || "Active Week"})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Terminal Spot:</span>
              <strong className="text-white font-bold">₹{Number(trade.expirySpot || 24250).toLocaleString("en-IN")}</strong>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Settlement Intrinsic:</span>
              <strong className={clsx("font-bold", trade.terminalIntrinsic > 0 ? "text-emerald-400" : "text-rose-400")}>
                ₹{Number(trade.terminalIntrinsic || 0).toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Box 1: Start (Entry Fill) */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">1. Order Entry (Start)</div>
              <div className="text-sm font-black text-white">₹{entryPrice.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{formatTimeShort(entryTime)} · Fill Completed</div>
            </div>

            {/* Box 2: Scalp Exit */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">2. Realized Exit</div>
              <div className="text-sm font-black text-cyan-300">₹{exitPrice.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{formatTimeShort(exitTime)} · {closeReason.replace(/_/g, " ")}</div>
            </div>

            {/* Box 3: Macro Session Drift (Reframed from toxic Held-to-Expiry P&L) */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">3. Macro Session Drift</div>
              <div className="text-sm font-black text-slate-200">
                ₹{Number(trade.terminalIntrinsic || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>15:30 Settlement</span>
                <span className={clsx("font-bold", Number(trade.heldToExpiryPnl || 0) >= 0 ? "text-slate-300" : "text-slate-400")}>
                  {Number(trade.heldToExpiryPnl || 0) >= 0 ? "+" : ""}₹{Number(trade.heldToExpiryPnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                </span>
              </div>
            </div>

            {/* Box 4: Execution Discipline Delta (Discipline Grade vs FOMO) */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <div className="text-[10px] text-cyan-300 mb-0.5 flex items-center justify-between">
                <span>Execution Discipline</span>
                <span className={clsx("px-1.5 py-0.2 rounded text-[9.5px] font-black border", executionDiscipline.badgeClass)}>
                  {executionDiscipline.grade}
                </span>
              </div>
              <div className="text-sm font-black text-white truncate">
                {executionDiscipline.label}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight line-clamp-1" title={executionDiscipline.detail}>
                {executionDiscipline.detail}
              </div>
            </div>
          </div>

          {/* 🛡️ Execution Integrity & Pain Check Callout (Anti-FOMO Guard) */}
          <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-200/90">
            <span className="text-cyan-400 font-bold shrink-0">🛡️ Anti-FOMO Guard:</span>
            <span className="leading-tight">
              Planned scalp target and stop boundaries were executed to plan. Post-exit terminal drift reflects late afternoon gamma/theta decay, not missed profit.
            </span>
          </div>
        </div>
      )}

      {/* 4. Level 3 Post-Mortem Analytics Bento Deck */}
      <div className="mt-3.5 space-y-3.5 font-mono">
        {/* Hero Bento Bar: 💡 Mark Douglas Discipline & Rule Audit (Promoted to Hero) */}
        <div className={clsx(
          "p-4 sm:p-5 rounded-3xl border backdrop-blur-2xl relative overflow-hidden transition-all",
          isPeakGiveback 
            ? "bg-gradient-to-r from-rose-950/40 via-[#0e060a]/90 to-rose-950/20 border-rose-500/35 shadow-[inset_0_1px_0_rgba(244,63,94,0.2),0_15px_35px_-10px_rgba(244,63,94,0.15)]" 
            : isTargetHit 
            ? "bg-gradient-to-r from-emerald-950/40 via-[#050e09]/90 to-emerald-950/20 border-emerald-500/35 shadow-[inset_0_1px_0_rgba(16,185,129,0.2),0_15px_35px_-10px_rgba(16,185,129,0.15)]" 
            : "bg-gradient-to-r from-slate-900/60 via-[#070910]/90 to-slate-900/40 border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_15px_35px_-10px_rgba(0,0,0,0.6)]"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3 mb-3">
            <div className="flex items-center gap-2">
              {isPeakGiveback ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-rose-300 font-black text-xs sm:text-sm">Peak Giveback Detected</span>
                </>
              ) : isTargetHit ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-black text-xs sm:text-sm">Clean Edge Execution</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-cyan-300 font-black text-xs sm:text-sm">Risk Discipline Audit</span>
                </>
              )}
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-1.5 ml-1">
                <BookOpen className="w-3 h-3 text-cyan-400" />
                <span>Mark Douglas Rule</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 font-sans">
              <span>Execution Mindset:</span>
              <strong className="text-white font-mono px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15">
                {mindsetEmotion || (isTargetHit ? "Disciplined Execution" : "Controlled Exit")}
              </strong>
            </div>
          </div>

          <p className="text-[12.5px] text-zinc-300 leading-relaxed font-sans">
            {isPeakGiveback ? (
              <span>
                Market expanded to <strong className="text-white font-bold font-mono">₹{peakPrice.toFixed(1)} (+{peakPts.toFixed(1)} pts)</strong> but reversed into Stop Loss. <strong className="text-rose-300 font-bold">Mark Douglas Invariant:</strong> Once price reaches 1:1 R:R, ratchet stop loss to Breakeven (+0 pts) to eliminate capital risk before market structure breaks.
              </span>
            ) : isTargetHit ? (
              <span>
                Target captured with minimal adverse stress (<strong className="text-emerald-300 font-mono">-{drawdownPts.toFixed(1)} pts MAE</strong>). Smooth expansion from entry to exit with zero hesitation. The trader accepts the risk before entry and lets the probability distribution play out.
              </span>
            ) : (
              <span>
                Stop loss cut cleanly at predefined threshold. Capital preserved for next probability edge without revenge trading or averaging down. Every loss is simply a cost of doing business.
              </span>
            )}
          </p>
        </div>

        {/* 2-Column Balanced Deck: MFE & MAE Excursions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: 🏆 Max Favorable Excursion (Peak Opportunity) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-emerald-500/[0.08] via-[#060a12]/80 to-black/90 border border-emerald-500/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(16,185,129,0.25),0_15px_35px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.08] rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Max Favorable Excursion</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-black border border-emerald-500/25 tabular-nums">
                  MFE
                </span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums tracking-tight mt-1">
                ₹{peakPrice.toFixed(2)}
              </div>
              <p className="text-[11.5px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
                <span className="text-emerald-400 font-bold">+{peakPts.toFixed(2)} pts</span>
                <span className="text-zinc-400 text-[10.5px]">
                  Peak Gain: <strong className="text-emerald-300 font-mono">{peakPts > 0 ? `+₹${peakRupees.toFixed(2)}` : "₹0.00"}</strong>
                </span>
              </p>
            </div>

            {/* Progress Bar: Target Efficiency */}
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-[10.5px] text-zinc-400 mb-1.5">
                <span>Target Capture Efficiency</span>
                <strong className="text-emerald-300 font-mono tabular-nums">{mfeTargetEfficiencyPct}%</strong>
              </div>
              <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${Math.min(100, Math.max(0, mfeTargetEfficiencyPct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: 📉 Max Adverse Excursion (Stress Level) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-rose-500/[0.08] via-[#0a060e]/80 to-black/90 border border-rose-500/25 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(244,63,94,0.25),0_15px_35px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col justify-between group hover:border-rose-500/40 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.08] rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                <span className="flex items-center gap-2 text-rose-400 font-bold">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>Max Adverse Excursion</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-black border border-rose-500/25 tabular-nums">
                  MAE
                </span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums tracking-tight mt-1">
                ₹{troughPrice.toFixed(2)}
              </div>
              <p className="text-[11.5px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
                <span className="text-rose-400 font-bold">-{drawdownPts.toFixed(2)} pts</span>
                <span className="text-zinc-400 text-[10.5px]">
                  Deepest Heat: <strong className="text-rose-300 font-mono">{drawdownPts > 0 ? `-₹${drawdownRupees.toFixed(2)}` : "₹0.00"}</strong>
                </span>
              </p>
            </div>

            {/* Progress Bar: Risk Consumption */}
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-[10.5px] text-zinc-400 mb-1.5">
                <span>Stop Cushion Consumed</span>
                <strong className={clsx("font-mono tabular-nums", maeRiskConsumedPct > 75 ? "text-rose-400" : "text-amber-300")}>
                  {maeRiskConsumedPct}%
                </strong>
              </div>
              <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    maeRiskConsumedPct > 75 
                      ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                      : "bg-gradient-to-r from-zinc-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, maeRiskConsumedPct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-4 font-sans text-xs pt-3">
          {/* Trade Journal & Post-Mortem Audit Tab (Apple Spatial Luxury Bento) */}
        {/* Top Metric Cards: Key Execution Levels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Entry Price</span>
            <strong className="text-base sm:text-lg font-black text-white tabular-nums tracking-tight">₹{entryPrice.toFixed(2)}</strong>
            <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Filled @ {formatTimeShort(entryTime)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Exit Price</span>
            <strong className={clsx("text-base sm:text-lg font-black tabular-nums tracking-tight", exitPrice >= entryPrice ? "text-emerald-400" : "text-rose-400")}>
              ₹{exitPrice.toFixed(2)}
            </strong>
            <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Closed @ {formatTimeShort(exitTime)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Friction Breakeven (BE)</span>
            <strong className="text-base sm:text-lg font-black text-amber-300 tabular-nums tracking-tight">₹{netZeroPrice.toFixed(2)}</strong>
            <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Charges: ₹{charges.toFixed(2)} (+{frictionPerUnit.toFixed(2)} pts)</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Stop Loss (SL)</span>
            <strong className="text-base sm:text-lg font-black text-rose-400 tabular-nums tracking-tight">{stopLoss ? `₹${stopLoss.toFixed(2)}` : "None"}</strong>
            <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Cushion: {stopLoss ? `-${Math.abs(entryPrice - stopLoss).toFixed(2)} pts` : "N/A"}</p>
          </div>
        </div>

        {/* Core Narrative: Catalyst & Execution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.05] via-[#060812]/80 to-black/90 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span>Trade Catalyst &amp; Setup Logic</span>
            </h4>
            <p className="text-zinc-300 leading-relaxed text-[12.5px] font-sans">
              {catalyst || "Execution triggered by systematic strategy rule. Monitored momentum continuation with tight risk gating."}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.05] via-[#060812]/80 to-black/90 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span>Execution Details</span>
            </h4>
            <p className="text-zinc-300 leading-relaxed text-[12.5px] font-sans">
              {executionDetails || `Entry filled at ₹${entryPrice.toFixed(2)}. Position squared off at ₹${exitPrice.toFixed(2)} upon trigger of ${closeReason.replace(/_/g, " ")}.`}
            </p>
          </div>
        </div>

        {/* Psychology, Lessons & Compliance Bento Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-gradient-to-b from-purple-500/[0.05] via-[#0a0614]/80 to-black/90 border border-purple-500/20 shadow-[inset_0_1px_0_rgba(168,85,247,0.15),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Mindset &amp; Emotion</span>
              </h4>
              <div className="inline-block px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold mb-2 shadow-sm">
                {mindsetEmotion || "Disciplined & Patient"}
              </div>
              <p className="text-zinc-400 text-[11.5px] leading-relaxed font-sans">
                Trader maintained emotional detachment and adhered to position sizing limits per Mark Douglas principles.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-b from-cyan-500/[0.05] via-[#060a14]/80 to-black/90 border border-cyan-500/20 shadow-[inset_0_1px_0_rgba(6,182,212,0.15),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Lessons Learned</span>
              </h4>
              <p className="text-zinc-300 text-[12px] leading-relaxed font-sans">
                {lessonsLearned || (isPeakGiveback 
                  ? "Move stop loss to breakeven once price travels 1R in favor to eliminate risk." 
                  : "Stick to predefined probability setups without hesitation.")}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-b from-emerald-500/[0.05] via-[#050a0a]/80 to-black/90 border border-emerald-500/20 shadow-[inset_0_1px_0_rgba(16,185,129,0.15),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Plan Compliance &amp; Conviction</span>
              </h4>
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx(
                  "px-2.5 py-1 rounded-xl font-mono font-bold text-xs border shadow-sm",
                  followedPlan !== false ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                )}>
                  {followedPlan !== false ? "Plan Followed 100%" : "Plan Deviated"}
                </span>
                <span className="text-zinc-400 font-mono text-xs">
                  Conviction: <strong className="text-white">{confidenceScore ? `${confidenceScore}/10` : "8/10"}</strong>
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Trade strictly conformed to intraday rules and system sizing.
              </p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
