import React from "react";
import { Zap } from "lucide-react";

export function SidebarBrandProfile() {
  return (
    <>
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
          <div className="w-full h-full bg-[var(--bg)] rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>
        <div>
          <div className="font-extrabold tracking-tight text-white text-base leading-none font-mono">
            PORTFOLIO<span className="text-cyan-400">X</span>
          </div>
          <div className="text-[9px] font-extrabold text-cyan-400/90 tracking-widest mt-1 uppercase font-mono">
            SPATIAL DESK
          </div>
        </div>
      </div>

      {/* User Profile Pill */}
      <div className="p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate font-mono">Manikandan</div>
          <div className="text-[10px] text-slate-400 truncate">@zerodha · Pro Scalper</div>
        </div>
        <span className="px-2 py-0.5 text-[9px] font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full font-mono">
          PRO
        </span>
      </div>
    </>
  );
}
