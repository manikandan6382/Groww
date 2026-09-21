import React from "react";
import { RollingTicker } from "../../common/RollingTicker";
import { Radio, ShieldCheck, ShieldAlert, Zap } from "lucide-react";
import clsx from "clsx";

export function StudioHeaderTelemetry({
  currentDatasetLabel,
  paperPnlRange = "all",
  totalRealizedPnl = 0,
  winRate = "0.0",
  winCount = 0,
  lossCount = 0,
  totalTradesCount = 0,
  profitFactor = "0.00",
  expectancyStr = "₹0.0/trade",
  totalFriction = 0,
  frictionDragPct = 0,
  disciplineTaxRupees = 0,
  rawStrategyAlphaRupees = 0
}) {
  const pnlNum = Number(totalRealizedPnl || 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-mono shadow-sm">
            PORTFOLIO INTELLIGENCE &amp; PERFORMANCE STUDIO
          </span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            QUANT RADAR ACTIVE
          </span>
          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Friction Absorbed</span>
          </span>
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">
          Daily Performance &amp; Quantitative Execution Studio
        </h2>
        <p className="text-xs text-slate-400">
          Normalized R-multiples, statutory tax deduction, and mathematical expectancy across practice sessions.
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap">
        {/* Metric 1: Realized Net P&L */}
        <div className="p-2.5 px-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-medium">
            Net P&amp;L ({currentDatasetLabel || paperPnlRange})
          </span>
          <div className={clsx("font-mono text-sm font-black", pnlNum >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker
              value={pnlNum}
              prefix="₹"
              showSign={true}
              decimalPlaces={2}
              className={pnlNum >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
          {totalFriction > 0 && (
            <span className="text-[9px] font-mono text-slate-500 block">
              -₹{totalFriction} Friction ({frictionDragPct}% Drag)
            </span>
          )}
        </div>

        {/* Metric 2: Discipline Shield & Tax */}
        <div className="p-2.5 px-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-medium">Discipline Shield</span>
          <div className={clsx("font-mono text-sm font-black flex items-center justify-end gap-1", disciplineTaxRupees > 0 ? "text-rose-400" : "text-emerald-400")}>
            {disciplineTaxRupees > 0 ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>-₹{disciplineTaxRupees}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>₹0.00 Leaks</span>
              </>
            )}
          </div>
          <span className="text-[9px] font-mono text-slate-400 block truncate">
            {disciplineTaxRupees > 0
              ? `Raw Edge: +₹${rawStrategyAlphaRupees}`
              : "100% Invariants Honored"}
          </span>
        </div>

        {/* Metric 3: Win Rate & PF */}
        <div className="p-2.5 px-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-medium">Win Rate &amp; PF</span>
          <div className="flex items-center gap-1.5 justify-end">
            <div className="font-mono text-sm font-black text-cyan-400">
              <RollingTicker value={Number(winRate)} suffix="%" decimalPlaces={1} className="text-cyan-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">({winCount}W/{lossCount}L)</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold block">
            PF: {profitFactor}x
          </span>
        </div>

        {/* Metric 3: Quant Expectancy */}
        <div className="p-2.5 px-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0 shadow-sm">
          <span className="text-[10px] text-slate-400 block font-medium">Expectancy / Trade</span>
          <div className="font-mono text-sm font-black text-emerald-400 flex items-center justify-end gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{expectancyStr.replace("/trade", "")}</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 block">
            {totalTradesCount} Trades Sampled
          </span>
        </div>
      </div>
    </div>
  );
}
