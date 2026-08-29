import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { X, Command, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { key: "1", label: "My Stocks & Wealth View" },
  { key: "2", label: "Live Signals & Practice Lab" },
  { key: "3", label: "Trading Journal & Stories" },
  { key: "4", label: "US Tech Radar (Alpha Vantage)" },
  { key: "N", label: "Rapid Trade Logger (Focus 12-Col Form)" },
  { key: "⌘K / /", label: "Spotlight Global Ticker Search" },
  { key: "?", label: "Open Keyboard Cheat Sheet" },
  { key: "ESC", label: "Dismiss Modals / Blur Active Focus" },
];

export function ShortcutsModal() {
  const { isShortcutsOpen, setShortcutsOpen } = useTradingStore();

  return (
    <AnimatePresence>
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShortcutsOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Card with Spring Zoom */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Keyboard Shortcuts
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShortcutsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="divide-y divide-white/5 text-xs">
              {SHORTCUTS.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <kbd className="px-2.5 py-1 bg-slate-800 text-cyan-300 rounded-lg border border-white/10 font-mono font-bold text-[11px] shadow-sm">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-400">
              <span>💡 Pro Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-white/10 font-mono">N</kbd> anywhere to log your trade in &lt;5s.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
