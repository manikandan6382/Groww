import React from "react";
import { Activity } from "lucide-react";
import clsx from "clsx";

export const PayoffMultiTradeDock = React.memo(function PayoffMultiTradeDock({
  openAlerts = [],
  simulatorActiveTradeId,
  onSelectTrade,
  ticks = {},
}) {
  return (
    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 pl-1">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Source:
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-200">
            {openAlerts.length} Active
          </span>
        </span>

        {/* Pill 1: OrderPad Draft */}
        <button
          type="button"
          onClick={() => onSelectTrade(null)}
          className={clsx(
            "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
            !simulatorActiveTradeId
              ? "bg-white/[0.08] text-white border border-white/20 shadow-sm"
              : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06]"
          )}
        >
          <span>📝 OrderPad Draft</span>
          {!simulatorActiveTradeId && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* Open Practice Trades Pills */}
        {openAlerts.map((trade) => {
          const isSelected = simulatorActiveTradeId === trade.id;
          const sym = trade.symbol || trade.tradingsymbol || "Trade";
          const tEntry = Number(trade.entryPrice || 100);
          const tLot = Number(trade.lotSize || 65);
          const tQty = Number(trade.quantity || 1) * tLot;
          const tLtp = Number(ticks?.[trade.id]?.ltp || trade.lastMarkPrice || tEntry);
          const tPnl = Math.round((tLtp - tEntry) * tQty);
          const isGain = tPnl >= 0;

          return (
            <button
              key={trade.id}
              type="button"
              onClick={() => onSelectTrade(trade.id)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shrink-0 cursor-pointer",
                isSelected
                  ? "bg-gradient-to-r from-emerald-500/15 via-zinc-800 to-emerald-500/15 text-white border border-white/20 shadow-sm"
                  : "bg-white/[0.03] text-slate-300 hover:text-white border border-white/[0.06] hover:bg-white/[0.06]"
              )}
            >
              <span className={clsx("w-1.5 h-1.5 rounded-full", isGain ? "bg-emerald-400" : "bg-rose-500")} />
              <span>{sym}</span>
              <span className={clsx("text-[10px] px-1.5 py-0.2 rounded font-mono font-bold", isGain ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                {isGain ? "+" : ""}₹{tPnl.toLocaleString("en-IN")}
              </span>
              {isSelected && (
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 font-sans font-bold">Active</span>
              )}
            </button>
          );
        })}
      </div>

      {openAlerts.length === 0 && (
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline shrink-0 pr-1">
          0 active practice trades open
        </span>
      )}
    </div>
  );
});
