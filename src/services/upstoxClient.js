import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const UPSTOX_WS_URL = "wss://api.upstox.com/v2/feed/market-data-feed";
const UPSTOX_INSTRUMENT_URL = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";
const RECONNECT_MS = 3_000;
const MAX_RECONNECT_MS = 30_000;

export class UpstoxClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.accessToken = options.accessToken || process.env.UPSTOX_ACCESS_TOKEN || "";
    this.reconnectMs = RECONNECT_MS;
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.shouldRun = false;
    this.reconnectTimer = null;
    this.pendingSubscriptions = new Set();
    this.activeSubscriptions = new Set();
    this.instrumentCache = null;
    this.instrumentCacheAt = 0;
  }

  isConfigured() {
    return Boolean(this.accessToken);
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      connected: this.connected,
      connecting: this.connecting,
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
    this.connect();
  }

  stop() {
    this.shouldRun = false;
    this.connected = false;
    this.connecting = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.socket) {
      try { this.socket.close(); } catch { /* ignore */ }
    }
    this.socket = null;
  }

  connect() {
    if (!this.shouldRun || !this.isConfigured() || this.connecting || this.connected) return;
    if (typeof WebSocket === "undefined") {
      this.emit("error", new Error("No global WebSocket in this Node runtime."));
      return;
    }

    this.connecting = true;
    this.emit("status", { state: "connecting" });

    const socket = new WebSocket(UPSTOX_WS_URL, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Api-Version": "2.0",
      },
    });
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.connected = true;
      this.connecting = false;
      this.reconnectMs = RECONNECT_MS;
      this.emit("status", { state: "connected" });
      this.flushSubscriptions();
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
    const normalized = String(key || "").trim().toUpperCase();
    if (!normalized) return;
    this.pendingSubscriptions.add(normalized);
    if (!this.shouldRun) this.start();
    if (this.connected) this.flushSubscriptions();
  }

  unsubscribe(key) {
    const normalized = String(key || "").trim().toUpperCase();
    if (!normalized) return;
    this.pendingSubscriptions.delete(normalized);
    if (!this.connected || !this.activeSubscriptions.has(normalized)) return;
    this.sendJson({
      guid: `unsub-${Date.now()}`,
      method: "unsub",
      data: { instrumentKeys: [normalized] },
    });
    this.activeSubscriptions.delete(normalized);
  }

  async resolveOptionToken(trade) {
    const manual = getManualToken(trade);
    if (manual) return manual;
    if (!this.isConfigured()) return null;

    try {
      const instruments = await this.getInstruments();
      const token = findOptionToken(instruments, trade);
      return token || null;
    } catch (error) {
      this.emit("error", new Error(`Token resolution failed: ${error.message}`));
      return null;
    }
  }

  async getInstruments() {
    const CACHE_TTL = 12 * 60 * 60 * 1000;
    if (this.instrumentCache && Date.now() - this.instrumentCacheAt < CACHE_TTL) {
      return this.instrumentCache;
    }

    // Try local cache file first
    const cacheFile = path.join(projectRoot, "data", "upstox-instruments.json");
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      if (Date.now() - stat.mtimeMs < CACHE_TTL) {
        const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        this.instrumentCache = data;
        this.instrumentCacheAt = stat.mtimeMs;
        return data;
      }
    }

    // Download fresh
    const res = await fetch("https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz", {
      headers: { "Accept-Encoding": "gzip" },
    });
    if (!res.ok) throw new Error(`Instrument download failed: ${res.statusText}`);
    const data = await res.json();
    this.instrumentCache = data;
    this.instrumentCacheAt = Date.now();
    try {
      fs.mkdirSync(path.join(projectRoot, "data"), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(data));
    } catch { /* non-fatal */ }
    return data;
  }

  flushSubscriptions() {
    const keys = Array.from(this.pendingSubscriptions).filter((k) => !this.activeSubscriptions.has(k));
    if (!keys.length) return;
    this.sendJson({
      guid: `sub-${Date.now()}`,
      method: "sub",
      data: {
        instrumentKeys: keys,
        mode: "ltpc",
      },
    });
    keys.forEach((k) => this.activeSubscriptions.add(k));
    this.emit("status", { state: "subscribed", subscriptions: Array.from(this.activeSubscriptions) });
  }

  handleMessage(raw) {
    try {
      // Upstox sends binary protobuf — try JSON first, then binary
      let message;
      if (typeof raw === "string") {
        message = JSON.parse(raw);
      } else {
        // Binary feed — decode as text and try JSON
        const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
        try {
          message = JSON.parse(text);
        } catch {
          // Binary protobuf — parse manually
          this.handleBinaryFeed(raw);
          return;
        }
      }
      this.handleJsonMessage(message);
    } catch {
      // ignore parse errors
    }
  }

  handleJsonMessage(message) {
    if (message.type === "error" || message.status === "error") {
      const msg = message.message || message.error || "Upstox WS error";
      if (/token|expired|unauthorized|invalid/i.test(msg)) {
        this.emit("session_expired", { message: msg });
      }
      this.emit("error", new Error(msg));
      return;
    }

    if (message.type === "live_feed" || message.feeds) {
      const feeds = message.feeds || {};
      for (const [instrumentKey, feedData] of Object.entries(feeds)) {
        const ltp = Number(
          feedData?.ltpc?.ltp ||
          feedData?.ff?.marketFF?.ltpc?.ltp ||
          feedData?.ltp ||
          0
        );
        if (ltp > 0) {
          this.emit("tick", {
            exchange: instrumentKey.split("|")[0] || "NSE",
            token: instrumentKey,
            key: instrumentKey,
            ltp,
            raw: feedData,
            receivedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  handleBinaryFeed(raw) {
    // Upstox v2 binary protobuf — extract LTP using known offsets
    // The feed contains instrument_key and ltpc.ltp
    // We do a best-effort extraction by scanning for subscribed keys
    try {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      const text = buf.toString("binary");

      for (const key of this.activeSubscriptions) {
        if (text.includes(key.replace("|", ""))) {
          // Try to find float value near the key
          const keyIdx = buf.indexOf(key.split("|")[1] || key);
          if (keyIdx === -1) continue;
          // LTP is typically a float32 or float64 after the key
          for (let offset = keyIdx + 4; offset < Math.min(keyIdx + 64, buf.length - 4); offset += 4) {
            const val = buf.readFloatBE(offset);
            if (val > 0.01 && val < 1000000) {
              this.emit("tick", {
                exchange: key.split("|")[0] || "NSE",
                token: key,
                key,
                ltp: Math.round(val * 100) / 100,
                raw: null,
                receivedAt: new Date().toISOString(),
              });
              break;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  sendJson(payload) {
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

export function createUpstoxClient(options = {}) {
  return new UpstoxClient(options);
}

// --- Helpers ---

function getManualToken(trade) {
  const notes = `${trade.personalNotes || ""} ${trade.entryReason || ""}`;
  const match = notes.match(/(?:UPSTOX_TOKEN|TOKEN)\s*[:=]\s*([A-Z_]+\|)?([A-Z0-9_]+)/i);
  if (!match) return null;
  const exchange = match[1] ? match[1].replace("|", "").toUpperCase() : "NSE_FO";
  return `${exchange}|${match[2].toUpperCase()}`;
}

function findOptionToken(instruments, trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = Number(trade.strikePrice || 0);
  const side = toUpstoxSide(trade.optionType);
  const expiry = normalizeExpiry(trade.expiryDate);

  if (!underlying || !strike || !side) return null;

  const candidates = (Array.isArray(instruments) ? instruments : [])
    .filter((item) => {
      const name = String(item.name || item.trading_symbol || "").toUpperCase();
      const itype = String(item.instrument_type || "").toUpperCase();
      return (
        (itype === "CE" || itype === "PE") &&
        name.includes(underlying) &&
        String(item.strike || "").includes(String(strike)) &&
        itype === side
      );
    });

  if (!candidates.length) return null;

  if (expiry) {
    const match = candidates.find((item) => {
      const exp = String(item.expiry || "").replace(/-/g, "").toUpperCase();
      return exp.includes(expiry);
    });
    if (match) return buildInstrumentKey(match);
  }

  return buildInstrumentKey(candidates[0]);
}

function buildInstrumentKey(item) {
  const exchange = String(item.exchange || "NSE_FO").toUpperCase();
  const token = String(item.instrument_key || item.token || item.isin || "");
  if (token.includes("|")) return token;
  return `${exchange}|${token}`;
}

function toUpstoxSide(optionType) {
  const v = String(optionType || "").toUpperCase();
  if (v === "CALL" || v === "CE") return "CE";
  if (v === "PUT" || v === "PE") return "PE";
  return "";
}

function normalizeExpiry(value) {
  if (!value) return "";
  const text = String(value).toUpperCase();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text.replace(/[^A-Z0-9]/g, "");
  const [, year, month, day] = match;
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${day}${months[Number(month) - 1]}${year.slice(2)}`;
}
