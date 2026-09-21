import React, { useMemo } from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { SidebarBrandProfile } from "./SidebarBrandProfile";
import { SidebarSessionOdometer } from "./SidebarSessionOdometer";
import { SidebarNav } from "./SidebarNav";
import { SidebarBrokerHub } from "./SidebarBrokerHub";

export const Sidebar = React.memo(function Sidebar() {
  const activeView = useTradingStore((s) => s.activeView);
  const setActiveView = useTradingStore((s) => s.setActiveView);
  const brokerStatus = useTradingStore((s) => s.brokerStatus);
  const journalTrades = useTradingStore((s) => s.journalTrades);

  // Compute Today's Session Metrics (Memoized)
  const { todayTrades, todayNetPnl, todayWins, todayLosses, isTodayProfitable } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayTrades = (journalTrades || []).filter(
      (t) => (t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0]) === todayStr
    );
    const netPnl = todayTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
    const wins = todayTrades.filter((t) => Number(t.netPnl || 0) > 0).length;
    const losses = todayTrades.filter((t) => Number(t.netPnl || 0) <= 0).length;
    return {
      todayTrades,
      todayNetPnl: netPnl,
      todayWins: wins,
      todayLosses: losses,
      isTodayProfitable: netPnl >= 0
    };
  }, [journalTrades]);

  return (
    <aside className="hidden md:flex w-64 bg-[var(--sidebar)] backdrop-blur-3xl border-r border-[var(--line)] flex-col flex-shrink-0 h-screen sticky top-0 z-40 overscroll-contain overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      {/* 1. Rigid Pinned Header (PORTFOLIOX Brand & Profile) - NEVER SCROLLS */}
      <div className="flex-shrink-0 p-4 pb-2 space-y-3 border-b border-white/[0.04]">
        <SidebarBrandProfile />
      </div>

      {/* 2. Smooth Scrollable Workspace Navigation & Telemetry Zone */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 overscroll-contain scrollbar-none">
        <SidebarSessionOdometer
          todayTradesLength={todayTrades.length}
          todayWins={todayWins}
          todayLosses={todayLosses}
          todayNetPnl={todayNetPnl}
          isTodayProfitable={isTodayProfitable}
        />

        <SidebarNav
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <SidebarBrokerHub
          brokerStatus={brokerStatus}
        />
      </div>

      {/* 3. Rigid Pinned Footer - NEVER PUSHED OFF-SCREEN */}
      <div className="flex-shrink-0 p-4 pt-3 border-t border-white/5 bg-[var(--sidebar)] text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span className="text-slate-500">Spatial Atmosphere</span>
        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-mono text-cyan-400 border border-white/10">
          Vision Pro
        </span>
      </div>
    </aside>
  );
});

export default Sidebar;
