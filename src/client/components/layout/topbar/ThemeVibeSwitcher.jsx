import React, { useState } from "react";
import clsx from "clsx";
import { Palette } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

export function ThemeVibeSwitcher({
  activeTheme,
  setTheme,
  customThemeColors,
  setCustomColor,
}) {
  const [isThemePanelOpen, setThemePanelOpen] = useState(false);

  return (
    <div className="relative flex items-center">
      <div className="flex items-center gap-1 p-0.5 bg-white/[0.03] border border-white/10 rounded-full backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Violet Vibe */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setTheme("violet");
          }}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] font-bold cursor-pointer",
            activeTheme === "violet" 
              ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-purple-200 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.35)]" 
              : "text-slate-400 hover:text-purple-300 hover:bg-white/5"
          )}
          title="Cosmic Violet Gradient Vibe"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm" />
          <span className="hidden sm:inline">Violet</span>
        </button>

        {/* Blue Vibe */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setTheme("blue");
          }}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] font-bold cursor-pointer",
            activeTheme === "blue" 
              ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-[0_0_15px_rgba(56,189,248,0.35)]" 
              : "text-slate-400 hover:text-cyan-300 hover:bg-white/5"
          )}
          title="Oceanic Sapphire Blue Gradient Vibe"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-sm" />
          <span className="hidden sm:inline">Blue</span>
        </button>

        {/* Emerald Vibe */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setTheme("emerald");
          }}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] font-bold cursor-pointer",
            activeTheme === "emerald" 
              ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.35)]" 
              : "text-slate-400 hover:text-emerald-300 hover:bg-white/5"
          )}
          title="Aurora Emerald Green Gradient Vibe"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-sm" />
          <span className="hidden sm:inline">Green</span>
        </button>

        {/* Custom Color Palette Opener */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setThemePanelOpen(!isThemePanelOpen);
          }}
          className={clsx(
            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all cursor-pointer",
            activeTheme === "custom" 
              ? "bg-cyan-400 text-black font-bold ring-2 ring-cyan-300 shadow-md" 
              : "bg-white/10 text-slate-300 hover:bg-white/20"
          )}
          title="Custom Color Studio"
        >
          ✦
        </button>
      </div>

      {/* Custom Theme Color Picker Popover */}
      {isThemePanelOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 p-3.5 rounded-2xl bg-[#121424]/98 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-[60] text-xs space-y-2.5">
          <div className="font-extrabold text-white mb-1 flex items-center justify-between">
            <span>Custom Glass Palette</span>
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <label className="flex items-center justify-between text-slate-300 font-bold">
            <span>Accent Neon</span>
            <input
              type="color"
              value={customThemeColors.accent}
              onChange={(e) => setCustomColor("accent", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
          <label className="flex items-center justify-between text-slate-300 font-bold">
            <span>Canvas BG</span>
            <input
              type="color"
              value={customThemeColors.bg}
              onChange={(e) => setCustomColor("bg", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
          <label className="flex items-center justify-between text-slate-300 font-bold">
            <span>Glass Panel</span>
            <input
              type="color"
              value={customThemeColors.panel}
              onChange={(e) => setCustomColor("panel", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setThemePanelOpen(false);
            }}
            className="w-full py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold hover:bg-cyan-500/30 transition text-center shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
