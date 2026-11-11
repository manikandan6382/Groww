import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CALENDAR_PATH = path.resolve(__dirname, "../../../data/nse-holidays-2026.json");

export class ExchangeCalendar {
  constructor(options = {}) {
    this.calendarPath = options.calendarPath || DEFAULT_CALENDAR_PATH;
    this.segment = options.segment || "EQUITY_DERIVATIVES";
    this.calendarData = null;
    this.holidaysMap = new Map();
    this.specialSessionsMap = new Map();
    this.status = "UNINITIALIZED";
    this.lastError = null;
    this.lastLoadedAt = null;

    if (options.autoLoad !== false) {
      this.load();
    }
  }

  load(customPath = null) {
    const targetPath = customPath || this.calendarPath;
    try {
      if (!fs.existsSync(targetPath)) {
        this.status = "CALENDAR_FILE_MISSING";
        this.lastError = `Calendar file not found at: ${targetPath}`;
        this.calendarData = null;
        this.holidaysMap.clear();
        this.specialSessionsMap.clear();
        return false;
      }

      const raw = fs.readFileSync(targetPath, "utf-8");
      const parsed = JSON.parse(raw);

      if (!parsed.year || !Array.isArray(parsed.holidays)) {
        this.status = "CALENDAR_SCHEMA_INVALID";
        this.lastError = "Calendar JSON missing required 'year' or 'holidays' array.";
        this.calendarData = null;
        this.holidaysMap.clear();
        this.specialSessionsMap.clear();
        return false;
      }

      this.calendarData = parsed;
      this.segment = parsed.segment || this.segment;
      this.holidaysMap.clear();
      for (const h of parsed.holidays) {
        if (h.date) {
          this.holidaysMap.set(h.date, h);
        }
      }

      this.specialSessionsMap.clear();
      if (Array.isArray(parsed.specialSessions)) {
        for (const s of parsed.specialSessions) {
          if (s.date) {
            this.specialSessionsMap.set(s.date, s);
          }
        }
      }

      this.status = "LOADED";
      this.lastError = null;
      this.lastLoadedAt = new Date().toISOString();
      return true;
    } catch (err) {
      this.status = "CALENDAR_LOAD_ERROR";
      this.lastError = err.message;
      this.calendarData = null;
      this.holidaysMap.clear();
      this.specialSessionsMap.clear();
      return false;
    }
  }

