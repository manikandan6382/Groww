import React, { useState } from "react";
import { Search, Sparkles, BookMarked, ChevronDown } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { Sparkline } from "../common/Sparkline";
import clsx from "clsx";

export function Topbar() {
  const { 
    searchQuery, 
    setSearchQuery, 
    setRosettaOpen, 
    setCommandPaletteOpen,
    activeTheme, 
    setTheme, 
    customThemeColors, 
    setCustomColor 
  } = useTradingStore();

  const [isThemePanelOpen, setThemePanelOpen] = useState(false);
  const nifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty 50"] ?? s.ticks?.["NSE_INDEX|Nifty 50"]);
  const bankNifty = useLivePriceStore((s) => s.indices?.["NSE_INDEX|Nifty Bank"] ?? s.ticks?.["NSE_INDEX|Nifty Bank"]);

  const sparklineData = [24100, 24120, 24110, 24150, 24135, 24180, 24210, 24200, 24245];

  return (
    <header className="sticky top-0 z-30 bg-app-card/85 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
      {/* Topbar Left: Title & Live Pulse */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              PORTFOLIOX
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              LIVE
            </span>
          </div>
          <h1 className="text-sm md:text-base font-extrabold text-white tracking-tight leading-none">
            Financial Command Center
          </h1>
        </div>
      </div>

      {/* Center Track: Apple Dynamic Ticker Capsules */}
      <div className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-xl">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition shadow-inner">
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">NIFTY 50</div>
            <div className="text-xs font-mono font-bold text-white">
              {nifty?.ltp ? Number(nifty.ltp).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "24,245.00"}
            </div>
          </div>
          <Sparkline data={sparklineData} isGain={true} width={42} height={16} />
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition shadow-inner">
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">BANKNIFTY</div>
            <div className="text-xs font-mono font-bold text-white">
              {bankNifty?.ltp ? Number(bankNifty.ltp).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "52,240.00"}
            </div>
          </div>
          <Sparkline data={[52100, 52150, 52080, 52200, 52240]} isGain={true} width={42} height={16} />
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition shadow-inner">
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">INDIA VIX</div>
            <div className="text-xs font-mono font-bold text-amber-400">13.20</div>
          </div>
          <Sparkline data={[14.1, 13.9, 13.5, 13.4, 13.2]} isGain={false} width={42} height={16} />
        </div>
      </div>

      {/* Right Controls Deck */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Search Capsule / Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-cyan-500/30 text-slate-400 hover:text-slate-200 transition text-xs"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
            ⌘K
          </kbd>
        </button>

        {/* 60s Beginner Guide Pill */}
        <button
          type="button"
          onClick={() => setRosettaOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-bold transition"
          title="Learn trading in 60 seconds"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">60s Guide</span>
        </button>

        {/* Theme Palette Switcher */}
        <div className="relative">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
            <button
              onClick={() => setTheme("blue")}
              className={clsx("w-5 h-5 rounded-lg transition-all", activeTheme === "blue" ? "bg-sky-500 ring-2 ring-sky-400" : "bg-sky-500/40 hover:bg-sky-500/70")}
              title="Cyber Blue"
            />
            <button
              onClick={() => setTheme("emerald")}
              className={clsx("w-5 h-5 rounded-lg transition-all", activeTheme === "emerald" ? "bg-emerald-500 ring-2 ring-emerald-400" : "bg-emerald-500/40 hover:bg-emerald-500/70")}
              title="Neon Emerald"
            />
            <button
              onClick={() => setTheme("violet")}
              className={clsx("w-5 h-5 rounded-lg transition-all", activeTheme === "violet" ? "bg-purple-500 ring-2 ring-purple-400" : "bg-purple-500/40 hover:bg-purple-500/70")}
              title="Royal Violet"
            />
            <button
              onClick={() => setThemePanelOpen(!isThemePanelOpen)}
              className={clsx("w-5 h-5 rounded-lg flex items-center justify-center text-[10px] transition-all", activeTheme === "custom" ? "bg-cyan-500 text-black font-bold ring-2 ring-cyan-400" : "bg-white/10 text-slate-300 hover:bg-white/20")}
              title="Custom Theme Palette"
            >
              ✦
            </button>
          </div>

          {/* Custom Theme Color Picker Popover */}
          {isThemePanelOpen && (
            <div className="absolute right-0 mt-2 w-56 p-3 rounded-2xl bg-[#0a101d] border border-white/15 shadow-2xl z-50 text-xs space-y-2">
              <div className="font-bold text-white mb-1">Custom Palette</div>
              <label className="flex items-center justify-between text-slate-300">
                <span>Accent Neon</span>
                <input
                  type="color"
                  value={customThemeColors.accent}
                  onChange={(e) => setCustomColor("accent", e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
                <span>Canvas BG</span>
                <input
                  type="color"
                  value={customThemeColors.bg}
                  onChange={(e) => setCustomColor("bg", e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
              </label>
              <label className="flex items-center justify-between text-slate-300">
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
                onClick={() => setThemePanelOpen(false)}
                className="w-full py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold hover:bg-cyan-500/30 transition text-center"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-white/10 shadow-md">
          M
        </div>
      </div>
    </header>
  );
}
