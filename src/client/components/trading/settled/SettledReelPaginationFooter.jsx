import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SettledReelPaginationFooter({
  totalReelMatches,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
  playAudio,
}) {
  if (totalReelMatches <= pageSize) return null;

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
            playAudio?.();
            onPageChange(Math.max(1, currentPage - 1));
          }}
          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition cursor-pointer flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => {
            playAudio?.();
            onPageChange(Math.min(totalPages, currentPage + 1));
          }}
          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition cursor-pointer flex items-center gap-1"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
