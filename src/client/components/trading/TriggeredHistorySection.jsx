import React, { useState, useRef } from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { LuxuryDateRangePicker } from "../common/LuxuryDateRangePicker";
import { RollingTicker } from "../common/RollingTicker";
import { 
  formatLocalDateTime, 
  getLocalDateKey, 
  calculateTradeDuration, 
  formatLocalTime12h 
} from "../../utils/dateUtils";
import { 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar as CalendarIcon, 
  Filter, 
  ShieldCheck,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

export function TriggeredHistorySection() {
  const { 
    closedAlerts, 
    paperLedgerFilter, 
    setPaperLedgerFilter,
    bulkAddJournalTrades 
  } = useTradingStore();

  const [dateRangeFilter, setDateRangeFilter] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Date Filtering — timezone-safe local calendar day comparison
  const dateFilteredAlerts = closedAlerts.filter((trade) => {
    const todayKey = getLocalDateKey();
    const tradeDate = getLocalDateKey(trade.exitDatetime || trade.entryDatetime);

    if (dateRangeFilter === "today") {
      return tradeDate === todayKey;
    }
    if (dateRangeFilter === "week") {
      const d = new Date();
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const startKey = getLocalDateKey(monday);
      const endKey = getLocalDateKey(sunday);
      return tradeDate >= startKey && tradeDate <= endKey;
    }
    if (dateRangeFilter === "month") {
      const d = new Date();
      const currentMonthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return tradeDate.startsWith(currentMonthPrefix);
    }
    if (dateRangeFilter === "custom") {
      if (!customStart) return true;
      if (customStart && !customEnd) return tradeDate >= customStart;
      return tradeDate >= customStart && tradeDate <= customEnd;
    }
    return true;
  });

  // 2. Outcome Filtering
  const filteredAlerts = dateFilteredAlerts.filter((trade) => {
    if (paperLedgerFilter === "win") return trade.netPnl > 0;
    if (paperLedgerFilter === "loss") return trade.netPnl <= 0;
    return true;
  });

  const totalRealizedPnl = filteredAlerts.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winCount = filteredAlerts.filter((t) => t.netPnl > 0).length;
  const lossCount = filteredAlerts.filter((t) => t.netPnl <= 0).length;

  const handleApplyCustomRange = (start, end) => {
    setCustomStart(start);
    setCustomEnd(end);
    setDateRangeFilter("custom");
  };

  const exportCsv = () => {
    const headers = ["Symbol", "OptionType", "EntryTime", "ExitTime", "EntryPrice", "ExitPrice", "StopLoss", "TargetPrice", "NetPnl", "CloseReason", "Strategy"];
    const rows = filteredAlerts.map((t) => [
      t.symbol,
      t.optionType,
      t.entryDatetime,
      t.exitDatetime,
      t.entryPrice,
      t.exitPrice,
      t.stopLoss,
      t.targetPrice,
      t.netPnl,
      t.closeReason,
      t.strategyTag || "Practice Scalp"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `portfoliox_practice_ledger_${dateRangeFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJsonBackup = () => {
    const jsonStr = JSON.stringify(closedAlerts, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfoliox_ledger_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (Array.isArray(parsed) && parsed.length > 0) {
          bulkAddJournalTrades(parsed);
          alert(`Successfully imported ${parsed.length} trades into your ledger!`);
        } else {
          alert("Invalid backup file: expected an array of trade records.");
        }
      } catch (err) {
        alert("Error parsing JSON backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const rangeLabel = dateRangeFilter === "today" 
    ? "Today" 
    : dateRangeFilter === "week" 
    ? "This Week" 
    : dateRangeFilter === "month" 
    ? "This Month" 
    : dateRangeFilter === "custom" 
    ? `${customStart} to ${customEnd}` 
    : "All Time";

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden min-h-[420px]">
      {/* Soft Ambient Radial Lighting Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Master Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap shadow-sm">
              AUDIT TRAIL &amp; SETTLEMENT LEDGER
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap shadow-sm">
              {filteredAlerts.length} of {closedAlerts.length} Closed Trades ({rangeLabel})
            </span>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap shadow-sm flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Real Statutory Friction (STT+GST) Active</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Triggered Trade History
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mt-1">
            Resolved practice executions, verified execution timestamps, and net realized P&amp;L after turnover-proportional friction.
          </p>
        </div>

        {/* Realized Stats */}
        <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[140px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Realized Net ({rangeLabel})</span>
            <strong className={clsx("font-mono text-sm sm:text-base font-black", totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {totalRealizedPnl >= 0 ? "+" : ""}₹{totalRealizedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[110px]">
            <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win / Stop Ratio</span>
            <strong className="font-mono text-sm sm:text-base font-black text-cyan-400">{winCount}W · {lossCount}L</strong>
          </div>
        </div>
      </div>

      {/* Toolbar: 2-Tier Filter Dock (Date Range + Outcome Filters + CSV Export) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pt-1">
        {/* Date Range Segmented Tabs + Calendar Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-shrink-0">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom", icon: CalendarIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = dateRangeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playTabSwitchTone();
                    setDateRangeFilter(tab.id);
                    if (tab.id === "custom") setCalendarOpen(true);
                  }}
                  className={clsx(
                    "relative px-3 py-1.5 rounded-xl font-bold transition-colors text-xs flex items-center gap-1.5 whitespace-nowrap z-10",
                    isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeHistoryTimeframePill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.25)] -z-10"
                    />
                  )}
                  {Icon && <Icon className="w-3 h-3 text-cyan-400" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* If Custom Date Range is active, show the active range pill with edit trigger */}
          {dateRangeFilter === "custom" && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setCalendarOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition shadow-sm"
            >
              <CalendarIcon className="w-3 h-3" />
              <span>{customStart} → {customEnd}</span>
              <span className="text-[10px] underline ml-1 font-sans">Edit</span>
            </button>
          )}
        </div>

        {/* Outcome Filter Tabs + CSV Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Outcome Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-xs flex-shrink-0">
            {[
              { id: "all", label: "All Setups", count: dateFilteredAlerts.length },
              { id: "win", label: "🎯 Winners", count: dateFilteredAlerts.filter(t => t.netPnl > 0).length },
              { id: "loss", label: "🛡️ Stops Cut", count: dateFilteredAlerts.filter(t => t.netPnl <= 0).length }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaperLedgerFilter(tab.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap text-xs",
                  paperLedgerFilter === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons: CSV + JSON Backup + JSON Restore */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* CSV Export Button */}
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
              title="Export CSV audit ledger for current range"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>

            {/* JSON Backup Button */}
            <button
              type="button"
              onClick={exportJsonBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
              title="Download full JSON forensic database backup"
            >
              <FileJson className="w-3.5 h-3.5 text-emerald-400" />
              <span>JSON Backup</span>
            </button>

            {/* JSON Restore Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
              title="Restore / Import JSON trade database"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Restore</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportJson} 
            />
          </div>
        </div>
      </div>

      {/* Luxury Financial Data Table with Max Height & Sticky Frosted Header */}
      <div className="min-h-[220px] max-h-[520px] overflow-y-auto overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-inner relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#060e1d]/95 backdrop-blur-xl border-b border-white/10 shadow-sm">
            <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="py-3.5 px-4 bg-[#060e1d]/90">Contract / Strike</th>
              <th className="py-3.5 px-3 bg-[#060e1d]/90">Entry Time</th>
              <th className="py-3.5 px-3 bg-[#060e1d]/90">End Time (Exit)</th>
              <th className="py-3.5 px-3 text-right bg-[#060e1d]/90">Entry (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#060e1d]/90">Exit (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#060e1d]/90">Target (₹)</th>
              <th className="py-3.5 px-3 text-right bg-[#060e1d]/90">Stop Loss (₹)</th>
              <th className="py-3.5 px-3 text-center bg-[#060e1d]/90">Close Reason</th>
              <th className="py-3.5 px-4 text-right bg-[#060e1d]/90">Realized Net P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-sans text-xs">
                  No practice trade records found for <strong className="text-white">{rangeLabel}</strong>.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((trade) => {
                const isGain = trade.netPnl >= 0;
                const isCE = trade.optionType === "CALL" || trade.symbol.includes("CE");
                const formattedEntryTime = formatLocalDateTime(trade.entryDatetime);
                const formattedExitTime = formatLocalDateTime(trade.exitDatetime || trade.entryDatetime);
                const duration = calculateTradeDuration(trade.entryDatetime, trade.exitDatetime, trade.duration);
                const entry = Number(trade.entryPrice || 0);
                const exit = Number(trade.exitPrice || 0);
                const pts = exit - entry;
                const pnlPct = entry > 0 ? (pts / entry) * 100 : 0;

                return (
                  <tr key={trade.id} className="hover:bg-white/[0.03] transition-colors group/row">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border shadow-sm",
                          isCE ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        )}>
                          {isCE ? "CE" : "PE"}
                        </span>
                        <div>
                          <strong className="text-white font-bold text-xs group-hover/row:text-cyan-300 transition-colors">
                            {trade.symbol}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-sans block">
                            {trade.strategyTag || "Practice Scalp"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                      <span>{formattedEntryTime}</span>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                      <span className="text-cyan-300 font-bold text-[11px] block">{formattedExitTime}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{duration}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right text-slate-300">
                      <RollingTicker value={Number(trade.entryPrice || 0)} prefix="₹" decimalPlaces={2} className="text-slate-300" />
                    </td>

                    <td className="py-3.5 px-3 text-right text-white font-bold">
                      <RollingTicker value={Number(trade.exitPrice || 0)} prefix="₹" decimalPlaces={2} className="text-white font-bold" />
                    </td>

                    <td className="py-3.5 px-3 text-right text-emerald-400 font-semibold">
                      <RollingTicker value={Number(trade.targetPrice || 0)} prefix="₹" decimalPlaces={2} className="text-emerald-400" />
                    </td>

                    <td className="py-3.5 px-3 text-right text-rose-400 font-semibold">
                      <RollingTicker value={Number(trade.stopLoss || 0)} prefix="₹" decimalPlaces={2} className="text-rose-400" />
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold border shadow-sm",
                        trade.closeReason === "TARGET_HIT" || isGain
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/25"
                      )}>
                        {isGain ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        <span>{trade.closeReason === "TARGET_HIT" ? "Target Hit" : "Stop Cut"}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className={clsx("text-sm font-black block tracking-tight", isGain ? "text-emerald-400" : "text-rose-400")}>
                        <RollingTicker 
                          value={Number(trade.netPnl || 0)} 
                          prefix="₹" 
                          showSign={true} 
                          decimalPlaces={2} 
                          className={isGain ? "text-emerald-400" : "text-rose-400"}
                        />
                      </div>
                      <span className={clsx("text-[10px] font-mono font-bold", isGain ? "text-emerald-400/80" : "text-rose-400/80")}>
                        {isGain ? "+" : ""}{pnlPct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Luxury Custom Date Range Picker Modal */}
      <LuxuryDateRangePicker
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={customStart}
        endDate={customEnd}
        onApplyRange={handleApplyCustomRange}
      />
    </div>
  );
}
