import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

const UPSTOX_WS_URL = "wss://api.upstox.com/v2/feed/market-data-feed";
const UPSTOX_INSTRUMENT_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const UPSTOX_LTP_URL = "https://api.upstox.com/v2/market-quote/ltp";
const RECONNECT_MS = 3_000;
const MAX_RECONNECT_MS = 30_000;
const LTP_POLL_MS = Math.max(1_500, Number(process.env.UPSTOX_LTP_POLL_MS || 3_000));

export class UpstoxClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionFile = path.resolve(projectRoot, options.sessionFile || process.env.UPSTOX_SESSION_FILE || path.join("data", "upstox-session.json"));
    this.accessToken = options.accessToken || readSavedAccessToken(this.sessionFile) || process.env.UPSTOX_ACCESS_TOKEN || "";
    this.reconnectMs = RECONNECT_MS;
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.shouldRun = false;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.polling = false;
    this.pollMs = Number(options.pollMs || LTP_POLL_MS);
    this.lastPollAt = null;
    this.lastError = "";
    this.pendingSubscriptions = new Set();
    this.activeSubscriptions = new Set();
    this.instrumentCache = null;
    this.instrumentCacheAt = 0;

    // 🚀 Auto-detect token update in data/upstox-session.json when user logs in tomorrow
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.watchFile(this.sessionFile, { interval: 2000 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            const newToken = this.refreshAccessToken();
            if (newToken) {
              this.lastError = "";
              this.emit("status", { state: "token_refreshed", message: "Upstox session token refreshed from file." });
              if (this.shouldRun) {
                this.startPolling();
              }
            }
          }
        });
      }
    } catch {}
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
    this.connected = false;
    this.connecting = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopPolling();
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
    this.flushSubscriptions();
  }

  unsubscribe(key) {
    const normalized = String(key || "").trim().toUpperCase();
    if (!normalized) return;
    this.pendingSubscriptions.delete(normalized);
    if (this.connected && this.activeSubscriptions.has(normalized)) {
      this.sendJson({
        guid: `unsub-${Date.now()}`,
        method: "unsub",
        data: { instrumentKeys: [normalized] },
      });
    }
    this.activeSubscriptions.delete(normalized);
    if (!this.pendingSubscriptions.size && !this.activeSubscriptions.size) this.stopPolling();
  }

  async resolveOptionToken(trade) {
    const manual = getManualToken(trade);
    if (manual) return manual;
    if (!this.isConfigured()) return null;

    // 1. First attempt Upstox Live Option Contract API for 100% exact strike & token match
    try {
      const sym = String(trade.symbol || trade.tradingsymbol || "");
      const underlying = String(trade.underlyingSymbol || trade.underlying_symbol || (sym.includes("BANK") ? "BANKNIFTY" : "NIFTY")).toUpperCase();
      const parsedStrike = Number(trade.strikePrice || trade.strike_price || (sym.match(/\b\d{5}\b/) || [0])[0]);
      const strike = parsedStrike || Number((sym.match(/\d+/) || [0])[0]);
      const side = toUpstoxSide(trade.optionType || trade.option_type || (sym.includes("PE") ? "PUT" : "CALL"));
      const underlyingKey = underlying.includes("BANK") ? "NSE_INDEX|Nifty Bank" : (underlying.includes("FIN") ? "NSE_INDEX|Nifty Fin Service" : "NSE_INDEX|Nifty 50");
      
      const endpoint = new URL("https://api.upstox.com/v2/option/contract");
      endpoint.searchParams.set("instrument_key", underlyingKey);
      
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          "Api-Version": "2.0"
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length) {
          const now = Date.now();
          const matches = json.data.filter((c) => {
            const expTime = new Date(c.expiry).getTime();
            return (
              Number(c.strike_price) === strike &&
              String(c.instrument_type).toUpperCase() === side &&
              expTime >= now - 86400000
            );
          });
          if (matches.length) {
            matches.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
            return normalizeInstrumentKey(matches[0].instrument_key);
          }
        }
      }
    } catch (_) {
      // Fallback to offline instrument master
    }

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

    const res = await fetch(UPSTOX_INSTRUMENT_URL, {
      headers: { Accept: "application/json, application/gzip" },
    });
    if (!res.ok) throw new Error(`Instrument download failed: ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const data = parseInstrumentPayload(buffer);
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
    if (this.connected) {
      this.sendJson({
        guid: `sub-${Date.now()}`,
        method: "sub",
        data: {
          instrumentKeys: keys,
          mode: "ltpc",
        },
      });
    }
    keys.forEach((k) => this.activeSubscriptions.add(k));
    this.startPolling();
    this.emit("status", { state: "subscribed", subscriptions: Array.from(this.activeSubscriptions) });
  }

  startPolling() {
    if (!this.shouldRun || !this.isConfigured() || this.pollTimer) return;
    this.pollTimer = setInterval(() => this.pollLtp(), this.pollMs);
    this.emit("status", { state: "polling", intervalMs: this.pollMs });
    this.pollLtp();
  }

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.polling = false;
  }

  async pollLtp() {
    if (!this.shouldRun || !this.isConfigured() || this.polling) return;
    const keys = Array.from(new Set([...this.pendingSubscriptions, ...this.activeSubscriptions])).filter(Boolean);
    if (!keys.length) return;

    this.refreshAccessToken();
    this.polling = true;
    try {
      const endpoint = new URL(UPSTOX_LTP_URL);
      endpoint.searchParams.set("instrument_key", keys.join(","));
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          "Api-Version": "2.0",
        },
      });

      if (res.status === 401 || res.status === 403) {
        const message = "Upstox access token expired or rejected. Refresh data/upstox-session.json.";
        this.lastError = message;
        this.emit("session_expired", { message });
        this.emit("status", { state: "token_expired", message });
        return;
      }

      if (!res.ok) throw new Error(`Upstox LTP failed: ${res.status} ${res.statusText}`);
      const body = await res.json();
      this.lastPollAt = new Date().toISOString();
      this.lastError = "";
      this.emitLtpTicks(body?.data || {}, keys);
    } catch (error) {
      this.lastError = error.message;
      this.emit("status", { state: "poll_error", message: error.message });
      this.emit("error", error);
    } finally {
      this.polling = false;
    }
  }

  emitLtpTicks(data, keys) {
    if (!data || typeof data !== "object") return;
    const entries = Object.entries(data);
    const usedKeys = new Set();

    for (const key of keys) {
      const candidates = [
        data[key],
        data[key.replace("|", ":")],
        data[key.replace("NSE_FO|", "NSE_FO:")],
      ].filter(Boolean);

      const fallback = entries.find(([entryKey, item]) => {
        const token = String(item?.instrument_token || item?.instrument_key || entryKey || "").toUpperCase();
        return token === key || token === key.replace("|", ":") || entryKey.toUpperCase() === key;
      });
      if (fallback) candidates.push(fallback[1]);

      const item = candidates[0];
      const ltp = extractLtp(item);
      if (ltp > 0) {
        usedKeys.add(key);
        this.emit("tick", {
          exchange: key.split("|")[0] || "NSE",
          token: key,
          key,
          ltp,
          raw: item,
          receivedAt: new Date().toISOString(),
        });
      }
    }

    for (const [entryKey, item] of entries) {
      const ltp = extractLtp(item);
      const key = normalizeInstrumentKey(item?.instrument_token || item?.instrument_key || entryKey);
      if (ltp > 0 && key && this.activeSubscriptions.has(key) && !usedKeys.has(key)) {
        this.emit("tick", {
          exchange: key.split("|")[0] || "NSE",
          token: key,
          key,
          ltp,
          raw: item,
          receivedAt: new Date().toISOString(),
        });
      }
    }
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
  const tradeExpiryKeys = expiryKeys(trade.expiryDate);

  if (!underlying || !strike || !side) return null;

  const candidates = (Array.isArray(instruments) ? instruments : [])
    .filter((item) => {
      const text = instrumentText(item);
      return optionSide(item) === side &&
        text.includes(underlying) &&
        matchesStrike(item, strike);
    });

  if (!candidates.length) return null;

  if (tradeExpiryKeys.length) {
    const match = candidates.find((item) => {
      const itemExpiryKeys = expiryKeys(item.expiry || item.expiry_date || item.expiryDate);
      return itemExpiryKeys.some((key) => tradeExpiryKeys.includes(key));
    });
    if (match) return buildInstrumentKey(match);
  }

  return buildInstrumentKey(candidates[0]);
}

function buildInstrumentKey(item) {
  const direct = normalizeInstrumentKey(item.instrument_key || item.instrumentKey || item.instrument_token);
  if (direct?.includes("|")) return direct;
  const exchange = String(item.exchange || item.segment || "NSE_FO").toUpperCase().replace("NFO", "NSE_FO");
  const token = String(item.exchange_token || item.token || item.isin || direct || "");
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

function parseInstrumentPayload(buffer) {
  const asText = buffer.toString("utf8");
  try {
    return JSON.parse(asText);
  } catch {
    return JSON.parse(gunzipSync(buffer).toString("utf8"));
  }
}

function readSavedAccessToken(sessionFile) {
  try {
    if (!fs.existsSync(sessionFile)) return "";
    const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    return String(session.access_token || session.accessToken || "");
  } catch {
    return "";
  }
}

function extractLtp(item) {
  return Number(
    item?.last_price ||
    item?.ltp ||
    item?.lastTradedPrice ||
    item?.last_traded_price ||
    item?.close ||
    0
  );
}

function normalizeInstrumentKey(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  return text.replace("NFO|", "NSE_FO|").replace("NFO:", "NSE_FO|").replace("NSE_FO:", "NSE_FO|");
}

function instrumentText(item) {
  return [
    item.name,
    item.trading_symbol,
    item.tradingsymbol,
    item.symbol,
    item.instrument_key,
    item.instrumentKey,
    item.underlying_symbol,
    item.asset_symbol,
  ].filter(Boolean).join(" ").toUpperCase();
}

function optionSide(item) {
  const type = String(item.instrument_type || item.option_type || item.optionType || "").toUpperCase();
  if (type === "CE" || type === "CALL") return "CE";
  if (type === "PE" || type === "PUT") return "PE";
  const text = instrumentText(item);
  if (/(^|[^A-Z])CE($|[^A-Z])/.test(text) || text.endsWith("CE")) return "CE";
  if (/(^|[^A-Z])PE($|[^A-Z])/.test(text) || text.endsWith("PE")) return "PE";
  return "";
}

function matchesStrike(item, strike) {
  const numeric = Number(item.strike_price || item.strike || item.strikePrice || 0);
  if (Number.isFinite(numeric) && numeric > 0) return Math.abs(numeric - strike) < 0.01;
  return instrumentText(item).includes(String(strike));
}

function expiryKeys(value) {
  if (!value) return [];
  const raw = String(value).trim().toUpperCase();
  if (!raw) return [];

  const keys = new Set([raw.replace(/[^A-Z0-9]/g, "")]);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, year, month, day] = iso;
    keys.add(`${year}${month}${day}`);
    keys.add(normalizeExpiry(`${year}-${month}-${day}`));
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) keys.add(digits);
  if (digits.length >= 12) {
    const date = new Date(Number(digits));
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      keys.add(`${yyyy}${mm}${dd}`);
      keys.add(normalizeExpiry(`${yyyy}-${mm}-${dd}`));
    }
  }

  return Array.from(keys).filter(Boolean);
}
