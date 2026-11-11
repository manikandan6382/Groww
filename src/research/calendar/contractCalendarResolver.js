/**
 * Versioned Exchange Contract & Expiry Calendar Resolver
 * Research Data Foundation - Workstream B
 * 
 * Enforces historical contract-calendar versioning across regulatory eras.
 * Prevents retroactively applying current 2026 Tuesday rules to historical 2023/2024 data.
 */

import fs from "node:fs";
import path from "node:path";

export const CALENDAR_VERSIONS = {
  LEGACY_PRE_SEPT_2023: "calendar_v1_legacy_thursday",
  MID_2023_TO_NOV_2024: "calendar_v2_mid_reform",
  CURRENT_2025_2026: "calendar_v3_current_2026"
};

// Regulatory calendar epoch definitions
export const REGULATORY_CALENDAR_ERAS = [
  {
    version: CALENDAR_VERSIONS.LEGACY_PRE_SEPT_2023,
    effective_from: "2000-01-01",
    effective_to: "2023-09-03",
    description: "All index derivatives weekly expiries on Thursday (NIFTY, BANKNIFTY).",
    rules: {
      NIFTY: { weekly_day: "Thursday", monthly_day: "Thursday" },
      BANKNIFTY: { weekly_day: "Thursday", monthly_day: "Thursday" },
      FINNIFTY: { weekly_day: "Tuesday", monthly_day: "Tuesday" }
    }
  },
  {
    version: CALENDAR_VERSIONS.MID_2023_TO_NOV_2024,
    effective_from: "2023-09-04",
    effective_to: "2024-11-19",
    description: "BANKNIFTY weekly shifted to Wednesday; NIFTY remained Thursday.",
    rules: {
      NIFTY: { weekly_day: "Thursday", monthly_day: "Thursday" },
      BANKNIFTY: { weekly_day: "Wednesday", monthly_day: "Wednesday" },
      FINNIFTY: { weekly_day: "Tuesday", monthly_day: "Tuesday" }
    }
  },
  {
    version: CALENDAR_VERSIONS.CURRENT_2025_2026,
    effective_from: "2024-11-20",
    effective_to: "2099-12-31",
    description: "SEBI index derivatives reform: 1 benchmark per exchange weekly. NIFTY weekly on Tuesday. BANKNIFTY weekly discontinued (monthly only).",
    rules: {
      NIFTY: { weekly_day: "Tuesday", monthly_day: "Tuesday" },
      BANKNIFTY: { weekly_day: null, monthly_day: "Wednesday" }, // Weeklies discontinued Nov 2024
      FINNIFTY: { weekly_day: "Tuesday", monthly_day: "Tuesday" },
      SENSEX: { weekly_day: "Friday", monthly_day: "Friday" }
    }
  }
];

export const TRADING_SESSION = {
  time_zone: "Asia/Kolkata",
  utc_offset: "+05:30",
  session_open_ist: "09:15:00",
  session_close_ist: "15:30:00",
  pre_open_ist: "09:00:00",
  post_close_ist: "16:00:00"
};

/**
 * Resolve calendar configuration version applicable to a specific historical date.
 */
export function resolveCalendarVersion(dateStr) {
  const d = String(dateStr).slice(0, 10);
  for (const era of REGULATORY_CALENDAR_ERAS) {
    if (d >= era.effective_from && d <= era.effective_to) {
      return era;
    }
  }
  return REGULATORY_CALENDAR_ERAS[REGULATORY_CALENDAR_ERAS.length - 1];
}

/**
 * Resolve contract calendar metadata and validate expiry consistency.
 */
export function resolveContractCalendar({
  contract_id,
  symbol,
  underlying_symbol = "NIFTY",
  expiry_date,
  expiry_timestamp = null
}) {
  const dateStr = String(expiry_date).slice(0, 10);
  const era = resolveCalendarVersion(dateStr);
  
  const underlying = String(underlying_symbol || "NIFTY").toUpperCase();
  const rule = era.rules[underlying] || era.rules.NIFTY;

  const [y, m, d] = dateStr.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const actualDayOfWeek = daysOfWeek[noonUtc.getUTCDay()];

  // Check if banknifty weekly was attempted during discontinued era
  let warning = null;
  if (underlying === "BANKNIFTY" && era.version === CALENDAR_VERSIONS.CURRENT_2025_2026) {
    if (symbol && symbol.includes("BANKNIFTY") && !symbol.includes("MONTHLY")) {
      warning = "BANKNIFTY weekly index options were discontinued in Nov 2024. Expiry must be monthly.";
    }
  }

  return {
    contract_calendar_version: era.version,
    contract_id: String(contract_id || symbol),
    underlying_symbol: underlying,
    expiry_date: dateStr,
    expiry_timestamp: expiry_timestamp || noonUtc.getTime(),
    effective_from: era.effective_from,
    effective_to: era.effective_to,
    day_of_week: actualDayOfWeek,
    era_description: era.description,
    session_open: TRADING_SESSION.session_open_ist,
    session_close: TRADING_SESSION.session_close_ist,
    warning
  };
}

