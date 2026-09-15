import React from "react";
import { X, ShieldCheck, DollarSign } from "lucide-react";

export const LiveCardInfoModal = ({
  isOpen,
  onClose,
  symbol,
  entry,
  currentLtp,
  quantity,
  lotSize,
  strategyTag,
  estimatedCharges,
  id
}) => {
  if (!isOpen) return null;

  const totalQty = quantity * lotSize;
  const buyTurnover = entry * totalQty;
  const sellTurnover = currentLtp * totalQty;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0;
  const stt = sellTurnover * 0.001;
  const exchange = totalTurnover * 0.000505;
  const gst = (brokerage + exchange) * 0.18;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0b101b] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Order Specification & Taxes</span>
            </h3>
            <p className="text-[11px] font-mono text-white/40">{symbol} · #{id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-white/40 text-[10px]">EXECUTION</div>
            <div className="text-slate-200 font-bold mt-0.5">{quantity} Lots ({totalQty} Qty)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-white/40 text-[10px]">STRATEGY</div>
            <div className="text-slate-200 font-bold mt-0.5">{strategyTag}</div>
          </div>
        </div>

        <div className="flex flex-col space-y-2 border-t border-white/5 pt-3">
          <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Statutory Friction Breakdown</span>
          </div>

          <div className="space-y-1.5 text-xs font-mono text-white/60">
            <div className="flex justify-between"><span>Brokerage (₹20 Buy + ₹20 Sell):</span><span className="text-slate-200">₹{brokerage.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>STT (0.1% on Option Sell):</span><span className="text-slate-200">₹{stt.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>NSE Exchange Turnover (0.05%):</span><span className="text-slate-200">₹{exchange.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>GST (18% on Brokerage + NSE):</span><span className="text-slate-200">₹{gst.toFixed(2)}</span></div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between font-bold text-amber-300"><span>Estimated Total Friction:</span><span>₹{estimatedCharges.toFixed(2)}</span></div>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer" type="button">
          Close Specification
        </button>
      </div>
    </div>
  );
};
