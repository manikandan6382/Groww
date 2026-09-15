import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { TIMEFRAMES } from "./portfolioNavEngine";

export function PortfolioTimeframeSwitcher({ activeTf, onSelectTimeframe }) {
  return (
    <div className="relative w-full">
      <div className="grid grid-cols-6 gap-1 p-1 rounded-2xl bg-[#050608]/90 border border-white/[0.06] backdrop-blur-2xl shadow-inner w-full">
        {TIMEFRAMES.map((tf) => {
          const isSelected = activeTf === tf.id;
          return (
            <button
              key={tf.id}
              type="button"
              onClick={() => onSelectTimeframe(tf.id)}
              className={clsx(
                "relative w-full min-h-[36px] flex items-center justify-center gap-1 text-xs font-sans font-bold tracking-wide rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.97] z-10",
                isSelected
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeWealthTfPill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                />
              )}
              <span>{tf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
