import React, { useState, useEffect } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { Search, Zap, LayoutDashboard, BookOpen, Globe2, Palette, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPaletteModal() {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    setActiveView, 
    setTheme, 
    deployPracticeTrade 
  } = useTradingStore();

  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleAction = (cb) => {
    cb();
    setCommandPaletteOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCommandPaletteOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-xl rounded-2xl bg-[#080d1a] border border-white/15 shadow-2xl overflow-hidden z-10"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
            <Search className="w-5 h-5 text-cyan-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search actions..."
              className="flex-1 bg-transparent border-0 text-white placeholder-slate-400 text-sm focus:outline-none"
            />
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
              ESC
            </kbd>
          </div>

          {/* Action List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-4">
            {/* Quick Scalp & Actions */}
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ⚡ Quick Scalp Actions
              </div>
              <div className="space-y-1 mt-1">
                <button
                  onClick={() => handleAction(() => {
                    deployPracticeTrade({
                      symbol: "NIFTY 24300 CE",
                      underlyingSymbol: "NIFTY",
                      strikePrice: 24300,
                      optionType: "CALL",
                      entryPrice: 83.0,
                      targetPrice: 102.0,
                      stopLoss: 75.0,
                      quantity: 1,
                      lotSize: 65,
                      entryReason: "Cmd+K Quick Scalp",
                      strategyMode: "NAKED"
                    });
                    setActiveView("paper");
                  })}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold">🎯</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-300">
                        Scalp NIFTY Call (24300 CE)
                      </div>
                      <div className="text-xs text-slate-400">Auto-fill 1 Lot · ₹83.00 Entry · +19 pt Target</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">1</kbd>
                </button>

                <button
                  onClick={() => handleAction(() => {
                    deployPracticeTrade({
                      symbol: "BANKNIFTY 52200 PE",
                      underlyingSymbol: "BANKNIFTY",
                      strikePrice: 52200,
                      optionType: "PUT",
                      entryPrice: 145.0,
                      targetPrice: 185.0,
                      stopLoss: 130.0,
                      quantity: 1,
                      lotSize: 35,
                      entryReason: "Cmd+K Quick Scalp",
                      strategyMode: "NAKED"
                    });
                    setActiveView("paper");
                  })}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">🛡️</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-rose-300">
                        Scalp BANKNIFTY Put (52200 PE)
                      </div>
                      <div className="text-xs text-slate-400">Auto-fill 1 Lot · ₹145.00 Entry · +40 pt Target</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">2</kbd>
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                🧭 Navigation
              </div>
              <div className="space-y-1 mt-1">
                <button
                  onClick={() => handleAction(() => setActiveView("dashboard"))}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-sm font-bold text-white">My Stocks & Wealth</div>
                      <div className="text-xs text-slate-400">Portfolio Net Worth, Allocation & Holdings</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">1</kbd>
                </button>

                <button
                  onClick={() => handleAction(() => setActiveView("paper"))}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Live Practice Terminal</div>
                      <div className="text-xs text-slate-400">Zero-Risk Live Upstox Options Scalper Desk</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">2</kbd>
                </button>

                <button
                  onClick={() => handleAction(() => setActiveView("journal"))}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Trading Journal & Discipline</div>
                      <div className="text-xs text-slate-400">12-Column Rapid Logger & Profit Analytics</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">3</kbd>
                </button>

                <button
                  onClick={() => handleAction(() => setActiveView("foreign"))}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <Globe2 className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Foreign Stocks Radar</div>
                      <div className="text-xs text-slate-400">US Tech Giants (Alpha Vantage) & Currency Hedge</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">4</kbd>
                </button>
              </div>
            </div>

            {/* Themes */}
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                🎨 Theme Atmosphere
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1 px-2">
                <button
                  onClick={() => handleAction(() => setTheme("blue"))}
                  className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs hover:bg-sky-500/20 text-center"
                >
                  Cyber Blue
                </button>
                <button
                  onClick={() => handleAction(() => setTheme("emerald"))}
                  className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 text-center"
                >
                  Neon Emerald
                </button>
                <button
                  onClick={() => handleAction(() => setTheme("violet"))}
                  className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-xs hover:bg-purple-500/20 text-center"
                >
                  Royal Violet
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
