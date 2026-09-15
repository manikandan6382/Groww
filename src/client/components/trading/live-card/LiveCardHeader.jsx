import React from "react";
import { Volume2, VolumeX, Info, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export const LiveCardHeader = ({
  symbol,
  isShort,
  quantity,
  lotSize,
  strategyTag,
  latencyMs,
  isFeedStalled,
  soundMuted,
  setSoundMuted,
  setShowInfoSheet,
  onSquareOff,
  isClosing,
  isProtected,
  isLiveBroker
}) => {
  const isCE = symbol.includes("CE");

  return (
    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight text-white">{symbol}</span>
          <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", isCE ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30")}>
            {isCE ? "CALL" : "PUT"}
          </span>
          {isProtected && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>BE LOCKED</span>
            </span>
          )}
          {isLiveBroker && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
          <span>{quantity} {quantity === 1 ? "Lot" : "Lots"} ({quantity * lotSize} Qty)</span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-sans text-[11px] font-medium">{strategyTag}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/40 border border-white/5 text-[10px] font-mono">
          {isFeedStalled ? (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 animate-pulse" />
              <span>FEED STALLED</span>
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{latencyMs}ms</span>
            </span>
          )}
        </div>

        <button
          onClick={() => setSoundMuted(!soundMuted)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title={soundMuted ? "Unmute Audio Alerts" : "Mute Audio Alerts"}
          type="button"
        >
          {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={() => setShowInfoSheet(true)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Inspect Order Details & Statutory Friction"
          type="button"
        >
          <Info className="w-4 h-4" />
        </button>

        <button
          onClick={onSquareOff}
          disabled={isClosing}
          className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-tight bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(244,63,94,0.15)] disabled:opacity-50 cursor-pointer"
          type="button"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isClosing ? "CLOSING..." : "EXIT"}</span>
        </button>
      </div>
    </div>
  );
};
