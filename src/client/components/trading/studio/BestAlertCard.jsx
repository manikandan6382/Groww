import React from "react";
import { Trophy, CheckCircle2, Star, ShieldAlert } from "lucide-react";

export const BestAlertCard = React.memo(function BestAlertCard({ bestAlert }) {
  if (!bestAlert) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-slate-900/80 to-slate-900/60 border border-amber-500/25 shadow-[0_10px_30px_rgba(245,158,11,0.08)] transition-all duration-300 space-y-3 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-amber-400">
              Best Alert Play
            </span>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
            🛡️ Defense Mode
          </span>
        </div>

        <div className="py-2">
          <strong className="text-sm font-bold text-white block">No Winning Setups in this Range</strong>
          <p className="text-[11px] text-slate-400 mt-1">
            Zero green trades were triggered in this period. You respected your risk rules and prevented forced overtrading.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-amber-300/90 font-medium">
          💡 Rule Honored: No forced trades when market momentum offered no edge.
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span className="text-amber-400 font-semibold">₹0.00 Realized Win</span>
          <span className="text-slate-500">Capital Protected</span>
        </div>
      </div>
    );
  }

  const pnlPercent = ((Number(bestAlert.exitPrice || 0) - Number(bestAlert.entryPrice || 0)) / (Number(bestAlert.entryPrice) || 1) * 100).toFixed(2);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/80 to-slate-900/60 border border-emerald-500/25 hover:border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 space-y-3 group/win relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
            Best Alert Play
          </span>
        </div>
        <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider shadow-sm">
          🥇 Top Alpha
        </span>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/win:text-emerald-300 transition-colors">
            {bestAlert.symbol}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono">
            Entry ₹{bestAlert.entryPrice?.toFixed(2)} ➔ Exit ₹{bestAlert.exitPrice?.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <strong className="font-mono text-lg sm:text-xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] block">
            +₹{bestAlert.netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
            +{pnlPercent}%
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          What Went Right:
        </span>
        <p className="text-slate-300 text-[11px]">
          {bestAlert.lessonsLearned || bestAlert.catalyst || "Waited for 15m VWAP breakout; took full profit at predetermined 1:2.5 target with zero hesitation. Letting winners run creates real wealth."}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
        <span className="text-emerald-400/90 font-semibold flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          Golden Execution Setup
        </span>
        <span className="text-slate-500">Plan 100% Followed</span>
      </div>
    </div>
  );
});
