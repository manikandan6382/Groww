import React from "react";
import { motion } from "framer-motion";

export const GraduationMilestoneBanner = React.memo(function GraduationMilestoneBanner({
  isCertified,
  isPureWins,
  gateProfitFactor,
  gateDisciplinePct,
}) {
  if (!isCertified) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-between gap-3 text-xs flex-wrap"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
          🎓
        </div>
        <div>
          <strong className="text-amber-300 font-extrabold text-sm block">
            MICRO-LOT LIVE CAPITAL CERTIFIED!
          </strong>
          <p className="text-[11px] text-amber-200/80 font-sans">
            You have completed 30 statistical practice executions with a profitable edge ({isPureWins ? "100% Win Rate" : `${gateProfitFactor}x PF`}) and {gateDisciplinePct}% discipline. You are cleared for real-money Micro-Lot (1 Lot) deployment.
          </p>
        </div>
      </div>
      <div className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow-md">
        Cleared for 1-Lot Live Desk
      </div>
    </motion.div>
  );
});
