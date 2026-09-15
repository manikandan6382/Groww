import React from "react";
import { RollingTicker } from "../../common/RollingTicker";
import { ShieldAlert, Sparkles, Waves } from "lucide-react";
import clsx from "clsx";

export function EquityMonteCarloTab({ monteCarlo, activeTradesCount }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#120b24] border border-purple-500/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Risk of 15% Ruin</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <strong
            className={clsx(
              "text-2xl font-black font-mono block",
              monteCarlo.ruinProbability <= 5 ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {monteCarlo.ruinProbability}%
          </strong>
          <span className="text-xs text-slate-300 block">
            {monteCarlo.ruinProbability <= 5 ? "🛡️ Statistically Safe Edge" : "⚠️ Monitor Drawdown Threshold"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#071626] border border-cyan-500/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">50-Trade Forecast</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300 block">
            <RollingTicker value={monteCarlo.medianEndCapital} prefix="₹" decimalPlaces={0} />
          </div>
          <span className="text-xs text-slate-300 block">Median expected balance after 50 setups</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#240b14] border border-rose-500/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Worst Sim Valley</span>
            <Waves className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <strong className="text-2xl font-black font-mono text-rose-400 block">
            -₹{monteCarlo.worstDrawdown.toLocaleString("en-IN")}
          </strong>
          <span className="text-xs text-slate-300 block">Maximum stress dip across 1,00,000 simulations</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#0a1122] border border-purple-500/20 flex items-start gap-3 text-xs text-slate-300">
        <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white font-bold block text-sm">Doctor Strange 1,000 Alternate Realities Test:</strong>
          <p className="text-xs leading-relaxed text-slate-300">
            By shuffling your {activeTradesCount} historical trades 1,000 times into random future sequences, the engine tests what happens if you hit an unlucky streak of losses in a row. A ruin risk under 5% proves your risk sizing is institutional grade!
          </p>
        </div>
      </div>
    </div>
  );
}
