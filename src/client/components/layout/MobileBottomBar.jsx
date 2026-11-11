import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { PieChart, Zap, BookOpen, Globe2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { soundEngine } from "../../utils/soundEngine";

const MOBILE_NAV_TABS = [
  { id: "dashboard", label: "Wealth", icon: PieChart },
  { id: "paper", label: "Signals", icon: Zap, live: true },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "foreign", label: "US Tech", icon: Globe2 },
];

export function MobileBottomBar() {
  const { activeView, setActiveView, setCustomTradeModalOpen } = useTradingStore();

  return (
    <div 
      className="md:hidden fixed z-40 left-3 right-3 select-none"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <nav className="ios-floating-tab-bar p-1.5 flex items-center justify-around relative">
        {/* Tab 1: Wealth */}
        {(() => {
          const tab = MOBILE_NAV_TABS[0];
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setActiveView(tab.id);
              }}
              className={clsx(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all cursor-pointer",
                isActive ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10 text-[9.5px] mt-0.5 tracking-tight font-medium font-mono">
                {tab.label}
              </span>
            </motion.button>
          );
        })()}

        {/* Tab 2: Signals (Live) */}
        {(() => {
          const tab = MOBILE_NAV_TABS[1];
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setActiveView(tab.id);
              }}
              className={clsx(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all cursor-pointer",
                isActive ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <div className="relative">
                <Icon className="w-5 h-5 relative z-10" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping z-10" />
              </div>
              <span className="relative z-10 text-[9.5px] mt-0.5 tracking-tight font-medium font-mono">
                {tab.label}
              </span>
            </motion.button>
          );
        })()}

        {/* ⚡ Center Native Action Button: Quick Scalp & Trade Logger (Apple Pro FAB) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => {
            soundEngine.playOrderFillTone();
            setCustomTradeModalOpen(true);
          }}
          className="relative -mt-5 mx-1 w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-[0_8px_25px_rgba(6,182,212,0.55),inset_0_1px_0_rgba(255,255,255,0.4)] cursor-pointer group shrink-0"
          title="Instant 12-Column Rapid Trade Logger (+)"
        >
          <div className="w-full h-full rounded-full bg-[#080b14] flex items-center justify-center group-hover:bg-transparent transition-colors">
            <Plus className="w-6 h-6 text-cyan-300 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        {/* Tab 3: Journal */}
        {(() => {
          const tab = MOBILE_NAV_TABS[2];
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setActiveView(tab.id);
              }}
              className={clsx(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all cursor-pointer",
                isActive ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10 text-[9.5px] mt-0.5 tracking-tight font-medium font-mono">
                {tab.label}
              </span>
            </motion.button>
          );
        })()}

        {/* Tab 4: US Tech */}
        {(() => {
          const tab = MOBILE_NAV_TABS[3];
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.90 }}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setActiveView(tab.id);
              }}
              className={clsx(
                "relative flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all cursor-pointer",
                isActive ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute inset-0 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10 text-[9.5px] mt-0.5 tracking-tight font-medium font-mono">
                {tab.label}
              </span>
            </motion.button>
          );
        })()}
      </nav>
    </div>
  );
}
