import { create } from "zustand";
import { getViewFromUrl, syncUrlWithView } from "../utils/urlRouter";
import { calculateTradeDuration, getLocalDateKey } from "../utils/dateUtils";

// Trailing Network Sync Debounce Map (Coalesces rapid pill clicks)
const networkDebounceTimers = new Map();
function debounceNetworkSync(key, fn, delay = 300) {
  if (networkDebounceTimers.has(key)) {
    clearTimeout(networkDebounceTimers.get(key));
  }
  const timer = setTimeout(() => {
    networkDebounceTimers.delete(key);
    fn();
  }, delay);
  networkDebounceTimers.set(key, timer);
}

const DEFAULT_WATCHLIST = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "ITC.NS", "GOLDBEES.NS"];

export const INDIAN_STOCK_META = {
  "RELIANCE.NS": { name: "Reliance Industries", sector: "Energy & Conglomerate", color: "#00d5ff", tag: "Heavyweight", price: 1307.20, change: -6.00, changePct: -0.46 },
  "TCS.NS": { name: "Tata Consultancy Services", sector: "IT & Tech Services", color: "#a855f7", tag: "Tech Titan", price: 2268.10, change: -29.90, changePct: -1.30 },
  "HDFCBANK.NS": { name: "HDFC Bank", sector: "Private Banking & NBFC", color: "#3b82f6", tag: "Banking Leader", price: 729.65, change: 4.60, changePct: 0.63 },
  "INFY.NS": { name: "Infosys Technologies", sector: "IT & Enterprise Cloud", color: "#06b6d4", tag: "Tech Bluechip", price: 1121.10, change: -8.90, changePct: -0.79 },
  "ICICIBANK.NS": { name: "ICICI Bank", sector: "Private Banking & Retail", color: "#f97316", tag: "Growth Bank", price: 1438.00, change: 26.10, changePct: 1.85 },
  "SBIN.NS": { name: "State Bank of India", sector: "Public Sector Banking", color: "#10b981", tag: "PSU Giant", price: 1056.00, change: 8.00, changePct: 0.76 },
  "ITC.NS": { name: "ITC Limited", sector: "FMCG & Agri Business", color: "#eab308", tag: "Defensive King", price: 271.60, change: -0.05, changePct: -0.02 },
  "GOLDBEES.NS": { name: "Nippon India Gold ETF", sector: "Gold Commodity ETF", color: "#f59e0b", tag: "Safe Haven", price: 132.87, change: 3.99, changePct: 3.10 },
  "TATAMOTORS.NS": { name: "Tata Motors", sector: "Automotive & EV", color: "#38bdf8", tag: "EV Leader", price: 985.40, change: 12.60, changePct: 1.30 },
  "BHARTIARTL.NS": { name: "Bharti Airtel", sector: "Telecom & 5G Data", color: "#ef4444", tag: "Telecom Giant", price: 1680.50, change: 15.20, changePct: 0.91 },
  "LT.NS": { name: "Larsen & Toubro", sector: "Infrastructure & Defense", color: "#8b5cf6", tag: "Infra Giant", price: 3450.00, change: -18.40, changePct: -0.53 },
  "KOTAKBANK.NS": { name: "Kotak Mahindra Bank", sector: "Banking & Wealth", color: "#ec4899", tag: "Private Bank", price: 1780.00, change: 8.50, changePct: 0.48 },
  "BAJFINANCE.NS": { name: "Bajaj Finance", sector: "Consumer NBFC", color: "#14b8a6", tag: "Fintech Leader", price: 7120.00, change: 45.00, changePct: 0.64 },
  "MARUTI.NS": { name: "Maruti Suzuki", sector: "Automobile Leader", color: "#6366f1", tag: "Auto Giant", price: 11850.00, change: -80.00, changePct: -0.67 },
  "SUNPHARMA.NS": { name: "Sun Pharma", sector: "Healthcare & Pharma", color: "#84cc16", tag: "Pharma Leader", price: 1720.00, change: 14.00, changePct: 0.82 },
  "WIPRO.NS": { name: "Wipro Limited", sector: "Enterprise IT", color: "#a855f7", tag: "IT Services", price: 495.00, change: -3.20, changePct: -0.64 },
  "ZOMATO.NS": { name: "Zomato Limited", sector: "Food Delivery & Quick Commerce", color: "#ef4444", tag: "Growth Star", price: 235.50, change: 4.80, changePct: 2.08 },
  "SUZLON.NS": { name: "Suzlon Energy", sector: "Green Energy & Wind Power", color: "#10b981", tag: "Renewable Power", price: 68.40, change: 1.20, changePct: 1.79 },
  "JIOFIN.NS": { name: "Jio Financial Services", sector: "Fintech & NBFC", color: "#00d5ff", tag: "Reliance NBFC", price: 324.80, change: -2.10, changePct: -0.64 },
  "HAL.NS": { name: "Hindustan Aeronautics", sector: "Defense & Aerospace", color: "#3b82f6", tag: "Defense Leader", price: 4350.00, change: 65.00, changePct: 1.52 },
  "BEL.NS": { name: "Bharat Electronics", sector: "Defense & Electronics", color: "#06b6d4", tag: "PSU Tech", price: 298.00, change: 3.40, changePct: 1.15 },
  "TRENT.NS": { name: "Trent Limited", sector: "Retail & Fashion (Zudio)", color: "#a855f7", tag: "Retail Star", price: 6850.00, change: 120.00, changePct: 1.78 },
  "NIFTYBEES.NS": { name: "Nippon India Nifty 50 ETF", sector: "Index Fund ETF", color: "#00d5ff", tag: "Index Core", price: 262.50, change: 1.10, changePct: 0.42 }
};

