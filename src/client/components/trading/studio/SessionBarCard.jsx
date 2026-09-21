import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export const SessionBarCard = React.memo(
  React.forwardRef(function SessionBarCard(
    { barData, isSelected, onSelect },
    ref
  ) {
    const isGain = barData.pnl >= 0;
    const dayWinRate = barData.trades > 0 ? ((barData.wins / barData.trades) * 100).toFixed(0) : "0";
    const isLossCapBreached = barData.pnl < -300;
    const isQuotaBreached = (barData.trades || 0) > 3;
    const hasBreached = isLossCapBreached || isQuotaBreached;
    const isDisciplined = (barData.trades || 0) > 0 && !hasBreached;

    const points = (barData.sparkline || [0, barData.pnl]).map((val, pIdx, arr) => {
      const min = Math.min(...arr, 0);
      const max = Math.max(...arr, 1);
      const range = Math.max(1, max - min);
      const x = (pIdx / (arr.length - 1 || 1)) * 100;
      const y = 100 - ((val - min) / range) * 80 - 10;
      return `${x},${y}`;
    }).join(" ");

    return (
      <motion.div
        ref={ref}
        layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={onSelect}
      style={{
        boxShadow: isSelected ? undefined : "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
      className={clsx(
        "p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden select-none",
        isSelected
          ? "bg-cyan-950/40 border-cyan-400/80 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/50"
          : "bg-[#0d0f14]/70 hover:bg-[#121424] border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <strong className="text-xs font-bold text-white font-mono">{barData.day}</strong>
          <span className="text-[10px] text-slate-400 font-mono truncate">{barData.date}</span>
        </div>
        {hasBreached ? (
          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex-shrink-0">
            ⚠️ Breached
          </span>
        ) : isDisciplined ? (
          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
            🛡️ Disciplined
          </span>
        ) : (
          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30 flex-shrink-0">
            💤 Flat
          </span>
        )}
      </div>

      <div className="space-y-1">
        <span className={clsx("font-mono text-sm font-black block tabular-nums", isGain ? "text-emerald-400" : "text-rose-400")}>
          {isGain ? "+" : "-"}₹{Math.abs(barData.pnl).toFixed(2)}
        </span>

        <div className="h-6 w-full opacity-80">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke={isGain ? "#10b981" : "#f43f5e"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-1 pt-1.5 border-t border-white/5">
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
          <div className="bg-emerald-400 h-full" style={{ width: `${dayWinRate}%` }} title={`${barData.wins} Wins`} />
          <div className="bg-rose-500 h-full" style={{ width: `${100 - Number(dayWinRate)}%` }} title={`${barData.losses} Losses`} />
        </div>
        <span className="text-[9px] font-mono text-slate-400 block text-center truncate">
          {barData.wins}W · {barData.losses}L ({dayWinRate}%)
        </span>
      </div>
    </motion.div>
  );
}));