/**
 * Standard NSE National Holidays list for calendar adjustment testing.
 */
export const NSE_KNOWN_HOLIDAYS = [
  "2026-01-26", // Republic Day
  "2026-03-03", // Mahashivratri
  "2026-03-25", // Holi
  "2026-04-03", // Good Friday
  "2026-04-14", // Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-08-15", // Independence Day
  "2026-10-02", // Mahatma Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-08", // Diwali Balipratipada
  "2026-12-25"  // Christmas
];

/**
 * Adjust scheduled expiry date for exchange trading holidays.
 * Under NSE rules, if scheduled expiry is an exchange holiday, expiry shifts to previous trading day.
 */
export function adjustExpiryForHoliday(scheduledDateStr, customHolidays = NSE_KNOWN_HOLIDAYS) {
  let date = String(scheduledDateStr).slice(0, 10);
  const holidaySet = new Set(customHolidays);

  while (holidaySet.has(date)) {
    const [y, m, d] = date.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    const prevY = prevDate.getUTCFullYear();
    const prevM = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
    const prevD = String(prevDate.getUTCDate()).padStart(2, "0");
    date = `${prevY}-${prevM}-${prevD}`;
    // Skip weekends if falling back onto Saturday or Sunday
    const day = prevDate.getUTCDay();
    if (day === 0) { // Sunday -> move to Friday
      const fri = new Date(Date.UTC(prevY, prevDate.getUTCMonth(), prevDate.getUTCDate() - 2, 12, 0, 0));
      date = `${fri.getUTCFullYear()}-${String(fri.getUTCMonth() + 1).padStart(2, "0")}-${String(fri.getUTCDate()).padStart(2, "0")}`;
    } else if (day === 6) { // Saturday -> move to Friday
      const fri = new Date(Date.UTC(prevY, prevDate.getUTCMonth(), prevDate.getUTCDate() - 1, 12, 0, 0));
      date = `${fri.getUTCFullYear()}-${String(fri.getUTCMonth() + 1).padStart(2, "0")}-${String(fri.getUTCDate()).padStart(2, "0")}`;
    }
  }

  return {
    original_expiry: scheduledDateStr,
    adjusted_expiry: date,
    is_adjusted: date !== scheduledDateStr
  };
}

/**
 * Parse contract symbol to extract standardized option contract identity.
 */
export function parseContractIdentity(symbolStr) {
  const s = String(symbolStr).trim();

  // Pattern 1: NIFTY 24550 CE 27 OCT 26 or NIFTY 24550 CE
  const p1 = s.match(/^(NIFTY|BANKNIFTY|FINNIFTY)\s+(\d{4,6})\s+(CE|PE)(?:\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{2}))?/i);
  if (p1) {
    return {
      status: "VALID",
      underlying: p1[1].toUpperCase(),
      strike: Number(p1[2]),
      option_type: p1[3].toUpperCase(),
      raw_symbol: s
    };
  }

  // Pattern 2: NIFTY26OCT24550CE or NSE_FO|NIFTY26OCT24550CE
  const p2 = s.match(/(NIFTY|BANKNIFTY|FINNIFTY)(\d{2}[A-Z]{3})(\d{4,6})(CE|PE)/i);
  if (p2) {
    return {
      status: "VALID",
      underlying: p2[1].toUpperCase(),
      expiry_code: p2[2].toUpperCase(),
      strike: Number(p2[3]),
      option_type: p2[4].toUpperCase(),
      raw_symbol: s
    };
  }

  return {
    status: "UNRESOLVED",
    underlying: null,
    strike: null,
    option_type: null,
    raw_symbol: s
  };
}
