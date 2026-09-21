import React, { useState, useRef } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Download, Upload, Check, AlertTriangle, X, FileJson, HardDrive } from "lucide-react";
import { useTradingStore } from "../../stores/useTradingStore";
import { persistTradesBatchToBackend } from "../../stores/slices/tradePersistence";
import { soundEngine } from "../../utils/soundEngine";

function sanitizeBackupTrades(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((t) => t && typeof t === "object")
    .map((t, idx) => {
      const entry = Number(t.entryPrice || 0);
      const exit = Number(t.exitPrice || entry);
      const net = Number(t.netPnl ?? t.pnl ?? 0);
      return {
        ...t,
        id: t.id ? String(t.id) : `backup_${Date.now()}_${idx}`,
        symbol: typeof t.symbol === "string" && t.symbol.trim() ? t.symbol.trim() : "NIFTY",
        entryPrice: isNaN(entry) ? 0 : entry,
        exitPrice: isNaN(exit) ? 0 : exit,
        netPnl: isNaN(net) ? 0 : net,
        entryDatetime: typeof t.entryDatetime === "string" ? t.entryDatetime : new Date().toISOString(),
        exitDatetime: typeof t.exitDatetime === "string" ? t.exitDatetime : new Date().toISOString(),
        strategyTag: typeof t.strategyTag === "string" ? t.strategyTag : (t.setupTag || "Discretionary"),
        psychTags: Array.isArray(t.psychTags) ? t.psychTags : []
      };
    });
}

export function TradingBrainBackupModal({ isOpen, onClose }) {
  const masterTrades = useTradingStore((s) => s.masterTrades || []);
  const restoreTradingBrain = useTradingStore((s) => s.restoreTradingBrain);

  const [statusMessage, setStatusMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      soundEngine?.playSuccessTone?.();
      const todayStr = new Date().toISOString().slice(0, 10);
      const backupPayload = {
        app: "PortfolioX Trading Brain",
        version: "4.0 Pro",
        exportedAt: new Date().toISOString(),
        totalTrades: masterTrades.length,
        trades: masterTrades
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `portfoliox-trading-brain-${todayStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage(`Exported ${masterTrades.length} trades to JSON backup.`);
      setIsSuccess(true);
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    if (isProcessing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        const parsed = JSON.parse(content);
        const rawTrades = Array.isArray(parsed?.trades) ? parsed.trades : Array.isArray(parsed) ? parsed : null;

        if (!rawTrades || rawTrades.length === 0) {
          throw new Error("No valid trade array found in this JSON file.");
        }

        const sanitizedTrades = sanitizeBackupTrades(rawTrades);
        if (sanitizedTrades.length === 0) {
          throw new Error("JSON contained no recoverable trade objects.");
        }

        // Restore into Zustand store & localStorage
        const ok = restoreTradingBrain?.(sanitizedTrades);
        if (!ok) throw new Error("Failed to restore trade brain into store.");

        // Asynchronously backfill to SQLite database
        persistTradesBatchToBackend(sanitizedTrades).catch(() => {});

        soundEngine?.playTradeExecutedTone?.();
        setStatusMessage(`Successfully restored ${sanitizedTrades.length} verified trades!`);
        setIsSuccess(true);
        setTimeout(() => {
          setStatusMessage(null);
          setIsProcessing(false);
          onClose();
        }, 2000);
      } catch (err) {
        soundEngine?.playWarningTone?.();
        setStatusMessage(err.message || "Invalid JSON file structure.");
        setIsSuccess(false);
        setIsProcessing(false);
      } finally {
        if (e.target) e.target.value = "";
      }
    };
    reader.onerror = () => {
      soundEngine?.playWarningTone?.();
      setStatusMessage("Failed to read file from disk.");
      setIsSuccess(false);
      setIsProcessing(false);
      if (e.target) e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#0d111a]/95 border border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] p-6 space-y-5 overflow-hidden"
        >
          {/* Radial glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/[0.08] rounded-full blur-[80px] pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <span>Trading Brain Backup &amp; Restore</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    JSON Portability
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Export or import your complete trade ledger, psychological tags, and notes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Message Notification */}
          {statusMessage && (
            <div className={clsx(
              "p-3 rounded-2xl border text-xs font-mono flex items-center gap-2 animate-fadeIn",
              isSuccess ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            )}>
              {isSuccess ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Sections: Export vs Import */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Export JSON Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] space-y-3 flex flex-col justify-between transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <Download className="w-4 h-4" />
                  <span>Export Full Brain</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Downloads all <strong className="text-white">{masterTrades.length} trades</strong> with complete notes, catalysts, and psychological tags to a portable `.json` file.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportJson}
                disabled={isProcessing}
                className={clsx(
                  "w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all shadow-sm",
                  isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
                )}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>{isProcessing ? "Processing..." : "Export (.json)"}</span>
              </button>
            </div>

            {/* 2. Import / Restore Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] space-y-3 flex flex-col justify-between transition-all">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Upload className="w-4 h-4" />
                  <span>Restore Brain</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload a previously saved `.json` backup to re-hydrate your entire cockpit and persist directly into SQLite.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={clsx(
                  "w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all shadow-sm",
                  isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
                )}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{isProcessing ? "Restoring..." : "Upload (.json)"}</span>
              </button>
            </div>
          </div>

          {/* Footer Safeguard Note */}
          <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>🛡️ Auto-persists to SQLite `database.sqlite`</span>
            <span className="text-slate-500">Zero Cloud Leakage</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TradingBrainBackupModal;
