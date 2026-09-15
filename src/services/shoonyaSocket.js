import { normalizeTick } from "./shoonyaUtils.js";

const DEFAULT_RECONNECT_MS = 2_000;

export function handleShoonyaMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    client.emit("raw", raw);
    return;
  }

  if (message.t === "ck") {
    if (String(message.s || "").toLowerCase() === "ok") {
      client.connected = true;
      client.connecting = false;
      client.reconnectMs = DEFAULT_RECONNECT_MS;
      client.emit("status", { state: "connected" });
      client.flushSubscriptions();
    } else {
      client.connected = false;
      client.connecting = false;
      client.emit("session_expired", message);
      client.emit("status", { state: "auth_failed", message: message.emsg || "Shoonya login/session failed." });
    }
    return;
  }

  if (message.t === "tk" || message.t === "tf") {
    const tick = normalizeTick(message);
    if (tick) client.emit("tick", tick);
    return;
  }

  if (message.t === "om") return;
  client.emit("message", message);
}

export function attachShoonyaSocketListeners(client, socket) {
  socket.addEventListener("open", () => {
    client.send({
      t: "c",
      uid: client.userId,
      actid: client.accountId,
      susertoken: client.sessionToken,
      source: client.source,
    });
  });

  socket.addEventListener("message", (event) => {
    handleShoonyaMessage(client, event.data);
  });

  socket.addEventListener("error", () => {
    client.emit("status", { state: "socket_error" });
  });

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
