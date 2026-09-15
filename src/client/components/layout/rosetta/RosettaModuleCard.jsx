import React from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";

const BADGE_COLORS = {
  rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

export function RosettaModuleCard({ item, index, isExpanded, onToggle }) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={clsx(
        "rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer",
        isExpanded
          ? "bg-white/[0.04] border-cyan-500/40 shadow-xl shadow-cyan-500/5"
          : "bg-white/[0.02] border-white/5 hover:border-white/15"
      )}
      onClick={onToggle}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-white">{item.title}</h3>
              <span className={clsx("text-[9px] font-extrabold uppercase px-2 py-0.2 rounded border", BADGE_COLORS[item.badgeColor] || BADGE_COLORS.cyan)}>
                {item.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {item.kidAnalogy}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1 text-slate-400 hover:text-white rounded-lg flex-shrink-0 cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                <span>👶 The Kid Analogy:</span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {item.kidAnalogy}
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <strong className="text-white block">📈 Professional Financial Mechanism:</strong>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {item.proMeaning}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Actionable Rule for Consistent Profit:</span>
              </div>
              <p className="text-[11px] text-cyan-100 leading-relaxed font-medium">
                {item.goldenRule}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <span className="text-slate-500 font-sans font-bold text-[10px] uppercase">Example:</span>
              <span>{item.example}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
