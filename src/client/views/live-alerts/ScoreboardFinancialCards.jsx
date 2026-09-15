import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { RollingTicker } from '../../components/common/RollingTicker';

export function ScoreboardFinancialCards({
  startingCapital,
  currentAccountValue,
  netPnl,
  pnlPct
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {/* Card 1: Starting Capital */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starting Capital</span>
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shadow-sm group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4 text-slate-300" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight block">
          <RollingTicker value={startingCapital} prefix="₹" decimalPlaces={2} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
          <span>Virtual Sandbox Cash</span>
          <span className="font-mono text-slate-500 font-bold">100% Buffered</span>
        </div>
      </div>

      {/* Card 2: Current Account Value */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-cyan-500/[0.08] to-white/[0.02] hover:from-cyan-500/[0.12] border border-cyan-500/25 backdrop-blur-xl shadow-[0_10px_30px_rgba(6,182,212,0.1)] transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Current Account Value</span>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4 text-cyan-300" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight block drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <RollingTicker value={currentAccountValue} prefix="₹" decimalPlaces={2} className="text-cyan-300" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-cyan-300/80 border-t border-cyan-500/15 pt-2.5">
          <span>Live Mark-to-Market</span>
          <span className="font-mono font-bold text-cyan-400">Upstox Real-Time</span>
        </div>
      </div>

      {/* Card 3: Net Profit / Loss */}
      <div className={clsx(
        "p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 relative overflow-hidden group border shadow-lg",
        netPnl >= 0
          ? "bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02] border-emerald-500/25 shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
          : "bg-gradient-to-b from-rose-500/[0.08] to-white/[0.02] border-rose-500/25 shadow-[0_10px_30px_rgba(244,63,94,0.1)]"
      )}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Net Profit / Loss</span>
          <span className={clsx(
            "text-xs font-mono font-black px-2.5 py-0.5 rounded-full border shadow-sm",
            netPnl >= 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
          )}>
            {netPnl >= 0 ? "+" : ""}{pnlPct}%
          </span>
        </div>
        <div className={clsx(
          "text-xl sm:text-2xl font-black font-mono tracking-tight block",
          netPnl >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
        )}>
          <RollingTicker value={netPnl} prefix="₹" showSign={true} decimalPlaces={2} className={netPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
          <span>Realized + Open Live P&amp;L</span>
          <span className={clsx("font-mono font-bold", netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {netPnl >= 0 ? "Profitable" : "Drawdown"}
          </span>
        </div>
      </div>
    </div>
  );
}
