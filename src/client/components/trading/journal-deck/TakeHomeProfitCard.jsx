import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function TakeHomeProfitCard({
  rangeLabel,
  netYieldPct,
  totalNetPnl,
  profitFactor,
  grossWins,
  grossLosses,
  tradeCount,
  avgNet
}) {
  return (
    <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <div>
            <h2 className="text-sm font-bold text-white">Take-Home Profit &amp; Edge</h2>
            <span className="text-[10px] text-slate-400">Calculated for <strong className="text-cyan-400">{rangeLabel}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RollingTicker 
              value={netYieldPct} 
              suffix="% Net" 
              showSign={true} 
              decimalPlaces={2} 
              className={netYieldPct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"} 
            />
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Positive Edge
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <span className="text-xs text-slate-400 block">Total Net Banked P&amp;L</span>
          <div className={clsx("text-2xl font-black font-mono tracking-tight mt-0.5", totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker 
              value={totalNetPnl} 
              prefix="₹" 
              showSign={true} 
              decimalPlaces={2} 
              className={totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
          <small className="text-[10px] text-slate-500 block mt-1">Net cash banked after all statutory friction.</small>
        </div>

        <div>
          <span className="text-xs text-slate-400 block">Risk-Reward Health</span>
          <div className="text-2xl font-black font-mono text-cyan-400 tracking-tight mt-0.5">
            <RollingTicker 
              value={Number(profitFactor)} 
              suffix="x" 
              decimalPlaces={2} 
              className="text-cyan-400"
            />
          </div>
          <small className="text-[10px] text-slate-500 block mt-1">How much you make per ₹1.00 risked.</small>
        </div>
      </div>

      {/* 4-Chip Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Gross Wins</span>
          <div className="font-mono text-emerald-400 font-bold">
            <RollingTicker value={grossWins} prefix="+₹" decimalPlaces={0} className="text-emerald-400" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Losses Cut</span>
          <div className="font-mono text-rose-400 font-bold">
            <RollingTicker value={grossLosses} prefix="-₹" decimalPlaces={0} className="text-rose-400" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Taxes &amp; Fees</span>
          <div className="font-mono text-slate-300 font-bold">
            <RollingTicker value={tradeCount * 56} prefix="₹" decimalPlaces={0} className="text-slate-300" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Avg Net / Trade</span>
          <div className="font-mono text-cyan-400 font-bold">
            <RollingTicker value={Number(avgNet)} prefix="+₹" decimalPlaces={2} className="text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
