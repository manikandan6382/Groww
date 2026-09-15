import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { LuxuryDateRangePicker } from "../../common/LuxuryDateRangePicker";
import { TradeMarketJourneyTimeline } from "../TradeMarketJourneyTimeline";
import { HistoryMasterHeader } from "./HistoryMasterHeader";
import { HistoryFilterToolbar } from "./HistoryFilterToolbar";
import { SettledTradesTable } from "./SettledTradesTable";
import { computeAssetCounts, filterAlerts, computeRealizedMetrics } from "./historyCalculations";
import { exportLedgerCsv, exportLedgerJson, importLedgerJson } from "./historyExportHelpers";

export const TriggeredHistorySection = React.memo(function TriggeredHistorySection() {
  const closedAlerts = useTradingStore((s) => s.closedAlerts || []);
  const openAlerts = useTradingStore((s) => s.openAlerts || []);
  const bulkAddJournalTrades = useTradingStore((s) => s.bulkAddJournalTrades);
  const deleteJournalTradesWithUndo = useTradingStore((s) => s.deleteJournalTradesWithUndo || s.deleteJournalTradeWithUndo);
  const undoTradeBackup = useTradingStore((s) => s.undoTradeBackup);
  const undoCountdown = useTradingStore((s) => s.undoCountdown);
  const executeUndoTrade = useTradingStore((s) => s.executeUndoTrade);
  const dismissUndoTrade = useTradingStore((s) => s.dismissUndoTrade);

  const [assetFilter, setAssetFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [paperLedgerFilter, setPaperLedgerFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [selectedTradeIds, setSelectedTradeIds] = useState(new Set());
  const [activeTimelineTrade, setActiveTimelineTrade] = useState(null);
  const [highlightedTradeId, setHighlightedTradeId] = useState(null);

  const { allCount, niftyCount, bankCount, sensexCount } = useMemo(() => computeAssetCounts(closedAlerts), [closedAlerts]);

  const filteredAlerts = useMemo(
    () => filterAlerts(closedAlerts, { assetFilter, paperLedgerFilter, dateRangeFilter, customStart, customEnd }),
    [closedAlerts, assetFilter, paperLedgerFilter, dateRangeFilter, customStart, customEnd]
  );

  const { totalRealizedPnl, totalGrossPnl, totalCharges, winCount, lossCount } = useMemo(
    () => computeRealizedMetrics(filteredAlerts),
    [filteredAlerts]
  );

  const visibleAlerts = useMemo(() => (showAllRows ? filteredAlerts : filteredAlerts.slice(0, 20)), [filteredAlerts, showAllRows]);

  const handleToggleSelectTrade = useCallback((tradeId) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId); else next.add(tradeId);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    if (selectedTradeIds.size === visibleAlerts.length && visibleAlerts.length > 0) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(visibleAlerts.map((t) => t.id)));
    }
  }, [selectedTradeIds.size, visibleAlerts]);

  const handleDeleteSelected = useCallback(() => {
    const toDelete = visibleAlerts.filter((t) => selectedTradeIds.has(t.id));
    if (toDelete.length === 0) return;
    soundEngine.playDeleteTone();
    deleteJournalTradesWithUndo(toDelete);
    setSelectedTradeIds(new Set());
  }, [deleteJournalTradesWithUndo, selectedTradeIds, visibleAlerts]);

  const handleResetFilters = useCallback(() => {
    soundEngine.playTabSwitchTone();
    setAssetFilter("ALL");
    setDateRangeFilter("all");
    setPaperLedgerFilter("all");
    setCustomStart("");
    setCustomEnd("");
  }, []);

  return (
    <div id="trade-history-ledger" className="p-5 sm:p-7 rounded-3xl bg-[#080e1a]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden min-h-[420px]">
      <HistoryMasterHeader
        displayCount={filteredAlerts.length}
        activeCount={openAlerts.length}
        settledCount={filteredAlerts.length}
        rangeLabel={dateRangeFilter === "today" ? "Today" : dateRangeFilter === "week" ? "This Week" : dateRangeFilter === "month" ? "This Month" : "All Time"}
        totalRealizedPnl={totalRealizedPnl}
        totalGrossPnl={totalGrossPnl}
        totalCharges={totalCharges}
        winCount={winCount}
        lossCount={lossCount}
      />

      <HistoryFilterToolbar
        assetFilter={assetFilter}
        setAssetFilter={setAssetFilter}
        allCount={allCount}
        niftyCount={niftyCount}
        bankCount={bankCount}
        sensexCount={sensexCount}
        dateRangeFilter={dateRangeFilter}
        setDateRangeFilter={setDateRangeFilter}
        paperLedgerFilter={paperLedgerFilter}
        setPaperLedgerFilter={setPaperLedgerFilter}
        onOpenCalendar={() => setCalendarOpen(true)}
        onResetFilters={handleResetFilters}
        onExportCsv={() => exportLedgerCsv(filteredAlerts)}
        onExportJson={() => exportLedgerJson(closedAlerts)}
        onImportJson={(e) => importLedgerJson(e, bulkAddJournalTrades)}
      />

      <SettledTradesTable
        trades={visibleAlerts}
        selectedTradeIds={selectedTradeIds}
        onToggleSelectTrade={handleToggleSelectTrade}
        onSelectAllVisible={handleSelectAllVisible}
        onClearSelection={() => setSelectedTradeIds(new Set())}
        onDeleteSelected={handleDeleteSelected}
        undoTradeBackup={undoTradeBackup}
        undoCountdown={undoCountdown}
        onExecuteUndo={executeUndoTrade}
        onDismissUndo={dismissUndoTrade}
        onOpenTimeline={setActiveTimelineTrade}
        onDeleteTrade={deleteJournalTradesWithUndo}
        highlightedTradeId={highlightedTradeId}
        activeTimelineTradeId={activeTimelineTrade?.id}
        onResetFilters={handleResetFilters}
      />

      {filteredAlerts.length > 20 && (
        <div className="flex items-center justify-between pt-1 text-xs font-mono text-slate-400">
          <span>Showing <strong className="text-white">{visibleAlerts.length}</strong> of <strong className="text-white">{filteredAlerts.length}</strong> trades</span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setShowAllRows(!showAllRows);
            }}
            className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-bold transition cursor-pointer"
          >
            {showAllRows ? "Show Top 20 Rows" : `View All ${filteredAlerts.length} Rows`}
          </button>
        </div>
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {activeTimelineTrade && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl p-4 flex items-center justify-center overflow-y-auto"
              onClick={(e) => { if (e.target === e.currentTarget) setActiveTimelineTrade(null); }}
            >
              <div className="w-full max-w-6xl max-h-[94vh] rounded-[32px] bg-[#060813]/95 border border-white/15 backdrop-blur-3xl overflow-hidden p-6">
                <TradeMarketJourneyTimeline trade={activeTimelineTrade} onClose={() => setActiveTimelineTrade(null)} isModalView={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={customStart}
        endDate={customEnd}
        onApplyRange={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setDateRangeFilter("custom");
        }}
      />
    </div>
  );
});
