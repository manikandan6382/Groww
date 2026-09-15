import React from "react";
import { ShieldAlert, ShieldCheck, CheckCircle2 } from "lucide-react";

export const WorstAlertCard = React.memo(function WorstAlertCard({ worstAlert }) {
  if (!worstAlert) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/80 to-slate-900/60 border border-emerald-500/25 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 space-y-3 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
              Disciplined Stop Loss
            </span>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
            🎉 100% Win Rate
          </span>
        </div>

        <div className="py-2">
          <strong className="text-sm font-bold text-white block">Zero Stop Losses Hit!</strong>
          <p className="text-[11px] text-slate-400 mt-1">
            Flawless execution! Every trade taken in this window reached its predetermined profit target with 0 stop-loss breaches.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-emerald-300/90 font-medium">
          ✨ Victory: ₹0.00 capital lost. 100% profitable execution recorded.
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span className="text-emerald-400 font-semibold">₹0.00 Drawdown</span>
          <span className="text-slate-500">Flawless Session</span>
        </div>
      </div>
    );
  }

  const lossPercent = ((Number(worstAlert.exitPrice || 0) - Number(worstAlert.entryPrice || 0)) / (Number(worstAlert.entryPrice) || 1) * 100).toFixed(2);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] via-slate-900/80 to-slate-900/60 border border-rose-500/25 hover:border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.08)] transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 space-y-3 group/loss relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-rose-400">
            Disciplined Stop Loss
          </span>
        </div>
        <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 tracking-wider shadow-sm">
          🛡️ Capital Saved
        </span>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/loss:text-rose-300 transition-colors">
            {worstAlert.symbol}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono">
            Entry ₹{worstAlert.entryPrice?.toFixed(2)} ➔ Stop ₹{worstAlert.exitPrice?.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <strong className="font-mono text-lg sm:text-xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] block">
            -₹{Math.abs(worstAlert.netPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
          <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block mt-0.5">
            {lossPercent}%
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1">
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          Why This Is A Victory:
        </span>
        <p className="text-slate-300 text-[11px]">
          {worstAlert.lessonsLearned || "Hit stop loss limit cleanly. You cut a tiny loss and protected 99% of your capital from a catastrophic breakdown."}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
        <span className="text-rose-300 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          99% Account Saved
        </span>
        <span className="text-slate-500">Zero Tilt Triggered</span>
      </div>
    </div>
  );
});
