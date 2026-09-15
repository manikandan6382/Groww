import React from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatePickerState } from "./useDatePickerState";
import { DatePickerPresets } from "./DatePickerPresets";
import { DatePickerMonthNav } from "./DatePickerMonthNav";
import { DatePickerGrid } from "./DatePickerGrid";
import { DatePickerRangeInputs } from "./DatePickerRangeInputs";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function LuxuryDateRangePicker({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApplyRange,
}) {
  const {
    currentMonth,
    currentYear,
    tempStart,
    setTempStart,
    tempEnd,
    setTempEnd,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDay,
    handleQuickPreset,
    daysInMonth,
    startOffset
  } = useDatePickerState({ isOpen, onClose, startDate, endDate });

  if (!isOpen) return null;

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
          className="w-full max-w-md p-6 rounded-3xl bg-[#121424]/98 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 text-slate-100 backdrop-blur-2xl"
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
          <DatePickerPresets onSelectPreset={handleQuickPreset} />

          {/* Month Navigation Header */}
          <DatePickerMonthNav
            monthName={MONTH_NAMES[currentMonth]}
            year={currentYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Calendar Day Matrix */}
          <DatePickerGrid
            startOffset={startOffset}
            daysInMonth={daysInMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
            tempStart={tempStart}
            tempEnd={tempEnd}
            onSelectDay={handleSelectDay}
          />

          {/* Active Range Preview Inputs */}
          <DatePickerRangeInputs
            tempStart={tempStart}
            tempEnd={tempEnd}
            onStartChange={setTempStart}
            onEndChange={setTempEnd}
          />

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