export const INITIAL_OPEN_ALERTS = [
  { id: 56, symbol: "NIFTY 24500 CE", underlyingSymbol: "NIFTY", strikePrice: 24500, optionType: "CALL", entryDatetime: new Date().toISOString(), entryPrice: 85.0, lastMarkPrice: 85.0, targetPrice: 105.0, stopLoss: 75.0, quantity: 1, lotSize: 65, entryReason: "ATM Scalp Practice · R:R 1:2.00", personalNotes: "Live Desk Scalp", feedMode: "LIVE", strategyMode: "NAKED" },
];

export function resolveIndexLotSize(symbol = "", explicitLot = null) {
  if (explicitLot && Number(explicitLot) > 0) return Number(explicitLot);
  const sym = (symbol || "").toUpperCase();
  if (sym.includes("BANKNIFTY")) return 30;
  if (sym.includes("FINNIFTY")) return 65;
  if (sym.includes("MIDCPNIFTY")) return 75;
  if (sym.includes("SENSEX")) return 10;
  if (sym.includes("NIFTY")) return 65;
  return 65;
}

/**
 * Calculates turnover-proportional Indian statutory taxes & friction:
 * Brokerage (₹40 round trip) + STT (0.1% on Option Sell) + NSE Turnover Charges (0.05%) 
 * + SEBI Charges + Stamp Duty (0.003% on Buy) + 18% GST.
 */
export function calculateStatutoryCharges(entryPrice = 0, exitPrice = 0, totalQty = 65) {
  const buyTurnover = Number(entryPrice || 0) * Number(totalQty || 1);
  const sellTurnover = Number(exitPrice || 0) * Number(totalQty || 1);
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0; // ₹20 Buy + ₹20 Sell
  const stt = sellTurnover * 0.001; // 0.1% on Option Sell Turnover
  const exchangeCharges = totalTurnover * 0.0005; // 0.05% NSE Transaction Charges
  const sebiCharges = totalTurnover * 0.000001; // ₹10 per Crore
  const stampDuty = buyTurnover * 0.00003; // 0.003% Stamp Duty on Buy
  const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18; // 18% GST on brokerage + exchange charges

  const totalCharges = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
  return Number(Math.max(45.0, totalCharges).toFixed(2));
}

export const CANONICAL_STRATEGY_TAGS = [
  "15m VWAP Retest",
  "Opening Range Breakout",
  "EMA Trend Pullback",
  "Delta Momentum Scalp",
  "Support Bounce Scalp",
  "Resistance Rejection Fade",
  "Expiry Zero Hero",
  "Defined-Risk Spread",
  "Discretionary Scalp",
];

export function canonicalizeStrategyTag(tag = "") {
  if (!tag) return "Discretionary Scalp";
  const trimmed = String(tag).trim();
  const lower = trimmed.toLowerCase();
  const match = CANONICAL_STRATEGY_TAGS.find(
    (c) => c.toLowerCase() === lower || lower.includes(c.toLowerCase())
  );
  return match || trimmed;
}

// ─── Indian Stock Market Calendar & Session Helpers ───────────────────────────
export function isMarketWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

export function isMarketOpenHours() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const totalMins = now.getHours() * 60 + now.getMinutes();
  return totalMins >= 9 * 60 + 15 && totalMins <= 15 * 60 + 30; // 9:15 AM to 3:30 PM IST
}

