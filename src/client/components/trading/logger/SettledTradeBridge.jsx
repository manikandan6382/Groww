import React from "react";
import clsx from "clsx";
import { DownloadCloud } from "lucide-react";

export function SettledTradeBridge({ recentSettledTrades, onImport }) {
  if (!recentSettledTrades || recentSettledTrades.length === 0) return null;

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] via-white/[0.02] to-transparent border border-emerald-500/20 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
          <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>Import Recent Settled Paper Trade (1-Click Journal Bridge):</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Pulls real entry, exit, stop-loss, and lot sizes</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-nowrap scrollbar-none">
        {recentSettledTrades.map((t) => {
          const isProfit = Number(t.netPnl || 0) >= 0;
          const formattedPnl = `${isProfit ? "+" : ""}₹${Number(t.netPnl || 0).toFixed(0)}`;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onImport(t)}
              title={`Import ${t.symbol} (Entry: ₹${t.entryPrice}, Exit: ₹${t.exitPrice || t.lastMarkPrice})`}
              className={clsx(
                "px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 group",
                isProfit
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
              )}
            >
              <span className="text-white group-hover:text-cyan-300 transition-colors">{t.symbol}</span>
              <span className="text-slate-500">|</span>
              <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{formattedPnl}</span>
              <span className="text-[10px] font-normal text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                {t.strategyTag || t.setupTag || "Practice"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
