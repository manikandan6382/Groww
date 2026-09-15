export function resolveFlightScopeWindow(fromTime, exitTime, flightScope = 'scalp', trade = {}) {
  if (flightScope === 'scalp') {
    return {
      toTime: exitTime,
      scopeLabel: 'Active Scalp',
      subLabel: 'Entry to Exit',
      postSteps: 0
    };
  }

  const symbol = String(trade?.symbol || trade?.tradingsymbol || '').toUpperCase();
  const isSensex = symbol.includes('SENSEX');
  const targetDayOfWeek = isSensex ? 5 : 4; // 5 = Friday (BSE), 4 = Thursday (NSE)

  if (flightScope === 'day' || flightScope === 'expiry') {
    const d = new Date(fromTime);
    d.setHours(15, 30, 0, 0);
    let dayEnd = d.getTime();
    if (dayEnd <= fromTime) {
      dayEnd = Math.max(exitTime, fromTime + 4 * 3600 * 1000);
    }
    return {
      toTime: dayEnd,
      scopeLabel: 'Day Expiry',
      subLabel: 'Daily 15:30 IST Close',
      postSteps: 18
    };
  }

  if (flightScope === 'week') {
    if (trade?.expiryDatetime) {
      const expMs = new Date(trade.expiryDatetime).getTime();
      if (expMs > fromTime && expMs <= fromTime + 8 * 86400000) {
        return {
          toTime: expMs,
          scopeLabel: 'Weekly Expiry',
          subLabel: `Weekly Settlement (${trade.expiryDate || 'Active Week'})`,
          postSteps: 26
        };
      }
    }

    const d = new Date(fromTime);
    d.setHours(15, 30, 0, 0);
    const day = d.getDay();
    let diff = (targetDayOfWeek - day + 7) % 7;
    if (diff === 0 && d.getTime() <= fromTime) {
      diff = 7;
    }
    d.setDate(d.getDate() + diff);
    return {
      toTime: d.getTime(),
      scopeLabel: 'Weekly Expiry',
      subLabel: `${isSensex ? 'Friday' : 'Thursday'} 15:30 Settlement`,
      postSteps: 26
    };
  }

  if (flightScope === 'month') {
    const d = new Date(fromTime);
    const year = d.getFullYear();
    const month = d.getMonth();

    const lastDay = new Date(year, month + 1, 0, 15, 30, 0, 0);
    while (lastDay.getDay() !== targetDayOfWeek) {
      lastDay.setDate(lastDay.getDate() - 1);
    }

    let monthExp = lastDay.getTime();
    if (monthExp <= fromTime) {
      const nextMonthLastDay = new Date(year, month + 2, 0, 15, 30, 0, 0);
      while (nextMonthLastDay.getDay() !== targetDayOfWeek) {
        nextMonthLastDay.setDate(nextMonthLastDay.getDate() - 1);
      }
      monthExp = nextMonthLastDay.getTime();
    }

    return {
      toTime: monthExp,
      scopeLabel: 'Monthly Expiry',
      subLabel: `Month-End ${isSensex ? 'Friday' : 'Thursday'} 15:30`,
      postSteps: 34
    };
  }

  return {
    toTime: exitTime,
    scopeLabel: 'Active Scalp',
    subLabel: 'Entry to Exit',
    postSteps: 0
  };
}

export function formatTimelineLabel(timestampOrStr, isMultiDay = false) {
  if (!timestampOrStr) return '--:--';
  try {
    const s = String(timestampOrStr);
    const d = typeof timestampOrStr === 'number'
      ? new Date(timestampOrStr)
      : new Date(s.includes('+') || s.includes('Z') ? s : s + '+05:30');
    if (isMultiDay) {
      const datePart = d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short'
      });
      const timePart = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${datePart} ${timePart}`;
    }
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '--:--';
  }
}
