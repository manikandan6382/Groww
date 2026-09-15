import React from "react";
import { EquityTradeReelHeader } from "./EquityTradeReelHeader";
import { EquityTradeReelCard } from "./EquityTradeReelCard";
import { EquityTradeReelPagination } from "./EquityTradeReelPagination";

export function EquityTradeReel({
  equityPoints,
  displayReelPoints,
  totalReelMatches,
  totalPages,
  currentPage,
  reelFilter,
  setReelFilter,
  reelSort,
  setReelSort,
  setReelPage,
  activePoint,
  selectedId,
  setSelectedId,
  setScrubIndex,
  playScrubAudio,
  maxWin,
  recoveryFactor,
  handleReelKeyDown,
  baseCapital = 100000,
  pageSize = 25
}) {
  const tradesSlice = equityPoints.slice(1);
  const winTradesCount = tradesSlice.filter((p) => p.pnl >= 0).length;
  const lossTradesCount = tradesSlice.filter((p) => p.pnl < 0).length;

  return (
    <div className="space-y-3">
      <EquityTradeReelHeader
        totalTradesCount={equityPoints.length - 1}
        winTradesCount={winTradesCount}
        lossTradesCount={lossTradesCount}
        reelFilter={reelFilter}
        setReelFilter={setReelFilter}
        reelSort={reelSort}
        setReelSort={setReelSort}
        activePoint={activePoint}
        onSnapToLatest={() => {
          playScrubAudio();
          setSelectedId(null);
          setScrubIndex(null);
        }}
        playScrubAudio={playScrubAudio}
        maxWin={maxWin}
        recoveryFactor={recoveryFactor}
      />

      {displayReelPoints.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>No trades match the current outcome filter. Select "All" to view your complete trade reel.</span>
        </div>
      ) : equityPoints.length <= 1 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
          <span>Vault initialized at ₹1,00,000 baseline. Execute setups to dynamically chart your compounding trajectory!</span>
        </div>
      ) : (
        <div
          tabIndex={0}
          onKeyDown={handleReelKeyDown}
          title="Trade Reel: Use Arrow Keys (←, →, ↑, ↓) to navigate trades · Esc to snap to live"
          className="max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 rounded-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {displayReelPoints.map((p) => (
              <EquityTradeReelCard
                key={p.id}
                point={p}
                isSelected={activePoint?.id === p.id}
                baseCapital={baseCapital}
                onSelect={() => {
                  playScrubAudio();
                  setSelectedId(selectedId === p.id ? null : p.id);
                  setScrubIndex(null);
                }}
              />
            ))}
          </div>

          {totalReelMatches > pageSize && (
            <EquityTradeReelPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalReelMatches={totalReelMatches}
              setReelPage={setReelPage}
              playScrubAudio={playScrubAudio}
            />
          )}
        </div>
      )}
    </div>
  );
}
