import { EventEmitter } from "node:events";
import { createUpstoxClient } from "./upstoxClient.js";
import { isMarketOpenNow } from "./engine/marketTiming.js";
import { pollUpstoxIndices } from "./engine/indicesPoller.js";
import { evaluateTradeTrigger } from "./engine/triggerEvaluator.js";
import { handleEngineTick, flushMarks, pruneTokens } from "./engine/tickHandler.js";
import {
  ensureSubscription,
  syncEngineTrade,
  removeEngineTrade,
  refreshAllActiveTrades,
} from "./engine/subscriptionManager.js";
import { PracticeMarketSimulator } from "./engine/practiceSimulator.js";

const ACTIVE_REFRESH_MS = 15_000;

export class PaperTradeEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.client = options.client || createUpstoxClient(options.upstox || {});
    this.activeTrades = new Map();
    this.tokenToTradeIds = new Map();
    this.watchedTokens = new Map();
    this.watchedSymbols = new Map();
    this.resolving = new Set();
    this.triggering = new Set();
    this.pendingMarks = new Map();
    this.lastEventId = 0;
    this.events = [];
    this.refreshTimer = null;
    this.flushTimer = null;
    this.indicesTimer = null;
    this.pruneTimer = null;
    this.started = false;
    this.simulator = new PracticeMarketSimulator(this);

    this.client.on("tick", (tick) => {
      this.simulator.recordLiveTick();
      this.handleTick(tick);
    });
    this.client.on("status", (status) => this.publish("status", status));
    this.client.on("session_expired", (payload) => this.publish("session_expired", payload));
    this.client.on("error", (error) => this.publish("error", { message: error.message }));
  }

  registerWatchedToken(tokenKey, symbol) {
    if (!tokenKey) return;
    this.watchedTokens.set(tokenKey, { symbol: symbol || tokenKey, lastSeenAt: Date.now() });
    if (symbol) this.watchedSymbols.set(symbol, tokenKey);
    if (this.client) this.client.subscribe(tokenKey);
  }

  touchWatchedToken(tokenKeyOrSymbol) {
    if (!tokenKeyOrSymbol) return;
    const tokenKey = this.watchedSymbols.get(tokenKeyOrSymbol) || tokenKeyOrSymbol;
    const entry = this.watchedTokens.get(tokenKey);
    if (entry) entry.lastSeenAt = Date.now();
  }

  pruneWatchedTokens() {
    pruneTokens(this);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.client.start();
    this.simulator.start();
    this.refreshActiveTrades();
    this.refreshTimer = setInterval(() => this.refreshActiveTrades(), ACTIVE_REFRESH_MS);
    this.flushTimer = setInterval(() => this.flushPendingMarks(), 1000);
    this.indicesTimer = setInterval(() => this.pollIndices(), 3000);
    this.pruneTimer = setInterval(() => this.pruneWatchedTokens(), 30_000);
    this.pollIndices();
  }

  stop() {
    this.started = false;
    this.simulator.stop();
    clearInterval(this.refreshTimer);
    clearInterval(this.flushTimer);
    clearInterval(this.indicesTimer);
    clearInterval(this.pruneTimer);
    this.refreshTimer = this.flushTimer = this.indicesTimer = this.pruneTimer = null;
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
    await refreshAllActiveTrades(this);
  }

  async pollIndices() {
    if (!this.started) return;
    await pollUpstoxIndices(this.client, (type, payload) => this.publish(type, payload));
  }

  async syncTrade(tradeId) {
    await syncEngineTrade(this, tradeId);
  }

  removeTrade(tradeId) {
    removeEngineTrade(this, tradeId);
  }

  async ensureTradeSubscription(trade, options) {
    await ensureSubscription(this, trade, options);
  }

  handleTick(tick) {
    handleEngineTick(this, tick);
  }

  flushPendingMarks() {
    flushMarks(this);
  }

  evaluateTrigger(trade, tick) {
    evaluateTradeTrigger(this, trade, tick);
  }

  publish(type, payload = {}) {
    const event = { id: ++this.lastEventId, type, payload, createdAt: new Date().toISOString() };
    this.events.push(event);
    if (this.events.length > 100) this.events = this.events.slice(-100);
    this.emit("event", event);
    return event;
  }
}

export const paperTradeEngine = new PaperTradeEngine();
