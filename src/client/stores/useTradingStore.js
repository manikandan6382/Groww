import { create } from "zustand";
import { getViewFromUrl, syncUrlWithView } from "../utils/urlRouter";
import { calculateTradeDuration, getLocalDateKey } from "../utils/dateUtils";
import { resolveNextExpiryDate } from "../utils/expiryUtils";

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

// In-Memory Execution Lock (Prevents race conditions between browser tick and backend daemon)
const activeSquaringOffIds = new Set();

// Persistent Deletion Set & Backend Sync Engine (Guarantees deleted trades never resurrect)
const deletedTradeIdSet = new Set((() => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("portfoliox_deleted_trade_ids") : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})());

function persistDeletedTradeId(id) {
  if (id === undefined || id === null) return;
  deletedTradeIdSet.add(String(id));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("portfoliox_deleted_trade_ids", JSON.stringify([...deletedTradeIdSet]));
    }
  } catch {}
}

function removeDeletedTradeId(id) {
  if (id === undefined || id === null) return;
  deletedTradeIdSet.delete(String(id));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("portfoliox_deleted_trade_ids", JSON.stringify([...deletedTradeIdSet]));
    }
  } catch {}
}

async function commitTradeDeletionToBackend(id) {
  if (id === undefined || id === null) return;
  try {
    const paperRes = await fetch(`/api/paper-lab/trades/${id}`, { method: "DELETE" });
    if (!paperRes.ok) {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
    }
  } catch {
    try {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
    } catch {}
  }
}

// Client-to-Server Trade ID Resolution Map & Pending Mutation Queue
const tradeIdMap = new Map();
const pendingPartialCloseQueue = new Map();

