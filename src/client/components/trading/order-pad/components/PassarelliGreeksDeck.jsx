import React from "react";
import clsx from "clsx";
import { soundEngine } from "../../../../utils/soundEngine";

export function PassarelliGreeksDeck({
  activeGreeks = {},
  activeDelta,
  ivRegime,
  isSpreadMode,
  setStrategyMode,
  totalQty = 65
}) {
  const deltaVal = activeGreeks?.delta != null ? activeGreeks.delta : (activeDelta != null ? activeDelta : 0.48);
  const gammaVal = activeGreeks?.gamma != null ? activeGreeks.gamma : 0.0014;
  const thetaPts = activeGreeks?.theta != null ? activeGreeks.theta : (isSpreadMode ? 1.2 : 5.8);
  const vegaVal = activeGreeks?.vega != null ? activeGreeks.vega : 4.8;
  const popVal = activeGreeks?.pop != null ? activeGreeks.pop : 58.4;
  const ivVal = activeGreeks?.iv != null ? activeGreeks.iv : 14.8;

  const absDeltaPct = Math.min(100, Math.max(0, Math.round(Math.abs(deltaVal) * 100)));
  const dailyThetaRupees = Math.round(thetaPts * (Number(totalQty) || 65));

  return (
    <div className="relative z-10 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 shadow-inner">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1">
            <span>🏛️</span>
            <span>BLACK-76 GREEKS DESK</span>
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
            Analytical B-76 Engine
          </span>
          {isSpreadMode && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              🛡️ Net Spread Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
          <span>Expiry: <strong className="text-white">Current Weekly</strong></span>
          <span>Regime: <strong className="text-cyan-300">ATM Convex</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {/* Delta with Apple-grade Micro Visual Gauge */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">
              {isSpreadMode ? "Net Delta (Δ)" : "Delta (Δ)"}
            </span>
            <strong className={clsx("text-xs font-black block mt-0.5 font-mono", deltaVal >= 0 ? "text-cyan-300" : "text-rose-400")}>
              {deltaVal >= 0 ? `+${deltaVal}` : deltaVal}
            </strong>
          </div>

          <div className="my-1.5 px-0.5">
            <div className="w-full bg-white/10 rounded-full h-1 relative overflow-hidden" title={`Delta: ${deltaVal} (ATM: 0.50)`}>
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 z-10" />
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-300",
                  Math.abs(deltaVal) >= 0.7
                    ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]"
                    : Math.abs(deltaVal) >= 0.45
                      ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                )}
                style={{ width: `${absDeltaPct}%` }}
              />
            </div>
          </div>

          <span className="text-[8px] text-slate-500 block">
            {isSpreadMode ? "Spread Hedged" : Math.abs(deltaVal) >= 0.5 ? "ATM / Convex" : "OTM Low Δ"}
          </span>
        </div>

        {/* Gamma */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">Gamma (Γ)</span>
            <strong className="text-xs font-black text-purple-300 block mt-0.5 font-mono">
              {gammaVal.toFixed(4)}
            </strong>
          </div>
          <span className="text-[8px] text-slate-500 block">Curvature</span>
        </div>

        {/* Theta */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">
              {isSpreadMode ? "Net Theta (Θ)" : "Theta (Θ)"}
            </span>
            <strong className={clsx("text-xs font-black block mt-0.5 font-mono", isSpreadMode ? "text-emerald-300" : "text-amber-400")}>
              {thetaPts} pts/d
            </strong>
            <span className="text-[8px] text-slate-400 block font-mono">
              -₹{dailyThetaRupees.toLocaleString("en-IN")}/day
            </span>
          </div>
          <span className="text-[7.5px] text-slate-500 block">Linear Decay</span>
        </div>

        {/* Vega */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">Vega (ν)</span>
            <strong className="text-xs font-black text-sky-300 block mt-0.5 font-mono">
              +{vegaVal} pts
            </strong>
          </div>
          <span className="text-[8px] text-slate-500 block">Per 1% IV shift</span>
        </div>

        {/* IV */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">Implied Vol (IV)</span>
            <strong className="text-xs font-black text-cyan-300 block mt-0.5 font-mono">
              {ivVal}%
            </strong>
            <span className={clsx("text-[8px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5", ivRegime.bg, ivRegime.color)}>
              {ivRegime.label}
            </span>
          </div>
          <span className="text-[8px] text-slate-500 block">{ivRegime.tag}</span>
        </div>

        {/* POP */}
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase">POP (Win Prob)</span>
            <strong className="text-xs font-black text-emerald-300 block mt-0.5 font-mono">
              {popVal}%
            </strong>
          </div>
          <span className="text-[8px] text-slate-500 block">Normal Dist CDF</span>
        </div>
      </div>
    </div>
  );
}
