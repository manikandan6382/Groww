import http from "node:http";

const DOTNET_BASE_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
const TICKS_ENDPOINT = `${DOTNET_BASE_URL}/api/rms/ticks`;
const MAX_BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 50;
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });

let buffer = [];
let flushTimer = null;
let isFlushing = false;
let consecutiveFailures = 0;
let lastFailureLogAt = 0;

export function forwardTickToDotnet(tick) {
  if (!tick) return;
  const instrumentKey = tick.key || tick.tokenKey || tick.token || tick.instrumentKey;
  const ltp = Number(tick.ltp || tick.price || 0);
  if (!instrumentKey || ltp <= 0) return;

  buffer.push({
    instrumentKey: String(instrumentKey),
    ltp,
    high: Number(tick.high || 0),
    low: Number(tick.low || 0),
    volume: Number(tick.volume || 0),
  });

  if (buffer.length >= MAX_BATCH_SIZE) {
    flushDotnetTicks();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushDotnetTicks();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function flushDotnetTicks() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!buffer.length || isFlushing) return;

  const now = Date.now();
  if (consecutiveFailures >= 3 && now - lastFailureLogAt < 2_000) {
    return;
  }

  const batch = buffer;
  buffer = [];
  isFlushing = true;

  try {
    const payload = JSON.stringify(batch);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);

    const res = await fetch(TICKS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      consecutiveFailures = 0;
    } else {
      recordFailure(`HTTP ${res.status}`);
    }
  } catch (err) {
    recordFailure(err.name === "AbortError" ? "Timeout" : err.message);
  } finally {
    isFlushing = false;
    if (buffer.length >= MAX_BATCH_SIZE) {
      flushDotnetTicks();
    }
  }
}

function recordFailure(reason) {
  consecutiveFailures++;
  const now = Date.now();
  if (now - lastFailureLogAt > 10_000) {
    lastFailureLogAt = now;
    console.warn(`[DotnetForwarder] Ticks push deferred: ${reason} (fails=${consecutiveFailures})`);
  }
}
