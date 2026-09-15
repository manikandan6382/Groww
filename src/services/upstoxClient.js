import { EventEmitter } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSavedAccessToken, watchSessionFile } from "./upstox/upstoxUtils.js";
import { resolveContractToken } from "./upstox/contractResolver.js";
import { fetchUpstoxInstruments } from "./upstox/instrumentFetcher.js";
import { executeLtpPoll, flushUpstoxSubscriptions, startUpstoxPolling, stopUpstoxPolling } from "./upstox/upstoxPolling.js";
import { connectUpstoxWebSocket, sendWebSocketJson, scheduleWebSocketReconnect } from "./upstox/upstoxWebSocket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const RECONNECT_MS = 3_000;
const LTP_POLL_MS = Math.max(1_500, Number(process.env.UPSTOX_LTP_POLL_MS || 3_000));

export class UpstoxClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionFile = path.resolve(projectRoot, options.sessionFile || process.env.UPSTOX_SESSION_FILE || path.join("data", "upstox-session.json"));
    this.accessToken = options.accessToken || readSavedAccessToken(this.sessionFile) || process.env.UPSTOX_ACCESS_TOKEN || "";
    this.reconnectMs = RECONNECT_MS;
    this.socket = null;
    this.connected = this.connecting = this.shouldRun = this.polling = false;
    this.reconnectTimer = this.pollTimer = null;
    this.pollMs = Number(options.pollMs || LTP_POLL_MS);
    this.lastPollAt = null;
    this.lastError = "";
    this.pendingSubscriptions = new Set();
    this.activeSubscriptions = new Set();
    this.instrumentCache = null;
    this.instrumentCacheAt = 0;
    watchSessionFile(this);
  }

  isConfigured() {
    this.refreshAccessToken();
    return Boolean(this.accessToken);
  }

  refreshAccessToken() {
    const saved = readSavedAccessToken(this.sessionFile);
    if (saved && saved !== this.accessToken) {
      this.accessToken = saved;
      this.lastError = "";
    } else if (!this.accessToken) {
      this.accessToken = process.env.UPSTOX_ACCESS_TOKEN || "";
    }
    return this.accessToken;
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      connected: this.connected || Boolean(this.pollTimer),
      websocketConnected: this.connected,
      connecting: this.connecting,
      polling: Boolean(this.pollTimer),
      lastPollAt: this.lastPollAt,
      lastError: this.lastError,
      subscriptions: Array.from(new Set([...this.pendingSubscriptions, ...this.activeSubscriptions])),
      provider: "Upstox",
    };
  }

  start() {
    this.shouldRun = true;
    if (!this.isConfigured()) {
      this.emit("status", { state: "not_configured", message: "Missing UPSTOX_ACCESS_TOKEN in .env. Complete OAuth flow first." });
      return;
    }
    this.startPolling();
    if (process.env.UPSTOX_ENABLE_WS === "1") this.connect();
  }

  stop() {
    this.shouldRun = false;
    this.connected = this.connecting = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopPolling();
    this.reconnectTimer = null;
    if (this.socket) {
      try { this.socket.close(); } catch {}
    }
    this.socket = null;
  }

  connect() {
    connectUpstoxWebSocket(this);
  }

  subscribe(key) {
    const normalized = String(key || "").trim().toUpperCase();
    if (!normalized) return;
    this.pendingSubscriptions.add(normalized);
    if (!this.shouldRun) this.start();
    this.flushSubscriptions();
  }

  unsubscribe(key) {
    const normalized = String(key || "").trim().toUpperCase();
    if (!normalized) return;
    this.pendingSubscriptions.delete(normalized);
    if (this.connected && this.activeSubscriptions.has(normalized)) {
      this.sendJson({ guid: `unsub-${Date.now()}`, method: "unsub", data: { instrumentKeys: [normalized] } });
    }
    this.activeSubscriptions.delete(normalized);
    if (!this.pendingSubscriptions.size && !this.activeSubscriptions.size) this.stopPolling();
  }

  async resolveOptionToken(trade) {
    return resolveContractToken(this, trade);
  }

  async getInstruments() {
    return fetchUpstoxInstruments(this, projectRoot);
  }

  flushSubscriptions() {
    flushUpstoxSubscriptions(this);
  }

  startPolling() {
    startUpstoxPolling(this);
  }

  stopPolling() {
    stopUpstoxPolling(this);
  }

  async pollLtp() {
    await executeLtpPoll(this);
  }

  sendJson(payload) {
    return sendWebSocketJson(this, payload);
  }

  scheduleReconnect() {
    scheduleWebSocketReconnect(this);
  }
}

export function createUpstoxClient(options = {}) {
  return new UpstoxClient(options);
}
