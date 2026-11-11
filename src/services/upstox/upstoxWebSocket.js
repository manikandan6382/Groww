import WebSocket from "ws";
import { parseRawMessage } from "./feedParser.js";

const UPSTOX_V3_AUTH_URL = "https://api.upstox.com/v3/feed/market-data-feed/authorize";
const UPSTOX_V3_WS_FALLBACK = "wss://api.upstox.com/v3/feed/market-data-feed";
const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export async function connectUpstoxWebSocket(client) {
  if (!client.shouldRun || !client.isConfigured() || client.connecting || client.connected) {
    return;
  }

  client.connecting = true;
  client.connectionState = "CONNECTING";
  client.emit("status", { state: "CONNECTING" });

  const token = typeof client.refreshAccessToken === "function" ? client.refreshAccessToken() : client.accessToken;
  if (!token) {
    client.connecting = false;
    client.connectionState = "DISCONNECTED";
    client.emit("status", { state: "not_configured", message: "Missing Upstox access token." });
    return;
  }

  let wsUrl = UPSTOX_V3_WS_FALLBACK;
  client.connectionState = "AUTHORIZING";
  client.emit("status", { state: "AUTHORIZING" });

  try {
    const authRes = await fetch(UPSTOX_V3_AUTH_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (authRes.status === 401 || authRes.status === 403) {
      const message = "Upstox access token expired or invalid (HTTP " + authRes.status + ").";
      client.connecting = false;
      client.connected = false;
      client.lastError = message;
      client.connectionState = "TOKEN_EXPIRED";
      if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
        client.pendingSubscriptions = new Set(client.requestedSubscriptions);
      }
      client.sentSubscriptions?.clear();
      client.activeSubscriptions?.clear();
      client.observedSubscriptions?.clear();
      client.emit("session_expired", { message });
      client.emit("status", { state: "TOKEN_EXPIRED", message });
      return;
    }

    if (authRes.ok) {
      const authData = await authRes.json();
      const redirectUri = authData?.data?.authorized_redirect_uri || authData?.data?.authorizedRedirectUri;
      if (redirectUri && typeof redirectUri === "string" && redirectUri.startsWith("wss://")) {
        wsUrl = redirectUri;
      }
    } else {
      console.warn(`[upstoxWebSocket] Authorize endpoint returned HTTP ${authRes.status}, falling back to default V3 WSS.`);
    }
  } catch (authErr) {
    console.warn(`[upstoxWebSocket] Authorization handshake network warning: ${authErr.message}. Attempting direct connect.`);
  }

  if (!client.shouldRun) {
    client.connecting = false;
    return;
  }

  try {
    const socket = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      followRedirects: true,
    });
    client.socket = socket;

    socket.on("open", () => {
      client.connected = true;
      client.connecting = false;
      client.reconnectMs = INITIAL_RECONNECT_MS;
      client.connectionState = "CONNECTED";
      client.emit("status", { state: "CONNECTED" });
      if (typeof client.stopPolling === "function") {
        client.stopPolling();
      }
      // Re-arm all requested subscriptions as pending on the new connection
      if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
        client.pendingSubscriptions = new Set(client.requestedSubscriptions);
      }
      client.sentSubscriptions?.clear();
      client.activeSubscriptions?.clear();
      client.observedSubscriptions?.clear();
      client.flushSubscriptions();
    });

    socket.on("message", (data) => {
      parseRawMessage(client, data);
    });

    socket.on("error", (err) => {
      const safeErrorMsg = err?.message || "WebSocket connection error";
      client.emit("status", { state: "socket_error", message: safeErrorMsg });
    });

    socket.on("close", (code, reason) => {
      const wasConnected = client.connected;
      client.connected = false;
      client.connecting = false;
      client.socket = null;
      if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
        client.pendingSubscriptions = new Set(client.requestedSubscriptions);
      }
      client.sentSubscriptions?.clear();
      client.activeSubscriptions?.clear();
      client.observedSubscriptions?.clear();

      if (client.connectionState !== "TOKEN_EXPIRED") {
        client.connectionState = wasConnected ? "DISCONNECTED" : "CLOSED";
        client.emit("status", {
          state: client.connectionState,
          code,
          reason: reason ? reason.toString() : "",
        });
        client.scheduleReconnect();
      }
    });
  } catch (sockErr) {
    client.connecting = false;
    client.connected = false;
    client.socket = null;
    client.connectionState = "DISCONNECTED";
    if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
      client.pendingSubscriptions = new Set(client.requestedSubscriptions);
    }
    client.sentSubscriptions?.clear();
    client.activeSubscriptions?.clear();
    client.observedSubscriptions?.clear();
    client.emit("status", { state: "socket_error", message: sockErr.message });
    client.scheduleReconnect();
  }
}

export function sendWebSocketJson(client, payload) {
  if (!client.socket || client.socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    const jsonStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const binaryBuffer = Buffer.from(jsonStr, "utf-8");
    client.socket.send(binaryBuffer);
    return true;
  } catch (err) {
    client.lastError = `Send error: ${err.message}`;
    return false;
  }
}

export function scheduleWebSocketReconnect(client) {
  if (!client.shouldRun || !client.isConfigured() || client.reconnectTimer) {
    return;
  }
  if (client.connectionState === "TOKEN_EXPIRED") {
    return;
  }

  const delay = client.reconnectMs || INITIAL_RECONNECT_MS;
  client.reconnectMs = Math.min(MAX_RECONNECT_MS, Math.round(delay * 2));
  client.connectionState = "RECONNECTING";
  client.reconnectTimer = setTimeout(() => {
    client.reconnectTimer = null;
    client.connect();
  }, delay);
  client.emit("status", { state: "RECONNECTING", delay });
}
