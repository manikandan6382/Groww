import React from "react";
import clsx from "clsx";
import { LayoutDashboard, Zap, BookOpen, Globe2 } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "My Stocks & Wealth", sub: "Net Worth & Holdings", key: "1", icon: LayoutDashboard },
  { id: "paper", label: "Live Signals & Practice", sub: "Zero-Risk Paper Trading", key: "2", icon: Zap, live: true },
  { id: "journal", label: "Trading Journal", sub: "Take-Home Profit Stories", key: "3", icon: BookOpen },
  { id: "foreign", label: "Foreign Stocks", sub: "US Tech Giants (Alpha)", key: "4", icon: Globe2 },
];

export function SidebarNav({ activeView, setActiveView }) {
  return (
    <nav className="space-y-1.5" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-300 group relative cursor-pointer active:scale-95",
              isActive
                ? "bg-cyan-500/15 border border-cyan-500/30 text-white shadow-[0_4px_20px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <Icon className={clsx("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-white")} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{item.label}</div>
              <div className="text-[9px] text-slate-400 truncate">{item.sub}</div>
            </div>
            {item.live && <span className="pulse-beacon" />}
            <kbd className="apple-kbd">{item.key}</kbd>
          </button>
        );
      })}
    </nav>
  );
}
