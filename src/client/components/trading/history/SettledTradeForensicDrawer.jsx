import React, { useState } from "react";
import clsx from "clsx";
import { 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Bookmark, 
  Check, 
  Activity, 
  Sliders, 
  Clock, 
  Receipt,
  Scale
} from "lucide-react";
import { calculateExcursionMetrics, calculateStatutoryCharges, calculateTradeRMultiple } from "./historyCalculations";
import { soundEngine } from "../../../utils/soundEngine";

const MISTAKE_OPTIONS = [
  "None / Disciplined",
  "FOMO Entry",
  "Chased Green Candle",
  "Early Exit / Greed",
  "Slipped Stop Loss",
  "Hesitation on Entry",
  "Over-sizing",
  "Revenge Scalp"
];

export function SettledTradeForensicDrawer({
  trade,
  isJournaled = false,
  onPromoteToJournal,
  onOpenTimeline,
  onUpdateTrade
}) {
  const [activeMistake, setActiveMistake] = useState(trade.mistakeTags || trade.mistakeTag || "None / Disciplined");
  const [isSavingTag, setIsSavingTag] = useState(false);

  const excursion = calculateExcursionMetrics(trade);
  const charges = calculateStatutoryCharges(trade);
  const net = Number(trade.netPnl || 0);
  const gross = Number(trade.grossPnl ?? (net + charges));
  const { rMultiple, rMultipleStr, isRuleBreached, plannedRiskRupees } = calculateTradeRMultiple(trade);

  const rawQty = Number(trade.quantity || 1);
  const lotSize = Number(trade.lotSize || 65);
  const totalQty = Number(trade.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);

  const slPrice = Number(trade.stopLoss || 0);
  const exitPrice = Number(trade.exitPrice || 0);
  const isSlTrade = trade.closeReason?.includes("STOP_LOSS") || trade.closeReason?.includes("HARD_CAP");
  const exitSlippagePts = (isSlTrade && slPrice > 0 && exitPrice > 0)
    ? Number(Math.max(0, trade.direction === "SHORT" ? exitPrice - slPrice : slPrice - exitPrice).toFixed(2))
    : 0;
  const exitSlippageRupees = Number((exitSlippagePts * totalQty).toFixed(2));

  const unharvestedPts = Math.max(0, Number((excursion.mfePts - (trade.exitPrice > trade.entryPrice ? trade.exitPrice - trade.entryPrice : 0)).toFixed(2)));
  const unharvestedRupees = Math.round(unharvestedPts * totalQty);

  const handleSelectMistake = (tag) => {
    soundEngine.playTabSwitchTone();
    setActiveMistake(tag);
    setIsSavingTag(true);
    onUpdateTrade?.(trade.id, { mistakeTags: tag, mistakeTag: tag });
    setTimeout(() => setIsSavingTag(false), 500);
  };

  return (
    <div className="p-5 sm:p-6 bg-[#060a16]/95 border-b border-white/10 shadow-[inset_0_4px_24px_rgba(0,0,0,0.7)] text-left font-sans text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            🔍 FORENSIC AUDIT TRAY
          </span>
          <span className="font-mono text-white text-xs font-bold">
            Order #{String(trade.id || "").slice(-6) || "PRACTICE"}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {trade.symbol} · {totalQty} Qty ({trade.lots || Math.round(totalQty / lotSize)} Lots)
          </span>
          <span className={clsx(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded border shadow-sm",
            (trade.executionAttribution || "").includes("NSE") || trade.closeReason?.includes("TARGET")
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : (trade.executionAttribution || "").includes("RMS") || trade.closeReason?.includes("SL") || trade.closeReason?.includes("HARD_CAP")
              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
              : "bg-slate-500/15 text-slate-300 border-slate-500/30"
          )}>
            {trade.executionAttribution || (trade.closeReason?.includes("TARGET") ? "⚡ NSE RESTING LIMIT" : "🛡️ RMS ALGO MLO")}
          </span>
          {isRuleBreached ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Breach: Loss Exceeded ₹300 Cap</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Disciplined Execution</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onPromoteToJournal && (
            <button
              type="button"
              onClick={() => onPromoteToJournal(trade)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95",
                isJournaled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/[0.06] hover:bg-white/10 text-white border border-white/15 hover:border-cyan-400/50"
              )}
              title={isJournaled ? "Trade already saved in Journal" : "1-Click promote trade to Journal"}
            >
              {isJournaled ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isJournaled ? "In Journal" : "Save to Journal"}</span>
            </button>
          )}

          {onOpenTimeline && (
            <button
              type="button"
              onClick={() => onOpenTimeline(trade)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 active:scale-95"
              title="Launch full-screen tick journey modal"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Tick Timeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Forensic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 font-mono">
        {/* Card 1: Execution Slippage & Latency */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Execution Slippage</span>
            </span>
            <span className="text-[10px] text-slate-500">Signal $\to$ Fill</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Signal Price:</span>
              <span className="text-slate-300">₹{Number(trade.signalPrice || trade.entryPrice || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Filled Entry:</span>
              <span className="text-white font-bold">₹{Number(trade.entryPrice || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-slate-400 font-sans">Entry Slippage:</span>
              <span className={clsx("font-bold", excursion.entrySlippagePts > 0 ? "text-amber-400" : "text-emerald-400")}>
                {excursion.entrySlippagePts > 0 ? `+${excursion.entrySlippagePts} pts` : "0.00 pts"}
                {excursion.entrySlippageRupees > 0 && ` (₹${excursion.entrySlippageRupees})`}
              </span>
            </div>
            {isSlTrade && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Exit Slippage:</span>
                <span className={clsx("font-bold", exitSlippagePts > 0 ? "text-rose-400" : "text-emerald-400")}>
                  {exitSlippagePts > 0 ? `-${exitSlippagePts} pts (-₹${exitSlippageRupees})` : "0.00 pts (Clean fill)"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Duration:</span>
              <span className="text-cyan-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{trade.duration || "Quick Scalp"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: MFE / MAE Visual Excursion Gauge */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>MFE / MAE Excursion</span>
            </span>
            <span className={clsx(
              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
              excursion.dataQuality === "OBSERVED"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : excursion.dataQuality === "PARTIAL"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-slate-500/15 text-slate-400 border-slate-500/30"
            )}>
              {excursion.dataQuality || "UNAVAILABLE"}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-emerald-400 font-bold font-sans">MFE (Peak):</span>
                <span className="text-emerald-300 font-bold">
                  {excursion.isAvailable ? `+${excursion.mfePts} pts (+₹${excursion.mfeRupees})` : "—"}
                </span>
              </div>
              {excursion.isAvailable ? (
                <>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all rounded-full" 
                      style={{ width: `${Math.min(100, excursion.targetPctReached)}%` }} 
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {excursion.targetPctReached}% of ₹500 target{excursion.isPartial ? " (Partial Extrema)" : ""}
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-slate-500 block mt-0.5">No recorded tick history (Unavailable)</span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-rose-400 font-bold font-sans">MAE (Drawdown):</span>
                <span className="text-rose-300 font-bold">
                  {excursion.isAvailable ? `-${excursion.maePts} pts (-₹${excursion.maeRupees})` : "—"}
                </span>
              </div>
              {excursion.isAvailable ? (
                <>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 transition-all rounded-full" 
                      style={{ width: `${Math.min(100, excursion.slPctDrawnDown)}%` }} 
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {excursion.slPctDrawnDown}% of ₹250 SL risk{excursion.isPartial ? " (Partial Extrema)" : ""}
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-slate-500 block mt-0.5">No recorded tick history (Unavailable)</span>
              )}
            </div>

            {unharvestedRupees > 50 && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                Left +₹{unharvestedRupees} on table
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Statutory Friction Drag */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Statutory Friction</span>
            </span>
            <span className="text-[10px] text-slate-500">{charges != null ? "Authoritative Persisted" : "Incomplete"}</span>
          </div>

          {charges != null ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Gross Realized:</span>
                <span className={clsx("font-bold", gross >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {gross >= 0 ? "+" : ""}₹{gross.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Flat Brokerage:</span>
                <span className="text-slate-300">₹40.00 (Buy+Sell)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">STT + Turnover + GST:</span>
                <span className="text-slate-300">₹{Math.max(0, charges - 40).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400 font-sans">Net P&amp;L:</span>
                <strong className={clsx("font-black", net >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {net >= 0 ? "+" : ""}₹{net.toFixed(2)}
                </strong>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Gross Realized:</span>
                <span className={clsx("font-bold", gross >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {gross >= 0 ? "+" : ""}₹{gross.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 font-sans">
                Authoritative charges not persisted in database. Incomplete financial record.
              </div>
            </div>
          )}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 text-slate-400">
              <span className="font-sans">Planned Net Risk:</span>
              <span className="text-slate-300">₹{plannedRiskRupees}</span>
            </div>
            {isRuleBreached && (
              <div className="text-[10px] text-rose-300 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 font-sans space-y-0.5 mt-1">
                <div className="font-bold text-rose-200">⚠️ Risk Excursion Anatomy:</div>
                <div className="text-[9px] text-rose-300/90 font-mono">
                  Slippage: -₹{exitSlippageRupees.toFixed(0)} · Fees: -₹{charges != null ? charges.toFixed(0) : "—"}
                </div>
              </div>
            )}
        </div>

        {/* Card 4: Invariant Audit & Mistake Tag Editor */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span className="flex items-center gap-1.5 text-purple-300 font-bold">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>Discipline Audit &amp; Tags</span>
            </span>
            {isSavingTag && <span className="text-[10px] text-cyan-300 animate-pulse">Saved!</span>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Normalized Edge:</span>
              <span className={clsx("font-bold", rMultiple >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {rMultipleStr}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Planned Risk:</span>
              <span className="text-slate-300">₹{plannedRiskRupees} (Target ₹250)</span>
            </div>

            <div className="pt-1.5 border-t border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-sans block">Execution Tag / Mistake:</span>
              <select
                value={activeMistake}
                onChange={(e) => handleSelectMistake(e.target.value)}
                className="w-full py-1 px-2 rounded-lg bg-black/60 border border-white/15 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer font-sans"
              >
                {MISTAKE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
