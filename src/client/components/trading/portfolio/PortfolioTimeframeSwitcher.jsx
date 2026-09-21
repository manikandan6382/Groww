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
                "w-full h-9 flex items-center justify-center gap-1 text-xs font-mono font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.97]",
                isSelected
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.28)] font-black"
                  : "text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/[0.04]"
              )}
            >
              <span>{tf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
