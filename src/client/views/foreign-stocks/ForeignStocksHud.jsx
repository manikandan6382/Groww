import React, { useState } from "react";
import clsx from "clsx";
import { 
  Globe2, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Activity, 
  BarChart3, 
  ShieldAlert,
  ArrowUpRight, 
  ArrowDownRight,
  Zap
} from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { SparklineArea } from "./SparklineArea";
import { useMarketSessionClock } from "./useMarketSessionClock";
import { 
  USD_INR_RATE, 
  USD_ANNUAL_ALPHA, 
  US_MARKET_INDICES, 
  US_MACRO_PULSE 
} from "./foreignStocksData";

/**
 * 🍏 Master Apple Vision Pro Spatial Command HUD: Wall Street ↔ Dalal Street
 */
export function ForeignStocksHud() {
  const [activeStripTab, setActiveStripTab] = useState("indices"); // "indices" | "macro"
  const clock = useMarketSessionClock();

  const handleTabSwitch = (tab) => {
    if (activeStripTab === tab) return;
    setActiveStripTab(tab);
    soundEngine.playTabSwitchTone();
  };

  const stripData = activeStripTab === "indices" ? US_MARKET_INDICES : US_MACRO_PULSE;

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-[var(--card)] backdrop-blur-3xl border border-[var(--line)] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden transition-all duration-300">
      {/* 🔮 Atmospheric Radial Mesh Aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/12 via-indigo-500/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-gradient-to-tr from-emerald-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Row: Header, Dual Clocks & USD/INR Capsule ── */}
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        
        {/* Left: Branding, Phase Badge & Core Thesis */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
              <Globe2 className="w-3 h-3 text-cyan-400 animate-spin-slow" />
              GLOBAL WEALTH RADAR
            </span>

            {/* Dynamic Market Phase Badge */}
            <div className={clsx(
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold transition-colors",
              clock.badgeColor
            )}>
              <span className={clsx("w-2 h-2 rounded-full", clock.statusDot)} />
              <span>{clock.phaseTitle}</span>
              <span className="text-white/40">·</span>
              <span className="text-white font-extrabold">{clock.countdownText}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Foreign Equities &amp; US Tech Titans
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Direct gateway to global trillion-dollar monopolies powering artificial intelligence, semiconductor foundry grids, and enterprise cloud networks with <strong>Dual Currency Compounding</strong>.
          </p>
        </div>

        {/* Right: Dual Time-Zone Clocks & Dollar Alpha Capsule */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start xl:self-auto flex-shrink-0">
          
          {/* Synchronized Wall Street & Dalal Street Clock Capsule */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  NY (EDT)
                </span>
                <span className="text-xs font-mono font-extrabold text-white tabular-nums">
                  {clock.nyTimeFormatted}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  BOM (IST)
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                  {clock.istTimeFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Forex Reference Rate & Dollar Alpha Capsule */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                USD / INR Reference
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-white tabular-nums leading-none">
                ₹{USD_INR_RATE.toFixed(2)}
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold block flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                +{USD_ANNUAL_ALPHA}% Annual USD Alpha
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Middle: Real-Time Session Timeline & Progress Bar ── */}
      <div className="mt-5 p-3 rounded-2xl bg-black/30 border border-white/[0.06] backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>SESSION TIMELINE</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-normal">{clock.description}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Phase Progress:</span>
            <span className="text-cyan-300 font-black">{clock.progressPct}%</span>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
            style={{ width: `${Math.max(clock.progressPct, 4)}%` }}
          />
        </div>
      </div>

      {/* ── Lower Section: Interactive Switcher & Market Strip ── */}
      <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3">
        
        {/* Strip View Mode Switcher Pills */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
            <button
              type="button"
              onClick={() => handleTabSwitch("indices")}
              className={clsx(
                "px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeStripTab === "indices"
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <BarChart3 className="w-3 h-3 text-cyan-400" />
              <span>US Benchmark Indices</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch("macro")}
              className={clsx(
                "px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                activeStripTab === "macro"
                  ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>Macro &amp; Volatility Pulse</span>
            </button>
          </div>

          <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 font-medium">
            {activeStripTab === "indices" ? "Leading benchmark trackers" : "Macro liquidity & volatility indicators"}
          </span>
        </div>

        {/* Dynamic 4-Column Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stripData.map((item) => (
            <div 
              key={item.symbol} 
              className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 transition-all duration-200 flex flex-col justify-between space-y-2 group shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs font-black text-white font-mono">{item.symbol}</strong>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-400 border border-white/5">
                      {item.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block mt-0.5" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <span className={clsx(
                  "text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 shadow-sm",
                  item.isGain 
                    ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                    : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
                )}>
                  {item.isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {item.isGain ? "+" : ""}{item.changePct}%
                </span>
              </div>

              {/* Price & Sparkline Row */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-base font-mono font-black text-white tabular-nums tracking-tight">
                    {item.prefix || ""}{item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    {item.suffix || ""}
                  </div>
                  {item.sentiment ? (
                    <span className="text-[9px] font-mono text-cyan-300 font-bold block truncate max-w-[130px]">
                      {item.sentiment}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500 block">
                      Range: {item.dayLow?.toFixed(0)} – {item.dayHigh?.toFixed(0)}
                    </span>
                  )}
                </div>

                {/* SVG Area Sparkline */}
                {item.sparkline && (
                  <SparklineArea 
                    data={item.sparkline} 
                    isGain={item.isGain} 
                    width={58} 
                    height={22} 
                  />
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default ForeignStocksHud;
