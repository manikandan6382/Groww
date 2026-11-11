import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { LayoutDashboard, Zap, BookOpen, Globe2 } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

const NAV_ITEMS = [
  { id: "dashboard", label: "My Stocks & Wealth", sub: "Net Worth & Holdings", key: "1", icon: LayoutDashboard },
  { id: "paper", label: "Live Signals & Practice", sub: "Zero-Risk Paper Trading", key: "2", icon: Zap, live: true },
  { id: "journal", label: "Trading Journal", sub: "Take-Home Profit Stories", key: "3", icon: BookOpen },
  { id: "foreign", label: "Foreign Stocks", sub: "US Tech Giants (Alpha)", key: "4", icon: Globe2 },
];

export function SidebarNav({ activeView, setActiveView, isPinned = true }) {
  return (
    <nav className="space-y-1.5 relative" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (!isActive) {
                soundEngine.playTabSwitchTone();
                setActiveView(item.id);
              }
            }}
            className={clsx(
              "w-full flex items-center rounded-2xl text-left relative cursor-pointer active:scale-95 group transition-colors duration-200",
              isPinned ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
              isActive ? "text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {/* 🌟 Framer Motion Active Glider Pill (Butter-Smooth Spring Transition) */}
            {isActive && (
              <motion.div
                layoutId="activeNavGlider"
                className="absolute inset-0 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 shadow-[0_4px_20px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 32,
                  mass: 0.8
                }}
              />
            )}

            <Icon
              className={clsx(
                "w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 relative z-10",
                isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-white"
              )}
            />

            {isPinned && (
              <>
                <div className="flex-1 min-w-0 relative z-10 transition-opacity duration-200">
                  <div className="text-xs font-bold truncate whitespace-nowrap">{item.label}</div>
                  <div className="text-[9px] text-slate-400 truncate whitespace-nowrap">{item.sub}</div>
                </div>
                {item.live && <span className="pulse-beacon relative z-10" />}
                <kbd className="apple-kbd relative z-10">{item.key}</kbd>
              </>
            )}

            {!isPinned && item.live && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}

            {/* 🌟 Instant Floating Apple Vision Pro Glass Tooltip (Zero Latency) */}
            {!isPinned && (
              <div className="absolute left-full ml-3 px-3 py-2 rounded-2xl bg-[#0d111a]/95 border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.8)] backdrop-blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[60] flex items-center gap-3 -translate-x-1 group-hover:translate-x-0">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">{item.label}</span>
                  <span className="text-[9.5px] text-slate-400 leading-tight">{item.sub}</span>
                </div>
                <kbd className="apple-kbd text-[9px] px-1.5 py-0.5">{item.key}</kbd>
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}
