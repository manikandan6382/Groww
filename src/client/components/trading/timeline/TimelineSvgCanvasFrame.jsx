import React from 'react';
import { TimelineSvgCanvas } from './TimelineSvgCanvas';

export function TimelineSvgCanvasFrame({
  coords,
  diagnostics,
  scrubber,
  activeReplayIndex,
  renderedPoints,
  trade,
  entryPrice,
  exitPrice,
  netZeroPrice,
  flightScope,
  chartMode,
  isLoading
}) {
  return (
    <div
      className="relative rounded-3xl bg-[#04060e]/85 border border-white/[0.08] p-2 sm:p-3 shadow-inner backdrop-blur-2xl overflow-hidden cursor-crosshair group my-1 select-none touch-none"
      style={{ touchAction: 'none' }}
      onMouseMove={scrubber.handleMouseMove}
      onClick={scrubber.handleClickCanvas}
      onMouseLeave={scrubber.handleEndScrub}
      onTouchStart={scrubber.handleTouch}
      onTouchMove={scrubber.handleTouch}
      onTouchEnd={scrubber.handleEndScrub}
    >
      {isLoading ? (
        <div className="h-56 flex items-center justify-center gap-3 text-xs font-mono text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>Streaming intraday trade lifecycle candles...</span>
        </div>
      ) : (
        <TimelineSvgCanvas
          coords={coords}
          diagnostics={diagnostics}
          scrubber={scrubber}
          activeReplayIndex={activeReplayIndex}
          renderedPoints={renderedPoints}
          trade={trade}
          entryPrice={entryPrice}
          exitPrice={exitPrice}
          netZeroPrice={netZeroPrice}
          flightScope={flightScope}
          chartMode={chartMode}
        />
      )}
    </div>
  );
}
