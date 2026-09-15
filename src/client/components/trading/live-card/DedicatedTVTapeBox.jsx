import React from "react";
import clsx from "clsx";

export const DedicatedTVTapeBox = ({ history = [100], isGain = true, ltp = 100, entry = 100 }) => {
  const pointsArray = (!history || history.length < 2) 
    ? [ltp - 0.40, ltp - 0.25, ltp - 0.10, ltp + 0.15, ltp] 
    : history;
  const rawMin = Math.min(...pointsArray);
  const rawMax = Math.max(...pointsArray);
  const span = Math.max(0.50, rawMax - rawMin);
  const mid = (rawMax + rawMin) / 2;
  const min = mid - span / 2;
  const max = mid + span / 2;
  
  const w = 840;
  const h = 54;
  const chartHeight = 38;
  const volumeHeight = 12;

  const chunkCount = 18;
  const chunkSize = Math.max(1, Math.floor(pointsArray.length / chunkCount));
  const candles = [];
  for (let i = 0; i < chunkCount; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === chunkCount - 1 ? pointsArray.length : (i + 1) * chunkSize;
    const slice = pointsArray.slice(startIdx, endIdx);
    if (slice.length === 0) continue;
    const open = slice[0];
    const close = slice[slice.length - 1];
    const high = Math.max(Math.max(...slice), Math.max(open, close) + 0.05);
    const low = Math.min(Math.min(...slice), Math.min(open, close) - 0.05);
    const isBull = close >= open;
    const volHeight = Math.min(volumeHeight, Math.max(2, (Math.abs(close - open) / span) * volumeHeight * 2.4 + 2));
    candles.push({ open, close, high, low, isBull, volHeight, idx: i });
  }

  const candleWidth = 14;
  const candleGap = (w - (candles.length * candleWidth)) / (candles.length - 1 || 1);
  const getY = (val) => chartHeight - ((val - min) / span) * (chartHeight - 8) - 4;

  const tvGreen = "#089981";
  const tvRed = "#F23645";
  const lastVal = pointsArray[pointsArray.length - 1];
  const lastY = getY(lastVal);
  const strokeColor = isGain ? tvGreen : tvRed;

  const bullCount = candles.filter(c => c.isBull).length;
  const biasLabel = bullCount >= 11 ? "STRONG BUY FLOW" : bullCount >= 9 ? "BUY IMPULSE" : bullCount <= 6 ? "SELL FLOW" : "BALANCED FLOW";
  const biasColor = bullCount >= 9 
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
    : bullCount <= 6 
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
      : "text-slate-300 bg-white/5 border-white/10";

  const recentDeltas = [];
  for (let i = Math.max(1, pointsArray.length - 5); i < pointsArray.length; i++) {
    const d = pointsArray[i] - pointsArray[i - 1];
    recentDeltas.push({ val: pointsArray[i], diff: d, isUp: d >= 0 });
  }

  const entryY = entry >= min && entry <= max ? getY(entry) : null;

  return (
    <div className="p-4 sm:p-5 flex flex-col space-y-3 bg-white/[0.015] border-t border-white/[0.06] relative overflow-hidden w-full">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
            <span className="text-[10px] font-mono font-black tracking-wider text-emerald-300 uppercase">TV TAPE · LIVE ORDER FLOW</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full hidden sm:inline">1s Tick Stream</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border", biasColor)}>{biasLabel}</span>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 bg-black/30 border border-white/5 px-2.5 py-0.5 rounded-full">
            <span className="text-slate-300 font-bold">₹{span.toFixed(2)} Span</span>
            <span className="text-white/20">|</span>
            <span>L: ₹{min.toFixed(2)}</span>
            <span className="text-white/20">|</span>
            <span>H: ₹{max.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="w-full relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 overflow-visible select-none">
          <line x1="0" y1={chartHeight / 2} x2={w} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
          {entryY !== null && (
            <g>
              <line x1="0" y1={entryY} x2={w} y2={entryY} stroke="rgba(56, 189, 248, 0.25)" strokeDasharray="2 3" />
              <text x={w - 6} y={entryY - 3} textAnchor="end" fill="rgba(56, 189, 248, 0.7)" fontSize="8" fontFamily="monospace" fontWeight="bold">Entry ₹{entry.toFixed(2)}</text>
            </g>
          )}
          {candles.map((c, i) => {
            const cx = i * (candleWidth + candleGap) + candleWidth / 2;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(2.5, Math.abs(closeY - openY));
            const color = c.isBull ? tvGreen : tvRed;
            return (
              <g key={`dtv-full-${i}`}>
                <line x1={cx} y1={getY(c.high)} x2={cx} y2={getY(c.low)} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                <rect x={cx - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyH} fill={color} rx="2" opacity="0.95" />
                <rect x={cx - candleWidth / 2 + 1.5} y={h - c.volHeight} width={candleWidth - 3} height={c.volHeight} fill={color} opacity="0.5" rx="1.5" />
              </g>
            );
          })}
          <line x1={w - 18} y1={lastY} x2={w} y2={lastY} stroke={strokeColor} strokeWidth="1" strokeDasharray="1 2" opacity="0.7" />
          <circle cx={w - 18} cy={lastY} r="3" fill={strokeColor} />
          <circle cx={w - 18} cy={lastY} r="7" fill="none" stroke={strokeColor} opacity="0.6" className="animate-ping" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-bold uppercase text-[9px]">Live Tape Prints:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {recentDeltas.map((r, idx) => (
              <span key={`rd-${idx}`} className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold border tabular-nums flex items-center gap-0.5", r.isUp ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20")}>
                <span>₹{r.val.toFixed(2)}</span>
                <span>{r.isUp ? "▲" : "▼"}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/40">
          <span>Ticks: <strong className="text-slate-300">{pointsArray.length}</strong></span>
          <span>Feed: <strong className="text-emerald-400">Upstox WebSocket</strong></span>
        </div>
      </div>
    </div>
  );
};
