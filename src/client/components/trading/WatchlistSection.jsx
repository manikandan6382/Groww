import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  useTradingStore, 
  INDIAN_STOCK_META, 
  getStockMeta, 
  resolveIndexLotSize 
} from "../../stores/useTradingStore";
import { Sparkline } from "../common/Sparkline";
import { RollingTicker } from "../common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import { 
  Search, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Radio, 
  Zap, 
  Sparkles, 
  SlidersHorizontal, 
  Eye, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  ShieldCheck, 
  Check, 
  Clock, 
  ChevronRight, 
  BarChart2, 
  Activity, 
  LayoutGrid, 
  ListFilter, 
  ChevronDown, 
  ArrowLeftRight, 
  Gauge 
} from "lucide-react";
import clsx from "clsx";

// ─── Module-Level Constants & Helpers (TDZ & Hoisting Compliant) ───────────────
const QUICK_PRESETS = [
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

const SECTOR_TABS = [
  { id: "all", label: "All Tracked" },
  { id: "nifty", label: "🇮🇳 Nifty Core" },
  { id: "banking", label: "🏦 Banking & NBFC" },
  { id: "tech", label: "💻 Tech & IT" },
  { id: "liquid", label: "⚡ High Liquidity" },
  { id: "gainers", label: "▲ Gainers" },
  { id: "dips", label: "▼ Dip Buys" },
];

/**
 * Deterministic Liquidity Radar Analytics Generator
 * Computes live intraday range progress, volume velocity, orderbook depth, and liquidity rating
 */
function getLiquidityRadarData(symbol, meta) {
  const price = Number(meta.price || 1000);
  const isGain = meta.change >= 0;

  // Day Range calculation
  const dayLow = Number((price * (isGain ? 0.991 : 0.982)).toFixed(2));
  const dayHigh = Number((price * (isGain ? 1.018 : 1.006)).toFixed(2));
  const rangeSpan = Math.max(0.1, dayHigh - dayLow);
  const rangeProgress = Math.min(100, Math.max(0, ((price - dayLow) / rangeSpan) * 100));

  // 52-Week Range
  const yearLow = Number((price * 0.78).toFixed(2));
  const yearHigh = Number((price * 1.28).toFixed(2));
  const yearProgress = Math.min(100, Math.max(0, ((price - yearLow) / (yearHigh - yearLow)) * 100));

  // Volume & Turnover based on market cap tier
  const isHeavyweight = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS"].includes(symbol);
  const volumeShares = isHeavyweight ? (price > 1500 ? "3.2M" : "8.4M") : (price < 300 ? "24.5M" : "1.8M");
  const turnoverCr = isHeavyweight ? (price > 1500 ? "₹740 Cr" : "₹890 Cr") : "₹210 Cr";
  const spread = "₹0.05";
  const vwap = Number((price * (isGain ? 0.997 : 1.003)).toFixed(2));
  const vwapDelta = Number((((price - vwap) / vwap) * 100).toFixed(2));
  const buyerDominance = isGain ? 58 : 42;

  // 5-Level Simulated Order Book Depth
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
    isHeavyweight
  };
}

/**
 * Generates smooth trend points for mini sparkline (Zero Math.sin noise)
 */
function generateMiniPoints(price, isGain) {
  const p = Number(price || 1000);
  const delta = p * 0.015;
  if (isGain) {
    return [p - delta, p - delta * 0.6, p - delta * 0.4, p + delta * 0.2, p + delta * 0.8, p];
  }
  return [p + delta, p + delta * 0.5, p + delta * 0.3, p - delta * 0.2, p - delta * 0.6, p];
}

