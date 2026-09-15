import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import clsx from "clsx";

export function SessionDeepAuditDrawer({ selectedDay }) {
  if (!selectedDay) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="p-5 rounded-3xl bg-[#0d0f14]/95 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-4 w-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono shadow-sm">
            📅 {selectedDay.fullDay || selectedDay.day} ({selectedDay.date})
          </span>
          <span className="text-xs text-slate-300 font-mono">
            {selectedDay.trades} {selectedDay.trades === 1 ? "Setup Executed" : "Setups Executed"}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
            +₹{selectedDay.winPnl} Won
          </span>
          <span className="text-rose-400 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
            {selectedDay.lossPnl === 0 ? "₹0" : `-₹${Math.abs(selectedDay.lossPnl)}`} Loss
          </span>
          <span
            className={clsx(
              "px-3 py-1 rounded-xl font-black text-xs shadow-sm",
              selectedDay.pnl >= 0
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            )}
          >
            Net {selectedDay.pnl >= 0 ? "+" : ""}₹{selectedDay.pnl}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Session Execution Audit
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(selectedDay.tradesList || []).map((t, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition flex items-center justify-between text-xs font-mono group"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={clsx(
                    "w-2.5 h-2.5 rounded-full shadow-[0_0_8px]",
                    t.status === "TARGET_HIT" ? "bg-emerald-400 shadow-emerald-400/80" : "bg-rose-400 shadow-rose-400/80"
                  )}
                />
                <div>
                  <strong className="text-white font-bold block group-hover:text-cyan-300 transition-colors">
                    {t.symbol}
                  </strong>
                  <span className="text-[10px] text-slate-400">{t.tag} · {t.qty}</span>
                </div>
              </div>

              <div className="text-right">
                <span className={clsx("font-black block text-sm", t.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {t.pnl >= 0 ? "+" : ""}₹{t.pnl}
                </span>
                <span className="text-[9px] text-slate-500 uppercase">{t.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          1% Risk Rule Honored
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          2-Loss Tilt Breaker Unbreached
        </span>
        <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          Max 3 Trades Kept
        </span>
      </div>
    </motion.div>
  );
}
