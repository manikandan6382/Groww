export function calculateLifecycleCoordinates({
  candles,
  entryPrice,
  exitPrice,
  targetPrice,
  stopLoss,
  netZeroPrice,
  underlying,
  graphWidth,
  graphHeight,
  padding
}) {
  if (!candles || !candles.length) {
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
    const uPrices = uCandles.map((c) => c.close);
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
}
