import { EventEmitter } from "node:events";
import { defaultExchangeCalendar } from "./exchangeCalendar.js";
import { extractExecutableLiquidity } from "./triggerEvaluator.js";
import { closePaperTrade } from "../../repositories/paper-lab.repository.js";
import { 
  closePaperTradeInTransaction, 
  refreshPaperCapital, 
  assertPaperTrade, 
  toLocalDateTimeInput 
} from "../../repositories/paper-account.js";
import { getTradeById } from "../../repositories/trades.repository.js";
import { squareOffDotnetPosition } from "./dotnetBridge.js";
import { telegramNotifier } from "../notifications/telegramNotifier.js";
import { getDb } from "../../db/connection.js";

export const MARKET_REGIMES = Object.freeze({
  OPENING_CHOP: "OPENING_CHOP",
  MORNING_EXPANSION: "MORNING_EXPANSION",
  MIDDAY_STAND_DOWN: "MIDDAY_STAND_DOWN",
  AFTERNOON_TREND: "AFTERNOON_TREND",
  ENTRY_SHUTDOWN: "ENTRY_SHUTDOWN",
  MANDATORY_EOD_SQUAREOFF: "MANDATORY_EOD_SQUAREOFF",
  MARKET_CLOSED: "MARKET_CLOSED",
  SPECIAL_SESSION_ACTIVE: "SPECIAL_SESSION_ACTIVE",
});

export const REGIME_PERMISSIONS = Object.freeze({
  [MARKET_REGIMES.OPENING_CHOP]: { isEntryAllowed: false, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.MORNING_EXPANSION]: { isEntryAllowed: true, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.MIDDAY_STAND_DOWN]: { isEntryAllowed: false, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.AFTERNOON_TREND]: { isEntryAllowed: true, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.ENTRY_SHUTDOWN]: { isEntryAllowed: false, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF]: { isEntryAllowed: false, isMarketOpen: true, isMonitoringActive: true },
  [MARKET_REGIMES.MARKET_CLOSED]: { isEntryAllowed: false, isMarketOpen: false, isMonitoringActive: false },
  [MARKET_REGIMES.SPECIAL_SESSION_ACTIVE]: { isEntryAllowed: true, isMarketOpen: true, isMonitoringActive: true },
});

