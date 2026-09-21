import React from "react";
import clsx from "clsx";
import { 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle,
  Check, 
  Copy, 
  Trash2,
  LineChart,
  Share2
} from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";
import { formatLocalDateTime, calculateTradeDuration } from "../../../utils/dateUtils";
import { resolveMarketSession } from "../history/historyCalculations";
import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";

export function TradeStoryCardHeader({
  trade,
  isGain,
  audit,
  isCE,
  pnlPercent,
  copiedTradeId,
  copyTradeMarkdown,
  handleDeleteWithUndo,
  inspectInEquityCurve,
  isSelected,
  onShareTrade
}) {
  const stratName = Array.isArray(trade.strategyTags) 
    ? (trade.strategyTags[0] || trade.strategyTag || "Intraday Momentum") 
    : (trade.strategyTags || trade.strategyTag || "Intraday Momentum");

  const session = resolveMarketSession(trade.entryDatetime || trade.datetime);
  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const totalQuantity = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="flex items-center gap-3.5">
        <span className={clsx(
          "px-3 py-1.5 rounded-xl text-xs font-black uppercase font-mono border tracking-wider shadow-sm",
          isCE ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
        )}>
          {isCE ? "CALL (CE)" : "PUT (PE)"}
        </span>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="text-sm sm:text-base font-mono font-bold text-white tracking-tight">
              {trade.symbol}
            </strong>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-sans shadow-sm">
              {stratName}
            </span>
            <span className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border font-sans shadow-sm",
              session.isChopRisk 
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30" 
                : "bg-white/[0.04] text-slate-300 border-white/10"
            )}>
              {session.label}
            </span>
            {audit.isInvariantBreached && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-sans shadow-sm animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Breached &gt;₹300</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
            <span>📅 {formatLocalDateTime(trade.entryDatetime)}</span>
            <span>•</span>
            <span>{trade.quantity || 1} Lot ({totalQuantity} Qty)</span>
            <span>•</span>
            <span className="text-cyan-300 flex items-center gap-1 font-sans font-medium">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Header: Setup Integrity Score + Net Outcome Pill with Profit/Loss % */}
      <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
        {/* 🛡️ Objective Setup Integrity Score */}
        <span className={clsx(
          "text-[10px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-sans shadow-sm",
          audit.isHighQualitySetup 
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" 
            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
        )} title={`Integrity: ${audit.score}% (${audit.grade})`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Setup Integrity: {audit.score}% ({audit.grade})</span>
        </span>

        {/* Outcome P&L Pill with % Return */}
        <div className={clsx(
          "px-3.5 py-1.5 rounded-xl font-mono font-black text-xs md:text-sm border flex items-center gap-2 shadow-sm",
          isGain 
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10" 
            : "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-rose-500/10"
        )}>
          {isGain ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <RollingTicker 
            value={Number(trade.netPnl || 0)} 
            prefix="₹" 
            showSign={true} 
            decimalPlaces={2} 
            className={isGain ? "text-emerald-300" : "text-rose-300"}
          />
          <span className={clsx(
            "text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-md",
            isGain ? "bg-emerald-500/25 text-emerald-200" : "bg-rose-500/25 text-rose-200"
          )}>
            {isGain ? "+" : ""}{pnlPercent.toFixed(2)}%
          </span>
        </div>

        {/* Bi-directional inspect on Equity Curve */}
        {inspectInEquityCurve && (
          <button
            type="button"
            onClick={() => inspectInEquityCurve(trade.id)}
            className={clsx(
              "p-2 rounded-xl transition-all",
              isSelected 
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" 
                : "text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            )}
            title="Inspect position on Equity Curve (Section 3)"
          >
            <LineChart className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 1-Click Shareable Apple Luxury Autopsy Card */}
        {onShareTrade && (
          <button
            type="button"
            onClick={() => onShareTrade(trade)}
            className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-all cursor-pointer"
            title="Generate Shareable Apple Luxury Autopsy Card (PNG / Clipboard)"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 1-Click Copy Forensic Markdown Card Button */}
        <button
          type="button"
          onClick={() => copyTradeMarkdown(trade)}
          className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-all cursor-pointer"
          title="Copy Forensic Markdown Autopsy to Clipboard"
        >
          {copiedTradeId === trade.id ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Delete Action with 5s Undo Toast */}
        <button
          type="button"
          onClick={() => handleDeleteWithUndo(trade)}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          title="Delete trade entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
