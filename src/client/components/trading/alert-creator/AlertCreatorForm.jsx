import React from "react";
import { PlusCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useAlertCreatorState } from "./useAlertCreatorState";
import { AlertCreatorStrikes } from "./AlertCreatorStrikes";
import { AlertCreatorInputs } from "./AlertCreatorInputs";

export function AlertCreatorForm({ onCreated }) {
  const {
    symbol,
    setSymbol,
    optionType,
    setOptionType,
    entryPrice,
    setEntryPrice,
    targetPrice,
    setTargetPrice,
    stopLoss,
    setStopLoss,
    submitting,
    rrRatio,
    isHealthyRR,
    handleSubmit
  } = useAlertCreatorState(onCreated);

  return (
    <motion.form
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onSubmit={handleSubmit}
      className="apple-ceramic-card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fast Practice Setup</h3>
        </div>
        <span className={clsx(
          "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors",
          isHealthyRR 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        )}>
          R:R 1:{rrRatio}
        </span>
      </div>

      {/* Quick Select Strike Chips */}
      <AlertCreatorStrikes
        symbol={symbol}
        setSymbol={setSymbol}
        setOptionType={setOptionType}
      />

      {/* Inputs Grid */}
      <AlertCreatorInputs
        symbol={symbol}
        setSymbol={setSymbol}
        entryPrice={entryPrice}
        setEntryPrice={setEntryPrice}
        targetPrice={targetPrice}
        setTargetPrice={setTargetPrice}
        stopLoss={stopLoss}
        setStopLoss={setStopLoss}
      />

      {/* Submit Button with Framer Motion Spring */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 apple-btn-primary flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>{submitting ? "Arming Watch Alert..." : "Deploy Live Watch Alert"}</span>
      </motion.button>
    </motion.form>
  );
}

export default AlertCreatorForm;
