import React from "react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { FX_RATES } from "../portfolio/portfolioNavEngine";
import { useWatchlistData } from "./useWatchlistData";
import { WatchlistHeader } from "./WatchlistHeader";
import { WatchlistSearchStrip } from "./WatchlistSearchStrip";
import { WatchlistSectorTabs } from "./WatchlistSectorTabs";
import { WatchlistCardsGrid } from "./WatchlistCardsGrid";
import { WatchlistMatrixTable } from "./WatchlistMatrixTable";
import { WatchlistDepthModal } from "./WatchlistDepthModal";
import { WatchlistTradeModal } from "./WatchlistTradeModal";
import { WatchlistToast } from "./WatchlistToast";

export const WatchlistSection = React.memo(function WatchlistSection({ holdings = [] }) {
  const data = useWatchlistData();
  const currency = useTradingStore((s) => s.portfolioCurrency || "INR");
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode || false);
  const fxConfig = FX_RATES[currency] || FX_RATES.INR;
  const fxRate = fxConfig.rate;
  const currencySymbol = fxConfig.symbol;

  const handleResetFilters = () => {
    data.setSearch("");
    data.setActiveSectorFilter("all");
  };

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#0d0f14]/85 backdrop-blur-3xl border border-white/[0.07] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden space-y-6 hover:border-white/[0.14] transition-colors">
      {/* 🌌 Apple Luxury Spatial Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-[420px] h-[220px] bg-cyan-500/[0.04] rounded-full blur-[90px] pointer-events-none -mt-24" />
      <div className="absolute bottom-0 left-10 w-[360px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none -mb-20" />

      {/* 1. Watchlist Header with Quick Pulse & Currency Tag */}
      <WatchlistHeader
        viewMode={data.viewMode}
        setViewMode={data.setViewMode}
        sortBy={data.sortBy}
        setSortBy={data.setSortBy}
        filteredCount={data.filteredSymbols.length}
        totalCount={data.watchlistSymbols.length}
        currencySymbol={currencySymbol}
        currency={currency}
      />

      {/* 2. Search Strip & Quick Add Pills */}
      <WatchlistSearchStrip
        search={data.search}
        setSearch={data.setSearch}
        searchInputRef={data.searchInputRef}
        searchCandidates={data.searchCandidates}
        handleAddPreset={data.handleAddPreset}
        watchlistSymbols={data.watchlistSymbols}
      />

      {/* 3. Sector & Momentum Tabs */}
      <WatchlistSectorTabs
        activeSectorFilter={data.activeSectorFilter}
        onTabChange={data.handleTabChange}
      />

      {/* 4. Active View: Spatial Cards vs Institutional Matrix */}
      {data.viewMode === "grid" ? (
        <WatchlistCardsGrid
          filteredSymbols={data.filteredSymbols}
          holdings={holdings}
          openAlerts={data.openAlerts}
          onOpenDepth={data.handleOpenDepthModal}
          onOpenTrade={data.handleOpenTradeModal}
          onSquareOff={data.handleSquareOff}
          onRemove={data.handleRemove}
          onResetFilters={handleResetFilters}
          currencySymbol={currencySymbol}
          fxRate={fxRate}
          isPrivacyMode={isPrivacyMode}
        />
      ) : (
        <WatchlistMatrixTable
          filteredSymbols={data.filteredSymbols}
          holdings={holdings}
          openAlerts={data.openAlerts}
          onOpenDepth={data.handleOpenDepthModal}
          onOpenTrade={data.handleOpenTradeModal}
          onSquareOff={data.handleSquareOff}
          onRemove={data.handleRemove}
          onResetFilters={handleResetFilters}
          currencySymbol={currencySymbol}
          fxRate={fxRate}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {/* 5. Institutional 5-Level Market Depth Ladder Modal */}
      <WatchlistDepthModal
        isOpen={data.activeModal?.type === "depth"}
        onClose={() => data.setActiveModal(null)}
        activeStockMeta={data.activeStockMeta}
        activeRadarData={data.activeRadarData}
        activeCleanSym={data.activeCleanSym}
        activeSymbol={data.activeModal?.symbol}
        filteredSymbols={data.filteredSymbols}
        onSelectSymbol={data.handleOpenDepthModal}
      />

      {/* 6. Quick Order Pad Modal (Cash & Option Scalp Desk) */}
      <WatchlistTradeModal
        isOpen={Boolean(data.activeTradeModal)}
        onClose={data.handleCloseTradeModal}
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
        onExecuteEquity={data.handleExecuteEquity}
        onExecuteScalp={data.handleExecuteScalp}
        onTransferToPaperLab={data.handleTransferToPaperLab}
        currencySymbol={currencySymbol}
        fxRate={fxRate}
      />

      {/* 7. Action Toast Notification */}
      <WatchlistToast message={data.toastMessage} />
    </div>
  );
});

export default WatchlistSection;
