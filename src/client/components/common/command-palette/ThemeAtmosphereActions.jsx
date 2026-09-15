import React from "react";

export function ThemeAtmosphereActions({ onAction, setTheme }) {
  return (
    <div>
      <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        🎨 Theme Atmosphere
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1 px-2">
        <button
          type="button"
          onClick={() => onAction(() => setTheme("blue"))}
          className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs hover:bg-sky-500/20 text-center cursor-pointer"
        >
          Cyber Blue
        </button>
        <button
          type="button"
          onClick={() => onAction(() => setTheme("emerald"))}
          className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 text-center cursor-pointer"
        >
          Neon Emerald
        </button>
        <button
          type="button"
          onClick={() => onAction(() => setTheme("violet"))}
          className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-xs hover:bg-purple-500/20 text-center cursor-pointer"
        >
          Royal Violet
        </button>
      </div>
    </div>
  );
}
