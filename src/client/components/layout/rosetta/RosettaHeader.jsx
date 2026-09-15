import React from "react";
import clsx from "clsx";
import { BookOpen, X, Search } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All (16)" },
  { id: "basics", label: "👶 Basics & Orders" },
  { id: "options", label: "🚀 Options & Strikes" },
  { id: "math", label: "⏳ Greeks & Math" },
  { id: "risk", label: "🛡️ Risk & Discipline" },
];

export function RosettaHeader({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onClose
}) {
  return (
    <div className="space-y-4 pb-4 border-b border-white/10 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                Options &amp; Trading Master Guide
              </h2>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                16 Modules
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Explained so simply a kid can understand — institutional alpha for every trader.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search any term (e.g. Stop Loss, Theta, CE/PE, Delta, 1:3 Math)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Segmented Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={clsx(
              "px-3 py-1 rounded-lg font-bold transition text-xs whitespace-nowrap cursor-pointer",
              selectedCategory === cat.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
