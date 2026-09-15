/**
 * .NET 8 Trading System API Service Bridge.
 * Routes through Vite proxy (/api/dotnet -> http://127.0.0.1:5001/api).
 */

const BASE_URL = "/api";

function generateIdempotencyKey() {
  return "ui_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
}

export async function checkDotnetHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { credentials: "omit" });
    if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

export async function validateOrderWithDotnet({ entryPrice, stopLoss, target, quantity }) {
  try {
    const res = await fetch(`${BASE_URL}/orders/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        EntryPrice: Number(entryPrice),
        StopLoss: Number(stopLoss),
        Target: Number(target),
        Quantity: Number(quantity)
      })
    });
    return await res.json();
  } catch (err) {
    return { isValid: false, errorMessage: err.message };
  }
}

export async function deployOrderWithDotnet({
  symbol,
  instrumentKey,
  transactionType = 1, // 1 = Buy, 2 = Sell
  product = 1,         // 1 = Intraday, 2 = Delivery
  orderType = 5,       // 5 = MarketableLimit
  quantity,
  price,
  stopLoss,
  target
}) {
  const key = generateIdempotencyKey();
  try {
    const res = await fetch(`${BASE_URL}/orders/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": key
      },
      body: JSON.stringify({
        Symbol: symbol,
        InstrumentKey: instrumentKey,
        TransactionType: transactionType,
        Product: product,
        OrderType: orderType,
        Quantity: Number(quantity),
        Price: Number(price),
        StopLoss: Number(stopLoss),
        Target: Number(target)
      })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getDotnetPositions() {
  try {
    const res = await fetch(`${BASE_URL}/rms/positions`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function panicSquareOffAllDotnet() {
  try {
    const res = await fetch(`${BASE_URL}/orders/square-off-all`, { method: "POST" });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
