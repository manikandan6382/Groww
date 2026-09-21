export function computeFlightScopeToDate({ symbol, fromDate, toDate, toExpiry, flightScopeParam, expiryTimeStr }) {
  if (!toExpiry && flightScopeParam === "scalp") return toDate;
  if (toDate && toDate.getTime() > fromDate.getTime()) {
    return toDate;
  }
  if (expiryTimeStr) {
    const s = String(expiryTimeStr).trim();
    return s.includes("+") || s.includes("Z") ? new Date(s) : new Date(s + "+05:30");
  }
  const istDateStr = fromDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (flightScopeParam === "day" || flightScopeParam === "expiry") {
    return new Date(`${istDateStr}T15:30:00+05:30`);
  }
  if (flightScopeParam === "week") {
    return new Date(fromDate.getTime() + 7 * 86400000);
  }
  if (flightScopeParam === "month") {
    return new Date(fromDate.getTime() + 30 * 86400000);
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
      volume: Math.round(m.volume / 3),
      isEntryPoint: true
    },
    {
      time: new Date(Math.round((fromTime + toTime) / 2)).toISOString(),
      timestamp: Math.round((fromTime + toTime) / 2),
      open: entryPrice,
      high: m.high,
      low: m.low,
      close: isWin ? m.high : m.low,
      volume: Math.round(m.volume / 3),
      isInTrade: true
    },
    {
      time: new Date(toTime).toISOString(),
      timestamp: toTime,
      open: isWin ? m.high : m.low,
      high: m.high,
      low: m.low,
      close: exitPrice,
      volume: Math.round(m.volume / 3),
      isExitPoint: true
    }
  ];
}

export function interpolateCandles({ fromTime, toTime, entryPrice, exitPrice, targetPrice, stopLoss, closeReason, tradeEntryTime, tradeExitTime }) {
  const totalSteps = Math.max(16, Math.min(60, Math.round((toTime - fromTime) / (15 * 60000)) || 24));
  const stepMs = (toTime - fromTime) / totalSteps;
  const isWin = exitPrice >= entryPrice;
  const isTarget = closeReason.includes("TARGET");
  const isStop = closeReason.includes("STOP");

  const entryMs = tradeEntryTime ? tradeEntryTime.getTime() : fromTime;
  const exitMs = tradeExitTime ? tradeExitTime.getTime() : toTime;

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

  const morningOpenPrice = entryPrice - (exitPrice - entryPrice) * 0.5;
  const candles = [];
  let prevClose = morningOpenPrice;

  for (let i = 0; i <= totalSteps; i++) {
    const t = fromTime + i * stepMs;
    const isEntryPoint = Math.abs(t - entryMs) <= stepMs / 2 || (i === 0 && entryMs <= fromTime);
    const isExitPoint = Math.abs(t - exitMs) <= stepMs / 2 || (i === totalSteps && exitMs >= toTime);
    const isPreEntry = t < entryMs - stepMs / 2;
    const isPostExit = t > exitMs + stepMs / 2;
    const isInTrade = !isPreEntry && !isPostExit;

    let p;
    if (isPreEntry) {
      const prog = (t - fromTime) / Math.max(1, entryMs - fromTime);
      p = morningOpenPrice + (entryPrice - morningOpenPrice) * Math.sin(prog * Math.PI * 0.5);
    } else if (isInTrade) {
      const prog = (t - entryMs) / Math.max(1, exitMs - entryMs);
      if (isWin) {
        if (prog < 0.25) {
          const sub = prog / 0.25;
          p = entryPrice - (entryPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
        } else {
          const sub = (prog - 0.25) / 0.75;
          p = dipPrice + (exitPrice - dipPrice) * Math.sin(sub * Math.PI * 0.5);
        }
      } else {
        if (prog < 0.3) {
          const sub = prog / 0.3;
          p = entryPrice + (peakPrice - entryPrice) * Math.sin(sub * Math.PI * 0.5);
        } else {
          const sub = (prog - 0.3) / 0.7;
          p = peakPrice - (peakPrice - exitPrice) * Math.sin(sub * Math.PI * 0.5);
        }
      }
    } else {
      const prog = (t - exitMs) / Math.max(1, toTime - exitMs);
      p = exitPrice * Math.sqrt(Math.max(0.01, 1 - prog * 0.8));
    }

    const closeVal = Number(p.toFixed(2));
    const openVal = Number((i === 0 ? closeVal : prevClose).toFixed(2));
    candles.push({
      time: new Date(t).toISOString(),
      timestamp: t,
      open: openVal,
      high: Number((Math.max(openVal, closeVal) + 0.25).toFixed(2)),
      low: Number((Math.min(openVal, closeVal) - 0.25).toFixed(2)),
      close: closeVal,
      volume: 1000 + (i % 5) * 350,
      isEntryPoint,
      isExitPoint,
      isPreEntry,
      isInTrade,
      isPostExit
    });
    prevClose = closeVal;
  }
  return candles;
}
