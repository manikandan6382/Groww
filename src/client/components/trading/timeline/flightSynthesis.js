import { snapTick } from './flightSplineUtils';
import { resolveFlightScopeWindow } from './flightTimeUtils';
import { getMarketSessionTimestamps } from './flightSessionTimestamps';

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

  const fromTime = new Date(trade.entryDatetime || Date.now() - 20 * 60000).getTime();
  const exitTime = new Date(trade.exitDatetime || Date.now()).getTime();

  const scopeWindow = resolveFlightScopeWindow(fromTime, exitTime, flightScope, trade);
  const toTime = scopeWindow.toTime;

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
  const isExtended = flightScope !== 'scalp';
  const scalpSteps = isExtended ? 16 : 28;
  const postSteps = isExtended ? (scopeWindow.postSteps || 18) : 0;
  const totalSteps = scalpSteps + postSteps;
  const scalpStepMs = Math.max(1000, (exitTime - fromTime) / scalpSteps);
  const postStepMs = postSteps > 0 ? Math.max(1000, (toTime - exitTime) / postSteps) : 0;
  const postTimestamps = isExtended ? getMarketSessionTimestamps(exitTime, toTime, postSteps + 1) : [];

  for (let i = 0; i <= totalSteps; i++) {
    let t;
    let p;
    let isExitPoint = false;
    let isPostExit = false;

    if (i <= scalpSteps) {
      const progress = i / scalpSteps;
      t = fromTime + i * scalpStepMs;
      if (i === scalpSteps) isExitPoint = true;
      p = computePriceAlongCurve(progress, entryPrice, exitPrice, peakPrice, dipPrice, scenarioVariant, isTarget, isStop);
    } else {
      isPostExit = true;
      const postIdx = i - scalpSteps;
      const progress = postIdx / postSteps;
      t = postTimestamps[postIdx] ?? (exitTime + postIdx * postStepMs);
      const tau = Math.max(0, 1 - progress);
      const sqrtDecay = Math.sqrt(tau);
      const thetaCrush = Math.pow(progress, 1.8);

      if (terminalIntrinsic <= 0.05) {
        p = Math.max(0.05, exitPrice * sqrtDecay * Math.max(0.02, 1 - thetaCrush));
      } else {
        p = terminalIntrinsic + (exitPrice - terminalIntrinsic) * sqrtDecay;
      }
    }

    const closeVal = snapTick(p);
    const openVal = snapTick(i === 0 ? entryPrice : prevClose);
    const wickHigh = (i % 3 === 0) ? 0.15 : 0.05;
    const wickLow = (i % 2 === 0) ? 0.15 : 0.05;
    const highVal = snapTick(Math.max(openVal, closeVal) + wickHigh);
    const lowVal = snapTick(Math.min(openVal, closeVal) - wickLow);
    const vol = Math.round(1200 + (i % 6) * 320);

    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: openVal,
      high: highVal,
      low: lowVal,
      close: closeVal,
      volume: vol,
      isBullish: closeVal >= openVal,
      isExitPoint,
      isPostExit
    });
    prevClose = closeVal;
  }

  return candles;
}
