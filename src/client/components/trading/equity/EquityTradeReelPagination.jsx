import React from "react";

export function EquityTradeReelPagination({
  currentPage,
  totalPages,
  totalReelMatches,
  setReelPage,
  playScrubAudio
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2.5 mt-2 text-[11px] font-mono border-t border-white/[0.06] flex-wrap">
      <span className="text-slate-400">
        Showing page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({totalReelMatches} settled trades)
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => {
            playScrubAudio();
            setReelPage((p) => Math.max(1, p - 1));
          }}
          className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition cursor-pointer active:scale-95"
        >
          ← Prev
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => {
            playScrubAudio();
            setReelPage((p) => Math.min(totalPages, p + 1));
          }}
          className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 hover:text-white border border-cyan-400/30 text-xs font-bold transition cursor-pointer active:scale-95"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
