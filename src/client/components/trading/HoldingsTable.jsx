import React, { useState, useMemo, useEffect, useRef } from "react";
import { Sparkline } from "../common/Sparkline";
import { RollingTicker } from "../common/RollingTicker";
import { getStockMeta, useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Layers, 
  ArrowUpDown, 
  ShieldCheck, 
  Filter, 
  Command,
  Zap,
  Copy,
  Check,
  PieChart,
  Sparkles
} from "lucide-react";
import clsx from "clsx";

export function HoldingsTable({ holdings = [] }) {
  const { setActiveView, setOrderPadPreFill } = useTradingStore();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("weight"); // "weight" | "pnl" | "day" | "symbol"
  const [copiedSymbol, setCopiedSymbol] = useState(null);
  const [hoveredHolding, setHoveredHolding] = useState(null);
  const searchInputRef = useRef(null);

  // Pro-Trader Keyboard Shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const defaultHoldings = [
    { tradingsymbol: "RELIANCE", quantity: 50, average_price: 1280.00, last_price: 1307.20, pnl: 1360.00, day_change: 15.40, day_change_percentage: 1.19 },
    { tradingsymbol: "TCS", quantity: 20, average_price: 2310.00, last_price: 2268.10, pnl: -838.00, day_change: -12.30, day_change_percentage: -0.54 },
    { tradingsymbol: "HDFCBANK", quantity: 100, average_price: 710.00, last_price: 729.65, pnl: 1965.00, day_change: 4.80, day_change_percentage: 0.66 },
    { tradingsymbol: "INFY", quantity: 60, average_price: 1140.00, last_price: 1121.10, pnl: -1134.00, day_change: -8.90, day_change_percentage: -0.79 },
    { tradingsymbol: "ICICIBANK", quantity: 80, average_price: 1380.00, last_price: 1438.00, pnl: 4640.00, day_change: 18.20, day_change_percentage: 1.28 },
    { tradingsymbol: "SBIN", quantity: 150, average_price: 1020.00, last_price: 1056.00, pnl: 5400.00, day_change: 22.50, day_change_percentage: 2.18 },
    { tradingsymbol: "GOLDBEES", quantity: 300, average_price: 125.00, last_price: 132.87, pnl: 2361.00, day_change: 0.95, day_change_percentage: 0.72 },
  ];

  const items = holdings.length ? holdings : defaultHoldings;

  // Calculate total equity value for weight percentages
  const totalHoldingsValue = useMemo(() => {
    const sum = items.reduce((acc, h) => acc + Number(h.quantity || 0) * Number(h.last_price || h.average_price || 0), 0);
    return Math.max(1, sum);
  }, [items]);

  const enrichedItems = useMemo(() => {
    return items.map((h) => {
      const sym = h.tradingsymbol;
      const meta = getStockMeta(`${sym}.NS`);
      const qty = Number(h.quantity || 0);
      const avg = Number(h.average_price || 0);
      const ltp = Number(h.last_price || avg);
      const val = qty * ltp;
      const weightPct = ((val / totalHoldingsValue) * 100).toFixed(1);
      const pnl = Number(h.pnl ?? (val - qty * avg));
      const pnlPct = avg > 0 ? (((ltp - avg) / avg) * 100).toFixed(2) : "0.00";
      const dayChg = Number(h.day_change ?? (ltp * 0.008));
      const dayChgPct = Number(h.day_change_percentage ?? 0.8);

      return {
        ...h,
        meta,
        qty,
        avg,
        ltp,
        val,
        weightPct: Number(weightPct),
        pnl,
        pnlPct,
        dayChg,
        dayChgPct,
        isGain: pnl >= 0,
        isDayGain: dayChg >= 0
      };
    });
  }, [items, totalHoldingsValue]);

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return enrichedItems.filter((item) => {
      const sym = item.tradingsymbol.toLowerCase();
      const name = (item.meta?.name || "").toLowerCase();
      const sector = (item.meta?.sector || "").toLowerCase();
      const q = search.toLowerCase().trim();

      if (q && !sym.includes(q) && !name.includes(q) && !sector.includes(q)) {
        return false;
      }

      if (filter === "gain") return item.isGain;
      if (filter === "loss") return !item.isGain;
      if (filter === "banking") return sector.includes("bank");
      if (filter === "tech") return sector.includes("it") || sector.includes("tech");
      if (filter === "large") return item.weightPct >= 15;
      return true;
    }).sort((a, b) => {
      if (sortBy === "weight") return b.val - a.val;
      if (sortBy === "pnl") return b.pnl - a.pnl;
      if (sortBy === "day") return b.dayChgPct - a.dayChgPct;
      if (sortBy === "symbol") return a.tradingsymbol.localeCompare(b.tradingsymbol);
      return 0;
    });
  }, [enrichedItems, search, filter, sortBy]);

  const gainersCount = enrichedItems.filter((i) => i.isGain).length;
  const losersCount = enrichedItems.filter((i) => !i.isGain).length;
  const topHolding = enrichedItems.reduce((max, i) => (i.val > (max?.val || 0) ? i : max), enrichedItems[0]);

  const handleCopy = (symbol) => {
    navigator.clipboard.writeText(symbol);
    setCopiedSymbol(symbol);
    soundEngine.playSuccessTone();
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const handleFilterChange = (f) => {
    setFilter(f);
    soundEngine.playTabSwitchTone();
  };

  const handleSortChange = (s) => {
    setSortBy(s);
    soundEngine.playTabSwitchTone();
  };

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#070b14]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] relative overflow-hidden space-y-6 hover:border-white/[0.12] transition-colors">
      {/* 🌌 Apple Spatial Ambient Spotlight */}
      <div className="absolute top-0 left-1/4 w-[480px] h-[220px] bg-cyan-500/[0.06] rounded-full blur-[90px] pointer-events-none -mt-24" />

      {/* 1. Header: Master Title, Telemetry Pills & Frosted Search Box */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap">
              EQUITY ASSET MATRIX
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {gainersCount} Gainers · {losersCount} Losers
            </span>
            <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono whitespace-nowrap">
              Top Holding: {topHolding?.tradingsymbol} ({topHolding?.weightPct}%)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Active Holdings &amp; Asset Concentration Matrix
          </h2>
          <p className="text-xs text-slate-300">
            Real-time equity valuation, portfolio weight dispersion, and 1-click option scalp deployment.
          </p>
        </div>

        {/* Apple Vision Pro Style Frosted Search Input */}
        <div className="relative flex items-center min-w-[280px]">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock, sector... (Press /)"
            className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-12 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-xl transition shadow-inner font-sans"
          />
          <div className="absolute right-3 flex items-center gap-1">
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            ) : (
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-md">
                /
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Apple Spatial Horizon: Interactive Portfolio Concentration Spectrum */}
      <div className="relative p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-bold">Portfolio Concentration Horizon</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Total Capital: <strong className="text-white">₹{Math.round(totalHoldingsValue).toLocaleString("en-IN")}</strong>
          </span>
        </div>

        {/* Continuous Multi-Segment Gradient Bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex shadow-inner">
          {enrichedItems.map((item, idx) => {
            const colors = [
              "from-cyan-500 to-sky-400",
              "from-teal-500 to-emerald-400",
              "from-indigo-500 to-violet-400",
              "from-amber-500 to-yellow-400",
              "from-pink-500 to-rose-400",
              "from-blue-500 to-cyan-400",
              "from-emerald-500 to-teal-400"
            ];
            const color = colors[idx % colors.length];
            const isHovered = hoveredHolding === item.tradingsymbol;

            return (
              <div
                key={item.tradingsymbol}
                style={{ width: `${item.weightPct}%` }}
                onMouseEnter={() => setHoveredHolding(item.tradingsymbol)}
                onMouseLeave={() => setHoveredHolding(null)}
                className={clsx(
                  "h-full bg-gradient-to-r transition-all duration-200 cursor-pointer relative group",
                  color,
                  isHovered ? "brightness-125 z-10 scale-y-125 shadow-lg" : "opacity-90 hover:opacity-100"
                )}
                title={`${item.tradingsymbol}: ${item.weightPct}% (₹${Math.round(item.val).toLocaleString("en-IN")})`}
              />
            );
          })}
        </div>

        {/* Interactive Chip Legend */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
          {enrichedItems.map((item) => (
            <button
              key={item.tradingsymbol}
              type="button"
              onClick={() => setSearch(item.tradingsymbol)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer",
                hoveredHolding === item.tradingsymbol || search === item.tradingsymbol
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border-white/5"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.meta?.color || "#38bdf8" }} />
              <span>{item.tradingsymbol}</span>
              <strong className="text-white">{item.weightPct}%</strong>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Segmented Filter Tabs & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner flex-wrap">
          {[
            { id: "all", label: `All Assets (${enrichedItems.length})` },
            { id: "gain", label: "🟢 Gainers" },
            { id: "loss", label: "🔴 Losers" },
            { id: "banking", label: "🏦 Banking" },
            { id: "tech", label: "💻 Tech & IT" },
            { id: "large", label: "💎 Core (>15%)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFilterChange(tab.id)}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
                filter === tab.id
                  ? "bg-white/15 text-white border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-black/40 border border-white/15 rounded-xl px-3 py-1 text-slate-200 focus:outline-none text-xs font-mono font-bold cursor-pointer"
          >
            <option value="weight" className="bg-slate-900 text-white">Portfolio Weight %</option>
            <option value="pnl" className="bg-slate-900 text-white">Total P&amp;L (₹)</option>
            <option value="day" className="bg-slate-900 text-white">Today's Change %</option>
            <option value="symbol" className="bg-slate-900 text-white">Stock Symbol</option>
          </select>
        </div>
      </div>

      {/* 4. Main Apple Precision 7-Column Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] shadow-inner">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[10px] uppercase font-mono font-extrabold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 min-w-[200px] whitespace-nowrap">Asset / Instrument</th>
              <th className="py-3.5 px-4 min-w-[150px] whitespace-nowrap">Portfolio Allocation</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Position &amp; Cost</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Live LTP &amp; Value</th>
              <th className="py-3.5 px-4 min-w-[130px] text-right whitespace-nowrap">Today's Movement</th>
              <th className="py-3.5 px-4 min-w-[140px] text-right whitespace-nowrap">Unrealized Return</th>
              <th className="py-3.5 px-4 min-w-[150px] text-center whitespace-nowrap">Trend &amp; Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">No active holdings match your filter</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {search ? `No results found for "${search}"` : "No assets in this selected category"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setFilter("all");
                        soundEngine.playSuccessTone();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-white/[0.045] transition-all duration-150 group relative"
                >
                  {/* Col 1: Asset / Instrument */}
                  <td className="py-3.5 px-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
                        style={{ 
                          backgroundColor: `${item.meta?.color || "#38bdf8"}25`, 
                        }}
                      >
                        {item.tradingsymbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-white group-hover:text-cyan-300 transition-colors font-mono flex items-center gap-2 whitespace-nowrap">
                          <span>{item.tradingsymbol}</span>
                          <span className="text-[9px] font-bold font-sans text-slate-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            {item.meta?.sector || "Equity"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5 whitespace-nowrap">
                          {item.meta?.name || item.tradingsymbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Col 2: Portfolio Weight % Heatbar with ₹ Amount */}
                  <td className="py-3.5 px-4 min-w-[150px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold whitespace-nowrap">
                        <span className="text-white">{item.weightPct}%</span>
                        <span className="text-[10px] text-slate-400">₹{(item.val / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-300"
                          style={{ width: `${Math.min(100, item.weightPct * 3.5)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Col 3: Position & Average Cost */}
                  <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
                    <div className="font-bold text-slate-200 text-xs">
                      <RollingTicker value={item.qty} decimalPlaces={0} className="text-slate-200 font-bold" /> shares
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      @ <RollingTicker value={item.avg} prefix="₹" decimalPlaces={2} className="text-slate-400" />
                    </div>
                  </td>

                  {/* Col 4: Live LTP & Total Value */}
                  <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
                    <div className="font-black text-white text-sm">
                      <RollingTicker value={item.ltp} prefix="₹" decimalPlaces={2} className="text-white font-black" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Val: ₹{Math.round(item.val).toLocaleString("en-IN")}
                    </div>
                  </td>

                  {/* Col 5: Today's Movement */}
                  <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
                    <div className={clsx("font-bold text-xs flex items-center justify-end gap-1", item.isDayGain ? "text-cyan-400" : "text-rose-400")}>
                      {item.isDayGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{item.isDayGain ? "+" : ""}₹{Math.abs(item.dayChg).toFixed(2)}</span>
                    </div>
                    <div className={clsx("text-[10px] font-semibold mt-0.5", item.isDayGain ? "text-cyan-300/90" : "text-rose-300/90")}>
                      {item.isDayGain ? "+" : ""}{item.dayChgPct}% 1D
                    </div>
                  </td>

                  {/* Col 6: Total Unrealized Return */}
                  <td className="py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap">
                    <div className={clsx("font-black text-sm drop-shadow-sm", item.isGain ? "text-emerald-400" : "text-rose-400")}>
                      <RollingTicker 
                        value={item.pnl} 
                        prefix="₹" 
                        showSign={true} 
                        decimalPlaces={2} 
                        className={item.isGain ? "text-emerald-400" : "text-rose-400"}
                      />
                    </div>
                    <div className={clsx("text-[10px] font-bold mt-0.5", item.isGain ? "text-emerald-300" : "text-rose-300")}>
                      {item.isGain ? "+" : ""}{item.pnlPct}% Return
                    </div>
                  </td>

                  {/* Col 7: Trend & Action Hub */}
                  <td className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <div className="p-1 rounded-lg bg-white/[0.03] border border-white/5 shadow-inner">
                        <Sparkline isGain={item.isGain} width={42} height={15} />
                      </div>

                      {/* 1-Click Copy Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.tradingsymbol);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Copy Symbol"
                      >
                        {copiedSymbol === item.tradingsymbol ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* 1-Click Trade ATM Option Scalper */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const sym = item.tradingsymbol;
                          const ltp = Number(item.ltp || item.avg || 1000);
                          const roundedStrike = Math.round(ltp / 50) * 50;
                          setOrderPadPreFill({
                            symbol: `${sym} ${roundedStrike} CE`,
                            underlying: sym,
                            entryPrice: Number((ltp * 0.02).toFixed(2)),
                            targetPrice: Number((ltp * 0.026).toFixed(2)),
                            stopLoss: Number((ltp * 0.016).toFixed(2)),
                            quantity: 1,
                            lotSize: 25
                          });
                          setActiveView("paper");
                          soundEngine.playSuccessTone();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
                        title={`1-Click Practice Option Scalp on ${item.tradingsymbol}`}
                      >
                        <Zap className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Trade</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
