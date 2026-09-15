import React from "react";
import clsx from "clsx";
import { SECTOR_TABS } from "./watchlistRadarUtils";

export const WatchlistSectorTabs = React.memo(function WatchlistSectorTabs({
  activeSectorFilter,
  onTabChange,
}) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner overflow-x-auto no-scrollbar text-xs">
      {SECTOR_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            "px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-[0.97]",
            activeSectorFilter === tab.id
              ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)]"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});
