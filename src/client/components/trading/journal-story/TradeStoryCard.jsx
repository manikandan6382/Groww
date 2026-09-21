import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { evaluateTradeIntegrity } from "./tradeIntegrityEngine";
import { TradeStoryCardHeader } from "./TradeStoryCardHeader";
import { TradeStoryCardActs } from "./TradeStoryCardActs";
import { TradeStoryCardDeepDrawer } from "./TradeStoryCardDeepDrawer";

export function TradeStoryCard({
  trade,
  isExpanded,
  isSelected,
  toggleExpand,
  copiedTradeId,
  copyTradeMarkdown,
  handleDeleteWithUndo,
  inspectInEquityCurve,
  onShareTrade
}) {
  const isGain = (trade.netPnl ?? 0) >= 0;
  const sym = String(trade.symbol || "");
  const isCE = trade.optionType === "CALL" || sym.includes("CE");
  const entry = Number(trade.entryPrice || 0);
  const pts = Number(trade.exitPrice || 0) - entry;
  const pnlPercent = entry > 0 && Number.isFinite(pts) ? (pts / entry) * 100 : 0;
  const audit = evaluateTradeIntegrity(trade);

  return (
    <motion.div
      id={`trade-story-card-${trade.id}`}
      data-trade-id={trade.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "p-5 sm:p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-2xl space-y-4",
        "bg-[#0f1422]/70 hover:bg-[#141b2d]/85 shadow-[0_12px_35px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]",
        isGain 
          ? "border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5" 
          : "border-rose-500/20 hover:border-rose-500/40 shadow-rose-500/5",
        audit.isInvariantBreached && "border-rose-500/50 ring-1 ring-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
        isExpanded && "border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.12)]",
        isSelected && "ring-2 ring-cyan-400/80 border-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.25)] bg-[#131b2e]/90"
      )}
    >
      {/* Subtle top corner ambient glow */}
      <div 
        className={clsx(
          "absolute -top-16 -right-16 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-opacity duration-300",
          isGain ? "bg-emerald-500/10" : "bg-rose-500/10",
          isSelected && "bg-cyan-500/20"
        )} 
      />

      <TradeStoryCardHeader
        trade={trade}
        isGain={isGain}
        audit={audit}
        isCE={isCE}
        pnlPercent={pnlPercent}
        copiedTradeId={copiedTradeId}
        copyTradeMarkdown={copyTradeMarkdown}
        handleDeleteWithUndo={handleDeleteWithUndo}
        inspectInEquityCurve={inspectInEquityCurve}
        isSelected={isSelected}
        onShareTrade={onShareTrade}
      />

      <TradeStoryCardActs
        trade={trade}
        isGain={isGain}
        audit={audit}
        pts={pts}
        pnlPercent={pnlPercent}
        isExpanded={isExpanded}
        toggleExpand={toggleExpand}
      />

      <TradeStoryCardDeepDrawer
        isExpanded={isExpanded}
        trade={trade}
        isGain={isGain}
        audit={audit}
      />
    </motion.div>
  );
}
