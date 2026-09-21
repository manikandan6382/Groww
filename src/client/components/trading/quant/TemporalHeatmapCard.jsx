import React, { useState } from "react";
import clsx from "clsx";
import { Clock, Zap, AlertOctagon, Flame } from "lucide-react";
import { DAY_NAMES, TIME_SLOTS } from "./quantEdgeCalculations";

export function TemporalHeatmapCard({ heatmapData }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const { grid = [], goldenWindow, deadZone } = heatmapData || {};

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden transition-all duration-300 hover:border-white/[0.14]">
      {/* Ambient Radial Spotlight */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Temporal Alpha &amp; Session Heatmap</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                25 Time Windows
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-none pt-0.5">
              Identifies your high-edge "Golden Hours" vs capital-draining "Chop Trap Zones".
            </p>
          </div>
        </div>

        {/* Dynamic Golden vs Dead Zone Badges */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
          {goldenWindow && goldenWindow.netPnl > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              <Flame className="w-3 h-3 text-emerald-400" />
              <span>Golden: {goldenWindow.dayName.slice(0, 3)} {goldenWindow.slotLabel} (+₹{Math.round(goldenWindow.netPnl)})</span>
            </span>
          )}
          {deadZone && deadZone.netPnl < 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              <span>Dead Zone: {deadZone.dayName.slice(0, 3)} {deadZone.slotLabel} (-₹{Math.abs(Math.round(deadZone.netPnl))})</span>
            </span>
          )}
        </div>
      </div>

      {/* 2D Heatmap Grid Table */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          {/* Day of Week Column Headers */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-right pr-2 self-center">
              Session
            </div>
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-center text-[11px] font-mono font-black text-slate-300 uppercase tracking-wider py-1 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                {day.slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          {TIME_SLOTS.map((slot, slotIdx) => (
            <div key={slot.id} className="grid grid-cols-6 gap-2 mb-2 items-center">
              {/* Row Label */}
              <div className="text-right pr-2 leading-tight">
                <div className="text-[10px] font-mono font-bold text-slate-300">{slot.label}</div>
                <div className="text-[9px] text-slate-500 truncate">{slot.name}</div>
              </div>

              {/* Day Cells */}
              {DAY_NAMES.map((_, dayIdx) => {
                const cell = grid[dayIdx]?.[slotIdx];
                if (!cell) return <div key={dayIdx} className="h-14 rounded-xl bg-white/[0.01]" />;

                const hasTrades = cell.tradesCount > 0;
                const isProfitable = cell.netPnl > 0;
                const isLoss = cell.netPnl < 0;
                const isSelected = selectedCell?.dayIndex === dayIdx && selectedCell?.slotIndex === slotIdx;

                return (
                  <button
                    type="button"
                    key={dayIdx}
                    onClick={() => setSelectedCell(isSelected ? null : cell)}
                    className={clsx(
                      "h-14 p-2 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer text-left relative overflow-hidden group",
                      isSelected
                        ? "ring-2 ring-cyan-400 z-10 scale-[1.02]"
                        : "",
                      !hasTrades
                        ? "bg-white/[0.015] border-white/[0.04] text-slate-600 hover:bg-white/[0.03] hover:border-white/[0.08]"
                        : isProfitable
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 shadow-sm shadow-emerald-500/5"
                        : isLoss
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40 shadow-sm shadow-rose-500/5"
                        : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        {hasTrades ? `${cell.tradesCount} tr` : "—"}
                      </span>
                      {hasTrades && (
                        <span className={clsx(
                          "text-[8px] font-mono font-bold px-1 rounded",
                          isProfitable ? "bg-emerald-500/20 text-emerald-300" : isLoss ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-slate-400"
                        )}>
                          {Math.round(cell.winRate)}%
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs font-black truncate">
                      {hasTrades ? (
                        <span>{cell.netPnl >= 0 ? `+₹${Math.round(cell.netPnl)}` : `-₹${Math.abs(Math.round(cell.netPnl))}`}</span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-normal">No activity</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Cell Detail Inspector */}
      {selectedCell && (
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-bold">
              {selectedCell.dayName} · {selectedCell.slotLabel} ({selectedCell.slotName}):
            </span>
            <span className="text-slate-400">
              {selectedCell.tradesCount} Trades ({selectedCell.winsCount}W / {selectedCell.lossesCount}L)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Gross: <strong className="text-white">₹{Math.round(selectedCell.grossPnl)}</strong>
            </span>
            <span className="text-slate-400">
              Friction: <strong className="text-amber-400">₹{Math.round(selectedCell.totalFriction)}</strong>
            </span>
            <span className={clsx("font-black px-2 py-0.5 rounded", selectedCell.netPnl >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
              Net Take-Home: {selectedCell.netPnl >= 0 ? `+₹${Math.round(selectedCell.netPnl)}` : `-₹${Math.abs(Math.round(selectedCell.netPnl))}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemporalHeatmapCard;
