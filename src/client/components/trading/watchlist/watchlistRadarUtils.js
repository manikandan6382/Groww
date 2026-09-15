export const QUICK_PRESETS = [
  { symbol: "RELIANCE.NS", label: "RELIANCE" },
  { symbol: "TCS.NS", label: "TCS" },
  { symbol: "HDFCBANK.NS", label: "HDFCBANK" },
  { symbol: "INFY.NS", label: "INFY" },
  { symbol: "SBIN.NS", label: "SBIN" },
  { symbol: "TATAMOTORS.NS", label: "TATAMOTORS" },
  { symbol: "ZOMATO.NS", label: "ZOMATO" },
  { symbol: "JIOFIN.NS", label: "JIOFIN" },
  { symbol: "GOLDBEES.NS", label: "GOLDBEES" },
];

export const SECTOR_TABS = [
  { id: "all", label: "All Tracked" },
  { id: "nifty", label: "🇮🇳 Nifty Core" },
  { id: "banking", label: "🏦 Banking & NBFC" },
  { id: "tech", label: "💻 Tech & IT" },
  { id: "liquid", label: "⚡ High Liquidity" },
  { id: "gainers", label: "▲ Gainers" },
  { id: "dips", label: "▼ Dip Buys" },
];

export function getLiquidityRadarData(symbol, meta) {
  const price = Number(meta?.price || 1000);
  const isGain = (meta?.change || 0) >= 0;

  const dayLow = Number((price * (isGain ? 0.991 : 0.982)).toFixed(2));
  const dayHigh = Number((price * (isGain ? 1.018 : 1.006)).toFixed(2));
  const rangeSpan = Math.max(0.1, dayHigh - dayLow);
  const rangeProgress = Math.min(100, Math.max(0, ((price - dayLow) / rangeSpan) * 100));

  const yearLow = Number((price * 0.78).toFixed(2));
  const yearHigh = Number((price * 1.28).toFixed(2));
  const yearProgress = Math.min(100, Math.max(0, ((price - yearLow) / (yearHigh - yearLow)) * 100));

  const isHeavyweight = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS"].includes(symbol);
  const volumeShares = isHeavyweight ? (price > 1500 ? "3.2M" : "8.4M") : (price < 300 ? "24.5M" : "1.8M");
  const turnoverCr = isHeavyweight ? (price > 1500 ? "₹740 Cr" : "₹890 Cr") : "₹210 Cr";
  const spread = "₹0.05";
  const vwap = Number((price * (isGain ? 0.997 : 1.003)).toFixed(2));
  const vwapDelta = Number((((price - vwap) / vwap) * 100).toFixed(2));
  const buyerDominance = isGain ? 58 : 42;

  const bids = [
    { price: (price - 0.05).toFixed(2), qty: isHeavyweight ? 1820 : 650, orders: 14 },
    { price: (price - 0.10).toFixed(2), qty: isHeavyweight ? 2540 : 920, orders: 22 },
    { price: (price - 0.15).toFixed(2), qty: isHeavyweight ? 3890 : 1400, orders: 31 },
    { price: (price - 0.20).toFixed(2), qty: isHeavyweight ? 5600 : 2100, orders: 42 },
    { price: (price - 0.25).toFixed(2), qty: isHeavyweight ? 9400 : 3800, orders: 60 },
  ];

  const asks = [
    { price: (price + 0.05).toFixed(2), qty: isHeavyweight ? 1540 : 580, orders: 12 },
    { price: (price + 0.10).toFixed(2), qty: isHeavyweight ? 2210 : 840, orders: 18 },
    { price: (price + 0.15).toFixed(2), qty: isHeavyweight ? 3420 : 1250, orders: 27 },
    { price: (price + 0.20).toFixed(2), qty: isHeavyweight ? 5100 : 1980, orders: 38 },
    { price: (price + 0.25).toFixed(2), qty: isHeavyweight ? 8700 : 3500, orders: 54 },
  ];

  const tier = isHeavyweight ? "Ultra Liquid (Tier-1)" : "Active Liquidity";

  return {
    dayLow,
    dayHigh,
    rangeProgress,
    yearLow,
    yearHigh,
    yearProgress,
    volumeShares,
    turnoverCr,
    spread,
    vwap,
    vwapDelta,
    buyerDominance,
    bids,
    asks,
    tier,
    isHeavyweight,
  };
}

export function generateMiniPoints(price, isGain) {
  const p = Number(price || 1000);
  const delta = p * 0.015;
  if (isGain) {
    return [p - delta, p - delta * 0.6, p - delta * 0.4, p + delta * 0.2, p + delta * 0.8, p];
  }
  return [p + delta, p + delta * 0.5, p + delta * 0.3, p - delta * 0.2, p - delta * 0.6, p];
}
