import React from "react";
import { soundEngine } from "../../../utils/soundEngine";

export const PayoffSliderTrack = React.memo(function PayoffSliderTrack({
  domain,
  effectiveSpot,
  spotRatio,
  scrubRatio,
  onScrubChange,
}) {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Bear Pullback: ₹{domain.min.toLocaleString("en-IN")}</span>
        <button
          type="button"
          onClick={() => {
            onScrubChange(spotRatio);
            soundEngine.playTick();
          }}
          className="text-emerald-400 hover:text-zinc-200 font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/10 border border-white/15 transition cursor-pointer active:scale-95"
          title="Click to reset slider to current market price"
        >
          <span>📍 Current Market: ₹{Math.round(effectiveSpot).toLocaleString("en-IN")}</span>
          <span className="text-[9.5px] text-zinc-200/90 bg-white/10 px-1.5 py-0.2 rounded font-sans">↺ Reset</span>
        </button>
        <span>Bull Rally: ₹{domain.max.toLocaleString("en-IN")}</span>
      </div>
      <input 
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={scrubRatio}
        aria-label="Simulate market price move"
        onChange={(e) => onScrubChange(parseFloat(e.target.value))}
        className="w-full h-3 bg-slate-800/80 rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709]
        [&::-webkit-slider-thumb]:appearance-none 
        [&::-webkit-slider-thumb]:w-6 
        [&::-webkit-slider-thumb]:h-6 
        [&::-webkit-slider-thumb]:rounded-full 
        [&::-webkit-slider-thumb]:bg-gradient-to-tr 
        [&::-webkit-slider-thumb]:from-white 
        [&::-webkit-slider-thumb]:to-emerald-300 
        [&::-webkit-slider-thumb]:shadow-[0_0_18px_rgba(245,158,11,0.8),0_2px_4px_rgba(0,0,0,0.5)] 
        [&::-webkit-slider-thumb]:cursor-grab 
        [&::-webkit-slider-thumb]:active:cursor-grabbing 
        [&::-webkit-slider-thumb]:active:scale-110 
        [&::-webkit-slider-thumb]:transition-transform
        [&::-moz-range-thumb]:w-6 
        [&::-moz-range-thumb]:h-6 
        [&::-moz-range-thumb]:rounded-full 
        [&::-moz-range-thumb]:bg-white 
        [&::-moz-range-thumb]:border-none"
      />
    </div>
  );
});
