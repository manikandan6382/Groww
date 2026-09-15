export { DEFAULT_US_STOCKS } from "./defaultUsStocks";

/**
 * 🌟 Constants & Default US Titans Dataset
 */
export const USD_INR_RATE = 83.95;
export const USD_ANNUAL_ALPHA = 3.8; // Historical ~3.5-4.0% annualized USD/INR appreciation

export const US_MARKET_INDICES = [
  { symbol: "S&P 500", name: "US Large Cap Benchmark", price: 5648.40, change: 25.20, changePct: 0.45, isGain: true },
  { symbol: "NASDAQ 100", name: "Tech Heavyweight Index", price: 19820.10, change: 172.50, changePct: 0.88, isGain: true },
  { symbol: "DOW JONES", name: "US Industrial Bluechips", price: 41250.50, change: 74.30, changePct: 0.18, isGain: true },
];

export const SECTORS = [
  { id: "all", label: "🌟 All US Leaders", count: 8 },
  { id: "ai", label: "🤖 AI & Silicon", count: 2 },
  { id: "consumer", label: "📱 Consumer Tech", count: 3 },
  { id: "cloud", label: "☁️ Cloud & Enterprise", count: 2 },
  { id: "etf", label: "📊 Index ETFs", count: 1 },
];
