import React from "react";
import clsx from "clsx";
import { SETUP_TAG_OPTIONS } from "./loggerPresetsData";
import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

export function LoggerRiskInputs({
  entryPrice,
  stopLoss,
  setStopLoss,
  targetPrice,
  setTargetPrice,
  setupTag,
  setSetupTag,
  notes,
  setNotes,
  onOpenTopic,
  plannedRiskCash = 0,
  isRiskBreached = false,
  plannedTargetCash = 0,
  plannedRR = "0.00",
  autoPegRisk
}) {
  const numEntry = Number(entryPrice || 0);
  const numSl = Number(stopLoss || 0);
  const stopPts = numEntry > 0 && numSl > 0 ? Math.abs(numEntry - numSl) : 0;
  const isTightNoiseRisk = stopPts > 0 && stopPts < 4.0;

  return (
    <>
      {/* Tab 6: Stop Loss (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            6. Stop Loss (₹)
          </label>
          <div className="flex items-center gap-1.5">
            {autoPegRisk && (
              <button
                type="button"
                onClick={() => autoPegRisk()}
                className="text-[9px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5 cursor-pointer bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20"
                title="Auto-peg stop loss to Manikandan's exact ₹250 risk invariant"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Peg ₹250</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenTopic?.("stop_loss")}
              className="text-slate-500 hover:text-rose-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
              title="Learn about Stop Loss in Guide"
            >
              <span>?</span>
            </button>
          </div>
        </div>
        <input
          tabIndex={6}
          type="number"
          step="0.05"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          className={clsx(
            "w-full px-3 py-2 text-xs bg-white/[0.04] border rounded-xl font-mono font-bold focus:outline-none transition-colors",
            isRiskBreached
              ? "text-rose-400 border-rose-500/50 bg-rose-500/[0.05] focus:border-rose-400"
              : "text-rose-400 border-white/10 focus:border-cyan-400/50"
          )}
        />
        {/* Planned Risk Invariant Live Readout */}
        <div className="flex items-center justify-between text-[9px] font-mono pt-0.5">
          <span className={clsx("flex items-center gap-1 font-bold", isRiskBreached ? "text-rose-400" : "text-emerald-400")}>
            {isRiskBreached ? <ShieldAlert className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
            <span>Risk: ₹{plannedRiskCash}</span>
          </span>
          <span className={clsx("text-[8px] font-bold px-1 rounded", isRiskBreached ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300")}>
            {isRiskBreached ? ">₹300 BREACH!" : "≤₹300 Target"}
          </span>
        </div>

        {/* Gamma / Tick Noise Alert when stop is ultra-tight (<4 pts) */}
        {isTightNoiseRisk && (
          <div className="flex items-center gap-1 text-[8px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 mt-0.5 leading-tight" title="A stop < 4 pts on ATM options is sensitive to normal gamma/spread noise. Ensure precision entry at VWAP/inflection.">
            <span>⚡ {stopPts.toFixed(1)} pt stop: High ATM noise risk (enter at VWAP)</span>
          </div>
        )}
      </div>

      {/* Tab 7: Target Price (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            7. Target Goal (₹)
          </label>
          <button
            type="button"
            onClick={() => onOpenTopic?.("target_price")}
            className="text-slate-500 hover:text-emerald-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
            title="Learn about Target Price in Guide"
          >
            <span>?</span>
          </button>
        </div>
        <input
          tabIndex={7}
          type="number"
          step="0.05"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
        />
        {/* Planned Reward Readout */}
        <div className="flex items-center justify-between text-[9px] font-mono pt-0.5 text-slate-400">
          <span className="text-emerald-400 font-bold">Goal: +₹{plannedTargetCash}</span>
          <span className="text-cyan-300 font-bold">R:R {plannedRR}:1</span>
        </div>
      </div>

      {/* Tab 8: Setup Tag (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          8. Setup Tag
        </label>
        <select
          tabIndex={8}
          value={setupTag}
          onChange={(e) => setSetupTag(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-400/50 cursor-pointer"
        >
          {SETUP_TAG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tab 9: Notes / Trade Execution Story (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          9. Execution Story / Notes
        </label>
        <input
          tabIndex={9}
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400/50"
          placeholder="Trade rationale..."
        />
      </div>
    </>
  );
}

export default LoggerRiskInputs;

