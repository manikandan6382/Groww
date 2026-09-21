import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";
import { Coins, TrendingUp, Activity, Scale } from "lucide-react";

export function TakeHomeProfitCard({
  rangeLabel,
  netYieldPct,
  totalNetPnl,
  profitFactor,
  profitFactorNum = 0,
  isZeroLossWinning = false,
  grossWins,
  grossLosses,
  tradeCount = 0,
  totalFriction,
  frictionDragPct = 0,
  avgNet,
  expectancy = 0,
  returnOnRisk = 0,
  payoffRatio = "0.00",
  payoffRatioNum = 0,
  sparklinePath = "",
  sparklineArea = ""
}) {
  const isPositive = totalNetPnl > 0;
  const isNegative = totalNetPnl < 0;

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 overflow-hidden transition-all duration-300 hover:border-white/[0.14] group">
      {/* Subtle Ambient Radial Lighting Glow */}
      <div className={clsx(
        "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500",
        isPositive ? "bg-emerald-500/[0.08]" : isNegative ? "bg-rose-500/[0.08]" : "bg-cyan-500/[0.05]"
      )} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Take-Home Profit &amp; Edge</span>
            </h2>
            <span className="text-[10px] text-slate-400">
              Calculated for <strong className="text-cyan-400 font-mono">{rangeLabel}</strong> • <span className="font-mono text-slate-300">{tradeCount}</span> trades
            </span>
          </div>
        </div>

        {/* Dynamic Edge & Yield Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <RollingTicker 
              value={netYieldPct} 
              suffix="% Net" 
              showSign={true} 
              decimalPlaces={2} 
              className={netYieldPct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"} 
            />
          </span>

          <span className={clsx(
            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors",
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
              : isNegative
              ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
          )}>
            {isPositive ? "Positive Edge" : isNegative ? "Capital Drag" : "Breakeven"}
          </span>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Total Net Banked P&amp;L</span>
          <div className={clsx("text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5", totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker 
              value={totalNetPnl} 
              prefix="₹" 
              showSign={true} 
              decimalPlaces={2} 
              className={totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
          <small className="text-[10px] text-slate-500 block mt-1 leading-normal">
            Take-home cash banked after all statutory STT &amp; fees.
          </small>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 block font-medium">Expectancy (E)</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              R:R {payoffRatio}:1
            </span>
          </div>
          <div className={clsx("text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5 flex items-center gap-1.5", expectancy >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker 
              value={expectancy} 
              prefix="₹" 
              suffix="/tr"
              showSign={true} 
              decimalPlaces={2} 
              className={expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
          <small className="text-[10px] text-slate-500 block mt-1 leading-normal">
            Realized mathematical expectancy per executed trade.
          </small>
        </div>
      </div>

      {/* Cumulative Equity Micro-Sparkline */}
      <div className="pt-0.5 pb-0.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Cumulative Trajectory</span>
          </span>
          <span className={clsx("font-bold", totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {tradeCount > 1 ? (totalNetPnl >= 0 ? "Upward Momentum" : "Drawdown Pressure") : "Awaiting sample..."}
          </span>
        </div>
        <div className="relative w-full h-11 rounded-xl bg-white/[0.015] border border-white/[0.05] overflow-hidden px-1 py-0.5 flex items-center justify-center">
          {tradeCount > 1 && sparklinePath ? (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 160 36" preserveAspectRatio="none">
              <defs>
                <linearGradient id="takeHomeSparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={totalNetPnl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={totalNetPnl >= 0 ? "#10b981" : "#f43f5e"} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {sparklineArea && (
                <path d={sparklineArea} fill="url(#takeHomeSparkGradient)" />
              )}
              <path
                d={sparklinePath}
                fill="none"
                stroke={totalNetPnl >= 0 ? "#34d399" : "#fb7185"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="w-full h-[1px] bg-white/[0.06] flex items-center justify-between px-2 text-[9px] text-slate-500 font-mono">
              <span>₹0.00 Base</span>
              <span>Accumulating Trade Sequence</span>
            </div>
          )}
        </div>
      </div>

      {/* 4-Chip Institutional Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/[0.06] text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block">Gross Wins</span>
          <div className="font-mono text-emerald-400 font-bold mt-0.5">
            <RollingTicker value={grossWins} prefix="+₹" decimalPlaces={0} className="text-emerald-400" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block">Losses Cut</span>
          <div className="font-mono text-rose-400 font-bold mt-0.5">
            <RollingTicker value={grossLosses} prefix="-₹" decimalPlaces={0} className="text-rose-400" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block flex items-center justify-between">
            <span>Taxes &amp; Fees</span>
            {frictionDragPct > 0 && (
              <span className="text-[9px] text-amber-400/90 font-mono font-bold">{frictionDragPct}%</span>
            )}
          </span>
          <div className="font-mono text-slate-300 font-bold mt-0.5">
            <RollingTicker value={totalFriction !== undefined ? totalFriction : (tradeCount * 55.20)} prefix="₹" decimalPlaces={0} className="text-slate-300" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block flex items-center justify-between">
            <span>Profit Factor</span>
            <span className="text-[9px] text-cyan-400 font-mono">{isZeroLossWinning ? "MAX" : `${profitFactorNum}x`}</span>
          </span>
          <div className="font-mono text-cyan-400 font-bold mt-0.5">
            {isZeroLossWinning || profitFactor === "MAX" ? (
              <span className="text-cyan-300 font-bold">MAX</span>
            ) : (
              <RollingTicker value={profitFactorNum} suffix="x" decimalPlaces={2} className="text-cyan-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TakeHomeProfitCard;
