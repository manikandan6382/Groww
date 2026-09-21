import React from "react";
import clsx from "clsx";
import { Activity, Trash2, Clock, ChevronDown, Bookmark, Check } from "lucide-react";
import { formatLocalDateTime, calculateTradeDuration } from "../../../utils/dateUtils";
import { getTradeOutcome } from "../../../utils/tradeNormalizer";
import { soundEngine } from "../../../utils/soundEngine";
import { calculateTradeRMultiple, calculateStatutoryCharges, resolveMarketSession } from "./historyCalculations";

export function SettledTradeTableRow({
  trade,
  isSelected,
  onToggleSelect,
  onOpenTimeline,
  onDeleteTrade,
  isHighlighted = false,
  isTimelineActive = false,
  isExpanded = false,
  onToggleExpand,
  isJournaled = false,
  onPromoteToJournal
}) {
  const outcome = getTradeOutcome(trade);
  const isGain = outcome.isNetGain;
  const sym = String(trade.symbol || "");
  const isCE = trade.optionType === "CALL" || sym.includes("CE");
  const formattedEntryTime = formatLocalDateTime(trade.entryDatetime);
  const formattedExitTime = formatLocalDateTime(trade.exitDatetime || trade.entryDatetime);
  const duration = calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration);
  const { rMultiple, rMultipleStr, isRuleBreached, plannedRiskRupees } = calculateTradeRMultiple(trade);
  const charges = calculateStatutoryCharges(trade);
  const session = resolveMarketSession(trade.entryDatetime);

  return (
    <tr
      id={`trade-row-${trade.id}`}
      onClick={() => {
        soundEngine.playTabSwitchTone();
        onToggleExpand?.(trade.id);
      }}
      className={clsx(
        "hover:bg-white/[0.04] transition-all duration-300 group/row relative border-l-2 cursor-pointer",
        isCE ? "border-l-cyan-400" : "border-l-rose-500",
        isExpanded ? "bg-white/[0.05]" : "",
        isHighlighted ? "bg-cyan-500/20 ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "",
        isTimelineActive ? "bg-white/[0.06]" : ""
      )}
    >
      {/* 1. Pinned Sticky Left Column (Contract / Strike) */}
      <td
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "py-3.5 px-4 sticky left-0 z-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-colors whitespace-nowrap min-w-[240px]",
          isHighlighted ? "bg-[#0a1e36]" : "bg-[#070e1b] group-hover/row:bg-[#0c1930]"
        )}
      >
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(trade.id);
            }}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400/50 cursor-pointer accent-cyan-500 shrink-0"
          />
          <span
            className={clsx(
              "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm shrink-0",
              isCE
                ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : "bg-rose-500/20 text-rose-100 border-rose-400/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
            )}
          >
            {isCE ? "CALL" : "PUT"}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs tracking-tight group-hover/row:text-cyan-300 transition-colors font-mono">
                {trade.symbol}
              </span>
              {isJournaled && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold" title="Trade promoted to Journal">
                  JOURNAL
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {trade.lots || Math.round((trade.quantity || 1) / (trade.lotSize || 1))} Lots ({trade.lotSize || 1} Lot Size)
            </span>
          </div>
        </div>
      </td>

      {/* 2. Entry Time with Institutional Market Session Badge */}
      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
        <span className="block text-slate-300">{formattedEntryTime}</span>
        <span 
          className={clsx(
            "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 shadow-sm",
            session.badgeClass
          )}
          title={`Market Regime: ${session.label} (IST)`}
        >
          <span>{session.icon}</span>
          <span>{session.shortLabel}</span>
        </span>
      </td>

      {/* 3. Exit Time / Duration */}
      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
        <span className="text-cyan-300 font-bold text-[11px] block">{formattedExitTime}</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5">
          <Clock className="w-2.5 h-2.5 text-cyan-400" />
          <span>{duration}</span>
        </span>
      </td>

      {/* 4. Entry Price (₹) */}
      <td className="py-3.5 px-3 text-right text-slate-300 font-mono">
        ₹{Number(trade.entryPrice || 0).toFixed(2)}
      </td>

      {/* 5. Exit Price (₹) */}
      <td className="py-3.5 px-3 text-right text-white font-bold font-mono">
        ₹{Number(trade.exitPrice || 0).toFixed(2)}
      </td>

      {/* 6. Target Price (₹) */}
      <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold font-mono">
        ₹{Number(trade.targetPrice || 0).toFixed(2)}
      </td>

      {/* 7. Stop Loss Price (₹) */}
      <td className="py-3.5 px-3 text-right text-rose-400 font-semibold font-mono">
        ₹{Number(trade.stopLoss || 0).toFixed(2)}
      </td>

      {/* 8. Close Reason Badge */}
      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[150px]">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shadow-sm inline-block",
            outcome.isNetGain
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : outcome.isBreakeven
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          {trade.closeReason?.replace(/_/g, " ") || outcome.label || "SETTLED"}
        </span>
      </td>

      {/* 8B. Realized R-Multiple & Invariant Gating */}
      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[130px]">
        <span
          className={clsx(
            "px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border shadow-sm inline-block",
            isGain
              ? (rMultiple >= 2.0 ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30")
              : isRuleBreached
              ? "bg-rose-500/25 text-rose-200 border-rose-400/50 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.25)]"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          {rMultipleStr}
        </span>
        <div className="text-[9px] font-mono mt-0.5">
          {isRuleBreached ? (
            <span className="text-rose-400 font-bold">⚠️ EXCEEDS ₹300</span>
          ) : rMultiple >= 2.0 ? (
            <span className="text-emerald-400 font-bold">🎯 1:2 TARGET</span>
          ) : outcome.isBreakeven ? (
            <span className="text-amber-400">🛡️ BE PROTECTED</span>
          ) : (
            <span className="text-slate-500">Risk: ₹{plannedRiskRupees}</span>
          )}
        </div>
      </td>

      {/* 9. Realized P&L */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[175px]">
        <strong className={clsx("text-sm font-black block tracking-tight font-mono", isGain ? "text-emerald-400" : "text-rose-400")}>
          {isGain ? "+" : ""}₹{Number(trade.netPnl || 0).toFixed(2)}
        </strong>
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
          <span>Real: {outcome.grossPnl >= 0 ? "+" : ""}₹{outcome.grossPnl.toFixed(2)}</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300/80">Charges: ₹{charges.toFixed(2)}</span>
        </div>
      </td>

      {/* 10. Sleek Actions (Expand Drawer, Journal, Timeline, Delete) */}
      <td
        onClick={(e) => e.stopPropagation()}
        className="py-3.5 px-3 text-center whitespace-nowrap min-w-[180px]"
      >
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              onToggleExpand?.(trade.id);
            }}
            className={clsx(
              "px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer inline-flex items-center gap-1 border active:scale-95 shadow-sm",
              isExpanded
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                : "bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border-white/10"
            )}
            title={isExpanded ? "Collapse Forensic Tray" : "Expand In-Row Forensic Audit Tray"}
          >
            <span>Audit</span>
            <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180 text-cyan-400")} />
          </button>

          {onPromoteToJournal && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                onPromoteToJournal(trade);
              }}
              className={clsx(
                "p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border active:scale-95 shadow-sm",
                isJournaled
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-cyan-300 border-white/10"
              )}
              title={isJournaled ? "Trade already saved in Journal" : "1-Click save to Journal"}
            >
              {isJournaled ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              onOpenTimeline?.(trade);
            }}
            className={clsx(
              "p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border active:scale-95 shadow-sm",
              isTimelineActive
                ? "bg-white text-zinc-950 font-extrabold border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                : "bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border-white/10"
            )}
            title="Inspect price journey timeline modal"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playDeleteTone();
              onDeleteTrade?.(trade);
            }}
            className="p-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 hover:border-rose-500/40 active:scale-95 shadow-sm flex-shrink-0"
            title="Delete trade (with Undo)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </button>
        </div>
      </td>
    </tr>
  );
}