export const MASTER_INITIAL_TRADES = [
  { 
    id: 101, 
    symbol: "NIFTY 24200 CE", 
    optionType: "CALL", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-28T10:15:00", 
    exitDatetime: "2026-08-28T10:35:00", 
    duration: "20 mins", 
    entryPrice: 90.13, 
    exitPrice: 95.00, 
    targetPrice: 95.00, 
    stopLoss: 75.00, 
    quantity: 1, 
    lotSize: 75, 
    grossPnl: 421.25, 
    taxesAndCharges: 56.00, 
    netPnl: 365.25, 
    closeReason: "TARGET_HIT", 
    strategyTag: "15m VWAP Retest", 
    strategyTags: "15m VWAP Retest", 
    mistakeTags: "None", 
    confidenceScore: 9, 
    followedPlan: true, 
    catalyst: "15-min volume breakdown confirmation above VWAP (24,200) with strong call buyer delta.", 
    executionDetails: "Limit fill on 5m retest; captured full +4.87 pts into predefined target with 0 slippage.", 
    mindsetEmotion: "Disciplined & Patient", 
    lessonsLearned: "Held through 2-minute consolidation wick without panic-exiting." 
  },
  { 
    id: 102, 
    symbol: "BANKNIFTY 52100 PE", 
    optionType: "PUT", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-28T09:58:00", 
    exitDatetime: "2026-08-28T10:12:00", 
    duration: "14 mins", 
    entryPrice: 247.19, 
    exitPrice: 240.00, 
    targetPrice: 210.00, 
    stopLoss: 240.00, 
    quantity: 1, 
    lotSize: 35, 
    grossPnl: -195.50, 
    taxesAndCharges: 56.00, 
    netPnl: -251.50, 
    closeReason: "STOP_LOSS_HIT", 
    strategyTag: "Support Bounce Scalp", 
    strategyTags: "Support Bounce Scalp", 
    mistakeTags: "Chased Early Wick", 
    confidenceScore: 6, 
    followedPlan: true, 
    catalyst: "Attempted breakdown scalp at 52,100 round level before 5m candle closed.", 
    executionDetails: "False break reversed immediately; hit stop loss cleanly at -7.19 pts with zero tilt.", 
    mindsetEmotion: "Slight FOMO -> Quick Disciplined Cut", 
    lessonsLearned: "Wait for candle close confirmation on major round numbers." 
  },
  { 
    id: 103, 
    symbol: "NIFTY 24300 PE", 
    optionType: "PUT", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-28T09:41:00", 
    exitDatetime: "2026-08-28T10:05:00", 
    duration: "24 mins", 
    entryPrice: 114.40, 
    exitPrice: 120.00, 
    targetPrice: 120.00, 
    stopLoss: 100.00, 
    quantity: 1, 
    lotSize: 75, 
    grossPnl: 476.00, 
    taxesAndCharges: 56.00, 
    netPnl: 420.00, 
    closeReason: "TARGET_HIT", 
    strategyTag: "Delta Momentum Scalp", 
    strategyTags: "Delta Momentum Scalp", 
    mistakeTags: "None", 
    confidenceScore: 9, 
    followedPlan: true, 
    catalyst: "India VIX surged +3.8% during opening rejection; heavy put premium surge.", 
    executionDetails: "Market order on VWAP band breakdown; captured +5.60 pts in 24 mins.", 
    mindsetEmotion: "Calm & Focused", 
    lessonsLearned: "Volatility expansion trades yield fast theta-independent moves." 
  },
  { 
    id: 104, 
    symbol: "NIFTY 24100 CE", 
    optionType: "CALL", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-27T09:22:00", 
    exitDatetime: "2026-08-27T09:39:00", 
    duration: "17 mins", 
    entryPrice: 86.27, 
    exitPrice: 90.00, 
    targetPrice: 90.00, 
    stopLoss: 70.00, 
    quantity: 1, 
    lotSize: 75, 
    grossPnl: 336.00, 
    taxesAndCharges: 56.00, 
    netPnl: 280.00, 
    closeReason: "TARGET_HIT", 
    strategyTag: "Opening Range Breakout", 
    strategyTags: "Opening Range Breakout", 
    mistakeTags: "None", 
    confidenceScore: 8, 
    followedPlan: true, 
    catalyst: "Opening 15m high cleared with rising cumulative volume delta.", 
    executionDetails: "Clean limit order on pullback; target reached on second green candle expansion.", 
    mindsetEmotion: "High Conviction Execution", 
    lessonsLearned: "Morning range breakouts work best within first 30 minutes." 
  },
  { 
    id: 105, 
    symbol: "BANKNIFTY 51900 PE", 
    optionType: "PUT", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-27T09:05:00", 
    exitDatetime: "2026-08-27T09:18:00", 
    duration: "13 mins", 
    entryPrice: 205.29, 
    exitPrice: 200.00, 
    targetPrice: 180.00, 
    stopLoss: 200.00, 
    quantity: 1, 
    lotSize: 35, 
    grossPnl: -129.00, 
    taxesAndCharges: 56.00, 
    netPnl: -185.00, 
    closeReason: "STOP_LOSS_HIT", 
    strategyTag: "Resistance Rejection Fade", 
    strategyTags: "Resistance Rejection Fade", 
    mistakeTags: "Counter-Trend Entry", 
    confidenceScore: 6, 
    followedPlan: true, 
    catalyst: "Tried to catch falling knife at opening low support.", 
    executionDetails: "Cut immediately as support broke; adhered strictly to 1% capital preservation rule.", 
    mindsetEmotion: "Controlled Reaction", 
    lessonsLearned: "Never fight opening momentum without institutional absorption signature." 
  },
  { 
    id: 106, 
    symbol: "NIFTY 24200 CE", 
    optionType: "CALL", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-26T14:15:00", 
    exitDatetime: "2026-08-26T14:45:00", 
    duration: "30 mins", 
    entryPrice: 86.33, 
    exitPrice: 95.00, 
    targetPrice: 95.00, 
    stopLoss: 70.00, 
    quantity: 1, 
    lotSize: 75, 
    grossPnl: 706.00, 
    taxesAndCharges: 56.00, 
    netPnl: 650.00, 
    closeReason: "TARGET_HIT", 
    strategyTag: "15m VWAP Retest", 
    strategyTags: "15m VWAP Retest", 
    mistakeTags: "None", 
    confidenceScore: 10, 
    followedPlan: true, 
    catalyst: "2:00 PM institutional short-covering rally across Nifty banking and auto heavyweights.", 
    executionDetails: "Perfect 5m EMA retest entry; captured massive +8.67 pts directly into R:R 1:2.8 target.", 
    mindsetEmotion: "Flow State", 
    lessonsLearned: "Afternoon trend days provide the cleanest trending option scalps." 
  },
  { 
    id: 107, 
    symbol: "BANKNIFTY 52100 PE", 
    optionType: "PUT", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-25T13:30:00", 
    exitDatetime: "2026-08-25T13:50:00", 
    duration: "20 mins", 
    entryPrice: 247.85, 
    exitPrice: 240.00, 
    targetPrice: 205.00, 
    stopLoss: 240.00, 
    quantity: 1, 
    lotSize: 35, 
    grossPnl: -219.00, 
    taxesAndCharges: 56.00, 
    netPnl: -275.00, 
    closeReason: "STOP_LOSS_HIT", 
    strategyTag: "Expiry Zero Hero", 
    strategyTags: "Expiry Zero Hero", 
    mistakeTags: "Mid-Day Slump Trade", 
    confidenceScore: 5, 
    followedPlan: true, 
    catalyst: "Range compression squeeze false alarm between 1:00 PM and 2:00 PM.", 
    executionDetails: "Strict stop loss triggered; prevented -₹1,200 drawdown by exiting instantly without hope mode.", 
    mindsetEmotion: "Disciplined Acceptance", 
    lessonsLearned: "Avoid trading in low-volume lunch chop zone (12:30 - 1:45 PM)." 
  },
  { 
    id: 108, 
    symbol: "NIFTY 24400 CE", 
    optionType: "CALL", 
    direction: "LONG", 
    tradeType: "INTRADAY", 
    entryDatetime: "2026-08-24T11:10:00", 
    exitDatetime: "2026-08-24T11:32:00", 
    duration: "22 mins", 
    entryPrice: 76.70, 
    exitPrice: 80.00, 
    targetPrice: 80.00, 
    stopLoss: 62.00, 
    quantity: 1, 
    lotSize: 75, 
    grossPnl: 303.25, 
    taxesAndCharges: 56.00, 
    netPnl: 247.25, 
    closeReason: "TARGET_HIT", 
    strategyTag: "EMA Trend Pullback", 
    strategyTags: "EMA Trend Pullback", 
    mistakeTags: "None", 
    confidenceScore: 8, 
    followedPlan: true, 
    catalyst: "Nifty tested morning VWAP anchor and printed a strong bullish pinbar on 5m chart.", 
    executionDetails: "Limit fill at VWAP band; captured +3.30 pts into quick scalp target.", 
    mindsetEmotion: "Relaxed & Focused", 
    lessonsLearned: "Anchored VWAP bounces offer unmatched risk-reward precision." 
  }
];

