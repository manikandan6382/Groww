import React from 'react';
import { Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../../utils/soundEngine';
import { calculateTradeDuration } from '../../../utils/dateUtils';
import { TimelineHeaderTelemetry } from './TimelineHeaderTelemetry';

export function TimelineHeroHeader({
  trade,
  symbol,
  entryPrice,
  exitPrice,
  isTargetHit,
  isStopHit,
  closeReason,
  totalQty,
  charges,
  isVerifiedTicks,
  carouselNav,
  onClose
}) {
  const symUpper = String(symbol || "").toUpperCase().trim();
  const isPE = symUpper.endsWith("PE") || symUpper.includes(" PE") || trade?.optionType === "PUT";
  const isCE = !isPE && (symUpper.endsWith("CE") || symUpper.includes(" CE") || trade?.optionType === "CALL");

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.08] shrink-0 sticky -top-4 sm:-top-6 z-30 bg-[#060813]/95 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 sm:pt-4">
      {/* Zone 1: Left Identity Cluster */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.03] border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm backdrop-blur-xl">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="text-white font-black text-base sm:text-lg tracking-tight whitespace-nowrap font-sans">
              {symbol}
            </strong>
            <span className={clsx(
              "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm whitespace-nowrap shrink-0 tracking-wider",
              isCE
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm"
            )}>
              {isCE ? "CALL CE" : "PUT PE"}
            </span>
            <span className={clsx(
              "text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0",
              isTargetHit ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
              isStopHit ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
              "bg-white/10 border-white/20 text-zinc-300"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isTargetHit ? "bg-emerald-400" : isStopHit ? "bg-rose-400" : "bg-white")} />
              <span>{closeReason.replace(/_/g, " ")}</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-1 whitespace-nowrap">
            <span>Entry: <strong className="text-zinc-200">₹{entryPrice.toFixed(2)}</strong></span>
            <span className="text-zinc-600">·</span>
            <span>Exit: <strong className="text-zinc-200">₹{exitPrice.toFixed(2)}</strong></span>
            <span className="text-zinc-600">·</span>
            <span>Duration: <strong className="text-cyan-300 font-bold">{trade?.duration || calculateTradeDuration(trade?.entryDatetime, trade?.exitDatetime)}</strong></span>
            {totalQty > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span>Qty: <strong className="text-zinc-300">{totalQty}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Zone 2: Center Telemetry Pills */}
      <TimelineHeaderTelemetry trade={trade} charges={charges} isVerifiedTicks={isVerifiedTicks} />

      {/* Zone 3: Right Actions */}
      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
        {carouselNav && (
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10 text-xs font-mono shadow-inner backdrop-blur-xl">
            <button
              type="button"
              onClick={carouselNav.onPrev}
              disabled={!carouselNav.hasPrev}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
              title="Previous Trade (Hotkey: ← or J)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-bold">Prev</span>
            </button>
            <div className="px-2.5 py-0.5 text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
              Trade {carouselNav.currentIndex + 1} of {carouselNav.totalCount}
            </div>
            <button
              type="button"
              onClick={carouselNav.onNext}
              disabled={!carouselNav.hasNext}
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1 active:scale-95"
              title="Next Trade (Hotkey: → or K)"
            >
              <span className="hidden sm:inline text-[11px] font-bold">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone?.();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-slate-300 text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="Close Timeline Modal (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="font-bold">Close</span>
          </button>
        )}
      </div>
    </div>
  );
}
