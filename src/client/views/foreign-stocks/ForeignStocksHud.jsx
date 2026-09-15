import React from "react";
import clsx from "clsx";
import { 
  Globe2, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { 
  USD_INR_RATE, 
  USD_ANNUAL_ALPHA, 
  US_MARKET_INDICES 
} from "./foreignStocksData";

export function ForeignStocksHud({ isMarketOpen }) {
  return (
    <div className="p-6 rounded-3xl bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
              <Globe2 className="w-3 h-3 text-cyan-400" />
              GLOBAL WEALTH RADAR
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono font-bold text-slate-300">
              <span className={clsx("w-2 h-2 rounded-full", isMarketOpen ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
              <span>{isMarketOpen ? "🟢 Wall Street Open (7:00 PM – 1:30 AM IST)" : "🌙 US Pre-Market / Overnight Session"}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Foreign Equities &amp; US Tech Titans
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Invest in global monopolies powering world artificial intelligence, consumer electronics, and cloud computing with <strong>Dual Currency Compounding</strong> (Stock Gain + USD Appreciation).
          </p>
        </div>

        {/* Forex Reference Rate & Dollar Alpha Capsule */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-xl flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              USD / INR Reference
            </span>
            <div className="text-xl font-mono font-black text-white tabular-nums">
              ₹{USD_INR_RATE.toFixed(2)}
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-bold block flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              +{USD_ANNUAL_ALPHA}% Annual USD Hedge vs INR
            </span>
          </div>
        </div>
      </div>

      {/* Major US Benchmark Indices Ticker Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
        {US_MARKET_INDICES.map((idx, i) => (
          <div 
            key={i} 
            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <strong className="text-xs font-black text-white font-mono">{idx.symbol}</strong>
                <span className="text-[9px] text-slate-400 font-mono">US</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                {idx.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span className={clsx(
              "text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5",
              idx.isGain ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
            )}>
              {idx.isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              +{idx.changePct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