export class MarketScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.calendar = options.calendar || defaultExchangeCalendar;
    this.engine = options.engine || null;
    this.tickIntervalMs = options.tickIntervalMs || 1000;
    this.customDb = options.db || null;
    this.workerId = options.workerId || `worker_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.dotnetSquareOffFn = typeof options.dotnetSquareOffFn === "function" ? options.dotnetSquareOffFn : squareOffDotnetPosition;
    this.closePaperTradeFn = typeof options.closePaperTradeFn === "function" ? options.closePaperTradeFn : null;
    this.timer = null;
    this.started = false;

    this.currentRegime = MARKET_REGIMES.MARKET_CLOSED;
    this.currentSessionDate = null;
    this.isTradingDay = false;
    this.lastTickAt = null;
    this.heartbeatCount = 0;
    this.completedSquareOffDates = new Set();
    this.lastSquareOffAt = null;
    this.lastSquareOffReport = null;
    this.overnightAlertEmittedDates = new Set();

    // Custom time provider for deterministic testing
    this.timeProvider = typeof options.timeProvider === "function" ? options.timeProvider : () => new Date();
  }

  _getDb() {
    return this.customDb || getDb();
  }

  setEngine(engine) {
    this.engine = engine;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    try {
      await this.reconcileAllUnresolvedPositions();
    } catch (err) {
      console.warn("[MarketScheduler] Warning during startup reconciliation:", err.message);
    }
    this.evaluate(this.timeProvider());
    this.timer = setInterval(() => {
      this.evaluate(this.timeProvider());
    }, this.tickIntervalMs);
  }

  stop() {
    this.started = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Deterministically evaluates the market regime for a specific timestamp.
   * Returns regime details without side effects.
   */
  evaluateRegimeForTime(date = new Date()) {
    const ist = this.calendar.getIstParts(date);
    if (!ist) {
      return {
        regime: MARKET_REGIMES.MARKET_CLOSED,
        isEntryAllowed: false,
        isMarketOpen: false,
        isTradingDay: false,
        sessionDate: null,
        reason: "INVALID_TIMESTAMP",
        nextTransition: null,
      };
    }

    const dayCheck = this.calendar.isTradingDay(date);
    if (!dayCheck.isTradingDay) {
      return {
        regime: MARKET_REGIMES.MARKET_CLOSED,
        isEntryAllowed: false,
        isMarketOpen: false,
        isTradingDay: false,
        sessionDate: ist.dateStr,
        reason: dayCheck.reason,
        calendarStatus: dayCheck.status,
        nextTransition: null,
      };
    }

    // Special Trading Session (e.g., Muhurat Trading on Sunday)
    if (dayCheck.isSpecialSession) {
      // If special session hours are NOT officially verified, fail closed!
      if (!dayCheck.sessionHoursVerified || !dayCheck.sessionHours) {
        return {
          regime: MARKET_REGIMES.MARKET_CLOSED,
          isEntryAllowed: false,
          isMarketOpen: false,
          isTradingDay: true,
          isSpecialSession: true,
          sessionDate: ist.dateStr,
          status: "SPECIAL_SESSION_TIMINGS_UNVERIFIED",
          reason: dayCheck.reason || "Special session timings pending official circular. Entries blocked.",
          nextTransition: null,
        };
      }

      const openMinutes = this._parseTimeToMinutes(dayCheck.sessionHours.open);
      const closeMinutes = this._parseTimeToMinutes(dayCheck.sessionHours.close);
      const squareOffMinutes = Math.max(openMinutes, closeMinutes - 15);
      const currentMinutes = ist.totalMinutes;

      if (currentMinutes < openMinutes) {
        return {
          regime: MARKET_REGIMES.MARKET_CLOSED,
          isEntryAllowed: false,
          isMarketOpen: false,
          isTradingDay: true,
          sessionDate: ist.dateStr,
          reason: `Special session pre-market (opens at ${dayCheck.sessionHours.open})`,
          nextTransition: { regime: MARKET_REGIMES.SPECIAL_SESSION_ACTIVE, totalMinutes: openMinutes },
        };
      }
      if (currentMinutes >= openMinutes && currentMinutes < squareOffMinutes) {
        return {
          regime: MARKET_REGIMES.SPECIAL_SESSION_ACTIVE,
          isEntryAllowed: true,
          isMarketOpen: true,
          isTradingDay: true,
          sessionDate: ist.dateStr,
          reason: dayCheck.reason,
          nextTransition: { regime: MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF, totalMinutes: squareOffMinutes },
        };
      }
      if (currentMinutes >= squareOffMinutes && currentMinutes < closeMinutes) {
        return {
          regime: MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF,
          isEntryAllowed: false,
          isMarketOpen: true,
          isTradingDay: true,
          sessionDate: ist.dateStr,
          reason: "Special session mandatory square-off window",
          nextTransition: { regime: MARKET_REGIMES.MARKET_CLOSED, totalMinutes: closeMinutes },
        };
      }
      return {
        regime: MARKET_REGIMES.MARKET_CLOSED,
        isEntryAllowed: false,
        isMarketOpen: false,
        isTradingDay: true,
        sessionDate: ist.dateStr,
        reason: `Special session closed at ${dayCheck.sessionHours.close}`,
        nextTransition: null,
      };
    }

    // Standard Regular Session (09:15 - 15:40 IST)
    const m = ist.totalMinutes;
    // 09:15 = 555 min
    // 09:30 = 570 min
    // 11:15 = 675 min
    // 13:15 = 795 min
    // 14:45 = 885 min
    // 15:15 = 915 min
    // 15:40 = 940 min (Official NSE F&O Regular Market Close)

    let regime;
    let nextTransition = null;

    if (m < 555) {
      regime = MARKET_REGIMES.MARKET_CLOSED;
      nextTransition = { regime: MARKET_REGIMES.OPENING_CHOP, totalMinutes: 555, atIst: "09:15:00" };
    } else if (m < 570) {
      regime = MARKET_REGIMES.OPENING_CHOP;
      nextTransition = { regime: MARKET_REGIMES.MORNING_EXPANSION, totalMinutes: 570, atIst: "09:30:00" };
    } else if (m < 675) {
      regime = MARKET_REGIMES.MORNING_EXPANSION;
      nextTransition = { regime: MARKET_REGIMES.MIDDAY_STAND_DOWN, totalMinutes: 675, atIst: "11:15:00" };
    } else if (m < 795) {
      regime = MARKET_REGIMES.MIDDAY_STAND_DOWN;
      nextTransition = { regime: MARKET_REGIMES.AFTERNOON_TREND, totalMinutes: 795, atIst: "13:15:00" };
    } else if (m < 885) {
      regime = MARKET_REGIMES.AFTERNOON_TREND;
      nextTransition = { regime: MARKET_REGIMES.ENTRY_SHUTDOWN, totalMinutes: 885, atIst: "14:45:00" };
    } else if (m < 915) {
      regime = MARKET_REGIMES.ENTRY_SHUTDOWN;
      nextTransition = { regime: MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF, totalMinutes: 915, atIst: "15:15:00" };
    } else if (m < 940) {
      // 15:15 - 15:40: Mandatory EOD square-off window. Exchange remains open, monitoring active, new entries blocked.
      regime = MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF;
      nextTransition = { regime: MARKET_REGIMES.MARKET_CLOSED, totalMinutes: 940, atIst: "15:40:00" };
    } else {
      regime = MARKET_REGIMES.MARKET_CLOSED;
      nextTransition = null;
    }

    const permissions = REGIME_PERMISSIONS[regime] || REGIME_PERMISSIONS[MARKET_REGIMES.MARKET_CLOSED];

    return {
      regime,
      isEntryAllowed: permissions.isEntryAllowed,
      isMarketOpen: permissions.isMarketOpen,
      isTradingDay: true,
      sessionDate: ist.dateStr,
      istTime: `${String(ist.hours).padStart(2, "0")}:${String(ist.minutes).padStart(2, "0")}:${String(ist.seconds).padStart(2, "0")}`,
      totalMinutes: m,
      nextTransition,
    };
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Main evaluation loop. Called on timer tick or restart.
   */
  async evaluate(now = this.timeProvider()) {
    this.heartbeatCount++;
    this.lastTickAt = new Date().toISOString();

    const evaluation = this.evaluateRegimeForTime(now);
    const prevRegime = this.currentRegime;
    const isNewSession = evaluation.sessionDate && evaluation.sessionDate !== this.currentSessionDate;

    this.currentSessionDate = evaluation.sessionDate;
    this.isTradingDay = evaluation.isTradingDay;

    // Detect regime transition
    if (evaluation.regime !== prevRegime || isNewSession) {
      this.currentRegime = evaluation.regime;
      this.emit("regime_change", {
        previousRegime: prevRegime,
        currentRegime: evaluation.regime,
        sessionDate: this.currentSessionDate,
        istTime: evaluation.istTime,
        isEntryAllowed: evaluation.isEntryAllowed,
        isMarketOpen: evaluation.isMarketOpen,
        reason: evaluation.reason || "Scheduled regime transition",
      });
    }

    // Mandatory EOD Square-Off Handler
    if (evaluation.regime === MARKET_REGIMES.MANDATORY_EOD_SQUAREOFF && this.isTradingDay) {
      await this.executeMandatoryEodSquareOff(this.currentSessionDate);
    }

    // Critical Unresolved Overnight Position Check at Market Close
    if (evaluation.regime === MARKET_REGIMES.MARKET_CLOSED && this.isTradingDay) {
      this._checkUnresolvedOvernightExposure(this.currentSessionDate);
    }

    this.emit("heartbeat", {
      regime: this.currentRegime,
      isEntryAllowed: evaluation.isEntryAllowed,
      isMarketOpen: evaluation.isMarketOpen,
      sessionDate: this.currentSessionDate,
      heartbeatCount: this.heartbeatCount,
      timestamp: this.lastTickAt,
    });

    return evaluation;
  }

  /**
   * Authoritative EOD Square-Off Execution with Atomic Durable Claims & RMS Synchronization.
   * Ensures zero duplicate settlements across workers, ticks, restarts, or crashes.
   */
  async executeMandatoryEodSquareOff(sessionDate) {
    const db = this._getDb();
    const openPositions = this._getOpenPositions();

    this._ensureLedgerTable(db);

    // If memory already tracks completion and no active positions, return report
    if (this.completedSquareOffDates.has(sessionDate) && openPositions.length === 0) {
      return this.lastSquareOffReport;
    }

    this.lastSquareOffAt = new Date().toISOString();
    this.emit("eod_squareoff_started", {
      sessionDate,
      openPositionsCount: openPositions.length,
      timestamp: this.lastSquareOffAt,
    });

    let executedCount = 0;
    let deferredCount = 0;
    const details = [];

    for (const position of openPositions) {
      const result = await this._processSinglePositionSquareOff(position, sessionDate, db);
      if (result.executed) {
        executedCount++;
      } else {
        deferredCount++;
      }
      details.push(result);
    }

    this.completedSquareOffDates.add(sessionDate);

    const report = {
      sessionDate,
      executedAt: this.lastSquareOffAt,
      totalPositions: openPositions.length,
      executedCount,
      deferredCount,
      details,
    };

    this.lastSquareOffReport = report;
    this.emit("eod_squareoff_completed", report);

    if (openPositions.length > 0) {
      telegramNotifier.notifyBroadcast({
        type: "EOD_SQUARE_OFF_SUMMARY",
        message: `EOD Square-Off Completed for ${sessionDate}: ${executedCount} closed, ${deferredCount} deferred (no bid depth).`,
      }).catch(() => {});
    }

    return report;
  }

  _ensureLedgerTable(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS eod_squareoff_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_date TEXT NOT NULL,
        trade_id INTEGER NOT NULL REFERENCES trades(id),
        request_key TEXT NOT NULL UNIQUE,
        worker_id TEXT,
        lease_epoch INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL CHECK (status IN ('CLAIMED', 'PENDING', 'EXECUTED', 'DEFERRED', 'FAILED', 'RECONCILIATION_REQUIRED')),
        rms_sync_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (rms_sync_status IN ('NOT_STARTED', 'SYNCED', 'FAILED', 'TIMED_OUT', 'RECONCILED')),
        exit_price REAL,
        pnl REAL,
        reason TEXT,
        failure_reason TEXT,
        case_code INTEGER,
        claim_expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_eod_squareoff_session_trade 
        ON eod_squareoff_ledger(session_date, trade_id);
    `);
  }

  _getOpenPositions() {
    if (!this.engine) return [];
    if (this.engine.activeTrades instanceof Map) {
      return Array.from(this.engine.activeTrades.values());
    }
    return [];
  }

  /**
   * Processes square-off for a single position with atomic durable claim and strict close ordering.
   */
  async _processSinglePositionSquareOff(item, sessionDate, db) {
    const trade = item.trade;
    if (trade?.testingMode || this.engine?.testingMode) {
      return { tradeId: trade?.id, skipped: true, reason: "TESTING_MODE_EXEMPT" };
    }
    const id = Number(trade.id);
    const symbol = trade.symbol || trade.tokenKey;
    const isShort = trade.direction === "SHORT";
    const requestKey = `EOD_SQOFF_${sessionDate}_${id}`;

    // 1. Atomic Durable Claim: Only the worker that successfully inserts status = 'CLAIMED' proceeds
    let claimAcquired = false;
    let currentEpoch = 1;
    try {
      db.prepare(`
        INSERT INTO eod_squareoff_ledger (
          session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, claim_expires_at, reason
        ) VALUES (
          ?, ?, ?, ?, 1, 'CLAIMED', 'NOT_STARTED', datetime('now', '+30 seconds'), 'CLAIMED_FOR_EOD_EXECUTION'
        )
      `).run(sessionDate, id, requestKey, this.workerId);
      claimAcquired = true;
      currentEpoch = 1;
    } catch {
      claimAcquired = false;
    }

    if (!claimAcquired) {
      // Conflict or prior record: check existing status using SQLite's native UTC datetime evaluation
      const existing = db.prepare(`
        SELECT *, (claim_expires_at > datetime('now')) AS is_claim_active 
        FROM eod_squareoff_ledger 
        WHERE session_date = ? AND trade_id = ?
      `).get(sessionDate, id);
      
      // If already executed, reconcile RMS sync if needed, and return alreadyExecuted: true
      if (existing?.status === "EXECUTED") {
        if (existing?.rms_sync_status === "SYNCED" || existing?.rms_sync_status === "RECONCILED") {
          if (this.engine?.removeTrade) this.engine.removeTrade(id);
          return {
            tradeId: id,
            symbol,
            executed: true,
            alreadyExecuted: true,
            status: existing.status,
            rmsSyncStatus: existing.rms_sync_status,
            exitPrice: existing.exit_price,
            pnl: existing.pnl,
          };
        }

        // Status is EXECUTED but RMS sync status is NOT_STARTED / TIMED_OUT: reconcile with RMS
        let rmsRes;
        try {
          rmsRes = await this.dotnetSquareOffFn(id);
        } catch (err) {
          rmsRes = { ok: false, error: err.message };
        }
        const rmsSynced = Boolean(rmsRes?.ok);
        const finalRmsSync = rmsSynced ? "SYNCED" : "TIMED_OUT";

        db.prepare(`
          UPDATE eod_squareoff_ledger
          SET rms_sync_status = ?,
              updated_at = datetime('now')
          WHERE session_date = ? AND trade_id = ?
        `).run(finalRmsSync, sessionDate, id);

        if (this.engine?.removeTrade && rmsSynced) this.engine.removeTrade(id);

        return {
          tradeId: id,
          symbol,
          executed: true,
          alreadyExecuted: true,
          status: "EXECUTED",
          rmsSyncStatus: finalRmsSync,
          exitPrice: existing.exit_price,
          pnl: existing.pnl,
        };
      }

      // Check if existing record is actively CLAIMED by another live worker whose claim hasn't expired
      const isClaimActive = existing?.status === "CLAIMED" && 
                            Boolean(existing?.is_claim_active) &&
                            existing?.worker_id !== this.workerId;

      if (isClaimActive) {
        return {
          tradeId: id,
          symbol,
          executed: false,
          alreadyExecuted: false,
          skipped: true,
          status: existing?.status,
          rmsSyncStatus: existing?.rms_sync_status,
          reason: `CLAIM_CONFLICT: already claimed by live worker ${existing?.worker_id}`,
        };
      }

      // Atomic CAS Takeover with Fencing Token (lease_epoch increment)
      const takeoverRes = db.prepare(`
        UPDATE eod_squareoff_ledger
        SET worker_id = ?,
            lease_epoch = COALESCE(lease_epoch, 0) + 1,
            status = 'CLAIMED',
            claim_expires_at = datetime('now', '+30 seconds'),
            updated_at = datetime('now')
        WHERE session_date = ? AND trade_id = ? 
          AND (
            claim_expires_at <= datetime('now') 
            OR worker_id = ? 
            OR status IN ('PENDING', 'DEFERRED', 'RECONCILIATION_REQUIRED')
          )
      `).run(this.workerId, sessionDate, id, this.workerId);

      if (takeoverRes.changes === 0) {
        const refreshed = db.prepare(`SELECT * FROM eod_squareoff_ledger WHERE session_date = ? AND trade_id = ?`).get(sessionDate, id);
        return {
          tradeId: id,
          symbol,
          executed: false,
          alreadyExecuted: false,
          skipped: true,
          status: refreshed?.status,
          reason: `CLAIM_TAKEOVER_FAILED: Another worker acquired lease concurrently`,
        };
      }

      const updatedRow = db.prepare(`SELECT COALESCE(lease_epoch, 1) AS lease_epoch FROM eod_squareoff_ledger WHERE session_date = ? AND trade_id = ?`).get(sessionDate, id);
      currentEpoch = updatedRow?.lease_epoch || 1;
    }

    // 2. Authoritative DB State Reconciliation (handles crash recovery where trade was already closed in SQLite)
    let currentDbTrade;
    try {
      currentDbTrade = db.prepare("SELECT * FROM trades WHERE id = ?").get(id);
    } catch {
      currentDbTrade = null;
    }

    if (!currentDbTrade || currentDbTrade.status === "CLOSED") {
      const exitPrice = currentDbTrade?.exitPrice || currentDbTrade?.lastMarkPrice || 0;
      const netPnl = currentDbTrade?.netPnl || 0;

      // Fencing check before reconciliation
      const fenceCheck = db.prepare(`
        SELECT worker_id, lease_epoch, (claim_expires_at > datetime('now')) AS is_active 
        FROM eod_squareoff_ledger WHERE session_date = ? AND trade_id = ?
      `).get(sessionDate, id);

      if (fenceCheck?.worker_id !== this.workerId || fenceCheck?.lease_epoch !== currentEpoch) {
        return {
          tradeId: id,
          symbol,
          executed: false,
          skipped: true,
          fenced: true,
          reason: `FENCED_OUT: Stale worker ${this.workerId} lost lease before reconciliation`,
        };
      }

      // Synchronize with .NET RMS to ensure consistent position state
      let rmsRes;
      try {
        rmsRes = await this.dotnetSquareOffFn(id, 1, {
          idempotencyKey: requestKey,
          leaseEpoch: currentEpoch,
        });
      } catch (err) {
        rmsRes = { ok: false, error: err.message };
      }

      const rmsSynced = Boolean(rmsRes?.ok);
      const finalStatus = rmsSynced ? "EXECUTED" : "RECONCILIATION_REQUIRED";
      const finalRmsSync = rmsSynced ? "SYNCED" : "TIMED_OUT";

      const updateRes = db.prepare(`
        UPDATE eod_squareoff_ledger
        SET status = ?,
            rms_sync_status = ?,
            exit_price = ?,
            pnl = ?,
            reason = 'RECONCILED_ALREADY_CLOSED',
            failure_reason = ?,
            updated_at = datetime('now')
        WHERE session_date = ? AND trade_id = ? AND worker_id = ? AND lease_epoch = ?
      `).run(finalStatus, finalRmsSync, exitPrice, netPnl, rmsRes?.error || null, sessionDate, id, this.workerId, currentEpoch);

      if (updateRes.changes === 0) {
        return {
          tradeId: id,
          symbol,
          executed: false,
          skipped: true,
          fenced: true,
          reason: `FENCED_OUT: Stale worker ${this.workerId} fenced out during reconciliation finalize`,
        };
      }

      if (this.engine?.removeTrade && rmsSynced) {
        this.engine.removeTrade(id);
      }

      return {
        tradeId: id,
        symbol,
        executed: true,
        alreadyExecuted: true,
        status: finalStatus,
        rmsSyncStatus: finalRmsSync,
        exitPrice,
        pnl: netPnl,
      };
    }

    // 3. Resolve Authoritative Quote & Depth Liquidity (Cases 1-6)
    const quote = this.engine?.getAuthoritativeQuote
      ? this.engine.getAuthoritativeQuote(item.tokenKey || symbol, "ACTIVE_MONITORING")
      : this.engine?.quoteStore?.get(item.tokenKey || symbol);

    const liquidity = extractExecutableLiquidity(quote, isShort);

    // 4. Missing / Unreliable Depth Handling (Cases 1-5)
    if (!liquidity.hasExecutableLiquidity) {
      item.monitoringState = "RECONCILIATION_REQUIRED";
      item.pnlStatus = "UNVERIFIED";
      item.isStale = true;
      item.degradedReason = `EOD_SQUAREOFF_FAILED_${liquidity.reason}`;
      item.lastKnownReferencePrice = quote?.ltp || item.lastLtp || trade.entryPrice;

      // Update durable ledger: DEFERRED
      db.prepare(`
        UPDATE eod_squareoff_ledger
        SET status = 'DEFERRED',
            rms_sync_status = 'NOT_STARTED',
            failure_reason = ?,
            case_code = ?,
            updated_at = datetime('now')
        WHERE session_date = ? AND trade_id = ? AND worker_id = ? AND lease_epoch = ?
      `).run(liquidity.reason, liquidity.caseCode, sessionDate, id, this.workerId, currentEpoch);

      const alertPayload = {
        tradeId: id,
        symbol,
        reason: item.degradedReason,
        caseCode: liquidity.caseCode,
        ltp: item.lastKnownReferencePrice,
        message: `Mandatory EOD Square-Off could not liquidate ${symbol}: zero executable ${isShort ? "asks" : "bids"} available in depth (${liquidity.reason}). Position retained as OPEN.`,
      };

      this.emit("eod_squareoff_alert", alertPayload);
      if (this.engine?.publish) {
        this.engine.publish("monitoring_reconciliation_required", alertPayload);
      }

      return {
        tradeId: id,
        symbol,
        executed: false,
        status: "DEFERRED",
        rmsSyncStatus: "NOT_STARTED",
        reason: item.degradedReason,
        caseCode: liquidity.caseCode,
      };
    }

    // 5. Valid Depth Available (Case 6) -> Authoritative Atomic Close + RMS Sync
    try {
      const fillPrice = liquidity.executablePrice;
      const exactFill = true;

      // A. Atomic Fencing & SQLite Settlement Gate (eliminates TOCTOU race)
      let closeResult;
      db.exec("BEGIN IMMEDIATE;");
      try {
        const fenceUpdate = db.prepare(`
          UPDATE eod_squareoff_ledger
          SET updated_at = datetime('now')
          WHERE session_date = ? 
            AND trade_id = ? 
            AND worker_id = ? 
            AND lease_epoch = ? 
            AND claim_expires_at > datetime('now')
        `).run(sessionDate, id, this.workerId, currentEpoch);

        if (fenceUpdate.changes === 0) {
          db.exec("ROLLBACK;");
          return {
            tradeId: id,
            symbol,
            executed: false,
            skipped: true,
            fenced: true,
            status: "FENCED_OUT",
            reason: `FENCED_OUT: Worker ${this.workerId} (epoch ${currentEpoch}) lost lease or lease expired before atomic settlement`,
          };
        }

        // Authoritative trade settlement within the transaction
        if (this.closePaperTradeFn) {
          closeResult = this.closePaperTradeFn(id, { price: fillPrice, reason: "AUTO_EOD_SQUAREOFF", exactFill }, db);
        } else {
          let targetTrade;
          try {
            targetTrade = getTradeById(id);
          } catch {
            const rawTrade = db.prepare("SELECT * FROM trades WHERE id = ?").get(id);
            if (rawTrade) {
              targetTrade = {
                ...rawTrade,
                tradeMode: rawTrade.trade_mode || "PAPER",
                entryPrice: rawTrade.entry_price,
                lotSize: rawTrade.position_size && rawTrade.quantity ? (rawTrade.position_size / rawTrade.quantity) : 65,
              };
            }
          }

          assertPaperTrade(targetTrade);
          if (targetTrade.status === "OPEN") {
            const now = toLocalDateTimeInput(new Date());
            closePaperTradeInTransaction(db, targetTrade, fillPrice, "AUTO_EOD_SQUAREOFF", now, { exactFill });
            refreshPaperCapital(db);
            const updated = db.prepare("SELECT * FROM trades WHERE id = ?").get(id);
            closeResult = { trade: updated, triggered: true, closeReason: "AUTO_EOD_SQUAREOFF" };
          } else {
            closeResult = { trade: targetTrade, triggered: false, closeReason: targetTrade.close_reason };
          }
        }

        db.exec("COMMIT;");
      } catch (err) {
        try { db.exec("ROLLBACK;"); } catch {}
        throw err;
      }

      // B. Await .NET RMS synchronization
      let rmsRes;
      try {
        rmsRes = await this.dotnetSquareOffFn(id, 1, {
          idempotencyKey: requestKey,
          leaseEpoch: currentEpoch,
        });
      } catch (err) {
        rmsRes = { ok: false, error: err.message };
      }

      const rmsSuccess = Boolean(rmsRes?.ok);
      const ledgerStatus = rmsSuccess ? "EXECUTED" : "RECONCILIATION_REQUIRED";
      const rmsSyncStatus = rmsSuccess ? "SYNCED" : "TIMED_OUT";

      // C. Update durable ledger with final state, fenced by worker_id and lease_epoch
      const ledgerUpdateRes = db.prepare(`
        UPDATE eod_squareoff_ledger
        SET status = ?,
            rms_sync_status = ?,
            exit_price = ?,
            pnl = ?,
            reason = 'AUTO_EOD_SQUAREOFF',
            failure_reason = ?,
            updated_at = datetime('now')
        WHERE session_date = ? AND trade_id = ? AND worker_id = ? AND lease_epoch = ?
      `).run(
        ledgerStatus,
        rmsSyncStatus,
        fillPrice,
        closeResult.trade?.netPnl || 0,
        rmsSuccess ? null : (rmsRes?.error || "RMS_SYNC_TIMED_OUT"),
        sessionDate,
        id,
        this.workerId,
        currentEpoch
      );

      if (ledgerUpdateRes.changes === 0) {
        return {
          tradeId: id,
          symbol,
          executed: false,
          skipped: true,
          fenced: true,
          status: "FENCED_OUT",
          reason: `FENCED_OUT: Worker ${this.workerId} fenced out during ledger finalize`,
        };
      }

      if (rmsSuccess) {
        if (this.engine?.removeTrade) {
          this.engine.removeTrade(id);
        }
      } else {
        // Flag trade as RECONCILIATION_REQUIRED due to RMS timeout
        item.monitoringState = "RECONCILIATION_REQUIRED";
        item.rmsSyncStatus = "FAILED";
        item.degradedReason = "RMS_SQUAREOFF_TIMEOUT";
        this.emit("eod_rms_sync_failed", {
          tradeId: id,
          symbol,
          error: rmsRes?.error || "RMS_SQUAREOFF_TIMEOUT",
          message: `EOD Square-Off executed in SQLite, but .NET RMS synchronization timed out. Position marked RECONCILIATION_REQUIRED. New entries blocked.`,
        });
      }

      const eventPayload = {
        tradeId: id,
        symbol,
        ltp: fillPrice,
        exitPrice: closeResult.trade?.exit_price || fillPrice,
        reason: "AUTO_EOD_SQUAREOFF",
        exitTime: closeResult.trade?.exitDatetime || new Date().toISOString(),
        pnl: closeResult.trade?.netPnl,
        status: ledgerStatus,
        rmsSyncStatus,
        message: rmsSuccess ? "Mandatory EOD Square-Off Executed" : "EOD Square-Off Executed (RMS Sync Pending)",
      };

      if (this.engine?.publish) {
        this.engine.publish("eod_squareoff_executed", eventPayload);
      }

      return {
        tradeId: id,
        symbol,
        executed: true,
        status: ledgerStatus,
        rmsSyncStatus,
        exitPrice: fillPrice,
        pnl: closeResult.trade?.netPnl,
        warning: rmsSuccess ? null : "RMS_SYNC_PENDING",
      };
    } catch (err) {
      console.error(`[MarketScheduler] Error during authoritative close on trade ${id}:`, err);
      db.prepare(`
        UPDATE eod_squareoff_ledger
        SET status = 'FAILED',
            failure_reason = ?,
            updated_at = datetime('now')
        WHERE session_date = ? AND trade_id = ?
      `).run(err.message, sessionDate, id);

      return {
        tradeId: id,
        symbol,
        executed: false,
        status: "FAILED",
        reason: err.message,
      };
    }
  }

  /**
   * Reconciles any lingering or timed-out square-offs in the durable ledger.
   */
  async reconcilePendingSquareOff(tradeId, sessionDate) {
    const db = this._getDb();
    const ledger = db.prepare("SELECT * FROM eod_squareoff_ledger WHERE session_date = ? AND trade_id = ?").get(sessionDate, tradeId);
    if (!ledger) return { reconciled: false, reason: "LEDGER_ENTRY_NOT_FOUND" };

    let trade;
    try {
      trade = db.prepare("SELECT * FROM trades WHERE id = ?").get(tradeId);
    } catch {
      trade = null;
    }

    if (trade && trade.status === "CLOSED") {
      let rmsRes;
      try {
        rmsRes = await this.dotnetSquareOffFn(tradeId, 1, {
          idempotencyKey: ledger.request_key || `EOD_SQOFF_${sessionDate}_${tradeId}`,
          leaseEpoch: ledger.lease_epoch || 1,
        });
      } catch (err) {
        rmsRes = { ok: false, error: err.message };
      }

      if (rmsRes.ok) {
        db.prepare(`
          UPDATE eod_squareoff_ledger
          SET status = 'EXECUTED',
              rms_sync_status = 'RECONCILED',
              reason = 'RECONCILED_SUCCESS',
              failure_reason = null,
              updated_at = datetime('now')
          WHERE session_date = ? AND trade_id = ?
        `).run(sessionDate, tradeId);

        if (this.engine?.removeTrade) this.engine.removeTrade(tradeId);

        return { reconciled: true, status: "EXECUTED", rmsSyncStatus: "RECONCILED" };
      }
    }

    return { reconciled: false, status: ledger.status, rmsSyncStatus: ledger.rms_sync_status };
  }

  /**
   * Authoritatively reconciles all unresolved or ambiguous square-off records on startup.
   */
  async reconcileAllUnresolvedPositions() {
    const db = this._getDb();
    this._ensureLedgerTable(db);

    const unresolved = db.prepare(`
      SELECT session_date, trade_id, status, rms_sync_status 
      FROM eod_squareoff_ledger 
      WHERE status IN ('RECONCILIATION_REQUIRED', 'PENDING') 
         OR rms_sync_status IN ('NOT_STARTED', 'TIMED_OUT', 'FAILED')
    `).all();

    const results = [];
    for (const row of unresolved) {
      const res = await this.reconcilePendingSquareOff(row.trade_id, row.session_date);
      results.push({ tradeId: row.trade_id, sessionDate: row.session_date, ...res });
    }
    return results;
  }

  _checkUnresolvedOvernightExposure(sessionDate) {
    if (this.overnightAlertEmittedDates.has(sessionDate)) return;

    const openPositions = this._getOpenPositions();
    if (openPositions.length === 0) return;

    this.overnightAlertEmittedDates.add(sessionDate);

    const alertPayload = {
      sessionDate,
      unresolvedPositionsCount: openPositions.length,
      positions: openPositions.map((p) => ({
        tradeId: Number(p.trade?.id),
        symbol: p.trade?.symbol || p.tokenKey,
        monitoringState: p.monitoringState,
        pnlStatus: p.pnlStatus,
        degradedReason: p.degradedReason || "UNRESOLVED_AT_EOD",
      })),
      message: `CRITICAL ALERT: ${openPositions.length} active position(s) remain unresolved at market close. Overnight exposure exists! Zero overnight risk cannot be assumed.`,
    };

    this.emit("overnight_exposure_alert", alertPayload);
    if (this.engine?.publish) {
      this.engine.publish("overnight_exposure_alert", alertPayload);
    }

    telegramNotifier.notifyBroadcast({
      type: "OVERNIGHT_EXPOSURE_CRITICAL_ALERT",
      message: alertPayload.message,
    }).catch(() => {});
  }

  getStatus() {
    const currentEvaluation = this.evaluateRegimeForTime(this.timeProvider());
    const openPositions = this._getOpenPositions();

    return {
      started: this.started,
      currentRegime: this.currentRegime,
      isEntryAllowed: currentEvaluation.isEntryAllowed,
      isMarketOpen: currentEvaluation.isMarketOpen,
      isTradingDay: this.isTradingDay,
      sessionDate: this.currentSessionDate,
      istTime: currentEvaluation.istTime,
      calendar: this.calendar.getStatus(),
      nextTransition: currentEvaluation.nextTransition,
      squareOffLedger: {
        completedDates: Array.from(this.completedSquareOffDates),
        lastSquareOffAt: this.lastSquareOffAt,
        lastReport: this.lastSquareOffReport,
      },
      overnightExposure: {
        hasUnresolvedPositions: openPositions.length > 0,
        unresolvedCount: openPositions.length,
        positions: openPositions.map((p) => ({
          tradeId: Number(p.trade?.id),
          symbol: p.trade?.symbol,
          monitoringState: p.monitoringState,
          pnlStatus: p.pnlStatus,
        })),
      },
      health: {
        heartbeatCount: this.heartbeatCount,
        lastTickAt: this.lastTickAt,
      },
    };
  }
}

export const defaultMarketScheduler = new MarketScheduler();
