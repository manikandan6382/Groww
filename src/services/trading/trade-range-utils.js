export function getRangeWindow(range = "all", from, to, now = new Date()) {
  const end = to ? endOfDay(new Date(to)) : now;
  const start = new Date(end);

  if (range === "today") {
    return { start: startOfDay(end), end };
  }
  if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { start: startOfDay(start), end };
  }
  if (range === "month") {
    return { start: new Date(end.getFullYear(), end.getMonth(), 1), end };
  }
  if (range === "3m") {
    start.setMonth(start.getMonth() - 3);
    return { start: startOfDay(start), end };
  }
  if (range === "6m") {
    start.setMonth(start.getMonth() - 6);
    return { start: startOfDay(start), end };
  }
  if (range === "1y") {
    start.setFullYear(start.getFullYear() - 1);
    return { start: startOfDay(start), end };
  }
  if (range === "custom" && from) {
    return { start: startOfDay(new Date(from)), end };
  }

  return { start: null, end: null };
}

export function rangeLabel(range) {
  const labels = {
    today: "Today",
    week: "This week",
    month: "This month",
    "3m": "3 months",
    "6m": "6 months",
    "1y": "1 year",
    custom: "Custom range",
    all: "All trades",
  };
  return labels[range] || labels.all;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}
