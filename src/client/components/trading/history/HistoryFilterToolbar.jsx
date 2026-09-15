import React, { useRef } from "react";
import { RotateCcw, Download, Upload, FileJson, Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const HistoryFilterToolbar = ({
  assetFilter = "ALL",
  setAssetFilter,
  allCount = 0,
  niftyCount = 0,
  bankCount = 0,
  sensexCount = 0,
  dateRangeFilter = "all",
  setDateRangeFilter,
  paperLedgerFilter = "all",
  setPaperLedgerFilter,
  onOpenCalendar,
  onResetFilters,
  onExportCsv,
  onExportJson,
  onImportJson
}) => {
  const fileInputRef = useRef(null);

  return (
    <div className="flex flex-col space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
      {/* Row 1: Asset Tabs + Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Asset Segments */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
          {[
            { id: "ALL", label: "ALL", count: allCount },
            { id: "NIFTY", label: "NIFTY", count: niftyCount },
            { id: "BANKNIFTY", label: "BANKNIFTY", count: bankCount },
            { id: "SENSEX", label: "SENSEX", count: sensexCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setAssetFilter(tab.id);
              }}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                assetFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              type="button"
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Export & Restore Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Export CSV audit ledger"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Download JSON forensic backup"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Restore JSON trade backup"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImportJson}
          />

          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs transition cursor-pointer"
              title="Reset all filters"
              type="button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Timeframe Pills + Outcome Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
        {/* Timeframe Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 overflow-x-auto">
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "custom", label: "Custom", icon: CalendarIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = dateRangeFilter === tab.id;
            return (
              <button
                key={`timeframe-${tab.id}`}
                type="button"
                onClick={() => {
                  soundEngine.playTabSwitchTone();
                  setDateRangeFilter(tab.id);
                  if (tab.id === "custom") onOpenCalendar?.();
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {Icon && <Icon className="w-3 h-3 text-cyan-400" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Outcome Classification Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
          {[
            { id: "all", label: "All Outcomes" },
            { id: "win", label: "Wins" },
            { id: "loss", label: "Losses" },
            { id: "friction", label: "BE / Drag" }
          ].map((tab) => (
            <button
              key={`outcome-${tab.id}`}
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setPaperLedgerFilter(tab.id);
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer",
                paperLedgerFilter === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
