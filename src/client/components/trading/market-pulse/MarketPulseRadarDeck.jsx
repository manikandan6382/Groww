import React from "react";
import clsx from "clsx";
import { Radio, RefreshCw, Sparkles, CheckCircle2, ShieldAlert, Zap } from "lucide-react";
import { useMarketPulseData } from "./useMarketPulseData";
import { MajorIndicesRibbon } from "./MajorIndicesRibbon";
import { MarketBreadthBarometer } from "./MarketBreadthBarometer";
import { SectorDivergenceMatrix } from "./SectorDivergenceMatrix";
import { InstitutionalFlowAndVixCard } from "./InstitutionalFlowAndVixCard";
import { QuickScalpModal } from "./QuickScalpModal";

export function MarketPulseRadarDeck() {
  const {
    indicesData,
    loading,
    refreshing,
    lastUpdated,
    error,
    toastMessage,
    scalpModal,
    telemetryState,
    instantScalpMode,
    toggleInstantScalpMode,
    marketBreadth,
    vixRegime,
    institutionalFlow,
    sectors,
    fetchIndices,
    openQuickScalpModal,
    closeScalpModal,
    executeQuickScalp,
    transferScalpToPaperLab
  } = useMarketPulseData();

  return (
    <section className="relative rounded-3xl bg-[#090b10]/90 border border-white/[0.08] p-5 sm:p-7 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6 overflow-hidden">
      {/* Ambient Spatial Backdrop Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="relative z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-mono font-bold flex items-center justify-between shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-400/80">Active Invariant: ₹250 SL</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="relative z-20 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-xl">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wider">
                MARKET PULSE &amp; MACRO BREADTH
              </h2>
              <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                INSTITUTIONAL RADAR
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-mono pl-10">
            Real-time Upstox Index Stream · 50-Stock Breadth Barometer · Sector Rotation Heatmap · Smart Money Flows
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
          {/* Telemetry Status Pill */}
          {telemetryState === "LIVE" ? (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE STREAM
            </span>
          ) : telemetryState === "CACHED" ? (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              INTRADAY CACHED
            </span>
          ) : (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              OFFLINE
            </span>
          )}

          {/* 1-Click Instant Scalp Toggle */}
          <button
            type="button"
            onClick={toggleInstantScalpMode}
            className={clsx(
              "px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95",
              instantScalpMode
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200"
            )}
            title={instantScalpMode ? "Instant Mode ON: 1-Click direct scalp execution (₹250 SL Invariant)" : "Modal Mode: Opens scalp pad modal before execution"}
          >
            <Zap className={clsx("w-3 h-3", instantScalpMode ? "text-amber-400" : "text-slate-400")} />
            <span>{instantScalpMode ? "1-Click Active" : "1-Click Off"}</span>
          </button>

          {lastUpdated && (
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              Synced:{" "}
              <span className="text-slate-200 font-semibold">
                {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchIndices(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin text-cyan-400")} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Part 1: Major Indices Live Ribbon */}
      <div className="relative z-10">
        <MajorIndicesRibbon
          indicesData={indicesData}
          onOpenScalp={openQuickScalpModal}
          vixRegime={vixRegime}
          instantScalpMode={instantScalpMode}
        />
      </div>

      {/* Part 2: Macro Breadth, Sector Rotation & Smart Money Bento (3 Columns) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 h-full">
          <MarketBreadthBarometer marketBreadth={marketBreadth} />
        </div>

        <div className="lg:col-span-4 h-full">
          <SectorDivergenceMatrix sectors={sectors} />
        </div>

        <div className="lg:col-span-4 h-full">
          <InstitutionalFlowAndVixCard
            institutionalFlow={institutionalFlow}
            vixRegime={vixRegime}
          />
        </div>
      </div>

      {/* Part 3: Quick Scalp Execution Modal */}
      <QuickScalpModal
        modalData={scalpModal}
        onClose={closeScalpModal}
        onExecute={executeQuickScalp}
        onTransferToPad={transferScalpToPaperLab}
      />
    </section>
  );
}

export default MarketPulseRadarDeck;
