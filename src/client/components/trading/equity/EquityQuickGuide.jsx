import React from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Mountain, Crown, Waves } from "lucide-react";

export function EquityQuickGuide({ showGuide, setShowGuide }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => {
          soundEngine?.playClickTone?.();
          setShowGuide((prev) => !prev);
        }}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400">💡</span>
          <span>What does this graph mean? (Click for plain-English guide)</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono font-bold">
          <span>{showGuide ? "Collapse" : "Explain Like I'm 5"}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="px-4 pb-4 pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
          >
            <div className="p-3 rounded-xl bg-[#121424] border border-emerald-500/20 space-y-1">
              <strong className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <Mountain className="w-4 h-4" />
                1. Growth Line (Balance)
              </strong>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Your bank account total as trades settle. Wins pull the curve upward; losses cause small dips.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#121424] border border-cyan-500/20 space-y-1">
              <strong className="text-cyan-400 flex items-center gap-1.5 font-bold">
                <Crown className="w-4 h-4" />
                2. All-Time Peak (Ceiling)
              </strong>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The highest capital balance you ever achieved. Every new peak unlocks higher account milestone badges.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#121424] border border-rose-500/20 space-y-1">
              <strong className="text-rose-400 flex items-center gap-1.5 font-bold">
                <Waves className="w-4 h-4" />
                3. Drawdown (The Valley)
              </strong>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The temporary drop below your peak. A small valley (&lt; 2%) proves you never tilt on losing days.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
