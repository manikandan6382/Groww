import React from "react";
import { Volume2, VolumeX, Info, Zap, AlertTriangle, ShieldCheck, Clock, Hourglass } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

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
  isLiveBroker,
  focusMode = "cash",
  onToggleFocusMode,
  elapsedSeconds = 0,
  isThetaStagnant = false
}) => {
  const isCE = symbol.includes("CE");
  const mm = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const ss = (elapsedSeconds % 60).toString().padStart(2, "0");
  const durationStr = `${mm}:${ss}`;

  return (
    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-base font-black tracking-tight text-white">{symbol}</span>
          <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", isCE ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30")}>
            {isCE ? "CALL" : "PUT"}
          </span>
          {isProtected && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] flex items-center gap-1 animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>FREE ROLL • ZERO RISK</span>
            </span>
          )}
          {isLiveBroker && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              LIVE
            </span>
          )}

          {/* Active Scalp Chronometer */}
          <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-slate-300 flex items-center gap-1" title="Active Trade Duration">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{durationStr}</span>
          </span>

          {/* Theta Stagnation Warning */}
          {isThetaStagnant && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse" title="Scalp stagnant for >15 minutes. High extrinsic theta decay risk.">
              <Hourglass className="w-3 h-3 text-amber-400" />
              <span>THETA RISK</span>
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
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            onToggleFocusMode?.();
          }}
          className={clsx(
            "px-2 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider border transition-all cursor-pointer flex items-center gap-1",
            focusMode === "points"
              ? "bg-purple-500/25 text-purple-200 border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/30"
              : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
          )}
          title="Mark Douglas Stealth Focus Mode: Trade strictly in Points (Cold Objective Execution) vs Raw Cash Rupees"
        >
          <span>{focusMode === "points" ? "⚑ POINTS" : "₹ CASH"}</span>
        </button>

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
