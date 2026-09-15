import React from "react";
import { Sparkles, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";
import { PayoffSliderTrack } from "./PayoffSliderTrack";

const HOLD_OPTIONS = [
  { id: "flash", label: "⚡ <5m (0%)", title: "Instant move: Pure Delta/Gamma (0% Theta decay)" },
  { id: "30m", label: "⏱️ 30m (-5%)", title: "30-minute hold: Deducts ~5% time decay" },
  { id: "2h", label: "⏳ 2h (-15%)", title: "2-hour hold: Deducts ~15% time decay (accelerated on 0DTE)" }
];

export const PayoffInteractiveSimulatorCapsule = React.memo(function PayoffInteractiveSimulatorCapsule({
  isBankNifty,
  holdDuration,
  setHoldDuration,
  simulatedOutcome,
  isZeroDte,
  isTradeActive,
  hasLocalChanges,
  syncStatus,
  onSync,
  onAdoptTarget,
  onAdoptSL,
  domain,
  effectiveSpot,
  spotRatio,
  scrubRatio,
  onScrubChange,
}) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-950 via-[#0d0f14] to-zinc-950 border border-white/10 shadow-2xl space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-black text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Interactive "What-If" Market Simulator
        </span>

        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-[10.5px] font-mono">
          <span className="text-slate-400 text-[10px] px-1 font-sans">Decay Horizon:</span>
          {HOLD_OPTIONS.map((dur) => (
            <button
              key={dur.id}
              type="button"
              onClick={() => {
                setHoldDuration(dur.id);
                soundEngine.playTick();
              }}
              className={clsx(
                "px-2 py-0.5 rounded-lg transition-all font-bold cursor-pointer",
                holdDuration === dur.id
                  ? "bg-white text-black font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title={dur.title}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm sm:text-base font-medium text-white leading-snug">
        If {isBankNifty ? "BANKNIFTY" : "NIFTY"} moves to <strong className="text-zinc-200 font-mono font-bold">₹{Math.round(Number(simulatedOutcome?.spot || 0)).toLocaleString("en-IN")}</strong>{" "}
        <span className="text-xs text-slate-300 font-mono">
          ({Number(simulatedOutcome?.spotDelta || 0) >= 0 ? "+" : ""}{Number(simulatedOutcome?.spotDelta || 0)} pts)
        </span>{" "}
        ➔ Option estimated at <strong className="text-zinc-200 font-mono font-bold">₹{Number(simulatedOutcome?.estOptPrice || 0).toFixed(2)}</strong>{" "}
        ➔ You {simulatedOutcome?.isProfit ? "make" : "lose"}{" "}
        <strong className={clsx("font-mono font-black text-base sm:text-lg", simulatedOutcome?.isProfit ? "text-emerald-400" : "text-rose-400")}>
          {simulatedOutcome?.isProfit ? "+" : ""}₹{Math.round(Number(simulatedOutcome?.estPnl || 0)).toLocaleString("en-IN")} ({simulatedOutcome?.estReturnPct || "0.0"}%)
        </strong>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 pb-0.5 border-t border-white/[0.06] flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {simulatedOutcome?.isProfit ? (
            <button
              type="button"
              onClick={onAdoptTarget}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title={`Adopt simulated price ₹${Number(simulatedOutcome?.estOptPrice || 0).toFixed(2)} as your profit target`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Adopt as Target: ₹{Number(simulatedOutcome?.estOptPrice || 0).toFixed(2)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onAdoptSL}
              className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title={`Adopt simulated price ₹${Number(simulatedOutcome?.estOptPrice || 0).toFixed(2)} as your stop loss`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Adopt as SL: ₹{Number(simulatedOutcome?.estOptPrice || 0).toFixed(2)}</span>
            </button>
          )}

          {isTradeActive && hasLocalChanges && (
            <button
              type="button"
              onClick={onSync}
              className={clsx(
                "px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm",
                syncStatus === "synced"
                  ? "bg-emerald-500 text-black border border-emerald-400"
                  : "bg-white hover:bg-zinc-200 text-black font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.25)] animate-pulse"
              )}
            >
              {syncStatus === "synced" ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Synced to Trade!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync to Live Position</span>
                </>
              )}
            </button>
          )}
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          {isZeroDte ? "⚡ 0DTE Gamma Accelerated" : "Intraday Convex Delta"}
        </span>
      </div>

      <PayoffSliderTrack
        domain={domain}
        effectiveSpot={effectiveSpot}
        spotRatio={spotRatio}
        scrubRatio={scrubRatio}
        onScrubChange={onScrubChange}
      />
    </div>
  );
});
