import React from "react";

export function DatePickerPresets({ onSelectPreset }) {
  const presets = [
    { id: "today", label: "Today" },
    { id: "7days", label: "Last 7D" },
    { id: "30days", label: "Last 30D" },
    { id: "this_month", label: "This Month" },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectPreset(p.id)}
          className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 text-[11px] font-mono transition cursor-pointer"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
