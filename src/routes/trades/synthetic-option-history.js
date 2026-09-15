export function generateSyntheticOptionCandles({ basePrice, timeframe }) {
  const candles = [];
  const steps = timeframe === "1D" ? 25 : (timeframe === "1W" ? 14 : 20);
  const totalMs = timeframe === "1D" ? 6 * 3600 * 1000 : (timeframe === "1W" ? 7 * 86400000 : 30 * 86400000);
  const startMs = Date.now() - totalMs;
  const stepMs = totalMs / steps;

  const initialMultiplier = timeframe === "1D" ? 1.15 : (timeframe === "1W" ? 1.6 : 2.4);
  let prevC = basePrice * initialMultiplier;
  for (let i = 0; i <= steps; i++) {
    const t = startMs + i * stepMs;
    const prog = i / steps;
    // Strict Zero-Math.sin Trend Interpolation (Complies with Financial Sparkline Rules)
    const decayFactor = 1 - Math.pow(prog, 0.85);
    let closeVal = basePrice + (basePrice * (initialMultiplier - 1)) * decayFactor;
    closeVal = Math.max(0.05, Number(closeVal.toFixed(2)));
    const openVal = Number(prevC.toFixed(2));
    const highVal = Number((Math.max(openVal, closeVal) + (prevC - basePrice) * 0.05 * decayFactor).toFixed(2));
    const lowVal = Number((Math.min(openVal, closeVal) - (prevC - basePrice) * 0.03 * decayFactor).toFixed(2));
    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: openVal,
      high: Math.max(highVal, openVal, closeVal),
      low: Math.max(0.05, Math.min(lowVal, openVal, closeVal)),
      close: closeVal,
      volume: Math.round(10000 + (1 - prog) * 40000)
    });
    prevC = closeVal;
  }
  return candles;
}
