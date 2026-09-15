import React from 'react';
import { Activity, FileText, Zap, Sun, Calendar, CalendarDays, CandlestickChart } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../../utils/soundEngine';
import { TimelineReplayTransport } from './TimelineReplayTransport';

export function TimelineControlToolbar({
  activeTab,
  setActiveTab,
  flightScope,
  setFlightScope,
  onSwitchFlightScope,
  chartMode,
  setChartMode,
  isMobile,
  allPoints = [],
  playback
}) {
  return (
    <div className="my-2.5 h-12 px-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      {/* Left Control Group: Primary Tabs & Dual Mode */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-8 flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
          <button
            type="button"
            onClick={() => { soundEngine.playTabSwitchTone?.(); setActiveTab('chart'); }}
            className={clsx(
              "h-6 px-3 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
              activeTab === 'chart' ? "bg-white text-zinc-950 font-black shadow-[0_2px_10px_rgba(255,255,255,0.3)]" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap font-bold text-xs">Flight Path</span>
          </button>
          <button
            type="button"
            onClick={() => { soundEngine.playTabSwitchTone?.(); setActiveTab('journal'); }}
            className={clsx(
              "h-6 px-3 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
              activeTab === 'journal' ? "bg-white text-zinc-950 font-black shadow-[0_2px_10px_rgba(255,255,255,0.3)]" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap font-bold text-xs">Trade Journal</span>
          </button>
        </div>

        {activeTab === 'chart' && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Scope Arc Toggle: Scalp vs Day vs Week vs Month */}
            <div className="h-8 flex items-center gap-0.5 sm:gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
              {[
                { id: 'scalp', label: isMobile ? 'S' : 'Scalp', Icon: Zap, color: 'bg-cyan-400' },
                { id: 'day', label: isMobile ? 'D' : 'Day', Icon: Sun, color: 'bg-amber-400' },
                { id: 'week', label: isMobile ? 'W' : 'Week', Icon: Calendar, color: 'bg-emerald-400' },
                { id: 'month', label: isMobile ? 'M' : 'Month', Icon: CalendarDays, color: 'bg-violet-400' }
              ].map(({ id, label, Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone?.();
                    setFlightScope(id);
                    if (typeof onSwitchFlightScope === 'function') onSwitchFlightScope(id);
                  }}
                  className={clsx(
                    "h-6 px-2 sm:px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                    flightScope === id || (id === 'day' && flightScope === 'expiry')
                      ? `${color} text-zinc-950 font-black shadow-sm`
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>

            {/* Spline vs Candles Toggle */}
            <div className="h-8 flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs font-mono shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => { soundEngine.playTabSwitchTone?.(); setChartMode('spline'); }}
                className={clsx(
                  "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                  chartMode === 'spline' ? "bg-white text-zinc-950 font-black shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Spline</span>
              </button>
              <button
                type="button"
                onClick={() => { soundEngine.playTabSwitchTone?.(); setChartMode('candles'); }}
                className={clsx(
                  "h-6 px-2.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
                  chartMode === 'candles' ? "bg-white text-zinc-950 font-black shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <CandlestickChart className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">Candles</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Control Group: Replay Transport Simulator */}
      {activeTab === 'chart' && (
        <TimelineReplayTransport allPoints={allPoints} playback={playback} />
      )}
    </div>
  );
}
