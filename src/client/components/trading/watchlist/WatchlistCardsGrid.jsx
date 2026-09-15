import React from "react";
import { Search } from "lucide-react";
import { WatchlistCard } from "./WatchlistCard";

export const WatchlistCardsGrid = React.memo(function WatchlistCardsGrid({
  filteredSymbols,
  onOpenDepth,
  onOpenTrade,
  onRemove,
  onResetFilters,
}) {
  if (filteredSymbols.length === 0) {
    return (
      <div className="py-14 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-white">No watchlist symbols match your current filters</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-1.5 rounded-xl bg-white/[0.14] hover:bg-white/[0.22] border border-white/20 text-xs font-mono font-bold text-white transition active:scale-95 cursor-pointer shadow-sm"
        >
          Reset Watchlist Filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredSymbols.map((symbol) => (
        <WatchlistCard
          key={symbol}
          symbol={symbol}
          onOpenDepth={onOpenDepth}
          onOpenTrade={onOpenTrade}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
});
