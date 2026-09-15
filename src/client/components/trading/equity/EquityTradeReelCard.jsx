import React from "react";
import clsx from "clsx";

export function EquityTradeReelCard({
  point: p,
  isSelected,
  onSelect,
  baseCapital = 100000
}) {
  const originalIdx = p.originalIndex ?? p.index;
  const isGenesis = p.id === "genesis-origin" || originalIdx === 0;
  const isCE = p.symbol && p.symbol.includes("CE");
  const isPE = p.symbol && p.symbol.includes("PE");
  const isWin = p.pnl >= 0;

  if (isGenesis) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={clsx(
          "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 [content-visibility:auto] [contain-intrinsic-size:110px]",
          isSelected
            ? "bg-gradient-to-b from-cyan-500/20 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40 -translate-y-1"
            : "bg-[#0d0f14]/90 border-white/10 text-slate-300 hover:border-white/20 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] hover:-translate-y-1"
        )}
      >
        <div className="flex items-center justify-between gap-1.5 w-full">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-slate-500/15 border border-slate-500/30 text-slate-200">
            🏛️ GENESIS ANCHOR
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Origin</span>
        </div>

        <div className="space-y-0.5 w-full">
          <span className="text-xs font-bold text-slate-200 truncate block tracking-tight">
            Vault Starting Capital
          </span>
          <div className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
            ₹{baseCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
          <span className="text-slate-400">Compounding Baseline</span>
          <span className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
            Day 0
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709] [content-visibility:auto] [contain-intrinsic-size:110px]",
        isSelected
          ? "bg-gradient-to-b from-cyan-500/15 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-cyan-400/40 -translate-y-1"
          : "bg-gradient-to-b from-[#121424]/85 via-[#0d0f14]/85 to-[#060709]/85 border-white/[0.07] text-slate-300 hover:text-white hover:from-[#1a1f2c]/90 hover:to-[#0d0f14]/90 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
      )}
    >
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border shadow-sm",
              isWin ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            )}
          >
            #{originalIdx}
          </span>
          {(isCE || isPE) && (
            <span
              className={clsx(
                "px-1 py-0.2 rounded text-[9px] font-black font-mono border",
                isCE ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              )}
            >
              {isCE ? "CE" : "PE"}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono truncate">{p.time}</span>
      </div>

      <div className="space-y-0.5 w-full min-w-0">
        <span
          title={p.symbol}
          className="text-xs font-bold text-white truncate block tracking-tight group-hover/card:text-cyan-300 transition-colors"
        >
          {p.symbol}
        </span>
        <div className="flex items-baseline justify-between gap-1">
          <div className={clsx("text-sm sm:text-base font-black font-mono tracking-tight", isWin ? "text-emerald-400" : "text-rose-400")}>
            {isWin ? "+" : ""}₹{p.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {p.pnl !== 0 && (
            <span className={clsx("text-[10px] font-mono font-bold", isWin ? "text-emerald-400/80" : "text-rose-400/80")}>
              {isWin ? "+" : ""}{((p.pnl / (p.capital - p.pnl || baseCapital)) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
        <span className="text-slate-400 truncate">₹{p.capital.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
        {p.drawdownPct > 0 ? (
          <span className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded font-bold">
            -{p.drawdownPct}% DD
          </span>
        ) : (
          <span className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
            ATH 🌟
          </span>
        )}
      </div>
    </button>
  );
}
