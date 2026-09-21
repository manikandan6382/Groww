import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, TrendingUp, TrendingDown, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const WatchlistDepthModal = React.memo(function WatchlistDepthModal({
  isOpen,
  onClose,
  activeStockMeta,
  activeRadarData,
  activeCleanSym,
  activeSymbol,
  filteredSymbols = [],
  onSelectSymbol,
}) {
  const [liveDepth, setLiveDepth] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [priceFlash, setPriceFlash] = useState(null); // 'up' | 'down' | null
  const prevPriceRef = useRef(null);

  const currentIndex = filteredSymbols.findIndex(
    (s) => s === activeSymbol || s.replace(/\.(NS|BO)$/, "") === activeCleanSym
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < filteredSymbols.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectSymbol) {
      soundEngine?.playTabSwitchTone?.();
      onSelectSymbol(filteredSymbols[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectSymbol) {
      soundEngine?.playTabSwitchTone?.();
      onSelectSymbol(filteredSymbols[currentIndex + 1]);
    }
  };

  // Lock body scroll and listen for Escape and Arrow navigation keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, hasPrev, hasNext, currentIndex, filteredSymbols, onSelectSymbol]);

  // Live Upstox L2 depth streaming loop with AbortController and Visibility handling
  useEffect(() => {
    if (!isOpen || !activeCleanSym) {
      setLiveDepth(null);
      setLatencyMs(null);
      setPriceFlash(null);
      prevPriceRef.current = null;
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;
    let timer = null;
    let isFetching = false;

    const fetchLiveDepth = async () => {
      if (!isMounted || document.visibilityState === "hidden" || isFetching) return;
      isFetching = true;
      const startTime = performance.now();
      try {
        const res = await fetch(`/api/market/depth?symbol=${encodeURIComponent(activeCleanSym)}`, {
          signal: abortController.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.success && json?.data) {
            const elapsed = Math.max(12, Math.round(performance.now() - startTime));
            setLatencyMs(elapsed);
            setLiveDepth(json.data);

            const newPrice = Number(json.data.lastPrice);
            if (newPrice > 0 && prevPriceRef.current !== null && newPrice !== prevPriceRef.current) {
              setPriceFlash(newPrice > prevPriceRef.current ? "up" : "down");
              setTimeout(() => {
                if (isMounted) setPriceFlash(null);
              }, 500);
            }
            if (newPrice > 0) {
              prevPriceRef.current = newPrice;
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          // Fallback data remains seamlessly active
        }
      } finally {
        isFetching = false;
        if (isMounted) {
          timer = setTimeout(fetchLiveDepth, 2000);
        }
      }
    };

    fetchLiveDepth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isFetching) {
        clearTimeout(timer);
        fetchLiveDepth();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, activeCleanSym]);

  if (!isOpen || !activeStockMeta || !activeRadarData) return null;

  const isLiveSource = Boolean(liveDepth?.isLive);

  // Derive Bids & Asks from live depth or calibrated radar
  const bids = (liveDepth?.bids?.length > 0)
    ? liveDepth.bids.map((b) => ({ price: Number(b.price).toFixed(2), qty: Number(b.quantity), orders: b.orders }))
    : activeRadarData.bids;

  const asks = (liveDepth?.asks?.length > 0)
    ? liveDepth.asks.map((a) => ({ price: Number(a.price).toFixed(2), qty: Number(a.quantity), orders: a.orders }))
    : activeRadarData.asks;

  const totalBidQty = (liveDepth && Number(liveDepth.totalBuyQuantity) > 0)
    ? Number(liveDepth.totalBuyQuantity)
    : bids.reduce((acc, b) => acc + Number(b.qty || 0), 0);

  const totalAskQty = (liveDepth && Number(liveDepth.totalSellQuantity) > 0)
    ? Number(liveDepth.totalSellQuantity)
    : asks.reduce((acc, a) => acc + Number(a.qty || 0), 0);

  const totalDepthQty = Math.max(1, totalBidQty + totalAskQty);
  const bidRatioPct = Math.round((totalBidQty / totalDepthQty) * 100);
  const askRatioPct = 100 - bidRatioPct;

  const maxLevelQty = Math.max(
    ...bids.map((b) => Number(b.qty || 0)),
    ...asks.map((a) => Number(a.qty || 0)),
    1
  );

  const price = liveDepth?.lastPrice > 0 ? Number(liveDepth.lastPrice) : Number(activeStockMeta.price || 0);
  const change = (liveDepth?.netChange != null && liveDepth.netChange !== 0) ? Number(liveDepth.netChange) : Number(activeStockMeta.change || 0);
  const changePct = (liveDepth?.netChangePct != null && liveDepth.netChangePct !== 0) ? Number(liveDepth.netChangePct).toFixed(2) : (activeStockMeta.changePct || "0.0");
  const isGain = change >= 0;

  const displayVwap = liveDepth?.vwap > 0 ? Number(liveDepth.vwap).toFixed(2) : activeRadarData.vwap;
  const displayVolume = liveDepth?.volume > 0 ? `${(Number(liveDepth.volume) / 1000000).toFixed(2)}M` : activeRadarData.volumeShares;
  const displayTurnover = liveDepth?.volume > 0 && liveDepth?.vwap > 0
    ? `₹${((Number(liveDepth.volume) * Number(liveDepth.vwap)) / 10000000).toFixed(1)} Cr`
    : activeRadarData.turnoverCr;

  const bestBid = bids[0]?.price ? Number(bids[0].price) : 0;
  const bestAsk = asks[0]?.price ? Number(asks[0].price) : 0;
  const displaySpread = (bestAsk > 0 && bestBid > 0 && bestAsk >= bestBid)
    ? `₹${(bestAsk - bestBid).toFixed(2)}`
    : activeRadarData.spread;

  const modalJsx = (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-[32px] bg-[#0a0c12]/95 border border-white/10 backdrop-blur-3xl shadow-[0_24px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-5 relative text-slate-100 font-sans my-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-36 bg-cyan-500/[0.08] rounded-full blur-[80px] pointer-events-none -mt-16" />

        {/* 1. Header: Asset Identity, Live Quote, & Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/15"
              style={{ backgroundColor: `${activeStockMeta.color || "#00d5ff"}25` }}
            >
              {activeCleanSym.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black font-mono text-white tracking-tight">{activeCleanSym}</h3>
                
                {/* Intra-modal Symbol Traversal Controls */}
                {filteredSymbols.length > 1 && (
                  <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10 font-mono text-xs shadow-inner">
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={handlePrev}
                      className={clsx(
                        "p-1 rounded-md transition-all flex items-center justify-center cursor-pointer",
                        hasPrev
                          ? "text-slate-300 hover:text-white hover:bg-white/10 active:scale-95"
                          : "text-slate-600 cursor-not-allowed opacity-30"
                      )}
                      title="Previous Stock (← Arrow)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] px-1 font-bold text-slate-400">
                      {currentIndex + 1} / {filteredSymbols.length}
                    </span>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={handleNext}
                      className={clsx(
                        "p-1 rounded-md transition-all flex items-center justify-center cursor-pointer",
                        hasNext
                          ? "text-slate-300 hover:text-white hover:bg-white/10 active:scale-95"
                          : "text-slate-600 cursor-not-allowed opacity-30"
                      )}
                      title="Next Stock (→ Arrow)"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                  {activeRadarData.tier}
                </span>
                <span className={clsx(
                  "text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 shadow-sm transition-all",
                  isLiveSource 
                    ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "text-amber-300 bg-amber-500/15 border-amber-500/30"
                )}>
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isLiveSource ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                  <span>{isLiveSource ? `LIVE L2 · ${latencyMs ? `${latencyMs}ms` : "UPSTOX"}` : "CALIBRATED L2"}</span>
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {activeStockMeta.name} · <span className="text-slate-300">{activeStockMeta.sector}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={clsx(
              "text-right font-mono hidden sm:block p-1.5 px-2.5 rounded-xl transition-all duration-300 border border-transparent",
              priceFlash === "up" && "bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.4)]",
              priceFlash === "down" && "bg-rose-500/20 border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.4)]"
            )}>
              <div className="text-lg font-black text-white">₹{price.toFixed(2)}</div>
              <div className={clsx("text-xs font-bold flex items-center justify-end gap-0.5", isGain ? "text-emerald-400" : "text-rose-400")}>
                {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isGain ? "+" : ""}₹{Math.abs(change).toFixed(2)} ({isGain ? "+" : ""}{changePct}%)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Order Book Dominance Ratio Bar */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-bold">Buyers: {totalBidQty.toLocaleString("en-IN")} ({bidRatioPct}%)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-bold">
              Imbalance: <span className={clsx(bidRatioPct >= 50 ? "text-emerald-400" : "text-rose-400")}>{bidRatioPct >= 50 ? `+${bidRatioPct - 50}% Buy` : `+${50 - bidRatioPct}% Sell`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-400 font-bold">Sellers: {totalAskQty.toLocaleString("en-IN")} ({askRatioPct}%)</span>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
              style={{ width: `${bidRatioPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-l from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-300"
              style={{ width: `${askRatioPct}%` }}
            />
          </div>
        </div>

        {/* 3. Institutional 5-Level Market Depth Ladder */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono font-bold text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
              <span>BID DEPTH (BUY ORDER BOOK)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span>ASK DEPTH (SELL ORDER BOOK)</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Bid Side */}
            <div className="rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 overflow-hidden">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 bg-emerald-500/[0.06] border-b border-emerald-500/10">
                <span className="w-12 text-left">Orders</span>
                <span className="flex-1 text-right pr-2">Qty</span>
                <span className="w-20 text-right text-emerald-300">Bid Price</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {bids.map((b, i) => (
                  <div key={i} className="relative flex justify-between items-center px-3 py-1.5 text-[11px] hover:bg-emerald-500/10 transition-colors">
                    {/* Visual Depth Bar */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/[0.12] pointer-events-none transition-all duration-300"
                      style={{ width: `${Math.min(100, (Number(b.qty || 0) / maxLevelQty) * 100)}%` }}
                    />
                    <span className="w-12 text-left text-slate-400 text-[10px] relative z-10">{b.orders || "—"}</span>
                    <span className="flex-1 text-right pr-2 text-slate-200 font-bold relative z-10">
                      {Number(b.qty).toLocaleString("en-IN")}
                    </span>
                    <span className="w-20 text-right text-emerald-400 font-extrabold relative z-10">
                      ₹{b.price}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-emerald-500/[0.08] border-t border-emerald-500/20 text-[11px] font-bold">
                <span className="text-slate-300">Total Buy Qty</span>
                <span className="text-emerald-400 font-extrabold">{totalBidQty.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Ask Side */}
            <div className="rounded-2xl bg-rose-500/[0.03] border border-rose-500/20 overflow-hidden">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 bg-rose-500/[0.06] border-b border-rose-500/10">
                <span className="w-20 text-left text-rose-300">Ask Price</span>
                <span className="flex-1 text-left pl-2">Qty</span>
                <span className="w-12 text-right">Orders</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {asks.map((a, i) => (
                  <div key={i} className="relative flex justify-between items-center px-3 py-1.5 text-[11px] hover:bg-rose-500/10 transition-colors">
                    {/* Visual Depth Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-rose-500/[0.12] pointer-events-none transition-all duration-300"
                      style={{ width: `${Math.min(100, (Number(a.qty || 0) / maxLevelQty) * 100)}%` }}
                    />
                    <span className="w-20 text-left text-rose-400 font-extrabold relative z-10">
                      ₹{a.price}
                    </span>
                    <span className="flex-1 text-left pl-2 text-slate-200 font-bold relative z-10">
                      {Number(a.qty).toLocaleString("en-IN")}
                    </span>
                    <span className="w-12 text-right text-slate-400 text-[10px] relative z-10">{a.orders || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-rose-500/[0.08] border-t border-rose-500/20 text-[11px] font-bold">
                <span className="text-rose-400 font-extrabold">{totalAskQty.toLocaleString("en-IN")}</span>
                <span className="text-slate-300">Total Sell Qty</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Liquidity Radar Metrics Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-slate-400 block text-[10px]">VWAP (Weighted Avg)</span>
            <strong className="text-white text-sm">₹{displayVwap}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-slate-400 block text-[10px]">Bid-Ask Spread</span>
            <strong className="text-cyan-300 text-sm">{displaySpread}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-slate-400 block text-[10px]">Day Volume</span>
            <strong className="text-white text-sm">{displayVolume}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-slate-400 block text-[10px]">Turnover Value</span>
            <strong className="text-cyan-300 text-sm">{displayTurnover}</strong>
          </div>
        </div>

        {/* 5. Clean Institutional Dismiss Footer (Zero Trade CTAs) */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 font-mono text-xs flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Shield className={clsx("w-3.5 h-3.5", isLiveSource ? "text-emerald-400" : "text-cyan-400")} />
              {isLiveSource ? "Direct Upstox v2 L2 Feed Active · 5-Level Depth Ladder" : "Calibrated L2 Depth Model · Offline Fallback"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/10 text-slate-300">
              <kbd className="text-cyan-300 font-bold">←</kbd> <kbd className="text-cyan-300 font-bold">→</kbd> cycle stocks · <kbd className="text-cyan-300 font-bold">Esc</kbd> close
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm ml-auto"
          >
            Done (Esc)
          </button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalJsx, document.body) : null;
});
