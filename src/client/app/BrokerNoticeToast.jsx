import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BrokerNoticeToast({ brokerNotice, onClose }) {
  return (
    <AnimatePresence>
      {brokerNotice && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl bg-[#121424]/95 backdrop-blur-2xl border border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.35)] flex items-center gap-3.5 text-xs text-white"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-white flex items-center gap-2">
              <span>{brokerNotice.broker} Connected</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE DEMAT
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">{brokerNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
