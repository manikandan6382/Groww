import React from "react";

export function DatePickerRangeInputs({
  tempStart,
  tempEnd,
  onStartChange,
  onEndChange
}) {
  return (
    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-3 text-xs">
      <div>
        <span className="text-[10px] text-slate-400 block font-medium">Start Date</span>
        <input
          type="date"
          value={tempStart}
          onChange={(e) => onStartChange(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-cyan-500"
        />
      </div>
      <div>
        <span className="text-[10px] text-slate-400 block font-medium">End Date</span>
        <input
          type="date"
          value={tempEnd}
          onChange={(e) => onEndChange(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>
  );
}
