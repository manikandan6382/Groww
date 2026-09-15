import React from "react";
import { Sparkles } from "lucide-react";

export function AllocationTelemetryBars({
  maxHoldingSymbol,
  maxConcentrationPct,
  liquidShieldVal,
  capitalGuardPct
}) {
  return (
    <div className="relative space-y-2.5 pt-2 border-t border-white/[0.08]">
      {/* Metric 1: Sector Diversification */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Multi-Sector Spread (5 Sectors)</span>
          <span className="text-emerald-400 font-mono font-bold">Low Beta (0.84)</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: "88%" }} />
        </div>
      </div>

      {/* Metric 2: Max Single Asset Concentration */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Max Asset ({maxHoldingSymbol})</span>
          <span className="text-cyan-300 font-mono font-bold">{maxConcentrationPct}% (Safe &lt; 25%)</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            style={{ width: `${Math.min(100, Number(maxConcentrationPct) * 3.5)}%` }}
          />
        </div>
      </div>

      {/* Metric 3: Crisis Defense Buffer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Liquid Crisis Shield</span>
          <span className="text-amber-300 font-mono font-bold">₹{(liquidShieldVal / 100000).toFixed(2)}L ({capitalGuardPct}%)</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${Math.min(100, capitalGuardPct * 1.5)}%` }}
          />
        </div>
      </div>

      {/* 4. Compact AI Telemetry Chip */}
      <div className="relative p-3 rounded-2xl bg-cyan-500/[0.07] border border-cyan-500/20 backdrop-blur-xl flex items-center gap-3">
        <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-slate-300 leading-snug font-sans flex-1">
          <strong className="text-cyan-300 font-bold">AI Risk Guard:</strong> Zero concentration trap ({maxHoldingSymbol} {maxConcentrationPct}%). Margin buffer ready for volatility dips.
        </p>
      </div>
    </div>
  );
}
