import React from "react";
import clsx from "clsx";
import { PieChart, ShieldCheck, DollarSign } from "lucide-react";
import { CONCENTRATION_COLORS } from "./holdingsConstants";

export function HoldingsConcentrationHorizon({
  totalHoldingsValue,
  totalInvestedValue,
  enrichedItems,
  concentrationMode = "valuation",
  onConcentrationModeChange,
  hoveredHolding,
  setHoveredHolding,
  search,
  setSearch,
}) {
  if (!enrichedItems || enrichedItems.length === 0) return null;

  const isCostMode = concentrationMode === "cost";
  const activeTotal = isCostMode ? totalInvestedValue : totalHoldingsValue;
  const hoveredItem = hoveredHolding ? enrichedItems.find((i) => i.tradingsymbol === hoveredHolding) : null;

  return (
    <div className="relative p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl space-y-3.5 shadow-inner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-200 font-bold tracking-tight">Portfolio Concentration Spectrum</span>
            <span className="text-[10px] text-slate-400 font-sans block sm:inline sm:ml-2">
              {isCostMode ? "Dispersion of pure capital deployed (without profit)" : "Dispersion of current market valuation (with profit)"}
            </span>
          </div>
        </div>

        {/* 🎚️ Luxury Perspective Switcher (With Profit vs Without Profit) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onConcentrationModeChange && (
            <div className="p-0.5 rounded-xl bg-black/40 border border-white/10 flex items-center shadow-inner font-mono text-[10px]">
              <button
                type="button"
                onClick={() => onConcentrationModeChange("valuation")}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition-all duration-150 cursor-pointer flex items-center gap-1",
                  !isCostMode
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="View concentration by live market valuation (including unrealized profit)"
              >
                <DollarSign className="w-3 h-3" />
                <span>Live Valuation</span>
              </button>

              <button
                type="button"
                onClick={() => onConcentrationModeChange("cost")}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition-all duration-150 cursor-pointer flex items-center gap-1",
                  isCostMode
                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="View concentration by original invested capital (pure cost basis without profit)"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Cost Basis (No Profit)</span>
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-300 font-mono bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/5 whitespace-nowrap">
            <span className="text-slate-400">{isCostMode ? "Pure Cost: " : "Live NAV: "}</span>
            <strong className={isCostMode ? "text-indigo-300" : "text-white"}>
              ₹{Math.round(activeTotal).toLocaleString("en-IN")}
            </strong>
          </div>
        </div>
      </div>

      {/* Continuous Multi-Segment Gradient Bar with Dynamic Thickness */}
      <div className="w-full h-3.5 rounded-full bg-black/40 border border-white/10 overflow-hidden flex shadow-inner p-0.5 relative">
        {enrichedItems.map((item, idx) => {
          const color = CONCENTRATION_COLORS[idx % CONCENTRATION_COLORS.length];
          const isHovered = hoveredHolding === item.tradingsymbol;
          const displayWeight = isCostMode ? item.investedWeightPct : item.valuationWeightPct;

          return (
            <div
              key={item.tradingsymbol}
              style={{ width: `${Math.max(1, displayWeight)}%` }}
              onMouseEnter={() => setHoveredHolding(item.tradingsymbol)}
              onMouseLeave={() => setHoveredHolding(null)}
              onClick={() => setSearch(item.tradingsymbol)}
              className={clsx(
                "h-full bg-gradient-to-r transition-all duration-200 cursor-pointer relative group rounded-sm",
                color,
                isHovered ? "brightness-125 z-10 scale-y-125 shadow-[0_0_12px_rgba(255,255,255,0.4)]" : "opacity-90 hover:opacity-100"
              )}
              title={`${item.tradingsymbol}: ${displayWeight}% (${isCostMode ? "Invested Basis" : "Current NAV"}: ₹${Math.round(isCostMode ? item.investedVal : item.val).toLocaleString("en-IN")})`}
            />
          );
        })}
      </div>

      {/* 🔮 Luxury Spatial Micro-Inspector Card (Visible on Hover) */}
      {hoveredItem && (
        <div className="p-2.5 rounded-xl bg-black/60 border border-white/15 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in slide-in-from-top-1 duration-150 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredItem.meta?.color || "#38bdf8" }} />
            <span className="font-extrabold text-white text-sm">{hoveredItem.tradingsymbol}</span>
            <span className="text-[10px] text-slate-300 font-sans px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {hoveredItem.meta?.sector || "Equity"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] flex-wrap">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Invested (No Profit)</span>
              <span className="text-indigo-200 font-bold">
                ₹{Math.round(hoveredItem.investedVal).toLocaleString("en-IN")} ({hoveredItem.investedWeightPct}%)
              </span>
              <span className="text-[9px] text-slate-400 font-sans ml-1">(@ ₹{hoveredItem.avg.toFixed(2)})</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Current Valuation</span>
              <span className="text-white font-bold">
                ₹{Math.round(hoveredItem.val).toLocaleString("en-IN")} ({hoveredItem.valuationWeightPct}%)
              </span>
              <span className="text-[9px] text-cyan-400 font-sans ml-1">(@ ₹{hoveredItem.ltp.toFixed(2)})</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Profit Spread</span>
              <span className={clsx("font-bold", hoveredItem.isGain ? "text-emerald-400" : "text-rose-400")}>
                {hoveredItem.isGain ? "+" : ""}₹{Math.round(hoveredItem.pnl).toLocaleString("en-IN")} ({hoveredItem.isGain ? "+" : ""}{hoveredItem.pnlPct}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Chip Legend */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
        {enrichedItems.map((item) => {
          const displayWeight = isCostMode ? item.investedWeightPct : item.valuationWeightPct;
          const isSelected = hoveredHolding === item.tradingsymbol || search === item.tradingsymbol;

          return (
            <button
              key={item.tradingsymbol}
              type="button"
              onClick={() => setSearch(search === item.tradingsymbol ? "" : item.tradingsymbol)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all whitespace-nowrap cursor-pointer",
                isSelected
                  ? isCostMode
                    ? "bg-indigo-500/25 text-indigo-200 border-indigo-500/40 shadow-sm"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                  : "bg-white/[0.03] text-slate-300 hover:text-white border-white/5 hover:bg-white/[0.08]"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.meta?.color || "#38bdf8" }} />
              <span className="font-bold">{item.tradingsymbol}</span>
              <strong className={isCostMode ? "text-indigo-200" : "text-white"}>{displayWeight}%</strong>
              <span className="text-[9px] text-slate-400">
                (₹{( (isCostMode ? item.investedVal : item.val) / 1000).toFixed(1)}K)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

