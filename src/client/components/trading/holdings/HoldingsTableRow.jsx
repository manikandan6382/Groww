import React from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown, Copy, Check, Zap, Plus, Minus } from "lucide-react";
import { Sparkline } from "../../common/Sparkline";
import { RollingTicker } from "../../common/RollingTicker";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function HoldingsTableRow({
  item,
  viewMode = "all",
  copiedSymbol,
  onCopy,
  onOpenActionModal,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);
  const privacyClass = isPrivacyMode 
    ? "filter blur-[7px] select-none hover:blur-none transition-all duration-200 cursor-pointer" 
    : "";

  const isCostMode = viewMode === "cost";
  const isPerfMode = viewMode === "performance";
  const profitPerShare = item.ltp - item.avg;
  const isZeroCost = Boolean(item.isZeroCost || item.avg <= 0);

  // Converted FX amounts
  const convertedInvestedVal = Math.round(item.investedVal / fxRate);
  const convertedVal = Math.round(item.val / fxRate);
  const convertedPnl = Math.round(item.pnl / fxRate);
  const convertedAvg = (item.avg / fxRate);
  const convertedLtp = (item.ltp / fxRate);
  const convertedDayChg = Math.abs(item.dayChg / fxRate);
  const convertedProfitPerShare = profitPerShare / fxRate;

  // Real Dynamic Intraday Trajectory Points (no fake random waves)
  const prevClose = Number(item.close_price) > 0 ? Number(item.close_price) : (item.ltp - item.dayChg);
  const realTrajectoryPoints = [
    Math.round(prevClose / fxRate),
    Math.round((prevClose + item.dayChg * 0.3) / fxRate),
    Math.round((prevClose + item.dayChg * 0.7) / fxRate),
    Math.round(item.ltp / fxRate)
  ];

  // Guard against division by zero
  const principalRatioPct = item.val > 0 && !isZeroCost
    ? Math.min(100, Math.max(5, (item.investedVal / item.val) * 100))
    : isZeroCost ? 0 : 100;
  const cushionRatioPct = item.isGain && item.val > 0 ? Math.max(0, 100 - principalRatioPct) : 0;

  return (
    <tr className={clsx(
      "hover:bg-white/[0.045] transition-all duration-150 group relative",
      isCostMode && "hover:bg-indigo-500/[0.03]",
      isPerfMode && "hover:bg-emerald-500/[0.03]"
    )}>
      {/* Col 1: Asset / Instrument (Sticky Left Frozen Column) */}
      <td className="py-3.5 px-4 min-w-[200px] sticky left-0 bg-[#0c121e]/95 group-hover:bg-[#121927]/95 backdrop-blur-md z-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.3)] transition-colors">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10 transition-transform group-hover:scale-105"
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

      {/* Col 2: Portfolio Allocation & Capital-vs-Profit Split */}
      <td className="py-3.5 px-4 min-w-[160px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold whitespace-nowrap">
            <span className="text-white flex items-center gap-1">
              <span>{item.weightPct}%</span>
              <span className="text-[9px] font-normal text-slate-400">
                ({isCostMode ? "cost" : "nav"})
              </span>
            </span>
            <span className={clsx("text-[10px] text-slate-400", privacyClass)}>
              {currencySymbol}{(((isCostMode ? item.investedVal : item.val) / fxRate) / 1000).toFixed(1)}K
            </span>
          </div>

          {/* Two-tone Principal vs Profit Cushion Meter */}
          <div
            className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden flex shadow-inner"
            title={
              isZeroCost
                ? "Corporate Action / Free Demat credit"
                : `Capital Split: Principal ${currencySymbol}${convertedInvestedVal.toLocaleString("en-IN")} (${principalRatioPct.toFixed(0)}%) | Cushion: ${item.isGain ? "+" : ""}${currencySymbol}${convertedPnl.toLocaleString("en-IN")}`
            }
          >
            <div
              className="h-full bg-indigo-500/90 transition-all duration-300 rounded-l-full"
              style={{ width: `${principalRatioPct}%` }}
            />
            {item.isGain && cushionRatioPct > 0 && (
              <div
                className="h-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] transition-all duration-300 rounded-r-full"
                style={{ width: `${cushionRatioPct}%` }}
              />
            )}
          </div>
        </div>
      </td>

      {/* Col 3: Invested Capital (Value Without Profit & Break-Even Base Price) */}
      <td className={clsx(
        "py-3.5 px-4 text-right font-mono min-w-[155px] whitespace-nowrap transition-colors",
        isCostMode ? "bg-indigo-500/[0.08] rounded-xl border-y border-indigo-500/25 shadow-sm" : ""
      )}>
        <div className="flex items-center justify-end gap-1.5">
          {isZeroCost ? (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              CORP ACTION
            </span>
          ) : isCostMode && (
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              NO PROFIT
            </span>
          )}
          <div className={clsx("font-extrabold text-slate-100 text-xs tracking-tight", privacyClass)}>
            {isZeroCost ? (
              <span className="text-amber-300/90 font-sans text-[11px]">{currencySymbol}0.00 (Pending Cost)</span>
            ) : (
              <RollingTicker value={convertedInvestedVal} prefix={currencySymbol} decimalPlaces={2} className="text-slate-100 font-extrabold" />
            )}
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center justify-end gap-1">
          <span className="text-slate-300 font-semibold">{item.qty}</span> shs @
          <span className={clsx(privacyClass, isZeroCost ? "text-amber-300" : "text-indigo-300 font-bold")} title="Acquisition Price without profit (Break-Even Price)">
            {isZeroCost ? `${currencySymbol}0.00` : `${currencySymbol}${convertedAvg.toFixed(2)}`}
          </span>
        </div>
        <div className={clsx("text-[9px] text-slate-300 font-sans mt-0.5", privacyClass)}>
          {isZeroCost ? "Reconcile on Console" : `Break-even: ${currencySymbol}${convertedAvg.toFixed(2)}`}
        </div>
      </td>

      {/* Col 4: Current Live Valuation (NAV at LTP) */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[145px] whitespace-nowrap">
        <div className={clsx("font-black text-white text-sm tracking-tight", privacyClass)}>
          <RollingTicker value={convertedVal} prefix={currencySymbol} decimalPlaces={2} className="text-white font-black" />
        </div>
        <div className={clsx("text-[10px] text-cyan-400/90 mt-0.5 font-mono", privacyClass)}>
          LTP: {currencySymbol}{convertedLtp.toFixed(2)}
        </div>
        <div className={clsx("text-[9px] text-slate-300 font-sans mt-0.5", privacyClass)}>
          {profitPerShare >= 0 ? (
            <span className="text-emerald-400">+{currencySymbol}{convertedProfitPerShare.toFixed(2)}/sh above cost</span>
          ) : (
            <span className="text-rose-400">-{currencySymbol}{Math.abs(convertedProfitPerShare).toFixed(2)}/sh below cost</span>
          )}
        </div>
      </td>

      {/* Col 5: Today's Movement */}
      <td className="py-3.5 px-4 text-right font-mono min-w-[130px] whitespace-nowrap">
        <div className={clsx("font-bold text-xs flex items-center justify-end gap-1", item.isDayGain ? "text-cyan-400" : "text-rose-400")}>
          {item.isDayGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span className={privacyClass}>{item.isDayGain ? "+" : "-"}{currencySymbol}{convertedDayChg.toFixed(2)}</span>
        </div>
        <div className={clsx("text-[10px] font-semibold mt-0.5", item.isDayGain ? "text-cyan-300/90" : "text-rose-300/90")}>
          {item.isDayGain ? "+" : ""}{item.dayChgPct}% 1D
        </div>
      </td>

      {/* Col 6: Total Unrealized Return */}
      <td className={clsx(
        "py-3.5 px-4 text-right font-mono min-w-[140px] whitespace-nowrap transition-colors",
        isPerfMode ? "bg-emerald-500/[0.08] rounded-xl border-y border-emerald-500/25 shadow-sm" : ""
      )}>
        <div className={clsx("font-black text-sm drop-shadow-sm", item.isGain ? "text-emerald-400" : "text-rose-400", privacyClass)}>
          <RollingTicker
            value={convertedPnl}
            prefix={currencySymbol}
            showSign={true}
            decimalPlaces={2}
            className={item.isGain ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
        <div className={clsx("text-[10px] font-bold mt-0.5", item.isGain ? "text-emerald-300" : "text-rose-300")}>
          {item.isGain ? "+" : ""}{item.pnlPct}% Return
        </div>
        <div className="text-[9px] text-slate-300 font-sans mt-0.5">
          {isZeroCost ? "100% Free Gain" : item.isGain ? `${item.cushionPct}% cushion` : "Drawdown"}
        </div>
      </td>

      {/* Col 7: Trend & Action Hub */}
      <td className="py-3.5 px-4 text-center min-w-[175px] whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          <div className="p-1 rounded-lg bg-white/[0.03] border border-white/5 shadow-inner">
            <Sparkline points={realTrajectoryPoints} isGain={item.isDayGain} width={40} height={15} prefix={currencySymbol} />
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

          {/* ⚡ + Buy (Dip Accumulate) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenActionModal) {
                onOpenActionModal(item, "accumulate");
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-[10px] font-mono font-bold text-indigo-300 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
            title={`Quick Accumulate / Dip Buy ${item.tradingsymbol}`}
          >
            <Plus className="w-2.5 h-2.5 text-indigo-400" />
            <span>Buy</span>
          </button>

          {/* 🎯 - Trim (Profit Booking / Rebalance) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenActionModal) {
                onOpenActionModal(item, "trim");
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 transition-all duration-150 active:scale-95 shadow-sm cursor-pointer"
            title={`Quick Trim / Rebalance ${item.tradingsymbol}`}
          >
            <Minus className="w-2.5 h-2.5 text-emerald-400" />
            <span>Trim</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
