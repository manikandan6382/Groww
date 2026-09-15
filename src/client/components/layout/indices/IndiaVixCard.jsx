import React from "react";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { LuxuryAreaSparkline } from "./LuxuryAreaSparkline";

export function IndiaVixCard({ vix, sparkline }) {
  const vixLtp = vix?.ltp != null ? Number(vix.ltp) : 11.88;
  const vixChange = vix?.change != null ? Number(vix.change) : 0.39;
  const vixChangePct = vix?.changePct != null ? Number(vix.changePct) : 3.39;
  const isVixUp = Number(vixChange) >= 0;
  const vixSparkline = sparkline ?? [11.49, 11.60, 11.80, 12.11, 11.88];

  // Dynamic VIX Risk Regime
  let vixRegimeLabel = "Optimal Risk";
  let vixRegimeDesc = "Low Regime (10.00 – 15.00)";
  let vixRegimeBadge = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
  let vixDotColor = "bg-emerald-400";

  if (vixLtp >= 20.0) {
    vixRegimeLabel = "Extreme Risk";
    vixRegimeDesc = "Danger Zone (> 20.00)";
    vixRegimeBadge = "bg-rose-500/15 border-rose-500/30 text-rose-400";
    vixDotColor = "bg-rose-400";
  } else if (vixLtp >= 15.0) {
    vixRegimeLabel = "Elevated Risk";
    vixRegimeDesc = "Medium Regime (15.00 – 20.00)";
    vixRegimeBadge = "bg-amber-500/15 border-amber-500/30 text-amber-400";
    vixDotColor = "bg-amber-400";
  }

  const vixSliderPct = Math.min(Math.max(((vixLtp - 9.0) / (28.0 - 9.0)) * 100, 5), 95);

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-elevated)] border border-[var(--line)] hover:border-amber-500/40 transition-all duration-300 backdrop-blur-3xl shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.10)] group cursor-default relative overflow-hidden">
      {/* Subtle Ambient Radial Highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

      <div className="space-y-2 relative z-10">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-black text-white font-mono tracking-wider">INDIA VIX</span>
          </div>
          <span className={clsx("text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5", vixRegimeBadge)}>
            <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", vixDotColor)} />
            {vixRegimeLabel}
          </span>
        </div>

        {/* Metric & Trend */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-black text-amber-400 font-mono tabular-nums tracking-tight">
              <RollingTicker value={vixLtp} decimalPlaces={2} className="text-amber-400 font-black" />
            </div>
            <div className="text-[9px] font-mono text-slate-400 mt-0.5 font-bold">
              {vixRegimeDesc}
            </div>
          </div>

          {/* Sparkline */}
          <LuxuryAreaSparkline data={vixSparkline} isGain={!isVixUp} width={72} height={26} />
        </div>

        {/* Volatility Status Slider */}
        <div className="space-y-1 w-full pt-1">
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
            <span className="text-emerald-400">Calm</span>
            <span className="text-amber-300 font-extrabold">{vixLtp.toFixed(2)} ({isVixUp ? "+" : ""}{vixChangePct.toFixed(1)}%)</span>
            <span className="text-rose-400">Extreme</span>
          </div>
          <div className="relative w-full h-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-rose-500/30 overflow-hidden border border-white/5">
            <div 
              className="absolute top-0 bottom-0 w-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.9)] -ml-0.5 transition-all duration-500"
              style={{ left: `${vixSliderPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
