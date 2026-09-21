import React from "react";
import clsx from "clsx";
import { PieChart, ShieldAlert, Sparkles, Layers } from "lucide-react";

export function SectorBreakdownCard({
  sectors = [],
  topSector = null,
  hhiScore = 0,
  diversificationLabel = "Optimal",
  diversificationColor = "emerald",
  isPrivacyMode = false,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center font-mono text-xs text-slate-400 space-y-1">
        <Layers className="w-5 h-5 mx-auto text-slate-500 opacity-60" />
        <p>No equity holdings detected in portfolio</p>
      </div>
    );
  }

  const topSectors = sectors.slice(0, 4);

  return (
    <div className="space-y-3 pt-2 border-t border-white/[0.08] font-mono text-xs">
      {/* Sector Summary Pill */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-slate-300 font-bold text-[11px]">{sectors.length} Active Sectors</span>
        </div>
        <span
          className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
            diversificationColor === "emerald"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : diversificationColor === "amber"
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          {diversificationLabel}
        </span>
      </div>

      {/* Sector Breakdown Rows */}
      <div className="space-y-2">
        {topSectors.map((sec) => {
          const convertedVal = Math.round((sec.value || 0) / fxRate);
          return (
            <div
              key={sec.name}
              className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: sec.color, boxShadow: `0 0 6px ${sec.color}80` }}
                  />
                  <span className="text-slate-200 font-semibold truncate">{sec.name}</span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span
                    className={clsx(
                      "text-[10px] text-slate-400 font-mono transition-all duration-300",
                      isPrivacyMode && "filter blur-[6px] select-none hover:blur-none cursor-pointer"
                    )}
                  >
                    {currencySymbol}{convertedVal.toLocaleString("en-IN")}
                  </span>
                  <span className="text-white font-bold text-xs">{sec.percentage}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(3, sec.percentage))}%`,
                    backgroundColor: sec.color,
                  }}
                />
              </div>

              {/* Symbol Badges */}
              {sec.symbols && sec.symbols.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {sec.symbols.slice(0, 3).map((sym) => (
                    <span
                      key={sym}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-300 border border-white/10"
                    >
                      {sym}
                    </span>
                  ))}
                  {sec.symbols.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{sec.symbols.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
