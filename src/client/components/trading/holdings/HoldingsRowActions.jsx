import React from "react";
import { Copy, Check, Zap } from "lucide-react";
import { Sparkline } from "../../common/Sparkline";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function HoldingsRowActions({ item, copiedSymbol, onCopy }) {
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
  );
}
