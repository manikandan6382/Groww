import React, { useState } from "react";
import { Sparkline } from "../common/Sparkline";
import { getStockMeta } from "../../stores/useTradingStore";
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import clsx from "clsx";

export function HoldingsTable({ holdings = [] }) {
  const [filter, setFilter] = useState("all");

  const defaultHoldings = [
    { tradingsymbol: "RELIANCE", quantity: 50, average_price: 1280.00, last_price: 1307.20, pnl: 1360.00 },
    { tradingsymbol: "TCS", quantity: 20, average_price: 2310.00, last_price: 2268.10, pnl: -838.00 },
    { tradingsymbol: "HDFCBANK", quantity: 100, average_price: 710.00, last_price: 729.65, pnl: 1965.00 },
    { tradingsymbol: "INFY", quantity: 60, average_price: 1140.00, last_price: 1121.10, pnl: -1134.00 },
    { tradingsymbol: "ICICIBANK", quantity: 80, average_price: 1380.00, last_price: 1438.00, pnl: 4640.00 },
    { tradingsymbol: "SBIN", quantity: 150, average_price: 1020.00, last_price: 1056.00, pnl: 5400.00 },
    { tradingsymbol: "GOLDBEES", quantity: 300, average_price: 125.00, last_price: 132.87, pnl: 2361.00 },
  ];

  const items = holdings.length ? holdings : defaultHoldings;

  const filtered = items.filter((h) => {
    const isGain = Number(h.pnl || 0) >= 0;
    if (filter === "gain") return isGain;
    if (filter === "loss") return !isGain;
    return true;
  });

  return (
    <div className="apple-ceramic-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Equity Holdings & Allocation</h3>
          <span className="text-[11px] text-slate-400 font-medium">Real-time long-term equity portfolio</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setFilter("all")}
            className={clsx(
              "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("gain")}
            className={clsx(
              "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "gain" ? "bg-white/10 text-emerald-400" : "text-slate-400 hover:text-white"
            )}
          >
            Gainers
          </button>
          <button
            onClick={() => setFilter("loss")}
            className={clsx(
              "px-2.5 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "loss" ? "bg-white/10 text-rose-400" : "text-slate-400 hover:text-white"
            )}
          >
            Losers
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-2 px-3">Stock / Company</th>
              <th className="py-2 px-3 text-right">Shares</th>
              <th className="py-2 px-3 text-right">Avg Price</th>
              <th className="py-2 px-3 text-right">Live LTP</th>
              <th className="py-2 px-3 text-center">Trend (30D)</th>
              <th className="py-2 px-3 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((item, idx) => {
              const meta = getStockMeta(`${item.tradingsymbol}.NS`);
              const pnl = Number(item.pnl || 0);
              const isGain = pnl >= 0;
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white flex-shrink-0"
                        style={{ backgroundColor: `${meta.color}25`, border: `1px solid ${meta.color}50` }}
                      >
                        {item.tradingsymbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {item.tradingsymbol}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{meta.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400 tabular-nums">
                    ₹{Number(item.average_price || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white tabular-nums">
                    ₹{Number(item.last_price || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-block">
                      <Sparkline isGain={isGain} width={48} height={16} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <strong className={clsx("font-mono font-extrabold tabular-nums block", isGain ? "text-emerald-400" : "text-rose-400")}>
                      {isGain ? "+" : ""}₹{pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
