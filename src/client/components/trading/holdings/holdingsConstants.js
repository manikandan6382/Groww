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

export const SORT_OPTIONS = [
  { id: "weight", label: "Portfolio Weight %" },
  { id: "invested", label: "Invested Capital (Cost Basis)" },
  { id: "val", label: "Current Valuation (NAV)" },
  { id: "pnl", label: "Total P&L (₹)" },
  { id: "pnlPct", label: "Return %" },
  { id: "day", label: "Today's Change %" },
  { id: "symbol", label: "Stock Symbol (A-Z)" },
];

export const VIEW_MODES = [
  { id: "all", label: "Comprehensive Matrix", desc: "Full institutional view with cost, valuation & returns" },
  { id: "cost", label: "Capital Basis (No Profit)", desc: "Focused on raw invested capital & break-even price" },
  { id: "performance", label: "P&L & Cushion", desc: "Focused on profit spread, cushion % & alpha" },
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

export const DEFAULT_POSITIONS = [
  {
    tradingsymbol: "NIFTY24SEP25000CE",
    exchange: "NFO",
    instrument_token: 112233,
    product: "NRML",
    quantity: 50,
    multiplier: 1,
    average_price: 135.40,
    close_price: 128.00,
    last_price: 148.60,
    value: 7430.00,
    pnl: 660.00,
    m2m: 660.00,
    unrealised: 660.00,
    realised: 0.00,
    buy_quantity: 50,
    buy_price: 135.40,
    sell_quantity: 0,
    sell_price: 0,
  },
  {
    tradingsymbol: "BANKNIFTY24SEP52500PE",
    exchange: "NFO",
    instrument_token: 445566,
    product: "NRML",
    quantity: -30,
    multiplier: 1,
    average_price: 210.00,
    close_price: 225.00,
    last_price: 185.20,
    value: -5556.00,
    pnl: 744.00,
    m2m: 744.00,
    unrealised: 744.00,
    realised: 0.00,
    buy_quantity: 0,
    buy_price: 0,
    sell_quantity: 30,
    sell_price: 210.00,
  },
  {
    tradingsymbol: "TATASTEEL",
    exchange: "NSE",
    instrument_token: 896434,
    product: "MIS",
    quantity: 200,
    multiplier: 1,
    average_price: 152.00,
    close_price: 150.50,
    last_price: 153.80,
    value: 30760.00,
    pnl: 360.00,
    m2m: 360.00,
    unrealised: 360.00,
    realised: 0.00,
    buy_quantity: 200,
    buy_price: 152.00,
    sell_quantity: 0,
    sell_price: 0,
  }
];

export const POSITION_FILTER_TABS = [
  { id: "all", label: "All Positions" },
  { id: "open", label: "⚡ Active Open" },
  { id: "fno", label: "🎯 Options & Futures" },
  { id: "mis", label: "⏱️ Intraday MIS" },
  { id: "closed", label: "🏁 Closed Today" },
];

export const POSITION_SORT_OPTIONS = [
  { id: "pnl", label: "MTM P&L (₹)" },
  { id: "val", label: "Position Exposure / Value" },
  { id: "qty", label: "Quantity / Size" },
  { id: "symbol", label: "Contract Symbol (A-Z)" },
];


