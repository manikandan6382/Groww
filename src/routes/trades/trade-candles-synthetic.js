export function computeFlightScopeToDate({ symbol, fromDate, toDate, toExpiry, flightScopeParam, expiryTimeStr }) {
  if (!toExpiry && flightScopeParam === "scalp") return toDate;
  if (expiryTimeStr) {
    const s = String(expiryTimeStr).trim();
    return s.includes("+") || s.includes("Z") ? new Date(s) : new Date(s + "+05:30");
  }
  const istDateStr = fromDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (flightScopeParam === "day" || flightScopeParam === "expiry") {
    return new Date(`${istDateStr}T15:30:00+05:30`);
  }
  if (flightScopeParam === "week") {
    const isSensex = symbol.toUpperCase().includes("SENSEX");
    const targetDay = isSensex ? 5 : 4; // 5=Friday (BSE), 4=Thursday (NSE)
    const d = new Date(fromDate);
    d.setHours(15, 30, 0, 0);
    let diff = (targetDay - d.getDay() + 7) % 7;
    if (diff === 0 && d.getTime() <= fromDate.getTime()) diff = 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  if (flightScopeParam === "month") {
    const isSensex = symbol.toUpperCase().includes("SENSEX");
    const targetDay = isSensex ? 5 : 4;
    const d = new Date(fromDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    const lastDay = new Date(y, m + 1, 0, 15, 30, 0, 0);
    while (lastDay.getDay() !== targetDay) lastDay.setDate(lastDay.getDate() - 1);
    if (lastDay.getTime() <= fromDate.getTime()) {
      const nextLastDay = new Date(y, m + 2, 0, 15, 30, 0, 0);
      while (nextLastDay.getDay() !== targetDay) nextLastDay.setDate(nextLastDay.getDate() - 1);
      return nextLastDay;
    }
    return lastDay;
  }
  return new Date(`${istDateStr}T15:30:00+05:30`);
}

export function synthesizeMicroCandles(m, fromTime, toTime, entryPrice, exitPrice) {
  const isWin = exitPrice >= entryPrice;
  return [
    {
      time: new Date(fromTime).toISOString(),
      timestamp: fromTime,
      open: m.open,
      high: m.open,
      low: m.open,
      close: entryPrice,
      volume: Math.round(m.volume / 3)
    },
    {
      time: new Date(Math.round((fromTime + toTime) / 2)).toISOString(),
      timestamp: Math.round((fromTime + toTime) / 2),
      open: entryPrice,
      high: m.high,
      low: m.low,
      close: isWin ? m.high : m.low,
      volume: Math.round(m.volume / 3)
    },
    {
      time: new Date(toTime).toISOString(),
      timestamp: toTime,
      open: isWin ? m.high : m.low,
      high: m.high,
      low: m.low,
      close: exitPrice,
      volume: Math.round(m.volume / 3)
    }
  ];
}

export function interpolateCandles({ fromTime, toTime, entryPrice, exitPrice, targetPrice, stopLoss, closeReason }) {
  const totalSteps = Math.max(10, Math.min(30, Math.round((toTime - fromTime) / 60000) || 12));
  const stepMs = (toTime - fromTime) / totalSteps;
  const isWin = exitPrice >= entryPrice;
  const isTarget = closeReason.includes("TARGET");
  const isStop = closeReason.includes("STOP");

  let peakPrice = Math.max(entryPrice, exitPrice);
  let dipPrice = Math.min(entryPrice, exitPrice);
  if (isTarget) {
    peakPrice = targetPrice ? Math.max(targetPrice, exitPrice) : exitPrice;
    dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.25 : entryPrice * 0.98;
  } else if (isStop) {
    peakPrice = targetPrice ? entryPrice + Math.abs(targetPrice - entryPrice) * 0.2 : entryPrice * 1.02;
    dipPrice = stopLoss ? Math.min(stopLoss, exitPrice) : exitPrice;
  } else {
    peakPrice = targetPrice ? entryPrice + Math.abs(targetPrice - entryPrice) * 0.45 : entryPrice * 1.03;
    dipPrice = stopLoss ? entryPrice - Math.abs(entryPrice - stopLoss) * 0.25 : entryPrice * 0.98;
  }

  const candles = [];
  for (let i = 0; i <= totalSteps; i++) {
    const progress = i / totalSteps;
    const t = fromTime + i * stepMs;
    let p;
    if (progress === 0) {
      p = entryPrice;
    } else if (progress === 1) {
      p = exitPrice;
    } else if (isWin) {
      if (progress < 0.25) {
        const sub = progress / 0.25;
        p = entryPrice - (entryPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
      } else {
        const sub = (progress - 0.25) / 0.75;
        p = dipPrice + (exitPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
      }
    } else {
      if (progress < 0.3) {
        const sub = progress / 0.3;
        p = entryPrice + (peakPrice - entryPrice) * Math.sin(sub * Math.PI * 0.5);
      } else {
        const sub = (progress - 0.3) / 0.7;
        p = peakPrice - (peakPrice - exitPrice) * Math.sin(sub * Math.PI * 0.5);
      }
    }
    const closeVal = Number(p.toFixed(2));
    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: closeVal,
      high: Number((closeVal + 0.3).toFixed(2)),
      low: Number((closeVal - 0.3).toFixed(2)),
      close: closeVal,
      volume: 1000
    });
  }
  return candles;
}
