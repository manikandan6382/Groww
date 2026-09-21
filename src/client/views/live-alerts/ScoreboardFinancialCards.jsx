import React from 'react';
import { ShieldCheck, ShieldAlert, TrendingUp, Wallet, Lock } from 'lucide-react';
import clsx from 'clsx';
import { RollingTicker } from '../../components/common/RollingTicker';

function MiniEquitySparkline({ points = [], isPositive = true }) {
  if (!points || points.length < 2) {
    return (
      <div className="h-6 w-full flex items-center my-1.5 opacity-40">
        <div className="w-full h-px bg-white/20 border-dashed border-t border-white/20" />
      </div>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 220;
  const height = 26;
  const padding = 2;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(" L ")}`;
  const areaD = `M 0,${height} L ${coords.join(" L ")} L ${width},${height} Z`;

  const strokeColor = isPositive ? "#2dd4bf" : "#fb7185";
  const gradId = isPositive ? "sparkGradCyan" : "sparkGradRose";

  return (
    <div className="h-6 w-full overflow-hidden relative my-1.5 pointer-events-none select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sparkGradRose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ScoreboardFinancialCards({
  startingCapital = 100000,
  currentAccountValue = 100000,
  netPnl = 0,
  pnlPct = "0.00",
  telemetry = {}
}) {
  const lossRunwayRemaining = telemetry.lossRunwayRemaining ?? 300;
  const lossRunwayPct = telemetry.lossRunwayPct ?? 100;
  const primeTradesRemaining = telemetry.primeTradesRemaining ?? 1;
  const sparklinePoints = telemetry.sparklinePoints ?? [startingCapital, currentAccountValue];
  const statutoryFrictionTotal = telemetry.statutoryFrictionTotal ?? 0;
  const frictionDragPct = telemetry.frictionDragPct ?? "0.0";
  const isDrawdown = netPnl < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {/* Card 1: Manikandan's Strict ₹300 Daily Loss Runway */}
      <div className={clsx(
        "p-5 sm:p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 relative overflow-hidden group shadow-lg",
        lossRunwayPct > 50
          ? "bg-white/[0.03] hover:bg-white/[0.05] border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : lossRunwayPct > 20
          ? "bg-gradient-to-b from-amber-500/[0.08] to-white/[0.02] border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.1),inset_0_1px_0_rgba(245,158,11,0.15)]"
          : "bg-gradient-to-b from-rose-500/[0.12] to-white/[0.02] border-rose-500/40 shadow-[0_10px_30px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(244,63,94,0.2)]"
      )}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Daily Loss Runway
            </span>
          </div>
          <span className={clsx(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1",
            lossRunwayPct > 50
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : lossRunwayPct > 20
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
              : "bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse"
          )}>
            <Lock className="w-2.5 h-2.5" />
            <span>₹300 Hard Cap</span>
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <div className={clsx(
            "text-xl sm:text-2xl font-black font-mono tracking-tight",
            lossRunwayPct > 50 ? "text-white" : lossRunwayPct > 20 ? "text-amber-300" : "text-rose-400"
          )}>
            <RollingTicker value={lossRunwayRemaining} prefix="₹" decimalPlaces={0} />
          </div>
          <span className="text-xs text-slate-400 font-mono">Safe Buffer</span>
        </div>

        {/* Dynamic Runway Health Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-3 mb-2">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              lossRunwayPct > 50
                ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                : lossRunwayPct > 20
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : "bg-gradient-to-r from-rose-500 to-red-500"
            )}
            style={{ width: `${Math.max(5, lossRunwayPct)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2 font-mono">
          <span>{lossRunwayPct}% of Daily Cap Safe</span>
          <span className={clsx("font-bold", primeTradesRemaining > 0 ? "text-cyan-400" : "text-rose-400")}>
            {primeTradesRemaining > 0 ? `${primeTradesRemaining} Prime Trade Buffer` : "At Risk (0 Trades)"}
          </span>
        </div>
      </div>

      {/* Card 2: Current Account Value & Intraday Sparkline */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-cyan-500/[0.08] to-white/[0.02] hover:from-cyan-500/[0.12] border border-cyan-500/25 backdrop-blur-xl shadow-[0_10px_30px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(6,182,212,0.2)] transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Account Valuation</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] group-hover:scale-105 transition-transform">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight block drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <RollingTicker value={currentAccountValue} prefix="₹" decimalPlaces={2} className="text-cyan-300" />
        </div>

        {/* Intraday Trajectory Micro-Sparkline */}
        <MiniEquitySparkline points={sparklinePoints} isPositive={!isDrawdown} />

        <div className="mt-1 flex items-center justify-between text-[11px] text-cyan-300/80 border-t border-cyan-500/15 pt-2">
          <span>Live Mark-to-Market</span>
          <span className="font-mono font-bold text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Upstox Stream
          </span>
        </div>
      </div>

      {/* Card 3: Net Profit / Loss & Statutory Friction Drag */}
      <div className={clsx(
        "p-5 sm:p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 relative overflow-hidden group border shadow-lg",
        netPnl >= 0
          ? "bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02] border-emerald-500/25 shadow-[0_10px_30px_rgba(16,185,129,0.1),inset_0_1px_0_rgba(16,185,129,0.2)]"
          : "bg-gradient-to-b from-rose-500/[0.08] to-white/[0.02] border-rose-500/25 shadow-[0_10px_30px_rgba(244,63,94,0.1),inset_0_1px_0_rgba(244,63,94,0.2)]"
      )}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Net Take-Home Alpha</span>
          <span className={clsx(
            "text-xs font-mono font-black px-2.5 py-0.5 rounded-full border shadow-sm",
            netPnl >= 0 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
          )}>
            {netPnl >= 0 ? "+" : ""}{pnlPct}%
          </span>
        </div>

        <div className={clsx(
          "text-xl sm:text-2xl font-black font-mono tracking-tight block",
          netPnl >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
        )}>
          <RollingTicker value={netPnl} prefix="₹" showSign={true} decimalPlaces={2} className={netPnl >= 0 ? "text-emerald-400" : "text-rose-400"} />
        </div>

        {/* Statutory Friction Drag Capsule */}
        <div className="mt-2.5 py-1 px-2 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">Statutory Drag:</span>
          <span className={clsx("font-bold", statutoryFrictionTotal > 0 ? "text-amber-300" : "text-slate-400")}>
            -₹{statutoryFrictionTotal.toFixed(0)} ({frictionDragPct}% drag)
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
          <span>Realized + Open MTM</span>
          <span className={clsx("font-mono font-bold", netPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {netPnl >= 0 ? "Profitable" : "In Drawdown"}
          </span>
        </div>
      </div>
    </div>
  );
}
