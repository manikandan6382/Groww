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
    <aside className="hidden md:flex w-64 bg-[var(--sidebar)] backdrop-blur-3xl border-r border-[var(--line)] flex-col justify-between p-4 flex-shrink-0 h-screen sticky top-0 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      <div className="space-y-4">
        <SidebarBrandProfile />

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

      {/* Footer */}
      <div className="pt-3 border-t border-white/5 text-[10px] text-slate-400 flex items-center justify-between px-2 font-mono">
        <span>Spatial Atmosphere</span>
        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-mono text-cyan-400 border border-white/10">
          Vision Pro
        </span>
      </div>
    </aside>
  );
});

export default Sidebar;
