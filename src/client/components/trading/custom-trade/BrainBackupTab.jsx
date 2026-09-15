import React, { useState, useRef } from "react";
import { HardDrive, CheckCircle2, X, Download, Upload, RotateCcw } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";
import { exportFullBrainBackup } from "./customTradeUtils";

export function BrainBackupTab({
  journalTrades,
  onRestoreBrain,
  onResetTrades,
  onClose
}) {
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileRestore = (e) => {
    setRestoreError("");
    setRestoreSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        const tradeList = Array.isArray(parsed) ? parsed : parsed.trades;
        if (!Array.isArray(tradeList) || tradeList.length === 0) {
          setRestoreError("Invalid backup file: Could not find valid trades array.");
          return;
        }
        const success = onRestoreBrain(tradeList);
        if (success) {
          soundEngine.playSuccessTone();
          setRestoreSuccess(`✓ Successfully restored ${tradeList.length} trading case studies!`);
          setTimeout(() => onClose(), 1200);
        } else {
          setRestoreError("Failed to restore trade database.");
        }
      } catch (err) {
        setRestoreError("Corrupted JSON file. Please verify file integrity.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Zero-Loss Trading Brain Sovereignty</span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          Export your entire historical journal, psychological notes, catalysts, and 4-act autopsies into a single portable <strong className="text-white font-mono">.json</strong> file.
        </p>
      </div>

      {restoreSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{restoreSuccess}</span>
        </div>
      )}

      {restoreError && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-2">
          <X className="w-4 h-4 text-rose-400" />
          <span>{restoreError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* 1. Export JSON Card */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <strong className="text-white font-bold block text-sm">Export Full Brain (.json)</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Download all {(journalTrades || []).length} trade case studies, integrity scores, and rules to your local disk.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportFullBrainBackup(journalTrades)}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Brain JSON</span>
          </button>
        </div>

        {/* 2. Restore JSON Card */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <strong className="text-white font-bold block text-sm">Restore from Backup</strong>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Restore and rehydrate your entire master journal from a previously exported backup file.
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileRestore}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Select &amp; Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Clean Seed Reset */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Need a fresh start?</span>
        <button
          type="button"
          onClick={() => {
            soundEngine.playDeleteTone();
            onResetTrades();
            onClose();
          }}
          className="px-3 py-1.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to 4 Master Practice Trades</span>
        </button>
      </div>
    </div>
  );
}
