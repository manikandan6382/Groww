import { snapTick } from './flightSplineUtils.js';
import { resolveFlightScopeWindow } from './flightTimeUtils.js';
import { getMarketSessionTimestamps } from './flightSessionTimestamps.js';

function computePriceAlongCurve(progress, entryPrice, exitPrice, peakPrice, dipPrice, scenarioVariant, isTarget, isStop) {
  if (progress === 0) return entryPrice;
  if (progress === 1) return exitPrice;
  if (scenarioVariant === 'direct') {
    return entryPrice - (entryPrice - exitPrice) * Math.pow(progress, 0.9);
  }
  if (scenarioVariant === 'target' || isTarget) {
    if (progress < 0.20) {
      const sub = progress / 0.20;
      return entryPrice - (entryPrice - dipPrice) * sub * (2 - sub);
    }
    const sub = (progress - 0.20) / 0.80;
    return dipPrice + (exitPrice - dipPrice) * (1 - Math.pow(1 - sub, 2));
  }
  if (scenarioVariant === 'rollercoaster' || isStop) {
    if (progress < 0.35) {
      const sub = progress / 0.35;
      return entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
    }
    if (progress < 0.48) {
      const sub = (progress - 0.35) / 0.13;
      const dipAmount = (peakPrice - entryPrice) * 0.05;
      return peakPrice - dipAmount * (4 * sub * (1 - sub));
    }
    const sub = (progress - 0.48) / 0.52;
    return peakPrice - (peakPrice - exitPrice) * Math.pow(sub, 1.2);
  }
  if (progress < 0.40) {
    const sub = progress / 0.40;
    return entryPrice + (peakPrice - entryPrice) * (1 - Math.pow(1 - sub, 2));
  }
  const sub = (progress - 0.40) / 0.60;
  return peakPrice - (peakPrice - exitPrice) * (1 - Math.pow(1 - sub, 2));
}

