import React from "react";
import clsx from "clsx";
import { Sliders } from "lucide-react";

export function RosettaExpectancyLab({
  calcRisk,
  setCalcRisk,
  calcRatio,
  setCalcRatio,
  calcWinRate,
  setCalcWinRate
}) {
  const simulatedTrades = 10;
  const winsCount = Math.round((calcWinRate / 100) * simulatedTrades);
  const lossCount = simulatedTrades - winsCount;
  const grossWins = winsCount * (calcRisk * calcRatio);
  const grossLoss = lossCount * calcRisk;
  const netExpectancy = grossWins - grossLoss;

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-black/80 border border-cyan-500/30 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <strong className="text-xs font-bold text-white">Interactive 1:3 R:R Expectancy Lab</strong>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          Live Math Simulator
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        See why you don&apos;t need to win every trade. Even with a <strong>{calcWinRate}% win rate</strong>, a 1:{calcRatio} ratio produces guaranteed positive compounding:
      </p>

      {/* Slider Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>Risk per Trade</span>
            <strong className="text-white">₹{calcRisk}</strong>
          </div>
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={calcRisk}
            onChange={(e) => setCalcRisk(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>Reward Ratio</span>
            <strong className="text-emerald-400">1:{calcRatio}</strong>
          </div>
          <input
            type="range"
            min="1.5"
            max="4"
            step="0.5"
            value={calcRatio}
            onChange={(e) => setCalcRatio(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>Win Rate</span>
            <strong className="text-cyan-400">{calcWinRate}%</strong>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            value={calcWinRate}
            onChange={(e) => setCalcWinRate(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Net Outcome Banner */}
      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
        <div className="text-slate-300 text-[11px]">
          10 Setups: <span className="text-emerald-400 font-bold">{winsCount} Wins (+₹{grossWins})</span> · <span className="text-rose-400 font-bold">{lossCount} Losses (-₹{grossLoss})</span>
        </div>
        <strong className={clsx("font-mono text-sm font-extrabold", netExpectancy >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {netExpectancy >= 0 ? "+" : ""}₹{netExpectancy.toLocaleString("en-IN")} Net
        </strong>
      </div>
    </div>
  );
}
