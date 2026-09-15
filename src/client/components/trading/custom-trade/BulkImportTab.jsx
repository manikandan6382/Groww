import React, { useState } from "react";
import { Upload } from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";

export function BulkImportTab({ onBulkImport, onClose }) {
  const [bulkInput, setBulkInput] = useState("");
  const [bulkError, setBulkError] = useState("");

  const handleImport = () => {
    setBulkError("");
    try {
      const parsed = JSON.parse(bulkInput);
      if (!Array.isArray(parsed)) {
        setBulkError("Input must be a valid JSON array of trade objects.");
        return;
      }
      onBulkImport(parsed);
      soundEngine.playSuccessTone();
      onClose();
    } catch (err) {
      setBulkError("Invalid JSON format. Please verify syntax.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs">
        Paste a JSON array of custom trade objects to import them in bulk into your journal:
      </p>

      <textarea
        rows={8}
        value={bulkInput}
        onChange={(e) => setBulkInput(e.target.value)}
        placeholder={`[
  {
    "symbol": "TCS.NS",
    "entryPrice": 2240,
    "exitPrice": 2280,
    "netPnl": 2000,
    "closeReason": "TARGET_HIT",
    "strategyTags": "Swing Pullback"
  }
]`}
        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
      />

      {bulkError && (
        <div className="text-rose-400 text-xs font-bold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
          {bulkError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-black font-extrabold shadow-lg shadow-cyan-500/20 transition text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Import Custom Trades</span>
        </button>
      </div>
    </div>
  );
}
