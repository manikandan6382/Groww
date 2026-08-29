import React, { useState } from "react";
import { CheckCircle, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

export function AlertFeed({ alerts = [] }) {
  const [filter, setFilter] = useState("all");

  const filtered = alerts.filter((a) => {
    if (filter === "active") return a.status === "OPEN";
    if (filter === "triggered") return a.status === "CLOSED" || a.status === "TRIGGERED";
    return true;
  });

  return (
    <div className="apple-ceramic-card p-4 space-y-3 flex flex-col h-full">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Alert Event Stream</h3>
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setFilter("all")}
            className={clsx(
              "px-2 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={clsx(
              "px-2 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "active" ? "bg-white/10 text-cyan-400" : "text-slate-400 hover:text-white"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("triggered")}
            className={clsx(
              "px-2 py-0.5 text-[10px] font-bold rounded-md transition",
              filter === "triggered" ? "bg-white/10 text-emerald-400" : "text-slate-400 hover:text-white"
            )}
          >
            Done
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px] max-h-[420px]">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Clock className="w-6 h-6 text-slate-600" />
            <span className="text-xs">No alerts in this category yet</span>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isWin = Number(item.netPnl || 0) >= 0;
            const isCall = item.optionType === "CALL";
            return (
              <div
                key={item.id || idx}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                      item.status === "OPEN"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : isWin
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    )}
                  >
                    {isCall ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{item.symbol}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Entry: ₹{Number(item.entryPrice || 0).toFixed(1)} · {item.status || "OPEN"}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {item.netPnl !== undefined ? (
                    <strong className={clsx("text-xs font-mono font-bold tabular-nums block", isWin ? "text-emerald-400" : "text-rose-400")}>
                      {isWin ? "+" : ""}₹{Number(item.netPnl).toFixed(0)}
                    </strong>
                  ) : (
                    <span className="text-[10px] text-cyan-400 font-bold">WATCHING</span>
                  )}
                  <small className="text-[9px] text-slate-500 block">
                    {item.closedAt ? new Date(item.closedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
                  </small>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
