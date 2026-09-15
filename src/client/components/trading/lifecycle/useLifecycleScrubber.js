import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { triggerScrubHaptic } from "./lifecycleSplineEngine";
import { formatTimeShort } from "../../../utils/tradeNormalizer";

export function useLifecycleScrubber({
  points,
  graphWidth,
  paddingLeft,
  containerRef,
  isShort,
  entryPrice,
  targetPrice,
  stopLoss,
  netZeroPrice,
  totalQty
}) {
  const [scrubIndex, setScrubIndex] = useState(null);
  const rAFRef = useRef(null);
  const pendingClientX = useRef(null);

  useEffect(() => {
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
      }
    };
  }, []);

  const flushScrub = useCallback(() => {
    rAFRef.current = null;
    if (pendingClientX.current === null || !points.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = pendingClientX.current - rect.left - paddingLeft;
    const ratio = Math.max(0, Math.min(1, mouseX / graphWidth));
    const index = Math.round(ratio * (points.length - 1));
    setScrubIndex((prev) => {
      if (prev !== index) {
        triggerScrubHaptic();
      }
      return index;
    });
  }, [points, graphWidth, paddingLeft, containerRef]);

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

  return {
    scrubIndex,
    activePoint,
    scrubTelemetry,
    handleMouseMove,
    handleTouch,
    handleEndScrub
  };
}