  /**
   * Returns calendar parts for a given Date in Asia/Kolkata timezone:
   * { dateStr: 'YYYY-MM-DD', year: 2026, dayOfWeek: 0-6, hours, minutes, totalMinutes }
   */
  getIstParts(inputDate = new Date()) {
    const d = inputDate instanceof Date ? inputDate : new Date(inputDate);
    if (Number.isNaN(d.getTime())) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const lookup = {};
    for (const p of parts) {
      lookup[p.type] = p.value;
    }

    const year = Number(lookup.year);
    const month = lookup.month;
    const day = lookup.day;
    const hours = Number(lookup.hour === "24" ? "00" : lookup.hour);
    const minutes = Number(lookup.minute);
    const seconds = Number(lookup.second);
    const dateStr = `${year}-${month}-${day}`;

    // Calculate dayOfWeek in Asia/Kolkata
    const dayOfWeekFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    });
    const weekdayStr = dayOfWeekFormatter.format(d);
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? d.getDay();

    return {
      dateStr,
      year,
      month: Number(month),
      day: Number(day),
      dayOfWeek,
      weekdayStr,
      hours,
      minutes,
      seconds,
      totalMinutes: hours * 60 + minutes,
    };
  }

  /**
   * Deterministically checks if a given date is a trading day on the exchange for the target segment.
   * Defaults to this.segment ('EQUITY_DERIVATIVES').
   * 
   * Segment Isolation:
   * Holidays marked as equity-only do not disable valid F&O sessions unless explicitly specified.
   * 
   * Fail-closed: If calendar data is not loaded or year is unsupported, returns isTradingDay = false.
   */
  isTradingDay(inputDate = new Date(), targetSegment = this.segment) {
    const ist = this.getIstParts(inputDate);
    if (!ist) {
      return {
        isTradingDay: false,
        isSpecialSession: false,
        status: "INVALID_DATE",
        reason: "Invalid date provided to calendar evaluator",
        dateStr: null,
      };
    }

    // Fail-closed calendar availability check
    if (this.status !== "LOADED" || !this.calendarData) {
      return {
        isTradingDay: false,
        isSpecialSession: false,
        status: "CALENDAR_UNAVAILABLE",
        reason: `Exchange calendar is unavailable: ${this.lastError || this.status}`,
        dateStr: ist.dateStr,
      };
    }

    // Fail-closed year check:
    if (ist.year !== this.calendarData.year) {
      return {
        isTradingDay: false,
        isSpecialSession: false,
        status: "YEAR_UNSUPPORTED",
        reason: `Calendar year mismatch: loaded ${this.calendarData.year}, requested ${ist.year}`,
        dateStr: ist.dateStr,
      };
    }

    // 1. Check special sessions (e.g. Muhurat trading on a Sunday)
    if (this.specialSessionsMap.has(ist.dateStr)) {
      const special = this.specialSessionsMap.get(ist.dateStr);
      const isSegmentApplicable = !Array.isArray(special.applicableSegments) ||
        special.applicableSegments.includes(targetSegment) ||
        special.applicableSegments.includes("ALL");

      if (isSegmentApplicable) {
        const isVerified = Boolean(special.sessionHoursVerified && special.sessionHours);
        return {
          isTradingDay: true,
          isSpecialSession: true,
          sessionHoursVerified: isVerified,
          specialSession: special,
          status: isVerified ? "SPECIAL_SESSION_VERIFIED" : "SPECIAL_SESSION_TIMINGS_UNVERIFIED",
          reason: isVerified ? (special.description || "Verified special trading session") : (special.note || "Special session timings pending official circular"),
          dateStr: ist.dateStr,
          sessionHours: isVerified ? special.sessionHours : null,
        };
      }
    }

    // 2. Check regular weekend (Saturday=6, Sunday=0)
    if (ist.dayOfWeek === 0 || ist.dayOfWeek === 6) {
      return {
        isTradingDay: false,
        isSpecialSession: false,
        status: "WEEKEND",
        reason: ist.dayOfWeek === 0 ? "Sunday weekend closure" : "Saturday weekend closure",
        dateStr: ist.dateStr,
      };
    }

    // 3. Check official NSE trading holiday
    if (this.holidaysMap.has(ist.dateStr)) {
      const holiday = this.holidaysMap.get(ist.dateStr);
      const isSegmentApplicable = !Array.isArray(holiday.applicableSegments) ||
        holiday.applicableSegments.includes(targetSegment) ||
        holiday.applicableSegments.includes("ALL");

      if (isSegmentApplicable) {
        return {
          isTradingDay: false,
          isSpecialSession: false,
          status: "HOLIDAY",
          reason: holiday.description || "NSE official trading holiday",
          dateStr: ist.dateStr,
          holiday,
        };
      }
      // If holiday applies strictly to another segment (e.g. Cash equity only), F&O remains open!
    }

    // 4. Regular trading session
    return {
      isTradingDay: true,
      isSpecialSession: false,
      status: "REGULAR_SESSION",
      reason: "Regular NSE trading day",
      dateStr: ist.dateStr,
      sessionHours: this.calendarData.regularHours || { open: "09:15", close: "15:40" },
    };
  }

  getStatus() {
    return {
      status: this.status,
      calendarPath: this.calendarPath,
      year: this.calendarData?.year || null,
      exchange: this.calendarData?.exchange || "NSE",
      segment: this.segment,
      metadata: this.calendarData?.metadata || null,
      holidaysCount: this.holidaysMap.size,
      specialSessionsCount: this.specialSessionsMap.size,
      lastLoadedAt: this.lastLoadedAt,
      lastError: this.lastError,
    };
  }
}

export const defaultExchangeCalendar = new ExchangeCalendar();
