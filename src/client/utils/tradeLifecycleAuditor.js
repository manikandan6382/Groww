/**
 * Trade Lifecycle Auditor & Runtime Invariant Engine
 * Enforces authoritative state progression and records auditable lifecycle transitions.
 */

const MAX_AUDIT_LOGS = 300;
const lifecycleAuditLogs = [];

/**
 * Record a lifecycle event with full state snapshot.
 */
export function recordLifecycleEvent({
  tradeId,
  revision = 1,
  event,
  state_before = null,
  state_after = null,
  currentPrice = null,
  entryPrice = null,
  initialSL = null,
  currentSL = null,
  target = null,
  BETrigger = null,
  source = "CLIENT_STORE",
  details = null
}) {
  const logEntry = {
    tradeId: String(tradeId),
    revision: Number(revision) || 1,
    timestamp: new Date().toISOString(),
    epochMs: Date.now(),
    event,
    state_before,
    state_after,
    currentPrice: currentPrice != null ? Number(currentPrice) : null,
    entryPrice: entryPrice != null ? Number(entryPrice) : null,
    initialSL: initialSL != null ? Number(initialSL) : null,
    currentSL: currentSL != null ? Number(currentSL) : null,
    target: target != null ? Number(target) : null,
    BETrigger: BETrigger != null ? Number(BETrigger) : null,
    source,
    details
  };

  lifecycleAuditLogs.push(logEntry);
  if (lifecycleAuditLogs.length > MAX_AUDIT_LOGS) {
    lifecycleAuditLogs.shift();
  }

  if (typeof window !== "undefined") {
    window.__tradeLifecycleAuditLogs = lifecycleAuditLogs;
  }

  // Structured console telemetry for debugging
  if (process.env.NODE_ENV !== "production" || typeof window !== "undefined") {
    console.info(`[TradeLifecycleAudit] #${tradeId} (rev ${revision}) [${event}] ${state_before || "?"} -> ${state_after || "?"} | Entry: ₹${entryPrice} SL: ₹${currentSL} TP: ₹${target}`, logEntry);
  }

  return logEntry;
}

/**
 * Retrieve current lifecycle audit history.
 */
export function getLifecycleAuditLogs(tradeId = null) {
  if (!tradeId) return [...lifecycleAuditLogs];
  const sId = String(tradeId);
  return lifecycleAuditLogs.filter((l) => l.tradeId === sId);
}

/**
 * Assert strict lifecycle invariants. Throws error or logs loudly upon violation.
 */
export function assertTradeInvariants(trade, targetTransition = null) {
  if (!trade) return { valid: false, error: "Trade object is null or undefined" };

  const id = trade.id || trade.serverId;
  const isShort = String(trade.direction || "LONG").toUpperCase() === "SHORT";
  const entry = Number(trade.entryPrice || trade.plannedEntryPrice || 0);
  const initialSL = Number(trade.initialStopLoss || trade.stopLoss || 0);
  const target = Number(trade.targetPrice || trade.target || 0);
  const qty = Number(trade.quantity || 0);
  const status = String(trade.status || "ACTIVE").toUpperCase();

  // Invariant 1: Quantity must be positive
  if (qty <= 0) {
    const msg = `[Lifecycle Invariant Violation] Trade #${id}: Quantity (${qty}) must be > 0.`;
    console.error(msg, trade);
    return { valid: false, error: msg };
  }

  // Invariant 2: Active Trade SL/Target Geometry
  if (status === "ACTIVE" || targetTransition === "ACTIVE") {
    if (isShort) {
      if (initialSL > 0 && initialSL <= entry) {
        const msg = `[Lifecycle Invariant Violation] Trade #${id} (SHORT): Initial SL (₹${initialSL}) must be strictly greater than Entry (₹${entry}).`;
        console.error(msg, trade);
        return { valid: false, error: msg };
      }
      if (target > 0 && target >= entry) {
        const msg = `[Lifecycle Invariant Violation] Trade #${id} (SHORT): Target (₹${target}) must be strictly less than Entry (₹${entry}).`;
        console.error(msg, trade);
        return { valid: false, error: msg };
      }
    } else {
      if (initialSL > 0 && initialSL >= entry) {
        const msg = `[Lifecycle Invariant Violation] Trade #${id} (LONG): Initial SL (₹${initialSL}) must be strictly less than Entry (₹${entry}).`;
        console.error(msg, trade);
        return { valid: false, error: msg };
      }
      if (target > 0 && target <= entry) {
        const msg = `[Lifecycle Invariant Violation] Trade #${id} (LONG): Target (₹${target}) must be strictly greater than Entry (₹${entry}).`;
        console.error(msg, trade);
        return { valid: false, error: msg };
      }
    }
  }

  // Invariant 3: CLOSED trade cannot transition back to ACTIVE
  if (status === "CLOSED" && (targetTransition === "ACTIVE" || targetTransition === "OPEN")) {
    const msg = `[Lifecycle Invariant Violation] Trade #${id}: A CLOSED trade cannot transition back to ACTIVE.`;
    console.error(msg, trade);
    return { valid: false, error: msg };
  }

  // Invariant 4: PENDING trade cannot execute exits
  if (status === "PENDING_SERVER_CONFIRMATION" && (targetTransition === "EXIT_TRIGGERED" || targetTransition === "SQUARE_OFF")) {
    const msg = `[Lifecycle Invariant Violation] Trade #${id}: A PENDING trade cannot execute SL/TP/BE exits prior to server confirmation.`;
    console.error(msg, trade);
    return { valid: false, error: msg };
  }

  return { valid: true, error: null };
}
