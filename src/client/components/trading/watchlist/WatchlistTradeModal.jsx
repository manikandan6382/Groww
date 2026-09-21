import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Zap, Shield, FlaskConical } from "lucide-react";
import clsx from "clsx";
import { WatchlistEquityForm } from "./WatchlistEquityForm";
import { WatchlistOptionForm } from "./WatchlistOptionForm";
import { soundEngine } from "../../../utils/soundEngine";

export const WatchlistTradeModal = React.memo(function WatchlistTradeModal({
  isOpen,
  onClose,
  activeStockMeta,
  activeCleanSym,
  tradeTab,
  setTradeTab,
  orderSide,
  setOrderSide,
  productType,
  setProductType,
  tradeQty,
  setTradeQty,
  optionType,
  setOptionType,
  optionLots = 1,
  setOptionLots,
  onExecuteEquity,
  onExecuteScalp,
  onTransferToPaperLab,
  currencySymbol = "₹",
  fxRate = 1,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeStockMeta) return null;

  const modalJsx = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="w-full max-w-lg p-6 sm:p-7 rounded-[32px] bg-[#0c0e14]/95 border border-white/12 backdrop-blur-3xl shadow-[0_24px_70px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-4 relative text-slate-100 font-sans my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-32 bg-cyan-500/[0.08] rounded-full blur-[70px] pointer-events-none -mt-12" />

          {/* 1. Header: Asset Meta & Dismiss */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/15 flex-shrink-0"
                style={{ backgroundColor: `${activeStockMeta.color || "#00d5ff"}25` }}
              >
                {activeCleanSym.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black font-mono text-white tracking-tight">{activeCleanSym}</h3>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                    NSE Live
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
                    {currencySymbol}{((activeStockMeta.price || 0) / fxRate).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{activeStockMeta.name} · {activeStockMeta.sector}</div>
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

          {/* 2. High-Contrast Practice Mode Badge */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/25 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span>ROUTING: VIRTUAL PRACTICE SANDBOX</span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>100% Risk Free Paper Capital</span>
            </span>
          </div>

          {/* 3. Instrument Switcher: Cash Delivery vs ATM Option Scalp */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTradeTab("equity");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                tradeTab === "equity"
                  ? "bg-white/[0.14] text-white border border-white/20 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Equity Shares (Cash)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTradeTab("option");
                soundEngine.playTabSwitchTone();
              }}
              className={clsx(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                tradeTab === "option"
                  ? "bg-white/[0.14] text-white border border-white/20 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Option Scalp (ATM)</span>
            </button>
          </div>

          {/* 4. Form Content */}
          {tradeTab === "equity" ? (
            <WatchlistEquityForm
              activeStockMeta={activeStockMeta}
              activeCleanSym={activeCleanSym}
              orderSide={orderSide}
              setOrderSide={setOrderSide}
              productType={productType}
              setProductType={setProductType}
              tradeQty={tradeQty}
              setTradeQty={setTradeQty}
              onExecute={onExecuteEquity}
              currencySymbol={currencySymbol}
              fxRate={fxRate}
            />
          ) : (
            <WatchlistOptionForm
              activeStockMeta={activeStockMeta}
              activeCleanSym={activeCleanSym}
              optionType={optionType}
              setOptionType={setOptionType}
              optionLots={optionLots}
              setOptionLots={setOptionLots}
              onExecuteScalp={onExecuteScalp}
              onTransferToPaperLab={onTransferToPaperLab}
            />
          )}

          {/* 5. Protective Invariant Badge */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/10">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>.NET 8 RMS Validated · Zero Unhedged Slippage</span>
            </span>
            <span className="text-slate-500">Esc to cancel</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalJsx, document.body) : null;
});
