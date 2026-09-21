import React from "react";
import { ActiveTradesDockHeader } from "./ActiveTradesDockHeader";
import { ActiveTradesList } from "./ActiveTradesList";

export function ActiveTradesSection({
  openAlerts,
  activeTradesViewMode,
  setActiveTradesViewMode,
  onSquareOffAll,
  onCloseTrade,
  onAutoDeploy
}) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key === "Escape") {
        if (openAlerts.length > 0 && typeof onSquareOffAll === "function") {
          e.preventDefault();
          onSquareOffAll();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openAlerts.length, onSquareOffAll]);

  return (
    <div
      id="active-practice-trades"
      className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden"
    >
      {/* Soft Ambient Studio Lighting */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <ActiveTradesDockHeader
        openAlerts={openAlerts}
        openAlertsCount={openAlerts.length}
        activeTradesViewMode={activeTradesViewMode}
        setActiveTradesViewMode={setActiveTradesViewMode}
        onSquareOffAll={onSquareOffAll}
      />

      <ActiveTradesList
        openAlerts={openAlerts}
        activeTradesViewMode={activeTradesViewMode}
        onCloseTrade={onCloseTrade}
        onAutoDeploy={onAutoDeploy}
      />
    </div>
  );
}
