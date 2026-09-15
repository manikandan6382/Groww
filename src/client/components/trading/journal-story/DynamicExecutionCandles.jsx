import React from "react";
import { Sparkles } from "lucide-react";

export function DynamicExecutionCandles({ trade, isGain }) {
  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const sl = Number(trade.stopLoss || entry * 0.9);
  const tp = Number(trade.targetPrice || entry * 1.1);

  return (
    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Execution Price Action &amp; Fill Markers
        </span>
        <span className="font-mono text-cyan-400">
          R:R Plan 1:{(Math.abs(tp - entry) / Math.max(0.1, Math.abs(entry - sl))).toFixed(2)}
        </span>
      </div>

      <div className="relative h-18 w-full flex items-center justify-between px-4 bg-slate-950/70 rounded-xl border border-white/5 overflow-hidden">
        {/* SVG Sparkline Candles */}
        <svg className="w-full h-full" viewBox="0 0 300 65" preserveAspectRatio="none">
          {/* Support / Resistance Dash Lines */}
          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(16,185,129,0.2)" strokeDasharray="2 2" />
          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(244,63,94,0.2)" strokeDasharray="2 2" />
          
          {/* Candle 1 (Setup) */}
          <line x1="40" y1="22" x2="40" y2="48" stroke="#64748b" strokeWidth="1.5" />
          <rect x="34" y="28" width="12" height="14" rx="2" fill="#334155" />

          {/* Candle 2 (Trigger / Entry) */}
          <line x1="100" y1="16" x2="100" y2="52" stroke="#10b981" strokeWidth="1.5" />
          <rect x="94" y="22" width="12" height="22" rx="2" fill="#10b981" fillOpacity="0.85" />

          {/* Candle 3 (Consolidation) */}
          <line x1="160" y1="18" x2="160" y2="50" stroke="#f43f5e" strokeWidth="1.5" />
          <rect x="154" y="26" width="12" height="16" rx="2" fill="#f43f5e" fillOpacity="0.85" />

          {/* Candle 4 (Momentum Wave) */}
          <line x1="220" y1="12" x2="220" y2="46" stroke="#10b981" strokeWidth="1.5" />
          <rect x="214" y="18" width="12" height="24" rx="2" fill="#10b981" fillOpacity="0.85" />

          {/* Candle 5 (Resolution / Fill) */}
          <line x1="275" y1="8" x2="275" y2="44" stroke={isGain ? "#10b981" : "#f43f5e"} strokeWidth="1.5" />
          <rect x="269" y={isGain ? "12" : "32"} width="12" height="18" rx="2" fill={isGain ? "#10b981" : "#f43f5e"} />

          {/* Entry Marker Dot */}
          <circle cx="100" cy="38" r="4" fill="#06b6d4" />

          {/* Exit Marker Dot */}
          <circle cx="275" cy={isGain ? "16" : "42"} r="4" fill={isGain ? "#10b981" : "#f43f5e"} />
        </svg>

        {/* Labels Overlay */}
        <div className="absolute left-18 bottom-1 text-[9px] font-mono text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 shadow-sm">
          🟢 BUY ₹{entry.toFixed(2)}
        </div>
        <div className="absolute right-3 top-1 text-[9px] font-mono text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/20 shadow-sm">
          {isGain ? "🔴 EXIT (TP) " : "🔴 EXIT (SL) "}₹{exit.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
