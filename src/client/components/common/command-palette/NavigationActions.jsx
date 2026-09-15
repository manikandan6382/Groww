import React from "react";
import { LayoutDashboard, Zap, BookOpen, Globe2 } from "lucide-react";

export function NavigationActions({ onAction, setActiveView }) {
  return (
    <div>
      <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        🧭 Navigation
      </div>
      <div className="space-y-1 mt-1">
        <button
          type="button"
          onClick={() => onAction(() => setActiveView("dashboard"))}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-sm font-bold text-white">My Stocks &amp; Wealth</div>
              <div className="text-xs text-slate-400">Portfolio Net Worth, Allocation &amp; Holdings</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">1</kbd>
        </button>

        <button
          type="button"
          onClick={() => onAction(() => setActiveView("paper"))}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-white">Live Practice Terminal</div>
              <div className="text-xs text-slate-400">Zero-Risk Live Upstox Options Scalper Desk</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">2</kbd>
        </button>

        <button
          type="button"
          onClick={() => onAction(() => setActiveView("journal"))}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">Trading Journal &amp; Discipline</div>
              <div className="text-xs text-slate-400">12-Column Rapid Logger &amp; Profit Analytics</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">3</kbd>
        </button>

        <button
          type="button"
          onClick={() => onAction(() => setActiveView("foreign"))}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Globe2 className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-sm font-bold text-white">Foreign Stocks Radar</div>
              <div className="text-xs text-slate-400">US Tech Giants (Alpha Vantage) &amp; Currency Hedge</div>
            </div>
          </div>
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">4</kbd>
        </button>
      </div>
    </div>
  );
}
