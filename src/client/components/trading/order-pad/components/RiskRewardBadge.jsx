import React from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";

export function RiskRewardBadge({ entryPrice, stopLoss, target, quantity }) {
  const numEntry = Number(entryPrice) || 0;
  const numSL = Number(stopLoss) || 0;
  const numTP = Number(target) || 0;
  const qty = Number(quantity) || 1;

  const riskPerUnit = Math.max(0, numEntry - numSL);
  const rewardPerUnit = Math.max(0, numTP - numEntry);
  const totalRiskInr = Math.round(riskPerUnit * qty);
  const totalRewardInr = Math.round(rewardPerUnit * qty);
  const rrRatio = riskPerUnit > 0 ? (rewardPerUnit / riskPerUnit).toFixed(1) : "0.0";
  const isHealthy = Number(rrRatio) >= 1.5;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs">
      <div className="flex items-center gap-1.5">
        <TrendingUp className={`w-4 h-4 ${isHealthy ? "text-emerald-400" : "text-amber-400"}`} />
        <span className="text-zinc-400">R:R Ratio:</span>
        <span className={`font-mono font-bold ${isHealthy ? "text-emerald-400" : "text-amber-400"}`}>
          1 : {rrRatio}
        </span>
      </div>

      <div className="text-zinc-500">|</div>

      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-zinc-400">Risk:</span>
        <span className="font-mono text-rose-400 font-semibold">₹{totalRiskInr}</span>
      </div>

      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-zinc-400">Target:</span>
        <span className="font-mono text-emerald-400 font-semibold">₹{totalRewardInr}</span>
      </div>

      {!isHealthy && riskPerUnit > 0 && (
        <span className="ml-auto text-[10px] text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          R:R &lt; 1:1.5
        </span>
      )}
    </div>
  );
}
