import React from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { LuxuryAreaSparkline } from "./LuxuryAreaSparkline";
import { IntradayRangeBar } from "./IntradayRangeBar";

export function IndexCard({
  title,
  subtitle,
  ltp,
  change,
  changePct,
  high,
  low,
  sparkline,
  accent = "cyan"
}) {
  const isGain = Number(change) >= 0;
  const isIndigo = accent === "indigo";

  return (
    <div className={clsx(
      "p-3.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-elevated)] border border-[var(--line)] transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.10)] group cursor-default relative overflow-hidden",
      isIndigo ? "hover:border-indigo-500/40" : "hover:border-cyan-500/40"
    )}>
      {/* Subtle Ambient Radial Highlight */}
      <div className={clsx(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-colors",
        isIndigo ? "bg-indigo-500/5 group-hover:bg-indigo-500/10" : "bg-cyan-500/5 group-hover:bg-cyan-500/10"
      )} />

      <div className="space-y-2 relative z-10">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={clsx(
              "w-2 h-2 rounded-full animate-pulse",
              isIndigo ? "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            )} />
            <span className="text-[11px] font-black text-white font-mono tracking-wider">{title}</span>
          </div>
          <span className={clsx(
            "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border",
            isIndigo ? "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" : "text-cyan-300 bg-cyan-500/10 border-cyan-500/20"
          )}>
            {subtitle}
          </span>
        </div>

        {/* Metric & Trend */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-black text-white font-mono tabular-nums tracking-tight">
              <RollingTicker value={ltp} decimalPlaces={2} className="text-white font-black" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={clsx(
                "text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm",
                isGain 
                  ? "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30" 
                  : "text-rose-300 bg-rose-500/15 border border-rose-500/30"
              )}>
                {isGain ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                {isGain ? "+" : ""}{Number(change).toFixed(2)} ({isGain ? "+" : ""}{changePct}%)
              </span>
            </div>
          </div>

          {/* Smooth Area Sparkline */}
          <LuxuryAreaSparkline data={sparkline} isGain={isGain} width={72} height={26} />
        </div>

        {/* Intraday Range Meter */}
        <IntradayRangeBar low={low} high={high} current={ltp} isGain={isGain} />
      </div>
    </div>
  );
}
