/**
 * .NET 8 HFT Gateway Bridge
 * Unifies the dual-runtime execution path between Node.js and .NET 8.
 */

const DOTNET_BASE_URL = process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
const REQUEST_TIMEOUT_MS = 2500;

export async function checkDotnetHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${DOTNET_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { healthy: true, ...data };
  } catch (err) {
    return { healthy: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  }
}

export async function deployOrderToDotnet(order = {}) {
  const transactionType = String(order.direction || "LONG").toUpperCase() === "SHORT" ? 2 : 1;
  const instrumentKey = String(order.instrumentKey || order.tokenKey || order.token || "").trim();
  const idempotencyKey = order.idempotencyKey || `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    Symbol: order.symbol,
    InstrumentKey: instrumentKey,
    TransactionType: transactionType,
    Product: 1, // Intraday
    OrderType: 5, // MarketableLimit
    Quantity: Math.max(1, Number(order.quantity || 1)),
    Price: Number(order.entryPrice || 0),
    StopLoss: Number(order.stopLoss || 0),
    Target: Number(order.targetPrice || 0),
    TriggerPrice: Number(order.entryPrice || 0),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(`${DOTNET_BASE_URL}/api/orders/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  }
}

export async function squareOffDotnetPosition(positionId, reason = 1) {
  if (!positionId) return { ok: false, error: "Missing positionId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${DOTNET_BASE_URL}/api/orders/square-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ PositionId: String(positionId), Reason: Number(reason) }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function squareOffAllDotnet() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${DOTNET_BASE_URL}/api/orders/square-off-all`, {
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
