export function resolveFlightScopeWindow(fromTime, exitTime, flightScope = 'scalp', trade = {}) {
  const entryMs = new Date(trade?.entryDatetime || trade?.timestamp || fromTime || Date.now()).getTime();
  const exitMs = new Date(trade?.exitDatetime || trade?.closedAt || exitTime || entryMs).getTime();

  if (flightScope === 'scalp') {
    return {
      fromTime: entryMs,
      toTime: exitMs,
      scopeLabel: 'Active Scalp',
      subLabel: 'Entry to Exit',
      postSteps: 0,
      isMultiDay: false
    };
  }

  const d = new Date(entryMs);
  const istDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const marketOpen = new Date(`${istDateStr}T09:15:00+05:30`).getTime();
  const marketClose = new Date(`${istDateStr}T15:30:00+05:30`).getTime();
  const now = Date.now();
  const todayIstStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const isToday = (istDateStr === todayIstStr);

  // For Day session: 09:15 AM IST to now (if market is open today) or 15:30 IST close
  let dayToTime;
  if (isToday) {
    if (now < marketOpen) {
      dayToTime = marketOpen + 15 * 60000;
    } else if (now < marketClose) {
      dayToTime = Math.max(exitMs, now);
    } else {
      dayToTime = Math.max(exitMs, marketClose);
    }
  } else {
    dayToTime = Math.max(exitMs, marketClose);
  }

  if (flightScope === 'day' || flightScope === 'expiry') {
    return {
      fromTime: marketOpen,
      toTime: dayToTime,
      scopeLabel: 'Full Day Session',
      subLabel: '09:15 AM to 03:30 PM IST',
      postSteps: 24,
      isMultiDay: false
    };
  }

  if (flightScope === 'week') {
    // Last 1 Full Week: 7 calendar days anchored at 09:15 AM IST
    const weekTargetEnd = dayToTime;
    const sevenDaysAgo = new Date(weekTargetEnd - 7 * 86400000);
    const weekStartStr = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const weekFromTime = new Date(`${weekStartStr}T09:15:00+05:30`).getTime();

    return {
      fromTime: weekFromTime,
      toTime: weekTargetEnd,
      scopeLabel: 'Last 1 Week',
      subLabel: '7-Day Market Session Horizon',
      postSteps: 32,
      isMultiDay: true
    };
  }

  if (flightScope === 'month') {
    // Last 1 Full Month: 30 calendar days anchored at 09:15 AM IST
    const monthTargetEnd = dayToTime;
    const thirtyDaysAgo = new Date(monthTargetEnd - 30 * 86400000);
    const monthStartStr = thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const monthFromTime = new Date(`${monthStartStr}T09:15:00+05:30`).getTime();

    return {
      fromTime: monthFromTime,
      toTime: monthTargetEnd,
      scopeLabel: 'Last 1 Month',
      subLabel: '30-Day Market Session Horizon',
      postSteps: 40,
      isMultiDay: true
    };
  }

  return {
    fromTime: entryMs,
    toTime: exitMs,
    scopeLabel: 'Active Scalp',
    subLabel: 'Entry to Exit',
    postSteps: 0,
    isMultiDay: false
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
