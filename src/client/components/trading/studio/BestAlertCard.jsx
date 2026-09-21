import React from "react";
import { Trophy, CheckCircle2, Star, ShieldAlert, BookOpen, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { calculateTradeRMultiple } from "../history/historyCalculations";
import { calculateAlphaLeakage } from "./studioStatsCalculator";

export const BestAlertCard = React.memo(function BestAlertCard({ bestAlert, onPromoteToJournal, promotedTradeIds }) {
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
          <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider font-mono">
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
  const { rMultipleStr } = calculateTradeRMultiple(bestAlert);
  const { earlyExitLeakage } = calculateAlphaLeakage(bestAlert);
  const tradeId = bestAlert.id || bestAlert.orderId || `${bestAlert.symbol}-${bestAlert.entryDatetime || bestAlert.entryPrice}`;
  const isPromoted = Boolean(promotedTradeIds?.has?.(tradeId));

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/80 to-slate-900/60 border border-emerald-500/25 hover:border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.08)] transition-all duration-300 space-y-3 group/win relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
            Top Alpha Trade
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm">
            {rMultipleStr}
          </span>
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider shadow-sm font-mono">
            🥇 Apex Win
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/win:text-emerald-300 transition-colors">
            {bestAlert.symbol}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono block">
            Entry ₹{Number(bestAlert.entryPrice || 0).toFixed(2)} ➔ Exit ₹{Number(bestAlert.exitPrice || 0).toFixed(2)}
          </span>
          {bestAlert.targetPrice > 0 && (
            <span className="text-[10px] font-mono text-emerald-400/80 block">
              Planned Target: ₹{Number(bestAlert.targetPrice).toFixed(2)}
            </span>
          )}
        </div>
        <div className="text-right">
          <strong className="font-mono text-lg sm:text-xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] block">
            +₹{Number(bestAlert.netPnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
            +{pnlPercent}%
          </span>
        </div>
      </div>

      {/* Counterfactual Alpha Review */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            Alpha Execution Breakdown:
          </span>
          {earlyExitLeakage > 0 ? (
            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              ₹{earlyExitLeakage} Runner Alpha Left on Table
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
              🎯 Full Target Captured
            </span>
          )}
        </div>
        <p className="text-slate-300 text-[11px]">
          {bestAlert.lessonsLearned || bestAlert.catalyst || "Waited for volume breakout; captured positive mathematical expectancy with disciplined entry."}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 gap-2 flex-wrap">
        <span className="text-emerald-400/90 font-semibold flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          Plan 100% Followed
        </span>
        {onPromoteToJournal && (
          isPromoted ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400/70 font-bold text-[10px] cursor-not-allowed shadow-sm select-none"
              title="Already recorded in Official 4-Act Journal"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>In Journal</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPromoteToJournal(bestAlert)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition active:scale-95 cursor-pointer text-[10px] shadow-sm"
              title="Promote this winning trade to the permanent 4-Act Journal"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Promote to Journal</span>
            </button>
          )
        )}
      </div>
    </div>
  );
});
