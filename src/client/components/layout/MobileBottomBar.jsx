import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { PieChart, Zap, BookOpen, Globe2, BookMarked } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const MOBILE_TABS = [
  { id: "dashboard", label: "Wealth", icon: <PieChart className="w-5 h-5" /> },
  { id: "paper", label: "Signals", icon: <Zap className="w-5 h-5" /> },
  { id: "journal", label: "Journal", icon: <BookOpen className="w-5 h-5" /> },
  { id: "foreign", label: "US Tech", icon: <Globe2 className="w-5 h-5" /> },
];

export function MobileBottomBar() {
  const { activeView, setActiveView, setRosettaOpen } = useTradingStore();

  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-40">
      <nav className="ios-floating-tab-bar rounded-2xl p-1.5 flex items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all",
                isActive
                  ? "text-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/25 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
            </motion.button>
          );
        })}

        {/* Quick Rosetta Guide Pill */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setRosettaOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1.5 text-amber-400/80 hover:text-amber-300 transition"
          title="60s Guide"
        >
          <BookMarked className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Guide</span>
        </motion.button>
      </nav>
    </div>
  );
}
