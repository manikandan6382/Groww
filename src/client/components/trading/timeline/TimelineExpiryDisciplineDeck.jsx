import React from 'react';
import clsx from 'clsx';
import { formatTimeShort } from '../../../utils/tradeNormalizer';

export function TimelineExpiryDisciplineDeck({
  flightScope,
  trade,
  symbol,
  entryPrice,
  entryTime,
  exitPrice,
  exitTime,
  closeReason,
  executionDiscipline
}) {
  if (flightScope === 'scalp') return null;

  return (
    <div className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0a1120]/90 to-slate-900/90 border border-cyan-500/25 shadow-lg backdrop-blur-xl relative overflow-hidden font-mono">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
            flightScope === 'day' || flightScope === 'expiry'
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : flightScope === 'week'
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-violet-500/15 text-violet-300 border-violet-500/30"
          )}>
            {flightScope === 'day' || flightScope === 'expiry' ? 'Day Expiry Telemetry' : flightScope === 'week' ? 'Weekly Expiry Telemetry' : 'Monthly Expiry Telemetry'}
          </span>
          <span className="text-xs font-bold text-white">
            {symbol} · {flightScope === 'day' || flightScope === 'expiry' ? 'Daily Settlement 15:30 IST' : flightScope === 'week' ? `Weekly Expiry 15:30 IST (${trade?.expiryDate || "Active Week"})` : `Monthly Expiry 15:30 IST (${trade?.expiryDate || "Monthly Contract"})`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Terminal Spot:</span>
          <strong className="text-white font-bold">₹{Number(trade?.expirySpot || 24250).toLocaleString("en-IN")}</strong>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">Settlement Intrinsic:</span>
          <strong className={clsx("font-bold", trade?.terminalIntrinsic > 0 ? "text-emerald-400" : "text-rose-400")}>
            ₹{Number(trade?.terminalIntrinsic || 0).toFixed(2)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="text-[10px] text-slate-400 mb-0.5">1. Order Entry (Start)</div>
          <div className="text-sm font-black text-white">₹{entryPrice.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{formatTimeShort(entryTime)} · Fill Completed</div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="text-[10px] text-slate-400 mb-0.5">2. Realized Exit</div>
          <div className="text-sm font-black text-cyan-300">₹{exitPrice.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{formatTimeShort(exitTime)} · {closeReason.replace(/_/g, " ")}</div>
        </div>

        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="text-[10px] text-slate-400 mb-0.5">3. {flightScope === 'day' || flightScope === 'expiry' ? 'Day End Drift' : flightScope === 'week' ? 'Weekly Settlement Drift' : 'Monthly Settlement Drift'}</div>
          <div className="text-sm font-black text-slate-200">
            ₹{Number(trade?.terminalIntrinsic || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>{flightScope === 'day' || flightScope === 'expiry' ? '15:30 Settlement' : flightScope === 'week' ? 'Weekly Settlement' : 'Monthly Settlement'}</span>
            <span className={clsx("font-bold", Number(trade?.heldToExpiryPnl || 0) >= 0 ? "text-slate-300" : "text-slate-400")}>
              {Number(trade?.heldToExpiryPnl || 0) >= 0 ? "+" : ""}₹{Number(trade?.heldToExpiryPnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
          <div className="text-[10px] text-cyan-300 mb-0.5 flex items-center justify-between">
            <span>Execution Discipline</span>
            <span className={clsx("px-1.5 py-0.2 rounded text-[9.5px] font-black border", executionDiscipline.badgeClass)}>
              {executionDiscipline.grade}
            </span>
          </div>
          <div className="text-sm font-black text-white truncate">
            {executionDiscipline.label}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5 leading-tight line-clamp-1" title={executionDiscipline.detail}>
            {executionDiscipline.detail}
          </div>
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-200/90">
        <span className="text-cyan-400 font-bold shrink-0">🛡️ Anti-FOMO Guard:</span>
        <span className="leading-tight">
          Planned scalp target and stop boundaries were executed to plan. Post-exit terminal drift reflects {flightScope === 'day' || flightScope === 'expiry' ? 'intraday afternoon' : flightScope === 'week' ? 'weekly' : 'monthly'} gamma/theta decay, not missed profit.
        </span>
      </div>
    </div>
  );
}
