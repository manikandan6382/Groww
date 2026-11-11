import { emitTicksFromLtpData } from "./feedParser.js";

const UPSTOX_LTP_URL = "https://api.upstox.com/v2/market-quote/ltp";

export async function executeLtpPoll(client) {
  if (!client.shouldRun || !client.isConfigured() || client.polling) return;
  // If WebSocket is actively connected, pause REST polling to avoid competing ticks
  if (client.connected) return;

  const keys = Array.from(client.requestedSubscriptions || new Set([...(client.pendingSubscriptions || []), ...(client.activeSubscriptions || [])])).filter(Boolean);
  if (!keys.length) return;

  client.refreshAccessToken();
  client.polling = true;
  try {
    const endpoint = new URL(UPSTOX_LTP_URL);
    endpoint.searchParams.set("instrument_key", keys.join(","));
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${client.accessToken}`, Accept: "application/json", "Api-Version": "2.0" },
    });

    if (res.status === 401 || res.status === 403) {
      const message = "Upstox access token expired or rejected. Refresh data/upstox-session.json.";
      client.lastError = message;
      client.connectionState = "TOKEN_EXPIRED";
      stopUpstoxPolling(client);
      client.emit("session_expired", { message });
      client.emit("status", { state: "TOKEN_EXPIRED", message });
      return;
    }

    if (!res.ok) throw new Error(`Upstox LTP failed: ${res.status} ${res.statusText}`);
    const body = await res.json();
    client.lastPollAt = new Date().toISOString();
    client.lastError = "";
    emitTicksFromLtpData(client, body?.data || {}, keys);
  } catch (error) {
    client.lastError = error.message;
    client.emit("status", { state: "poll_error", message: error.message });
    client.emit("error", error);
  } finally {
    client.polling = false;
  }
}

export function flushUpstoxSubscriptions(client) {
  if (!client.connected) {
    // Socket not connected; subscriptions stay pending in client.pendingSubscriptions
    if (client.shouldRun && typeof client.startPolling === "function") {
      client.startPolling();
    }
    client.emit("status", {
      state: "pending_connect",
      pending: Array.from(client.pendingSubscriptions || []),
      subscriptions: Array.from(client.sentSubscriptions || client.activeSubscriptions || [])
    });
    return false;
  }

  const keys = Array.from(client.pendingSubscriptions || []);
  if (!keys.length) return true;

  const ok = client.sendJson({
    guid: `sub-${Date.now()}`,
    method: "sub",
    data: { instrumentKeys: keys, mode: "full" }
  });

  if (ok) {
    for (const k of keys) {
      client.pendingSubscriptions?.delete(k);
      client.sentSubscriptions?.add(k);
      client.activeSubscriptions?.add(k);
    }
    client.connectionState = "SUBSCRIBED";
    client.emit("status", {
      state: "SUBSCRIBED",
      sent: keys,
      subscriptions: Array.from(client.sentSubscriptions || client.activeSubscriptions || [])
    });
    return true;
  } else {
    // Send failed; preserve keys in pending queue
    client.emit("status", {
      state: "send_failed",
      pending: keys
    });
    return false;
  }
}

export function startUpstoxPolling(client) {
  if (!client.shouldRun || !client.isConfigured() || client.pollTimer) return;
  if (client.connected) return;

  client.pollTimer = setInterval(() => {
    if (!client.connected) {
      client.pollLtp();
    }
  }, client.pollMs);
  client.emit("status", { state: "polling", intervalMs: client.pollMs });
  client.pollLtp();
}

export function stopUpstoxPolling(client) {
  if (client.pollTimer) clearInterval(client.pollTimer);
  client.pollTimer = null;
  client.polling = false;
}
