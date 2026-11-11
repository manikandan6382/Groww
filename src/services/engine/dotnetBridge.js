/**
 * .NET 8 HFT Gateway Bridge
 * Unifies the dual-runtime execution path between Node.js and .NET 8.
 */

function getDotnetBaseUrl() {
  return process.env.DOTNET_RMS_URL || "http://127.0.0.1:5001";
}
const REQUEST_TIMEOUT_MS = 2500;

export async function checkDotnetHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${getDotnetBaseUrl()}/api/health`, {
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
  // Option buying is strictly BUY side (TransactionType = 1)
  const transactionType = 1;
  const instrumentKey = String(order.instrumentKey || order.tokenKey || order.token || "").trim();
  const idempotencyKey = order.idempotencyKey || `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Explicitly resolve lots, lotSize, and total executable units
  const symbolUpper = String(order.symbol || "").toUpperCase();
  const defaultLotSize = symbolUpper.includes("BANKNIFTY") ? 30 : symbolUpper.includes("SENSEX") ? 20 : 65;
  const lotSize = Math.max(1, Number(order.lotSize || defaultLotSize));
  const lots = Math.max(1, Number(order.lots || (order.quantity && order.quantity < 10 ? order.quantity : 1)));
  const totalUnits = Number(order.totalUnits || order.units || (Number(order.quantity) >= lotSize ? order.quantity : lots * lotSize));

  const payload = {
    Symbol: order.symbol,
    InstrumentKey: instrumentKey,
    TransactionType: transactionType,
    Product: 1, // Intraday
    OrderType: 5, // MarketableLimit
    Quantity: totalUnits, // Explicit executable units (e.g. 65 for 1 NIFTY lot)
    Price: Number(order.entryPrice || 0),
    StopLoss: Number(order.stopLoss || 0),
    Target: Number(order.targetPrice || 0),
    TriggerPrice: Number(order.entryPrice || 0),
    TestingMode: Boolean(order.testingMode || order.isTestingMode),
    IsUnrestricted: Boolean(order.isUnrestricted),
    CurrentDailyLoss: order.currentDailyLoss != null ? Number(order.currentDailyLoss) : null,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(`${getDotnetBaseUrl()}/api/orders/deploy`, {
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
      return { ok: false, status: res.status, data, error: data.error || ('HTTP ' + res.status) };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  }
}

export async function squareOffDotnetPosition(positionId, reason = 1, options = {}) {
  if (!positionId) return { ok: false, error: "Missing positionId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headers = { "Content-Type": "application/json" };
    if (options.idempotencyKey) {
      headers["X-Idempotency-Key"] = String(options.idempotencyKey);
    }
    if (options.leaseEpoch !== undefined && options.leaseEpoch !== null) {
      headers["X-Lease-Epoch"] = String(options.leaseEpoch);
    }

    const res = await fetch(`${getDotnetBaseUrl()}/api/orders/square-off`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        PositionId: String(positionId),
        Reason: Number(reason),
        IdempotencyKey: options.idempotencyKey || null,
        LeaseEpoch: options.leaseEpoch !== undefined ? Number(options.leaseEpoch) : null,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status === 404 && data?.message?.includes("already closed")) {
      return { ok: true, data: { ...data, alreadyClosed: true } };
    }
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function squareOffAllDotnet() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${getDotnetBaseUrl()}/api/orders/square-off-all`, {
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

export async function rehydrateDotnetPosition(position = {}) {
  const posId = String(position.positionId || position.id || "");
  if (!posId) return { ok: false, error: "Missing positionId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const payload = {
      PositionId: posId,
      Symbol: String(position.symbol || "").toUpperCase(),
      InstrumentKey: String(position.instrumentKey || position.tokenKey || position.symbol || ""),
      Direction: String(position.direction || "BUY").toUpperCase(),
      Quantity: Number(position.quantity || position.units || 65),
      EntryPrice: Number(position.entryPrice || 0),
      StopLoss: Number(position.stopLoss || 0),
      Target: Number(position.target || position.targetPrice || 0),
    };
    const res = await fetch(`${getDotnetBaseUrl()}/api/rms/positions/rehydrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}


export async function getDotnetPositions() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${getDotnetBaseUrl()}/api/rms/positions`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  }
}

export async function reconcileDotnetPosition(positionId, updates = {}) {
  if (!positionId) return { ok: false, error: "Missing positionId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const payload = {
      EntryPrice: Number(updates.entryPrice || 0),
      StopLoss: Number(updates.stopLoss || 0),
      Target: Number(updates.target || updates.targetPrice || 0),
      TestingMode: Boolean(updates.testingMode || updates.isTesting),
      OperationId: updates.operationId || undefined,
    };
    if (updates.quantity || updates.units) {
      payload.Quantity = Number(updates.quantity || updates.units);
    }
    const res = await fetch(`${getDotnetBaseUrl()}/api/rms/positions/${encodeURIComponent(positionId)}/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: !res.ok ? (data?.error || data?.detail || `HTTP ${res.status}`) : null,
    };
  } catch (err) {
    const isTimeout = err.name === "AbortError";
    return { ok: false, status: isTimeout ? 504 : 500, error: isTimeout ? "Timeout" : err.message };
  }
}

export async function unregisterDotnetPosition(positionId) {
  if (!positionId) return { ok: false, error: "Missing positionId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${getDotnetBaseUrl()}/api/rms/positions/${encodeURIComponent(positionId)}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

export async function updateStopLossDotnet(tradeId, stopLoss, currentPrice = null) {
  if (!tradeId) return { ok: false, error: "Missing tradeId" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${getDotnetBaseUrl()}/api/paper-lab/trades/${tradeId}/stop-loss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        StopLoss: Number(stopLoss),
        CurrentPrice: currentPrice ? Number(currentPrice) : undefined
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}


