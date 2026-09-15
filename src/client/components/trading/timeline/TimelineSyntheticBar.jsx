import React from 'react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../../utils/soundEngine';

export function TimelineSyntheticBar({
  isVerifiedTicks,
  entryPrice,
  scenarioVariant,
  setScenarioVariant
}) {
  if (isVerifiedTicks) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2 my-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-[10.5px] font-mono text-zinc-300 overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span className="whitespace-nowrap">
          <strong>Simulated Market Movement:</strong> Demonstrating price path from entry (₹{entryPrice.toFixed(2)}) through peak excursion to exit.
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
        <span className="text-[9.5px] text-slate-400 uppercase font-bold whitespace-nowrap">Scenario Preset:</span>
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone?.();
            setScenarioVariant('rollercoaster');
          }}
          className={clsx(
            "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
            scenarioVariant === 'rollercoaster'
              ? "bg-white text-zinc-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          )}
          title="Simulate Peak Rally (100 -> 110) then Rollover into Stop Loss (90)"
        >
          🎢 Peak Roller-Coaster
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone?.();
            setScenarioVariant('direct');
          }}
          className={clsx(
            "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
            scenarioVariant === 'direct'
              ? "bg-white text-zinc-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          )}
          title="Simulate Direct Breakdown into Stop Loss"
        >
          ⚡ Direct Drop
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playTabSwitchTone?.();
            setScenarioVariant('target');
          }}
          className={clsx(
            "px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0",
            scenarioVariant === 'target'
              ? "bg-emerald-400 text-black font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          )}
          title="Simulate Trending Expansion into Target"
        >
          🚀 Target Run
        </button>
      </div>
    </div>
  );
}
