import React from "react";
import clsx from "clsx";

export function DatePickerGrid({
  startOffset,
  daysInMonth,
  currentYear,
  currentMonth,
  tempStart,
  tempEnd,
  onSelectDay
}) {
  const isDaySelected = (formatted) => {
    if (tempStart && tempEnd) {
      const d = new Date(formatted);
      return d >= new Date(tempStart) && d <= new Date(tempEnd);
    }
    return tempStart === formatted;
  };

  return (
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
          const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = isDaySelected(formatted);
          const isStart = tempStart === formatted;
          const isEnd = tempEnd === formatted;

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => onSelectDay(day)}
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
  );
}
