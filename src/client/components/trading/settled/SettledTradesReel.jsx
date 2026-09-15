import React from "react";
import { useSettledReelData, PAGE_SIZE } from "./useSettledReelData";
import { SettledReelHeaderControls } from "./SettledReelHeaderControls";
import { SettledTradeInspectorDock } from "./SettledTradeInspectorDock";
import { SettledTradeItemCard } from "./SettledTradeItemCard";
import { SettledReelPaginationFooter } from "./SettledReelPaginationFooter";

export function SettledTradesReel({
  equityPoints = [],
  activePoint = null,
  selectedId = null,
  onSelectTrade,
  onSnapLatest,
  maxWin = 0,
  recoveryFactor = 0,
  baseCapital = 100000,
}) {
  const reel = useSettledReelData({
    equityPoints,
    activePoint,
    onSelectTrade,
    onSnapLatest,
  });

  return (
    <div className="space-y-3.5 mt-4 pt-4 border-t border-white/[0.08]">
      {/* Reel Header Controls & Filters */}
      <SettledReelHeaderControls
        equityPoints={equityPoints}
        activePoint={activePoint}
        reelFilter={reel.reelFilter}
        setReelFilter={reel.setReelFilter}
        setReelPage={reel.setReelPage}
        reelSort={reel.reelSort}
        setReelSort={reel.setReelSort}
        onSnapLatest={onSnapLatest}
        playAudio={reel.playAudio}
        maxWin={maxWin}
        recoveryFactor={recoveryFactor}
      />

      {/* Quick Execution Telemetry Inspector Dock */}
      <SettledTradeInspectorDock
        activePoint={activePoint}
        onSnapLatest={onSnapLatest}
        playAudio={reel.playAudio}
      />

      {/* Trade Cards Grid */}
      {reel.displayReelPoints.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>No trades match the current outcome filter. Select &quot;All&quot; to view your complete trade reel.</span>
        </div>
      ) : equityPoints.length <= 1 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
          <span>Vault initialized at ₹{baseCapital.toLocaleString("en-IN")} baseline. Execute setups to dynamically chart compounding!</span>
        </div>
      ) : (
        <div 
          tabIndex={0}
          onKeyDown={reel.handleKeyDown}
          title="Trade Reel: Use Arrow Keys (←, →, ↑, ↓) to navigate trades · Esc to snap to live"
          className="max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 rounded-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {reel.paginatedPoints.map((p) => (
              <SettledTradeItemCard
                key={p.id}
                point={p}
                isSelected={activePoint?.id === p.id}
                onSelect={() => {
                  reel.playAudio();
                  onSelectTrade(selectedId === p.id ? null : p.id);
                }}
                baseCapital={baseCapital}
              />
            ))}
          </div>

          {/* View Capping / 25-Card Pagination Footer */}
          <SettledReelPaginationFooter
            totalReelMatches={reel.totalReelMatches}
            pageSize={PAGE_SIZE}
            currentPage={reel.currentPage}
            totalPages={reel.totalPages}
            onPageChange={(p) => reel.setReelPage(p)}
            playAudio={reel.playAudio}
          />
        </div>
      )}
    </div>
  );
}

export default SettledTradesReel;
