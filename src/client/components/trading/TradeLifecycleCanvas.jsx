import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Layers,
  ChevronDown,
  ChevronUp,
  Scale
} from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../utils/soundEngine";
import { normalizeTrade, formatTimeShort } from "../../utils/tradeNormalizer";

// Module-level client cache with 10-minute sliding TTL (TDZ Compliance)
const clientCandleCache = new Map();
const CLIENT_CACHE_TTL = 10 * 60 * 1000;
let lastScrubAudioTime = 0;

// Throttled audio tick feedback for tactile scrub feel
function triggerScrubHaptic() {
  const now = Date.now();
  if (now - lastScrubAudioTime > 45) {
    lastScrubAudioTime = now;
    if (typeof soundEngine?.playScrub === "function") {
      soundEngine.playScrub();
    }
  }
}

// Silky cubic-bezier spline interpolation
function calculateSplinePath(points) {
  if (!points || points.length < 2) return "";
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

export function TradeLifecycleCanvas({ trade: rawTrade }) {
  const trade = useMemo(() => normalizeTrade(rawTrade), [rawTrade]);

  // Scoped SVG def IDs to eliminate DOM namespace collisions
  const reactId = useId();
  const profitAreaGradId = `profitAreaGrad_${reactId.replace(/:/g, "_")}`;
  const lossAreaGradId = `lossAreaGrad_${reactId.replace(/:/g, "_")}`;
  const pathStrokeGradId = `pathStrokeGrad_${reactId.replace(/:/g, "_")}`;

  const containerRef = useRef(null);
  const rAFRef = useRef(null);
  const pendingClientX = useRef(null);

  const [containerWidth, setContainerWidth] = useState(800);
  const [candleData, setCandleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBenchmark, setShowBenchmark] = useState(false);

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
    charges
  } = trade;

  const isShort = direction === "SHORT";

  // Friction Drag Breakeven Calculation
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = isShort ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;

  // Trailing Stop Loss Logic
  const isTrailed = closeReason.includes("TRAIL") || closeReason.includes("BE") || 
    (stopLoss !== null && exitPrice > stopLoss && exitPrice <= entryPrice * 1.05 && closeReason.includes("STOP"));

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

  // Dual-Cache Accelerated Fetch with 10-Minute Sliding TTL & Transient Eviction
  useEffect(() => {
    const cacheKey = `${trade?.tokenKey || symbol}_${entryTime}_${exitTime}_${entryPrice}_${exitPrice}`;
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
      closeReason,
    });
    if (targetPrice) params.set("targetPrice", String(targetPrice));
    if (stopLoss) params.set("stopLoss", String(stopLoss));
    if (entryTime) params.set("from", entryTime);
    if (exitTime) params.set("to", exitTime);
    if (trade?.tokenKey) params.set("tokenKey", trade.tokenKey);

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
  }, [symbol, entryPrice, exitPrice, targetPrice, stopLoss, entryTime, exitTime, closeReason, trade?.tokenKey]);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, []);

  // Responsive mobile vs desktop padding
  const isMobile = containerWidth < 580;
  const height = isMobile ? 210 : 235;
  const padding = { 
    top: 32, 
    bottom: 28, 
    left: isMobile ? 12 : 16, 
    right: isMobile ? 16 : 90 
  };
  const graphWidth = Math.max(160, containerWidth - padding.left - padding.right);
  const graphHeight = height - padding.top - padding.bottom;

  const candles = candleData?.candles || [];
  const source = candleData?.source || "interpolated";
  const underlying = candleData?.underlying || null;

  const { points, minVal, maxVal, entryY, netZeroY, targetY, stopY, exitY, peakPoint, troughPoint, underlyingPoints } = useMemo(() => {
    if (!candles.length) {
      return {
        points: [],
        minVal: entryPrice * 0.95,
        maxVal: entryPrice * 1.05,
        entryY: 0,
        netZeroY: 0,
        targetY: null,
        stopY: null,
        exitY: 0,
        peakPoint: null,
        troughPoint: null,
        underlyingPoints: []
      };
    }

    const prices = candles.map((c) => c.close);
    prices.push(entryPrice, exitPrice, netZeroPrice);
    if (targetPrice) prices.push(targetPrice);
    if (stopLoss) prices.push(stopLoss);

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const range = rawMax - rawMin || 1;
    const minVal = rawMin - range * 0.08;
    const maxVal = rawMax + range * 0.08;

    const scaleY = (p) => padding.top + (1 - (p - minVal) / (maxVal - minVal)) * graphHeight;

    const pts = candles.map((c, i) => {
      const x = padding.left + (i / (candles.length - 1 || 1)) * graphWidth;
      const y = scaleY(c.close);
      return { ...c, x, y };
    });

    let peak = pts[0];
    let trough = pts[0];
    pts.forEach((pt) => {
      if (pt.close > peak.close) peak = pt;
      if (pt.close < trough.close) trough = pt;
    });

    // Normalized Underlying Index Overlay (Scaled to middle 60% of canvas)
    let uPts = [];
    if (underlying?.candles?.length >= 2) {
      const uCandles = underlying.candles;
      const uPrices = uCandles.map(c => c.close);
      const uMin = Math.min(...uPrices);
      const uMax = Math.max(...uPrices);
      const uRange = uMax - uMin || 1;
      const uTop = padding.top + graphHeight * 0.15;
      const uHeight = graphHeight * 0.7;

      uPts = uCandles.map((c, i) => {
        const x = padding.left + (i / (uCandles.length - 1 || 1)) * graphWidth;
        const norm = (c.close - uMin) / uRange;
        const y = uTop + (1 - norm) * uHeight;
        return { ...c, x, y };
      });
    }

    return {
      points: pts,
      minVal,
      maxVal,
      entryY: scaleY(entryPrice),
      netZeroY: scaleY(netZeroPrice),
      targetY: targetPrice ? scaleY(targetPrice) : null,
      stopY: stopLoss ? scaleY(stopLoss) : null,
      exitY: scaleY(exitPrice),
      peakPoint: peak,
      troughPoint: trough,
      underlyingPoints: uPts
    };
  }, [candles, entryPrice, exitPrice, targetPrice, stopLoss, netZeroPrice, underlying, graphWidth, graphHeight, padding.top, padding.left]);

  const splinePath = useMemo(() => calculateSplinePath(points), [points]);
  const underlyingPath = useMemo(() => calculateSplinePath(underlyingPoints), [underlyingPoints]);

  // Area under curve anchored to entry line
  const areaPath = useMemo(() => {
    if (!points.length) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${splinePath} L ${last.x.toFixed(1)} ${entryY.toFixed(1)} L ${first.x.toFixed(1)} ${entryY.toFixed(1)} Z`;
  }, [splinePath, points, entryY]);

  // 120Hz rAF-Throttled Cursor Tracker (Zero Main-Thread Frame Drops)
  const flushScrub = useCallback(() => {
    rAFRef.current = null;
    if (pendingClientX.current === null || !points.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = pendingClientX.current - rect.left - padding.left;
    const ratio = Math.max(0, Math.min(1, mouseX / graphWidth));
    const index = Math.round(ratio * (points.length - 1));
    setScrubIndex((prev) => {
      if (prev !== index) {
        triggerScrubHaptic();
      }
      return index;
    });
  }, [points, graphWidth, padding.left]);

  const updateScrubFromClientX = useCallback((clientX) => {
    pendingClientX.current = clientX;
    if (!rAFRef.current) {
      rAFRef.current = requestAnimationFrame(flushScrub);
    }
  }, [flushScrub]);

  const handleMouseMove = (e) => updateScrubFromClientX(e.clientX);

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

  const activePoint = scrubIndex !== null && points[scrubIndex] ? points[scrubIndex] : null;

  // Real-time Scrubbed Telemetry
  const scrubTelemetry = useMemo(() => {
    if (!activePoint) return null;
    const currentP = activePoint.close;
    const ptsDelta = isShort ? entryPrice - currentP : currentP - entryPrice;
    const rupeesDelta = ptsDelta * totalQty;
    const isNetGain = currentP >= netZeroPrice;

    const distToTarget = targetPrice ? Math.abs(targetPrice - currentP) : null;
    const distToStop = stopLoss ? Math.abs(currentP - stopLoss) : null;

    return {
      currentP,
      ptsDelta: Number(ptsDelta.toFixed(2)),
      rupeesDelta: Number(rupeesDelta.toFixed(2)),
      isNetGain,
      distToTarget: distToTarget !== null ? Number(distToTarget.toFixed(2)) : null,
      distToStop: distToStop !== null ? Number(distToStop.toFixed(2)) : null,
      timeStr: formatTimeShort(activePoint.time || activePoint.timestamp)
    };
  }, [activePoint, entryPrice, targetPrice, stopLoss, netZeroPrice, isShort, totalQty]);

  const targetDeltaPts = targetPrice ? Number(Math.abs(targetPrice - entryPrice).toFixed(2)) : null;
  const targetDeltaPct = targetPrice && entryPrice > 0 ? ((targetDeltaPts / entryPrice) * 100).toFixed(1) : null;

  const stopDeltaPts = stopLoss ? Number(Math.abs(entryPrice - stopLoss).toFixed(2)) : null;
  const stopDeltaPct = stopLoss && entryPrice > 0 ? ((stopDeltaPts / entryPrice) * 100).toFixed(1) : null;

  const isTargetHit = closeReason.includes("TARGET");
  const isStopHit = closeReason.includes("STOP");

  return (
    <div 
      ref={containerRef}
      className="mt-3.5 pt-3.5 border-t border-white/10 rounded-2xl bg-[#0d0f14]/85 backdrop-blur-2xl border border-white/[0.07] shadow-[0_16px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden select-none"
    >
      {/* Ambient Lighting Gradients */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar with Header-Docked Scrubbing HUD (Zero Curve Occlusion) */}
      <div className="px-3.5 sm:px-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                TRADE LIFECYCLE TRAJECTORY
              </span>

              <span className={clsx(
                "text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1",
                isTargetHit ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
                isStopHit ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
                "bg-amber-500/15 border-amber-500/30 text-amber-300"
              )}>
                {isTargetHit ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <ShieldAlert className="w-3 h-3" />}
                <span>{closeReason.replace(/_/g, " ")}</span>
              </span>

              <span className={clsx(
                "px-2 py-0.5 rounded-full border text-[9px] uppercase font-mono font-bold",
                source === "upstox" || source === "upstox-micro"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                  : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
              )}>
                {source === "upstox" ? "● Upstox 1m Ticks" : source === "upstox-micro" ? "● Upstox Sub-Minute" : "● Precision Path"}
              </span>

              {/* Underlying NIFTY Correlation Toggle */}
              {underlying && (
                <button
                  type="button"
                  onClick={() => setShowBenchmark(!showBenchmark)}
                  className={clsx(
                    "px-2 py-0.5 rounded-full border text-[9px] uppercase font-mono font-bold flex items-center gap-1 transition cursor-pointer",
                    showBenchmark 
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                  )}
                  title="Toggle Underlying Benchmark Hairline to reveal IV crush or delta divergence"
                >
                  <Activity className="w-2.5 h-2.5 text-amber-400" />
                  <span>{underlying.name}: {underlying.changePts >= 0 ? "+" : ""}{underlying.changePts} ({underlying.changePct >= 0 ? "+" : ""}{underlying.changePct}%)</span>
                  <span className="text-[8px] opacity-70">[{showBenchmark ? "HIDE" : "SHOW"}]</span>
                </button>
              )}
            </div>

            {/* Apple Stocks Docked Scrub Telemetry HUD */}
            <AnimatePresence mode="wait">
              {scrubTelemetry ? (
                <motion.div
                  key="docked-telemetry"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center gap-2 mt-1 text-[11px] font-mono flex-wrap"
                >
                  <span className="text-white font-black bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
                    ₹{scrubTelemetry.currentP.toFixed(2)}
                  </span>
                  <span className={clsx("font-bold", scrubTelemetry.isNetGain ? "text-emerald-400" : "text-rose-400")}>
                    {scrubTelemetry.ptsDelta >= 0 ? "+" : ""}₹{scrubTelemetry.rupeesDelta.toFixed(2)} ({scrubTelemetry.ptsDelta >= 0 ? "+" : ""}{scrubTelemetry.ptsDelta} pts)
                  </span>
                  <span className="text-slate-400 hidden sm:inline">·</span>
                  <span className="text-slate-400 hidden sm:inline">
                    Net Zero Drag: <strong className="text-amber-300">₹{netZeroPrice.toFixed(2)}</strong>
                  </span>
                  {scrubTelemetry.distToTarget !== null && (
                    <>
                      <span className="text-slate-400 hidden sm:inline">·</span>
                      <span className="text-slate-400 hidden sm:inline">
                        TP Buffer: <strong className="text-emerald-300">₹{scrubTelemetry.distToTarget}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-400">@{scrubTelemetry.timeStr} IST</span>
                </motion.div>
              ) : (
                <motion.p
                  key="default-telemetry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="text-[11px] text-slate-400 font-mono mt-0.5 truncate"
                >
                  {stopLoss ? `SL: ₹${stopLoss.toFixed(2)} ➔ ` : ""}EP: ₹{entryPrice.toFixed(2)} ➔ True BE: ₹{netZeroPrice.toFixed(2)}{targetPrice ? ` ➔ TP: ₹${targetPrice.toFixed(2)}` : ""}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Status Tags */}
        <div className="flex items-center gap-2 font-mono text-[10.5px] self-start sm:self-auto shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{formatTimeShort(entryTime)} ➔ {formatTimeShort(exitTime)}</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10.5px] transition cursor-pointer flex items-center gap-1"
            title={isExpanded ? "Collapse View" : "Expand View"}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-2 sm:px-4 pt-2 pb-3"
          >
            {isLoading ? (
              <div className="h-44 flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Streaming intraday trade lifecycle candles...</span>
              </div>
            ) : points.length < 2 ? (
              <div className="h-44 flex items-center justify-center text-xs font-mono text-slate-400">
                <span>Insufficient timeline data to chart trade lifecycle.</span>
              </div>
            ) : (
              <div 
                className="relative select-none cursor-crosshair touch-none"
                style={{ touchAction: "none" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleEndScrub}
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                onTouchEnd={handleEndScrub}
              >
                <svg
                  width={containerWidth}
                  height={height}
                  className="overflow-visible block w-full"
                >
                  <defs>
                    <linearGradient id={profitAreaGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id={lossAreaGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.25" />
                    </linearGradient>

                    <linearGradient id={pathStrokeGradId} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="60%" stopColor={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} />
                      <stop offset="100%" stopColor={exitPrice >= entryPrice ? "#34d399" : "#fb7185"} />
                    </linearGradient>
                  </defs>

                  {/* 🟢 1. TARGET PRICE LEVEL (Rendered ONLY if genuine target set) */}
                  {targetPrice !== null && targetY !== null && (
                    <g className="transition-all duration-300">
                      <rect
                        x={padding.left}
                        y={Math.min(targetY, entryY)}
                        width={graphWidth}
                        height={Math.abs(targetY - entryY)}
                        fill="rgba(16, 185, 129, 0.025)"
                      />
                      <line
                        x1={padding.left}
                        y1={targetY}
                        x2={padding.left + graphWidth}
                        y2={targetY}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                        strokeOpacity="0.85"
                      />
                      {!isMobile ? (
                        <g transform={`translate(${padding.left + graphWidth + 6}, ${targetY - 10})`}>
                          <rect width="84" height="20" rx="6" fill="#064e3b" stroke="#10b981" strokeOpacity="0.5" />
                          <text x="6" y="14" fill="#a7f3d0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                            TP ₹{targetPrice.toFixed(1)}
                          </text>
                        </g>
                      ) : (
                        <text x={padding.left + 4} y={targetY - 4} fill="#a7f3d0" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                          TP ₹{targetPrice.toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}

                  {/* ⚖️ 2. FRICTION-ADJUSTED TRUE BREAKEVEN LINE */}
                  {netZeroY > 0 && Math.abs(netZeroY - entryY) > 2 && (
                    <g className="transition-all duration-300 opacity-80">
                      <line
                        x1={padding.left}
                        y1={netZeroY}
                        x2={padding.left + graphWidth}
                        y2={netZeroY}
                        stroke="#f59e0b"
                        strokeDasharray="2 3"
                        strokeWidth="1.2"
                      />
                      {!isMobile && (
                        <g transform={`translate(${padding.left + graphWidth + 6}, ${netZeroY - 10})`}>
                          <rect width="84" height="18" rx="5" fill="#451a03" stroke="#f59e0b" strokeOpacity="0.4" />
                          <text x="6" y="12.5" fill="#fde68a" fontSize="8.5" fontFamily="monospace">
                            BE ₹{netZeroPrice.toFixed(1)}
                          </text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* 🔵 3. ENTRY PRICE BASELINE */}
                  <g className="transition-all duration-300">
                    <line
                      x1={padding.left}
                      y1={entryY}
                      x2={padding.left + graphWidth}
                      y2={entryY}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeOpacity="0.8"
                    />
                    {!isMobile ? (
                      <g transform={`translate(${padding.left + graphWidth + 6}, ${entryY - 10})`}>
                        <rect width="84" height="20" rx="6" fill="#164e63" stroke="#06b6d4" strokeOpacity="0.5" />
                        <text x="6" y="14" fill="#cffafe" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                          EP ₹{entryPrice.toFixed(1)}
                        </text>
                      </g>
                    ) : (
                      <text x={padding.left + 4} y={entryY - 4} fill="#cffafe" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                        EP ₹{entryPrice.toFixed(1)}
                      </text>
                    )}
                  </g>

                  {/* 🔴 4. STOP LOSS LEVEL (Rendered ONLY if genuine stop loss set) */}
                  {stopLoss !== null && stopY !== null && (
                    <g className="transition-all duration-300">
                      {isTrailed ? (
                        // Trailing Stop Loss Step Path
                        <path
                          d={`M ${padding.left} ${stopY} L ${padding.left + graphWidth * 0.5} ${stopY} L ${padding.left + graphWidth * 0.5} ${exitY} L ${padding.left + graphWidth} ${exitY}`}
                          fill="none"
                          stroke="#f43f5e"
                          strokeDasharray="4 4"
                          strokeWidth="1.6"
                          strokeOpacity="0.9"
                        />
                      ) : (
                        <line
                          x1={padding.left}
                          y1={stopY}
                          x2={padding.left + graphWidth}
                          y2={stopY}
                          stroke="#f43f5e"
                          strokeDasharray="4 4"
                          strokeWidth="1.5"
                          strokeOpacity="0.85"
                        />
                      )}

                      {!isMobile ? (
                        <g transform={`translate(${padding.left + graphWidth + 6}, ${stopY - 10})`}>
                          <rect width="84" height="20" rx="6" fill="#881337" stroke="#f43f5e" strokeOpacity="0.5" />
                          <text x="6" y="14" fill="#fecdd3" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                            SL ₹{stopLoss.toFixed(1)}
                          </text>
                        </g>
                      ) : (
                        <text x={padding.left + 4} y={stopY + 12} fill="#fecdd3" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                          SL ₹{stopLoss.toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Volumetric Floating Profit Area */}
                  <path d={areaPath} fill={`url(#${profitAreaGradId})`} />

                  {/* 📉 5. OPTIONAL UNDERLYING NIFTY BENCHMARK HAIRLINE */}
                  {showBenchmark && underlyingPath && (
                    <g className="transition-all duration-300 opacity-60">
                      <path
                        d={underlyingPath}
                        fill="none"
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                      {underlyingPoints[0] && (
                        <text x={underlyingPoints[0].x} y={underlyingPoints[0].y - 6} fill="#fde68a" fontSize="8" fontFamily="monospace">
                          {underlying.name} Trajectory
                        </text>
                      )}
                    </g>
                  )}

                  {/* 🌊 Market Price Path */}
                  <path
                    d={splinePath}
                    fill="none"
                    stroke={`url(#${pathStrokeGradId})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 📍 Entry Pin Anchor */}
                  {points[0] && (
                    <g transform={`translate(${points[0].x}, ${points[0].y})`}>
                      <circle r="8" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" />
                      <circle r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="-4" y="-12" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        ENTRY
                      </text>
                    </g>
                  )}

                  {/* 📍 Exit Pin Anchor */}
                  {points[points.length - 1] && (
                    <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
                      <circle 
                        r="8" 
                        fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} 
                        fillOpacity="0.2" 
                        className="animate-ping" 
                      />
                      <circle 
                        r="4.5" 
                        fill={exitPrice >= entryPrice ? "#10b981" : "#f43f5e"} 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                      />
                      <text 
                        x="-14" 
                        y="18" 
                        fill={exitPrice >= entryPrice ? "#34d399" : "#fb7185"} 
                        fontSize="9" 
                        fontFamily="monospace" 
                        fontWeight="bold"
                      >
                        EXIT
                      </text>
                    </g>
                  )}

                  {/* 🌟 Peak Excursion Marker (MFE) */}
                  {peakPoint && peakPoint.close > entryPrice + 0.5 && (
                    <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
                      <circle r="2.5" fill="#34d399" />
                      <text x="-12" y="-8" fill="#a7f3d0" fontSize="8" fontFamily="monospace">
                        High: ₹{peakPoint.close.toFixed(1)}
                      </text>
                    </g>
                  )}

                  {/* ⚡ Laser Scrubber Reticle with Auto Y-Flipping Badge */}
                  {activePoint && (
                    <g>
                      <line
                        x1={activePoint.x}
                        y1={padding.top}
                        x2={activePoint.x}
                        y2={height - padding.bottom}
                        stroke="#38bdf8"
                        strokeDasharray="2 2"
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="5"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="shadow-lg"
                      />

                      {/* Small Non-Occluding Bead Badge */}
                      <g transform={`translate(${Math.max(10, Math.min(activePoint.x - 30, containerWidth - 70))}, ${activePoint.y > 60 ? activePoint.y - 24 : activePoint.y + 12})`}>
                        <rect width="60" height="16" rx="4" fill="#030712" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="1" />
                        <text x="30" y="11.5" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                          ₹{activePoint.close.toFixed(1)}
                        </text>
                      </g>
                    </g>
                  )}

                  {/* X-Axis Timeline Labels (IST) */}
                  {points.length > 0 && (
                    <g className="text-slate-400 text-[9px] font-mono" fill="#94a3b8">
                      <text x={padding.left} y={height - 8} textAnchor="start">
                        {formatTimeShort(points[0].time || points[0].timestamp)}
                      </text>
                      {points[Math.floor(points.length / 2)] && (
                        <text x={points[Math.floor(points.length / 2)].x} y={height - 8} textAnchor="middle">
                          {formatTimeShort(points[Math.floor(points.length / 2)].time || points[Math.floor(points.length / 2)].timestamp)}
                        </text>
                      )}
                      <text x={padding.left + graphWidth} y={height - 8} textAnchor="end">
                        {formatTimeShort(points[points.length - 1].time || points[points.length - 1].timestamp)}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            )}

            {/* Quick Metrics Footer */}
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-3 text-[10.5px] font-mono text-slate-400 flex-wrap">
              <div className="flex items-center gap-3">
                {targetPrice !== null && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Target: +₹{targetDeltaPts} ({targetDeltaPct}%)</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Entry: ₹{entryPrice.toFixed(2)}</span>
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>True BE: ₹{netZeroPrice.toFixed(2)}</span>
                </span>
                {stopLoss !== null && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Risk: -₹{stopDeltaPts} ({stopDeltaPct}%)</span>
                  </span>
                )}
              </div>

              {candleData?.mfe !== undefined && (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">Excursions:</span>
                  <span className="text-emerald-400 font-bold">MFE +{candleData.mfe} pts</span>
                  <span className="text-rose-400 font-bold">MAE -{candleData.mae} pts</span>
                  {underlying && (
                    <span className="text-amber-400 font-bold hidden sm:inline">
                      ({underlying.name} {underlying.changePct >= 0 ? "+" : ""}{underlying.changePct}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