function flushPendingPartialClose(localId, serverId) {
  if (pendingPartialCloseQueue.has(localId)) {
    const payload = pendingPartialCloseQueue.get(localId);
    pendingPartialCloseQueue.delete(localId);
    fetch(`/api/paper-lab/trades/${serverId}/partial-close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
}

// Cross-Tab Broadcast Channel (Synchronizes order execution & state across tabs/monitors)
const tradeBroadcastChannel = typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined"
  ? new window.BroadcastChannel("portfoliox_trades_channel")
  : null;

function broadcastTradeAction(action, payload = {}) {
  try {
    tradeBroadcastChannel?.postMessage({ action, payload, timestamp: Date.now() });
  } catch {}
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
  if (sym.includes("SENSEX")) return 20;
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
    expiryDatetime: "2026-08-28T15:30:00+05:30",
    expiryDate: "2026-08-28",
    expirySpot: 24285.50,
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
    expiryDatetime: "2026-08-28T15:30:00+05:30",
    expiryDate: "2026-08-28",
    expirySpot: 52280.00,
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
    expiryDatetime: "2026-08-28T15:30:00+05:30",
    expiryDate: "2026-08-28",
    expirySpot: 24190.00,
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
    expiryDatetime: "2026-08-27T15:30:00+05:30",
    expiryDate: "2026-08-27",
    expirySpot: 24180.00,
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
    expiryDatetime: "2026-08-27T15:30:00+05:30",
    expiryDate: "2026-08-27",
    expirySpot: 52150.00,
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
    expiryDatetime: "2026-08-27T15:30:00+05:30",
    expiryDate: "2026-08-27",
    expirySpot: 24310.00,
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
    expiryDatetime: "2026-08-26T15:30:00+05:30",
    expiryDate: "2026-08-26",
    expirySpot: 52350.00,
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
    expiryDatetime: "2026-08-27T15:30:00+05:30",
    expiryDate: "2026-08-27",
    expirySpot: 24360.00,
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

  // ⚡ Daily Scalp Quota & Psychological Cooling Vault (Anti-Tilt Hardening & Testing Mode)
  dailyQuotaLimit: 3,
  testingMode: (() => {
    try {
      return localStorage.getItem("finance_testing_mode") === "true";
    } catch {}
    return false;
  })(),
  dailyQuotaBypass: (() => {
    try {
      return localStorage.getItem("finance_testing_mode") === "true" || localStorage.getItem("finance_daily_quota_bypass") === "true";
    } catch {}
    return false;
  })(),
  coolingVaultUnlockTime: (() => {
    try {
      const stored = localStorage.getItem("finance_cooling_vault_unlock_time");
      if (stored) {
        const time = parseInt(stored, 10);
        if (time && time > Date.now()) return time;
        localStorage.removeItem("finance_cooling_vault_unlock_time");
      }
    } catch {}
    return null;
  })(),
  setDailyQuotaBypass: (bypass) => {
    const shouldBypass = Boolean(bypass);
    try {
      if (shouldBypass) {
        localStorage.setItem("finance_daily_quota_bypass", "true");
      } else {
        localStorage.removeItem("finance_daily_quota_bypass");
      }
    } catch {}
    set({ dailyQuotaBypass: shouldBypass });
  },
  setTestingMode: (enabled) => {
    const isTesting = Boolean(enabled);
    try {
      if (isTesting) {
        localStorage.setItem("finance_testing_mode", "true");
        localStorage.setItem("finance_daily_quota_bypass", "true");
      } else {
        localStorage.removeItem("finance_testing_mode");
        localStorage.removeItem("finance_daily_quota_bypass");
      }
    } catch {}
    set({ 
      testingMode: isTesting, 
      dailyQuotaBypass: isTesting,
      coolingVaultUnlockTime: isTesting ? null : get().coolingVaultUnlockTime 
    });
  },
  toggleTestingMode: () => {
    const current = Boolean(get().testingMode);
    get().setTestingMode(!current);
  },
  requestCoolingVaultUnlock: () => {
    const unlockTime = Date.now() + 15 * 60 * 1000;
    try {
      localStorage.setItem("finance_cooling_vault_unlock_time", String(unlockTime));
    } catch {}
    set({ coolingVaultUnlockTime: unlockTime, dailyQuotaBypass: false });
  },
  cancelCoolingVault: () => {
    try {
      localStorage.removeItem("finance_cooling_vault_unlock_time");
    } catch {}
    set({ coolingVaultUnlockTime: null, dailyQuotaBypass: false });
  },
  claimCoolingVaultUnlock: () => {
    try {
      localStorage.removeItem("finance_cooling_vault_unlock_time");
      localStorage.setItem("finance_daily_quota_bypass", "true");
    } catch {}
    set({ coolingVaultUnlockTime: null, dailyQuotaBypass: true });
  },
  getTodayTradesCount: () => {
    const todayKey = getLocalDateKey(new Date());
    const openCount = (get().openAlerts || []).filter(t => t.entryDatetime && getLocalDateKey(new Date(t.entryDatetime)) === todayKey).length;
    const closedCount = (get().masterTrades || []).filter(t => t.entryDatetime && getLocalDateKey(new Date(t.entryDatetime)) === todayKey).length;
    return openCount + closedCount;
  },

  // Theme State
  activeTheme: typeof window !== "undefined" ? (localStorage.getItem("portfolio-theme") || "violet") : "violet",
  setTheme: (theme) => {
    set({ activeTheme: theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("portfolio-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.dataset.theme = theme;
    }
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

  // Option Outcome Simulator Interlink State
  simulatorActiveTradeId: null, // null (OrderPad Draft) | tradeId (Active Practice Trade)
  setSimulatorActiveTradeId: (id) => set({ simulatorActiveTradeId: id }),

  // Active Order Pad Contract Watched Live (Streams real-time Upstox ticks before deployment)
  activePadSymbol: "NIFTY 23450 PE",
  setActivePadSymbol: (symbol) => set((state) => (state.activePadSymbol !== symbol ? { activePadSymbol: symbol } : state)),
  activeHedgeSymbol: null,
  setActiveHedgeSymbol: (symbol) => set((state) => (state.activeHedgeSymbol !== symbol ? { activeHedgeSymbol: symbol } : state)),

  // Dual Broker Hub Status
  brokerStatus: {
    kiteConnected: true,
    upstoxConnected: true,
    feedLatencyMs: 18,
    upstoxExpiry: "2026-08-29T23:59:59Z"
  },
  setBrokerStatus: (status) => set((state) => {
    let changed = false;
    for (const k in status) {
      if (state.brokerStatus[k] !== status[k]) {
        changed = true;
        break;
      }
    }
    return changed ? { brokerStatus: { ...state.brokerStatus, ...status } } : state;
  }),

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
        }
      }
      return [];
    } catch {
      return [];
    }
  })(),

  // Reactive synchronizers for backwards compatibility
  closedAlerts: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
        }
      }
      return [];
    } catch {
      return [];
    }
  })(),

  journalTrades: (() => {
    try {
      const saved = localStorage.getItem("portfolio-master-trades") || localStorage.getItem("portfolio-journal-trades");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !deletedTradeIdSet.has(String(t.id)));
        }
      }
      return [];
    } catch {
      return [];
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
    // 🛡️ Atomic Store-Level Quota Gatekeeper (Prevents Concurrency/Double-Click Bypass)
    const isTesting = Boolean(get().testingMode);
    const currentTodayCount = typeof get().getTodayTradesCount === "function" ? get().getTodayTradesCount() : 0;
    if (currentTodayCount >= (get().dailyQuotaLimit || 3) && !get().dailyQuotaBypass && !isTesting) {
      console.warn("[Chaos Guard] Trade deployment blocked: Daily quota reached.");
      return null;
    }

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

    const entryDatetime = trade.entryDatetime || new Date().toISOString();
    let expiryDatetime = trade.expiryDatetime;
    if (!expiryDatetime) {
      try {
        expiryDatetime = resolveNextExpiryDate(trade.symbol, entryDatetime).toISOString();
      } catch {
        expiryDatetime = null;
      }
    }
    const expiryDate = trade.expiryDate || (expiryDatetime ? expiryDatetime.split("T")[0] : null);

    const newTrade = {
      id: Date.now(),
      idempotencyKey,
      entryDatetime,
      expiryDatetime,
      expiryDate,
      plannedEntryPrice: baseEntry,
      entryPrice: entryFillPrice,
      lastMarkPrice: entryFillPrice,
      entrySlippage: Number(entrySlippage.toFixed(2)),
      ...trade,
      entryPrice: entryFillPrice // Ensure realistic fill is recorded
    };
    const nextAlerts = [newTrade, ...get().openAlerts];
    if (get().dailyQuotaBypass || isTesting) {
      try { localStorage.removeItem("finance_cooling_vault_unlock_time"); } catch {}
    }
    set({ 
      openAlerts: nextAlerts, 
      deployToast: newTrade,
      dailyQuotaBypass: isTesting ? true : false,
      coolingVaultUnlockTime: null
    });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(nextAlerts));
    } catch {}

    // 🚀 Non-blocking optimistic background sync to SQLite (0ms UI latency)
    try {
      fetch("/api/paper-lab/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: newTrade.idempotencyKey,
          symbol: newTrade.symbol,
          underlyingSymbol: newTrade.underlyingSymbol || (newTrade.symbol.includes("SENSEX") ? "SENSEX" : newTrade.symbol.includes("BANK") ? "BANKNIFTY" : newTrade.symbol.includes("FIN") ? "FINNIFTY" : "NIFTY"),
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
          const authoritativeId = res.item.id;
          tradeIdMap.set(newTrade.id, authoritativeId);
          tradeIdMap.set(String(newTrade.id), authoritativeId);
          tradeIdMap.set(authoritativeId, authoritativeId);
          tradeIdMap.set(String(authoritativeId), authoritativeId);

          set((state) => {
            const updatedAlerts = state.openAlerts.map((t) =>
              t.id === newTrade.id
                ? { ...t, id: authoritativeId, serverId: authoritativeId, tokenKey: res.item.tokenKey }
                : t
            );
            try {
              localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updatedAlerts));
            } catch {}
            return { openAlerts: updatedAlerts };
          });
          flushPendingPartialClose(newTrade.id, authoritativeId);
          broadcastTradeAction("TRADE_CREATED", { id: authoritativeId });
          // ⚡ PROACTIVE SYNC: Immediately refresh closed and open trades from backend (Zero Lag)
          fetch("/api/paper-lab")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
              if (data?.openTrades) get().syncBackendOpenTrades(data.openTrades);
            })
            .catch(() => {});
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

  squareOffTrade: (id, customExitPrice, explicitReason) => {
    if (activeSquaringOffIds.has(id)) return;
    activeSquaringOffIds.add(id);
    setTimeout(() => activeSquaringOffIds.delete(id), 3000);

    const trade = get().openAlerts.find(
      (t) => t.id === id || t.serverId === id || String(t.id) === String(id) || String(t.serverId) === String(id)
    );
    if (!trade) return;
    const baseExitPrice = customExitPrice ?? trade.lastMarkPrice ?? trade.entryPrice;
    const isShort = trade.direction === "SHORT";

    // Accurately determine closeReason first so slippage can be asymmetrically applied
    let determinedReason = explicitReason;
    if (!determinedReason) {
      if (isShort) {
        if (trade.targetPrice && baseExitPrice <= trade.targetPrice) determinedReason = "TARGET_HIT";
        else if (trade.stopLoss && baseExitPrice >= trade.stopLoss) determinedReason = baseExitPrice <= trade.entryPrice ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      } else {
        if (trade.targetPrice && baseExitPrice >= trade.targetPrice) determinedReason = "TARGET_HIT";
        else if (trade.stopLoss && baseExitPrice <= trade.stopLoss) determinedReason = baseExitPrice >= trade.entryPrice ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
      }
      if (!determinedReason) {
        determinedReason = "MANUAL_SQUARE_OFF";
      }
    }

    // Dynamic Asymmetric Slippage: Limit fill (0.20 pt) vs Panic Stop trigger (1.80 pt) vs Manual (0.75 pt)
    const shouldSlippage = get().simulateSlippage;
    let slippageDeltaPts = 0;
    if (shouldSlippage) {
      if (determinedReason.includes("TARGET")) {
        slippageDeltaPts = 0.20;
      } else if (determinedReason.includes("TRAILING") || determinedReason.includes("BREAKEVEN") || determinedReason.includes("BE_HIT") || determinedReason.includes("RISK_FREE")) {
        slippageDeltaPts = 0.60;
      } else if (determinedReason.includes("STOP_LOSS") || determinedReason.includes("SL_HIT")) {
        slippageDeltaPts = 1.80;
      } else {
        slippageDeltaPts = 0.75;
      }
    }

    const exitPrice = shouldSlippage
      ? (isShort ? Math.max(0.05, baseExitPrice + slippageDeltaPts) : Math.max(0.05, baseExitPrice - slippageDeltaPts))
      : Math.max(0.05, baseExitPrice);
    
    const resolvedLot = resolveIndexLotSize(trade.symbol, trade.lotSize);
    const totalQty = resolvedLot * (trade.quantity || 1);
    const grossPnl = isShort 
      ? (trade.entryPrice - exitPrice) * totalQty 
      : (exitPrice - trade.entryPrice) * totalQty;
    const friction = calculateStatutoryCharges(trade.entryPrice, exitPrice, totalQty);
    const netPnl = grossPnl - friction;
    const exitSlippageCost = shouldSlippage ? Math.max(0, slippageDeltaPts * totalQty) : 0;
    const totalSlippageCost = (trade.entrySlippage ? trade.entrySlippage * totalQty : 0) + exitSlippageCost;

    const exitDatetime = new Date().toISOString();
    const tradeDuration = calculateTradeDuration(trade.entryDatetime, exitDatetime);

    const authoritativeId = trade.serverId || trade.id || Date.now();
    tradeIdMap.set(String(trade.id), authoritativeId);
    tradeIdMap.set(String(authoritativeId), authoritativeId);

    const closed = {
      id: authoritativeId,
      serverId: trade.serverId || authoritativeId,
      symbol: trade.symbol,
      optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
      direction: trade.direction || (isShort ? "SHORT" : "LONG"),
      tradeType: "INTRADAY",
      entryDatetime: trade.entryDatetime || new Date().toISOString(),
      exitDatetime,
      expiryDatetime: trade.expiryDatetime || resolveNextExpiryDate(trade.symbol, trade.entryDatetime || exitDatetime).toISOString(),
      expiryDate: trade.expiryDate || (trade.expiryDatetime ? trade.expiryDatetime.split("T")[0] : null),
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
      closeReason: determinedReason,
      priceHistory: trade.priceHistory || trade.ticks || null,
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
    const nextAlerts = get().openAlerts.filter(
      (t) => t.id !== trade.id && (!trade.serverId || t.serverId !== trade.serverId)
    );
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

    broadcastTradeAction("TRADE_CLOSED", { id: authoritativeId });

    // 🚀 Non-blocking optimistic background close sync to SQLite
    const backendId = trade.serverId || id;
    try {
      fetch(`/api/paper-lab/trades/${backendId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(exitPrice.toFixed(2)),
          reason: determinedReason
        })
      })
      .then(() => {
        // ⚡ PROACTIVE SYNC: Immediately refresh closed and open trades from backend
        fetch("/api/paper-lab")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.closedTrades) get().syncBackendTrades(data.closedTrades);
            if (data?.openTrades) get().syncBackendOpenTrades(data.openTrades);
          })
          .catch(() => {});
      })
      .catch(() => {});
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

  adjustStopLoss: (id, delta, currentLtp = null) => {
    let finalSl = null;
    let wasClamped = false;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentSl = Number(t.stopLoss || 0);
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        const rawNewSl = currentSl + delta;
        // Directional clamping:
        // LONG: SL cannot rise above Target Price - 1.0 pt, nor exceed current market LTP - 0.50 pt (if LTP known)
        // SHORT: SL cannot drop below Target Price + 1.0 pt, nor fall below current market LTP + 0.50 pt (if LTP known)
        let newSl;
        if (isShort) {
          let minAllowedShortSl = Math.max(currentTp + 1.0, 0.05);
          if (typeof currentLtp === "number" && currentLtp > 0) {
            minAllowedShortSl = Math.max(minAllowedShortSl, currentLtp + 0.50);
          }
          newSl = Math.max(minAllowedShortSl, Math.max(0.05, rawNewSl));
          if (rawNewSl < minAllowedShortSl) wasClamped = true;
        } else {
          let maxAllowedLongSl = currentTp - 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            maxAllowedLongSl = Math.min(maxAllowedLongSl, Math.max(0.05, currentLtp - 0.50));
          }
          newSl = Math.min(maxAllowedLongSl, Math.max(0.05, rawNewSl));
          if (rawNewSl > maxAllowedLongSl) wasClamped = true;
        }
        finalSl = Number(newSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });
    set({ openAlerts: updated });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
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
    return { finalSl, wasClamped };
  },

  setBreakevenSL: (id, currentLtp = null) => {
    let finalSl = null;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const entry = Number(t.entryPrice || 0);
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        const units = Number(t.quantity || 1) * Math.max(1, Number(t.lotSize || 65));
        
        // True Breakeven: guarantees gross profit clears broker commissions + statutory charges
        const estimatedCharges = 55.20 + (entry * units * 0.001);
        const frictionPts = Math.max(1.50, Number((estimatedCharges / units + 0.30).toFixed(2)));
        const trueBePrice = isShort ? (entry - frictionPts) : (entry + frictionPts);
        
        // Safety clamp: SL must NEVER trigger an immediate stop-out on current market LTP!
        // If profit is small (< frictionPts), clamp targetSl with a 0.30 pt buffer from currentLtp
        let targetSl = trueBePrice;
        if (typeof currentLtp === "number" && currentLtp > 0) {
          if (isShort) {
            targetSl = currentLtp >= trueBePrice ? Math.min(entry, currentLtp + 0.30) : trueBePrice;
          } else {
            targetSl = currentLtp <= trueBePrice ? Math.max(entry, currentLtp - 0.30) : trueBePrice;
          }
        }

        const safeSl = isShort
          ? Math.max(currentTp + 1.0, targetSl)
          : Math.min(currentTp - 1.0, targetSl);

        finalSl = Number(safeSl.toFixed(2));
        return { ...t, stopLoss: finalSl, isTrueBeLocked: true };
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

  // Mark Douglas Principle #5: "I pay myself as the market makes money available to me."
  // Multi-Tranche Scale Ladder:
  // Tranche 1 (at T1): Banks initial profit & locks Stop Loss to True Breakeven ("Risk-Free Opportunity")
  // Tranche 2 (at T2): Banks secondary profit & trails Stop Loss to guaranteed profit corridor (T1 price)
  // Single-Lot Mode: Preserves indivisible contracts (no 0.5 lot) and ratchets SL to True BE
  payMyself: (id, customExitPrice) => {
    const trade = get().openAlerts.find((t) => t.id === id);
    if (!trade) return null;

    const entry = Number(trade.entryPrice || 0);
    const shouldSlippage = get().simulateSlippage;
    const rawExit = Number(customExitPrice || trade.currentPrice || entry);
    // On market exit, factor in half the bid-ask spread crossing (0.2% ~ ₹0.20 to ₹0.35 penalty)
    const exitPrice = shouldSlippage
      ? Number((trade.direction === "SHORT" ? (rawExit * 1.002) : (rawExit * 0.998)).toFixed(2))
      : rawExit;

    const isShort = trade.direction === "SHORT";
    const totalLots = Number(trade.quantity || 1);
    const resolvedLot = Math.max(1, Number(trade.lotSize || (trade.symbol.includes("BANKNIFTY") ? 30 : trade.symbol.includes("SENSEX") ? 20 : 65)));
    const trancheIndex = (trade.scaledOutCount || 0) + 1; // 1 = T1 Scale, 2 = T2 Scale
    const isSingleLot = totalLots <= 1;

    // Integer Lot Discipline:
    // In real Indian options, contracts cannot be fractional (no 0.5 lot / 33 shares).
    // If 1 lot: Lock True BE (Risk-Free) without cutting contracts.
    // If >= 2 lots: Scale exactly 1 integer lot and leave remaining runner(s).
    let scaledLots = 0;
    let remainingLots = totalLots;

    if (!isSingleLot) {
      scaledLots = 1;
      remainingLots = Math.max(1, totalLots - 1);
    } else {
      scaledLots = 0;
      remainingLots = 1;
    }

    const scaledUnits = scaledLots * resolvedLot;
    const remainingUnits = remainingLots * resolvedLot;

    // Compute P&L for the booked portion (0 if 1-lot position)
    const grossPts = isShort ? (entry - exitPrice) : (exitPrice - entry);
    const grossPnl = scaledUnits > 0 ? Number((grossPts * scaledUnits).toFixed(2)) : 0;
    const friction = scaledUnits > 0 ? Number((28.50 + (exitPrice * scaledUnits * 0.001)).toFixed(2)) : 0;
    const netPnl = scaledUnits > 0 ? Number((grossPnl - friction).toFixed(2)) : 0;

    // Trailing Stop determination based on tranche
    const estimatedRemainingCharges = 28.50 + (entry * remainingUnits * 0.001);
    const frictionPts = Math.max(1.50, Number((estimatedRemainingCharges / remainingUnits + 0.30).toFixed(2)));
    const trueBePrice = isShort ? Number((entry - frictionPts).toFixed(2)) : Number((entry + frictionPts).toFixed(2));

    let newSlPrice = trueBePrice;
    let trancheLabel = isSingleLot ? "1-Lot Risk-Free BE Lock" : "Tranche 1 (T1 Scalp)";
    let closeReason = isSingleLot ? "LOCK_TRUE_BE" : "PAY_MYSELF_T1";

    if (!isSingleLot && trancheIndex >= 2) {
      // Tranche 2: Lock profit at T1 level (+6 to +8 pts into green)
      const lockOffset = Math.max(frictionPts + 3.0, Math.abs(grossPts) * 0.45);
      newSlPrice = isShort ? Number((entry - lockOffset).toFixed(2)) : Number((entry + lockOffset).toFixed(2));
      trancheLabel = "Tranche 2 (T2 Structural)";
      closeReason = "PAY_MYSELF_T2";
    }

    let closedPartial = null;
    let nextMaster = get().masterTrades;

    if (scaledLots > 0) {
      closedPartial = {
        id: Date.now(),
        parentTradeId: trade.id,
        symbol: trade.symbol,
        optionType: trade.optionType || (trade.symbol.includes("PE") ? "PUT" : "CALL"),
        direction: trade.direction || (isShort ? "SHORT" : "LONG"),
        tradeType: "INTRADAY",
        entryDatetime: trade.entryDatetime || new Date().toISOString(),
        exitDatetime: new Date().toISOString(),
        duration: `Scale-Out ${trancheLabel}`,
        entryPrice: entry,
        exitPrice: Number(exitPrice.toFixed(2)),
        targetPrice: trade.targetPrice,
        stopLoss: newSlPrice,
        quantity: scaledLots,
        lotSize: resolvedLot,
        grossPnl: grossPnl,
        taxesAndCharges: friction,
        slippageCost: 0,
        netPnl: netPnl,
        closeReason: closeReason,
        strategyTag: `Mark Douglas Principle #5 (${trancheLabel})`,
        strategyTags: `Mark Douglas Principle #5: Pay Myself (${trancheLabel})`,
        mistakeTags: "None",
        confidenceScore: 10,
        followedPlan: true,
        catalyst: `Mark Douglas Principle #5: 'I pay myself as the market makes money available to me.' Booked ${trancheLabel} profit.`,
        executionDetails: `Scaled ${scaledLots} lot (${scaledUnits} Qty) at ₹${exitPrice.toFixed(2)} (+${grossPts.toFixed(2)} pts). Net banked: +₹${netPnl.toFixed(2)}. Remaining ${remainingLots} lot runner secured at SL ₹${newSlPrice.toFixed(2)}.`,
        mindsetEmotion: "Disciplined Execution / The Zone",
        lessonsLearned: trancheIndex === 1 
          ? "Banked cash early to establish a 100% Risk-Free Opportunity." 
          : "Locked secondary structural gains and trailed stop into guaranteed green."
      };
      nextMaster = [closedPartial, ...get().masterTrades];
    }

    let updatedActiveTrade = null;
    const updatedAlerts = get().openAlerts.map((t) => {
      if (t.id === id) {
        updatedActiveTrade = {
          ...t,
          quantity: remainingLots,
          stopLoss: newSlPrice,
          isTrueBeLocked: true,
          isRiskFreeRunner: true,
          trancheLevel: trancheIndex,
          bankedProfit: Number(((t.bankedProfit || 0) + netPnl).toFixed(2)),
          scaledOutCount: trancheIndex
        };
        return updatedActiveTrade;
      }
      return t;
    });

    const noticeToast = closedPartial || {
      id: Date.now(),
      symbol: trade.symbol,
      netPnl: 0,
      closeReason: "RISK_FREE_BE_LOCKED",
      executionDetails: `1-Lot Position Protected! Stop Loss moved to True BE at ₹${newSlPrice.toFixed(2)} (+${frictionPts.toFixed(1)} pts friction). 100% Risk-Free Opportunity established!`
    };

    set({
      openAlerts: updatedAlerts,
      masterTrades: nextMaster,
      closedAlerts: nextMaster,
      journalTrades: nextMaster,
      settlementToast: noticeToast
    });

    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(updatedAlerts));
      localStorage.setItem("portfolio-master-trades", JSON.stringify(nextMaster));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(nextMaster));
      
      // Atomic SQLite & PaperTradeEngine Daemon Synchronization with ID Resolution Queue
      const backendId = trade.serverId || tradeIdMap.get(id);
      const syncPayload = {
        remainingQuantity: remainingLots,
        stopLoss: newSlPrice,
        exitPrice: Number(exitPrice.toFixed(2)),
        scaledLots,
        netPnl,
        grossPnl,
        charges: friction,
        closeReason
      };

      if (backendId) {
        debounceNetworkSync(`trade_${id}_partial_close`, () => {
          fetch(`/api/paper-lab/trades/${backendId}/partial-close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(syncPayload)
          }).catch(() => {});
        }, 100);
      } else {
        // Queue until serverId arrives from background POST
        pendingPartialCloseQueue.set(id, syncPayload);
        fetch(`/api/paper-lab/trades/${id}/partial-close`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncPayload)
        }).catch(() => {});
      }
    } catch {}

    return { closedPartial, updatedActiveTrade };
  },

  updateTargetPrice: (id, newTp, currentLtp = null) => {
    let finalTp = null;
    let wasClamped = false;
    const rawVal = Number(newTp);
    if (!Number.isFinite(rawVal) || rawVal <= 0) return { finalTp: null, wasClamped: false };

    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentSl = Number(t.stopLoss || 0);
        let clampedTp = rawVal;

        if (isShort) {
          let maxAllowed = currentSl > 0 ? Math.max(0.05, currentSl - 1.0) : 999999;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          }
          clampedTp = Math.min(maxAllowed, Math.max(0.05, rawVal));
          if (rawVal > maxAllowed) wasClamped = true;
        } else {
          let minAllowed = currentSl > 0 ? currentSl + 1.0 : 0.05;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          }
          clampedTp = Math.max(minAllowed, Math.max(0.05, rawVal));
          if (rawVal < minAllowed) wasClamped = true;
        }

        finalTp = Number(clampedTp.toFixed(2));
        return { ...t, targetPrice: finalTp };
      }
      return t;
    });

    set({ openAlerts: updated });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
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
    return { finalTp, wasClamped };
  },

  updateStopLossPrice: (id, newSl, currentLtp = null) => {
    let finalSl = null;
    let wasClamped = false;
    const rawVal = Number(newSl);
    if (!Number.isFinite(rawVal) || rawVal <= 0) return { finalSl: null, wasClamped: false };

    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || (isShort ? 0.05 : 999999));
        let clampedSl = rawVal;

        if (isShort) {
          let minAllowed = Math.max(currentTp + 1.0, 0.05);
          if (typeof currentLtp === "number" && currentLtp > 0) {
            minAllowed = Math.max(minAllowed, currentLtp + 0.50);
          }
          clampedSl = Math.max(minAllowed, Math.max(0.05, rawVal));
          if (rawVal < minAllowed) wasClamped = true;
        } else {
          let maxAllowed = currentTp - 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            maxAllowed = Math.min(maxAllowed, Math.max(0.05, currentLtp - 0.50));
          }
          clampedSl = Math.min(maxAllowed, Math.max(0.05, rawVal));
          if (rawVal > maxAllowed) wasClamped = true;
        }

        finalSl = Number(clampedSl.toFixed(2));
        return { ...t, stopLoss: finalSl };
      }
      return t;
    });

    set({ openAlerts: updated });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
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
    return { finalSl, wasClamped };
  },

  adjustTargetPrice: (id, delta, currentLtp = null) => {
    let finalTp = null;
    let wasClamped = false;
    const updated = get().openAlerts.map((t) => {
      if (t.id === id) {
        const isShort = t.direction === "SHORT";
        const currentTp = Number(t.targetPrice || 0);
        const currentSl = Number(t.stopLoss || 0);
        const rawNewTp = currentTp + delta;
        // Directional clamping:
        // LONG: TP cannot drop below Stop Loss + 1.0 pt, nor drop below current market LTP + 0.50 pt (if LTP known)
        // SHORT: TP cannot rise above Stop Loss - 1.0 pt, nor rise above current market LTP - 0.50 pt (if LTP known)
        let newTp;
        if (isShort) {
          let maxAllowedShortTp = currentSl > 0 ? Math.max(0.05, currentSl - 1.0) : 999999;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            maxAllowedShortTp = Math.min(maxAllowedShortTp, Math.max(0.05, currentLtp - 0.50));
          }
          newTp = Math.min(maxAllowedShortTp, Math.max(0.05, rawNewTp));
          if (rawNewTp > maxAllowedShortTp) wasClamped = true;
        } else {
          let minAllowedLongTp = currentSl + 1.0;
          if (typeof currentLtp === "number" && currentLtp > 0) {
            minAllowedLongTp = Math.max(minAllowedLongTp, currentLtp + 0.50);
          }
          newTp = Math.max(minAllowedLongTp, Math.max(0.05, rawNewTp));
          if (rawNewTp < minAllowedLongTp) wasClamped = true;
        }
        finalTp = Number(newTp.toFixed(2));
        return { ...t, targetPrice: finalTp };
      }
      return t;
    });
    set({ openAlerts: updated });
    try {
      debounceNetworkSync("portfoliox_open_alerts_storage", () => {
        try { localStorage.setItem("portfoliox_open_alerts", JSON.stringify(get().openAlerts)); } catch {}
      }, 250);
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
    return { finalTp, wasClamped };
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

  deleteJournalTradesWithUndo: (tradesOrTrade) => {
    const rawList = Array.isArray(tradesOrTrade) ? tradesOrTrade : [tradesOrTrade];
    const tradeList = rawList
      .map((t) => (typeof t === "object" && t !== null ? t : get().masterTrades.find((x) => x.id === t)))
      .filter(Boolean);

    if (tradeList.length === 0) return;

    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);

    // If another deletion was pending in the undo buffer, immediately flush it to backend
    if (undoTradeBackup) {
      const pendingList = Array.isArray(undoTradeBackup.trades) ? undoTradeBackup.trades : [undoTradeBackup];
      for (const pt of pendingList) {
        if (pt.id !== undefined && pt.id !== null) {
          commitTradeDeletionToBackend(pt.id);
          if (pt.serverId && pt.serverId !== pt.id) {
            commitTradeDeletionToBackend(pt.serverId);
          }
        }
      }
    }

    const tradeIdsToDelete = new Set();
    for (const t of tradeList) {
      tradeIdsToDelete.add(t.id);
      tradeIdsToDelete.add(String(t.id));
      persistDeletedTradeId(t.id);
      if (t.serverId) {
        tradeIdsToDelete.add(t.serverId);
        tradeIdsToDelete.add(String(t.serverId));
        persistDeletedTradeId(t.serverId);
      }
    }

    // Optimistically remove from state & localStorage
    const next = get().masterTrades.filter(
      (t) => !tradeIdsToDelete.has(t.id) && !tradeIdsToDelete.has(String(t.id))
    );
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}

    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        set({ undoIntervalHandle: null });
      } else {
        set({ undoCountdown: count });
      }
    }, 1000);

    const timer = setTimeout(() => {
      for (const t of tradeList) {
        commitTradeDeletionToBackend(t.id);
        if (t.serverId && t.serverId !== t.id) {
          commitTradeDeletionToBackend(t.serverId);
        }
      }
      set({ undoTradeBackup: null, undoCountdown: 5, undoTimerHandle: null, undoIntervalHandle: null });
    }, 5000);

    const backupObj = tradeList.length === 1
      ? { ...tradeList[0], trades: tradeList, isBatch: false, count: 1 }
      : {
          id: `batch-${Date.now()}`,
          symbol: `${tradeList.length} Practice Trades`,
          trades: tradeList,
          isBatch: true,
          count: tradeList.length
        };

    set({
      undoTradeBackup: backupObj,
      undoCountdown: 5,
      undoTimerHandle: timer,
      undoIntervalHandle: interval
    });
  },

  deleteJournalTradeWithUndo: (trade) => {
    get().deleteJournalTradesWithUndo(trade);
  },

  executeUndoTrade: () => {
    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTradeBackup) {
      if (undoTimerHandle) clearTimeout(undoTimerHandle);
      if (undoIntervalHandle) clearInterval(undoIntervalHandle);

      const tradesToRestore = Array.isArray(undoTradeBackup.trades)
        ? undoTradeBackup.trades
        : [undoTradeBackup];

      for (const t of tradesToRestore) {
        removeDeletedTradeId(t.id);
        if (t.serverId) removeDeletedTradeId(t.serverId);
      }

      // Re-insert into state
      const current = get().masterTrades;
      const restoreIds = new Set(tradesToRestore.map((t) => String(t.id)));
      const filteredCurrent = current.filter((t) => !restoreIds.has(String(t.id)));
      const restored = [...tradesToRestore, ...filteredCurrent];
      restored.sort((a, b) => {
        const timeA = new Date(a.exitDatetime || a.entryDatetime || 0).getTime();
        const timeB = new Date(b.exitDatetime || b.entryDatetime || 0).getTime();
        return timeB - timeA;
      });

      set({
        masterTrades: restored,
        closedAlerts: restored,
        journalTrades: restored,
        undoTradeBackup: null,
        undoCountdown: 5,
        undoTimerHandle: null,
        undoIntervalHandle: null
      });
      try {
        localStorage.setItem("portfolio-master-trades", JSON.stringify(restored));
        localStorage.setItem("portfolio-journal-trades", JSON.stringify(restored));
      } catch {}
      return true;
    }
    return false;
  },

  dismissUndoTrade: () => {
    const { undoTradeBackup, undoTimerHandle, undoIntervalHandle } = get();
    if (undoTimerHandle) clearTimeout(undoTimerHandle);
    if (undoIntervalHandle) clearInterval(undoIntervalHandle);
    if (undoTradeBackup) {
      const pendingList = Array.isArray(undoTradeBackup.trades) ? undoTradeBackup.trades : [undoTradeBackup];
      for (const pt of pendingList) {
        if (pt.id !== undefined && pt.id !== null) {
          commitTradeDeletionToBackend(pt.id);
          if (pt.serverId && pt.serverId !== pt.id) {
            commitTradeDeletionToBackend(pt.serverId);
          }
        }
      }
    }
    set({
      undoTradeBackup: null,
      undoCountdown: 5,
      undoTimerHandle: null,
      undoIntervalHandle: null
    });
  },

  deleteJournalTrade: async (id) => {
    if (id === undefined || id === null) return;
    const tradeObj = get().masterTrades.find((t) => t.id === id || String(t.id) === String(id) || t.serverId === id);
    const serverId = tradeObj?.serverId;
    persistDeletedTradeId(id);
    if (serverId && serverId !== id) {
      persistDeletedTradeId(serverId);
    }
    const next = get().masterTrades.filter((t) => 
      t.id !== id && 
      t.id !== String(id) && 
      (!serverId || (t.id !== serverId && t.id !== String(serverId) && t.serverId !== serverId))
    );
    set({ masterTrades: next, closedAlerts: next, journalTrades: next });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(next));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(next));
    } catch {}
    await commitTradeDeletionToBackend(id);
    if (serverId && serverId !== id) {
      await commitTradeDeletionToBackend(serverId);
    }
  },

  deleteTrade: async (id) => {
    return get().deleteJournalTrade(id);
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

  syncBackendOpenTrades: (backendOpenTrades) => {
    if (!Array.isArray(backendOpenTrades)) return;
    const currentAlerts = get().openAlerts || [];
    const currentMap = new Map();
    for (const t of currentAlerts) {
      if (t.serverId) currentMap.set(String(t.serverId), t);
      if (t.id) currentMap.set(String(t.id), t);
    }
    const normalizedOpen = backendOpenTrades.map((t) => {
      let existing = currentMap.get(String(t.id));
      if (!existing) {
        existing = currentAlerts.find((c) =>
          !c.serverId &&
          c.symbol === t.symbol &&
          Math.abs(Number(c.entryPrice || 0) - Number(t.entryPrice || 0)) < 1.0
        );
        if (existing) {
          tradeIdMap.set(existing.id, t.id);
          tradeIdMap.set(String(existing.id), t.id);
        }
      }
      return {
        ...(existing || {}),
        id: t.id,
        serverId: t.id,
        symbol: t.symbol,
        underlyingSymbol: t.underlyingSymbol || (t.symbol?.includes("BANK") ? "BANKNIFTY" : t.symbol?.includes("SENSEX") ? "SENSEX" : "NIFTY"),
        optionType: t.optionType || (t.symbol?.includes("CE") ? "CALL" : "PUT"),
        strikePrice: t.strikePrice,
        direction: t.direction || "LONG",
        tradeType: t.tradeType || "INTRADAY",
        entryDatetime: t.entryDatetime || t.createdAt,
        entryPrice: t.entryPrice,
        lastMarkPrice: t.lastMarkPrice || t.entryPrice,
        targetPrice: t.targetPrice,
        stopLoss: t.stopLoss,
        quantity: t.quantity || 1,
        lotSize: t.lotSize || 65,
        feedMode: t.feedMode || "LIVE",
        status: "OPEN",
      };
    });

    // Retain newly deployed optimistic local orders that haven't received serverId yet (< 15s old and not yet matched)
    const backendSymbols = new Set(backendOpenTrades.map((b) => b.symbol));
    const pendingLocal = currentAlerts.filter(
      (t) => !t.serverId && !backendSymbols.has(t.symbol) && (Date.now() - (t.id || 0) < 15000)
    );
    const merged = [...normalizedOpen, ...pendingLocal];

    // Quick identity check to avoid unnecessary state triggers (must compare SL and TP so server calibrations propagate)
    if (currentAlerts.length === merged.length && currentAlerts.length > 0) {
      const allMatch = currentAlerts.every(
        (c, i) =>
          (c.serverId || c.id) === (merged[i].serverId || merged[i].id) &&
          c.lastMarkPrice === merged[i].lastMarkPrice &&
          c.stopLoss === merged[i].stopLoss &&
          c.targetPrice === merged[i].targetPrice &&
          c.quantity === merged[i].quantity
      );
      if (allMatch) return;
    }

    set({ openAlerts: merged });
    try {
      localStorage.setItem("portfoliox_open_alerts", JSON.stringify(merged));
    } catch {}
  },

  syncBackendTrades: (backendTrades) => {
    if (!Array.isArray(backendTrades) || !backendTrades.length) return;
    const current = get().masterTrades || [];
    const currentMap = new Map();
    for (const t of current) {
      if (t.id !== undefined && t.id !== null) currentMap.set(String(t.id), t);
    }

    // Filter out any trade that has been marked deleted
    const validBackend = backendTrades.filter((t) => !deletedTradeIdSet.has(String(t.id)));

    const normalizedBackend = validBackend.map((t) => {
      const existing = currentMap.get(String(t.id));
      const grossPnl = Number(t.realizedPnl ?? t.grossPnl ?? 0);
      const charges = Number(t.charges ?? 55.20);
      const netPnl = Number(t.netPnl ?? (grossPnl - charges));
      const entryTime = t.entryDatetime || t.createdAt;
      const exitTime = t.exitDatetime || t.updatedAt || entryTime;
      const duration = calculateTradeDuration(entryTime, exitTime);
      return {
        ...(existing || {}),
        id: t.id,
        serverId: t.id,
        symbol: t.symbol,
        underlyingSymbol: t.underlyingSymbol || (t.symbol.includes("BANK") ? "BANKNIFTY" : t.symbol.includes("SENSEX") ? "SENSEX" : "NIFTY"),
        optionType: t.optionType || (t.symbol.includes("CE") ? "CALL" : "PUT"),
        strikePrice: t.strikePrice,
        direction: t.direction || "LONG",
        tradeType: t.tradeType || "INTRADAY",
        entryDatetime: entryTime,
        exitDatetime: exitTime,
        expiryDatetime: t.expiryDatetime,
        expiryDate: t.expiryDate,
        duration,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        targetPrice: t.targetPrice,
        stopLoss: t.stopLoss,
        quantity: t.quantity || 1,
        lotSize: t.lotSize || 65,
        grossPnl,
        taxesAndCharges: charges,
        charges,
        netPnl,
        closeReason: t.closeReason || (t.exitPrice >= t.entryPrice ? "TARGET_HIT" : "STOP_LOSS_HIT"),
        strategyTag: Array.isArray(t.strategyTags) ? (t.strategyTags[0] || "Practice Scalp") : String(t.strategyTags || t.strategyTag || t.entryReason || "Practice Scalp"),
        strategyTags: Array.isArray(t.strategyTags) ? t.strategyTags : [String(t.strategyTags || t.strategyTag || "Practice Scalp")],
        mistakeTags: Array.isArray(t.mistakeTags) ? (t.mistakeTags.length > 0 ? t.mistakeTags.join(", ") : "None") : String(t.mistakeTags || "None"),
        confidenceScore: t.confidenceScore || 7,
        followedPlan: t.followedPlan !== false,
        personalNotes: t.personalNotes || "",
        catalyst: t.catalyst || t.personalNotes || "Live market scalp.",
        executionDetails: t.executionDetails || `Executed at ₹${t.entryPrice}, closed at ₹${t.exitPrice}. Net: ₹${netPnl}.`
      };
    });

    // 🚀 PURGE DUMMY TRADES: SQLite DB is the authoritative single source of truth.
    // Only preserve client trades if explicitly tagged `isPendingSync: true` (e.g. offline queue).
    // All stale unverified mock/dummy client entries are discarded.
    const pendingClientTrades = current.filter(
      (t) => t.isPendingSync === true && !deletedTradeIdSet.has(String(t.id))
    );
    const merged = [...normalizedBackend, ...pendingClientTrades];

    merged.sort((a, b) => {
      const timeA = new Date(a.exitDatetime || a.entryDatetime || 0).getTime();
      const timeB = new Date(b.exitDatetime || b.entryDatetime || 0).getTime();
      return timeB - timeA;
    });

    // ⚡ INSTANT MUTUAL EXCLUSION: Closed trades must NEVER linger in openAlerts
    const closedIdSet = new Set(validBackend.map((t) => String(t.id)));
    const openAlerts = get().openAlerts || [];
    const prunedOpen = openAlerts.filter(
      (t) => !closedIdSet.has(String(t.id)) && (!t.serverId || !closedIdSet.has(String(t.serverId)))
    );
    const openPruned = prunedOpen.length !== openAlerts.length;

    // ⚡ PERFORMANCE SHIELD: Skip state mutation if merged data matches current store
    if (current.length === merged.length && current.length > 0 && !openPruned) {
      let isIdentical = true;
      for (let i = 0; i < current.length; i++) {
        if (
          current[i].id !== merged[i].id ||
          current[i].exitDatetime !== merged[i].exitDatetime ||
          current[i].netPnl !== merged[i].netPnl
        ) {
          isIdentical = false;
          break;
        }
      }
      if (isIdentical) {
        return; // Zero store mutation, zero component re-renders, zero localStorage writes
      }
    }

    set({
      masterTrades: merged,
      closedAlerts: merged,
      journalTrades: merged,
      ...(openPruned ? { openAlerts: prunedOpen } : {})
    });
    try {
      localStorage.setItem("portfolio-master-trades", JSON.stringify(merged));
      localStorage.setItem("portfolio-journal-trades", JSON.stringify(merged));
      if (openPruned) {
        localStorage.setItem("portfoliox_open_alerts", JSON.stringify(prunedOpen));
      }
    } catch {}
  },

  purgeStaleMockTrades: () => {
    fetch("/api/paper-lab")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.closedTrades) {
          get().syncBackendTrades(data.closedTrades);
        }
      })
      .catch(() => {});
  },

  getPortfolioTelemetry: (timeframe = "all") => {
    const state = get();
    const startingCapital = Number(state.startingCapital || 100000);
    let closed = state.closedAlerts || [];
    let open = state.openAlerts || [];

    if (timeframe === "today") {
      const todayKey = getLocalDateKey(new Date());
      closed = closed.filter((t) => {
        const dt = t.exitDatetime || t.entryDatetime;
        return dt && getLocalDateKey(new Date(dt)) === todayKey;
      });
      open = open.filter((t) => {
        const dt = t.entryDatetime;
        return dt && getLocalDateKey(new Date(dt)) === todayKey;
      });
    }

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
      timeframe,
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

  // Cross-Tab Broadcast Channel Handler (Instantaneous multi-monitor order sync)
  if (tradeBroadcastChannel) {
    tradeBroadcastChannel.onmessage = (event) => {
      try {
        const { action } = event.data || {};
        if (action === "SYNC_REQUEST" || action === "TRADE_MUTATION" || action === "TRADE_CLOSED" || action === "TRADE_CREATED") {
          fetch("/api/paper-lab")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.closedTrades) useTradingStore.getState().syncBackendTrades(data.closedTrades);
              if (data?.openTrades) useTradingStore.getState().syncBackendOpenTrades(data.openTrades);
            })
            .catch(() => {});
        }
      } catch {}
    };
  }
}
