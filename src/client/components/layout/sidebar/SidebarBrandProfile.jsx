import React from "react";
import { Zap, Pin, PinOff } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

export function SidebarBrandProfile({ isPinned = true, onTogglePin }) {
  if (!isPinned) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
          <div className="w-full h-full bg-[var(--bg)] rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine?.playTabSwitchTone?.();
            onTogglePin?.();
          }}
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer active:scale-95 shadow-sm"
          title="Pin sidebar (keep open)"
        >
          <PinOff className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-300" />
        </button>
        <div 
          className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm cursor-pointer"
          title="Manikandan (@zerodha · Pro Scalper) - PRO"
        >
          M
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Brand Header with Pin / Unpin Button */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
            <div className="w-full h-full bg-[var(--bg)] rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-extrabold tracking-tight text-white text-sm leading-none font-mono truncate">
              PORTFOLIO<span className="text-cyan-400">X</span>
            </div>
            <div className="text-[8.5px] font-extrabold text-cyan-400/90 tracking-widest mt-0.5 uppercase font-mono truncate">
              SPATIAL DESK
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine?.playTabSwitchTone?.();
            onTogglePin?.();
          }}
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
          title="Unpin sidebar (collapse to rail)"
        >
          <Pin className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
        </button>
      </div>

      {/* User Profile Pill */}
      <div className="p-2 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm shrink-0">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-white truncate font-mono">Manikandan</div>
          <div className="text-[9.5px] text-slate-400 truncate">@zerodha · Pro Scalper</div>
        </div>
        <span className="px-1.5 py-0.5 text-[8.5px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full font-mono shrink-0">
          PRO
        </span>
      </div>
    </>
  );
}
