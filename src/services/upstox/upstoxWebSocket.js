import { parseRawMessage } from "./feedParser.js";

const UPSTOX_WS_URL = "wss://api.upstox.com/v2/feed/market-data-feed";
const RECONNECT_MS = 3_000;
const MAX_RECONNECT_MS = 30_000;

export function connectUpstoxWebSocket(client) {
  if (!client.shouldRun || !client.isConfigured() || client.connecting || client.connected) return;
  if (typeof WebSocket === "undefined") {
    client.emit("error", new Error("No global WebSocket in this Node runtime."));
    return;
  }

  client.connecting = true;
  client.emit("status", { state: "connecting" });

  const socket = new WebSocket(UPSTOX_WS_URL, {
    headers: { Authorization: `Bearer ${client.accessToken}`, "Api-Version": "2.0" },
  });
  client.socket = socket;

  socket.addEventListener("open", () => {
    client.connected = true;
    client.connecting = false;
    client.reconnectMs = RECONNECT_MS;
    client.emit("status", { state: "connected" });
    client.flushSubscriptions();
  });

  socket.addEventListener("message", (event) => parseRawMessage(client, event.data));
  socket.addEventListener("error", () => client.emit("status", { state: "socket_error" }));
  socket.addEventListener("close", () => {
    const wasConnected = client.connected;
    client.connected = false;
    client.connecting = false;
    client.socket = null;
    client.activeSubscriptions.clear();
    client.emit("status", { state: wasConnected ? "disconnected" : "closed" });
    client.scheduleReconnect();
  });
}

export function sendWebSocketJson(client, payload) {
  if (!client.socket || client.socket.readyState !== WebSocket.OPEN) return false;
  client.socket.send(JSON.stringify(payload));
  return true;
}

export function scheduleWebSocketReconnect(client) {
  if (!client.shouldRun || !client.isConfigured() || client.reconnectTimer) return;
  const delay = client.reconnectMs;
  client.reconnectMs = Math.min(MAX_RECONNECT_MS, Math.round(client.reconnectMs * 1.6));
  client.reconnectTimer = setTimeout(() => {
    client.reconnectTimer = null;
    client.connect();
  }, delay);
  client.emit("status", { state: "reconnecting", delay });
}
