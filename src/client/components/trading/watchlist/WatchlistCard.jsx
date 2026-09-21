import React from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { Sparkline } from "../../common/Sparkline";
import { RollingTicker } from "../../common/RollingTicker";
import { Trash2, TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight, Flame, Octagon } from "lucide-react";
import clsx from "clsx";
import { getLiquidityRadarData, generateMiniPoints } from "./watchlistRadarUtils";

export const WatchlistCard = React.memo(function WatchlistCard({
  symbol,
  holdings = [],
  openAlerts = [],
  onOpenDepth,
  onOpenTrade,
  onSquareOff,
  onRemove,
  currencySymbol = "₹",
  fxRate = 1,
  isPrivacyMode = false,
}) {
  const meta = getStockMeta(symbol);
  const radar = getLiquidityRadarData(symbol, meta);
  const isGain = (meta?.change || 0) >= 0;
  const cleanSym = symbol.replace(/\.(NS|BO)$/, "");
  const sparkPoints = generateMiniPoints(meta?.price, isGain);

  const priceInFx = (meta?.price || 0) / fxRate;
  const dayLowInFx = radar.dayLow / fxRate;
  const dayHighInFx = radar.dayHigh / fxRate;
  const yearLowInFx = radar.yearLow / fxRate;
  const yearHighInFx = radar.yearHigh / fxRate;

  const ownedHolding = holdings.find(
    (h) => String(h.tradingsymbol || "").toUpperCase() === cleanSym.toUpperCase()
  );

  const activeTrade = (openAlerts || []).find(
    (t) => t.underlyingSymbol === cleanSym || (t.symbol && t.symbol.toUpperCase().startsWith(cleanSym.toUpperCase()))
  );

  const tradePnl = activeTrade
    ? (activeTrade.pnl != null
        ? Number(activeTrade.pnl)
        : ((meta?.price || activeTrade.entryPrice) - activeTrade.entryPrice) *
          (activeTrade.lotSize || 1) *
          (activeTrade.quantity || 1) *
          (activeTrade.direction === "SHORT" ? -1 : 1))
    : 0;

  return (
    <div
      onClick={() => onOpenDepth(symbol)}
      className="p-5 rounded-2xl bg-gradient-to-b from-[#0d0f14]/95 to-[#090a0d]/95 hover:from-[#121424]/95 hover:to-[#0d0f14]/95 border border-white/[0.08] hover:border-white/[0.20] shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 group relative flex flex-col justify-between space-y-3.5 cursor-pointer hover:-translate-y-1"
    >
      {/* 1. Header: Asset Identity, Sector, Demat Tag, RVOL & Remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
            style={{ backgroundColor: `${meta?.color || "#00d5ff"}25` }}
          >
            {cleanSym.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-white font-mono group-hover:text-cyan-300 transition truncate">
                {cleanSym}
              </span>
              <span className="text-[9px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                NSE
              </span>
              {ownedHolding && (
                <span
                  className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono font-bold flex items-center gap-0.5 shadow-sm"
                  title={`Demat Position: ${ownedHolding.quantity} shares @ avg ₹${Number(ownedHolding.average_price).toFixed(2)}`}
                >
                  <span>💎 {ownedHolding.quantity} shs</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {meta?.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {radar.setup && (
            <span
              className={clsx(
                "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap hidden sm:inline-block",
                radar.setup.style
              )}
            >
              {radar.setup.label}
            </span>
          )}

          {radar.isHighRvol && (
            <span
              className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
              title={`Relative Volume: ${radar.rvol}x compared to 30-day average`}
            >
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              <span>{radar.rvol}x VOL</span>
            </span>
          )}

          <button
            type="button"
            onClick={(e) => onRemove(symbol, e)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
            title="Remove symbol from watchlist"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Active Trade Inline Live P&L Pill */}
      {activeTrade && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-amber-300 font-bold truncate">ACTIVE {activeTrade.direction}:</span>
            <span className={clsx("font-extrabold shrink-0", tradePnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {tradePnl >= 0 ? "+" : ""}{currencySymbol}{(tradePnl / fxRate).toFixed(2)}
            </span>
          </div>
          {onSquareOff && (
            <button
              type="button"
              onClick={(e) => onSquareOff(activeTrade.id, e)}
              className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-bold transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
              title="1-Click Square Off Position"
            >
              <Octagon className="w-2.5 h-2.5" />
              <span>Exit</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Price & Intraday Trajectory Sparkline */}
      <div className="flex items-baseline justify-between pt-0.5">
        <div>
          <div className="text-lg font-mono font-black text-white">
            {isPrivacyMode ? (
              <span className="tracking-widest text-slate-400 font-normal">••••••</span>
            ) : (
              <RollingTicker
                value={priceInFx}
                prefix={currencySymbol}
                decimalPlaces={2}
                className="text-white font-black font-mono"
              />
            )}
          </div>
          <div
            className={clsx(
              "text-[10px] font-mono font-bold flex items-center gap-1 mt-0.5",
              isGain ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isGain ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
            <span>
              {isGain ? "+" : ""}{meta?.change} ({isGain ? "+" : ""}{meta?.changePct}%)
            </span>
            <span className={clsx(
              "ml-1 text-[8px] px-1 py-0.2 rounded font-mono",
              radar.isBullishVwap ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {radar.isBullishVwap ? "▲ VWAP" : "▼ VWAP"}
            </span>
          </div>
        </div>

        <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5 shadow-inner">
          <Sparkline
            points={sparkPoints}
            isGain={isGain}
            width={54}
            height={20}
            interactive={false}
          />
        </div>
      </div>

      {/* 4. Dual Ranges: Intraday & 52-Week Range Meters */}
      <div className="space-y-2 pt-1 border-t border-white/[0.04]">
        {/* Intraday Range */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>L: {currencySymbol}{dayLowInFx.toFixed(1)}</span>
            <span className="text-slate-300 font-semibold text-[8px]">Day Range</span>
            <span>H: {currencySymbol}{dayHighInFx.toFixed(1)}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full"
              style={{ width: "100%" }}
            />
            <div
              className="absolute top-0 bottom-0 w-2 h-2 -mt-0.2 rounded-full bg-white shadow-[0_0_6px_#ffffff] border border-black transform -translate-x-1/2"
              style={{ left: `${radar.rangeProgress}%` }}
            />
          </div>
        </div>

        {/* 52-Week Range */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>52W L: {currencySymbol}{yearLowInFx.toFixed(0)}</span>
            <span className="text-cyan-400 font-semibold text-[8px] flex items-center gap-0.5">
              {radar.isNear52wHigh && <Flame className="w-2.5 h-2.5 text-amber-400 animate-pulse" />}
              <span>52W Range</span>
            </span>
            <span>52W H: {currencySymbol}{yearHighInFx.toFixed(0)}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 via-indigo-500 to-purple-400 rounded-full"
              style={{ width: "100%" }}
            />
            <div
              className="absolute top-0 bottom-0 w-1.5 h-1.5 -mt-0.2 rounded-full bg-cyan-200 shadow-[0_0_5px_#06b6d4] border border-black transform -translate-x-1/2"
              style={{ left: `${radar.yearProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Liquidity & Volume Stats */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-0.5">
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 block text-[8px] uppercase">Volume</span>
          <span className="text-white font-bold">{radar.volumeShares}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-slate-400 block text-[8px] uppercase">Turnover</span>
          <span className="text-cyan-300 font-bold">{radar.turnoverCr}</span>
        </div>
      </div>

      {/* 6. Rapid Execution Desk: Buy | Sell | Depth */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTrade(symbol, "BUY");
          }}
          className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 text-[10px] sm:text-[11px] font-mono font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.15)] min-w-0"
          title={`Quick Buy / Accumulate ${cleanSym}`}
        >
          <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">Buy</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTrade(symbol, "SELL");
          }}
          className="py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-[10px] sm:text-[11px] font-mono font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.15)] min-w-0"
          title={`Quick Sell / Short ${cleanSym}`}
        >
          <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="truncate">Sell</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDepth(symbol);
          }}
          className="py-1.5 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 hover:border-cyan-500/40 text-[10px] sm:text-[11px] font-mono font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.1)] min-w-0"
          title={`Institutional L2 Depth Ladder for ${cleanSym}`}
        >
          <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">Depth</span>
        </button>
      </div>
    </div>
  );
});
