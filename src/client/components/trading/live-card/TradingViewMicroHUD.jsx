import React from "react";

export const TradingViewMicroHUD = ({ history = [100], isGain = true, ltp = 100 }) => {
  const pointsArray = (!history || history.length < 2) 
    ? [ltp - 0.25, ltp - 0.10, ltp + 0.15, ltp] 
    : history;
  const rawMin = Math.min(...pointsArray);
  const rawMax = Math.max(...pointsArray);
  const span = Math.max(0.35, rawMax - rawMin);
  const mid = (rawMax + rawMin) / 2;
  const min = mid - span / 2;
  const w = 50;
  const h = 22;
  const chartHeight = 15;
  const volumeHeight = 5;

  const chunkCount = 4;
  const chunkSize = Math.max(1, Math.floor(pointsArray.length / chunkCount));
  const candles = [];
  for (let i = 0; i < chunkCount; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === chunkCount - 1 ? pointsArray.length : (i + 1) * chunkSize;
    const slice = pointsArray.slice(startIdx, endIdx);
    if (slice.length === 0) continue;
    const open = slice[0];
    const close = slice[slice.length - 1];
    const sliceHigh = Math.max(...slice);
    const sliceLow = Math.min(...slice);
    const high = Math.max(sliceHigh, Math.max(open, close) + 0.05);
    const low = Math.min(sliceLow, Math.min(open, close) - 0.05);
    const isBull = close >= open;
    const volHeight = Math.min(volumeHeight, Math.max(1.5, (Math.abs(close - open) / span) * volumeHeight * 2.5 + 1.2));
    candles.push({ open, close, high, low, isBull, volHeight, idx: i });
  }

  const candleWidth = 7;
  const candleGap = (w - (candles.length * candleWidth)) / (candles.length - 1 || 1);
  const getY = (val) => chartHeight - ((val - min) / span) * (chartHeight - 4) - 2;

  const tvGreen = "#089981";
  const tvRed = "#F23645";
  const lastVal = pointsArray[pointsArray.length - 1];
  const lastY = getY(lastVal);
  const strokeColor = isGain ? tvGreen : tvRed;

  return (
    <div 
      title="TradingView Pro Live Micro-Candle & Volume Tape HUD"
      className="flex flex-col items-end flex-shrink-0 cursor-help"
    >
      <svg width={w} height={h} className="overflow-visible select-none">
        <line x1="0" y1={chartHeight / 2} x2={w} y2={chartHeight / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="1 2" />
        {candles.map((c, i) => {
          const cx = i * (candleWidth + candleGap) + candleWidth / 2;
          const openY = getY(c.open);
          const closeY = getY(c.close);
          const highY = getY(c.high);
          const lowY = getY(c.low);
          const bodyY = Math.min(openY, closeY);
          const bodyH = Math.max(1.5, Math.abs(closeY - openY));
          const color = c.isBull ? tvGreen : tvRed;

          return (
            <g key={`mc-${i}`}>
              <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
              <rect
                x={cx - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyH}
                fill={color}
                rx="1"
              />
              <rect
                x={cx - candleWidth / 2 + 1}
                y={h - c.volHeight}
                width={candleWidth - 2}
                height={c.volHeight}
                fill={color}
                opacity="0.5"
                rx="0.5"
              />
            </g>
          );
        })}
        <circle cx={w - 1} cy={lastY} r="2.2" fill={strokeColor} />
        <circle cx={w - 1} cy={lastY} r="4.5" fill="none" stroke={strokeColor} opacity="0.5" className="animate-ping" />
      </svg>
      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tight mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
        <span>TV TAPE</span>
      </div>
    </div>
  );
};
