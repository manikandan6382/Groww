import React from "react";
import { X, Zap } from "lucide-react";

export const WatchlistDepthModal = React.memo(function WatchlistDepthModal({
  isOpen,
  onClose,
  activeStockMeta,
  activeRadarData,
  activeCleanSym,
  onOpenTrade,
}) {
  if (!isOpen || !activeStockMeta || !activeRadarData) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl p-6 rounded-[28px] bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/15"
              style={{ backgroundColor: `${activeStockMeta.color || "#00d5ff"}25` }}
            >
              {activeCleanSym.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-mono text-white">{activeCleanSym}</h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {activeRadarData.tier}
                </span>
              </div>
              <div className="text-xs text-slate-400">{activeStockMeta.name} · {activeStockMeta.sector}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
          <div className="flex items-baseline justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase">Live Quote</span>
              <div className="text-xl font-black text-white">₹{activeStockMeta.price}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase">Buyer / Seller Dominance</span>
              <div className="text-xs font-bold text-slate-200">
                <span className="text-emerald-400">{activeRadarData.buyerDominance}% Buy</span> vs <span className="text-rose-400">{100 - activeRadarData.buyerDominance}% Sell</span>
              </div>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${activeRadarData.buyerDominance}%` }} />
            <div className="h-full bg-rose-500" style={{ width: `${100 - activeRadarData.buyerDominance}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono font-bold text-slate-400 px-1">
            <span className="text-emerald-400">BID DEPTH (BUYERS)</span>
            <span className="text-rose-400">ASK DEPTH (SELLERS)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="space-y-1 p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <div className="flex justify-between text-[10px] text-slate-400 pb-1 border-b border-white/5">
                <span>Qty</span>
                <span>Bid Price</span>
              </div>
              {activeRadarData.bids.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300">{b.qty.toLocaleString("en-IN")}</span>
                  <span className="text-emerald-400 font-bold">₹{b.price}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 p-2.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
              <div className="flex justify-between text-[10px] text-slate-400 pb-1 border-b border-white/5">
                <span>Ask Price</span>
                <span>Qty</span>
              </div>
              {activeRadarData.asks.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span className="text-rose-400 font-bold">₹{a.price}</span>
                  <span className="text-slate-300">{a.qty.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">VWAP</span>
            <strong className="text-white">₹{activeRadarData.vwap}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">Spread</span>
            <strong className="text-cyan-300">{activeRadarData.spread}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">Day Volume</span>
            <strong className="text-white">{activeRadarData.volumeShares}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[10px]">Turnover</span>
            <strong className="text-cyan-300">{activeRadarData.turnoverCr}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={(e) => onOpenTrade(activeStockMeta.symbol || activeCleanSym, e)}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.14] hover:bg-white/[0.22] text-white border border-white/20 font-bold text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Trade {activeCleanSym}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