export const INITIAL_CLOSED_ALERTS = MASTER_INITIAL_TRADES;
export const INITIAL_JOURNAL_TRADES = MASTER_INITIAL_TRADES;

export function getStockMeta(symbol) {
  if (INDIAN_STOCK_META[symbol]) return INDIAN_STOCK_META[symbol];
  const clean = symbol.replace(/\.(NS|BO)$/, "");
  return {
    name: clean,
    sector: "Equity / ETF",
    color: "#00d5ff",
    tag: "NSE Stock",
    price: 850.00,
    change: 4.50,
    changePct: 0.53
  };
}

export const useTradingStore = create((set, get) => ({
  // Navigation & Core State (Deep-Linked via URL)
  activeView: getViewFromUrl(), // "dashboard" | "paper" | "journal" | "foreign"
  setActiveView: (view, shouldSyncUrl = true) => {
    set({ activeView: view });
    if (shouldSyncUrl) {
      syncUrlWithView(view);
    }
  },

  // Watchlist & Search
  watchlistSymbols: (() => {
    try {
      const saved = localStorage.getItem("portfolio-watchlist");
      return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
    } catch {
      return DEFAULT_WATCHLIST;
    }
  })(),
  activeSectorFilter: "all",
  setActiveSectorFilter: (filter) => set({ activeSectorFilter: filter }),
  addWatchSymbol: (symbol) => {
    const clean = symbol.toUpperCase().endsWith(".NS") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    const list = get().watchlistSymbols;
    if (!list.includes(clean)) {
      const next = [clean, ...list];
      set({ watchlistSymbols: next });
      try { localStorage.setItem("portfolio-watchlist", JSON.stringify(next)); } catch {}
    }
  },
  removeWatchSymbol: (symbol) => {
    const next = get().watchlistSymbols.filter((s) => s !== symbol);
    set({ watchlistSymbols: next });
    try { localStorage.setItem("portfolio-watchlist", JSON.stringify(next)); } catch {}
  },
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Global Drawers & Modals
  isRosettaOpen: false,
  rosettaActiveTopic: null,
  setRosettaOpen: (open) => set({ isRosettaOpen: open }),
  openRosettaWithTopic: (topicId) => set({ isRosettaOpen: true, rosettaActiveTopic: topicId }),
  isShortcutsOpen: false,
  setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  isSafetyGuardModalOpen: false,
  setSafetyGuardModalOpen: (open) => set({ isSafetyGuardModalOpen: open }),
  isCustomTradeModalOpen: false,
  setCustomTradeModalOpen: (open) => set({ isCustomTradeModalOpen: open }),

  // Theme State
  activeTheme: "blue", // "blue" | "emerald" | "violet" | "custom"
  setTheme: (theme) => {
    set({ activeTheme: theme });
    document.documentElement.dataset.theme = theme;
  },
  customThemeColors: {
    accent: "#00d5ff",
    bg: "#020812",
    panel: "#061423"
  },
  setCustomColor: (key, val) => {
    const next = { ...get().customThemeColors, [key]: val };
    set({ customThemeColors: next, activeTheme: "custom" });
    document.documentElement.style.setProperty(`--theme-custom-${key}`, val);
    document.documentElement.dataset.theme = "custom";
  },

  // Dual Broker Hub Status
  brokerStatus: {
    kiteConnected: true,
    upstoxConnected: true,
    feedLatencyMs: 18,
    upstoxExpiry: "2026-08-29T23:59:59Z"
  },
  setBrokerStatus: (status) => set((state) => ({
    brokerStatus: { ...state.brokerStatus, ...status }
  })),

  // Wealth View Persistence
  wealthTimeframe: (() => {
    try {
      return localStorage.getItem("portfolio-wealth-timeframe") || "1M";
    } catch {
      return "1M";
    }
  })(),
  wealthViewMode: (() => {
    try {
      return localStorage.getItem("portfolio-wealth-viewmode") || "total";
    } catch {
      return "total";
    }
  })(),
  setWealthTimeframe: (tf) => {
    set({ wealthTimeframe: tf });
    try { localStorage.setItem("portfolio-wealth-timeframe", tf); } catch {}
  },
  setWealthViewMode: (mode) => {
    set({ wealthViewMode: mode });
    try { localStorage.setItem("portfolio-wealth-viewmode", mode); } catch {}
  },

  // Streamer P&L Privacy Mode
  isPrivacyMode: (() => {
    try {
      return localStorage.getItem("portfolio-privacy-mode") === "true";
    } catch {
      return false;
    }
  })(),
  togglePrivacyMode: () => {
    const next = !get().isPrivacyMode;
    set({ isPrivacyMode: next });
    try {
      localStorage.setItem("portfolio-privacy-mode", String(next));
    } catch {}
  },

  // 1-Click Watchlist -> OrderPad Deployment Bridge
  orderPadPreFill: null,
  setOrderPadPreFill: (data) => set({ orderPadPreFill: data }),

  // ==========================================
  // UNIFIED MASTER TRADE DATABASE & SYNC STORE
  // ==========================================
  masterTrades: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      return saved ? JSON.parse(saved) : MASTER_INITIAL_TRADES;
    } catch {
      return MASTER_INITIAL_TRADES;
    }
  })(),

  // Reactive synchronizers for backwards compatibility
  closedAlerts: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      return saved ? JSON.parse(saved) : MASTER_INITIAL_TRADES;
    } catch {
      return MASTER_INITIAL_TRADES;
    }
  })(),

  journalTrades: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      return saved ? JSON.parse(saved) : MASTER_INITIAL_TRADES;
    } catch {
      return MASTER_INITIAL_TRADES;
    }
  })(),

  // ==========================================
  // VIEW 2: PRACTICE LAB / OPTIONS DESK STATE
  // ==========================================
  startingCapital: 100000.0,
  openAlerts: (() => {
    try {
      const saved = localStorage.getItem("portfoliox_open_alerts");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return [];
    } catch {
      return [];
    }
  })(),
  feedMode: "LIVE", // "LIVE" | "MANUAL"
  setFeedMode: (mode) => set({ feedMode: mode }),
  strategyMode: "NAKED", // "NAKED" | "SPREAD"
  setStrategyMode: (mode) => set({ strategyMode: mode }),
  simulateSlippage: true, // Default ON for realistic institutional fill training
  setSimulateSlippage: (enabled) => set({ simulateSlippage: enabled }),
  paperPnlRange: "week", // "week" | "last_week" | "month" | "all"
  setPaperPnlRange: (range) => set({ paperPnlRange: range }),
  paperLedgerFilter: "all", // "all" | "win" | "loss"
  setPaperLedgerFilter: (filter) => set({ paperLedgerFilter: filter }),
  deployToast: null,
  setDeployToast: (toast) => set({ deployToast: toast }),
  settlementToast: null,
  setSettlementToast: (toast) => set({ settlementToast: toast }),

  // Practice Order Actions with Idempotency Key Guard & Non-Blocking SQLite Dual-Sync
  deployPracticeTrade: (trade) => {
    const idempotencyKey = trade.idempotencyKey || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const existing = get().openAlerts.find((t) => t.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const shouldSlippage = get().simulateSlippage;
    const baseEntry = Number(trade.entryPrice || 0);
    // Realistic Ask fill spread penalty (+0.2% to +0.4% on market buy)
    const entryFillPrice = shouldSlippage 
      ? Number((baseEntry * (1 + (0.002 + Math.random() * 0.0025))).toFixed(2))
      : baseEntry;
    const entrySlippage = Math.max(0, entryFillPrice - baseEntry);

    const newTrade = {
      id: Date.now(),
      idempotencyKey,
      entryDatetime: new Date().toISOString(),
      plannedEntryPrice: baseEntry,
      entryPrice: entryFillPrice,
      lastMarkPrice: entryFillPrice,
      entrySlippage: Number(entrySlippage.toFixed(2)),
      ...trade,
      entryPrice: entryFillPrice // Ensure realistic fill is recorded
    };
    const nextAlerts = [newTrade, ...get().openAlerts];
    set({ openAlerts: nextAlerts, deployToast: newTrade });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts));
    } catch {}

    // 🚀 Non-blocking optimistic background sync to SQLite (0ms UI latency)
    try {
      fetch("/api/paper-lab/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newTrade.symbol,
          underlyingSymbol: newTrade.underlyingSymbol || (newTrade.symbol.includes("BANK") ? "BANKNIFTY" : "NIFTY"),
          strikePrice: newTrade.strikePrice || Number((newTrade.symbol.match(/\d+/) || [24000])[0]),
          entryPrice: newTrade.entryPrice,
          targetPrice: newTrade.targetPrice,
          stopLoss: newTrade.stopLoss,
          quantity: newTrade.quantity || 1,
          lotSize: newTrade.lotSize,
          optionType: newTrade.optionType,
          tradeType: newTrade.tradeType || "INTRADAY",
          direction: newTrade.direction || "LONG",
          feedMode: get().feedMode || "LIVE",
          strategyTags: [newTrade.strategyTag || "Practice Scalp"],
          personalNotes: newTrade.personalNotes || newTrade.catalyst || "Practice Scalp Order"
        })
      })
      .then((r) => r.json())
      .then((res) => {
        if (res?.item?.id) {
          set((state) => ({
            openAlerts: state.openAlerts.map((t) =>
              t.id === newTrade.id ? { ...t, serverId: res.item.id, tokenKey: res.item.tokenKey } : t
            ),
          }));
        }
      })
      .catch(() => {});
    } catch {}

    return newTrade;
  },

  autoDeployCopilotTrade: (params = {}) => {
    const underlying = params.underlying || "NIFTY";
    const strikePrice = params.strikePrice || (underlying === "BANKNIFTY" ? 57200 : 24500);
    const optionType = params.optionType || "CALL";
    const entryPrice = params.entryPrice || (underlying === "BANKNIFTY" ? 180.0 : 85.0);
    const stopLoss = params.stopLoss || (underlying === "BANKNIFTY" ? 160.0 : 75.0);
    const targetPrice = params.targetPrice || (underlying === "BANKNIFTY" ? 230.0 : 105.0);
    const quantity = params.lots || 1;
    const lotSize = resolveIndexLotSize(underlying);
    const symbol = `${underlying} ${strikePrice} ${optionType === "CALL" ? "CE" : "PE"}`;

    return get().deployPracticeTrade({
      symbol,
      underlyingSymbol: underlying,
      strikePrice,
      optionType,
      entryPrice,
      stopLoss,
      targetPrice,
      quantity,
      lotSize,
      feedMode: "LIVE",
      strategyMode: "NAKED",
      entryReason: `Copilot Prime 1-Click Scalp · R:R 1:${((targetPrice - entryPrice) / Math.max(1, entryPrice - stopLoss)).toFixed(2)}`,
      personalNotes: `Live ${underlying} ATM Scalp execution`
    });
  },

  squareOffTrade: (id, customExitPrice) => {
    const trade = get().openAlerts.find((t) => t.id === id);
    if (!trade) return;
    const baseExitPrice = customExitPrice ?? trade.lastMarkPrice ?? trade.entryPrice;
    // Realistic market bid exit spread penalty (-0.2% to -0.4% below current mark)
    const shouldSlippage = get().simulateSlippage;
    const exitPrice = shouldSlippage 
      ? Math.max(0.05, baseExitPrice * (1 - (0.002 + Math.random() * 0.0025)))
      : Math.max(0.05, baseExitPrice);
    
    const resolvedLot = resolveIndexLotSize(trade.symbol, trade.lotSize);
    const totalQty = resolvedLot * (trade.quantity || 1);
    const isShort = trade.direction === "SHORT";
    const grossPnl = isShort 
      ? (trade.entryPrice - exitPrice) * totalQty 
      : (exitPrice - trade.entryPrice) * totalQty;
    const friction = calculateStatutoryCharges(trade.entryPrice, exitPrice, totalQty);
    const netPnl = grossPnl - friction;
    const exitSlippageCost = shouldSlippage ? Math.max(0, (baseExitPrice - exitPrice) * totalQty) : 0;
    const totalSlippageCost = (trade.entrySlippage ? trade.entrySlippage * totalQty : 0) + exitSlippageCost;

    const exitDatetime = new Date().toISOString();
    const tradeDuration = calculateTradeDuration(trade.entryDatetime, exitDatetime);

    const closed = {
      id: Date.now(),
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
      direction: "LONG",
      tradeType: "INTRADAY",
      entryDatetime: trade.entryDatetime || new Date().toISOString(),
      exitDatetime,
      duration: tradeDuration,
      entryPrice: trade.entryPrice,
      exitPrice: Number(exitPrice.toFixed(2)),
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      quantity: trade.quantity || 1,
      lotSize: resolvedLot,
      grossPnl: Number(grossPnl.toFixed(2)),
      taxesAndCharges: friction,
      slippageCost: Number(totalSlippageCost.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      closeReason: netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT",
      strategyTag: trade.entryReason || "Manual Practice Scalp",
      strategyTags: trade.entryReason || "Manual Practice Scalp",
      mistakeTags: netPnl >= 0 ? "None" : "Execution Deviation",
      confidenceScore: 8,
      followedPlan: true,
      catalyst: trade.personalNotes || "Live desk order book momentum scalp.",
      executionDetails: `Executed at ₹${trade.entryPrice}, squared off at ₹${exitPrice.toFixed(2)}. Net P&L: ${netPnl >= 0 ? "+" : ""}₹${netPnl.toFixed(2)} (Friction: ₹${friction} · Slippage: ₹${totalSlippageCost.toFixed(1)}).`,
      mindsetEmotion: netPnl >= 0 ? "Disciplined Execution" : "Controlled Exit",
      lessonsLearned: "Exited at predetermined target/stop cleanly with zero tilt."
    };

    const next = [closed, ...get().masterTrades];
    const nextAlerts = get().openAlerts.filter((t) => t.id !== id);
    set({
      openAlerts: nextAlerts,
      masterTrades: next,
      closedAlerts: next,
      journalTrades: next,
      settlementToast: closed
    });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts));
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}

    // 🚀 Non-blocking optimistic background close sync to SQLite
    try {
      fetch(`/api/paper-lab/trades/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(exitPrice.toFixed(2)),
          reason: netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"
        })
      }).catch(() => {});
    } catch {}

    return closed;
  },

  squareOffAlert: (id, customExitPrice) => {
    return get().squareOffTrade(id, customExitPrice);
  },

  squareOffAll: () => {
    const opens = get().openAlerts;
    opens.forEach((trade) => get().squareOffTrade(trade.id));
    set({ openAlerts: [] });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify([]));
      fetch("/api/paper-lab/square-off-all", { method: "POST" }).catch(() => {});
    } catch {}
  },

  trailStopLoss: (id, newSl) => {
    const val = Number(newSl);
    const updated = get().openAlerts.map((t) => t.id === id ? { ...t, stopLoss: val } : t);
    set({ openAlerts: updated });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopLoss: val })
      }).catch(() => {});
    } catch {}
  },

  adjustStopLoss: (id, delta) => {
    let finalSl = null;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const currentSl = Number(t.stopLoss || 0);
        const currentTp = Number(t.targetPrice || 999999);
        const rawNewSl = currentSl + delta;
        const newSl = Math.min(currentTp - 1.0, Math.max(0.05, rawNewSl));
        finalSl = Number(newSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });
    set({ openAlerts: updated });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      if (finalSl !== null) {
        debounceNetworkSync(`trade_${id}_sl`, () => {
          fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stopLoss: finalSl })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
  },

  setBreakevenSL: (id) => {
    let finalSl = null;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const entry = Number(t.entryPrice || 0);
        const currentTp = Number(t.targetPrice || 999999);
        const safeSl = Math.min(currentTp - 1.0, entry);
        finalSl = Number(safeSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });
    set({ openAlerts: updated });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      if (finalSl !== null) {
        debounceNetworkSync(`trade_${id}_sl`, () => {
          fetch(`/api/paper-lab/trades/${id}/stop-loss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stopLoss: finalSl })
          }).catch(() => {});
        }, 100);
      }
    } catch {}
  },

  updateTargetPrice: (id, newTp) => {
    const val = Number(newTp);
    const updated = get().openAlerts.map((t) => t.id === id ? { ...t, targetPrice: val } : t);
    set({ openAlerts: updated });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      debounceNetworkSync(`trade_${id}_target`, () => {
        fetch(`/api/paper-lab/trades/${id}/target`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPrice: val })
        }).catch(() => {});
      }, 300);
    } catch {}
  },

  adjustTargetPrice: (id, delta) => {
    let finalTp = null;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const currentTp = Number(t.targetPrice || 0);
        const currentSl = Number(t.stopLoss || 0);
        // Clamp: Target Price cannot drop below Stop Loss + 1.0 pt
        const rawNewTp = currentTp + delta;
        const newTp = Math.max(currentSl + 1.0, Math.max(0.05, rawNewTp));
        finalTp = Number(newTp.toFixed(2));
        return { ...t, targetPrice: finalTp };
      }
      return t;
    });
    set({ openAlerts: updated });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updated));
      if (finalTp !== null) {
        debounceNetworkSync(`trade_${id}_target`, () => {
          fetch(`/api/paper-lab/trades/${id}/target`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPrice: finalTp })
          }).catch(() => {});
        }, 300);
      }
    } catch {}
  },

  // ==========================================
  // VIEW 4: PRO TRADING JOURNAL & PERFORMANCE STUDIO GLOBAL TIMEFRAME STATE
  // ==========================================
  isTimeframeLocked: true, // 🔗 Global Timeframe Synchronization Switch (Level 3 Elite)
  toggleTimeframeLock: () => set((state) => ({ isTimeframeLocked: !state.isTimeframeLocked })),
  setTimeframeLock: (val) => set({ isTimeframeLocked: Boolean(val) }),
  paperPnlRange: "all", // "all" | "today" | "week" | "month" | "custom"
  journalRange: "all", // "all" | "today" | "week" | "month" | "custom"
  journalCustomStart: new Date().toISOString().split("T")[0],
  journalCustomEnd: new Date().toISOString().split("T")[0],
  setPaperPnlRange: (range) => set((state) => {
    if (state.isTimeframeLocked) {
      return { paperPnlRange: range, journalRange: range };
    }
    return { paperPnlRange: range };
  }),
  setJournalRange: (range) => set((state) => {
    if (state.isTimeframeLocked) {
      return { paperPnlRange: range, journalRange: range };
    }
    return { journalRange: range };
  }),
  setJournalCustomRange: (start, end) => set((state) => {
    if (state.isTimeframeLocked) {
      return { 
        journalCustomStart: start, 
        journalCustomEnd: end, 
        journalRange: "custom",
        paperPnlRange: "custom"
      };
    }
    return { 
      journalCustomStart: start, 
      journalCustomEnd: end, 
      journalRange: "custom",
    };
  }),
  journalFilter: "ALL", // "ALL" | "WIN" | "LOSS" | "BREAKEVEN"
  setJournalFilter: (filter) => set({ journalFilter: filter }),
  selectedStrategyFilter: null,
  setSelectedStrategyFilter: (strategyName) => set((state) => ({ 
    selectedStrategyFilter: state.selectedStrategyFilter === strategyName ? null : strategyName 
  })),
  clearSelectedStrategyFilter: () => set({ selectedStrategyFilter: null }),

  logJournalTrade: (trade) => {
    const newEntry = {
      id: Date.now(),
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol?.includes("PE") ? "PUT" : "CALL"),
      direction: trade.direction || "LONG",
      tradeType: trade.tradeType || "INTRADAY",
      entryDatetime: trade.entryDatetime || new Date().toISOString(),
      exitDatetime: trade.exitDatetime || new Date().toISOString(),
      duration: trade.duration || "15 mins",
      entryPrice: Number(trade.entryPrice || 0),
      exitPrice: Number(trade.exitPrice || 0),
      targetPrice: Number(trade.targetPrice || trade.entryPrice * 1.1),
      stopLoss: Number(trade.stopLoss || trade.entryPrice * 0.9),
      quantity: Number(trade.quantity || 1),
      lotSize: Number(trade.lotSize || 65),
      grossPnl: Number(trade.grossPnl || trade.netPnl || 0),
      taxesAndCharges: Number(trade.taxesAndCharges || 56.0),
      netPnl: Number(trade.netPnl || 0),
      closeReason: trade.closeReason || (trade.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      strategyTag: trade.strategyTags || trade.strategyTag || "Manual Journal Scalp",
      strategyTags: trade.strategyTags || trade.strategyTag || "Manual Journal Scalp",
      mistakeTags: trade.mistakeTags || "None",
      confidenceScore: Number(trade.confidenceScore || 8),
      followedPlan: trade.followedPlan ?? true,
      catalyst: trade.catalyst || "Technical chart breakout pattern with volume confirmation.",
      executionDetails: trade.executionDetails || "Executed trade as per predefined trade plan.",
      mindsetEmotion: trade.mindsetEmotion || "Disciplined & Patient",
      lessonsLearned: trade.lessonsLearned || "Followed execution rules with zero hesitation."
    };
    const next = [newEntry, ...get().masterTrades];
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
  },

  // Global Cross-Route Undo Engine
  undoTradeBackup: null,
  undoCountdown: 5,
  undoTimerHandle: null,
  undoIntervalHandle: null,

  deleteJournalTradeWithUndo: (trade) => {
    const tradeObj = typeof trade === "object" ? trade : get().masterTrades.find((t) => t.id === trade);
    if (!tradeObj) return;

    const { undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);

    get().deleteJournalTrade(tradeObj.id);

    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        set({ undoTradeBackup: null, undoCountdown: 5, undoIntervalHandle: null });
      } else {
        set({ undoCountdown: count });
      }
    }, 1000);

    const timer = setTimeout(() => {
      set({ undoTradeBackup: null, undoCountdown: 5, undoTimerHandle: null });
    }, 5000);

    set({
      undoTradeBackup: tradeObj,
      undoCountdown: 5,
      undoTimerHandle: timer,
      undoIntervalHandle: interval
    });
  },

  executeUndoTrade: () => {
    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTradeBackup) {
      get().logJournalTrade(undoTradeBackup);
      if (undoTimerHandle) clearTimeout(undoTimerHandle);
      if (undoIntervalHandle) clearInterval(undoIntervalHandle);
      set({
        undoTradeBackup: null,
        undoCountdown: 5,
        undoTimerHandle: null,
        undoIntervalHandle: null
      });
      return true;
    }
    return false;
  },

  dismissUndoTrade: () => {
    const { undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);
    set({
      undoTradeBackup: null,
      undoCountdown: 5,
      undoTimerHandle: null,
      undoIntervalHandle: null
    });
  },

  deleteJournalTrade: (id) => {
    const next = get().masterTrades.filter((t) => t.id !== id && t.id !== String(id));
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
  },

  bulkAddJournalTrades: (trades) => {
    const enriched = trades.map((t, idx) => ({
      id: t.id || Date.now() + idx,
      symbol: t.symbol || "NIFTY 24300 CE",
      optionType: t.optionType || (t.symbol?.includes("PE") ? "PUT" : "CALL"),
      direction: t.direction || "LONG",
      tradeType: t.tradeType || "INTRADAY",
      entryDatetime: t.entryDatetime || new Date().toISOString(),
      exitDatetime: t.exitDatetime || new Date().toISOString(),
      duration: t.duration || "15 mins",
      entryPrice: Number(t.entryPrice || 100),
      exitPrice: Number(t.exitPrice || 110),
      targetPrice: Number(t.targetPrice || 110),
      stopLoss: Number(t.stopLoss || 90),
      quantity: Number(t.quantity || 1),
      lotSize: Number(t.lotSize || 65),
      grossPnl: Number(t.grossPnl || t.netPnl || 0),
      taxesAndCharges: Number(t.taxesAndCharges || 56.0),
      netPnl: Number(t.netPnl || 0),
      closeReason: t.closeReason || (t.netPnl >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      strategyTag: t.strategyTags || t.strategyTag || "Imported Trade",
      strategyTags: t.strategyTags || t.strategyTag || "Imported Trade",
      mistakeTags: t.mistakeTags || "None",
      confidenceScore: Number(t.confidenceScore || 8),
      followedPlan: t.followedPlan ?? true,
      catalyst: t.catalyst || "Imported setup catalyst.",
      executionDetails: t.executionDetails || "Imported execution log.",
      mindsetEmotion: t.mindsetEmotion || "Neutral",
      lessonsLearned: t.lessonsLearned || "Imported historical log."
    }));
    const next = [...enriched, ...get().masterTrades];
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
  },

  resetJournalTrades: () => {
    set({ masterTrades: MASTER_INITIAL_TRADES, closedAlerts: MASTER_INITIAL_TRADES, journalTrades: MASTER_INITIAL_TRADES });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(MASTER_INITIAL_TRADES));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(MASTER_INITIAL_TRADES));
    } catch {}
  },

  restoreTradingBrain: (trades) => {
    if (!Array.isArray(trades) || trades.length === 0) return false;
    set({ masterTrades: trades, closedAlerts: trades, journalTrades: trades });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(trades));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(trades));
    } catch {}
    return true;
  },

  getPortfolioTelemetry: () => {
    const state = get();
    const startingCapital = Number(state.startingCapital || 100000);
    const closed = state.closedAlerts || [];
    const open = state.openAlerts || [];

    const totalRealizedPnl = closed.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const totalOpenPnl = open.reduce((acc, t) => {
      const mark = Number(t.lastMarkPrice ?? t.entryPrice ?? 0);
      const entry = Number(t.entryPrice ?? 0);
      const lot = resolveIndexLotSize(t.symbol, t.lotSize);
      const qty = Number(t.quantity || 1);
      const diff = t.optionType === "PUT" || t.symbol?.includes("PE") ? (entry - mark) : (mark - entry);
      return acc + (diff * lot * qty);
    }, 0);

    const netPnl = totalRealizedPnl + totalOpenPnl;
    const currentAccountValue = startingCapital + netPnl;
    const pnlPct = startingCapital > 0 ? ((netPnl / startingCapital) * 100).toFixed(2) : "0.00";

    const winCount = closed.filter((t) => Number(t.netPnl || 0) > 0).length;
    const lossCount = closed.filter((t) => Number(t.netPnl || 0) <= 0).length;
    const totalClosed = closed.length;
    const winRateNum = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0.0;
    const winRate = winRateNum.toFixed(1);

    return {
      startingCapital,
      currentAccountValue,
      totalRealizedPnl,
      totalOpenPnl,
      netPnl,
      pnlPct,
      winCount,
      lossCount,
      totalClosed,
      winRateNum,
      winRate,
      openCount: open.length
    };
  }
}));

// Cross-Tab Storage Event Synchronization (Zero-Lag Multi-Monitor Sync)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "portfoliox_open_alerts" && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          useTradingStore.setState({ openAlerts: parsed });
        }
      } catch {}
    }
    if ((event.key === "portfolio-master-trades" || event.key === "portfolio-journal-trades") && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          useTradingStore.setState({ masterTrades: parsed, closedAlerts: parsed, journalTrades: parsed });
        }
      } catch {}
    }
    if (event.key === "portfolio_starting_capital" && event.newValue) {
      const val = Number(event.newValue);
      if (!isNaN(val) && val > 0) {
        useTradingStore.setState({ startingCapital: val });
      }
    }
  });
}
