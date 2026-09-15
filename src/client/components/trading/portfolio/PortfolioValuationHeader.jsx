import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Zap, Radio, Globe, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";

export function PortfolioValuationHeader({
  totalNetWorth,
  usdNetWorth,
  timeframeMetrics,
  hoverIndex,
  activeTf,
  navPoints,
}) {
  return (
    <>
      {/* 🏛️ 1. Top Executive Branding & Telemetry Bar */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/25 shadow-sm whitespace-nowrap font-mono flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
              <span>PORTFOLIO NET ASSET VALUE</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline-block">
              • NAV Telemetry
            </span>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-white">
            Total Integrated Portfolio Valuation
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5 whitespace-nowrap font-mono">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            Live Wealth Stream
          </span>
        </div>
      </div>

      {/* 💰 2. Main Net Worth Valuation & Return Telemetry */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-white tracking-tight drop-shadow-[0_4px_30px_rgba(255,255,255,0.15)] flex items-baseline gap-2">
              <RollingTicker value={totalNetWorth} prefix="₹" decimalPlaces={2} className="text-white font-black" />
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1 bg-white/[0.03] px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto shadow-sm">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>≈ ${usdNetWorth} USD</span>
            </div>
          </div>

          {/* Timeframe-Adaptive Return Pill */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={clsx(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold border shadow-md",
                timeframeMetrics.isGain
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/35 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
              )}
            >
              {timeframeMetrics.isGain ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span>
                {timeframeMetrics.label}: {timeframeMetrics.isGain ? "+" : ""}₹{Math.abs(timeframeMetrics.pnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({timeframeMetrics.isGain ? "+" : ""}{timeframeMetrics.pct}%)
              </span>
            </div>

            <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Alpha +2.8% vs NIFTY 50</span>
            </span>
          </div>
        </div>

        {/* Live Hover Scrubber Value Readout */}
        {hoverIndex !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-2xl bg-[#121424]/95 border border-cyan-500/40 backdrop-blur-2xl text-right self-start lg:self-auto shadow-2xl space-y-0.5 pointer-events-none"
          >
            <span className="text-[10px] text-slate-400 block font-mono">
              {activeTf === "today" ? `Intraday Point #${hoverIndex + 1}` : `Timeline Point #${hoverIndex + 1}`}
            </span>
            <strong className="text-sm font-mono font-black text-cyan-300 block">
              ₹{navPoints[hoverIndex].toLocaleString("en-IN")}
            </strong>
          </motion.div>
        )}
      </div>
    </>
  );
}
