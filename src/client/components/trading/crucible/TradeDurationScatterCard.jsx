import React, { useMemo } from "react";
import clsx from "clsx";
import { Clock, PieChart, ShieldAlert, Zap, ArrowRight, Percent } from "lucide-react";
import { calculateDurationEfficiency } from "./crucibleCalculations";

export function TradeDurationScatterCard({ trades = [] }) {
  const {
    durationBuckets,
    totalGross,
    totalFriction,
    totalNet,
    retentionRate
  } = useMemo(() => calculateDurationEfficiency(trades), [trades]);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/25 whitespace-nowrap shadow-sm shadow-cyan-500/10 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              HOLD-TIME MICROSTRUCTURE
            </span>
            <span className="text-xs font-extrabold text-white">Duration vs Profitability Autopsy</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Identifies whether hyper-scalps (&lt;3 min) generate true alpha while extended holds suffer from options theta decay.
          </p>
        </div>

        {/* Alpha Retention Pill */}
        <div className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
          <Percent className="w-3 h-3 text-cyan-400" />
          <span>{retentionRate}% Alpha Kept After Friction</span>
        </div>
      </div>

      {/* Duration Buckets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {durationBuckets.map((b, idx) => {
          const isProfitable = b.netPnl >= 0;
          return (
            <div
              key={idx}
              className={clsx(
                "p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-2",
                b.count > 0 ? "bg-white/[0.02] hover:bg-white/[0.04]" : "bg-white/[0.01] opacity-60",
                b.bg
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={clsx("font-bold text-[11px] truncate", b.color)}>
                  {b.label}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {b.count} trade{b.count === 1 ? "" : "s"}
                </span>
              </div>

              {/* Metrics */}
              <div className="flex items-baseline justify-between font-mono pt-1">
                <div>
                  <span className={clsx("text-base font-extrabold", isProfitable ? "text-emerald-400" : "text-rose-400")}>
                    {isProfitable ? "+" : ""}₹{b.netPnl.toLocaleString("en-IN")}
                  </span>
                  <div className="text-[9px] text-slate-500">
                    avg {isProfitable ? "+" : ""}₹{b.avgPnl}/trade
                  </div>
                </div>

                <div className="text-right">
                  <span className={clsx("text-xs font-bold", b.winRate >= 50 ? "text-emerald-400" : "text-slate-400")}>
                    {b.winRate}% WR
                  </span>
                  <div className="text-[9px] text-slate-500">
                    {b.wins}W · {b.losses}L
                  </div>
                </div>
              </div>

              {/* Relative Win Rate Progress Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={clsx("h-full rounded-full transition-all duration-500", b.winRate >= 50 ? "bg-emerald-400" : "bg-rose-400")}
                  style={{ width: `${b.winRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Intermediary Friction Drag Breakdown */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-sans text-[11px] font-bold">Intermediary Tax Drag:</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <div>
            <span className="text-slate-500">Gross P&L: </span>
            <span className={totalGross >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {totalGross >= 0 ? "+" : ""}₹{totalGross.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="text-slate-600">─►</div>

          <div>
            <span className="text-slate-500">Taxes &amp; Brokerage: </span>
            <span className="text-amber-300">-₹{totalFriction.toLocaleString("en-IN")}</span>
          </div>

          <div className="text-slate-600">─►</div>

          <div>
            <span className="text-slate-500">Net Take-Home: </span>
            <span className={clsx("font-extrabold", totalNet >= 0 ? "text-cyan-300" : "text-rose-400")}>
              {totalNet >= 0 ? "+" : ""}₹{totalNet.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
