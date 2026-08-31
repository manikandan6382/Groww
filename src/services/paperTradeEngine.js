import { EventEmitter } from "node:events";
import { getPaperLab, markPaperTrade } from "../repositories/paper-lab.repository.js";
import { getTradeById } from "../repositories/trades.repository.js";
import { createUpstoxClient } from "./upstoxClient.js";
import { telegramNotifier } from "./notifications/telegramNotifier.js";

const MARKET_CLOSED_REFRESH_MS = 60_000;
const ACTIVE_REFRESH_MS = 15_000;

export class PaperTradeEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.client = options.client || createUpstoxClient(options.upstox || {});
    this.activeTrades = new Map();
    this.tokenToTradeIds = new Map();
    this.resolving = new Set();
    this.triggering = new Set();
    this.pendingMarks = new Map();
    this.lastEventId = 0;
    this.events = [];
    this.refreshTimer = null;
    this.flushTimer = null;
    this.started = false;

    this.client.on("tick", (tick) => this.handleTick(tick));
    this.client.on("status", (status) => this.publish("status", status));
    this.client.on("session_expired", (payload) => this.publish("session_expired", payload));
    this.client.on("error", (error) => this.publish("error", { message: error.message }));
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.client.start();
    this.refreshActiveTrades();
    this.refreshTimer = setInterval(() => this.refreshActiveTrades(), ACTIVE_REFRESH_MS);
    this.flushTimer = setInterval(() => this.flushPendingMarks(), 1000);
  }

  stop() {
    this.started = false;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.refreshTimer = null;
    this.flushTimer = null;
    this.flushPendingMarks();
    this.client.stop();
  }

  getStatus() {
    return {
      started: this.started,
      marketOpen: isMarketOpenNow(),
      client: this.client.getStatus(),
      activeTrades: Array.from(this.activeTrades.values()).map((item) => ({
        id: item.trade.id,
        symbol: item.trade.symbol,
        tokenKey: item.tokenKey,
        subscribed: Boolean(item.tokenKey),
        lastLtp: item.lastLtp || null,
        lastTickAt: item.lastTickAt || null,
        status: item.status,
      })),
    };
  }

  getRecentEvents(afterId = 0) {
    return this.events.filter((event) => event.id > Number(afterId || 0));
  }

  async refreshActiveTrades() {
    if (!this.started) return;
    let lab;
    try {
      lab = getPaperLab({ range: "week" });
    } catch (error) {
      this.publish("error", { message: error.message });
      return;
    }

    const openTrades = lab.openTrades || [];
    const openIds = new Set(openTrades.map((trade) => Number(trade.id)));

    for (const id of Array.from(this.activeTrades.keys())) {
      if (!openIds.has(id)) this.removeTrade(id);
    }

    if (!openTrades.length) {
      this.publish("empty", { message: "No active paper trades to monitor." });
      return;
    }

    if (!isMarketOpenNow()) {
      this.publish("market_closed", {
        message: "Market is closed. Live trigger monitoring will resume when ticks arrive.",
        nextRefreshMs: MARKET_CLOSED_REFRESH_MS,
      });
    }

    for (const trade of openTrades) {
      await this.ensureTradeSubscription(trade);
    }
  }

  async syncTrade(tradeId) {
    const id = Number(tradeId);
    let trade = (getPaperLab({ range: "week" }).openTrades || []).find((item) => Number(item.id) === id);
    if (!trade) {
      trade = getTradeById(id);
    }
    if (!trade || trade.status !== "OPEN") {
      this.removeTrade(id);
      return;
    }
    await this.ensureTradeSubscription(trade, { force: true });
  }

  removeTrade(tradeId) {
    const id = Number(tradeId);
    const item = this.activeTrades.get(id);
    if (!item) return;
    this.activeTrades.delete(id);
    if (item.tokenKey) {
      const ids = this.tokenToTradeIds.get(item.tokenKey) || new Set();
      ids.delete(id);
      if (ids.size) {
        this.tokenToTradeIds.set(item.tokenKey, ids);
      } else {
        this.tokenToTradeIds.delete(item.tokenKey);
        this.client.unsubscribe(item.tokenKey);
      }
    }
    this.publish("unsubscribed", { tradeId: id, symbol: item.trade.symbol, tokenKey: item.tokenKey });
  }

  async ensureTradeSubscription(trade, { force = false } = {}) {
    const id = Number(trade.id);
    if (!id || this.resolving.has(id)) return;

    // Isolate only explicit MANUAL_ONLY trades from Upstox live ticker subscription
    const isExplicitManual = trade.feedMode === "MANUAL" || trade.personalNotes?.includes("[MANUAL_ONLY]");
    if (isExplicitManual) {
      if (this.activeTrades.has(id)) this.removeTrade(id);
      return;
    }

    const existing = this.activeTrades.get(id);
    if (existing?.status === "subscribed" && !force) return;
    
    this.resolving.add(id);

    try {
      const tokenKey = await this.client.resolveOptionToken(trade);
      if (!tokenKey) {
        this.activeTrades.set(id, {
          trade,
          tokenKey: null,
          status: "token_missing",
        });
        this.publish("token_missing", {
          tradeId: id,
          symbol: trade.symbol,
          message: "Could not resolve Upstox option token. Add UPSTOX_TOKEN:<token> in notes or check expiry/strike.",
        });
        return;
      }

      if (existing?.tokenKey && existing.tokenKey !== tokenKey) this.removeTrade(id);
      this.activeTrades.set(id, {
        ...(existing || {}),
        trade,
        tokenKey,
        status: "subscribed",
      });
      if (!this.tokenToTradeIds.has(tokenKey)) this.tokenToTradeIds.set(tokenKey, new Set());
      this.tokenToTradeIds.get(tokenKey).add(id);
      this.client.subscribe(tokenKey);
      this.publish("subscribed", { tradeId: id, symbol: trade.symbol, tokenKey });
    } catch (error) {
      this.activeTrades.set(id, {
        trade,
        tokenKey: null,
        status: "token_error",
        error: error.message,
      });
      this.publish("token_error", { tradeId: id, symbol: trade.symbol, message: error.message });
      if (isSessionExpiredError(error)) {
        this.publish("session_expired", { message: error.message });
      }
    } finally {
      this.resolving.delete(id);
    }
  }

  handleTick(tick) {
    if (tick.key && tick.key.startsWith("NSE_INDEX")) {
      this.publish("index_tick", {
        symbol: tick.key.includes("Bank") ? "BANKNIFTY" : "NIFTY",
        tokenKey: tick.key,
        ltp: tick.ltp,
        receivedAt: tick.receivedAt,
      });
    }

    const tradeIds = this.tokenToTradeIds.get(tick.key);
    if (!tradeIds?.size) return;

    for (const id of Array.from(tradeIds)) {
      const item = this.activeTrades.get(id);
      if (!item || item.tokenKey !== tick.key) continue;
      item.lastLtp = tick.ltp;
      item.lastTickAt = tick.receivedAt;
      this.pendingMarks.set(id, { price: tick.ltp, time: tick.receivedAt });
      this.publish("tick", {
        tradeId: id,
        symbol: item.trade.symbol,
        tokenKey: tick.key,
        ltp: tick.ltp,
        receivedAt: tick.receivedAt,
      });
      this.evaluateTrigger(item.trade, tick);
    }
  }

  flushPendingMarks() {
    if (!this.pendingMarks.size) return;
    const entries = Array.from(this.pendingMarks.entries());
    this.pendingMarks.clear();

    try {
      import("../db/connection.js").then(({ getDb }) => {
        const db = getDb();
        db.exec("BEGIN;");
        try {
          const stmt = db.prepare("UPDATE trades SET last_mark_price = ?, last_marked_at = ? WHERE id = ? AND status = 'OPEN'");
          for (const [id, data] of entries) {
            stmt.run(data.price, data.time || new Date().toISOString(), id);
          }
          db.exec("COMMIT;");
        } catch {
          db.exec("ROLLBACK;");
        }
      }).catch(() => {});
    } catch {
      // non-fatal
    }
  }

  evaluateTrigger(trade, tick) {
    const id = Number(trade.id);
    if (this.triggering.has(id)) return;
    const target = Number(trade.targetPrice || 0);
    const stopLoss = Number(trade.stopLoss || 0);
    const entry = Number(trade.entryPrice || 0);
    const ltp = Number(tick.ltp || 0);
    if (!ltp || ltp <= 0) return;
    let reason = null;

    // --- 1. Automated Institutional Breakeven Lock ---
    if (entry > 0) {
      if (target > entry && stopLoss < entry) {
        // Long Option Buying setup
        if (ltp >= entry + 8.0 && stopLoss < entry + 0.5) {
          this.lockBreakeven(trade, entry + 0.5, ltp);
        }
      } else if (target < entry && stopLoss > entry) {
        // Short Option Selling setup
        if (ltp <= entry - 8.0 && stopLoss > entry - 0.5) {
          this.lockBreakeven(trade, entry - 0.5, ltp);
        }
      }
    }

    // --- 2. Target & Stop Loss Execution ---
    if (target > entry && stopLoss < entry) {
      // Long option / Standard buyer setup
      if (target > 0 && ltp >= target) reason = "TARGET_HIT";
      if (!reason && stopLoss > 0 && ltp <= stopLoss) reason = "STOP_LOSS_HIT";
    } else if (target < entry && stopLoss > entry) {
      // Short option / Seller setup
      if (target > 0 && ltp <= target) reason = "TARGET_HIT";
      if (!reason && stopLoss > 0 && ltp >= stopLoss) reason = "STOP_LOSS_HIT";
    } else {
      // Fallback
      if (target > 0 && ltp >= target) reason = "TARGET_HIT";
      if (!reason && stopLoss > 0 && ltp <= stopLoss) reason = "STOP_LOSS_HIT";
    }

    if (!reason) return;
    this.triggerTrade(trade, tick, reason);
  }

  lockBreakeven(trade, newStopLoss, currentLtp) {
    const id = Number(trade.id);
    try {
      import("../db/connection.js").then(({ getDb }) => {
        const db = getDb();
        db.prepare("UPDATE trades SET stop_loss = ?, updated_at = datetime('now') WHERE id = ?").run(newStopLoss, id);
        trade.stopLoss = newStopLoss;
        const item = this.activeTrades.get(id);
        if (item) item.trade.stopLoss = newStopLoss;
        this.publish("breakeven_locked", {
          tradeId: id,
          symbol: trade.symbol,
          newStopLoss,
          entryPrice: trade.entryPrice,
          currentLtp,
          message: `Breakeven Locked at ₹${newStopLoss.toFixed(2)} (+0.50 pt buffer)`,
        });
        telegramNotifier.notifyBreakevenLocked(trade, newStopLoss, currentLtp).catch(() => {});
      });
    } catch {
      // Non-fatal if DB is locked
    }
  }

  triggerTrade(trade, tick, reason) {
    const id = Number(trade.id);
    if (this.triggering.has(id)) return;
    this.triggering.add(id);

    try {
      const result = markPaperTrade(id, { price: tick.ltp, reason });
      this.removeTrade(id);
      const eventType = reason === "TARGET_HIT" ? "target_hit" : "stop_loss_hit";
      this.publish(eventType, {
        tradeId: id,
        symbol: trade.symbol,
        ltp: tick.ltp,
        reason,
        exitTime: result.trade.exitDatetime,
        pnl: result.trade.netPnl,
        message: reason === "TARGET_HIT" ? "Target Hit" : "Stop Loss Hit",
      });

      // Instant Dispatch to Mobile Webhook / Telegram Bot
      if (reason === "TARGET_HIT") {
        telegramNotifier.notifyTargetHit(trade, tick, result).catch(() => {});
      } else {
        telegramNotifier.notifyStopLossHit(trade, tick, result).catch(() => {});
      }
    } catch (error) {
      this.publish("error", { tradeId: id, symbol: trade.symbol, message: error.message });
    } finally {
      this.triggering.delete(id);
    }
  }

  publish(type, payload = {}) {
    const event = {
      id: ++this.lastEventId,
      type,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > 100) this.events = this.events.slice(-100);
    this.emit("event", event);
    return event;
  }
}

export const paperTradeEngine = new PaperTradeEngine();

function isMarketOpenNow(date = new Date()) {
  const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
}

function isSessionExpiredError(error) {
  return /session|token|jkey|invalid|expired/i.test(String(error?.message || ""));
}
