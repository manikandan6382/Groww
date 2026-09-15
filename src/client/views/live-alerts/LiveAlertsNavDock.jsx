import React from 'react';
import { Layers, Zap, BarChart3, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../utils/soundEngine';

export function LiveAlertsNavDock({
  workspaceFocus,
  setWorkspaceFocus,
  openAlertsCount,
  closedAlertsCount,
  winRate
}) {
  const handleSetWorkspaceFocus = (focus, elementId = null) => {
    soundEngine.playTabSwitchTone?.();
    setWorkspaceFocus(focus);
    try {
      localStorage.setItem("portfoliox_workspace_focus", focus);
    } catch {}
    if (elementId) {
      setTimeout(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-app-card/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex-wrap">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 flex-wrap">
        <button
          type="button"
          onClick={() => handleSetWorkspaceFocus("all")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            workspaceFocus === "all" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>All Sections</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetWorkspaceFocus("cockpit", "active-practice-trades")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            workspaceFocus === "cockpit" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Cockpit ({openAlertsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetWorkspaceFocus("studio", "performance-studio")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            workspaceFocus === "studio" ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <span>Performance Studio</span>
        </button>

        <button
          type="button"
          onClick={() => handleSetWorkspaceFocus("ledger", "practice-history-table")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            workspaceFocus === "ledger" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span>Settled Ledger ({closedAlertsCount})</span>
        </button>
      </div>

      <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400 pr-2">
        {workspaceFocus !== "all" && (
          <button
            type="button"
            onClick={() => handleSetWorkspaceFocus("all")}
            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Showing focused dock · View All</span>
          </button>
        )}
        <span className="text-white/20">|</span>
        <span>Simulation: <strong className="text-white">Active</strong></span>
        <span className="text-white/20">|</span>
        <span className="text-emerald-400 font-bold">{winRate}% Win Rate</span>
      </div>
    </div>
  );
}
