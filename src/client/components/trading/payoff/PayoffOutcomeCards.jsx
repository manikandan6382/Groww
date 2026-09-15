import React from "react";
import { ShieldAlert, Crosshair, Sparkles } from "lucide-react";

export const PayoffOutcomeCards = React.memo(function PayoffOutcomeCards({
  sl,
  riskAmount,
  riskPct,
  breakevenSpot,
  distToBE,
  tp,
  rewardAmount,
  rewardPct,
  currentRR,
}) {
  const isCappedRisk = Number(riskAmount || 0) <= 300;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Stop Loss Protection Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] to-[#120a10] border border-rose-500/25 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(244,63,94,0.15)] space-y-1.5 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            Worst-Case Loss
          </span>
          <span className="text-[10px] font-mono text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-lg border border-rose-500/30 tabular-nums font-semibold shadow-sm">
            SL @ ₹{Number(sl || 0).toFixed(2)}
          </span>
        </div>
        <div className="text-2xl font-black font-mono text-rose-400 tabular-nums tracking-tight">
          -₹{Number(riskAmount || 0).toLocaleString("en-IN")}
        </div>
        <span className="text-[11px] text-rose-300/80 block font-sans">
          {isCappedRisk ? "Safe Exit • Strict ₹200–₹300 Capital Shield Active" : "Safe Exit • Capped Rupee Risk"}
        </span>
      </div>

      {/* 2. Breakeven Safety Card */}
      <div className="p-4 rounded-2xl bg-[#0b0e14]/90 border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-1.5 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/[0.04] rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            Safety Breakeven
          </span>
          <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 tabular-nums font-semibold">
            ₹0.00 Line
          </span>
        </div>
        <div className="text-2xl font-black font-mono text-zinc-100 tabular-nums tracking-tight">
          ₹{Math.round(Number(breakevenSpot || 0)).toLocaleString("en-IN")}
        </div>
        <span className="text-[11px] text-slate-400 block font-sans">
          Index level to reach • {Number(distToBE || 0) >= 0 ? "+" : ""}{Number(distToBE || 0).toFixed(0)} pts away
        </span>
      </div>

      {/* 3. Target Profit Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-[#08120d] border border-emerald-500/25 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(16,185,129,0.15)] space-y-1.5 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Profit Target Goal
          </span>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30 tabular-nums font-semibold shadow-sm">
            TP @ ₹{Number(tp || 0).toFixed(2)}
          </span>
        </div>
        <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums tracking-tight">
          +₹{Number(rewardAmount || 0).toLocaleString("en-IN")}
        </div>
        <span className="text-[11px] text-emerald-300/80 block font-sans">
          Target Hit • +{Number(rewardPct || 0).toFixed(1)}% Goal ({currentRR?.startsWith("1:") ? currentRR : `1:${currentRR || "2.0"}`} R:R)
        </span>
      </div>
    </div>
  );
});
