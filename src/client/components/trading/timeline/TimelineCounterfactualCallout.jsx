import React from 'react';
import clsx from 'clsx';

export function TimelineCounterfactualCallout({
  scrubTelemetry,
  currentActivePoint,
  exitPoint,
  isDrawdownBreached,
  firstBreachPt,
  effectiveStopLoss
}) {
  const isScrubPostExit = currentActivePoint?.isPostExit || (exitPoint && currentActivePoint?.x > exitPoint.x);
  const isBreachedScrub = isScrubPostExit && isDrawdownBreached && firstBreachPt && (currentActivePoint?.timestamp >= firstBreachPt.timestamp);

  return (
    <>
      {scrubTelemetry && (
        <div className={clsx(
          "px-3 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono transition-all my-1.5",
          isBreachedScrub
            ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
            : "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
        )}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("w-2 h-2 rounded-full animate-pulse", isBreachedScrub ? "bg-rose-400" : "bg-cyan-400")} />
            <span className="text-slate-400">Scrubber Position:</span>
            <strong className="text-white">{scrubTelemetry.timeStr} @ ₹{scrubTelemetry.currentP.toFixed(2)}</strong>
            <span className={clsx(
              "px-2 py-0.5 rounded-md text-[10px] font-bold border",
              scrubTelemetry.isNetGain ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            )}>
              Yield: {scrubTelemetry.counterfactualNet >= 0 ? "+" : ""}₹{scrubTelemetry.counterfactualNet.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="text-[11px]">
            {isBreachedScrub ? (
              <span className="text-rose-300 font-bold flex items-center gap-1">
                🛑 Invalidation Breach: Low ₹{Number(firstBreachPt.low ?? firstBreachPt.close).toFixed(1)} breached stop ₹{effectiveStopLoss.toFixed(1)}. Continuation unexecutable.
              </span>
            ) : (
              <div>
                <span className="text-slate-400">vs Actual Exit: </span>
                <strong className={clsx("font-bold", scrubTelemetry.counterfactualAlpha >= 0 ? "text-emerald-400" : "text-amber-400")}>
                  {scrubTelemetry.counterfactualAlpha >= 0 ? "+" : ""}₹{scrubTelemetry.counterfactualAlpha.toLocaleString("en-IN")} {scrubTelemetry.counterfactualAlpha >= 0 ? "(Feasible Continuation Drift)" : "(Discipline Edge Saved)"}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotkey Navigation Deck */}
      <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[10.5px] font-mono text-zinc-400 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">Space</kbd>
            <span>Play / Pause</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">T</kbd>
            <span>Toggle Scope</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">← / →</kbd>
            <span>Prev / Next Trade</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">1 / 2 / 4</kbd>
            <span>Speed</span>
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold border border-white/15 text-[9.5px]">Esc</kbd>
          <span>Close</span>
        </span>
      </div>
    </>
  );
}
