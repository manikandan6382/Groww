import React from "react";
import clsx from "clsx";
import { PieChart } from "lucide-react";
import { CONCENTRATION_COLORS } from "./holdingsConstants";

export function HoldingsConcentrationHorizon({
  totalHoldingsValue,
  enrichedItems,
  hoveredHolding,
  setHoveredHolding,
  search,
  setSearch,
}) {
  if (!enrichedItems || enrichedItems.length === 0) return null;

  return (
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
          const color = CONCENTRATION_COLORS[idx % CONCENTRATION_COLORS.length];
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
  );
}
