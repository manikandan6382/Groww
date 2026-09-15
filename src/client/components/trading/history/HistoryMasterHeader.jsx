import React from "react";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";

export function HistoryMasterHeader({
  displayCount = 0,
  activeCount = 0,
  settledCount = 0,
  rangeLabel = "All Time",
  totalRealizedPnl = 0,
  totalGrossPnl = 0,
  totalCharges = 0,
  winCount = 0,
  lossCount = 0
}) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm">
            AUDIT TRAIL & ORDER HISTORY
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 whitespace-nowrap shadow-sm">
            {displayCount} Orders ({activeCount} Active · {settledCount} Settled)
          </span>
          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Real Statutory Friction (STT+GST) Active</span>
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Triggered Trade History
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          Resolved practice executions, verified execution timestamps, and net realized P&L after turnover-proportional friction.
        </p>
      </div>

      {/* Realized Stats Cards */}
      <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
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

        <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[120px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win / Stop Ratio</span>
          <strong className="font-mono text-sm sm:text-base font-black text-cyan-300">
            {winCount}W · {lossCount}L
          </strong>
        </div>
      </div>
    </div>
  );
}
