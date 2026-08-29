import React from "react";
import clsx from "clsx";

export function MetricKpi({ icon, label, value, subtext, tone = "default", className }) {
  const toneClasses = {
    default: "border-white/5",
    gain: "border-emerald-500/20 text-emerald-400",
    loss: "border-rose-500/20 text-rose-400",
    cyan: "border-cyan-500/20 text-cyan-400",
    blue: "border-blue-500/20 text-blue-400",
  };

  const iconToneClasses = {
    default: "bg-slate-800/80 text-slate-300",
    gain: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    loss: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
    blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  };

  return (
    <div
      className={clsx(
        "apple-ceramic-card p-3.5 flex items-center gap-3.5",
        toneClasses[tone],
        className
      )}
    >
      {icon && (
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0", iconToneClasses[tone])}>
          {icon}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <strong className="text-xl font-extrabold tracking-tight text-white tabular-nums truncate">{value}</strong>
        {subtext && <small className="text-[11px] text-slate-400 font-medium truncate">{subtext}</small>}
      </div>
    </div>
  );
}
