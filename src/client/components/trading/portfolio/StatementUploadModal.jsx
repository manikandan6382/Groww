import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet, X, UploadCloud, CheckCircle2, RotateCcw, Sparkles, ShieldCheck } from "lucide-react";

// Manikandan's verified historical ledger starting with Zerodha Coin NIFTY 50 SIP and expanding into Kite GOLDBEES
const VERIFIED_HISTORICAL_TRANSACTIONS = [
  { date: "2024-09-16", symbol: "NIFTY50", type: "BUY", quantity: 1, price: 5000, platform: "Coin" },
  { date: "2024-11-15", symbol: "NIFTY50", type: "BUY", quantity: 1, price: 10000, platform: "Coin" },
  { date: "2025-01-20", symbol: "SOUTHBANK", type: "BUY", quantity: 511, price: 37.37, platform: "Kite" },
  { date: "2025-03-10", symbol: "KTKBANK", type: "BUY", quantity: 78, price: 205.39, platform: "Kite" },
  { date: "2025-05-18", symbol: "GOLDBEES", type: "BUY", quantity: 350, price: 92.50, platform: "Kite" },
  { date: "2025-09-22", symbol: "GOLDBEES", type: "BUY", quantity: 408, price: 102.80, platform: "Kite" },
  { date: "2025-12-05", symbol: "NIFTYBEES", type: "BUY", quantity: 38, price: 295.91, platform: "Kite" },
  { date: "2026-02-14", symbol: "HDFCBANK", type: "BUY", quantity: 8, price: 727.35, platform: "Kite" },
  { date: "2026-02-14", symbol: "INFY", type: "BUY", quantity: 5, price: 1154.10, platform: "Kite" },
  { date: "2026-02-14", symbol: "NATCOPHARM", type: "BUY", quantity: 5, price: 934.00, platform: "Kite" },
  { date: "2026-02-14", symbol: "ITC", type: "BUY", quantity: 4, price: 320.95, platform: "Kite" }
];

export function StatementUploadModal({
  isOpen,
  onClose,
  hasCustomLedger,
  customLedgerCount,
  onStatementLoaded,
  onStatementReset,
}) {
  const [csvText, setCsvText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const handleLoadVerifiedDemo = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/portfolio/statement/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VERIFIED_HISTORICAL_TRANSACTIONS)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", text: `Loaded ${data.transactionCount} verified Coin + Kite transactions!` });
        onStatementLoaded?.();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to load ledger" });
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/portfolio/statement/reset", { method: "POST" });
      if (res.ok) {
        setFeedback({ type: "info", text: "Reset back to calibrated algorithmic model." });
        onStatementReset?.();
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParseCustomCsv = async () => {
    if (!csvText.trim()) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      const lines = csvText.trim().split("\n");
      const transactions = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.toLowerCase().startsWith("symbol") || line.toLowerCase().startsWith("date")) continue;
        const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 4) {
          // Format: Date, Symbol, Qty, Price, [Type, Platform]
          transactions.push({
            date: parts[0] || new Date().toISOString().split("T")[0],
            symbol: parts[1] || "STOCK",
            quantity: Math.abs(parseFloat(parts[2])) || 1,
            price: Math.abs(parseFloat(parts[3])) || 100,
            type: (parts[4] || "BUY").toUpperCase(),
            platform: parts[5] || "Kite"
          });
        }
      }

      if (transactions.length === 0) {
        setFeedback({ type: "error", text: "No valid rows found. Format: YYYY-MM-DD, Symbol, Qty, Price" });
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/portfolio/statement/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactions)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", text: `Successfully imported ${data.transactionCount} transactions!` });
        setCsvText("");
        onStatementLoaded?.();
      } else {
        setFeedback({ type: "error", text: data.error || "Import failed" });
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="w-full max-w-lg p-6 rounded-3xl bg-[#0e111d]/98 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 text-slate-100 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Tradebook & Statement Importer
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Zerodha Console Tradebook • Coin CAS Ledger
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-300">
                Current Engine Status:
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              {hasCustomLedger ? `Custom Ledger (${customLedgerCount} txs)` : "Authentic Calibrated Inception Model"}
            </span>
          </div>

          {/* Action 1: 1-Click Load Manikandan's Authentic Verified Ledger */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/25 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Manikandan's Verified History (Coin SIP $\to$ Kite GOLDBEES)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Instantly activates your authentic 11-step investment ledger: starting September 2024 with NIFTY 50 on Zerodha Coin and transitioning to 758 shares of GOLDBEES and banking picks on Kite.
            </p>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleLoadVerifiedDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Apply Verified Tradebook Ledger</span>
            </button>
          </div>

          {/* Action 2: Paste Raw CSV / Tradebook Rows */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Or Paste Custom Tradebook CSV Lines
            </label>
            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="YYYY-MM-DD, Symbol, Quantity, Price&#10;e.g. 2024-09-16, NIFTY50, 1, 5000&#10;2025-05-18, GOLDBEES, 350, 92.50"
              className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing || !csvText.trim()}
                onClick={handleParseCustomCsv}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-300" />
                <span>Upload CSV Rows</span>
              </button>
              {hasCustomLedger && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleReset}
                  className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-mono font-bold text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Model</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : feedback.type === "info"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              }`}
            >
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
export default StatementUploadModal;
