import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export function IndexDropdownPopover({
  isOpen,
  dynamicAssets,
  underlying,
  onSelectAsset,
  onClose
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute top-full left-0 right-0 mt-2 z-[999] rounded-2xl bg-[#080e1e] border border-cyan-500/40 shadow-2xl p-2 space-y-1.5 min-w-[260px]"
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-mono font-bold uppercase text-slate-400">
            <span>SELECT UNDERLYING</span>
            <span className="text-cyan-400 text-[9px]">LIVE SPOT</span>
          </div>
          <div className="space-y-1">
            {dynamicAssets.map((asset) => (
              <button
                key={asset.key}
                type="button"
                onClick={() => {
                  onSelectAsset(asset);
                  onClose();
                }}
                className={clsx(
                  "w-full px-3 py-2.5 rounded-xl text-left font-mono transition flex items-center justify-between cursor-pointer",
                  underlying === asset.key
                    ? "bg-[#0c1f38] text-cyan-200 border border-cyan-400/50"
                    : "bg-[#0e162b] hover:bg-[#15223e] text-slate-200 border border-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-white">{asset.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                    {asset.lot}/lot
                  </span>
                </div>
                <span className="text-xs font-bold text-white">₹{Number(asset.spot).toFixed(1)}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
