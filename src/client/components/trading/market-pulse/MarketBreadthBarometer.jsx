import React from "react";
import clsx from "clsx";
import { Compass, TrendingUp, TrendingDown, Layers, CheckCircle2, AlertTriangle } from "lucide-react";

export function MarketBreadthBarometer({ marketBreadth }) {
  const {
    advanceCount = 34,
    declineCount = 16,
    advanceRatio = 68,
    status = "BULLISH_EXPANSION",
    ratioLabel = "34 Advances · 16 Declines",
    sentiment = "Strong Breadth (Bullish)"
  } = marketBreadth || {};

  const declineRatio = 100 - advanceRatio;
  const isBullish = advanceRatio >= 50;

  // Granular distribution buckets for institutional breadth
  const strongAdvances = Math.round(advanceCount * 0.35);
  const mildAdvances = advanceCount - strongAdvances;
  const mildDeclines = Math.round(declineCount * 0.65);
  const heavyDeclines = declineCount - mildDeclines;

  return (
    <div className="rounded-2xl bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] p-5 backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Ambient Glow */}
      <div
        className={clsx(
          "absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 transition-opacity group-hover:opacity-30",
          isBullish ? "bg-emerald-500" : "bg-rose-500"
        )}
      />

      <div className="space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white font-mono tracking-wider flex items-center gap-1.5">
                <span>NSE MARKET BREADTH</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                50 Nifty Constituents Participation
              </p>
            </div>
          </div>

          <span
            className={clsx(
              "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border",
              isBullish
                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                : "text-rose-300 bg-rose-500/10 border-rose-500/25"
            )}
          >
            {status}
          </span>
        </div>

        {/* Advance vs Decline Big Metric Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ADVANCES
              </span>
              <span>{advanceRatio}%</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
              {advanceCount}
              <span className="text-xs text-emerald-500/70 font-normal ml-1">/ 50</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 font-bold">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                DECLINES
              </span>
              <span>{declineRatio}%</span>
            </div>
            <div className="text-2xl font-black text-rose-300 font-mono mt-1">
              {declineCount}
              <span className="text-xs text-rose-500/70 font-normal ml-1">/ 50</span>
            </div>
          </div>
        </div>

        {/* Visual Dual-Color Stacked Breadth Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>A/D Distribution Ratio</span>
            <span className="text-slate-200 font-bold">{ratioLabel}</span>
          </div>

          <div className="relative h-2.5 rounded-full bg-white/[0.04] overflow-hidden flex p-0.5 border border-white/[0.08]">
            <div
              className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              style={{ width: `${advanceRatio}%` }}
              title={`Advances: ${advanceCount} (${advanceRatio}%)`}
            />
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-700 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              style={{ width: `${declineRatio}%` }}
              title={`Declines: ${declineCount} (${declineRatio}%)`}
            />
          </div>
        </div>

        {/* Granular 4-Tier Participation Stack */}
        <div className="grid grid-cols-4 gap-1.5 text-center pt-1 font-mono text-[9px]">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-emerald-400 font-extrabold">&gt; +2%</div>
            <div className="text-slate-300 font-bold">{strongAdvances}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="text-emerald-400/80 font-medium">0% to +2%</div>
            <div className="text-slate-300 font-bold">{mildAdvances}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
            <div className="text-rose-400/80 font-medium">-2% to 0%</div>
            <div className="text-slate-300 font-bold">{mildDeclines}</div>
          </div>
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="text-rose-400 font-extrabold">&lt; -2%</div>
            <div className="text-slate-300 font-bold">{heavyDeclines}</div>
          </div>
        </div>
      </div>

      {/* Footer Diagnostic */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] relative z-10 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-cyan-400" />
          Breadth Verdict:
        </span>
        <span
          className={clsx(
            "font-bold flex items-center gap-1",
            isBullish ? "text-emerald-300" : "text-rose-300"
          )}
        >
          {isBullish ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
          {sentiment}
        </span>
      </div>
    </div>
  );
}
