import React from "react";
import clsx from "clsx";
import { useTradingStore } from "../../../stores/useTradingStore";
import { useSessionTelemetry } from "../../../hooks/useSessionTelemetry";
import { SidebarBrandProfile } from "./SidebarBrandProfile";
import { SidebarSessionOdometer } from "./SidebarSessionOdometer";
import { SidebarNav } from "./SidebarNav";
import { SidebarBrokerHub } from "./SidebarBrokerHub";

export const Sidebar = React.memo(function Sidebar() {
  const activeView = useTradingStore((s) => s.activeView);
  const setActiveView = useTradingStore((s) => s.setActiveView);
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const isSidebarPinned = useTradingStore((s) => s.isSidebarPinned);
  const toggleSidebarPin = useTradingStore((s) => s.toggleSidebarPin);

  // Unified Centralized Session Telemetry
  const { todayTradesCount, sessionNetPnl, todayWins, todayLosses, isSessionProfitable } = useSessionTelemetry();

  return (
    <aside 
      className={clsx(
        "hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0 z-40 overscroll-contain overflow-hidden",
        "bg-[var(--sidebar)] backdrop-blur-3xl border-r border-[var(--line)] shadow-[0_16px_40px_rgba(0,0,0,0.6)]",
        "transition-[width] duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isSidebarPinned ? "w-64" : "w-[72px]"
      )}
    >
      {/* 1. Rigid Pinned Header (PORTFOLIOX Brand & Profile) - NEVER SCROLLS */}
      <div className={clsx(
        "flex-shrink-0 pb-2 border-b border-white/[0.04] transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isSidebarPinned ? "p-4 space-y-3" : "p-2.5 space-y-2"
      )}>
        <SidebarBrandProfile 
          isPinned={isSidebarPinned} 
          onTogglePin={toggleSidebarPin} 
        />
      </div>

      {/* 2. Smooth Scrollable Workspace Navigation & Telemetry Zone */}
      <div className={clsx(
        "flex-1 min-h-0 overflow-y-auto py-3 space-y-4 overscroll-contain scrollbar-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isSidebarPinned ? "px-4" : "px-2"
      )}>
        <SidebarSessionOdometer
          todayTradesLength={todayTradesCount}
          todayWins={todayWins}
          todayLosses={todayLosses}
          todayNetPnl={sessionNetPnl}
          isTodayProfitable={isSessionProfitable}
          isPinned={isSidebarPinned}
        />

        <SidebarNav
          activeView={activeView}
          setActiveView={setActiveView}
          isPinned={isSidebarPinned}
        />

        <SidebarBrokerHub
          brokerStatus={brokerStatus}
          isPinned={isSidebarPinned}
        />
      </div>

      {/* 3. Rigid Pinned Footer - NEVER PUSHED OFF-SCREEN */}
      <div className={clsx(
        "flex-shrink-0 pt-3 border-t border-white/5 bg-[var(--sidebar)] text-[10px] text-slate-400 flex items-center font-mono transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isSidebarPinned ? "p-4 justify-between" : "p-2 justify-center"
      )}>
        {isSidebarPinned ? (
          <>
            <span className="text-slate-500 truncate">Spatial Atmosphere</span>
            <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-mono text-cyan-400 border border-white/10 shrink-0">
              Vision Pro
            </span>
          </>
        ) : (
          <span className="px-1.5 py-0.5 bg-white/5 rounded-full text-[8px] font-mono text-cyan-400 border border-white/10" title="Vision Pro Spatial Atmosphere">
            VP
          </span>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
