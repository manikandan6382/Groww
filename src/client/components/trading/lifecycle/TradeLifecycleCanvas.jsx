import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeTrade } from "../../../utils/tradeNormalizer";
import { calculateSplinePath, calculateAreaPath } from "./lifecycleSplineEngine";
import { calculateLifecycleCoordinates } from "./lifecycleCoordinates";
import { useLifecycleCandles } from "./useLifecycleCandles";
import { useLifecycleScrubber } from "./useLifecycleScrubber";
import { LifecycleHeader } from "./LifecycleHeader";
import { LifecycleSvgDefs } from "./LifecycleSvgDefs";
import { LifecycleSvgLevels } from "./LifecycleSvgLevels";
import { LifecycleSvgCurves } from "./LifecycleSvgCurves";
import { LifecycleMetricsFooter } from "./LifecycleMetricsFooter";

export function TradeLifecycleCanvas({ trade: rawTrade }) {
  const trade = useMemo(() => normalizeTrade(rawTrade), [rawTrade]);
  const reactId = useId();
  const profitAreaGradId = `profitAreaGrad_${reactId.replace(/:/g, "_")}`;
  const lossAreaGradId = `lossAreaGrad_${reactId.replace(/:/g, "_")}`;
  const pathStrokeGradId = `pathStrokeGrad_${reactId.replace(/:/g, "_")}`;

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBenchmark, setShowBenchmark] = useState(false);

  const {
    symbol, entryPrice, exitPrice, targetPrice, stopLoss,
    entryTime, exitTime, closeReason, direction, totalQty, charges
  } = trade;

  const isShort = direction === "SHORT";
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = isShort ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;
  const isTrailed = (closeReason || "").includes("TRAIL") || (closeReason || "").includes("BE") || 
    (stopLoss !== null && exitPrice > stopLoss && exitPrice <= entryPrice * 1.05 && (closeReason || "").includes("STOP"));

  const { candleData, isLoading } = useLifecycleCandles(trade);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect?.width > 0) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = containerWidth < 580;
  const height = isMobile ? 210 : 235;
  const padding = { top: 32, bottom: 28, left: isMobile ? 12 : 16, right: isMobile ? 16 : 90 };
  const graphWidth = Math.max(160, containerWidth - padding.left - padding.right);
  const graphHeight = height - padding.top - padding.bottom;

  const candles = candleData?.candles || [];
  const source = candleData?.source || "interpolated";
  const underlying = candleData?.underlying || null;

  const coords = useMemo(() => calculateLifecycleCoordinates({
    candles, entryPrice, exitPrice, targetPrice, stopLoss, netZeroPrice,
    underlying, graphWidth, graphHeight, padding
  }), [candles, entryPrice, exitPrice, targetPrice, stopLoss, netZeroPrice, underlying, graphWidth, graphHeight, padding.top, padding.left]);

  const { points, entryY, netZeroY, targetY, stopY, exitY, peakPoint, underlyingPoints } = coords;
  const splinePath = useMemo(() => calculateSplinePath(points), [points]);
  const underlyingPath = useMemo(() => calculateSplinePath(underlyingPoints), [underlyingPoints]);
  const areaPath = useMemo(() => calculateAreaPath(splinePath, points, entryY), [splinePath, points, entryY]);

  const {
    activePoint, scrubTelemetry, handleMouseMove, handleTouch, handleEndScrub
  } = useLifecycleScrubber({
    points, graphWidth, paddingLeft: padding.left, containerRef,
    isShort, entryPrice, targetPrice, stopLoss, netZeroPrice, totalQty
  });

  const targetDeltaPts = targetPrice ? Number(Math.abs(targetPrice - entryPrice).toFixed(2)) : null;
  const targetDeltaPct = targetPrice && entryPrice > 0 ? ((targetDeltaPts / entryPrice) * 100).toFixed(1) : null;
  const stopDeltaPts = stopLoss ? Number(Math.abs(entryPrice - stopLoss).toFixed(2)) : null;
  const stopDeltaPct = stopLoss && entryPrice > 0 ? ((stopDeltaPts / entryPrice) * 100).toFixed(1) : null;

  return (
    <div ref={containerRef} className="mt-3.5 pt-3.5 border-t border-white/10 rounded-2xl bg-[#0d0f14]/85 backdrop-blur-2xl border border-white/[0.07] shadow-[0_16px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden select-none">
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <LifecycleHeader
        closeReason={closeReason} source={source} underlying={underlying} showBenchmark={showBenchmark} setShowBenchmark={setShowBenchmark}
        scrubTelemetry={scrubTelemetry} netZeroPrice={netZeroPrice} entryPrice={entryPrice} targetPrice={targetPrice} stopLoss={stopLoss}
        entryTime={entryTime} exitTime={exitTime} isExpanded={isExpanded} setIsExpanded={setIsExpanded}
      />

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="px-2 sm:px-4 pt-2 pb-3">
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
              <div className="relative select-none cursor-crosshair touch-none" style={{ touchAction: "none" }} onMouseMove={handleMouseMove} onMouseLeave={handleEndScrub} onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={handleEndScrub}>
                <svg width={containerWidth} height={height} className="overflow-visible block w-full">
                  <LifecycleSvgDefs profitAreaGradId={profitAreaGradId} lossAreaGradId={lossAreaGradId} pathStrokeGradId={pathStrokeGradId} exitPrice={exitPrice} entryPrice={entryPrice} />
                  <LifecycleSvgLevels targetPrice={targetPrice} targetY={targetY} entryPrice={entryPrice} entryY={entryY} netZeroPrice={netZeroPrice} netZeroY={netZeroY} stopLoss={stopLoss} stopY={stopY} exitY={exitY} isTrailed={isTrailed} isMobile={isMobile} padding={padding} graphWidth={graphWidth} />
                  <LifecycleSvgCurves areaPath={areaPath} profitAreaGradId={profitAreaGradId} showBenchmark={showBenchmark} underlyingPath={underlyingPath} underlyingPoints={underlyingPoints} underlying={underlying} splinePath={splinePath} pathStrokeGradId={pathStrokeGradId} points={points} entryPrice={entryPrice} exitPrice={exitPrice} peakPoint={peakPoint} activePoint={activePoint} containerWidth={containerWidth} height={height} padding={padding} graphWidth={graphWidth} />
                </svg>
              </div>
            )}
            <LifecycleMetricsFooter targetPrice={targetPrice} targetDeltaPts={targetDeltaPts} targetDeltaPct={targetDeltaPct} entryPrice={entryPrice} netZeroPrice={netZeroPrice} stopLoss={stopLoss} stopDeltaPts={stopDeltaPts} stopDeltaPct={stopDeltaPct} candleData={candleData} underlying={underlying} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
