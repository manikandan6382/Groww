import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export function LuxuryDateRangePicker({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApplyRange,
}) {
  const _now = new Date();
  const [currentMonth, setCurrentMonth] = useState(_now.getMonth()); // 0-indexed, real current month
  const [currentYear, setCurrentYear] = useState(_now.getFullYear());
  const _todayIso = _now.toISOString().split("T")[0];
  const [tempStart, setTempStart] = useState(startDate || _todayIso);
  const [tempEnd, setTempEnd] = useState(endDate || _todayIso);

  // Sync state when props change
  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate) setTempEnd(endDate);
  }, [startDate, endDate]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon

  // Align starting on Monday
  const startOffset = (firstDayOfWeek + 6) % 7;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(formatted);
      setTempEnd("");
    } else if (tempStart && !tempEnd) {
      if (new Date(formatted) < new Date(tempStart)) {
        setTempEnd(tempStart);
        setTempStart(formatted);
      } else {
        setTempEnd(formatted);
      }
    }
  };

  const isDaySelected = (day) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (tempStart && tempEnd) {
      const d = new Date(formatted);
      return d >= new Date(tempStart) && d <= new Date(tempEnd);
    }
    return tempStart === formatted;
  };

  const isRangeStart = (day) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tempStart === formatted;
  };

  const isRangeEnd = (day) => {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tempEnd === formatted;
  };

  const handleQuickPreset = (preset) => {
    const today = new Date();
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const todayStr = fmt(today);

    if (preset === "today") {
      setTempStart(todayStr);
      setTempEnd(todayStr);
    } else if (preset === "7days") {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      setTempStart(fmt(from));
      setTempEnd(todayStr);
    } else if (preset === "30days") {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      setTempStart(fmt(from));
      setTempEnd(todayStr);
    } else if (preset === "this_month") {
      const firstDay = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
      const lastDay = fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      setTempStart(firstDay);
      setTempEnd(lastDay);
    }
  };

  const handleApply = () => {
    if (tempStart) {
      onApplyRange(tempStart, tempEnd || tempStart);
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="w-full max-w-md p-6 rounded-3xl bg-[#070e1c]/98 border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.15)] space-y-4 text-slate-100 backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Custom Date Range</h3>
                <span className="text-[10px] text-slate-400">Select custom audit settlement interval</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Range Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
            {[
              { id: "today", label: "Today" },
              { id: "7days", label: "Last 7D" },
              { id: "30days", label: "Last 30D" },
              { id: "this_month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleQuickPreset(p.id)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 text-[11px] font-mono transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month Navigation Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <strong className="text-sm font-bold text-white tracking-wide">
              {monthNames[currentMonth]} {currentYear}
            </strong>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Day Matrix */}
          <div className="space-y-1">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Empty leading offsets */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = isDaySelected(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={clsx(
                      "h-8 rounded-lg font-mono text-xs font-semibold transition-all relative flex items-center justify-center cursor-pointer",
                      isSelected
                        ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                        : "hover:bg-white/10 text-slate-200",
                      (isStart || isEnd) && "ring-2 ring-white font-extrabold"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Range Preview Inputs */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Start Date</span>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">End Date</span>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply Date Filter</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export default LuxuryDateRangePicker;
