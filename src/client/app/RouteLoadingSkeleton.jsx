import React from "react";

/**
 * 🌟 Sleek Glassmorphism Route Loading Skeleton
 */
export function RouteLoadingSkeleton() {
  return (
    <div className="w-full space-y-5 animate-pulse py-2" role="status" aria-label="Loading view">
      {/* Top Banner Skeleton */}
      <div className="h-20 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="w-36 h-4 rounded bg-white/10" />
            <div className="w-24 h-2.5 rounded bg-white/5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 rounded-xl bg-white/5" />
          <div className="w-20 h-8 rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Bento Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/5 p-4 space-y-2.5">
            <div className="w-20 h-3 rounded bg-white/10" />
            <div className="w-28 h-6 rounded bg-white/10" />
            <div className="w-36 h-2.5 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Main Panel Skeleton */}
      <div className="h-80 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-40 h-4 rounded bg-white/10" />
          <div className="w-24 h-3 rounded bg-white/5" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
          <div className="w-full h-10 rounded-xl bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}
