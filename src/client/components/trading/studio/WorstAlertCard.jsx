import React from "react";
import { ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import clsx from "clsx";
import { calculateTradeRMultiple } from "../history/historyCalculations";
import { calculateAlphaLeakage } from "./studioStatsCalculator";

export const WorstAlertCard = React.memo(function WorstAlertCard({ worstAlert, onPromoteToJournal, promotedTradeIds }) {
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
          <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider font-mono">
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
  const { rMultipleStr, isRuleBreached } = calculateTradeRMultiple(worstAlert);
  const { slippageLoss } = calculateAlphaLeakage(worstAlert);
  const lossAbs = Math.abs(Number(worstAlert.netPnl || 0));
  const tradeId = worstAlert.id || worstAlert.orderId || `${worstAlert.symbol}-${worstAlert.entryDatetime || worstAlert.entryPrice}`;
  const isPromoted = Boolean(promotedTradeIds?.has?.(tradeId));

  return (
    <div className={clsx(
      "p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/[0.08] via-slate-900/80 to-slate-900/60 border transition-all duration-300 space-y-3 group/loss relative overflow-hidden flex flex-col justify-between",
      isRuleBreached ? "border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.18)]" : "border-rose-500/25 hover:border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.08)]"
    )}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-rose-400">
            {isRuleBreached ? "Rule Breach Alert" : "Disciplined Stop Loss"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={clsx(
            "text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border shadow-sm",
            isRuleBreached
              ? "bg-rose-500/30 text-rose-200 border-rose-400/60 animate-pulse"
              : "bg-rose-500/20 text-rose-300 border-rose-500/30"
          )}>
            {rMultipleStr}
          </span>
          <span className={clsx(
            "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wider shadow-sm font-mono",
            isRuleBreached
              ? "bg-rose-500/30 text-rose-200 border-rose-400/50"
              : "bg-rose-500/20 text-rose-300 border-rose-500/30"
          )}>
            {isRuleBreached ? "⚠️ >₹300 Cap" : "🛡️ Controlled Cut"}
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <strong className="font-mono text-base sm:text-lg text-white font-black tracking-tight block group-hover/loss:text-rose-300 transition-colors">
            {worstAlert.symbol}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono block">
            Entry ₹{Number(worstAlert.entryPrice || 0).toFixed(2)} ➔ Stop ₹{Number(worstAlert.exitPrice || 0).toFixed(2)}
          </span>
          {worstAlert.stopLoss > 0 && (
            <span className="text-[10px] font-mono text-rose-400/80 block">
              Planned Stop: ₹{Number(worstAlert.stopLoss).toFixed(2)}
            </span>
          )}
        </div>
        <div className="text-right">
          <strong className="font-mono text-lg sm:text-xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] block">
            -₹{lossAbs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
          <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block mt-0.5">
            {lossPercent}%
          </span>
        </div>
      </div>

      {/* Slippage & Post-Mortem Diagnostic */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            Post-Mortem Defense Analysis:
          </span>
          {slippageLoss > 0 && (
            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              -₹{slippageLoss} Adverse Fill Slippage
            </span>
          )}
        </div>
        <p className="text-slate-300 text-[11px]">
          {worstAlert.lessonsLearned || (isRuleBreached
            ? "Loss blew past the ₹300 hard invariant. Never hold past your predetermined stop loss; cut immediately to protect daily runway."
            : "Hit stop loss cleanly. You accepted a controlled loss, absorbed ~₹55 friction, and protected 99% of your capital.")}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 gap-2 flex-wrap">
        <span className={clsx(
          "font-semibold flex items-center gap-1",
          isRuleBreached ? "text-rose-400" : "text-rose-300"
        )}>
          {isRuleBreached ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Breached ₹300 Invariant</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Capital Shield Preserved</span>
            </>
          )}
        </span>
        {onPromoteToJournal && (
          isPromoted ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400/70 font-bold text-[10px] cursor-not-allowed shadow-sm select-none"
              title="Already recorded in Official 4-Act Journal"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>In Journal</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onPromoteToJournal(worstAlert)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold transition active:scale-95 cursor-pointer text-[10px] shadow-sm"
              title="Promote this defense/lesson trade to the permanent 4-Act Journal"
            >
              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>Promote to Journal</span>
            </button>
          )
        )}
      </div>
    </div>
  );
});
