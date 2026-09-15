import { emitTicksFromLtpData } from "./feedParser.js";

const UPSTOX_LTP_URL = "https://api.upstox.com/v2/market-quote/ltp";

export async function executeLtpPoll(client) {
  if (!client.shouldRun || !client.isConfigured() || client.polling) return;
  const keys = Array.from(new Set([...client.pendingSubscriptions, ...client.activeSubscriptions])).filter(Boolean);
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
      client.emit("session_expired", { message });
      client.emit("status", { state: "token_expired", message });
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
  const keys = Array.from(client.pendingSubscriptions).filter((k) => !client.activeSubscriptions.has(k));
  if (!keys.length) return;
  if (client.connected) {
    client.sendJson({ guid: `sub-${Date.now()}`, method: "sub", data: { instrumentKeys: keys, mode: "ltpc" } });
  }
  keys.forEach((k) => client.activeSubscriptions.add(k));
  client.startPolling();
  client.emit("status", { state: "subscribed", subscriptions: Array.from(client.activeSubscriptions) });
}

export function startUpstoxPolling(client) {
  if (!client.shouldRun || !client.isConfigured() || client.pollTimer) return;
  client.pollTimer = setInterval(() => client.pollLtp(), client.pollMs);
  client.emit("status", { state: "polling", intervalMs: client.pollMs });
  client.pollLtp();
}

export function stopUpstoxPolling(client) {
  if (client.pollTimer) clearInterval(client.pollTimer);
  client.pollTimer = null;
  client.polling = false;
}
