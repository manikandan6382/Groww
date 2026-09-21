import React, { useState } from "react";
import clsx from "clsx";
import { DownloadCloud, RefreshCw, Zap, CheckCircle2, AlertCircle, CheckCheck, AlertTriangle } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";

export function SettledTradeBridge({ recentSettledTrades = [], onImport }) {
  const bulkAddJournalTrades = useTradingStore((s) => s.bulkAddJournalTrades);
  const [upstoxFills, setUpstoxFills] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSyncUpstox = async () => {
    setIsSyncing(true);
    setIsError(false);
    setSyncMessage("");
    try {
      const res = await fetch("/api/upstox/today-fills");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsError(true);
        setSyncMessage(data.error || "Failed to sync fills from Upstox.");
        soundEngine?.playWarningTone?.();
      } else {
        const fills = data.trades || [];
        setUpstoxFills(fills);
        if (fills.length > 0) {
          setSyncMessage(`Synced ${fills.length} Upstox fill(s)`);
          soundEngine?.playSuccessTone?.();
        } else {
          setSyncMessage("Upstox active · 0 fills today");
          soundEngine?.playTabSwitchTone?.();
        }
      }
    } catch {
      setIsError(true);
      setSyncMessage("Network error connecting to Upstox bridge.");
      soundEngine?.playWarningTone?.();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportTrade = (t) => {
    soundEngine?.playSuccessTone?.();
    onImport?.(t);
  };

  const settledUpstoxFills = upstoxFills.filter((t) => t.status !== "OPEN");

  const handleBatchIngestAll = () => {
    if (settledUpstoxFills.length === 0) return;
    const formatted = settledUpstoxFills.map((t, idx) => ({
      id: Date.now() + idx,
      symbol: t.symbol,
      optionType: t.symbol?.includes("PE") ? "PUT" : "CALL",
      direction: t.direction || "LONG",
      tradeType: "INTRADAY",
      entryDatetime: t.entryDatetime || new Date().toISOString(),
      exitDatetime: t.exitDatetime || new Date().toISOString(),
      duration: "10 mins",
      entryPrice: Number(t.entryPrice || 0),
      exitPrice: Number(t.exitPrice || 0),
      targetPrice: Number(t.targetPrice || (Number(t.entryPrice || 0) + (250 / Math.max(1, Number(t.quantity || 1))) * 2.0)),
      stopLoss: Number(t.stopLoss || Math.max(0.1, Number(t.entryPrice || 0) - (250 / Math.max(1, Number(t.quantity || 1))))),
      quantity: Number(t.quantity || 65),
      lotSize: 1,
      grossPnl: Number(t.grossPnl || t.netPnl || 0),
      taxesAndCharges: Number(t.statutoryCharges || 55.20),
      netPnl: Number(t.netPnl || 0),
      closeReason: Number(t.netPnl || 0) >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT",
      strategyTag: "Upstox Scalp",
      strategyTags: "Upstox Scalp",
      mistakeTags: "None",
      confidenceScore: 9,
      followedPlan: true,
      catalyst: "Live market order auto-synced from Upstox terminal.",
      executionDetails: `Matched fill: Entry ₹${t.entryPrice}, Exit ₹${t.exitPrice}, ${t.quantity} units.`,
      mindsetEmotion: "Disciplined & Patient",
      lessonsLearned: t.lessonsLearned || "Synced broker fill adhering to ₹250 risk target."
    }));

    if (bulkAddJournalTrades) {
      bulkAddJournalTrades(formatted);
      soundEngine?.playSuccessTone?.();
      setSyncMessage(`Ingested ${formatted.length} scalp(s) to Journal!`);
      setUpstoxFills((prev) => prev.filter((t) => t.status === "OPEN"));
    }
  };

  const hasPaperTrades = recentSettledTrades && recentSettledTrades.length > 0;
  const hasUpstoxTrades = upstoxFills && upstoxFills.length > 0;

  return (
    <div className="p-3.5 rounded-2xl bg-[#0d111a]/90 backdrop-blur-xl border border-white/[0.08] space-y-2.5 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Bridge (1-Click Journal Ingestion)</span>
          </span>
          {syncMessage && (
            <span
              className={clsx(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                isError
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              )}
            >
              {isError ? <AlertCircle className="w-3 h-3 text-rose-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              {syncMessage}
            </span>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2">
          {/* ⚡ 1-Click Batch Ingest All */}
          {settledUpstoxFills.length > 0 && (
            <button
              type="button"
              onClick={handleBatchIngestAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
              title={`Directly save all ${settledUpstoxFills.length} settled fills to journal with 1 click`}
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>⚡ Ingest All ({settledUpstoxFills.length})</span>
            </button>
          )}

          {/* ⚡ 1-Click Upstox Sync Button */}
          <button
            type="button"
            onClick={handleSyncUpstox}
            disabled={isSyncing}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer active:scale-95 shadow-sm whitespace-nowrap",
              isSyncing
                ? "bg-cyan-500/10 text-cyan-400/60 border-cyan-500/20 cursor-wait"
                : "bg-gradient-to-r from-cyan-500/15 to-sky-500/15 hover:from-cyan-500/25 hover:to-sky-500/25 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50"
            )}
            title="Fetch today's executed orders and positions from Upstox REST API"
          >
            <RefreshCw className={clsx("w-3 h-3 text-cyan-400", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Syncing Upstox..." : "⚡ Sync Upstox Fills"}</span>
          </button>
        </div>
      </div>

      {/* Trades Carousel / Ribbon */}
      {hasUpstoxTrades || hasPaperTrades ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-nowrap scrollbar-none pt-0.5">
          {/* Live Upstox Fills */}
          {upstoxFills.map((t) => {
            const isOpen = t.status === "OPEN";
            if (isOpen) {
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine?.playWarningTone?.();
                    alert(`⚠️ ${t.symbol} is currently OPEN in the live market.\nExit the trade on Upstox before logging it to your permanent journal.`);
                  }}
                  title="Position in flight: Exit on Upstox before permanent journal ingestion"
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 shrink-0"
                >
                  <span className="flex items-center gap-1 text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-2.5 h-2.5" /> In-Flight
                  </span>
                  <span className="text-white">{t.symbol}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-amber-300 font-extrabold">Mark: ₹{t.exitPrice}</span>
                  <span className="text-[10px] text-slate-400">({t.quantity} qty)</span>
                </button>
              );
            }

            const isProfit = Number(t.netPnl || 0) >= 0;
            const formattedPnl = `${isProfit ? "+" : ""}₹${Number(t.netPnl || 0).toFixed(0)}`;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleImportTrade(t)}
                title={`Import Upstox Fill: ${t.symbol} (Entry: ₹${t.entryPrice}, Exit: ₹${t.exitPrice})`}
                className={clsx(
                  "px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 group shrink-0",
                  isProfit
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:border-emerald-500/60 shadow-emerald-500/10"
                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/40 hover:border-rose-500/60 shadow-rose-500/10"
                )}
              >
                <span className="flex items-center gap-1 text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Upstox
                </span>
                <span className="text-white group-hover:text-cyan-300 transition-colors">{t.symbol}</span>
                <span className="text-slate-500">|</span>
                <span className={isProfit ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>{formattedPnl}</span>
                <span className="text-[10px] text-slate-400">({t.quantity} qty)</span>
              </button>
            );
          })}

          {/* Paper Simulated Fills */}
          {recentSettledTrades.map((t) => {
            const isProfit = Number(t.netPnl || 0) >= 0;
            const formattedPnl = `${isProfit ? "+" : ""}₹${Number(t.netPnl || 0).toFixed(0)}`;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleImportTrade(t)}
                title={`Import Paper Trade: ${t.symbol} (Entry: ₹${t.entryPrice}, Exit: ₹${t.exitPrice || t.lastMarkPrice})`}
                className={clsx(
                  "px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 group shrink-0",
                  isProfit
                    ? "bg-white/[0.03] hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-200 border-white/10 hover:border-emerald-500/30"
                    : "bg-white/[0.03] hover:bg-rose-500/15 text-slate-300 hover:text-rose-200 border-white/10 hover:border-rose-500/30"
                )}
              >
                <span className="text-[10px] font-sans font-medium px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10">
                  Paper Sim
                </span>
                <span className="text-white group-hover:text-cyan-300 transition-colors">{t.symbol}</span>
                <span className="text-slate-500">|</span>
                <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>{formattedPnl}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1 py-0.5">
          <span>No local paper trades in buffer. Click <strong className="text-cyan-300">"⚡ Sync Upstox Fills"</strong> above to pull today's broker executions.</span>
          <span className="text-[10px] font-mono text-slate-500">Zero manual typing · Exact fills</span>
        </div>
      )}
    </div>
  );
}
