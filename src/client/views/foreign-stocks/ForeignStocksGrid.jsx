import React from "react";
import { ForeignStockCard } from "./ForeignStockCard";

export function ForeignStocksGrid({
  filteredStocks,
  onSelectSimStock,
  copiedSymbol,
  onCopySymbol,
  onOpenDetail,
  watchlist = [],
  onToggleWatchlist,
  comparedSymbols = [],
  onToggleCompare,
  onResetFilters
}) {
  if (filteredStocks.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0d0f14]/80 border border-white/5 space-y-3">
        <strong className="text-sm font-bold text-white block">No foreign stocks match your criteria</strong>
        <p className="text-xs text-slate-400">Try adjusting your sector filter or search keyword.</p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold transition cursor-pointer active:scale-95 shadow-sm"
          >
            Clear Filters & Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredStocks.map((stock) => (
        <ForeignStockCard
          key={stock.symbol}
          stock={stock}
          onSelectSimStock={onSelectSimStock}
          copiedSymbol={copiedSymbol}
          onCopySymbol={onCopySymbol}
          onOpenDetail={onOpenDetail}
          isWatchlisted={watchlist.includes(stock.symbol)}
          onToggleWatchlist={onToggleWatchlist}
          isComparing={comparedSymbols.includes(stock.symbol)}
          onToggleCompare={onToggleCompare}
        />
      ))}
    </div>
  );
}

export default ForeignStocksGrid;
