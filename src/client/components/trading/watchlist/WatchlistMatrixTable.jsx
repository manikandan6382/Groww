import React from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { Zap, Trash2, Search } from "lucide-react";
import clsx from "clsx";
import { getLiquidityRadarData } from "./watchlistRadarUtils";

export const WatchlistMatrixTable = React.memo(function WatchlistMatrixTable({
  filteredSymbols,
  onOpenDepth,
  onOpenTrade,
  onRemove,
  onResetFilters,
}) {
  if (filteredSymbols.length === 0) {
    return (
      <div className="py-14 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-white">No watchlist symbols match your current filters</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="px-4 py-1.5 rounded-xl bg-white/[0.14] hover:bg-white/[0.22] border border-white/20 text-xs font-mono font-bold text-white transition active:scale-95 cursor-pointer shadow-sm"
        >
          Reset Watchlist Filters
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#0d0f14]/85 backdrop-blur-2xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-white/[0.02]">
            <th className="p-3.5">Asset / Symbol</th>
            <th className="p-3.5">LTP &amp; Change</th>
            <th className="p-3.5">Intraday Range (L - H)</th>
            <th className="p-3.5">Volume &amp; Turnover</th>
            <th className="p-3.5">VWAP &amp; Spread</th>
            <th className="p-3.5">Liquidity Tier</th>
            <th className="p-3.5 text-right">Execution Desk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {filteredSymbols.map((symbol) => {
            const meta = getStockMeta(symbol);
            const radar = getLiquidityRadarData(symbol, meta);
            const isGain = (meta?.change || 0) >= 0;
            const cleanSym = symbol.replace(/\.(NS|BO)$/, "");

            return (
              <tr 
                key={symbol} 
                onClick={() => onOpenDepth(symbol)}
                className="hover:bg-white/[0.03] transition cursor-pointer group"
              >
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0"
                      style={{ backgroundColor: `${meta?.color || "#00d5ff"}25` }}
                    >
                      {cleanSym.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-white font-mono group-hover:text-cyan-300 transition">
                        {cleanSym}
                      </div>
                      <div className="text-[10px] text-slate-400">{meta?.name}</div>
                    </div>
                  </div>
                </td>

                <td className="p-3.5 font-mono">
                  <div className="font-bold text-white text-sm">₹{meta?.price}</div>
                  <div className={clsx("text-[10px] font-bold flex items-center gap-1", isGain ? "text-emerald-400" : "text-rose-400")}>
                    {isGain ? "+" : ""}{meta?.change} ({isGain ? "+" : ""}{meta?.changePct}%)
                  </div>
                </td>

                <td className="p-3.5 w-44">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>₹{radar.dayLow}</span>
                      <span>₹{radar.dayHigh}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full" />
                      <div
                        className="absolute top-0 bottom-0 w-2 h-2 -mt-0.5 rounded-full bg-white border border-black transform -translate-x-1/2"
                        style={{ left: `${radar.rangeProgress}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="p-3.5 font-mono">
                  <div className="font-bold text-white">{radar.volumeShares}</div>
                  <div className="text-[10px] text-slate-400">{radar.turnoverCr}</div>
                </td>

                <td className="p-3.5 font-mono">
                  <div className="text-slate-300">₹{radar.vwap}</div>
                  <div className="text-[10px] text-slate-400">Spread: {radar.spread}</div>
                </td>

                <td className="p-3.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
                    {radar.tier}
                  </span>
                </td>

                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => onOpenTrade(symbol, e)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/20 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Trade</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onRemove(symbol, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
