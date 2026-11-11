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
import { MarketScheduler } from "./engine/marketScheduler.js";
import { DeterministicScanner } from "./engine/deterministicScanner.js";

const ACTIVE_REFRESH_MS = 15_000;

export class PaperTradeEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.client = options.client || createUpstoxClient(options.upstox || {});
    this.quoteStore = new Map();
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
    this.freshnessConfig = {
      candidateEntryMaxAgeMs: 5_000,
      activePositionMaxAgeMs: 15_000,
    };
    this.lastFeedMessageAt = null;

    this.scheduler = options.scheduler || new MarketScheduler({ engine: this });
    this.scheduler.setEngine(this);
    this.scheduler.on("regime_change", (payload) => this.publish("scheduler_regime_change", payload));
    this.scheduler.on("eod_squareoff_started", (payload) => this.publish("eod_squareoff_started", payload));
    this.scheduler.on("eod_squareoff_completed", (payload) => this.publish("eod_squareoff_completed", payload));
    this.scheduler.on("eod_squareoff_alert", (payload) => this.publish("eod_squareoff_alert", payload));

    this.scanner = options.scanner || new DeterministicScanner({ engine: this, scheduler: this.scheduler });
    this.scanner.on("candidate", (payload) => this.publish("scanner_candidate", payload));

    this.client.on("tick", (tick) => {
      this.lastFeedMessageAt = Date.now();
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
    this.scheduler.start();
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
    this.scheduler.stop();
    clearInterval(this.refreshTimer);
    clearInterval(this.flushTimer);
    clearInterval(this.indicesTimer);
    clearInterval(this.pruneTimer);
    this.refreshTimer = this.flushTimer = this.indicesTimer = this.pruneTimer = null;
    this.flushPendingMarks();
    this.client.stop();
  }

  getFeedState() {
    const isWsConnected = Boolean(this.client?.connected);
    if (!isWsConnected) {
      return "FEED_DISCONNECTED";
    }

    const now = Date.now();
    const hasRecentFeedMessage = Boolean(this.lastFeedMessageAt && (now - this.lastFeedMessageAt) <= this.freshnessConfig.activePositionMaxAgeMs);

    let hasFreshQuote = false;
    for (const quote of this.quoteStore.values()) {
      if (quote.source === "WEBSOCKET_V3" && quote.isFresh !== false) {
        if (now - (quote.timestampMs || 0) <= this.freshnessConfig.activePositionMaxAgeMs) {
          hasFreshQuote = true;
          break;
        }
      }
    }

    if (this.quoteStore.size > 0 && !hasFreshQuote && !hasRecentFeedMessage) {
      return "FEED_STALE";
    }

    return "FEED_HEALTHY";
  }

  checkMonitoringHealth() {
    const feedState = this.getFeedState();
    const isDegraded = feedState !== "FEED_HEALTHY";

    for (const [id, item] of this.activeTrades.entries()) {
      if (isDegraded) {
        if (item.monitoringState !== "POSITION_MONITORING_DEGRADED") {
          item.monitoringState = "POSITION_MONITORING_DEGRADED";
          item.pnlStatus = "UNVERIFIED";
          item.isStale = true;
          item.degradedAt = new Date().toISOString();
          item.degradedReason = feedState === "FEED_DISCONNECTED"
            ? "WebSocket feed disconnected"
            : `Market data feed stale (> ${this.freshnessConfig.activePositionMaxAgeMs / 1000}s)`;
          item.lastKnownReferencePrice = item.lastLtp || item.trade?.entryPrice || 0;
          this.publish("monitoring_degraded", {
            tradeId: id,
            symbol: item.trade?.symbol,
            feedState,
            lastKnownReferencePrice: item.lastKnownReferencePrice,
            reason: item.degradedReason,
          });
        }
      } else {
        if (item.monitoringState === "POSITION_MONITORING_DEGRADED") {
          item.monitoringState = "RECOVERY_RECONCILIATION_REQUIRED";
          this.publish("reconciliation_required", {
            tradeId: id,
            symbol: item.trade?.symbol,
            message: "Market feed restored. Pending deterministic price reconciliation.",
          });
        }
      }
    }
  }

  getStatus() {
    const feedState = this.getFeedState();
    const schedulerStatus = this.scheduler ? this.scheduler.getStatus() : null;
    return {
      started: this.started,
      marketOpen: schedulerStatus ? schedulerStatus.isMarketOpen : isMarketOpenNow(),
      regime: schedulerStatus?.currentRegime || "MARKET_CLOSED",
      isEntryAllowed: Boolean(schedulerStatus?.isEntryAllowed),
      scheduler: schedulerStatus,
      scanner: {
        latestEvaluation: this.scanner?.getLatestEvaluation() || null,
        edgeStatus: "NOT_VALIDATED",
      },
      client: this.client.getStatus(),
      feedHealth: {
        state: feedState,
        healthy: feedState === "FEED_HEALTHY",
        quoteCount: this.quoteStore.size,
        websocketConnected: Boolean(this.client?.connected),
        connectionState: this.client?.connectionState || (this.client?.connected ? "CONNECTED" : "DISCONNECTED"),
        freshnessConfig: this.freshnessConfig,
        lastFeedMessageAt: this.lastFeedMessageAt,
      },
      activeTrades: Array.from(this.activeTrades.values()).map((item) => ({
        id: item.trade.id,
        symbol: item.trade.symbol,
        tokenKey: item.tokenKey,
        subscribed: Boolean(item.tokenKey),
        lastLtp: item.lastLtp || null,
        lastKnownReferencePrice: item.lastKnownReferencePrice || item.lastLtp || null,
        lastTickAt: item.lastTickAt || null,
        status: item.status,
        monitoringState: item.monitoringState || "NORMAL",
        pnlStatus: item.pnlStatus || "VERIFIED",
        isStale: Boolean(item.isStale),
        degradedAt: item.degradedAt || null,
        degradedReason: item.degradedReason || null,
      })),
    };
  }

  isFeedHealthy(instrumentKey = null, purpose = "ACTIVE_MONITORING") {
    const isWsConnected = Boolean(this.client?.connected);
    if (!isWsConnected) {
      return false;
    }

    const now = Date.now();
    const maxAgeMs = purpose === "CANDIDATE_ENTRY"
      ? this.freshnessConfig.candidateEntryMaxAgeMs
      : this.freshnessConfig.activePositionMaxAgeMs;

    if (instrumentKey) {
      const key = String(instrumentKey).trim();
      const quote = this.quoteStore.get(key);
      if (!quote) return false;
      if (quote.source === "REST_RECOVERY" || quote.isFresh === false) return false;

      const ageMs = now - (quote.timestampMs || 0);
      if (ageMs >= maxAgeMs) {
        return false;
      }

      if (purpose === "CANDIDATE_ENTRY" && quote.depth) {
        const hasBids = quote.depth.bids && quote.depth.bids.length > 0;
        const hasAsks = quote.depth.asks && quote.depth.asks.length > 0;
        if (!hasBids || !hasAsks) {
          return false;
        }
      }

      return true;
    }

    if (this.quoteStore.size > 0) {
      for (const quote of this.quoteStore.values()) {
        if (quote.source === "WEBSOCKET_V3" && quote.isFresh !== false) {
          if (now - (quote.timestampMs || 0) < maxAgeMs) {
            return true;
          }
        }
      }
      return false;
    }

    return isWsConnected;
  }

  getAuthoritativeQuote(instrumentKey, purpose = "ACTIVE_MONITORING") {
    if (!instrumentKey) return null;
    const key = String(instrumentKey).trim();
    const quote = this.quoteStore.get(key);
    if (!quote) return null;
    const now = Date.now();
    const receivedTimeMs = quote.receivedAtMs || (quote.receivedAt ? new Date(quote.receivedAt).getTime() : (quote.timestampMs || now));
    const deliveryAgeMs = now - receivedTimeMs;
    const tradeAgeMs = (quote.ltt && Number.isFinite(quote.ltt)) ? (now - quote.ltt) : null;
    const ageMs = tradeAgeMs !== null ? tradeAgeMs : (now - (quote.timestampMs || now));
    const maxAgeMs = purpose === "CANDIDATE_ENTRY"
      ? this.freshnessConfig.candidateEntryMaxAgeMs
      : this.freshnessConfig.activePositionMaxAgeMs;
    const isDeliveryStalled = deliveryAgeMs > (quote.maxDeliveryLagMs || 15_000);
    const isPostClose = quote.source === "REST_SNAPSHOT_POST_CLOSE" || quote.isPostCloseSnapshot === true;
    const isFresh = ageMs < maxAgeMs && !isDeliveryStalled && !isPostClose && quote.isFresh !== false && quote.source !== "REST_RECOVERY";
    return {
      ...quote,
      ageMs,
      deliveryAgeMs,
      tradeAgeMs,
      isDeliveryStalled,
      isFresh,
    };
  }

  getMarketRegime() {
    return this.scheduler?.currentRegime || "MARKET_CLOSED";
  }

  isEntryAllowed() {
    return Boolean(this.scheduler?.getStatus()?.isEntryAllowed);
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
    this.checkMonitoringHealth();
    flushMarks(this);
  }

  evaluateTrigger(trade, tick) {
    evaluateTradeTrigger(this, trade, tick);
  }

  evaluateScanner(context = {}) {
    return this.scanner.evaluate(context);
  }

  getLatestScannerEvaluation() {
    return this.scanner.getLatestEvaluation();
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
