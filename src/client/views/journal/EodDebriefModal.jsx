import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Copy, Check, Download, X, ShieldCheck, Award, Zap, AlertTriangle } from "lucide-react";
import { generateEodDebrief } from "./generateEodDebrief";
import { soundEngine } from "../../utils/soundEngine";

export function EodDebriefModal({ isOpen, onClose, trades = [], vixLtp = 13.2 }) {
  const [copied, setCopied] = useState(false);

  const {
    markdown,
    targetDate,
    totalTrades,
    netPnl,
    grossPnl,
    totalFriction,
    winRate,
    lossRunway,
    stopsRemaining,
    sessionLeakageRupees,
    isDisciplined
  } = useMemo(() => generateEodDebrief(trades, null, vixLtp), [trades, vixLtp]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        soundEngine?.playSuccessTone?.();
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    soundEngine?.playTabSwitchTone?.();
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EOD-Trading-Debrief-${targetDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isProfit = netPnl >= 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-3xl p-6 rounded-3xl bg-[#0d111a]/98 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 text-slate-100 backdrop-blur-2xl max-h-[92vh] flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Executive EOD Trading Debrief</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {targetDate} IST
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Automated institutional session reconciliation &amp; risk audit
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Net P&amp;L</span>
              <span className={clsx("text-base font-black", isProfit ? "text-emerald-400" : "text-rose-400")}>
                {isProfit ? "+" : ""}₹{netPnl.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Daily Quota</span>
              <span className="text-base font-black text-white">
                {totalTrades} / 3 Trades
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Daily Runway</span>
              <span className="text-base font-black text-cyan-300">
                ₹{lossRunway} ({stopsRemaining} stops)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Discipline Status</span>
              <span className={clsx("text-xs font-sans font-extrabold flex items-center gap-1", isDisciplined ? "text-emerald-400" : "text-amber-400")}>
                {isDisciplined ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isDisciplined ? "100% Invariant" : "Leakage Flagged"}
              </span>
            </div>
          </div>

          {/* Markdown Code Preview Block */}
          <div className="relative flex-1 overflow-y-auto max-h-[46vh] rounded-2xl bg-[#080b11] border border-white/[0.06] p-4 text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin whitespace-pre-wrap selection:bg-purple-500/30">
            {markdown}
          </div>

          {/* Footer CTAs */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs">
            <span className="text-[10px] text-slate-500 font-mono">
              Obsidian / Notion / Markdown Compatible
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 font-bold transition cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download .md</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={clsx(
                  "flex items-center gap-1.5 px-5 py-2 rounded-xl font-extrabold transition cursor-pointer active:scale-95 shadow-lg",
                  copied
                    ? "bg-emerald-500 text-black shadow-emerald-500/20"
                    : "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black shadow-cyan-500/20"
                )}
              >
                {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Markdown"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
