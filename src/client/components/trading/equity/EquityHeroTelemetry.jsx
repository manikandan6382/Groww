import React from "react";
import { TrendingUp, Waves, Crown, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export function EquityHeroTelemetry({
  isProfitable,
  accountingMode,
  activeTradesCount,
  displayCapital,
  displayPnl,
  displayPct,
  activePoint,
  peakCapital,
  maxDrawdown,
  retentionPct,
  winRate,
  totalCharges
}) {
  return (
    <>
      {/* Ambient Studio Lighting Highlights */}
      <div
        className={clsx(
          "absolute -top-24 right-1/4 w-96 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
          isProfitable ? "bg-emerald-500/10" : "bg-rose-500/10"
        )}
      />
      <div
        className={clsx(
          "absolute -bottom-24 left-1/4 w-96 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700",
          isProfitable ? "bg-cyan-500/10" : "bg-purple-500/10"
        )}
      />

      {/* Apple Stocks Hero Telemetry Header */}
      <div className="p-5 sm:p-7 pb-2 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <span
              className={clsx(
                "w-2.5 h-2.5 rounded-full shadow-lg animate-pulse",
                isProfitable ? "bg-emerald-400 shadow-emerald-500/80" : "bg-rose-400 shadow-rose-500/80"
              )}
            />
            <span className="font-bold text-slate-300 text-xs tracking-wider uppercase font-mono">
              PORTFOLIO VAULT STORY
            </span>
            <span
              className={clsx(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono",
                accountingMode === "NET"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              )}
            >
              {accountingMode === "NET" ? "NET TAKE-HOME" : "GROSS EXECUTION"}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {activeTradesCount} Trades Recorded
          </span>
        </div>

        {/* Big Fluid Dynamic Balance */}
        <div className="space-y-1">
          <div
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-sans transition-all duration-150"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            ₹{displayCapital.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {/* Dynamic Context Pill */}
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <span
              className={clsx(
                "px-3 py-1 rounded-full text-xs font-bold border font-sans flex items-center gap-1.5 transition-colors duration-300",
                displayPnl >= 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              )}
            >
              {displayPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Waves className="w-3.5 h-3.5" />}
              <span>{displayPnl >= 0 ? "+" : ""}₹{displayPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <span className="opacity-70">({displayPct}%)</span>
            </span>

            <span className="text-xs text-slate-400 font-medium">
              {activePoint ? (
                <span className="text-slate-300 font-mono">
                  {activePoint.label} · <strong className="text-white">{activePoint.symbol}</strong> · {activePoint.time}
                </span>
              ) : (
                <span>Overall Vault Performance vs ₹1.00L Base</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Plain-English Apple Glass Telemetry Cards Below */}
      <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-white/[0.07] bg-white/[0.01]">
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">Starting Capital</span>
          <div className="text-lg font-bold text-white font-sans">₹1,00,000.00</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">1.00L Base Foundation</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-cyan-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">All-Time Peak</span>
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-cyan-300 font-sans">₹{peakCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Highest Vault Value</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-rose-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Deepest Dip</span>
            <Waves className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-400 font-sans">-₹{maxDrawdown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Max Pullback from ATH</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-emerald-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Alpha Retention</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-300 font-sans">{retentionPct}% Retained</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">{winRate}% Win Rate · ₹{totalCharges.toFixed(0)} Drag</span>
        </div>
      </div>
    </>
  );
}
