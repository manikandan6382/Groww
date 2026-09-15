import React from "react";
import { useWatchlistData } from "./useWatchlistData";
import { WatchlistHeader } from "./WatchlistHeader";
import { WatchlistSearchStrip } from "./WatchlistSearchStrip";
import { WatchlistSectorTabs } from "./WatchlistSectorTabs";
import { WatchlistCardsGrid } from "./WatchlistCardsGrid";
import { WatchlistMatrixTable } from "./WatchlistMatrixTable";
import { WatchlistTradeModal } from "./WatchlistTradeModal";
import { WatchlistDepthModal } from "./WatchlistDepthModal";
import { WatchlistToast } from "./WatchlistToast";

export const WatchlistSection = React.memo(function WatchlistSection() {
  const data = useWatchlistData();

  const handleResetFilters = () => {
    data.setSearch("");
    data.setActiveSectorFilter("all");
  };

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#0d0f14]/85 backdrop-blur-3xl border border-white/[0.07] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden space-y-6 hover:border-white/[0.12] transition-colors">
      <div className="absolute top-0 right-1/4 w-[420px] h-[220px] bg-cyan-500/[0.04] rounded-full blur-[90px] pointer-events-none -mt-24" />
      <div className="absolute bottom-0 left-10 w-[360px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none -mb-20" />

      <WatchlistHeader
        viewMode={data.viewMode}
        setViewMode={data.setViewMode}
        sortBy={data.sortBy}
        setSortBy={data.setSortBy}
        filteredCount={data.filteredSymbols.length}
        totalCount={data.watchlistSymbols.length}
      />

      <WatchlistSearchStrip
        search={data.search}
        setSearch={data.setSearch}
        searchInputRef={data.searchInputRef}
        searchCandidates={data.searchCandidates}
        handleAddPreset={data.handleAddPreset}
        watchlistSymbols={data.watchlistSymbols}
      />

      <WatchlistSectorTabs
        activeSectorFilter={data.activeSectorFilter}
        onTabChange={data.handleTabChange}
      />

      {data.viewMode === "grid" ? (
        <WatchlistCardsGrid
          filteredSymbols={data.filteredSymbols}
          onOpenDepth={data.handleOpenDepthModal}
          onOpenTrade={data.handleOpenTradeModal}
          onRemove={data.handleRemove}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <WatchlistMatrixTable
          filteredSymbols={data.filteredSymbols}
          onOpenDepth={data.handleOpenDepthModal}
          onOpenTrade={data.handleOpenTradeModal}
          onRemove={data.handleRemove}
          onResetFilters={handleResetFilters}
        />
      )}

      <WatchlistTradeModal
        isOpen={data.activeModal?.type === "trade"}
        onClose={() => data.setActiveModal(null)}
        activeStockMeta={data.activeStockMeta}
        activeCleanSym={data.activeCleanSym}
        tradeTab={data.tradeTab}
        setTradeTab={data.setTradeTab}
        orderSide={data.orderSide}
        setOrderSide={data.setOrderSide}
        productType={data.productType}
        setProductType={data.setProductType}
        tradeQty={data.tradeQty}
        setTradeQty={data.setTradeQty}
        optionType={data.optionType}
        setOptionType={data.setOptionType}
        optionLots={data.optionLots}
        setOptionLots={data.setOptionLots}
        onExecuteEquity={data.handleExecuteEquityTrade}
        onExecuteScalp={data.handleExecuteOptionScalp}
        onTransferToPaperLab={data.handleTransferToPaperLab}
      />

      <WatchlistDepthModal
        isOpen={data.activeModal?.type === "depth"}
        onClose={() => data.setActiveModal(null)}
        activeStockMeta={data.activeStockMeta}
        activeRadarData={data.activeRadarData}
        activeCleanSym={data.activeCleanSym}
        onOpenTrade={data.handleOpenTradeModal}
      />

      <WatchlistToast message={data.toastMessage} />
    </div>
  );
});

export default WatchlistSection;
