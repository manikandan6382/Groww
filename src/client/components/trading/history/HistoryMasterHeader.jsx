import React, { useMemo } from "react";
import clsx from "clsx";
import { ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { computeCumulativeEquityCurve } from "./historyCalculations";
import { soundEngine } from "../../../utils/soundEngine";

export function HistoryMasterHeader({
  displayCount = 0,
  activeCount = 0,
  settledCount = 0,
  rangeLabel = "All Time",
  totalRealizedPnl = 0,
  totalGrossPnl = 0,
  totalCharges = 0,
  winCount = 0,
  lossCount = 0,
  profitFactor = "0.00",
  avgRMultiple = "0.00",
  winRate = "0.0",
  breachedCount = 0,
  filteredAlerts = [],
  diagnosticFilter = "all",
  onToggleBreachFilter
}) {
  const equityCurve = useMemo(() => computeCumulativeEquityCurve(filteredAlerts), [filteredAlerts]);
  const isNetPositive = totalRealizedPnl >= 0;

  return (
    <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm">
            AUDIT TRAIL &amp; ORDER HISTORY
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 whitespace-nowrap shadow-sm">
            {displayCount} Orders ({activeCount} Active · {settledCount} Settled)
          </span>
          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Real Statutory Friction Active</span>
          </span>
          {breachedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                onToggleBreachFilter?.();
              }}
              className={clsx(
                "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap shadow-sm flex items-center gap-1 cursor-pointer transition active:scale-95",
                diagnosticFilter === "breach"
                  ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                  : "text-rose-300 bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30 animate-pulse"
              )}
              title="Click to isolate risk invariant violations"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{breachedCount} {breachedCount === 1 ? "Rule Breach" : "Rule Breaches"} (&gt;₹300 Loss)</span>
            </button>
          )}
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Triggered Trade History &amp; Audit Ledger
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          Resolved practice executions, verified execution timestamps, normalized R-multiples, and net realized P&amp;L after statutory friction.
        </p>
      </div>

      {/* Realized Stats & Live Equity Curve Sparkline */}
      <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
        {/* Dynamic Cumulative Equity Curve Sparkline Card */}
        {filteredAlerts.length > 1 && equityCurve.pathD && (
          <div className="p-3 px-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-sm min-w-[190px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span>Equity Curve</span>
              </span>
              <span className="font-mono text-slate-500 text-[9px]">{filteredAlerts.length} trades</span>
            </div>

            <div className="relative h-[42px] w-[170px] overflow-hidden my-0.5">
              <svg viewBox="0 0 240 54" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="historyEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isNetPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={isNetPositive ? "#10b981" : "#f43f5e"} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={equityCurve.areaD} fill="url(#historyEquityGrad)" />
                <path
                  d={equityCurve.pathD}
                  fill="none"
                  stroke={isNetPositive ? "#10b981" : "#f43f5e"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-white/5 gap-2">
              <span>Peak: <strong className="text-emerald-400">+₹{equityCurve.peakEquity}</strong></span>
              <span>DD: <strong className="text-rose-400">-₹{equityCurve.maxDrawdown}</strong></span>
              <span title="Recovery Factor = Net Realized / Max Drawdown">RF: <strong className={clsx(Number(equityCurve.recoveryFactor) >= 1.5 ? "text-emerald-400" : "text-cyan-300")}>{equityCurve.recoveryFactor}x</strong></span>
            </div>
          </div>
        )}

        {/* Realized Net Card */}
        <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[170px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
            Realized Net ({rangeLabel})
          </span>
          <strong
            className={clsx(
              "font-mono text-sm sm:text-base font-black block",
              totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {totalRealizedPnl >= 0 ? "+" : ""}₹
            {totalRealizedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
          <div
            className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1.5 mt-0.5"
            title="Gross Real Profit vs Upstox Statutory Charges & Brokerage"
          >
            <span>
              Real:{" "}
              <strong className={clsx(totalGrossPnl >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {totalGrossPnl >= 0 ? "+" : ""}₹
                {totalGrossPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="text-slate-600">·</span>
            <span title="Flat ₹40 Upstox Brokerage + STT + GST & Regulatory Fees">
              Charges:{" "}
              <strong className="text-cyan-300/90 font-medium">
                ₹{totalCharges.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>

        {/* Win Rate & PF Card */}
        <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[125px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win Rate &amp; PF</span>
          <strong className="font-mono text-sm sm:text-base font-black text-cyan-300 block">
            {winRate}% ({winCount}W/{lossCount}L)
          </strong>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
            PF: <strong className="text-emerald-400 font-bold">{profitFactor}x</strong>
          </span>
        </div>

        {/* Normalized Edge Card */}
        <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[115px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Normalized Edge</span>
          <strong className={clsx(
            "font-mono text-sm sm:text-base font-black block",
            Number(avgRMultiple) >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {Number(avgRMultiple) >= 0 ? "+" : ""}{avgRMultiple}R
          </strong>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
            Expectancy / Trade
          </span>
        </div>
      </div>
    </div>
  );
}
