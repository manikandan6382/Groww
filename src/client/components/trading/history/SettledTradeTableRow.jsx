import React from "react";
import clsx from "clsx";
import { Activity, ChevronRight, Trash2, Clock } from "lucide-react";
import { formatLocalDateTime, calculateTradeDuration } from "../../../utils/dateUtils";
import { getTradeOutcome } from "../../../utils/tradeNormalizer";
import { soundEngine } from "../../../utils/soundEngine";

export function SettledTradeTableRow({
  trade,
  isSelected,
  onToggleSelect,
  onOpenTimeline,
  onDeleteTrade,
  isHighlighted = false,
  isTimelineActive = false
}) {
  const outcome = getTradeOutcome(trade);
  const isGain = outcome.isNetGain;
  const sym = String(trade.symbol || "");
  const isCE = trade.optionType === "CALL" || sym.includes("CE");
  const formattedEntryTime = formatLocalDateTime(trade.entryDatetime);
  const formattedExitTime = formatLocalDateTime(trade.exitDatetime || trade.entryDatetime);
  const duration = calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration);

  return (
    <tr
      id={`trade-row-${trade.id}`}
      className={clsx(
        "hover:bg-white/[0.04] transition-all duration-300 group/row relative border-l-2",
        isCE ? "border-l-cyan-400" : "border-l-rose-500",
        isHighlighted ? "bg-cyan-500/20 ring-1 ring-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "",
        isTimelineActive ? "bg-white/[0.06]" : ""
      )}
    >
      {/* 1. Pinned Sticky Left Column (Contract / Strike) */}
      <td
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
            <span className="font-bold text-white text-xs tracking-tight group-hover/row:text-cyan-300 transition-colors font-mono">
              {trade.symbol}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {trade.lots || Math.round((trade.quantity || 1) / (trade.lotSize || 1))} Lots ({trade.lotSize || 1} Lot Size)
            </span>
          </div>
        </div>
      </td>

      {/* 2. Entry Time */}
      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
        <span>{formattedEntryTime}</span>
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

      {/* 9. Realized P&L */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[175px]">
        <strong className={clsx("text-sm font-black block tracking-tight font-mono", isGain ? "text-emerald-400" : "text-rose-400")}>
          {isGain ? "+" : ""}₹{Number(trade.netPnl || 0).toFixed(2)}
        </strong>
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1.5 mt-0.5">
          <span>Real: {outcome.grossPnl >= 0 ? "+" : ""}₹{outcome.grossPnl.toFixed(2)}</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300/80">Charges: ₹{Number(trade.charges ?? outcome.charges ?? 55.20).toFixed(2)}</span>
        </div>
      </td>

      {/* 10. Actions (Timeline & Delete) */}
      <td className="py-3.5 px-3 text-center whitespace-nowrap min-w-[180px]">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              onOpenTimeline?.(trade);
            }}
            className={clsx(
              "px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 border active:scale-95",
              isTimelineActive
                ? "bg-white text-zinc-950 font-extrabold border-white shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                : "bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border-white/10 hover:border-white/25 shadow-sm"
            )}
            title="Inspect price journey timeline"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Timeline</span>
            <ChevronRight className="w-3 h-3 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playDeleteTone();
              onDeleteTrade?.(trade);
            }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 hover:border-rose-500/40 active:scale-95 shadow-sm flex-shrink-0"
            title="Delete trade from history (with Undo)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
