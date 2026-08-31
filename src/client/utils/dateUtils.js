/**
 * Centralized Date & Time Utility Engine
 * Guarantees accurate local timezone (IST / browser local time) formatting,
 * dynamic trade duration calculation, and timezone-safe calendar day filtering.
 */

/**
 * Parses any ISO string, Unix timestamp, or datetime string safely into a Date object.
 */
export function safeDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  
  if (typeof input === "string") {
    const cleaned = input.trim();
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a timestamp into local "YYYY-MM-DD HH:mm" (or with seconds if requested).
 * Example: "2026-08-31 14:30"
 */
export function formatLocalDateTime(input, includeSeconds = false) {
  if (!input) return "";
  const d = safeDate(input);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  
  if (includeSeconds) {
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Formats a timestamp into local 12-hour time: "2:30 PM"
 */
export function formatLocalTime12h(input) {
  if (!input) return "";
  const d = safeDate(input);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns local calendar day key "YYYY-MM-DD".
 * Avoids UTC boundary drift where 2:00 AM IST becomes yesterday in UTC.
 */
export function getLocalDateKey(input) {
  if (!input) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const d = safeDate(input);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Dynamically calculates human-readable trade duration between entry and exit timestamps.
 * Examples: "35s", "9 mins", "1h 14m", "2d 4h"
 */
export function calculateTradeDuration(entryInput, exitInput, fallbackStr) {
  if (!entryInput) return fallbackStr || "1 min";
  
  const entryDate = safeDate(entryInput);
  const exitDate = exitInput ? safeDate(exitInput) : new Date();
  
  const diffMs = Math.max(0, exitDate.getTime() - entryDate.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs || 1}s`;
  }
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""}`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return remMins > 0 ? `${diffHours}h ${remMins}m` : `${diffHours}h`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`;
}

/**
 * Returns a relative time string like "Just now", "5m ago", "2h ago".
 */
export function getRelativeTimeStr(input) {
  if (!input) return "";
  const d = safeDate(input);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 30) return "Just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
