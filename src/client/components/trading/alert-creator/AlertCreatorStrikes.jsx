import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

const QUICK_STRIKES = [
  "NIFTY 24500 CE",
  "NIFTY 24500 PE",
  "NIFTY 24600 CE",
  "BANKNIFTY 52000 CE",
  "BANKNIFTY 52000 PE",
];

export function AlertCreatorStrikes({ symbol, setSymbol, setOptionType }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        Quick Strike
      </label>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_STRIKES.map((strike) => (
          <motion.button
            whileTap={{ scale: 0.94 }}
            key={strike}
            type="button"
            onClick={() => {
              setSymbol(strike);
              setOptionType(strike.includes("PE") ? "PE" : "CE");
            }}
            className={clsx(
              "px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer",
              symbol === strike
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
            )}
          >
            {strike}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