export function synthesizeMarketFlightPath(trade, scenarioVariant = 'rollercoaster', flightScope = 'scalp') {
  const entryPrice = Math.max(0.1, Number(trade.entryPrice || 100));
  const exitPrice = Math.max(0.1, Number(trade.exitPrice || entryPrice));
  const targetPrice = trade.targetPrice ? Math.max(0.1, Number(trade.targetPrice)) : null;
  const stopLoss = trade.stopLoss ? Math.max(0.1, Number(trade.stopLoss)) : null;
  const closeReason = String(trade.closeReason || '');
  const terminalIntrinsic = Number(trade.terminalIntrinsic ?? (closeReason.includes('STOP') ? 0.0 : exitPrice * 1.15));

  const entryTime = new Date(trade.entryDatetime || trade.timestamp || Date.now() - 20 * 60000).getTime();
  const exitTime = new Date(trade.exitDatetime || trade.closedAt || Date.now()).getTime();

  const scopeWindow = resolveFlightScopeWindow(entryTime, exitTime, flightScope, trade);
  const fromTime = scopeWindow.fromTime;
  const toTime = scopeWindow.toTime;

  const isTarget = closeReason.includes('TARGET') || scenarioVariant === 'target';
  const isStop = closeReason.includes('STOP') || exitPrice <= (stopLoss || entryPrice * 0.95);
  const isShort = trade.direction === 'SHORT';

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

  const isExtended = flightScope !== 'scalp';
  const hasPreTrade = isExtended && fromTime < (entryTime - 60000);
  const preSteps = hasPreTrade ? Math.min(18, Math.max(8, Math.round((entryTime - fromTime) / (30 * 60000)) || 10)) : 0;
  const scalpSteps = isExtended ? 16 : 28;
  const postSteps = isExtended ? (scopeWindow.postSteps || 18) : 0;

  const preTimestamps = hasPreTrade ? getMarketSessionTimestamps(fromTime, entryTime, preSteps + 1) : [];
  const scalpStepMs = Math.max(1000, (exitTime - entryTime) / scalpSteps);
  const postStepMs = postSteps > 0 ? Math.max(1000, (toTime - exitTime) / postSteps) : 0;
  const postTimestamps = isExtended ? getMarketSessionTimestamps(exitTime, toTime, postSteps + 1) : [];

  const morningOpenPrice = entryPrice + (isShort ? 1 : -1) * Math.max(1.5, entryPrice * 0.015);
  const candles = [];
  let prevClose = hasPreTrade ? morningOpenPrice : entryPrice;

  // Phase 1: Pre-trade market session candles (09:15 AM to entryTime)
  if (hasPreTrade) {
    for (let i = 0; i < preSteps; i++) {
      const progress = i / preSteps;
      const t = preTimestamps[i] ?? (fromTime + (i / preSteps) * (entryTime - fromTime));
      const p = morningOpenPrice + (entryPrice - morningOpenPrice) * Math.sin((progress * Math.PI) / 2);

      const closeVal = snapTick(p);
      const openVal = snapTick(i === 0 ? morningOpenPrice : prevClose);
      const wickHigh = (i % 3 === 0) ? 0.20 : 0.08;
      const wickLow = (i % 2 === 0) ? 0.20 : 0.08;
      const highVal = snapTick(Math.max(openVal, closeVal) + wickHigh);
      const lowVal = snapTick(Math.min(openVal, closeVal) - wickLow);
      const vol = Math.round(1500 + (i % 5) * 400);

      candles.push({
        time: new Date(t).toISOString(),
        timestamp: t,
        open: openVal,
        high: highVal,
        low: lowVal,
        close: closeVal,
        volume: vol,
        isBullish: closeVal >= openVal,
        isPreEntry: true
      });
      prevClose = closeVal;
    }
  }

  // Phase 2: Active Trade Execution Candles (entryTime to exitTime)
  for (let i = 0; i <= scalpSteps; i++) {
    const progress = i / scalpSteps;
    const t = entryTime + i * scalpStepMs;
    const isEntryPoint = (i === 0);
    const isExitPoint = (i === scalpSteps);
    const p = computePriceAlongCurve(progress, entryPrice, exitPrice, peakPrice, dipPrice, scenarioVariant, isTarget, isStop);

    const closeVal = snapTick(p);
    const openVal = snapTick(i === 0 ? (hasPreTrade ? prevClose : entryPrice) : prevClose);
    const wickHigh = (i % 3 === 0) ? 0.15 : 0.05;
    const wickLow = (i % 2 === 0) ? 0.15 : 0.05;
    const highVal = snapTick(Math.max(openVal, closeVal) + wickHigh);
    const lowVal = snapTick(Math.min(openVal, closeVal) - wickLow);
    const vol = Math.round(1800 + (i % 6) * 450);

    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: openVal,
      high: highVal,
      low: lowVal,
      close: closeVal,
      volume: vol,
      isBullish: closeVal >= openVal,
      isEntryPoint,
      isExitPoint,
      isInTrade: true
    });
    prevClose = closeVal;
  }

  // Phase 3: Post-exit Continuation Candles (exitTime to toTime)
  if (isExtended && postSteps > 0) {
    for (let postIdx = 1; postIdx <= postSteps; postIdx++) {
      const progress = postIdx / postSteps;
      const t = postTimestamps[postIdx] ?? (exitTime + postIdx * postStepMs);
      const tau = Math.max(0, 1 - progress);
      const sqrtDecay = Math.sqrt(tau);
      const thetaCrush = Math.pow(progress, 1.8);

      let p;
      if (terminalIntrinsic <= 0.05) {
        p = Math.max(0.05, exitPrice * sqrtDecay * Math.max(0.02, 1 - thetaCrush));
      } else {
        p = terminalIntrinsic + (exitPrice - terminalIntrinsic) * sqrtDecay;
      }

      const closeVal = snapTick(p);
      const openVal = snapTick(prevClose);
      const wickHigh = (postIdx % 3 === 0) ? 0.15 : 0.05;
      const wickLow = (postIdx % 2 === 0) ? 0.15 : 0.05;
      const highVal = snapTick(Math.max(openVal, closeVal) + wickHigh);
      const lowVal = snapTick(Math.min(openVal, closeVal) - wickLow);
      const vol = Math.round(1200 + (postIdx % 4) * 280);

      candles.push({
        time: new Date(t).toISOString(),
        timestamp: t,
        open: openVal,
        high: highVal,
        low: lowVal,
        close: closeVal,
        volume: vol,
        isBullish: closeVal >= openVal,
        isPostExit: true
      });
      prevClose = closeVal;
    }
  }

  return candles;
}
