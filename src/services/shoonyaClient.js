import { EventEmitter } from "node:events";
import { normalizeSubscriptionKey } from "./shoonyaUtils.js";
import { attachShoonyaSocketListeners } from "./shoonyaSocket.js";
import { resolveShoonyaOptionToken, postShoonyaJson } from "./shoonyaHttp.js";

const DEFAULT_WS_URL = "wss://api.shoonya.com/NorenWSTP/";
const DEFAULT_REST_URL = "https://api.shoonya.com/NorenWClientTP/";
const DEFAULT_SOURCE = "API";
const DEFAULT_RECONNECT_MS = 2_000;
const MAX_RECONNECT_MS = 30_000;

export class ShoonyaClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.wsUrl = options.wsUrl || process.env.SHOONYA_WS_URL || DEFAULT_WS_URL;
    this.restUrl = options.restUrl || process.env.SHOONYA_REST_URL || DEFAULT_REST_URL;
    this.userId = options.userId || process.env.SHOONYA_USER_ID || process.env.SHOONYA_UID || "";
    this.accountId = options.accountId || process.env.SHOONYA_ACCOUNT_ID || process.env.SHOONYA_ACTID || this.userId;
    this.sessionToken = options.sessionToken || process.env.SHOONYA_SESSION_TOKEN || process.env.SHOONYA_SUSERTOKEN || "";
    this.source = options.source || process.env.SHOONYA_SOURCE || DEFAULT_SOURCE;
    this.reconnectMs = Number(options.reconnectMs || DEFAULT_RECONNECT_MS);
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.shouldRun = false;
    this.reconnectTimer = null;
    this.pendingSubscriptions = new Set();
    this.activeSubscriptions = new Set();
  }

  isConfigured() {
    return Boolean(this.userId && this.accountId && this.sessionToken);
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      connected: this.connected,
      connecting: this.connecting,
      subscriptions: Array.from(new Set([...this.pendingSubscriptions, ...this.activeSubscriptions])),
      wsUrl: this.wsUrl,
    };
  }

  start() {
    this.shouldRun = true;
    if (!this.isConfigured()) {
      this.emit("status", { state: "not_configured", message: "Missing Shoonya credentials in .env." });
      return;
    }
    this.connect();
  }

  stop() {
    this.shouldRun = false;
    this.connected = false;
    this.connecting = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
    }
    this.socket = null;
  }

  connect() {
    if (!this.shouldRun || !this.isConfigured() || this.connecting || this.connected) return;
    if (typeof WebSocket === "undefined") {
      this.emit("error", new Error("This Node runtime has no global WebSocket client."));
      return;
    }

    this.connecting = true;
    this.emit("status", { state: "connecting" });

    const socket = new WebSocket(this.wsUrl);
    this.socket = socket;
    attachShoonyaSocketListeners(this, socket);
  }

  subscribe(key) {
    const normalized = normalizeSubscriptionKey(key);
    if (!normalized) return;
    this.pendingSubscriptions.add(normalized);
    if (!this.shouldRun) this.start();
    if (this.connected) this.flushSubscriptions();
  }

  unsubscribe(key) {
    const normalized = normalizeSubscriptionKey(key);
    if (!normalized) return;
    this.pendingSubscriptions.delete(normalized);
    if (!this.connected || !this.activeSubscriptions.has(normalized)) return;
    this.send({ t: "u", k: normalized });
    this.activeSubscriptions.delete(normalized);
  }

  async resolveOptionToken(trade) {
    return resolveShoonyaOptionToken(this, trade);
  }

  async postJson(endpoint, body) {
    return postShoonyaJson(this, endpoint, body);
  }

  flushSubscriptions() {
    const keys = Array.from(this.pendingSubscriptions).filter((key) => !this.activeSubscriptions.has(key));
    if (!keys.length) return;
    this.send({ t: "t", k: keys.join("#") });
    keys.forEach((key) => this.activeSubscriptions.add(key));
    this.emit("status", { state: "subscribed", subscriptions: Array.from(this.activeSubscriptions) });
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  scheduleReconnect() {
    if (!this.shouldRun || !this.isConfigured() || this.reconnectTimer) return;
    const delay = this.reconnectMs;
    this.reconnectMs = Math.min(MAX_RECONNECT_MS, Math.round(this.reconnectMs * 1.6));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    this.emit("status", { state: "reconnecting", delay });
  }
}

export function createShoonyaClient(options = {}) {
  return new ShoonyaClient(options);
}
