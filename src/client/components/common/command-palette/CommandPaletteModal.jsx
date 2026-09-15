import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTradingStore } from "../../../stores/useTradingStore";
import { QuickScalpActions } from "./QuickScalpActions";
import { NavigationActions } from "./NavigationActions";
import { ThemeAtmosphereActions } from "./ThemeAtmosphereActions";

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
          className="relative w-full max-w-xl rounded-2xl bg-[#121424]/95 backdrop-blur-3xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden z-10"
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
            <QuickScalpActions
              onAction={handleAction}
              deployPracticeTrade={deployPracticeTrade}
              setActiveView={setActiveView}
            />

            <NavigationActions
              onAction={handleAction}
              setActiveView={setActiveView}
            />

            <ThemeAtmosphereActions
              onAction={handleAction}
              setTheme={setTheme}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CommandPaletteModal;
