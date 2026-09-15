import React from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export function LifecycleTelemetryHud({
  scrubTelemetry,
  netZeroPrice,
  entryPrice,
  targetPrice,
  stopLoss
}) {
  return (
    <AnimatePresence mode="wait">
      {scrubTelemetry ? (
        <motion.div
          key="docked-telemetry"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.1 }}
          className="flex items-center gap-2 mt-1 text-[11px] font-mono flex-wrap"
        >
          <span className="text-white font-black bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
            ₹{scrubTelemetry.currentP.toFixed(2)}
          </span>
          <span className={clsx("font-bold", scrubTelemetry.isNetGain ? "text-emerald-400" : "text-rose-400")}>
            {scrubTelemetry.ptsDelta >= 0 ? "+" : ""}₹{scrubTelemetry.rupeesDelta.toFixed(2)} ({scrubTelemetry.ptsDelta >= 0 ? "+" : ""}{scrubTelemetry.ptsDelta} pts)
          </span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-slate-400 hidden sm:inline">
            Net Zero Drag: <strong className="text-amber-300">₹{netZeroPrice.toFixed(2)}</strong>
          </span>
          {scrubTelemetry.distToTarget !== null && (
            <>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-slate-400 hidden sm:inline">
                TP Buffer: <strong className="text-emerald-300">₹{scrubTelemetry.distToTarget}</strong>
              </span>
            </>
          )}
          <span className="text-slate-400">@{scrubTelemetry.timeStr} IST</span>
        </motion.div>
      ) : (
        <motion.p
          key="default-telemetry"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="text-[11px] text-slate-400 font-mono mt-0.5 truncate"
        >
          {stopLoss ? `SL: ₹${stopLoss.toFixed(2)} ➔ ` : ""}EP: ₹{entryPrice.toFixed(2)} ➔ True BE: ₹{netZeroPrice.toFixed(2)}{targetPrice ? ` ➔ TP: ₹${targetPrice.toFixed(2)}` : ""}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
