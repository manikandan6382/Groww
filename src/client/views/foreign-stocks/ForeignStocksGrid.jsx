import React from "react";
import { ForeignStockCard } from "./ForeignStockCard";

export function ForeignStocksGrid({
  filteredStocks,
  onSelectSimStock,
  copiedSymbol,
  onCopySymbol
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredStocks.map((stock) => (
        <ForeignStockCard
          key={stock.symbol}
          stock={stock}
          onSelectSimStock={onSelectSimStock}
          copiedSymbol={copiedSymbol}
          onCopySymbol={onCopySymbol}
        />
      ))}
    </div>
  );
}
