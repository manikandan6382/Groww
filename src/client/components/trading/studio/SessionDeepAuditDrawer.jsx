import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, Zap } from "lucide-react";
import clsx from "clsx";
import { auditSessionDiscipline } from "./studioStatsCalculator";
import { calculateTradeRMultiple } from "../history/historyCalculations";

export function SessionDeepAuditDrawer({ selectedDay }) {
  if (!selectedDay) return null;

  const audit = auditSessionDiscipline(selectedDay);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="p-5 rounded-3xl bg-[#0d0f14]/95 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-4 w-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono shadow-sm">
            📅 {selectedDay.fullDay || selectedDay.day} ({selectedDay.date})
          </span>
          <span className="text-xs text-slate-300 font-mono">
            {selectedDay.trades} {selectedDay.trades === 1 ? "Setup Executed" : "Setups Executed"}
          </span>
          <span className={clsx(
            "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm",
            audit.overallDisciplineScore >= 90
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : audit.overallDisciplineScore >= 70
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          )}>
            RMS Discipline: {audit.overallDisciplineScore}%
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
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
          Session Execution Audit &amp; Normalized R-Multiples
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(selectedDay.tradesList || []).map((t, idx) => {
            const { rMultipleStr, isRuleBreached } = calculateTradeRMultiple(t);
            const pnlNum = Number(t.pnl ?? t.netPnl ?? 0);
            const isTargetHit = t.status === "TARGET_HIT" || pnlNum >= 400;

            return (
              <div
                key={idx}
                className={clsx(
                  "p-3 rounded-2xl bg-white/[0.02] border transition flex items-center justify-between text-xs font-mono group",
                  isRuleBreached ? "border-rose-500/50 bg-rose-950/10" : "border-white/5 hover:border-cyan-500/30"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={clsx(
                      "w-2.5 h-2.5 rounded-full shadow-[0_0_8px] shrink-0",
                      isTargetHit ? "bg-emerald-400 shadow-emerald-400/80" : "bg-rose-400 shadow-rose-400/80"
                    )}
                  />
                  <div className="min-w-0 truncate">
                    <strong className="text-white font-bold block group-hover:text-cyan-300 transition-colors truncate">
                      {t.symbol}
                    </strong>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{t.tag || "Scalp"}</span>
                      <span>•</span>
                      <span className={clsx(
                        "font-bold",
                        pnlNum > 0 ? "text-emerald-400" : isRuleBreached ? "text-rose-400" : "text-slate-400"
                      )}>
                        {rMultipleStr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={clsx("font-black block text-sm font-mono", pnlNum >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {pnlNum >= 0 ? "+" : ""}₹{pnlNum}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase block font-sans">
                    {isRuleBreached ? "⚠️ BREACH (>₹300)" : String(t.status || "CLOSED").replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic RMS Discipline Verification Strip */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2.5">
        {/* Check 1: Loss Cap */}
        <span className={clsx(
          "flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border",
          audit.isLossCapCompliant
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
            : "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
        )}>
          {audit.isLossCapCompliant ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span>
            {audit.isLossCapCompliant ? "₹300 Daily Loss Cap Respected" : `⚠️ Loss Cap Breached (-₹${Math.abs(selectedDay.pnl)})`}
          </span>
        </span>

        {/* Check 2: 3-Trade Quota */}
        <span className={clsx(
          "flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border",
          audit.isQuotaCompliant
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        )}>
          {audit.isQuotaCompliant ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span>
            {audit.isQuotaCompliant ? `${audit.tradesCount}/3 Trades Executed (Disciplined)` : `⚠️ Quota Overrun: ${audit.tradesCount} Trades (>3)`}
          </span>
        </span>

        {/* Check 3: Single Trade Risk Anchor */}
        <span className={clsx(
          "flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border",
          audit.isRiskInvariantCompliant
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
        )}>
          {audit.isRiskInvariantCompliant ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>
            {audit.isRiskInvariantCompliant ? "₹200–₹300 Trade Risk Honored" : `⚠️ Single Trade Lost ₹${audit.maxTradeLoss}`}
          </span>
        </span>

        {/* Check 4: Statutory Friction */}
        <span className="flex items-center gap-1.5 text-cyan-300 font-medium px-2.5 py-1 rounded-lg border bg-cyan-500/10 border-cyan-500/25 font-mono text-[10px]">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>~₹{audit.frictionPaid} Friction Absorbed</span>
        </span>
      </div>
    </motion.div>
  );
}
