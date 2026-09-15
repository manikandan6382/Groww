import React from "react";
import { X, Layers, Zap } from "lucide-react";
import clsx from "clsx";
import { WatchlistEquityForm } from "./WatchlistEquityForm";
import { WatchlistOptionForm } from "./WatchlistOptionForm";

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
  optionLots,
  onExecuteEquity,
  onExecuteScalp,
  onTransferToPaperLab,
}) {
  if (!isOpen || !activeStockMeta) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg p-6 rounded-[28px] bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-5 animate-in zoom-in-95 duration-150 relative"
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
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  NSE Live
                </span>
              </div>
              <div className="text-xs text-slate-400">{activeStockMeta.name}</div>
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

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTradeTab("equity")}
            className={clsx(
              "py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer",
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
            onClick={() => setTradeTab("option")}
            className={clsx(
              "py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer",
              tradeTab === "option"
                ? "bg-white/[0.14] text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Option Scalp (ATM)</span>
          </button>
        </div>

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
          />
        ) : (
          <WatchlistOptionForm
            activeStockMeta={activeStockMeta}
            activeCleanSym={activeCleanSym}
            optionType={optionType}
            setOptionType={setOptionType}
            optionLots={optionLots}
            onExecuteScalp={onExecuteScalp}
            onTransferToPaperLab={onTransferToPaperLab}
          />
        )}
      </div>
    </div>
  );
});
