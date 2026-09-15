import { useMemo } from 'react';
import { aggregateCandlesForDisplay, calculateSplinePath } from './flightSplineUtils';
import { computeTimelinePoints } from './timelineCoordHelpers';

export function useTimelineCoordinates({
  candleData,
  containerWidth,
  trade,
  flightScope,
  replayIndex
}) {
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

  const displayCandles = useMemo(() => aggregateCandlesForDisplay(rawCandles, isMobile ? 55 : 85), [rawCandles, isMobile]);

  const entryPrice = Math.max(0.1, Number(trade?.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade?.exitPrice || entryPrice));
  const targetPrice = trade?.targetPrice ? Math.max(0.1, Number(trade.targetPrice)) : null;
  const stopLoss = trade?.stopLoss ? Math.max(0.1, Number(trade.stopLoss)) : null;
  const isShort = trade?.direction === 'SHORT';
  const totalQty = Number(trade?.quantity || trade?.qty || 1);
  const charges = Number(trade?.charges || trade?.tax || 0);
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = isShort ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;
  const riskPerShare = stopLoss ? Math.abs(entryPrice - stopLoss) : entryPrice * 0.05;
  const oneRTargetPrice = isShort ? entryPrice - riskPerShare : entryPrice + riskPerShare;
  const exitTime = trade?.exitDatetime || trade?.closedAt;

  const coords = useMemo(() => {
    if (!displayCandles.length) {
      return {
        allPoints: [], exitPoint: null, minVal: entryPrice * 0.95, maxVal: entryPrice * 1.05,
        entryY: 0, netZeroY: 0, targetY: null, stopY: null, exitY: 0, oneRY: null,
        peakPoint: null, troughPoint: null, maxVolume: 1, scaleY: () => 0
      };
    }

    const prices = displayCandles.map((c) => c.close ?? c.price);
    prices.push(entryPrice, exitPrice, netZeroPrice, oneRTargetPrice);
    if (targetPrice) prices.push(targetPrice);
    if (stopLoss) prices.push(stopLoss);

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const range = (rawMax - rawMin) > 0.05 ? rawMax - rawMin : 1.0;
    const minVal = rawMin - range * 0.10;
    const maxVal = rawMax + range * 0.10;
    const safeRange = maxVal - minVal > 0.01 ? maxVal - minVal : 1.0;
    const scaleY = (p) => padding.top + (1 - (p - minVal) / safeRange) * graphHeight;
    const maxVol = Math.max(...displayCandles.map(c => Number(c.volume || 1000)), 1000);

    const { pts, peak, trough, exitPoint } = computeTimelinePoints({
      displayCandles, scaleY, padding, graphWidth, flightScope, isShort, exitTime
    });

    return {
      allPoints: pts, exitPoint, minVal, maxVal,
      entryY: scaleY(entryPrice), netZeroY: scaleY(netZeroPrice),
      targetY: targetPrice ? scaleY(targetPrice) : null,
      stopY: stopLoss ? scaleY(stopLoss) : null,
      exitY: scaleY(exitPrice), oneRY: scaleY(oneRTargetPrice),
      peakPoint: peak, troughPoint: trough, maxVolume: maxVol, scaleY
    };
  }, [displayCandles, entryPrice, exitPrice, targetPrice, stopLoss, netZeroPrice, oneRTargetPrice, graphWidth, graphHeight, padding.top, padding.left, flightScope, isShort, exitTime]);

  const renderedPoints = useMemo(() => {
    if (replayIndex === null || replayIndex >= coords.allPoints.length - 1) return coords.allPoints;
    return coords.allPoints.slice(0, Math.max(2, replayIndex + 1));
  }, [coords.allPoints, replayIndex]);

  const splinePath = useMemo(() => calculateSplinePath(renderedPoints), [renderedPoints]);

  const areaPath = useMemo(() => {
    if (!renderedPoints.length) return '';
    const first = renderedPoints[0];
    const last = renderedPoints[renderedPoints.length - 1];
    return `${splinePath} L ${last.x.toFixed(1)} ${coords.entryY.toFixed(1)} L ${first.x.toFixed(1)} ${coords.entryY.toFixed(1)} Z`;
  }, [splinePath, renderedPoints, coords.entryY]);

  return {
    isMobile, height, padding, graphWidth, graphHeight, isVerifiedTicks,
    renderedPoints, splinePath, areaPath, ...coords
  };
}
