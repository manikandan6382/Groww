import React from 'react';
import { SkipBack, Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

export function TimelineReplayTransport({
  allPoints = [],
  playback
}) {
  const { isPlaying, replayIndex, replaySpeed, setReplaySpeed, handleTogglePlay, handleResetReplay, handleStepForward, handleStepBack } = playback;

  return (
    <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 shadow-inner shrink-0">
      <button
        type="button"
        onClick={handleStepBack}
        disabled={replayIndex === 0}
        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title="Step Backward (Previous Candle)"
      >
        <SkipBack className="w-3.5 h-3.5 shrink-0" />
      </button>

      <button
        type="button"
        onClick={handleTogglePlay}
        className={clsx(
          "h-6 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95",
          isPlaying ? "bg-emerald-500 text-black font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 shadow-sm"
        )}
      >
        {isPlaying ? <><Pause className="w-3 h-3 text-black shrink-0" /><span className="whitespace-nowrap">Pause</span></> : <><Play className="w-3 h-3 shrink-0" /><span className="whitespace-nowrap">Replay</span></>}
      </button>

      <button
        type="button"
        onClick={handleStepForward}
        disabled={replayIndex === allPoints.length - 1}
        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        title="Step Forward (Next Candle)"
      >
        <SkipForward className="w-3.5 h-3.5 shrink-0" />
      </button>

      <button
        type="button"
        onClick={handleResetReplay}
        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 shrink-0"
        title="Reset to Full Trajectory"
      >
        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
      </button>

      <div className="flex items-center gap-0.5 ml-1 border-l border-white/10 pl-1 h-5">
        {[1, 2, 4].map((spd) => (
          <button
            key={spd}
            type="button"
            onClick={() => setReplaySpeed(spd)}
            className={clsx(
              "h-5 px-1.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 shrink-0",
              replaySpeed === spd ? "bg-white text-zinc-950 font-black shadow-sm" : "hover:text-white text-zinc-400"
            )}
          >
            {spd}x
          </button>
        ))}
      </div>
    </div>
  );
}
