// Discrete ₹0.05 tick quantization helper (Indian exchange tick rule)
export const snapTick = (val) => Math.max(0.05, Math.round(val * 20) / 20);

// Pure Directional MFE & MAE Calculator with Parity for LONG and SHORT Trades
export function calculateDirectionalExcursions(direction, entryPrice, candles) {
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
export function calculateSplinePath(points) {
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

// Adaptive Multi-Minute Candle Clustered Aggregator
export function aggregateCandlesForDisplay(candles, targetMax = 90) {
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
