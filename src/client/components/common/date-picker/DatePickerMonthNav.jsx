import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DatePickerMonthNav({
  monthName,
  year,
  onPrevMonth,
  onNextMonth
}) {
  return (
    <div className="flex items-center justify-between px-2 pt-1">
      <button
        type="button"
        onClick={onPrevMonth}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <strong className="text-sm font-bold text-white tracking-wide">
        {monthName} {year}
      </strong>
      <button
        type="button"
        onClick={onNextMonth}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
