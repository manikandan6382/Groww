import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTradingStore } from "../../../stores/useTradingStore";
import { CustomTradeModalHeader } from "./CustomTradeModalHeader";
import { ManualTradeForm } from "./ManualTradeForm";
import { PresetTemplatesTab } from "./PresetTemplatesTab";
import { BulkImportTab } from "./BulkImportTab";
import { BrainBackupTab } from "./BrainBackupTab";

export function CustomTradeModal({ isOpen, onClose }) {
  const { 
    logJournalTrade, 
    bulkAddJournalTrades, 
    resetJournalTrades, 
    restoreTradingBrain, 
    journalTrades 
  } = useTradingStore();

  const [activeTab, setActiveTab] = useState("manual");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-[#121424]/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <CustomTradeModalHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={onClose}
        />

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === "manual" && (
            <ManualTradeForm
              onLogTrade={logJournalTrade}
              onClose={onClose}
            />
          )}

          {activeTab === "presets" && (
            <PresetTemplatesTab
              onLogTrade={logJournalTrade}
              onResetTrades={resetJournalTrades}
              onClose={onClose}
            />
          )}

          {activeTab === "bulk" && (
            <BulkImportTab
              onBulkImport={bulkAddJournalTrades}
              onClose={onClose}
            />
          )}

          {activeTab === "backup" && (
            <BrainBackupTab
              journalTrades={journalTrades}
              onRestoreBrain={restoreTradingBrain}
              onResetTrades={resetJournalTrades}
              onClose={onClose}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default CustomTradeModal;
