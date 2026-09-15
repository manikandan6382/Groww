// Market Session Timestamp Generator: Clamps all multi-day simulated steps strictly to 09:15-15:30 IST, skipping weekends & nights
export function getMarketSessionTimestamps(fromMs, toMs, count) {
  if (count <= 1 || fromMs >= toMs) return [toMs];

  const curr = new Date(fromMs);
  const target = new Date(toMs);

  // Single-day span: direct linear time interpolation within session
  if (curr.toDateString() === target.toDateString()) {
    const step = (toMs - fromMs) / Math.max(1, count - 1);
    const ts = [];
    for (let i = 0; i < count; i++) {
      ts.push(Math.round(fromMs + i * step));
    }
    return ts;
  }

  // Multi-day market hours distributor: collect active trading dates (Mon-Fri)
  const tradingDays = [];
  const d = new Date(curr);
  d.setHours(0, 0, 0, 0);
  const endD = new Date(target);
  endD.setHours(0, 0, 0, 0);

  while (d.getTime() <= endD.getTime()) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      tradingDays.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }

  if (tradingDays.length <= 1) {
    const step = (toMs - fromMs) / Math.max(1, count - 1);
    const ts = [];
    for (let i = 0; i < count; i++) {
      ts.push(Math.round(fromMs + i * step));
    }
    return ts;
  }

  const result = [];
  for (let i = 0; i < count; i++) {
    const progress = i / Math.max(1, count - 1);
    const dayProgress = progress * (tradingDays.length - 1);
    const dayIdx = Math.min(tradingDays.length - 1, Math.floor(dayProgress));
    const intraDayProgress = dayProgress - dayIdx;

    const sessionDay = new Date(tradingDays[dayIdx]);
    let minMinute = 555; // 09:15 IST
    let maxMinute = 930; // 15:30 IST

    if (dayIdx === 0) {
      const currMin = curr.getHours() * 60 + curr.getMinutes();
      minMinute = Math.max(555, Math.min(925, currMin));
    }
    if (dayIdx === tradingDays.length - 1) {
      const targetMin = target.getHours() * 60 + target.getMinutes();
      maxMinute = Math.max(560, Math.min(930, targetMin));
    }
    if (minMinute >= maxMinute) maxMinute = Math.min(930, minMinute + 15);

    const minuteOfDay = minMinute + intraDayProgress * (maxMinute - minMinute);
    const hours = Math.floor(minuteOfDay / 60);
    const mins = Math.floor(minuteOfDay % 60);

    sessionDay.setHours(hours, mins, 0, 0);
    result.push(sessionDay.getTime());
  }

  return result;
}
