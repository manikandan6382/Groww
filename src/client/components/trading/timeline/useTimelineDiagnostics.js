import { useMemo } from 'react';
import { formatTimelineLabel } from './flightTimeUtils';
import { evaluateExecutionDiscipline } from './timelineDisciplineHelpers';

export function useTimelineDiagnostics({
  trade,
  allPoints = [],
  entryPoint,
  peakPoint,
  troughPoint,
  exitPoint,
  flightScope,
  currentActivePoint
}) {
  const entryPrice = Math.max(0.1, Number(trade?.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade?.exitPrice || entryPrice));
  const targetPrice = trade?.targetPrice ? Math.max(0.1, Number(trade.targetPrice)) : null;
  const stopLoss = trade?.stopLoss ? Math.max(0.1, Number(trade.stopLoss)) : null;
  const effectiveStopLoss = trade?.stopLoss ? Number(trade.stopLoss) : Number((entryPrice * 0.95).toFixed(2));
  const isShort = trade?.direction === 'SHORT';
  const totalQty = Number(trade?.quantity || trade?.qty || 1);
  const charges = Number(trade?.charges || trade?.tax || 0);
  const frictionPerUnit = totalQty > 0 ? charges / totalQty : 0.85;
  const netZeroPrice = isShort ? entryPrice - frictionPerUnit : entryPrice + frictionPerUnit;
  const closeReason = String(trade?.closeReason || '');
  const grossPts = isShort ? (entryPrice - exitPrice) : (exitPrice - entryPrice);

  const postExitPoints = useMemo(() => {
    if (!allPoints.length) return [];
    const exitIdx = allPoints.findIndex(p => p.isExitPoint);
    if (exitIdx !== -1 && exitIdx < allPoints.length - 1) return allPoints.slice(exitIdx + 1);
    return allPoints.filter(p => p.isPostExit);
  }, [allPoints]);

  const firstBreachPt = useMemo(() => {
    if (!postExitPoints.length) return null;
    return postExitPoints.find(p => Number(p.low ?? p.close) <= effectiveStopLoss) || null;
  }, [postExitPoints, effectiveStopLoss]);

  const isDrawdownBreached = useMemo(() => {
    if (trade?.closeReason?.includes('STOP')) return true;
    if (firstBreachPt) return true;
    return Boolean(trade?.isDrawdownBreached);
  }, [trade, firstBreachPt]);

  const isTargetHit = closeReason.includes('TARGET');
  const isStopHit = closeReason.includes('STOP') || (isShort ? exitPrice >= (stopLoss || entryPrice) : exitPrice <= (stopLoss || entryPrice));

  const observedHighs = allPoints.map(p => p.high ?? p.close);
  const observedLows = allPoints.map(p => p.low ?? p.close);
  const rawObservedMax = observedHighs.length ? Math.max(entryPrice, exitPrice, ...observedHighs) : Math.max(entryPrice, exitPrice);
  const rawObservedMin = observedLows.length ? Math.min(entryPrice, exitPrice, ...observedLows) : Math.min(entryPrice, exitPrice);

  const peakPrice = isShort ? rawObservedMin : rawObservedMax;
  const troughPrice = isShort ? rawObservedMax : rawObservedMin;

  const peakPts = Number((isShort ? Math.max(0, entryPrice - rawObservedMin) : Math.max(0, rawObservedMax - entryPrice)).toFixed(2));
  const peakRupees = Number((peakPts * totalQty).toFixed(2));
  const drawdownPts = Number((isShort ? Math.max(0, rawObservedMax - entryPrice) : Math.max(0, entryPrice - rawObservedMin)).toFixed(2));
  const drawdownRupees = Number((drawdownPts * totalQty).toFixed(2));

  const targetTotalDistance = targetPrice ? Math.abs(targetPrice - entryPrice) : Math.max(1, peakPts || 1);
  const stopTotalDistance = stopLoss ? Math.abs(entryPrice - stopLoss) : Math.max(1, drawdownPts || 1);
  const mfeTargetEfficiencyPct = Math.min(100, Math.max(0, Math.round((peakPts / targetTotalDistance) * 100)));
  const maeRiskConsumedPct = Math.min(100, Math.max(0, Math.round((drawdownPts / stopTotalDistance) * 100)));

  const hadSignificantPeak = peakPts >= (targetPrice ? Math.abs(targetPrice - entryPrice) * 0.35 : 3.5);
  const isPeakGiveback = isStopHit && hadSignificantPeak;
  const stopDisciplineDelta = stopLoss ? (isShort ? exitPrice - stopLoss : stopLoss - exitPrice) : 0;

  const executionDiscipline = useMemo(() => {
    return evaluateExecutionDiscipline({
      isTargetHit, isStopHit, targetPrice, entryPrice, exitPrice, stopDisciplineDelta, grossPts
    });
  }, [isTargetHit, isStopHit, targetPrice, entryPrice, exitPrice, stopDisciplineDelta, grossPts]);

  const isMultiDay = useMemo(() => {
    if (flightScope === 'week' || flightScope === 'month') return true;
    if (allPoints.length < 2) return false;
    const t0 = new Date(allPoints[0].time || allPoints[0].timestamp).toLocaleDateString();
    const tEnd = new Date(allPoints[allPoints.length - 1].time || allPoints[allPoints.length - 1].timestamp).toLocaleDateString();
    return t0 !== tEnd;
  }, [flightScope, allPoints]);

  const scrubTelemetry = useMemo(() => {
    if (!currentActivePoint) return null;
    const currentP = Number(currentActivePoint.close ?? currentActivePoint.price ?? entryPrice);
    const ptsDelta = isShort ? entryPrice - currentP : currentP - entryPrice;
    const rupeesDelta = ptsDelta * totalQty;
    const isNetGain = currentP >= netZeroPrice;
    const pctReturn = (entryPrice > 0 && Number.isFinite(ptsDelta)) ? ((ptsDelta / entryPrice) * 100).toFixed(1) : '0.0';
    const counterfactualGross = ptsDelta * totalQty;
    const counterfactualNet = Number((counterfactualGross - charges).toFixed(2));
    const counterfactualAlpha = Number((counterfactualNet - Number(trade?.netPnl || 0)).toFixed(2));

    let snapMilestone = null;
    const ptIdx = currentActivePoint.index ?? 0;
    if (currentActivePoint.isEntryPoint || (entryPoint && ptIdx === entryPoint.index)) {
      snapMilestone = 'ENTRY';
    } else if (peakPoint && ptIdx === peakPoint.index) {
      snapMilestone = 'PEAK';
    } else if (troughPoint && ptIdx === troughPoint.index) {
      snapMilestone = 'TROUGH';
    } else if (currentActivePoint.isExitPoint || (exitPoint && ptIdx === exitPoint.index)) {
      snapMilestone = 'EXIT';
    }

    return {
      currentP: Number.isFinite(currentP) ? currentP : entryPrice,
      ptsDelta: Number.isFinite(ptsDelta) ? Number(ptsDelta.toFixed(2)) : 0,
      rupeesDelta: Number.isFinite(rupeesDelta) ? Number(rupeesDelta.toFixed(2)) : 0,
      pctReturn, isNetGain,
      distToTarget: targetPrice ? Number(Math.abs(targetPrice - currentP).toFixed(2)) : null,
      distToStop: stopLoss ? Number(Math.abs(currentP - stopLoss).toFixed(2)) : null,
      distToPeak: Number(Math.abs(currentP - peakPrice).toFixed(2)),
      distToTrough: Number(Math.abs(currentP - troughPrice).toFixed(2)),
      timeStr: formatTimelineLabel(currentActivePoint.time || currentActivePoint.timestamp, isMultiDay),
      isPostExit: Boolean(currentActivePoint.isPostExit),
      counterfactualNet, counterfactualAlpha,
      index: ptIdx,
      snapMilestone
    };
  }, [currentActivePoint, entryPrice, targetPrice, stopLoss, netZeroPrice, isShort, totalQty, charges, trade?.netPnl, peakPrice, troughPrice, isMultiDay, entryPoint, peakPoint, troughPoint, exitPoint]);

  const stallPoint = useMemo(() => {
    if (!peakPoint || !allPoints.length || allPoints.length < 6) return null;
    const peakIdx = peakPoint.index;
    if (peakIdx >= allPoints.length - 2) return null;
    const stallIdx = Math.min(allPoints.length - 2, peakIdx + Math.round((allPoints.length - peakIdx) * 0.4));
    return allPoints[stallIdx];
  }, [peakPoint, allPoints]);

  return {
    postExitPoints, firstBreachPt, isDrawdownBreached, isTargetHit, isStopHit,
    peakPrice, troughPrice, peakPts, peakRupees, drawdownPts, drawdownRupees,
    mfeTargetEfficiencyPct, maeRiskConsumedPct, isPeakGiveback,
    executionDiscipline, isMultiDay, scrubTelemetry, stallPoint, effectiveStopLoss
  };
}
