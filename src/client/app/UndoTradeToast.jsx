import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTradingStore } from "../stores/useTradingStore";

export function UndoTradeToast() {
  const undoTradeBackup = useTradingStore((s) => s.undoTradeBackup);
  const undoCountdown = useTradingStore((s) => s.undoCountdown);
  const executeUndoTrade = useTradingStore((s) => s.executeUndoTrade);

  return (
    <AnimatePresence>
      {undoTradeBackup && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#121424]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center gap-3 text-xs"
        >
          <span className="text-slate-200 font-medium">
            Trade <strong className="text-white font-mono">{undoTradeBackup.symbol}</strong> deleted.
          </span>
          <button
            type="button"
            onClick={executeUndoTrade}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 active:scale-95 text-black font-extrabold font-mono transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <span>Undo</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-black text-[11px] font-mono font-black tabular-nums border border-black/10">
              {undoCountdown}s
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
