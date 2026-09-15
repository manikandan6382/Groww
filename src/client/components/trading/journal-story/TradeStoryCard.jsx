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
  toggleExpand,
  copiedTradeId,
  copyTradeMarkdown,
  handleDeleteWithUndo
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
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "p-5 sm:p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-2xl space-y-4",
        isGain 
          ? "bg-[#0d0f14]/90 hover:bg-[#121424]/95 border-emerald-500/20 hover:border-emerald-500/40 shadow-xl shadow-emerald-500/5" 
          : "bg-[#0d0f14]/90 hover:bg-[#121424]/95 border-rose-500/20 hover:border-rose-500/40 shadow-xl shadow-rose-500/5",
        isExpanded && "ring-1 ring-cyan-400/50 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]"
      )}
    >
      <TradeStoryCardHeader
        trade={trade}
        isGain={isGain}
        audit={audit}
        isCE={isCE}
        pnlPercent={pnlPercent}
        copiedTradeId={copiedTradeId}
        copyTradeMarkdown={copyTradeMarkdown}
        handleDeleteWithUndo={handleDeleteWithUndo}
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
