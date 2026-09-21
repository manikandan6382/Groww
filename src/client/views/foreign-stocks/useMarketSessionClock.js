import { useState, useEffect, useMemo } from "react";

// ─── Module Constants & Helpers ──────────────────────────────────────────────
const NY_TIMEZONE = "America/New_York";
const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Formats a Date object into parts according to a target IANA timezone.
 */
function getTimezoneParts(date, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const lookup = {};
    for (const p of parts) {
      lookup[p.type] = p.value;
    }
    return {
      weekday: lookup.weekday, // "Mon", "Tue", etc.
      hour: parseInt(lookup.hour, 10),
      minute: parseInt(lookup.minute, 10),
      second: parseInt(lookup.second, 10),
      day: parseInt(lookup.day, 10),
      month: parseInt(lookup.month, 10),
      year: parseInt(lookup.year, 10),
    };
  } catch {
    return {
      weekday: "Mon",
      hour: date.getUTCHours() - 4,
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      day: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
    };
  }
}

/**
 * Computes market session phase, progress, and countdown for New York equities.
 */
function calculateSessionInfo(nyParts) {
  const { weekday, hour, minute, second } = nyParts;
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const currentTotalSeconds = hour * 3600 + minute * 60 + second;

  // Session Boundaries in Seconds from midnight
  const PRE_START = 4 * 3600; // 04:00 AM
  const REG_START = 9 * 3600 + 30 * 60; // 09:30 AM
  const REG_END = 16 * 3600; // 04:00 PM
  const POST_END = 20 * 3600; // 08:00 PM

  if (isWeekend) {
    return {
      phase: "closed",
      phaseTitle: "Weekend Intermission",
      isRegularOpen: false,
      badgeColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
      statusDot: "bg-amber-400",
      countdownText: "Opens Monday 09:30 AM EST",
      progressPct: 0,
      description: "US equity exchanges are closed for the weekend.",
    };
  }

  // 1. Regular Trading Session (9:30 AM - 4:00 PM EST)
  if (currentTotalSeconds >= REG_START && currentTotalSeconds < REG_END) {
    const elapsed = currentTotalSeconds - REG_START;
    const duration = REG_END - REG_START; // 6.5 hours = 23,400s
    const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const remainingSecs = REG_END - currentTotalSeconds;
    const remHours = Math.floor(remainingSecs / 3600);
    const remMins = Math.floor((remainingSecs % 3600) / 60);

    return {
      phase: "regular",
      phaseTitle: "Regular Session Active",
      isRegularOpen: true,
      badgeColor: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
      statusDot: "bg-emerald-400 animate-pulse",
      countdownText: `Closes in ${remHours}h ${remMins}m`,
      progressPct: Math.round(pct),
      description: "NYSE & NASDAQ live continuous trading session.",
    };
  }

  // 2. Pre-Market Session (4:00 AM - 9:30 AM EST)
  if (currentTotalSeconds >= PRE_START && currentTotalSeconds < REG_START) {
    const elapsed = currentTotalSeconds - PRE_START;
    const duration = REG_START - PRE_START; // 5.5 hours = 19,800s
    const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const remainingSecs = REG_START - currentTotalSeconds;
    const remHours = Math.floor(remainingSecs / 3600);
    const remMins = Math.floor((remainingSecs % 3600) / 60);

    return {
      phase: "pre",
      phaseTitle: "US Pre-Market Trading",
      isRegularOpen: false,
      badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
      statusDot: "bg-cyan-400 animate-pulse",
      countdownText: `Opening in ${remHours > 0 ? `${remHours}h ` : ""}${remMins}m`,
      progressPct: Math.round(pct),
      description: "Institutional order matching & early earnings reactions.",
    };
  }

  // 3. After-Hours Session (4:00 PM - 8:00 PM EST)
  if (currentTotalSeconds >= REG_END && currentTotalSeconds < POST_END) {
    const elapsed = currentTotalSeconds - REG_END;
    const duration = POST_END - REG_END; // 4 hours = 14,400s
    const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const remainingSecs = POST_END - currentTotalSeconds;
    const remHours = Math.floor(remainingSecs / 3600);
    const remMins = Math.floor((remainingSecs % 3600) / 60);

    return {
      phase: "post",
      phaseTitle: "US After-Hours Session",
      isRegularOpen: false,
      badgeColor: "text-purple-300 bg-purple-500/15 border-purple-500/30",
      statusDot: "bg-purple-400",
      countdownText: `Post-market ends in ${remHours}h ${remMins}m`,
      progressPct: Math.round(pct),
      description: "Post-closing bell order books & earnings release trading.",
    };
  }

  // 4. Overnight / Off-Hours
  let secondsUntilPre;
  if (currentTotalSeconds < PRE_START) {
    secondsUntilPre = PRE_START - currentTotalSeconds;
  } else {
    secondsUntilPre = 24 * 3600 - currentTotalSeconds + PRE_START;
  }
  const remHours = Math.floor(secondsUntilPre / 3600);
  const remMins = Math.floor((secondsUntilPre % 3600) / 60);

  return {
    phase: "closed",
    phaseTitle: "Overnight Intermission",
    isRegularOpen: false,
    badgeColor: "text-slate-300 bg-white/[0.04] border-white/10",
    statusDot: "bg-slate-500",
    countdownText: `Pre-market opens in ${remHours}h ${remMins}m`,
    progressPct: 100,
    description: "Clearing houses offline. Order routing resumes at 04:00 AM EST.",
  };
}

/**
 * ⚡ Custom Hook: Real-Time Dual-Zone Session Clock for Wall Street
 */
export function useMarketSessionClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // 1-second cadence timer for high-precision live countdown
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nyParts = useMemo(() => getTimezoneParts(now, NY_TIMEZONE), [now]);

  // Formatted Display Strings
  const nyTimeFormatted = useMemo(() => {
    return now.toLocaleTimeString("en-US", {
      timeZone: NY_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [now]);

  const istTimeFormatted = useMemo(() => {
    return now.toLocaleTimeString("en-US", {
      timeZone: IST_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [now]);

  const sessionInfo = useMemo(() => calculateSessionInfo(nyParts), [nyParts]);

  return {
    now,
    nyParts,
    nyTimeFormatted,
    istTimeFormatted,
    ...sessionInfo,
  };
}
