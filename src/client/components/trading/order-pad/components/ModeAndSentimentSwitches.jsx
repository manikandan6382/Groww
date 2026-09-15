import React from "react";
import clsx from "clsx";

export function ModeAndSentimentSwitches({
  feedMode,
  setFeedMode,
  strategyMode,
  setStrategyMode,
  simulateSlippage,
  setSimulateSlippage,
  optionType,
  setOptionType
}) {
  return (
    <div className="space-y-4">
      {/* Mode Switches: Feed Mode + Spread Mode + Slippage Guard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setFeedMode("LIVE")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg font-bold transition text-center",
              feedMode === "LIVE" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            🟢 Live Auto-Exit
          </button>
          <button
            type="button"
            onClick={() => setFeedMode("MANUAL")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg font-bold transition text-center",
              feedMode === "MANUAL" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            🎮 Sandbox Mode
          </button>
        </div>

        <div className="flex rounded-xl bg-white/[0.03] border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setStrategyMode("NAKED")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs",
              strategyMode === "NAKED" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            ⚡ Direct Option Buy (Pure Scalp)
          </button>
          <button
            type="button"
            onClick={() => setStrategyMode("SPREAD")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg font-bold transition text-center text-xs",
              strategyMode === "SPREAD" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            🛡️ Protected Spread (Defined Risk)
          </button>
        </div>

        <label className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={simulateSlippage}
              onChange={(e) => setSimulateSlippage(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0"
            />
            <span className="text-slate-300 font-medium text-[11px]">Simulate Slippage (-0.5 pt)</span>
          </div>
          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", simulateSlippage ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400")}>
            {simulateSlippage ? "Active" : "Ideal Fills"}
          </span>
        </label>
      </div>

      {/* Step 1: Sentiment Switcher */}
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          1️⃣ Strategy &amp; Market Direction
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOptionType("CALL")}
            className={clsx(
              "p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer",
              optionType === "CALL"
                ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10"
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">▲</div>
            <div>
              <strong className="block text-xs font-bold text-emerald-300">BUY CALL (CE)</strong>
              <span className="text-[10px] text-slate-400">Bullish Momentum Scalp</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOptionType("PUT")}
            className={clsx(
              "p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer",
              optionType === "PUT"
                ? "bg-rose-500/15 border-rose-500/40 text-white shadow-lg shadow-rose-500/10"
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold">▼</div>
            <div>
              <strong className="block text-xs font-bold text-rose-300">BUY PUT (PE)</strong>
              <span className="text-[10px] text-slate-400">Bearish Breakdown Scalp</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
