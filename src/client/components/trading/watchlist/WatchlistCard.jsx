import React from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { Sparkline } from "../../common/Sparkline";
import { RollingTicker } from "../../common/RollingTicker";
import { Trash2, TrendingUp, TrendingDown, Zap, Activity } from "lucide-react";
import clsx from "clsx";
import { getLiquidityRadarData, generateMiniPoints } from "./watchlistRadarUtils";

export const WatchlistCard = React.memo(function WatchlistCard({
  symbol,
  onOpenDepth,
  onOpenTrade,
  onRemove,
}) {
  const meta = getStockMeta(symbol);
  const radar = getLiquidityRadarData(symbol, meta);
  const isGain = (meta?.change || 0) >= 0;
  const cleanSym = symbol.replace(/\.(NS|BO)$/, "");
  const sparkPoints = generateMiniPoints(meta?.price, isGain);

  return (
    <div
      onClick={() => onOpenDepth(symbol)}
      className="p-5 rounded-2xl bg-gradient-to-b from-[#0d0f14]/95 to-[#090a0d]/95 hover:from-[#121424]/95 hover:to-[#0d0f14]/95 border border-white/[0.07] hover:border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 group relative flex flex-col justify-between space-y-4 cursor-pointer hover:-translate-y-1"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
            style={{ backgroundColor: `${meta?.color || "#00d5ff"}25` }}
          >
            {cleanSym.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white font-mono group-hover:text-cyan-300 transition truncate">
                {cleanSym}
              </span>
              <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                NSE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {meta?.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => onRemove(symbol, e)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
          title="Remove symbol from watchlist"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="text-lg font-mono font-black text-white">
            <RollingTicker
              value={meta?.price || 0}
              prefix="₹"
              decimalPlaces={2}
              className="text-white font-black font-mono"
            />
          </div>
          <div className={clsx(
            "text-[10px] font-mono font-bold flex items-center gap-1 mt-0.5",
            isGain ? "text-emerald-400" : "text-rose-400"
          )}>
            {isGain ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
            <span>{isGain ? "+" : ""}{meta?.change} ({isGain ? "+" : ""}{meta?.changePct}%)</span>
          </div>
        </div>

        <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5 shadow-inner">
          <Sparkline
            points={sparkPoints}
            isGain={isGain}
            width={56}
            height={20}
            interactive={false}
          />
        </div>
      </div>

      <div className="space-y-1 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span>L: ₹{radar.dayLow}</span>
          <span className="text-slate-300 font-semibold">Day Range</span>
          <span>H: ₹{radar.dayHigh}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full"
            style={{ width: "100%" }}
          />
          <div
            className="absolute top-0 bottom-0 w-2.5 h-2.5 -mt-0.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] border border-black transform -translate-x-1/2"
            style={{ left: `${radar.rangeProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 block text-[9px]">Volume</span>
          <span className="text-white font-bold">{radar.volumeShares}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 block text-[9px]">Turnover</span>
          <span className="text-cyan-300 font-bold">{radar.turnoverCr}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={(e) => onOpenTrade(symbol, e)}
          className="w-full py-1.5 px-2 rounded-xl bg-white/[0.12] hover:bg-white/[0.22] text-white border border-white/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1"
          title={`Trade ${cleanSym}`}
        >
          <Zap className="w-3 h-3 text-amber-400 fill-amber-400/30" />
          <span>Trade</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenDepth(symbol)}
          className="w-full py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
          title={`View Depth & Liquidity for ${cleanSym}`}
        >
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Depth</span>
        </button>
      </div>
    </div>
  );
});
