import React from "react";
import clsx from "clsx";
import { PieChart, ArrowUpRight, ArrowDownRight, Flame, BarChart3 } from "lucide-react";

export function SectorDivergenceMatrix({ sectors = [] }) {
  // Sort sectors by change % descending so leaders are at the top
  const sortedSectors = [...sectors].sort((a, b) => (b.changePct || 0) - (a.changePct || 0));

  return (
    <div className="rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] p-5 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Ambient Radial Accent */}
      <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full blur-3xl pointer-events-none bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-all" />

      <div className="space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white font-mono tracking-wider flex items-center gap-1.5">
                <span>SECTOR DIVERGENCE HEATMAP</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Intraday Sectoral Rotation &amp; Index Weights
              </p>
            </div>
          </div>

          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border text-indigo-300 bg-indigo-500/10 border-indigo-500/25 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-indigo-400" />
            ROTATION MATRIX
          </span>
        </div>

        {/* 6-Sector Performance Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {sortedSectors.map((sector) => {
            const isGain = Number(sector.changePct) >= 0;
            const absPct = Math.abs(sector.changePct);
            const barWidth = Math.min(100, Math.max(12, absPct * 45));

            return (
              <div
                key={sector.id}
                className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col justify-between space-y-2 group/card"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{sector.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200 truncate font-mono">
                        {sector.name}
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono">
                        Wt: {sector.weight}%
                      </div>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0",
                      sector.status === "LEADER" || sector.status === "BREAKOUT" || sector.status === "MOMENTUM"
                        ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                        : sector.status === "DRAGGING"
                          ? "text-rose-300 bg-rose-500/10 border-rose-500/25"
                          : "text-amber-300 bg-amber-500/10 border-amber-500/25"
                    )}
                  >
                    {sector.status}
                  </span>
                </div>

                {/* Percentage & Mini Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span
                      className={clsx(
                        "font-extrabold flex items-center gap-0.5",
                        isGain ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isGain ? "+" : ""}
                      {sector.changePct}%
                    </span>
                    <span className="text-[8px] text-slate-500">
                      {isGain ? "Inflow" : "Outflow"}
                    </span>
                  </div>

                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        isGain ? "bg-emerald-400/70" : "bg-rose-400/70"
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Diagnostic */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] relative z-10 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-indigo-400" />
          Leading Driver:
        </span>
        <span className="text-indigo-300 font-bold">
          {sortedSectors[0]?.name} (+{sortedSectors[0]?.changePct}%)
        </span>
      </div>
    </div>
  );
}
