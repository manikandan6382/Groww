/**
 * In-Memory Idempotency & Concurrency Guard
 * Prevents rapid double-click submissions and duplicate market order fills.
 */

const IDEMPOTENCY_MAP = new Map();
const DEFAULT_TTL_MS = 60000; // 60 seconds

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of IDEMPOTENCY_MAP.entries()) {
    if (now > entry.expiresAt) {
      IDEMPOTENCY_MAP.delete(key);
    }
  }
}

// Clean up every 30 seconds
const cleanupTimer = setInterval(cleanExpiredEntries, 30000);
if (cleanupTimer.unref) cleanupTimer.unref();

export function getIdempotencyKey(req) {
  return (
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    null
  );
}

export function acquireIdempotencyLock(key, ttlMs = DEFAULT_TTL_MS) {
  if (!key) return { acquired: true, key: null };

  cleanExpiredEntries();
  const existing = IDEMPOTENCY_MAP.get(key);
  if (existing) {
    if (existing.status === "IN_FLIGHT") {
      return { acquired: false, status: "IN_FLIGHT", key };
    }
    return { acquired: false, status: "COMPLETED", key, result: existing.result };
  }

  IDEMPOTENCY_MAP.set(key, {
    status: "IN_FLIGHT",
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    result: null,
  });

  return { acquired: true, key };
}

export function completeIdempotencyLock(key, result) {
  if (!key) return;
  const existing = IDEMPOTENCY_MAP.get(key);
  if (existing) {
    existing.status = "COMPLETED";
    existing.result = result;
  }
}

export function releaseIdempotencyLock(key) {
  if (!key) return;
  IDEMPOTENCY_MAP.delete(key);
}
