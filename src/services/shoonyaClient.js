import { EventEmitter } from "node:events";

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
      } catch {
        // Ignore close errors.
      }
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

    socket.addEventListener("open", () => {
      this.send({
        t: "c",
        uid: this.userId,
        actid: this.accountId,
        susertoken: this.sessionToken,
        source: this.source,
      });
    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener("error", () => {
      this.emit("status", { state: "socket_error" });
    });

    socket.addEventListener("close", () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.connecting = false;
      this.socket = null;
      this.activeSubscriptions.clear();
      this.emit("status", { state: wasConnected ? "disconnected" : "closed" });
      this.scheduleReconnect();
    });
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
    const manual = getManualToken(trade);
    if (manual) return manual;
    if (!this.isConfigured()) return null;

    const searchText = buildShoonyaSearchText(trade);
    if (!searchText) return null;

    const payload = await this.postJson("SearchScrip", {
      uid: this.userId,
      exch: "NFO",
      stext: searchText,
    });
    const rows = payload?.values || payload?.data || [];
    const match = chooseOptionSearchMatch(rows, trade);
    if (!match?.token) return null;
    return `NFO|${match.token}`;
  }

  async postJson(endpoint, body) {
    const response = await fetch(`${this.restUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: `jData=${encodeURIComponent(JSON.stringify(body))}&jKey=${encodeURIComponent(this.sessionToken)}`,
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!response.ok || data?.stat === "Not_Ok") {
      const message = data?.emsg || data?.message || response.statusText;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      this.emit("raw", raw);
      return;
    }

    if (message.t === "ck") {
      if (String(message.s || "").toLowerCase() === "ok") {
        this.connected = true;
        this.connecting = false;
        this.reconnectMs = DEFAULT_RECONNECT_MS;
        this.emit("status", { state: "connected" });
        this.flushSubscriptions();
      } else {
        this.connected = false;
        this.connecting = false;
        this.emit("session_expired", message);
        this.emit("status", { state: "auth_failed", message: message.emsg || "Shoonya login/session failed." });
      }
      return;
    }

    if (message.t === "tk" || message.t === "tf") {
      const tick = normalizeTick(message);
      if (tick) this.emit("tick", tick);
      return;
    }

    if (message.t === "om") return;
    this.emit("message", message);
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

function normalizeTick(message) {
  const ltp = Number(message.lp || message.ltp || message.c || 0);
  const token = String(message.tk || message.token || "").trim();
  const exchange = String(message.e || message.exch || "NFO").trim() || "NFO";
  if (!token || !Number.isFinite(ltp) || ltp <= 0) return null;
  return {
    exchange,
    token,
    key: `${exchange}|${token}`,
    ltp,
    raw: message,
    receivedAt: new Date().toISOString(),
  };
}

function normalizeSubscriptionKey(key) {
  const text = String(key || "").trim().toUpperCase();
  if (!text) return "";
  if (text.includes("|")) return text;
  return `NFO|${text}`;
}

function getManualToken(trade) {
  const notes = `${trade.personalNotes || ""} ${trade.entryReason || ""}`;
  const match = notes.match(/(?:SHOONYA_TOKEN|TOKEN)\s*[:=]\s*([A-Z]+[|])?(\d+)/i);
  if (!match) return null;
  return `${match[1] ? match[1].replace("|", "").toUpperCase() : "NFO"}|${match[2]}`;
}

function buildShoonyaSearchText(trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = Number(trade.strikePrice || 0);
  const side = toShoonyaSide(trade.optionType);
  if (!underlying || !strike || !side) return "";
  return `${underlying} ${strike} ${side}`;
}

function toShoonyaSide(optionType) {
  const value = String(optionType || "").toUpperCase();
  if (value === "CALL" || value === "CE") return "CE";
  if (value === "PUT" || value === "PE") return "PE";
  return "";
}

function chooseOptionSearchMatch(rows, trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = String(Number(trade.strikePrice || 0));
  const side = toShoonyaSide(trade.optionType);
  const expiry = normalizeDateFragment(trade.expiryDate);
  const candidates = rows
    .map((row) => ({
      token: row.token || row.tk || row.instrument_token,
      text: `${row.tsym || ""} ${row.dname || ""} ${row.cname || ""}`.toUpperCase(),
      raw: row,
    }))
    .filter((row) => row.token && row.text.includes(underlying) && row.text.includes(strike) && row.text.includes(side));

  if (!candidates.length) return null;
  if (!expiry) return candidates[0];
  return candidates.find((row) => normalizeDateFragment(row.text).includes(expiry)) || candidates[0];
}

function normalizeDateFragment(value) {
  if (!value) return "";
  const text = String(value).toUpperCase();
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return text.replace(/[^A-Z0-9]/g, "");
  const [, year, month, day] = dateMatch;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${day}${months[Number(month) - 1]}${year.slice(2)}`;
}
