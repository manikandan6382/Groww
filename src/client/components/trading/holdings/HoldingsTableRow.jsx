import React from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown, Copy, Check, Zap } from "lucide-react";
import { Sparkline } from "../../common/Sparkline";
import { RollingTicker } from "../../common/RollingTicker";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function HoldingsTableRow({ item, copiedSymbol, onCopy }) {
  const { setActiveView, setOrderPadPreFill } = useTradingStore();

  const handleTradeClick = (e) => {
    e.stopPropagation();
    const sym = item.tradingsymbol;
    const ltp = Number(item.ltp || item.avg || 1000);
    const roundedStrike = Math.round(ltp / 50) * 50;
    setOrderPadPreFill({
      symbol: `${sym} ${roundedStrike} CE`,
      underlying: sym,
      entryPrice: Number((ltp * 0.02).toFixed(2)),
      targetPrice: Number((ltp * 0.026).toFixed(2)),
      stopLoss: Number((ltp * 0.016).toFixed(2)),
      quantity: 1,
      lotSize: 25,
    });
    setActiveView("paper");
    soundEngine.playSuccessTone();
  };

  return (
    <tr className="hover:bg-white/[0.045] transition-all duration-150 group relative">
      {/* Col 1: Asset / Instrument */}
      <td className="py-3.5 px-4 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
            style={{ backgroundColor: `${item.meta?.color || "#38bdf8"}25` }}
          >
            {item.tradingsymbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white group-hover:text-cyan-300 transition-colors font-mono flex items-center gap-2 whitespace-nowrap">
              <span>{item.tradingsymbol}</span>
              <span className="text-[9px] font-bold font-sans text-slate-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                {item.meta?.sector || "Equity"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[160px] mt-0.5 whitespace-nowrap">
              {item.meta?.name || item.tradingsymbol}
            </div>
          </div>
        </div>
      </td>

      {/* Col 2: Portfolio Allocation */}
      <td className="py-3.5 px-4 min-w-[150px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold whitespace-nowrap">
            <span className="text-white">{item.weightPct}%</span>
            <span className="text-[10px] text-slate-400">₹{(item.val / 1000).toFixed(1)}K</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-300"
              style={{ width: `${Math.min(100, item.weightPct * 3.5)}%` }}
            />
          </div>
        </div>
      </td>

      {/* Col 3: Position & Average Cost */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
        <div className="font-bold text-slate-200 text-xs">
          <RollingTicker value={item.qty} decimalPlaces={0} className="text-slate-200 font-bold" /> shares
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          @ <RollingTicker value={item.avg} prefix="₹" decimalPlaces={2} className="text-slate-400" />
        </div>
      </td>

      {/* Col 4: Live LTP & Total Value */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
        <div className="font-black text-white text-sm">
          <RollingTicker value={item.ltp} prefix="₹" decimalPlaces={2} className="text-white font-black" />
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Val: ₹{Math.round(item.val).toLocaleString("en-IN")}
        </div>
      </td>

      {/* Col 5: Today's Movement */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
        <div className={clsx("font-bold text-xs flex items-center justify-end gap-1", item.isDayGain ? "text-cyan-400" : "text-rose-400")}>
          {item.isDayGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{item.isDayGain ? "+" : ""}₹{Math.abs(item.dayChg).toFixed(2)}</span>
        </div>
        <div className={clsx("text-[10px] font-semibold mt-0.5", item.isDayGain ? "text-cyan-300/90" : "text-rose-300/90")}>
          {item.isDayGain ? "+" : ""}{item.dayChgPct}% 1D
        </div>
      </td>

      {/* Col 6: Total Unrealized Return */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap">
        <div className={clsx("font-black text-sm drop-shadow-sm", item.isGain ? "text-emerald-400" : "text-rose-400")}>
          <RollingTicker
            value={item.pnl}
            prefix="₹"
            showSign={true}
            decimalPlaces={2}
            className={item.isGain ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
        <div className={clsx("text-[10px] font-bold mt-0.5", item.isGain ? "text-emerald-300" : "text-rose-300")}>
          {item.isGain ? "+" : ""}{item.pnlPct}% Return
        </div>
      </td>

      {/* Col 7: Trend & Action Hub */}
      <td className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">
        <div className="flex items-center justify-center gap-2">
          <div className="p-1 rounded-lg bg-white/[0.03] border border-white/5 shadow-inner">
            <Sparkline isGain={item.isGain} width={42} height={15} />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(item.tradingsymbol);
            }}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Copy Symbol"
          >
            {copiedSymbol === item.tradingsymbol ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleTradeClick}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
            title={`1-Click Practice Option Scalp on ${item.tradingsymbol}`}
          >
            <Zap className="w-2.5 h-2.5 text-cyan-400" />
            <span>Trade</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
