import React from "react";
import clsx from "clsx";
import { ShieldCheck, CheckSquare, Square } from "lucide-react";

export function RosettaPreFlightCheck({
  chkStopLoss,
  setChkStopLoss,
  chkRatio,
  setChkRatio,
  chkEmotion,
  setChkEmotion
}) {
  const isPreFlightReady = chkStopLoss && chkRatio && chkEmotion;

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <strong className="text-xs font-bold text-white">Pre-Flight Scalper Discipline Check</strong>
        </div>
        <span className={clsx(
          "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
          isPreFlightReady
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        )}>
          {isPreFlightReady ? "✅ Ready to Execute" : "⚠️ 3 Checks Required"}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <button
          type="button"
          onClick={() => setChkStopLoss(!chkStopLoss)}
          className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition cursor-pointer"
        >
          {chkStopLoss ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          <span className={clsx(chkStopLoss ? "text-white font-medium" : "text-slate-400")}>
            1. My Stop Loss is predetermined before entry (Max 1% of total capital at risk).
          </span>
        </button>

        <button
          type="button"
          onClick={() => setChkRatio(!chkRatio)}
          className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition cursor-pointer"
        >
          {chkRatio ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          <span className={clsx(chkRatio ? "text-white font-medium" : "text-slate-400")}>
            2. Minimum 1:2.5 Risk-to-Reward ratio verified against VWAP or key support/resistance.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setChkEmotion(!chkEmotion)}
          className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center gap-2.5 text-left transition cursor-pointer"
        >
          {chkEmotion ? <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          <span className={clsx(chkEmotion ? "text-white font-medium" : "text-slate-400")}>
            3. My mind is 100% calm with zero FOMO or urge to revenge-trade after a loss.
          </span>
        </button>
      </div>
    </div>
  );
}
