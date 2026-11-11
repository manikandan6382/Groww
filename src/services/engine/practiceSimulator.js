import { indicesCache } from "../../routes/trades/option-contract-cache.js";
import { defaultExchangeCalendar } from "./exchangeCalendar.js";

const DEFAULT_INDICES = {
  "NSE_INDEX|Nifty 50": { name: "NIFTY 50", base: 24005.55, min: 23800, max: 24200, tickSize: 0.25 },
  "NSE_INDEX|Nifty Bank": { name: "BANKNIFTY", base: 57317.75, min: 56800, max: 57800, tickSize: 0.50 },
  "BSE_INDEX|SENSEX": { name: "BSE SENSEX", base: 74800.00, min: 74200, max: 75400, tickSize: 1.00 },
  "NSE_INDEX|Nifty Fin Service": { name: "FINNIFTY", base: 24480.00, min: 24200, max: 24700, tickSize: 0.25 },
  "NSE_INDEX|India VIX": { name: "INDIA VIX", base: 13.40, min: 12.00, max: 16.00, tickSize: 0.05 }
};

export class PracticeMarketSimulator {
  constructor(engine) {
    this.engine = engine;
    this.timer = null;
    this.lastLiveTickAt = 0;
    this.currentSpots = new Map();
    this.optionPrices = new Map();

    for (const [key, conf] of Object.entries(DEFAULT_INDICES)) {
      const defaultChange = key.includes("VIX") ? 0.15 : Number((conf.base * 0.002).toFixed(2));
      const prevClose = Number((conf.base - defaultChange).toFixed(2));
      this.currentSpots.set(key, {
        ltp: conf.base,
        open: conf.base,
        high: conf.base,
        low: conf.base,
        close: prevClose,
        change: defaultChange,
        changePct: Number(((defaultChange / prevClose) * 100).toFixed(2))
      });
    }
  }

  recordLiveTick() {
    this.lastLiveTickAt = Date.now();
  }

  isLiveBrokerActive() {
    return Date.now() - this.lastLiveTickAt < 4000;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), 1400);
    this.step();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  step() {
    if (!this.engine?.started) return;
    if (this.isLiveBrokerActive()) return;

    // Zero Fake Data Invariant: Never fabricate synthetic ticks on exchange holidays or weekends
    const dayStatus = defaultExchangeCalendar.isTradingDay(new Date());
    if (!dayStatus.isTradingDay) {
      return;
    }

    this.simulateIndices();
    this.simulateActiveTrades();
  }

  simulateIndices() {
    const indicesResult = {};
    const nowIso = new Date().toISOString();

    for (const [key, conf] of Object.entries(DEFAULT_INDICES)) {
      const current = this.currentSpots.get(key);
      const walk = (Math.random() - 0.495) * (conf.base * 0.00035);
      const meanReversion = (conf.base - current.ltp) * 0.02;
      const rawNext = current.ltp + walk + meanReversion;
      const clamped = Math.max(conf.min, Math.min(conf.max, rawNext));
      const nextLtp = Number((Math.round(clamped / conf.tickSize) * conf.tickSize).toFixed(2));

      const change = Number((nextLtp - current.close).toFixed(2));
      const changePct = Number(((change / current.close) * 100).toFixed(2));
      const high = Math.max(current.high, nextLtp);
      const low = Math.min(current.low, nextLtp);

      const updated = { ...current, ltp: nextLtp, change, changePct, high, low, timestamp: nowIso };
      this.currentSpots.set(key, updated);

      indicesResult[key] = {
        name: conf.name,
        ltp: nextLtp,
        change,
        changePct,
        open: updated.open,
        high,
        low,
        close: updated.close,
        timestamp: nowIso
      };

      this.engine.publish("index_tick", {
        symbol: key,
        tokenKey: key,
        name: conf.name,
        ltp: nextLtp,
        change,
        changePct,
        open: updated.open,
        high,
        low,
        close: updated.close,
        receivedAt: nowIso
      });
    }

    indicesCache.set("LIVE_INDICES", {
      timestamp: Date.now(),
      data: {
        success: true,
        timestamp: nowIso,
        indices: indicesResult,
        isSimulated: true
      }
    });
  }

  simulateActiveTrades() {
    if (!this.engine?.activeTrades) return;
    const nowIso = new Date().toISOString();

    for (const [id, item] of this.engine.activeTrades.entries()) {
      const trade = item.trade;
      if (!trade) continue;

      const sym = String(trade.symbol || trade.tradingsymbol || "").toUpperCase();
      const isCall = sym.includes("CE") || trade.optionType === "CALL";
      const isShort = trade.direction === "SHORT";
      const entry = Number(trade.entryPrice || 100);
      const currentPrice = this.optionPrices.get(id) || Number(item.lastLtp || entry);

      // Correlation with underlying index move
      const isBank = sym.includes("BANK");
      const isSensex = sym.includes("SENSEX");
      const indexKey = isSensex ? "BSE_INDEX|SENSEX" : isBank ? "NSE_INDEX|Nifty Bank" : "NSE_INDEX|Nifty 50";
      const spotObj = this.currentSpots.get(indexKey);
      const spotChange = spotObj ? (spotObj.change || 0) : 0;

      const approxDelta = isCall ? 0.52 : -0.48;
      const spotWalkEffect = (spotChange * 0.005) * approxDelta;
      const noise = (Math.random() - 0.495) * 0.45;
      const tickWalk = spotWalkEffect + noise;

      let nextLtp = Number((currentPrice + tickWalk).toFixed(2));
      nextLtp = Math.max(0.05, Math.round(nextLtp * 20) / 20); // 0.05 step

      this.optionPrices.set(id, nextLtp);

      const netChange = Number((nextLtp - entry).toFixed(2));
      const tick = {
        tradeId: trade.id,
        symbol: trade.symbol,
        tokenKey: item.tokenKey || `PRACTICE:${trade.id}`,
        ltp: nextLtp,
        change: netChange,
        timestamp: nowIso
      };

      this.engine.handleTick(tick);
    }
  }

  getCurrentSpot(key) {
    return this.currentSpots.get(key)?.ltp || DEFAULT_INDICES[key]?.base || 24005.55;
  }
}
