import React, { useMemo } from "react";
import { soundEngine } from "../../utils/soundEngine";
import { LayoutDashboard, Layers, ShieldX, ShieldAlert, TrendingUp, TrendingDown, Scale } from "lucide-react";
import clsx from "clsx";

export function ActiveTradesDockHeader({
  openAlerts = [],
  openAlertsCount = 0,
  activeTradesViewMode,
  setActiveTradesViewMode,
  onSquareOffAll
}) {
  const count = openAlertsCount || openAlerts.length;

  const { totalOpenRisk, netBias, isCombinedRiskBreached } = useMemo(() => {
    let riskSum = 0;
    let calls = 0;
    let puts = 0;

    openAlerts.forEach((t) => {
      const entry = Number(t.entryPrice || 0);
      const sl = Number(t.stopLoss || 0);
      const rawQty = Number(t.quantity || 1);
      const lotSize = Number(t.lotSize || 65);
      const totalQty = Number(t.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);
      
      const isProtected = t.isTrueBeLocked || (t.direction === "SHORT" ? sl <= entry : sl >= entry);
      if (!isProtected && entry > 0 && sl > 0) {
        riskSum += Math.abs(entry - sl) * totalQty;
      }

      const sym = String(t.symbol || "").toUpperCase();
      const isCE = t.optionType === "CALL" || sym.includes("CE");
      if (isCE) calls += 1; else puts += 1;
    });

    let bias = "FLAT";
    if (calls > 0 && puts === 0) bias = "NET BULLISH (CALLs)";
    else if (puts > 0 && calls === 0) bias = "NET BEARISH (PUTs)";
    else if (calls > 0 && puts > 0) bias = "HEDGED / STRADDLE";

    return {
      totalOpenRisk: Math.round(riskSum),
      netBias: bias,
      isCombinedRiskBreached: riskSum > 300
    };
  }, [openAlerts]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
            ACTIVE ORDERS &amp; POSITIONS
          </span>
          <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
            {count} Positions Live
          </span>

          {count > 0 && (
            <>
              {/* Net Directional Bias */}
              <span className={clsx(
                "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm whitespace-nowrap",
                netBias.includes("BULLISH")
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                  : netBias.includes("BEARISH")
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-purple-500/15 text-purple-300 border-purple-500/30"
              )}>
                {netBias.includes("BULLISH") && <TrendingUp className="w-3 h-3 text-cyan-400" />}
                {netBias.includes("BEARISH") && <TrendingDown className="w-3 h-3 text-rose-400" />}
                {netBias.includes("HEDGED") && <Scale className="w-3 h-3 text-purple-400" />}
                <span>{netBias}</span>
              </span>

              {/* Combined Portfolio Risk Invariant Meter */}
              <span className={clsx(
                "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm whitespace-nowrap",
                isCombinedRiskBreached
                  ? "bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
                  : totalOpenRisk === 0
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-white/5 text-slate-300 border-white/10"
              )}>
                {isCombinedRiskBreached ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span>⚠️ Open Risk: ₹{totalOpenRisk} (Exceeds ₹300 Max)</span>
                  </>
                ) : totalOpenRisk === 0 ? (
                  <span>🛡️ 100% Risk-Free (All BE Locked)</span>
                ) : (
                  <span>Open Risk: ₹{totalOpenRisk} / ₹300 Cap</span>
                )}
              </span>
            </>
          )}
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          My Active Practice Trades
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          Real-time mark-to-market delta tracking with automated target, stop-loss triggers, and invariant risk gating.
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0 flex-wrap">
        {/* Apple Segmented View Switcher */}
        <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setActiveTradesViewMode("deck");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
              activeTradesViewMode === "deck"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Full-Column Expansive Pro Deck (Recommended)"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Pro Deck</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setActiveTradesViewMode("compact");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
              activeTradesViewMode === "compact"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="High-Density Compact Terminal Row"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compact</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSquareOffAll}
          disabled={openAlertsCount === 0}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 border border-rose-500/30 text-rose-300 font-bold text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
          title="Instantly square off all open positions (Shift+Esc)"
        >
          <ShieldX className="w-4 h-4 text-rose-400" />
          <span>Square Off All</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[9px] font-mono border border-rose-500/30 font-bold text-rose-300">
            ⇧⎋
          </kbd>
        </button>
        <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-sm">
          {openAlertsCount} ACTIVE
        </span>
      </div>
    </div>
  );
}
