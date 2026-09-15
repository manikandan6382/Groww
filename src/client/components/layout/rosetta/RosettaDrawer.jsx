import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTradingStore } from "../../../stores/useTradingStore";
import { GUIDE_MODULES } from "./rosettaModulesData";
import { RosettaHeader } from "./RosettaHeader";
import { RosettaExpectancyLab } from "./RosettaExpectancyLab";
import { RosettaPreFlightCheck } from "./RosettaPreFlightCheck";
import { RosettaModuleCard } from "./RosettaModuleCard";

export function RosettaDrawer() {
  const isRosettaOpen = useTradingStore((s) => s.isRosettaOpen);
  const setRosettaOpen = useTradingStore((s) => s.setRosettaOpen);
  const rosettaActiveTopic = useTradingStore((s) => s.rosettaActiveTopic);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCardId, setExpandedCardId] = useState(null);

  // R:R Calculator Simulator State
  const [calcRisk, setCalcRisk] = useState(500);
  const [calcRatio, setCalcRatio] = useState(3);
  const [calcWinRate, setCalcWinRate] = useState(40);

  // Pre-Flight Checklist State
  const [chkStopLoss, setChkStopLoss] = useState(false);
  const [chkRatio, setChkRatio] = useState(false);
  const [chkEmotion, setChkEmotion] = useState(false);

  useEffect(() => {
    if (rosettaActiveTopic) {
      setExpandedCardId(rosettaActiveTopic);
      setSelectedCategory("all");
      setSearchQuery("");
    }
  }, [rosettaActiveTopic, isRosettaOpen]);

  const filteredModules = useMemo(() => {
    return GUIDE_MODULES.filter((m) => {
      const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        m.title.toLowerCase().includes(q) ||
        m.kidAnalogy.toLowerCase().includes(q) ||
        m.proMeaning.toLowerCase().includes(q) ||
        m.goldenRule.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <AnimatePresence>
      {isRosettaOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Frosted Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRosettaOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer"
          />

          {/* Slide-in Luxury Spatial Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-2xl h-full bg-[#0d0f14]/98 border-l border-white/10 p-5 sm:p-7 flex flex-col justify-between shadow-2xl backdrop-blur-3xl z-10 overflow-hidden"
          >
            <RosettaHeader
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onClose={() => setRosettaOpen(false)}
            />

            {/* Scrollable Curriculum Body */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              <RosettaExpectancyLab
                calcRisk={calcRisk}
                setCalcRisk={setCalcRisk}
                calcRatio={calcRatio}
                setCalcRatio={setCalcRatio}
                calcWinRate={calcWinRate}
                setCalcWinRate={setCalcWinRate}
              />

              <RosettaPreFlightCheck
                chkStopLoss={chkStopLoss}
                setChkStopLoss={setChkStopLoss}
                chkRatio={chkRatio}
                setChkRatio={setChkRatio}
                chkEmotion={chkEmotion}
                setChkEmotion={setChkEmotion}
              />

              {/* Module Cards Grid */}
              {filteredModules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No trading guide topics found matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredModules.map((item, idx) => (
                  <RosettaModuleCard
                    key={item.id}
                    item={item}
                    index={idx}
                    isExpanded={expandedCardId === item.id}
                    onToggle={() => setExpandedCardId(expandedCardId === item.id ? null : item.id)}
                  />
                ))
              )}
            </div>

            {/* Bottom Footer Action */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Press Esc or click outside to dismiss
              </span>
              <button
                type="button"
                onClick={() => setRosettaOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-300 transition cursor-pointer"
              >
                Got It, Let&apos;s Trade with Discipline!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default RosettaDrawer;
