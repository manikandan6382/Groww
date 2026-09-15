import React, { useState } from "react";
import clsx from "clsx";
import { 
  Search, 
  BookMarked, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { ThemeVibeSwitcher } from "./ThemeVibeSwitcher";

export function TopbarControls() {
  const { 
    setRosettaOpen, 
    setCommandPaletteOpen,
    activeTheme, 
    setTheme, 
    customThemeColors, 
    setCustomColor,
    isPrivacyMode,
    togglePrivacyMode
  } = useTradingStore();

  const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEngine.playOrderFillTone();
    }
  };

  return (
    <div className="flex-shrink-0 flex items-center min-w-0 gap-2.5">
      {/* Spotlight Search Capsule (⌘K) */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setCommandPaletteOpen(true);
          }}
          className="h-9 px-3 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all text-xs active:scale-95 shadow-sm cursor-pointer flex items-center gap-2 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-bold tracking-tight text-slate-300">Spotlight</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold border border-white/10 shadow-inner">
            ⌘K
          </kbd>
        </button>
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#121424]/95 border border-white/10 rounded-xl text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
          Spotlight Command Palette (⌘K)
        </div>
      </div>

      {/* 60s Beginner Guide Pill */}
      <div className="relative group hidden sm:block">
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone();
            setRosettaOpen(true);
          }}
          className="h-9 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">60s Guide</span>
        </button>
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#121424]/95 border border-white/10 rounded-xl text-[10px] font-mono text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
          Learn Trading in 60s
        </div>
      </div>

      {/* Unified Spatial Control Capsule */}
      <div className="h-9 flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-inner flex-shrink-0">
        {/* Spatial Audio Sound FX Toggle */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleToggleMute}
            className={clsx(
              "w-7 h-7 rounded-full border transition-all text-xs flex items-center justify-center cursor-pointer active:scale-95",
              isMuted 
                ? "bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300" 
                : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            )}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#121424]/95 border border-white/10 rounded-xl text-[10px] font-mono text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
            {isMuted ? "Sound Muted" : "Haptic Sound ON"}
          </div>
        </div>

        {/* Streamer P&L Privacy Mode Toggle */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              togglePrivacyMode();
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "w-7 h-7 rounded-full border transition-all text-xs flex items-center justify-center cursor-pointer active:scale-95",
              isPrivacyMode 
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]" 
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200"
            )}
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 text-indigo-300" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-[#121424]/95 border border-white/10 rounded-xl text-[10px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl backdrop-blur-md">
            {isPrivacyMode ? "Streamer Mode: ON" : "Privacy Mode (Ctrl+H)"}
          </div>
        </div>

        {/* Ambient Gradient Vibe Switcher */}
        <ThemeVibeSwitcher
          activeTheme={activeTheme}
          setTheme={setTheme}
          customThemeColors={customThemeColors}
          setCustomColor={setCustomColor}
        />
      </div>

      {/* User Profile Avatar with Luxury Obsidian Rim */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform flex-shrink-0" title="Manikandan (Pro Trader Desk)">
        <div className="w-full h-full bg-[var(--bg)] rounded-full flex items-center justify-center font-black text-white text-xs">
          M
        </div>
      </div>
    </div>
  );
}
