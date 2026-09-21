import React, { useMemo } from "react";
import { getStockMeta } from "../../../stores/useTradingStore";
import { Layers, Trash2, Search, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Flame, Octagon } from "lucide-react";
import clsx from "clsx";
import { Sparkline } from "../../common/Sparkline";
import { getLiquidityRadarData, generateMiniPoints } from "./watchlistRadarUtils";

const WatchlistMatrixRow = React.memo(function WatchlistMatrixRow({
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
  const isGain = (meta?.change || 0) >= 0;
  const cleanSym = symbol.replace(/\.(NS|BO)$/, "");

  const radar = useMemo(
    () => getLiquidityRadarData(symbol, meta),
    [symbol, meta?.price, meta?.change]
  );

  const sparkPoints = useMemo(
    () => generateMiniPoints(meta?.price, isGain),
    [meta?.price, isGain]
  );

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
    <tr 
      onClick={() => onOpenDepth(symbol)}
      className="hover:bg-white/[0.03] transition cursor-pointer group"
    >
      {/* 1. Symbol & Monogram */}
      <td className="p-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 shadow-sm border border-white/10"
            style={{ backgroundColor: `${meta?.color || "#00d5ff"}25` }}
          >
            {cleanSym.slice(0, 2)}
          </div>
          <div>
            <div className="font-bold text-white font-mono group-hover:text-cyan-300 transition flex items-center gap-1.5 flex-wrap">
              <span>{cleanSym}</span>
              {ownedHolding && (
                <span
                  className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono font-bold flex items-center gap-0.5 shadow-sm"
                  title={`Demat Position: ${ownedHolding.quantity} shares @ avg ₹${Number(ownedHolding.average_price).toFixed(2)}`}
                >
                  <span>💎 {ownedHolding.quantity} shs</span>
                </span>
              )}
              {radar.setup && (
                <span className={clsx("text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border hidden sm:inline-block", radar.setup.style)}>
                  {radar.setup.label}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">{meta?.name} · {meta?.sector}</div>
          </div>
        </div>
      </td>

      {/* 2. LTP, Sparkline, Change & Active Position PnL */}
      <td className="p-3.5 font-mono">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-bold text-white text-sm">
              {isPrivacyMode ? "••••••" : `${currencySymbol}${priceInFx.toFixed(2)}`}
            </div>
            <div className={clsx("text-[10px] font-bold flex items-center gap-1", isGain ? "text-emerald-400" : "text-rose-400")}>
              {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isGain ? "+" : ""}{meta?.change} ({isGain ? "+" : ""}{meta?.changePct}%)</span>
            </div>
            {activeTrade && (
              <div className="text-[9px] font-mono font-bold flex items-center gap-1 mt-0.5 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Active {activeTrade.direction}:</span>
                <span className={clsx(tradePnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {tradePnl >= 0 ? "+" : ""}{currencySymbol}{(tradePnl / fxRate).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="p-0.5 rounded bg-white/[0.02] border border-white/5 hidden md:block">
            <Sparkline
              points={sparkPoints}
              isGain={isGain}
              width={46}
              height={18}
              interactive={false}
            />
          </div>
        </div>
      </td>

      {/* 3. Intraday & 52W Range Progress Bars */}
      <td className="p-3.5 w-48">
        <div className="space-y-1.5">
          {/* Day Range */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[8px] font-mono text-slate-400">
              <span>L: {currencySymbol}{dayLowInFx.toFixed(0)}</span>
              <span>Day</span>
              <span>H: {currencySymbol}{dayHighInFx.toFixed(0)}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full" />
              <div
                className="absolute top-0 bottom-0 w-1.5 h-1.5 -mt-0.2 rounded-full bg-white border border-black transform -translate-x-1/2"
                style={{ left: `${radar.rangeProgress}%` }}
              />
            </div>
          </div>
          {/* 52W Range */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[8px] font-mono text-slate-400">
              <span>52W: {currencySymbol}{yearLowInFx.toFixed(0)}</span>
              <span className="text-cyan-400 font-semibold flex items-center gap-0.5">
                {radar.isNear52wHigh && <Flame className="w-2 h-2 text-amber-400 animate-pulse" />}
                <span>{Math.round(radar.yearProgress)}%</span>
              </span>
              <span>{currencySymbol}{yearHighInFx.toFixed(0)}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-cyan-600 to-purple-500 rounded-full" />
              <div
                className="absolute top-0 bottom-0 w-1.5 h-1.5 -mt-0.2 rounded-full bg-cyan-200 border border-black transform -translate-x-1/2"
                style={{ left: `${radar.yearProgress}%` }}
              />
            </div>
          </div>
        </div>
      </td>

      {/* 4. Volume, RVOL & Turnover */}
      <td className="p-3.5 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white">{radar.volumeShares}</span>
          {radar.isHighRvol && (
            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              {radar.rvol}x
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400">{radar.turnoverCr}</div>
      </td>

      {/* 5. VWAP & Spread */}
      <td className="p-3.5 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">₹{radar.vwap}</span>
          <span className={clsx(
            "text-[8px] px-1 py-0.2 rounded font-mono font-bold",
            radar.isBullishVwap ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          )}>
            {radar.isBullishVwap ? "▲ BULL" : "▼ BEAR"}
          </span>
        </div>
        <div className="text-[10px] text-slate-400">Spread: {radar.spread}</div>
      </td>

      {/* 6. Liquidity Tier */}
      <td className="p-3.5">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
          {radar.tier}
        </span>
      </td>

      {/* 7. Rapid Execution Desk with Inline Square-Off */}
      <td className="p-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {activeTrade && onSquareOff && (
            <button
              type="button"
              onClick={(e) => onSquareOff(activeTrade.id, e)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 text-xs font-mono font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse"
              title="1-Click Square Off Active Position"
            >
              <Octagon className="w-3 h-3 text-rose-300" />
              <span>Exit</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrade(symbol, "BUY");
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
            title={`Quick Buy ${cleanSym}`}
          >
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Buy</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrade(symbol, "SELL");
            }}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
            title={`Quick Sell ${cleanSym}`}
          >
            <ArrowDownRight className="w-3 h-3 text-rose-400" />
            <span>Sell</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDepth(symbol);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
            title={`View Market Depth for ${cleanSym}`}
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Depth</span>
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
});

export const WatchlistMatrixTable = React.memo(function WatchlistMatrixTable({
  filteredSymbols = [],
  holdings = [],
  openAlerts = [],
  onOpenDepth,
  onOpenTrade,
  onSquareOff,
  onRemove,
  onResetFilters,
  currencySymbol = "₹",
  fxRate = 1,
  isPrivacyMode = false,
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
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d0f14]/85 backdrop-blur-2xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-white/[0.02]">
            <th className="p-3.5">Asset / Symbol</th>
            <th className="p-3.5">LTP &amp; Change</th>
            <th className="p-3.5">Intraday &amp; 52W Range</th>
            <th className="p-3.5">Volume &amp; RVOL</th>
            <th className="p-3.5">VWAP &amp; Spread</th>
            <th className="p-3.5">Liquidity Tier</th>
            <th className="p-3.5 text-right">Rapid Execution Desk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {filteredSymbols.map((symbol) => (
            <WatchlistMatrixRow
              key={symbol}
              symbol={symbol}
              holdings={holdings}
              openAlerts={openAlerts}
              onOpenDepth={onOpenDepth}
              onOpenTrade={onOpenTrade}
              onSquareOff={onSquareOff}
              onRemove={onRemove}
              currencySymbol={currencySymbol}
              fxRate={fxRate}
              isPrivacyMode={isPrivacyMode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
