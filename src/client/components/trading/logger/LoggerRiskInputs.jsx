import React from "react";
import { SETUP_TAG_OPTIONS } from "./loggerPresetsData";

export function LoggerRiskInputs({
  stopLoss,
  setStopLoss,
  targetPrice,
  setTargetPrice,
  setupTag,
  setSetupTag,
  notes,
  setNotes,
  onOpenTopic
}) {
  return (
    <>
      {/* Tab 6: Stop Loss (3 cols) */}
      <div className="md:col-span-3 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            6. Stop Loss (₹)
          </label>
          <button
            type="button"
            onClick={() => onOpenTopic?.("stop_loss")}
            className="text-slate-500 hover:text-rose-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
            title="Learn about Stop Loss in Guide"
          >
            <span>?</span>
          </button>
        </div>
        <input
          tabIndex={6}
          type="number"
          step="0.05"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-rose-400 font-mono font-bold focus:outline-none focus:border-cyan-400/50"
        />
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