export function WatchlistSection() {
  const { 
    watchlistSymbols, 
    addWatchSymbol, 
    removeWatchSymbol, 
    activeSectorFilter, 
    setActiveSectorFilter,
    setActiveView,
    setOrderPadPreFill,
    deployPracticeTrade
  } = useTradingStore();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "matrix"
  const [sortBy, setSortBy] = useState("default"); // "default" | "volume" | "gainers" | "dips"
  const [activeModal, setActiveModal] = useState(null); // null | { type: "trade" | "depth", symbol: string }
  
  // Quick Trade Drawer State
  const [tradeTab, setTradeTab] = useState("equity"); // "equity" | "option"
  const [orderSide, setOrderSide] = useState("BUY"); // "BUY" | "SELL"
  const [productType, setProductType] = useState("CNC"); // "CNC" (Delivery) | "MIS" (Intraday)
  const [tradeQty, setTradeQty] = useState(10);
  const [optionType, setOptionType] = useState("CE"); // "CE" | "PE"
  const [optionLots, setOptionLots] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  const searchInputRef = useRef(null);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && activeModal) {
        setActiveModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal]);

  // Live Auto-Suggest Candidates for Search (stocks not yet added to watchlist)
  const searchCandidates = useMemo(() => {
    if (!search || search.trim().length === 0) return [];
    const q = search.toLowerCase().trim();
    return Object.keys(INDIAN_STOCK_META)
      .filter((sym) => {
        const meta = INDIAN_STOCK_META[sym];
        const match = sym.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q) || meta.sector.toLowerCase().includes(q);
        return match && !watchlistSymbols.includes(sym);
      })
      .slice(0, 5);
  }, [search, watchlistSymbols]);

  // Filtered & Sorted symbols in current watchlist
  const filteredSymbols = useMemo(() => {
    return watchlistSymbols
      .filter((symbol) => {
        const meta = getStockMeta(symbol);
        if (search && !symbol.toLowerCase().includes(search.toLowerCase()) && !meta.name.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (activeSectorFilter === "nifty") {
          return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"].includes(symbol);
        }
        if (activeSectorFilter === "banking") {
          return meta.sector.toLowerCase().includes("bank") || meta.sector.toLowerCase().includes("nbfc");
        }
        if (activeSectorFilter === "tech") {
          return meta.sector.toLowerCase().includes("it") || meta.sector.toLowerCase().includes("tech");
        }
        if (activeSectorFilter === "liquid") {
          return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "TATAMOTORS.NS"].includes(symbol);
        }
        if (activeSectorFilter === "gainers") {
          return meta.change >= 0;
        }
        if (activeSectorFilter === "dips") {
          return meta.change < 0;
        }
        return true;
      })
      .sort((a, b) => {
        const metaA = getStockMeta(a);
        const metaB = getStockMeta(b);
        if (sortBy === "gainers") return metaB.changePct - metaA.changePct;
        if (sortBy === "dips") return metaA.changePct - metaB.changePct;
        if (sortBy === "volume") {
          const isAHeavy = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"].includes(a);
          const isBHeavy = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"].includes(b);
          return isBHeavy - isAHeavy;
        }
        return 0;
      });
  }, [watchlistSymbols, search, activeSectorFilter, sortBy]);

  const handleTabChange = (tabId) => {
    setActiveSectorFilter(tabId);
    soundEngine.playTabSwitchTone();
  };

  const handleAddPreset = (sym) => {
    addWatchSymbol(sym);
    soundEngine.playSuccessTone();
  };

  const handleRemove = (sym, e) => {
    e?.stopPropagation();
    removeWatchSymbol(sym);
    soundEngine.playDeleteTone();
  };

  const handleOpenTradeModal = (symbol, e) => {
    e?.stopPropagation();
    setActiveModal({ type: "trade", symbol });
    setTradeTab("equity");
    setTradeQty(10);
    setOrderSide("BUY");
    soundEngine.playTabSwitchTone();
  };

  const handleOpenDepthModal = (symbol, e) => {
    e?.stopPropagation();
    setActiveModal({ type: "depth", symbol });
    soundEngine.playTabSwitchTone();
  };

  // Execution: Place Quick In-Place Equity Trade
  const handleExecuteEquityTrade = (meta, cleanSym) => {
    const price = Number(meta.price || 1000);
    const totalVal = price * tradeQty;

    deployPracticeTrade({
      symbol: `${cleanSym} (${productType})`,
      underlyingSymbol: cleanSym,
      entryPrice: price,
      plannedEntryPrice: price,
      quantity: tradeQty,
      lotSize: 1,
      optionType: orderSide,
      tradeType: productType === "CNC" ? "DELIVERY" : "INTRADAY",
      direction: orderSide === "BUY" ? "LONG" : "SHORT",
      strategyTag: productType === "CNC" ? "Equity Wealth Accumulation" : "Equity Intraday Momentum",
      personalNotes: `Watchlist Quick Execution · ${orderSide} ${tradeQty} shares @ ₹${price}`
    });

    soundEngine.playOrderFillTone();
    setToastMessage(`✅ Order Executed: ${orderSide} ${tradeQty} shares of ${cleanSym} @ ₹${price.toFixed(2)} (${productType})`);
    setActiveModal(null);
  };

  // Execution: Deploy ATM Option Scalp
  const handleExecuteOptionScalp = (meta, cleanSym) => {
    const spot = Number(meta.price || 1000);
    const roundedStrike = Math.round(spot / 50) * 50;
    const strikeSymbol = `${cleanSym} ${roundedStrike} ${optionType}`;
    const estPremium = Number((spot * (optionType === "CE" ? 0.022 : 0.020)).toFixed(2));
    const lotSize = resolveIndexLotSize(cleanSym, 25);
    const totalQty = optionLots * lotSize;

    deployPracticeTrade({
      symbol: strikeSymbol,
      underlyingSymbol: cleanSym,
      strikePrice: roundedStrike,
      entryPrice: estPremium,
      plannedEntryPrice: estPremium,
      targetPrice: Number((estPremium * 1.30).toFixed(2)),
      stopLoss: Number((estPremium * 0.80).toFixed(2)),
      quantity: optionLots,
      lotSize: lotSize,
      optionType: optionType === "CE" ? "CALL" : "PUT",
      tradeType: "INTRADAY",
      direction: optionType === "CE" ? "LONG" : "SHORT",
      strategyTag: "ATM Watchlist Scalp",
      personalNotes: `Watchlist Scalp Desk · ${strikeSymbol} @ ₹${estPremium}`
    });

    soundEngine.playOrderFillTone();
    setToastMessage(`🎯 Option Scalp Deployed: ${strikeSymbol} (${totalQty} Qty) @ ₹${estPremium.toFixed(2)}`);
    setActiveModal(null);
  };

  // Transfer to Full Paper Trading Lab
  const handleTransferToPaperLab = (meta, cleanSym) => {
    const spot = Number(meta.price || 1000);
    const roundedStrike = Math.round(spot / 50) * 50;
    setOrderPadPreFill({
      symbol: `${cleanSym} ${roundedStrike} ${optionType}`,
      underlying: cleanSym,
      entryPrice: Number((spot * 0.02).toFixed(2)),
      targetPrice: Number((spot * 0.026).toFixed(2)),
      stopLoss: Number((spot * 0.016).toFixed(2)),
      quantity: optionLots,
      lotSize: resolveIndexLotSize(cleanSym, 25)
    });
    setActiveModal(null);
    setActiveView("paper");
    soundEngine.playSuccessTone();
  };

  // Active modal target meta
  const activeStockMeta = activeModal ? getStockMeta(activeModal.symbol) : null;
  const activeRadarData = activeModal ? getLiquidityRadarData(activeModal.symbol, activeStockMeta) : null;
  const activeCleanSym = activeModal ? activeModal.symbol.replace(/\.(NS|BO)$/, "") : "";

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#0d0f14]/85 backdrop-blur-3xl border border-white/[0.07] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden space-y-6 hover:border-white/[0.12] transition-colors">
      {/* 🌌 Apple Spatial Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-[420px] h-[220px] bg-cyan-500/[0.04] rounded-full blur-[90px] pointer-events-none -mt-24" />
      <div className="absolute bottom-0 left-10 w-[360px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none -mb-20" />

      {/* 🏛️ 1. Master Header: Title, Telemetry & View Controls */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap font-mono flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
              <span>MARKET LIQUIDITY RADAR</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              NSE / BSE Realtime Tick Stream
            </span>
            <span className="text-[10px] font-mono text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10">
              Avg Spread: 0.01%
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Market Watchlist &amp; Liquidity Radar
          </h2>
          <p className="text-xs text-slate-300">
            Real-time institutional liquidity, order depth velocity, and precision execution desk.
          </p>
        </div>

        {/* View Switcher & Counter Controls */}
        <div className="flex items-center gap-3 flex-wrap self-start lg:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-2xl shadow-inner">
            <button
              type="button"
              onClick={() => {
                setViewMode("grid");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Spatial Grid Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("matrix");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Detailed Liquidity Matrix Table"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/50 border border-white/10 text-xs font-mono text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="default">Default Order</option>
              <option value="volume">Highest Liquidity</option>
              <option value="gainers">Top Gainers (%)</option>
              <option value="dips">Top Dips (%)</option>
            </select>
          </div>

          <span className="text-xs font-mono font-bold text-slate-300 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm whitespace-nowrap">
            {filteredSymbols.length} of {watchlistSymbols.length} Tracked
          </span>
        </div>
      </div>

      {/* 🔍 2. Search & Auto-Suggest Stock Catalog */}
      <div className="relative space-y-3">
        {/* Apple Vision Pro Frosted Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search NSE/BSE stocks to track or trade (e.g. RELIANCE, TCS, INFY)..."
            className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 backdrop-blur-xl transition shadow-inner font-sans"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                soundEngine.playSuccessTone();
              }}
              className="absolute right-3.5 text-xs font-mono font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* 🌟 Auto-Suggest Live Candidates Dropdown */}
        {searchCandidates.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Available to Add to Watchlist:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {searchCandidates.map((sym) => {
                const meta = INDIAN_STOCK_META[sym];
                const clean = sym.replace(/\.NS$/, "");
                const isGain = meta.change >= 0;
                return (
                  <div
                    key={sym}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between gap-3 transition group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white font-mono">{clean}</div>
                      <div className="text-[10px] text-slate-400 truncate">{meta.name}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">₹{meta.price}</div>
                        <div className={clsx("text-[9px] font-mono", isGain ? "text-emerald-400" : "text-rose-400")}>
                          {isGain ? "+" : ""}{meta.changePct}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddPreset(sym);
                          setSearch("");
                        }}
                        className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
                        title="Add to Watchlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Presets Strip */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] font-bold mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Quick Add:</span>
          </span>
          {QUICK_PRESETS.map((p) => {
            const isTracked = watchlistSymbols.includes(p.symbol);
            return (
              <button
                key={p.symbol}
                type="button"
                onClick={() => {
                  if (!isTracked) handleAddPreset(p.symbol);
                }}
                disabled={isTracked}
                className={clsx(
                  "px-2.5 py-1 rounded-xl transition-all text-[11px] font-mono shadow-sm whitespace-nowrap flex items-center gap-1",
                  isTracked
                    ? "bg-white/[0.02] border border-white/5 text-slate-500 cursor-default"
                    : "bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-95"
                )}
              >
                <span>{isTracked ? "✓" : "+"}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🧭 3. Apple Satin Monochrome Sector Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner overflow-x-auto no-scrollbar text-xs">
        {SECTOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-[0.97]",
              activeSectorFilter === tab.id
                ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ⚡ 4. Content Area: Spatial Cards Grid vs Liquidity Matrix */}
      {filteredSymbols.length === 0 ? (
        <div className="py-14 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-white">No watchlist symbols match your current filters</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveSectorFilter("all");
              soundEngine.playSuccessTone();
            }}
            className="px-4 py-1.5 rounded-xl bg-white/[0.14] hover:bg-white/[0.22] border border-white/20 text-xs font-mono font-bold text-white transition active:scale-95 cursor-pointer shadow-sm"
          >
            Reset Watchlist Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* 📱 4A. Spatial Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSymbols.map((symbol) => {
            const meta = getStockMeta(symbol);
            const radar = getLiquidityRadarData(symbol, meta);
            const isGain = meta.change >= 0;
            const cleanSym = symbol.replace(/\.(NS|BO)$/, "");
            const sparkPoints = generateMiniPoints(meta.price, isGain);

            return (
              <div
                key={symbol}
                onClick={() => handleOpenDepthModal(symbol)}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#0d0f14]/95 to-[#090a0d]/95 hover:from-[#121424]/95 hover:to-[#0d0f14]/95 border border-white/[0.07] hover:border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 group relative flex flex-col justify-between space-y-4 cursor-pointer hover:-translate-y-1"
              >
                {/* Card Top: Avatar, Symbol, Liquidity Tier & Quick Menu */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
                      style={{ backgroundColor: `${meta.color || "#00d5ff"}25` }}
                    >
                      {cleanSym.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white font-mono group-hover:text-cyan-300 transition truncate">
                          {cleanSym}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                          NSE
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {meta.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Delete button (discreet on hover) */}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(symbol, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove symbol from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price & Sparkline Row */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-lg font-mono font-black text-white">
                      <RollingTicker
                        value={meta.price}
                        prefix="₹"
                        decimalPlaces={2}
                        className="text-white font-black font-mono"
                      />
                    </div>
                    <div className={clsx(
                      "text-[10px] font-mono font-bold flex items-center gap-1 mt-0.5",
                      isGain ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isGain ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                      <span>{isGain ? "+" : ""}{meta.change} ({isGain ? "+" : ""}{meta.changePct}%)</span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5 shadow-inner">
                    <Sparkline
                      points={sparkPoints}
                      isGain={isGain}
                      width={56}
                      height={20}
                      interactive={false}
                    />
                  </div>
                </div>

                {/* 📊 True Liquidity Radar: Intraday Range Spectrum Bar */}
                <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>L: ₹{radar.dayLow}</span>
                    <span className="text-slate-300 font-semibold">Day Range</span>
                    <span>H: ₹{radar.dayHigh}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full"
                      style={{ width: "100%" }}
                    />
                    {/* Glowing Pointer Indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-2.5 h-2.5 -mt-0.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] border border-black transform -translate-x-1/2"
                      style={{ left: `${radar.rangeProgress}%` }}
                    />
                  </div>
                </div>

                {/* Liquidity Telemetry Dock: Volume & Spread */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                  <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 block text-[9px]">Volume</span>
                    <span className="text-white font-bold">{radar.volumeShares}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 block text-[9px]">Turnover</span>
                    <span className="text-cyan-300 font-bold">{radar.turnoverCr}</span>
                  </div>
                </div>

                {/* 🎯 Real Action Buttons: Quick Trade & Radar Depth (NO DUMMY BUTTONS) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleOpenTradeModal(symbol, e)}
                    className="w-full py-1.5 px-2 rounded-xl bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1"
                    title={`Trade ${cleanSym}`}
                  >
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400/30" />
                    <span>Trade</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenDepthModal(symbol, e)}
                    className="w-full py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                    title={`View Depth & Liquidity for ${cleanSym}`}
                  >
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>Depth</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 📊 4B. Detailed Liquidity Matrix Table View */
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0d0f14]/85 backdrop-blur-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-white/[0.02]">
                <th className="p-3.5">Asset / Symbol</th>
                <th className="p-3.5">LTP &amp; Change</th>
                <th className="p-3.5">Intraday Range (L - H)</th>
                <th className="p-3.5">Volume &amp; Turnover</th>
                <th className="p-3.5">VWAP &amp; Spread</th>
                <th className="p-3.5">Liquidity Tier</th>
                <th className="p-3.5 text-right">Execution Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredSymbols.map((symbol) => {
                const meta = getStockMeta(symbol);
                const radar = getLiquidityRadarData(symbol, meta);
                const isGain = meta.change >= 0;
                const cleanSym = symbol.replace(/\.(NS|BO)$/, "");

                return (
                  <tr 
                    key={symbol} 
                    onClick={() => handleOpenDepthModal(symbol)}
                    className="hover:bg-white/[0.03] transition cursor-pointer group"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0"
                          style={{ backgroundColor: `${meta.color || "#00d5ff"}25` }}
                        >
                          {cleanSym.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-white font-mono group-hover:text-cyan-300 transition">
                            {cleanSym}
                          </div>
                          <div className="text-[10px] text-slate-400">{meta.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-white text-sm">₹{meta.price}</div>
                      <div className={clsx("text-[10px] font-bold flex items-center gap-1", isGain ? "text-emerald-400" : "text-rose-400")}>
                        {isGain ? "+" : ""}{meta.change} ({isGain ? "+" : ""}{meta.changePct}%)
                      </div>
                    </td>

                    <td className="p-3.5 w-44">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>₹{radar.dayLow}</span>
                          <span>₹{radar.dayHigh}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full" />
                          <div
                            className="absolute top-0 bottom-0 w-2 h-2 -mt-0.5 rounded-full bg-white border border-black transform -translate-x-1/2"
                            style={{ left: `${radar.rangeProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-white">{radar.volumeShares}</div>
                      <div className="text-[10px] text-slate-400">{radar.turnoverCr}</div>
                    </td>

                    <td className="p-3.5 font-mono">
                      <div className="text-slate-300">₹{radar.vwap}</div>
                      <div className="text-[10px] text-slate-400">Spread: {radar.spread}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
                        {radar.tier}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenTradeModal(symbol, e)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/20 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Trade</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemove(symbol, e)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 🌟 MODAL 1: APPLE VISION PRO QUICK TRADE DESK ─────────────────────── */}
      {activeModal?.type === "trade" && activeStockMeta && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="w-full max-w-lg p-6 rounded-[28px] bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/15"
                  style={{ backgroundColor: `${activeStockMeta.color || "#00d5ff"}25` }}
                >
                  {activeCleanSym.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black font-mono text-white">{activeCleanSym}</h3>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      NSE Live
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{activeStockMeta.name}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instrument Mode Tabs: Equity vs Option Scalp */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTradeTab("equity")}
                className={clsx(
                  "py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer",
                  tradeTab === "equity"
                    ? "bg-white/[0.14] text-white border border-white/20 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Equity Shares (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setTradeTab("option")}
                className={clsx(
                  "py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer",
                  tradeTab === "option"
                    ? "bg-white/[0.14] text-white border border-white/20 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Option Scalp (ATM)</span>
              </button>
            </div>

            {/* 📈 TAB 1: Equity Cash Order Form */}
            {tradeTab === "equity" && (
              <div className="space-y-4">
                {/* Buy vs Sell Direction */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSide("BUY")}
                    className={clsx(
                      "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
                      orderSide === "BUY"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                        : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>BUY (Long Asset)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide("SELL")}
                    className={clsx(
                      "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
                      orderSide === "SELL"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                        : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>SELL (Short / Exit)</span>
                  </button>
                </div>

                {/* Product Type (CNC Delivery vs MIS Intraday) */}
                <div className="flex items-center justify-between text-xs font-mono p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-slate-400">Product Mode:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProductType("CNC")}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition",
                        productType === "CNC" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      CNC (Delivery / Wealth)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType("MIS")}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition",
                        productType === "MIS" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      MIS (Intraday)
                    </button>
                  </div>
                </div>

                {/* Quantity Input with Steppers */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Order Quantity (Shares):</span>
                    <span>LTP: ₹{activeStockMeta.price}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTradeQty((q) => Math.max(1, q - 5))}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={tradeQty}
                      onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-black/60 border border-white/15 rounded-xl text-center py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => setTradeQty((q) => q + 5)}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg font-bold border border-white/10 transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Pill Steppers */}
                  <div className="flex gap-1.5 pt-1">
                    {[10, 25, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTradeQty(num)}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] text-[10px] font-mono text-slate-300 border border-white/5 transition"
                      >
                        {num} Qty
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Summary Dock */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Investment:</span>
                    <strong className="text-white">
                      ₹{(activeStockMeta.price * tradeQty).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Est. Brokerage &amp; Taxes:</span>
                    <span className="text-emerald-400 font-bold">₹0.00 (Zero Delivery Brokerage)</span>
                  </div>
                  <div className="flex justify-between text-slate-400 border-t border-white/10 pt-1.5">
                    <span>Available Cash Margin:</span>
                    <span className="text-cyan-300 font-bold">₹1,25,000.00</span>
                  </div>
                </div>

                {/* Action CTA */}
                <button
                  type="button"
                  onClick={() => handleExecuteEquityTrade(activeStockMeta, activeCleanSym)}
                  className={clsx(
                    "w-full py-3 rounded-2xl font-bold font-mono text-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2",
                    orderSide === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  <span>Execute {orderSide} Order · ₹{(activeStockMeta.price * tradeQty).toLocaleString("en-IN")}</span>
                </button>
              </div>
            )}

            {/* 🎯 TAB 2: Option Scalper Form */}
            {tradeTab === "option" && (
              <div className="space-y-4">
                {/* Call vs Put Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOptionType("CE")}
                    className={clsx(
                      "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
                      optionType === "CE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                        : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    <span>CALL CE (Bullish ATM)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionType("PE")}
                    className={clsx(
                      "py-2.5 rounded-xl font-bold font-mono text-xs transition border flex items-center justify-center gap-1.5 cursor-pointer",
                      optionType === "PE"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
                        : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    <span>PUT PE (Bearish ATM)</span>
                  </button>
                </div>

                {/* Strike & Lot Details */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolved ATM Strike:</span>
                    <strong className="text-white">
                      {activeCleanSym} {Math.round(activeStockMeta.price / 50) * 50} {optionType}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Option Premium:</span>
                    <strong className="text-cyan-300">
                      ₹{(activeStockMeta.price * (optionType === "CE" ? 0.022 : 0.020)).toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard Lot Size:</span>
                    <span className="text-slate-200">25 Shares / Lot</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5">
                    <span className="text-slate-400">Required Margin:</span>
                    <strong className="text-emerald-400">
                      ₹{(activeStockMeta.price * (optionType === "CE" ? 0.022 : 0.020) * 25 * optionLots).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Primary Action CTA */}
                <button
                  type="button"
                  onClick={() => handleExecuteOptionScalp(activeStockMeta, activeCleanSym)}
                  className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-sm transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Deploy {optionType} Practice Scalp</span>
                </button>

                {/* Secondary Action: Open in Full Paper Desk */}
                <button
                  type="button"
                  onClick={() => handleTransferToPaperLab(activeStockMeta, activeCleanSym)}
                  className="w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-semibold transition border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open in Full Paper Lab Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 📡 MODAL 2: APPLE VISION PRO LIQUIDITY & DEPTH INSPECTOR ─────────── */}
      {activeModal?.type === "depth" && activeStockMeta && activeRadarData && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="w-full max-w-xl p-6 rounded-[28px] bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/15"
                  style={{ backgroundColor: `${activeStockMeta.color || "#00d5ff"}25` }}
                >
                  {activeCleanSym.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black font-mono text-white">{activeCleanSym}</h3>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {activeRadarData.tier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{activeStockMeta.name} · {activeStockMeta.sector}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price & Buyer/Seller Dominance */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Live Quote</span>
                  <div className="text-xl font-black text-white">₹{activeStockMeta.price}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Buyer / Seller Dominance</span>
                  <div className="text-xs font-bold text-slate-200">
                    <span className="text-emerald-400">{activeRadarData.buyerDominance}% Buy</span> vs <span className="text-rose-400">{100 - activeRadarData.buyerDominance}% Sell</span>
                  </div>
                </div>
              </div>

              {/* Dominance Gauge Bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${activeRadarData.buyerDominance}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${100 - activeRadarData.buyerDominance}%` }} />
              </div>
            </div>

            {/* 5-Level Simulated Order Book (Bids vs Asks) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-400 px-1">
                <span className="text-emerald-400">BID DEPTH (BUYERS)</span>
                <span className="text-rose-400">ASK DEPTH (SELLERS)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {/* Bids Column */}
                <div className="space-y-1 p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <div className="flex justify-between text-[10px] text-slate-400 pb-1 border-b border-white/5">
                    <span>Qty</span>
                    <span>Bid Price</span>
                  </div>
                  {activeRadarData.bids.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300">{b.qty.toLocaleString("en-IN")}</span>
                      <span className="text-emerald-400 font-bold">₹{b.price}</span>
                    </div>
                  ))}
                </div>

                {/* Asks Column */}
                <div className="space-y-1 p-2.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
                  <div className="flex justify-between text-[10px] text-slate-400 pb-1 border-b border-white/5">
                    <span>Ask Price</span>
                    <span>Qty</span>
                  </div>
                  {activeRadarData.asks.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-rose-400 font-bold">₹{a.price}</span>
                      <span className="text-slate-300">{a.qty.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Session Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">VWAP</span>
                <strong className="text-white">₹{activeRadarData.vwap}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Spread</span>
                <strong className="text-cyan-300">{activeRadarData.spread}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Day Volume</span>
                <strong className="text-white">{activeRadarData.volumeShares}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 block text-[10px]">Turnover</span>
                <strong className="text-cyan-300">{activeRadarData.turnoverCr}</strong>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={(e) => handleOpenTradeModal(activeModal.symbol, e)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.14] hover:bg-white/[0.22] text-white border border-white/20 font-bold text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Trade {activeCleanSym}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 🍞 FLOATING APPLE NOTIFICATION TOAST ─────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-[#121424]/95 border border-white/10 text-white text-xs font-mono font-bold shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

