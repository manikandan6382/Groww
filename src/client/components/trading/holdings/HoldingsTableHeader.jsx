import React from "react";
import { Search, Share2, Check, TrendingUp, ShieldCheck, Layers } from "lucide-react";
import clsx from "clsx";
import { useTradingStore } from "../../../stores/useTradingStore";

export function HoldingsTableHeader({
  gainersCount,
  losersCount,
  topHolding,
  topInvested,
  totalHoldingsValue = 0,
  totalInvestedValue = 0,
  totalUnrealizedPnl = 0,
  totalUnrealizedPnlPct = "0.00",
  portfolioProfitMultiplier = 1.0,
  portfolioCushionPct = "0.0",
  avgCostPerPosition = 0,
  search,
  setSearch,
  searchInputRef,
  onCopySummary,
  copiedSymbol,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const privacyClass = isPrivacyMode 
    ? "filter blur-[7px] select-none hover:blur-none transition-all duration-200 cursor-pointer" 
    : "";

  const isGain = totalUnrealizedPnl >= 0;
  const convertedTopInvested = topInvested?.investedVal ? Math.round(topInvested.investedVal / fxRate) : 0;

  return (
    <div className="space-y-4 border-b border-white/[0.08] pb-5">
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>EQUITY ASSET MATRIX</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {gainersCount} Gainers · {losersCount} Losers
            </span>
            {topHolding?.tradingsymbol && (
              <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono whitespace-nowrap" title={`Top position by live valuation: ${topHolding.tradingsymbol}`}>
                Top Value: <strong className="text-white">{topHolding.tradingsymbol}</strong> ({topHolding.weightPct}%)
              </span>
            )}
            {topInvested?.tradingsymbol && topInvested.tradingsymbol !== topHolding?.tradingsymbol && (
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full border border-indigo-500/30 font-mono whitespace-nowrap" title="Largest cash position deployed without profit">
                Max Invested: <strong className="text-indigo-200">{topInvested.tradingsymbol}</strong> ({currencySymbol}{convertedTopInvested.toLocaleString("en-IN")})
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Active Holdings &amp; Asset Concentration Matrix</span>
          </h2>
          <p className="text-xs text-slate-300">
            Real-time equity valuation, portfolio weight dispersion, and verified invested cost basis (value without profit).
          </p>
        </div>

        {/* Apple Vision Pro Style Frosted Search Input & Quick Copy Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex items-center flex-1 lg:min-w-[280px]">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stock, sector... (/)"
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

          {onCopySummary && (
            <button
              type="button"
              onClick={onCopySummary}
              className="px-3 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono shrink-0 cursor-pointer shadow-sm active:scale-95"
              title="Copy Portfolio Cost Basis & Valuation Breakdown to Clipboard"
            >
              {copiedSymbol === "SUMMARY_COPIED" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] hidden sm:inline font-bold">Export</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 💎 Apple Luxury Spatial Telemetry Strip (Value Without Profit vs Live Valuation vs P&L Cushion) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] font-mono text-xs">
        {/* Card 1: Value Without Profit (Original Cost Basis) */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-indigo-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>Invested Capital</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-extrabold tracking-wider">
              WITHOUT PROFIT
            </span>
          </div>
          <div className={clsx("text-lg font-black text-slate-100 tracking-tight", privacyClass)}>
            {currencySymbol}{Math.round(totalInvestedValue / fxRate).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Pure cost basis</span>
            <span className={clsx("font-mono text-slate-300 font-bold", privacyClass)}>
              {currencySymbol}{Math.round(avgCostPerPosition / fxRate).toLocaleString("en-IN")}/pos
            </span>
          </div>
        </div>

        {/* Card 2: Current Valuation (Live Market Value at LTP) */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-cyan-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Current Valuation</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-extrabold tracking-wider">
              LIVE NAV
            </span>
          </div>
          <div className={clsx("text-lg font-black text-white tracking-tight", privacyClass)}>
            {currencySymbol}{Math.round(totalHoldingsValue / fxRate).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-cyan-300/80 font-sans flex items-center justify-between">
            <span>Market liquidation value</span>
            <span className="font-mono text-cyan-300 font-bold">LTP basis</span>
          </div>
        </div>

        {/* Card 3: Net Unrealized Return */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-emerald-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className={clsx("w-3 h-3", isGain ? "text-emerald-400" : "text-rose-400")} />
              <span>Unrealized Return</span>
            </span>
            <span className={clsx("text-[9px] px-1.5 py-0.5 rounded border font-extrabold tracking-wider", isGain ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30")}>
              {isGain ? "PROFIT SPREAD" : "DRAWDOWN"}
            </span>
          </div>
          <div className={clsx("text-lg font-black tracking-tight flex items-baseline gap-1.5", isGain ? "text-emerald-400" : "text-rose-400", privacyClass)}>
            <span>{isGain ? "+" : "-"}{currencySymbol}{Math.round(Math.abs(totalUnrealizedPnl) / fxRate).toLocaleString("en-IN")}</span>
            <span className="text-xs font-bold font-sans">({isGain ? "+" : ""}{totalUnrealizedPnlPct}%)</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Value created above cost</span>
            <span className={clsx("font-mono font-bold", isGain ? "text-emerald-400" : "text-rose-400")}>
              {isGain ? "Alpha +" : "Deficit"}
            </span>
          </div>
        </div>

        {/* Card 4: Capital Multiplier & Profit Cushion */}
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] space-y-1 relative overflow-hidden group hover:border-amber-400/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Capital Multiplier</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-extrabold tracking-wider">
              {portfolioProfitMultiplier}x RETURN
            </span>
          </div>
          <div className="text-lg font-black text-amber-200 tracking-tight flex items-baseline gap-2">
            <span>{portfolioProfitMultiplier}x</span>
            <span className="text-xs font-bold text-slate-300 font-sans">
              ({isGain ? "+" : ""}{portfolioCushionPct}% cushion)
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex mt-1">
            <div
              className="h-full bg-indigo-500/80 rounded-l-full"
              style={{ width: `${Math.min(100, (1 / (portfolioProfitMultiplier || 1)) * 100)}%` }}
              title="Invested Principal (Cost without profit)"
            />
            {isGain && (
              <div
                className="h-full bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                style={{ width: `${Math.max(0, 100 - (1 / (portfolioProfitMultiplier || 1)) * 100)}%` }}
                title="Profit Cushion"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

