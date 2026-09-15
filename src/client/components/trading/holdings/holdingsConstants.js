export const DEFAULT_HOLDINGS = [
  { tradingsymbol: "RELIANCE", quantity: 50, average_price: 1280.00, last_price: 1307.20, pnl: 1360.00, day_change: 15.40, day_change_percentage: 1.19 },
  { tradingsymbol: "TCS", quantity: 20, average_price: 2310.00, last_price: 2268.10, pnl: -838.00, day_change: -12.30, day_change_percentage: -0.54 },
  { tradingsymbol: "HDFCBANK", quantity: 100, average_price: 710.00, last_price: 729.65, pnl: 1965.00, day_change: 4.80, day_change_percentage: 0.66 },
  { tradingsymbol: "INFY", quantity: 60, average_price: 1140.00, last_price: 1121.10, pnl: -1134.00, day_change: -8.90, day_change_percentage: -0.79 },
  { tradingsymbol: "ICICIBANK", quantity: 80, average_price: 1380.00, last_price: 1438.00, pnl: 4640.00, day_change: 18.20, day_change_percentage: 1.28 },
  { tradingsymbol: "SBIN", quantity: 150, average_price: 1020.00, last_price: 1056.00, pnl: 5400.00, day_change: 22.50, day_change_percentage: 2.18 },
  { tradingsymbol: "GOLDBEES", quantity: 300, average_price: 125.00, last_price: 132.87, pnl: 2361.00, day_change: 0.95, day_change_percentage: 0.72 },
];

export const FILTER_TABS = [
  { id: "all", label: "All Assets" },
  { id: "gain", label: "🟢 Gainers" },
  { id: "loss", label: "🔴 Losers" },
  { id: "banking", label: "🏦 Banking" },
  { id: "tech", label: "💻 Tech & IT" },
  { id: "large", label: "💎 Core (>15%)" },
];

export const CONCENTRATION_COLORS = [
  "from-cyan-500 to-sky-400",
  "from-teal-500 to-emerald-400",
  "from-indigo-500 to-violet-400",
  "from-amber-500 to-yellow-400",
  "from-pink-500 to-rose-400",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400"
];
