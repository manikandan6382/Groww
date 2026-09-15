import React from "react";
import clsx from "clsx";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE } from "./foreignStocksData";

export function ForeignStocksTable({
  filteredStocks,
  onSelectSimStock
}) {
  return (
    <div className="p-4 rounded-3xl bg-[#0d0f14]/85 border border-white/[0.07] backdrop-blur-3xl shadow-xl overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
            <th className="pb-3 px-3 font-bold">Titan</th>
            <th className="pb-3 px-3 font-bold">What It Does</th>
            <th className="pb-3 px-3 font-bold text-right">Price (USD)</th>
            <th className="pb-3 px-3 font-bold text-right">INR Approx</th>
            <th className="pb-3 px-3 font-bold text-right">Day Change</th>
            <th className="pb-3 px-3 font-bold text-right">52W Range</th>
            <th className="pb-3 px-3 font-bold text-center">Simulate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {filteredStocks.map((stock) => (
            <tr key={stock.symbol} className="hover:bg-white/[0.02] transition">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <strong className="text-white font-mono font-bold">{stock.symbol}</strong>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{stock.name}</span>
                </div>
              </td>
              <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs truncate">
                {stock.whatItDoes}
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                ${stock.price.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                ₹{(stock.price * USD_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </td>
              <td className="py-3 px-3 text-right">
                <span className={clsx(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5",
                  stock.isGain ? "text-emerald-400 bg-emerald-500/15" : "text-rose-400 bg-rose-500/15"
                )}>
                  {stock.isGain ? "+" : ""}{stock.changePct}%
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400">
                ${stock.low52.toFixed(0)} – ${stock.high52.toFixed(0)}
              </td>
              <td className="py-3 px-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSimStock(stock.symbol);
                    soundEngine.playTabSwitchTone();
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/25 transition cursor-pointer"
                >
                  ⚡ Simulate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
