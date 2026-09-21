import React, { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, ShieldAlert, ShieldCheck, Activity, Compass, Zap } from "lucide-react";
import { useOptionChainData } from "./useOptionChainData";
import { OptionChainHeader } from "./OptionChainHeader";
import { OptionChainTable } from "./OptionChainTable";
import { OptionStrikeModal } from "./OptionStrikeModal";
import { formatOi } from "./optionChainUtils";

export function OptionChainRadarDeck() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    activeSymbol,
    activeConfig,
    activeExpiry,
    chainData,
    loading,
    refreshing,
    lastUpdated,
    error,
    toastMessage,
    scalpModal,
    pcrSentiment,
    fetchOptionChain,
    handleSelectSymbol,
    setActiveExpiry,
    openStrikeModal,
    closeStrikeModal,
    executeStrikeScalp,
    transferStrikeToPad
  } = useOptionChainData();

  const totalCallOi = chainData?.totalCallOi || 0;
  const totalPutOi = chainData?.totalPutOi || 0;
  const strikes = chainData?.strikes || [];
  const spot = chainData?.spot || activeConfig.fallbackSpot;
  const maxPain = chainData?.maxPain || spot;

  return (
    <section className="relative rounded-3xl bg-[#090b10]/90 border border-white/[0.08] p-5 sm:p-7 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5 overflow-hidden">
      {/* Ambient Spatial Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Alert */}
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

      {/* Error Alert */}
      {error && (
        <div className="relative z-20 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-xl">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Deck */}
      <div className="relative z-10">
        <OptionChainHeader
          activeSymbol={activeSymbol}
          onSelectSymbol={handleSelectSymbol}
          activeExpiry={activeExpiry}
          onSelectExpiry={setActiveExpiry}
          chainData={chainData}
          pcrSentiment={pcrSentiment}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onRefresh={() => fetchOptionChain(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </div>

      {/* Strike Table Matrix or Collapsed Focus Ribbon */}
      {isCollapsed ? (
        <div className="relative z-10 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <span className="text-xs font-mono text-slate-200 font-bold">
                Option Chain Paused in Investor Focus Mode
              </span>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                Strike matrix hidden to prevent impulsive intraday over-trading while reviewing wealth portfolio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Expand Strike Matrix ({strikes.length || 13} Strikes)</span>
          </button>
        </div>
      ) : (
        <>
          {/* Strike Table Matrix */}
          <div className="relative z-10">
            <OptionChainTable
              strikes={strikes}
              spot={spot}
              maxPain={maxPain}
              interval={activeConfig.interval}
              onOpenStrikeModal={openStrikeModal}
            />
          </div>

          {/* Tactical Diagnostics Footer */}
          <div className="relative z-10 pt-4 border-t border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400">Tactical Sentiment:</span>
              <span className="text-slate-200 font-bold">{pcrSentiment?.tip}</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] self-end md:self-center">
              <span className="text-slate-400">
                Total Call OI: <strong className="text-emerald-400">{formatOi(totalCallOi)}</strong>
              </span>
              <span className="text-slate-400">
                Total Put OI: <strong className="text-rose-400">{formatOi(totalPutOi)}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold">
                ₹250 Risk Invariant Enforced
              </span>
            </div>
          </div>
        </>
      )}

      {/* Strike Scalp Execution Modal */}
      <OptionStrikeModal
        modalData={scalpModal}
        onClose={closeStrikeModal}
        onExecute={executeStrikeScalp}
        onTransferToPad={transferStrikeToPad}
      />
    </section>
  );
}

export default OptionChainRadarDeck;
