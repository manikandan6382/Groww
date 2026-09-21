import React, { useState, useMemo } from "react";
import clsx from "clsx";
import { Star, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { USD_INR_RATE } from "./foreignStocksData";

function SortHeader({ label, sortField, activeKey, activeDir, onSort, align = "right", className }) {
  const isActive = activeKey === sortField;
  return (
    <th 
      className={clsx(
        "pb-3 px-3 font-bold transition select-none cursor-pointer group hover:text-white whitespace-nowrap",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        isActive ? "text-cyan-300" : "text-slate-400",
        className
      )}
      onClick={() => onSort(sortField)}
      title={`Sort by ${label}`}
    >
      <div className={clsx(
        "inline-flex items-center gap-1",
        align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
      )}>
        <span>{label}</span>
        {isActive ? (
          activeDir === "asc" ? (
            <ArrowUp className="w-3 h-3 text-cyan-300" />
          ) : (
            <ArrowDown className="w-3 h-3 text-cyan-300" />
          )
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-30 group-hover:opacity-80 transition-opacity" />
        )}
      </div>
    </th>
  );
}

export function ForeignStocksTable({
  filteredStocks,
  onSelectSimStock,
  onOpenDetail,
  watchlist = [],
  onToggleWatchlist,
  comparedSymbols = [],
  onToggleCompare,
  onResetFilters
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const handleHeaderSort = (key) => {
    soundEngine.playTabSwitchTone();
    if (sortKey === key) {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else {
        setSortKey(null);
        setSortDir("desc");
      }
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" || key === "peRatio" || key === "beta" ? "asc" : "desc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredStocks;
    return [...filteredStocks].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === "peRatio") {
        valA = parseFloat(a.peRatio || "999");
        valB = parseFloat(b.peRatio || "999");
      } else if (sortKey === "symbol") {
        return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      } else if (sortKey === "drawdown52W") {
        valA = a.drawdown52W ?? -99;
        valB = b.drawdown52W ?? -99;
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;

      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredStocks, sortKey, sortDir]);
  if (filteredStocks.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0d0f14]/80 border border-white/5 space-y-3">
        <strong className="text-sm font-bold text-white block">No foreign stocks match your criteria</strong>
        <p className="text-xs text-slate-400">Try adjusting your sector filter or search keyword.</p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold transition cursor-pointer active:scale-95 shadow-sm"
          >
            Clear Filters & Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-[#0d0f14]/90 border border-white/[0.08] backdrop-blur-3xl shadow-xl overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
            <th className="pb-3 px-2 font-bold w-12 text-center sticky left-0 z-20 bg-[#0d0f14]">★</th>
            <SortHeader 
              label="Titan" 
              sortField="symbol" 
              activeKey={sortKey} 
              activeDir={sortDir} 
              onSort={handleHeaderSort} 
              align="left" 
              className="sticky left-12 z-20 bg-[#0d0f14] border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.5)]" 
            />
            <th className="pb-3 px-3 font-bold">Sector</th>
            <SortHeader label="Price (USD)" sortField="price" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <th className="pb-3 px-3 font-bold text-right">INR Approx</th>
            <SortHeader label="Day Change" sortField="changePct" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <SortHeader label="3-Yr CAGR" sortField="cagr3Y" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <SortHeader label="Beta (β)" sortField="beta" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <SortHeader label="P/E" sortField="peRatio" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <SortHeader label="Market Cap" sortField="mktCapNum" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <SortHeader label="52W Drawdown" sortField="drawdown52W" activeKey={sortKey} activeDir={sortDir} onSort={handleHeaderSort} align="right" />
            <th className="pb-3 px-3 font-bold text-center">Compare</th>
            <th className="pb-3 px-3 font-bold text-center">Simulate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedRows.map((stock) => {
            const isWatchlisted = watchlist.includes(stock.symbol);
            const isComparing = comparedSymbols.includes(stock.symbol);
            const beta = stock.beta || 1.15;
            const isHighBeta = beta >= 1.5;

            return (
              <tr 
                key={stock.symbol} 
                className="hover:bg-white/[0.04] transition cursor-pointer group"
                onClick={() => onOpenDetail?.(stock)}
              >
                {/* Watchlist Pin (Touch Ergonomic) */}
                <td 
                  className="py-3 px-2 text-center sticky left-0 z-10 bg-[#0d0f14] group-hover:bg-[#151922] transition-colors" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onToggleWatchlist?.(stock.symbol);
                    }}
                    className="min-w-[36px] min-h-[36px] mx-auto rounded-lg hover:bg-white/10 transition cursor-pointer flex items-center justify-center active:scale-95"
                    title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                    aria-label={`Favorite ${stock.symbol}`}
                  >
                    <Star className={clsx("w-3.5 h-3.5", isWatchlisted ? "fill-amber-400 text-amber-400" : "text-slate-500 hover:text-white")} />
                  </button>
                </td>

                {/* Titan Symbol & Name */}
                <td className="py-3 px-3 sticky left-12 z-10 bg-[#0d0f14] group-hover:bg-[#151922] border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.5)] transition-colors">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-mono font-bold group-hover:text-cyan-300 transition-colors">
                      {stock.symbol}
                    </strong>
                    <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{stock.name}</span>
                  </div>
                </td>

                {/* Sector */}
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
                    {stock.sectorLabel || stock.sector}
                  </span>
                </td>

                {/* USD Price */}
                <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                  ${stock.price.toFixed(2)}
                </td>

                {/* INR Approx */}
                <td className="py-3 px-3 text-right font-mono text-slate-300 tabular-nums">
                  ₹{(stock.price * USD_INR_RATE).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </td>

                {/* Day Change */}
                <td className="py-3 px-3 text-right">
                  <span className={clsx(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5",
                    stock.isGain ? "text-emerald-400 bg-emerald-500/15" : "text-rose-400 bg-rose-500/15"
                  )}>
                    {stock.isGain ? "+" : ""}{stock.changePct}%
                  </span>
                </td>

                {/* 3Y CAGR */}
                <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                  +{stock.cagr3Y || 15}%
                </td>

                {/* Beta */}
                <td className="py-3 px-3 text-right font-mono font-bold">
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    isHighBeta ? "text-amber-300 bg-amber-500/15" : "text-emerald-300 bg-emerald-500/15"
                  )}>
                    β {beta.toFixed(2)}
                  </span>
                </td>

                {/* P/E */}
                <td className="py-3 px-3 text-right font-mono text-slate-300">
                  {stock.peRatio || "N/A"}
                </td>

                {/* Market Cap */}
                <td className="py-3 px-3 text-right font-mono text-slate-300">
                  {stock.mktCap || "N/A"}
                </td>

                {/* Drawdown */}
                <td className="py-3 px-3 text-right font-mono text-[10px] whitespace-nowrap">
                  <span className={stock.drawdown52W > -6 ? "text-emerald-300 font-bold" : "text-indigo-300"}>
                    {stock.drawdown52W != null ? `${stock.drawdown52W}%` : "-8.5%"}
                  </span>
                </td>

                {/* Compare Button */}
                <td className="py-3 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleCompare?.(stock.symbol)}
                    className={clsx(
                      "px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer active:scale-95",
                      isComparing
                        ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-200"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                    )}
                    title={isComparing ? "Remove from comparison" : "Add to comparison"}
                  >
                    {isComparing ? "✓ Dock" : "+ Compare"}
                  </button>
                </td>

                {/* Simulate */}
                <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectSimStock(stock.symbol)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-[10px] border border-cyan-500/25 transition cursor-pointer active:scale-95"
                  >
                    ⚡ Sim
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ForeignStocksTable;
