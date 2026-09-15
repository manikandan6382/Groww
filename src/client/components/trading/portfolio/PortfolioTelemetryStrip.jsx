import React from "react";
import clsx from "clsx";
import { Wallet, ShieldCheck, Layers, Sparkles } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";

export function PortfolioTelemetryStrip({
  safeInvestedVal,
  investedShare,
  safeAvailableMargin,
  marginShare,
  totalPnl,
  totalPnlPct,
}) {
  return (
    <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 border-t border-white/[0.06] pt-4">
      {/* Cell 1: Invested Equity Base */}
      <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono truncate">
            Invested Capital
          </span>
          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
          <RollingTicker value={safeInvestedVal} prefix="₹" decimalPlaces={2} className="text-white font-black" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-slate-300 font-bold">
            {investedShare}% NAV
          </span>
          <span className="text-[10px] text-slate-500 truncate">Portfolio Core</span>
        </div>
      </div>

      {/* Cell 2: Available Cash Margin */}
      <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-cyan-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 font-mono truncate">
            Available Margin
          </span>
          <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-300 flex-shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-cyan-300 tracking-tight">
          <RollingTicker value={safeAvailableMargin} prefix="₹" decimalPlaces={2} className="text-cyan-300 font-black" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
          <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 font-bold">
            {marginShare}% NAV
          </span>
          <span className="text-[10px] text-slate-500 truncate">Free Collateral</span>
        </div>
      </div>

      {/* Cell 3: Unrealized Net Alpha */}
      <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-indigo-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 font-mono truncate">
            Unrealized Profit
          </span>
          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center text-indigo-300 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-indigo-300 tracking-tight">
          <RollingTicker value={totalPnl} prefix="₹" showSign={true} decimalPlaces={2} className="text-indigo-300 font-black" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400">
          <span className={clsx("px-1.5 py-0.5 rounded-md font-bold border", Number(totalPnl) >= 0 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-rose-500/15 text-rose-300 border-rose-500/25")}>
            {Number(totalPnlPct) >= 0 ? "+" : ""}{totalPnlPct}% ROI
          </span>
          <span className="text-[10px] text-slate-500 truncate">Open P&amp;L</span>
        </div>
      </div>

      {/* Cell 4: Realized XIRR Compounding Speed */}
      <div className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-emerald-500/25 shadow-sm flex flex-col justify-between space-y-2.5 transition-all group">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 font-mono truncate">
            Annualized XIRR
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-300 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-base sm:text-lg font-black font-mono text-emerald-300 tracking-tight">
          <span>+24.8%</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold">
            CAGR 18%
          </span>
          <span className="text-[10px] text-slate-500 truncate">Compounding</span>
        </div>
      </div>
    </div>
  );
}
