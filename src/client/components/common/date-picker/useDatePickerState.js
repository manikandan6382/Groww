import { useState, useEffect } from "react";

export function useDatePickerState({
  isOpen,
  onClose,
  startDate,
  endDate
}) {
  const _now = new Date();
  const [currentMonth, setCurrentMonth] = useState(_now.getMonth());
  const [currentYear, setCurrentYear] = useState(_now.getFullYear());
  const _todayIso = _now.toISOString().split("T")[0];
  const [tempStart, setTempStart] = useState(startDate || _todayIso);
  const [tempEnd, setTempEnd] = useState(endDate || _todayIso);

  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate) setTempEnd(endDate);
  }, [startDate, endDate]);

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

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;

  return {
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
  };
}
