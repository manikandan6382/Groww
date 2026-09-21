export { DEFAULT_US_STOCKS } from "./defaultUsStocks.js";

/**
 * 🌟 Constants & Default US Titans Dataset
 */
export const USD_INR_RATE = 83.95;
export const USD_ANNUAL_ALPHA = 3.8; // Historical ~3.5-4.0% annualized USD/INR appreciation

export const US_MARKET_INDICES = [
  {
    symbol: "S&P 500",
    name: "US Large Cap Benchmark",
    tag: "500 Leaders",
    price: 5648.40,
    change: 25.20,
    changePct: 0.45,
    isGain: true,
    dayLow: 5618.20,
    dayHigh: 5654.10,
    sparkline: [5620.0, 5632.4, 5628.1, 5640.5, 5638.2, 5648.40],
  },
  {
    symbol: "NASDAQ 100",
    name: "Tech Heavyweight Index",
    tag: "Tech Mega",
    price: 19820.10,
    change: 172.50,
    changePct: 0.88,
    isGain: true,
    dayLow: 19650.00,
    dayHigh: 19845.20,
    sparkline: [19680.0, 19720.5, 19705.0, 19780.2, 19795.0, 19820.10],
  },
  {
    symbol: "DOW JONES",
    name: "US Industrial Bluechips",
    tag: "30 Bluechips",
    price: 41250.50,
    change: 74.30,
    changePct: 0.18,
    isGain: true,
    dayLow: 41150.80,
    dayHigh: 41280.00,
    sparkline: [41190.0, 41210.0, 41180.5, 41225.0, 41235.0, 41250.50],
  },
  {
    symbol: "RUSSELL 2000",
    name: "US Small-Cap Growth",
    tag: "Small Caps",
    price: 2218.60,
    change: 14.80,
    changePct: 0.67,
    isGain: true,
    dayLow: 2192.10,
    dayHigh: 2224.50,
    sparkline: [2195.0, 2202.0, 2200.5, 2212.0, 2210.0, 2218.60],
  },
];

export const US_MACRO_PULSE = [
  {
    symbol: "CBOE VIX",
    name: "Volatility / Market Fear",
    tag: "Market Fear",
    price: 15.24,
    change: -0.62,
    changePct: -3.91,
    isGain: false, // Falling VIX is bullish/positive
    sentiment: "Low Volatility (Complacent)",
    dayLow: 14.95,
    dayHigh: 16.10,
    sparkline: [16.4, 16.1, 15.8, 15.7, 15.4, 15.24],
  },
  {
    symbol: "US DOLLAR (DXY)",
    name: "Dollar Currency Strength",
    tag: "Greenback Index",
    price: 101.42,
    change: 0.18,
    changePct: 0.18,
    isGain: true,
    sentiment: "Resilient Reserve Currency",
    dayLow: 101.12,
    dayHigh: 101.55,
    sparkline: [101.1, 101.2, 101.32, 101.25, 101.38, 101.42],
  },
  {
    symbol: "US 10Y YIELD",
    name: "Benchmark Treasury Yield",
    tag: "Risk-Free Rate",
    price: 3.82,
    suffix: "%",
    change: -0.04,
    changePct: -1.04,
    isGain: false,
    sentiment: "Easing Cost of Capital",
    dayLow: 3.80,
    dayHigh: 3.88,
    sparkline: [3.89, 3.87, 3.86, 3.84, 3.83, 3.82],
  },
  {
    symbol: "USD / INR",
    name: "Dalal Street Conversion Peg",
    tag: "Forex Arbitrage",
    price: 83.95,
    prefix: "₹",
    change: 0.08,
    changePct: 0.10,
    isGain: true,
    sentiment: "+3.8% Annual Dollar Alpha",
    dayLow: 83.84,
    dayHigh: 83.98,
    sparkline: [83.85, 83.87, 83.90, 83.89, 83.92, 83.95],
  },
];

export const SECTORS = [
  { id: "all", label: "🌟 All US Leaders", count: 12 },
  { id: "ai", label: "🤖 AI & Silicon", count: 3 },
  { id: "consumer", label: "📱 Consumer Tech", count: 3 },
  { id: "cloud", label: "☁️ Cloud & Enterprise", count: 3 },
  { id: "etf", label: "📊 Index ETFs", count: 2 },
  { id: "value", label: "🛡️ Value & Conglomerates", count: 1 },
];
