import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { calculateGreeks } from "../black76Engine.js";
import { calculateFrictionAndCharges, calculateEntrySlippage } from "../../repositories/paper-friction.js";
import { getDb } from "../../db/connection.js";

/**
 * PORTFOLIOX — Deterministic Market Scanner
 * Stage 3 Step 3: Server-side 12-filter deterministic scanning engine for NIFTY options buying.
 *
 * Enforces:
 * - F1: 1-hour completed candles EMA20/EMA50 (Zero lookahead)
 * - F2: 15-minute swing structure (HH/HL vs LH/LL) + Intraday VWAP
 * - F3: Option liquidity & execution quality (Depth >= 65, Spread <= min(0.50, 0.005*LTP), Freshness <= 5s)
 * - F4: Relative volume >= 1.2 vs prior 20 5m candles + Strike OI >= 100,000
 * - F5: ATM or 1-strike ITM contract selection, absolute Black-76 delta in [0.50, 0.68], strictly LONG
 * - F6: ATR-based stop sizing (Underlying ATR14 * multiplier translated via |Delta|, max stop distance <= 3.25 pts)
 * - F7: Wilson-score expected value >= +₹200 net per lot (RESEARCH_ONLY, EDGE_STATUS = NOT_VALIDATED)
 * - F8: Net risk-to-reward ratio >= 2.0:1 using canonical calculateFrictionAndCharges & modelled slippage
 * - F9: Permitted trading sessions evaluated via MarketScheduler (09:30-11:15 & 13:15-14:45 allowed)
 * - F10: Macro event blackout (±30m blackout from data/macro-events-2026.json, fail-closed if missing)
 * - F11: Concurrent position limits (Strictly <= 1 active position; pending square-offs/RMS blocks entry)
 * - F12: Daily drawdown shield (Realized daily loss + modelled trade net loss <= ₹300.00 hard limit)
 */

export const FILTER_KEYS = Object.freeze({
  F1_HTF_TREND: "F1_HTF_TREND",
  F2_MARKET_STRUCTURE_VWAP: "F2_MARKET_STRUCTURE_VWAP",
  F3_OPTION_LIQUIDITY: "F3_OPTION_LIQUIDITY",
  F4_VOLUME_OI: "F4_VOLUME_OI",
  F5_DELTA_ALIGNMENT: "F5_DELTA_ALIGNMENT",
  F6_ATR_STOP: "F6_ATR_STOP",
  F7_EV_VALIDATION_STATUS: "F7_EV_VALIDATION_STATUS",
  F8_NET_RISK_REWARD: "F8_NET_RISK_REWARD",
  F9_SESSION_WINDOW: "F9_SESSION_WINDOW",
  F10_MACRO_BLACKOUT: "F10_MACRO_BLACKOUT",
  F11_POSITION_LIMIT: "F11_POSITION_LIMIT",
  F12_DAILY_DRAWDOWN_SHIELD: "F12_DAILY_DRAWDOWN_SHIELD",
});

export const EDGE_STATUS = Object.freeze({
  NOT_VALIDATED: "NOT_VALIDATED",
  RESEARCH_ONLY: "RESEARCH_ONLY",
});

/**
 * Pure Indicator: Calculate Exponential Moving Average over completed candles
 * @param {Array<{ close: number }>} candles - strictly completed candles in chronological order
 * @param {number} period - lookback period (e.g. 20 or 50)
 * @returns {number|null}
 */
export function calculateEMA(candles, period) {
  if (!Array.isArray(candles) || candles.length < period) return null;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += Number(candles[i].close);
  }
  let ema = sum / period;
  for (let i = period; i < candles.length; i++) {
    const close = Number(candles[i].close);
    ema = close * k + ema * (1 - k);
  }
  return Number(ema.toFixed(4));
}

/**
 * Pure Indicator: Calculate Intraday VWAP
 * @param {Array<{ high: number, low: number, close: number, volume: number }>} candles - intraday 15m candles
 * @returns {number|null}
 */
export function calculateVWAP(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  let cumVolume = 0;
  let cumTypicalVolume = 0;
  for (const c of candles) {
    const h = Number(c.high);
    const l = Number(c.low);
    const cl = Number(c.close);
    const v = Number(c.volume || 0);
    const typicalPrice = (h + l + cl) / 3;
    cumTypicalVolume += typicalPrice * v;
    cumVolume += v;
  }
  if (cumVolume <= 0) return null;
  return Number((cumTypicalVolume / cumVolume).toFixed(2));
}

/**
 * Pure Indicator: 15-Minute Swing Structure
 * Evaluates swing pivots (fractals) to detect Bullish (HH/HL), Bearish (LH/LL), or Range/Chop.
 * @param {Array<{ high: number, low: number, close?: number, time?: string }>} candles
 * @returns {{ structure: string, swingHighs: Array, swingLows: Array }}
 */
export function identifySwingStructure(candles) {
  if (!Array.isArray(candles) || candles.length < 5) {
    return { structure: "INSUFFICIENT_DATA", swingHighs: [], swingLows: [] };
  }

  const swingHighs = [];
  const swingLows = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];
    if (curr.high > prev.high && curr.high >= next.high) {
      swingHighs.push({ index: i, price: curr.high, time: curr.time });
    }
    if (curr.low < prev.low && curr.low <= next.low) {
      swingLows.push({ index: i, price: curr.low, time: curr.time });
    }
  }

  if (swingHighs.length < 2 || swingLows.length < 2) {
    const mid = Math.floor(candles.length / 2);
    const firstHalfHigh = Math.max(...candles.slice(0, mid).map((c) => c.high));
    const secondHalfHigh = Math.max(...candles.slice(mid).map((c) => c.high));
    const firstHalfLow = Math.min(...candles.slice(0, mid).map((c) => c.low));
    const secondHalfLow = Math.min(...candles.slice(mid).map((c) => c.low));

    if (secondHalfHigh > firstHalfHigh && secondHalfLow > firstHalfLow) {
      return { structure: "BULLISH_HH_HL", swingHighs, swingLows };
    }
    if (secondHalfHigh < firstHalfHigh && secondHalfLow < firstHalfLow) {
      return { structure: "BEARISH_LH_LL", swingHighs, swingLows };
    }
    return { structure: "CHOP_RANGE", swingHighs, swingLows };
  }

  const lastHigh = swingHighs[swingHighs.length - 1].price;
  const prevHigh = swingHighs[swingHighs.length - 2].price;
  const lastLow = swingLows[swingLows.length - 1].price;
  const prevLow = swingLows[swingLows.length - 2].price;

  const isHigherHigh = lastHigh > prevHigh;
  const isHigherLow = lastLow > prevLow;
  const isLowerHigh = lastHigh < prevHigh;
  const isLowerLow = lastLow < prevLow;

  if (isHigherHigh && isHigherLow) {
    return { structure: "BULLISH_HH_HL", swingHighs, swingLows };
  }
  if (isLowerHigh && isLowerLow) {
    return { structure: "BEARISH_LH_LL", swingHighs, swingLows };
  }
  return { structure: "CHOP_RANGE", swingHighs, swingLows };
}

/**
 * Pure Indicator: Average True Range (14-period)
 * @param {Array<{ high: number, low: number, close: number }>} candles
 * @param {number} period
 * @returns {number|null}
 */
export function calculateATR(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = Number(candles[i].high);
    const l = Number(candles[i].low);
    const prevC = Number(candles[i - 1].close);
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }
  if (trs.length < period) return null;
  const recentTrs = trs.slice(-period);
  const atr = recentTrs.reduce((a, b) => a + b, 0) / period;
  return Number(atr.toFixed(2));
}

/**
 * Pure Metric: Wilson-score lower bound Expected Value
 * @param {{ winRate?: number, avgWin?: number, avgLoss?: number, sampleSize?: number, confidence?: number }}
 * @returns {{ pLower: number, evNet: number }}
 */
export function calculateWilsonEV({ winRate = 0.65, avgWin = 600, avgLoss = 250, sampleSize = 150, confidence = 1.96 } = {}) {
  const n = Math.max(1, sampleSize);
  const p = Math.max(0, Math.min(1, winRate));
  const z = confidence;
  const z2 = z * z;

  const numerator = p + (z2 / (2 * n)) - z * Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n * n)));
  const denominator = 1 + (z2 / n);
  const pLower = Math.max(0, numerator / denominator);
  const ev = (pLower * avgWin) - ((1 - pLower) * avgLoss);

  return {
    pLower: Number(pLower.toFixed(4)),
    evNet: Number(ev.toFixed(2)),
  };
}

export class DeterministicScanner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.engine = options.engine || null;
    this.scheduler = options.scheduler || this.engine?.scheduler || null;
    this.db = options.db || null;
    this.macroEventsFilePath = options.macroEventsFilePath || path.resolve(process.cwd(), "data", "macro-events-2026.json");
    this.lastEvaluation = null;
    this.lastEmittedCandidate = null;
    this.lastEmittedAt = 0;
    this.dedupWindowMs = options.dedupWindowMs || 60_000;
  }

  get edgeStatus() {
    return EDGE_STATUS.NOT_VALIDATED;
  }

  getDatabase() {
    if (this.db) return this.db;
    try {
      return getDb();
    } catch {
      return null;
    }
  }

  // --- FILTER 1: Higher-Timeframe Trend ---
  evaluateF1Trend(candles1h) {
    if (!Array.isArray(candles1h) || candles1h.length < 50) {
      return {
        status: "FAIL",
        reason: "INSUFFICIENT_1H_CANDLES",
        bias: "NONE",
        details: { count: candles1h?.length || 0, minRequired: 50 },
      };
    }
    const ema20 = calculateEMA(candles1h, 20);
    const ema50 = calculateEMA(candles1h, 50);

    if (ema20 === null || ema50 === null) {
      return { status: "FAIL", reason: "EMA_CALCULATION_FAILED", bias: "NONE", details: { ema20, ema50 } };
    }

    if (ema20 > ema50) {
      return { status: "PASS", bias: "CALL", details: { ema20, ema50, spread: Number((ema20 - ema50).toFixed(2)) } };
    }
    if (ema20 < ema50) {
      return { status: "PASS", bias: "PUT", details: { ema20, ema50, spread: Number((ema50 - ema20).toFixed(2)) } };
    }
    return { status: "FAIL", reason: "NEUTRAL_TREND", bias: "NONE", details: { ema20, ema50 } };
  }

  // --- FILTER 2: Market Structure & Intraday VWAP ---
  evaluateF2Structure(candles15m, spotPrice, bias) {
    if (bias !== "CALL" && bias !== "PUT") {
      return { status: "FAIL", reason: "NO_BIAS_FOR_STRUCTURE", details: { bias } };
    }
    if (!Array.isArray(candles15m) || candles15m.length < 5) {
      return { status: "FAIL", reason: "INSUFFICIENT_15M_CANDLES", details: { count: candles15m?.length || 0 } };
    }

    const vwap = calculateVWAP(candles15m);
    if (!vwap) {
      return { status: "FAIL", reason: "VWAP_UNAVAILABLE", details: null };
    }

    const swing = identifySwingStructure(candles15m);
    const spot = Number(spotPrice || candles15m[candles15m.length - 1].close);

    if (bias === "CALL") {
      if (spot <= vwap) {
        return {
          status: "FAIL",
          reason: "SPOT_BELOW_VWAP",
          details: { spot, vwap, difference: Number((spot - vwap).toFixed(2)), structure: swing.structure },
        };
      }
      if (swing.structure !== "BULLISH_HH_HL") {
        return {
          status: "FAIL",
          reason: "CONTRADICTORY_STRUCTURE",
          details: { expected: "BULLISH_HH_HL", actual: swing.structure, spot, vwap },
        };
      }
      return { status: "PASS", details: { spot, vwap, structure: swing.structure } };
    }

    if (bias === "PUT") {
      if (spot >= vwap) {
        return {
          status: "FAIL",
          reason: "SPOT_ABOVE_VWAP",
          details: { spot, vwap, difference: Number((vwap - spot).toFixed(2)), structure: swing.structure },
        };
      }
      if (swing.structure !== "BEARISH_LH_LL") {
        return {
          status: "FAIL",
          reason: "CONTRADICTORY_STRUCTURE",
          details: { expected: "BEARISH_LH_LL", actual: swing.structure, spot, vwap },
        };
      }
      return { status: "PASS", details: { spot, vwap, structure: swing.structure } };
    }

    return { status: "FAIL", reason: "UNKNOWN_STRUCTURE_STATE", details: { bias } };
  }

  // --- FILTER 3: Option Liquidity & Execution Quality ---
  evaluateF3Liquidity(quote, maxAgeMs = 5000) {
    if (!quote) {
      return { status: "FAIL", reason: "QUOTE_MISSING", details: null };
    }

    const now = Date.now();

    // 1. Post-close snapshot rejection: never mark an old post-close snapshot tradable for entries
    if (quote.source === "REST_SNAPSHOT_POST_CLOSE" || quote.isPostCloseSnapshot === true) {
      return {
        status: "FAIL",
        reason: "POST_CLOSE_SNAPSHOT_NOT_TRADABLE",
        details: { source: quote.source, ltt: quote.ltt, lttIso: quote.lttIso },
      };
    }

    // 2. Feed delivery stalled check: local receipt time is too old (> 15s) while socket is connected
    const receivedAtMs = quote.receivedAtMs || (quote.receivedAt ? new Date(quote.receivedAt).getTime() : null);
    if (receivedAtMs && (now - receivedAtMs > (quote.maxDeliveryLagMs || 15_000))) {
      return {
        status: "FAIL",
        reason: "FEED_DELIVERY_STALLED",
        details: { deliveryLagMs: now - receivedAtMs, maxAllowedLagMs: quote.maxDeliveryLagMs || 15_000 },
      };
    }

    // 3. LTT validation: verify presence, format, future-datedness, and trade freshness
    if (quote.ltt !== undefined) {
      if (quote.ltt === null) {
        return { status: "FAIL", reason: "LTT_MISSING", details: { ltt: quote.ltt } };
      }
      if (typeof quote.ltt !== "number" || !Number.isFinite(quote.ltt) || quote.ltt <= 0) {
        return { status: "FAIL", reason: "LTT_MALFORMED", details: { ltt: quote.ltt } };
      }
      if (quote.ltt > now + 5000) {
        return { status: "FAIL", reason: "LTT_FUTURE_DATED", details: { ltt: quote.ltt, now, skewMs: quote.ltt - now } };
      }
      const tradeAgeMs = now - quote.ltt;
      if (tradeAgeMs > maxAgeMs) {
        return { status: "FAIL", reason: "STALE_QUOTE", details: { ageMs: tradeAgeMs, maxAgeMs, ltt: quote.ltt, lttIso: quote.lttIso } };
      }
    } else {
      // Backward-compatibility: if ltt is undefined, check timestampMs or ageMs
      if (quote.timestampMs !== undefined) {
        if (typeof quote.timestampMs !== "number" || !Number.isFinite(quote.timestampMs) || quote.timestampMs <= 0) {
          return { status: "FAIL", reason: "LTT_MALFORMED", details: { timestampMs: quote.timestampMs } };
        }
        if (quote.timestampMs > now + 5000) {
          return { status: "FAIL", reason: "LTT_FUTURE_DATED", details: { timestampMs: quote.timestampMs, now } };
        }
        const ageMs = quote.ageMs !== undefined ? quote.ageMs : now - quote.timestampMs;
        if (ageMs > maxAgeMs) {
          return { status: "FAIL", reason: "STALE_QUOTE", details: { ageMs, maxAgeMs } };
        }
      } else if (quote.ageMs !== undefined) {
        if (quote.ageMs > maxAgeMs) {
          return { status: "FAIL", reason: "STALE_QUOTE", details: { ageMs: quote.ageMs, maxAgeMs } };
        }
      } else {
        return { status: "FAIL", reason: "LTT_MISSING", details: null };
      }
    }

    const depth = quote.depth || {};
    const bestBid = Number(quote.bid || depth.bids?.[0]?.price || 0);
    const bestAsk = Number(quote.ask || depth.asks?.[0]?.price || 0);
    const ltp = Number(quote.ltp || (bestBid + bestAsk) / 2 || 0);

    if (bestBid <= 0 || bestAsk <= 0 || bestAsk < bestBid) {
      return { status: "FAIL", reason: "INVALID_BID_ASK", details: { bestBid, bestAsk } };
    }

    const bidQty = Number(depth.bids?.[0]?.quantity || 0);
    const askQty = Number(depth.asks?.[0]?.quantity || 0);
    const minRequiredQty = 65; // 1 lot of NIFTY

    if (bidQty < minRequiredQty || askQty < minRequiredQty) {
      return {
        status: "FAIL",
        reason: "INSUFFICIENT_DEPTH",
        details: { bidQty, askQty, minRequiredQty },
      };
    }

    const spread = Number((bestAsk - bestBid).toFixed(2));
    const maxAllowedSpread = Math.min(0.50, Number((0.005 * ltp).toFixed(2)));

    if (spread > maxAllowedSpread) {
      return {
        status: "FAIL",
        reason: "WIDE_SPREAD",
        details: { spread, maxAllowedSpread, bestBid, bestAsk, ltp },
      };
    }

    const effectiveAgeMs = quote.ltt !== undefined && quote.ltt !== null
      ? (now - quote.ltt)
      : (quote.ageMs !== undefined ? quote.ageMs : (quote.timestampMs ? now - quote.timestampMs : 0));

    return {
      status: "PASS",
      details: {
        bestBid,
        bestAsk,
        bidQty,
        askQty,
        spread,
        maxAllowedSpread,
        ageMs: effectiveAgeMs,
        ltt: quote.ltt ?? null,
        lttIso: quote.lttIso ?? (quote.ltt ? new Date(quote.ltt).toISOString() : null),
        feedTs: quote.feedTs ?? null,
        receivedAt: quote.receivedAt ?? null,
      },
    };
  }

  // --- FILTER 4: Relative Volume & Participation ---
  evaluateF4VolumeOI(candles5m, currentCandle, openInterest, minRvol = 1.2, minOI = 100_000) {
    if (!Array.isArray(candles5m) || candles5m.length < 20) {
      return {
        status: "FAIL",
        reason: "INSUFFICIENT_VOLUME_HISTORY",
        details: { count: candles5m?.length || 0, minRequired: 20 },
      };
    }
    const prior20 = candles5m.slice(-20);
    const avgVolume = prior20.reduce((acc, c) => acc + Number(c.volume || 0), 0) / 20;
    const currentVolume = Number(currentCandle?.volume || candles5m[candles5m.length - 1]?.volume || 0);

    if (avgVolume <= 0) {
      return { status: "FAIL", reason: "ZERO_AVERAGE_VOLUME", details: { avgVolume } };
    }

    const rvol = Number((currentVolume / avgVolume).toFixed(2));
    if (rvol < minRvol) {
      return {
        status: "FAIL",
        reason: "LOW_RELATIVE_VOLUME",
        details: { rvol, minRvol, currentVolume, avgVolume },
      };
    }

    const oi = Number(openInterest || 0);
    if (oi < minOI) {
      return {
        status: "FAIL",
        reason: "LOW_OPEN_INTEREST",
        details: { oi, minOI },
      };
    }

    return { status: "PASS", details: { rvol, minRvol, currentVolume, avgVolume, oi, minOI } };
  }

  // --- FILTER 5: Contract Selection & Delta Alignment ---
  evaluateF5ContractDelta({ underlyingPrice, bias, contracts = [], dteDays = 2.5, ivPct = 14.0 }) {
    if (bias !== "CALL" && bias !== "PUT") {
      return { status: "FAIL", reason: "NO_DIRECTIONAL_BIAS", contract: null };
    }

    const optionType = bias === "CALL" ? "CALL" : "PUT";
    const spot = Number(underlyingPrice);
    const atmStrike = Math.round(spot / 50) * 50;
    const itmStrike = bias === "CALL" ? atmStrike - 50 : atmStrike + 50;
    const candidateStrikes = [atmStrike, itmStrike];

    let selectedContract = null;

    for (const strike of candidateStrikes) {
      const greeks = calculateGreeks(spot, strike, dteDays, ivPct, 0.065, optionType);
      const absDelta = Number(Math.abs(greeks.delta).toFixed(3));

      if (absDelta >= 0.50 && absDelta <= 0.68) {
        const existing = contracts.find((c) => c.strike === strike && c.optionType === optionType);
        const optCode = optionType === "CALL" ? "CE" : "PE";
        selectedContract = {
          symbol: existing?.symbol || `NIFTY26OCT${strike}${optCode}`,
          strike,
          optionType,
          delta: greeks.delta,
          absDelta,
          gamma: greeks.gamma,
          theta: greeks.theta,
          vega: greeks.vega,
          dteDays,
          ivPct,
          direction: "LONG",
          lotSize: 65,
          tokenKey: existing?.tokenKey || null,
        };
        break;
      }
    }

    if (!selectedContract) {
      return {
        status: "FAIL",
        reason: "DELTA_OUT_OF_RANGE",
        contract: null,
        details: { candidateStrikes, spot, bias },
      };
    }

    return {
      status: "PASS",
      contract: selectedContract,
      details: {
        strike: selectedContract.strike,
        optionType: selectedContract.optionType,
        absDelta: selectedContract.absDelta,
        direction: selectedContract.direction,
      },
    };
  }

  // --- FILTER 6: ATR-Based Stop Sizing ---
  evaluateF6AtrStop({ underlyingAtr, absDelta, multiplier = 1.5, maxOptionStopPts = 3.25 }) {
    if (!underlyingAtr || underlyingAtr <= 0 || !absDelta || absDelta <= 0) {
      return { status: "FAIL", reason: "ATR_UNAVAILABLE", details: { underlyingAtr, absDelta } };
    }

    const underlyingStopDistance = Number((underlyingAtr * multiplier).toFixed(2));
    const optionStopDistancePts = Number((underlyingStopDistance * absDelta).toFixed(2));

    if (optionStopDistancePts > maxOptionStopPts) {
      return {
        status: "FAIL",
        reason: "STOP_EXCEEDS_MAX_DISTANCE",
        details: { optionStopDistancePts, maxOptionStopPts, underlyingAtr, absDelta, multiplier },
      };
    }

    return {
      status: "PASS",
      details: {
        underlyingAtr,
        multiplier,
        underlyingStopDistance,
        optionStopDistancePts,
        maxOptionStopPts,
      },
    };
  }

  // --- FILTER 7: Expected Value & Validation Status (Research Gate) ---
  evaluateF7EVResearch(evInputs = {}, mode = "PAPER") {
    const minSampleSize = 100;
    const sampleSize = Number(evInputs?.sampleSize || 0);
    const isSampleSufficient = sampleSize >= minSampleSize;

    let wilsonEv = null;
    let pLower = null;
    let hasValidEvData = false;

    if (sampleSize > 0 && evInputs?.winRate !== undefined && !isNaN(Number(evInputs.winRate))) {
      const calc = calculateWilsonEV({
        winRate: Number(evInputs.winRate),
        avgWin: Number(evInputs.avgWin || 500),
        avgLoss: Number(evInputs.avgLoss || 250),
        sampleSize,
        confidence: Number(evInputs.confidence || 1.96),
      });
      wilsonEv = calc.evNet;
      pLower = calc.pLower;
      hasValidEvData = true;
    }

    // EDGE_STATUS is strictly NOT_VALIDATED regardless of synthetic or empirical figures.
    const edgeStatus = EDGE_STATUS.NOT_VALIDATED;

    return {
      status: "PASS", // In paper validation, F7 records telemetry without blocking trade sampling
      researchOnly: true,
      edgeStatus,
      details: {
        isSampleSufficient,
        sampleSize,
        minSampleSize,
        hasValidEvData,
        wilsonEv: wilsonEv !== null ? wilsonEv : "INSUFFICIENT_SAMPLES",
        pLower: pLower !== null ? pLower : "INSUFFICIENT_SAMPLES",
        edgeStatus,
        liveTradingPermitted: false,
        reason: !hasValidEvData
          ? "MISSING_OR_CORRUPT_RESEARCH_DATA"
          : isSampleSufficient
            ? (wilsonEv >= 200 ? "SAMPLE_SUFFICIENT_RESEARCH_LOGGED" : "WEAK_EV_RESEARCH_LOGGED")
            : "INSUFFICIENT_SAMPLE_COLLECTING_EVIDENCE",
      },
    };
  }

  // --- FILTER 8: Net Risk-to-Reward Ratio ---
  evaluateF8RiskReward({
    referenceEntryPrice,
    entryPrice,
    stopDistancePts,
    stopLossPrice,
    targetPrice,
    stopPolicy = "ATR_ENTRY_RELATIVE",
    targetPolicy = "RR_DERIVED",
    lotSize = 65,
    lots = 1,
    symbol = "NIFTY",
    minNetRr = 2.0,
    maxNetRisk = 300.0,
    pegStopToFill = true,
  }) {
    const rawRefEntry = Number(referenceEntryPrice || entryPrice);
    if (!rawRefEntry || rawRefEntry <= 0 || (!stopDistancePts && !stopLossPrice)) {
      return {
        status: "FAIL",
        reason: "INVALID_PRICE_PARAMETERS",
        details: { referenceEntryPrice: rawRefEntry, stopDistancePts, stopLossPrice },
      };
    }

    const units = lots * lotSize;

    // Realistic market order adverse entry slippage (1.25 pts)
    const entrySlippageObj = calculateEntrySlippage(rawRefEntry, "LONG", true);
    const modelledEntryFill = entrySlippageObj.filledEntry;
    const entrySlippagePts = entrySlippageObj.slippagePts;

    // Resolve Stop Loss Policy
    // 1. TECHNICAL_ABSOLUTE: Stop is fixed at strategy/invalidation price.
    //    Risk is evaluated from modelled entry fill to this fixed price.
    //    The scanner NEVER moves or squeezes a technical stop to fit the budget.
    // 2. ATR_ENTRY_RELATIVE: Stop is defined as an ATR-derived distance from the entry basis.
    //    For pre-trade evaluation: modelledStop = modelledEntryFill - stopDistancePts.
    //    Indicative reference: referenceStop = referenceEntryPrice - stopDistancePts.
    const effectiveStopPolicy = (pegStopToFill === false || stopPolicy === "TECHNICAL_ABSOLUTE")
      ? "TECHNICAL_ABSOLUTE"
      : "ATR_ENTRY_RELATIVE";

    let rawStopLoss;
    let referenceStopLoss;
    let modelledStopLoss;

    if (effectiveStopPolicy === "TECHNICAL_ABSOLUTE") {
      rawStopLoss = Number(stopLossPrice || (rawRefEntry - (stopDistancePts || 2.80)).toFixed(2));
      referenceStopLoss = rawStopLoss;
      modelledStopLoss = rawStopLoss; // Preserved unchanged!
    } else {
      const dist = Number(stopDistancePts || 2.80);
      referenceStopLoss = Math.max(0.05, Number((rawRefEntry - dist).toFixed(2)));
      modelledStopLoss = Math.max(0.05, Number((modelledEntryFill - dist).toFixed(2)));
      rawStopLoss = modelledStopLoss; // Pre-trade risk evaluated against modelled fill
    }

    const tradeStop = {
      symbol,
      entryPrice: modelledEntryFill, // Authoritative simulated entry fill
      lots,
      lotSize,
      units,
      quantity: lots,
      direction: "LONG",
      entrySlippage: entrySlippagePts,
    };

    // Calculate realistic stop-loss friction (0.50 adverse exit slippage on stop-loss)
    const stopFriction = calculateFrictionAndCharges(tradeStop, rawStopLoss, "STOP_LOSS_HIT");
    const netStopLoss = Math.abs(stopFriction.netPnl);

    // Resolve Target Policy
    // 1. TECHNICAL_ABSOLUTE: Target is fixed at strategy/resistance price.
    //    Net profit is evaluated directly without expanding target distance.
    // 2. RR_DERIVED: Target distance is solved dynamically from entry basis
    //    such that netTargetProfit >= minNetRr * netStopLoss.
    const effectiveTargetPolicy = (targetPolicy === "TECHNICAL_ABSOLUTE" || (targetPrice && targetPolicy !== "RR_DERIVED"))
      ? "TECHNICAL_ABSOLUTE"
      : "RR_DERIVED";

    let rawTarget;
    let referenceTarget;
    let modelledTarget;
    let targetFriction;

    if (effectiveTargetPolicy === "TECHNICAL_ABSOLUTE") {
      rawTarget = Number(targetPrice || (rawRefEntry + (Number(stopDistancePts || 2.80) * minNetRr)).toFixed(2));
      referenceTarget = rawTarget;
      modelledTarget = rawTarget; // Preserved unchanged!
      targetFriction = calculateFrictionAndCharges(tradeStop, rawTarget, "TARGET_HIT");
    } else {
      let targetPts = Number((Number(stopDistancePts || 2.80) * minNetRr).toFixed(2));
      rawTarget = Number((modelledEntryFill + targetPts).toFixed(2));
      targetFriction = calculateFrictionAndCharges(tradeStop, rawTarget, "TARGET_HIT");

      let iterations = 0;
      while (targetFriction.netPnl < minNetRr * netStopLoss && iterations < 150) {
        targetPts = Number((targetPts + 0.05).toFixed(2));
        rawTarget = Number((modelledEntryFill + targetPts).toFixed(2));
        targetFriction = calculateFrictionAndCharges(tradeStop, rawTarget, "TARGET_HIT");
        iterations++;
      }
      modelledTarget = rawTarget;
      referenceTarget = Number((rawRefEntry + targetPts).toFixed(2));
    }

    const netTargetProfit = targetFriction.netPnl;
    const grossReward = Number(((rawTarget - modelledEntryFill) * units).toFixed(2));
    const netRrRatioRaw = netTargetProfit / (netStopLoss || 1);
    const netRrRatio = Number(netRrRatioRaw.toFixed(2));

    // Mathematical Invariant: Net reward must NEVER exceed gross reward
    if (netTargetProfit > grossReward) {
      return {
        status: "FAIL",
        reason: "ARITHMETIC_INCONSISTENCY",
        details: { netTargetProfit, grossReward, message: "Net reward exceeds gross reward supported by prices and quantity" },
      };
    }

    // Hard Risk Gate: If realistic modelled loss exceeds ₹300.00 ceiling, reject immediately!
    if (netStopLoss > maxNetRisk) {
      return {
        status: "FAIL",
        reason: "MODELLED_RISK_EXCEEDS_CEILING",
        details: {
          stopPolicy: effectiveStopPolicy,
          targetPolicy: effectiveTargetPolicy,
          referenceEntryPrice: rawRefEntry,
          referenceStopLoss,
          referenceTarget,
          modelledEntryFill,
          modelledStopLoss,
          modelledTarget,
          rawStopLoss,
          rawTarget,
          stopDistancePts: Number(Math.abs(modelledEntryFill - rawStopLoss).toFixed(2)),
          targetDistancePts: Number(Math.abs(rawTarget - modelledEntryFill).toFixed(2)),
          executableStopExit: stopFriction.filledExit,
          executableTargetExit: targetFriction.filledExit,
          grossLoss: stopFriction.grossPnl,
          grossReward,
          netStopLoss,
          netTargetProfit,
          netRrRatio,
          netRrRatioRaw: Number(netRrRatioRaw.toFixed(4)),
          minNetRr,
          maxNetRisk,
          units,
          statutoryStopCharges: stopFriction.statutoryCharges,
          statutoryTargetCharges: targetFriction.statutoryCharges,
        },
      };
    }

    const passes = netRrRatio >= minNetRr;

    return {
      status: passes ? "PASS" : "FAIL",
      reason: passes ? null : "INSUFFICIENT_NET_RR",
      details: {
        stopPolicy: effectiveStopPolicy,
        targetPolicy: effectiveTargetPolicy,
        referenceEntryPrice: rawRefEntry,
        referenceStopLoss,
        referenceTarget,
        modelledEntryFill,
        modelledStopLoss,
        modelledTarget,
        rawStopLoss,
        rawTarget,
        stopDistancePts: Number(Math.abs(modelledEntryFill - rawStopLoss).toFixed(2)),
        targetDistancePts: Number(Math.abs(rawTarget - modelledEntryFill).toFixed(2)),
        executableStopExit: stopFriction.filledExit,
        executableTargetExit: targetFriction.filledExit,
        grossLoss: stopFriction.grossPnl,
        grossReward,
        netStopLoss,
        netTargetProfit,
        netRrRatio,
        netRrRatioRaw: Number(netRrRatioRaw.toFixed(4)),
        minNetRr,
        maxNetRisk,
        units,
        statutoryStopCharges: stopFriction.statutoryCharges,
        statutoryTargetCharges: targetFriction.statutoryCharges,
      },
    };
  }

  // --- FILTER 9: Permitted Trading Sessions (MarketScheduler) ---
  evaluateF9SessionWindow(evaluationTime = new Date()) {
    const scheduler = this.scheduler || this.engine?.scheduler;
    if (!scheduler) {
      return { status: "FAIL", reason: "SCHEDULER_UNAVAILABLE", details: null };
    }

    const status = scheduler.evaluateRegimeForTime(evaluationTime);
    if (!status.isEntryAllowed) {
      return {
        status: "FAIL",
        reason: "SESSION_WINDOW_BLOCKED",
        details: {
          regime: status.regime,
          isMarketOpen: status.isMarketOpen,
          isTradingDay: status.isTradingDay,
          istTime: status.istTime,
        },
      };
    }

    return {
      status: "PASS",
      details: { regime: status.regime, isMarketOpen: status.isMarketOpen, istTime: status.istTime },
    };
  }

  // --- FILTER 10: Macro Event Blackout ---
  evaluateF10MacroBlackout(evaluationTime = new Date()) {
    try {
      if (!fs.existsSync(this.macroEventsFilePath)) {
        return {
          status: "FAIL",
          reason: "EVENT_CALENDAR_UNAVAILABLE",
          details: { path: this.macroEventsFilePath, message: "File does not exist" },
        };
      }

      const content = fs.readFileSync(this.macroEventsFilePath, "utf8");
      const parsed = JSON.parse(content);

      if (!parsed || !Array.isArray(parsed.events)) {
        return {
          status: "FAIL",
          reason: "EVENT_CALENDAR_UNAVAILABLE",
          details: { message: "Calendar JSON malformed: missing events array" },
        };
      }

      const evalTimeMs = evaluationTime.getTime();

      for (const event of parsed.events) {
        if (!event.scheduledTimeIst) continue;
        const eventTimeMs = new Date(event.scheduledTimeIst).getTime();
        const blackoutMins = Number(event.blackoutWindowMinutes || 30);
        const windowMs = blackoutMins * 60 * 1000;

        if (Math.abs(evalTimeMs - eventTimeMs) <= windowMs) {
          return {
            status: "FAIL",
            reason: "MACRO_EVENT_BLACKOUT",
            details: {
              eventId: event.id,
              name: event.name,
              scheduledTimeIst: event.scheduledTimeIst,
              blackoutWindowMinutes: blackoutMins,
              timeDiffMinutes: Number(((evalTimeMs - eventTimeMs) / 60000).toFixed(1)),
            },
          };
        }
      }

      return { status: "PASS", details: { checkedEventsCount: parsed.events.length } };
    } catch (err) {
      return {
        status: "FAIL",
        reason: "EVENT_CALENDAR_UNAVAILABLE",
        details: { error: err.message },
      };
    }
  }

  // --- FILTER 11: Portfolio Risk & Concurrent Position Limits ---
  evaluateF11PositionLimit() {
    if (this.engine?.activeTrades && this.engine.activeTrades.size > 0) {
      return {
        status: "FAIL",
        reason: "ACTIVE_POSITION_EXISTS",
        details: { engineActiveCount: this.engine.activeTrades.size },
      };
    }

    const db = this.getDatabase();
    if (db) {
      try {
        const openRow = db.prepare(`
          SELECT COUNT(*) as count FROM trades WHERE trade_mode = 'PAPER' AND status = 'OPEN'
        `).get();
        if (openRow && openRow.count > 0) {
          return {
            status: "FAIL",
            reason: "ACTIVE_POSITION_EXISTS",
            details: { dbOpenCount: openRow.count },
          };
        }

        const pendingLedger = db.prepare(`
          SELECT COUNT(*) as count FROM eod_squareoff_ledger
          WHERE status IN ('PENDING', 'CLAIMED', 'RECONCILIATION_REQUIRED')
             OR rms_sync_status != 'SYNCED'
        `).get();
        if (pendingLedger && pendingLedger.count > 0) {
          return {
            status: "FAIL",
            reason: "RMS_STATE_UNVERIFIED",
            details: { pendingLedgerCount: pendingLedger.count },
          };
        }
      } catch (err) {
        return {
          status: "FAIL",
          reason: "RMS_STATE_UNVERIFIED",
          details: { error: err.message },
        };
      }
    }

    return { status: "PASS", details: { activePositions: 0 } };
  }

  // --- FILTER 12: Daily Drawdown Shield ---
  evaluateF12DailyDrawdown(modelledNetLoss = 250, hardCeiling = 300.0) {
    let realizedDailyLoss = 0;
    const db = this.getDatabase();

    if (db) {
      try {
        const todayDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const dailyRow = db.prepare(`
          SELECT COALESCE(SUM(net_pnl), 0) AS dailyPnl
          FROM trades
          WHERE trade_mode = 'PAPER'
            AND status IN ('CLOSED', 'SQUARED_OFF', 'AUTO_SQUARED_OFF', 'SL_HIT', 'TARGET_HIT')
            AND date(closed_at) = ?
        `).get(todayDate);
        const dailyPnl = Number(dailyRow?.dailyPnl || 0);
        realizedDailyLoss = dailyPnl < 0 ? Math.abs(dailyPnl) : 0;
      } catch {
        // Fallback for isolated tests without DB
      }
    }

    if (realizedDailyLoss >= hardCeiling) {
      return {
        status: "FAIL",
        reason: "DAILY_DRAWDOWN_EXCEEDED",
        details: { realizedDailyLoss, hardCeiling, remainingDailyBudget: 0 },
      };
    }

    const remainingDailyBudget = Number((hardCeiling - realizedDailyLoss).toFixed(2));
    if (modelledNetLoss > remainingDailyBudget) {
      return {
        status: "FAIL",
        reason: "DAILY_BUDGET_INSUFFICIENT",
        details: { realizedDailyLoss, modelledNetLoss, remainingDailyBudget, hardCeiling },
      };
    }

    if (modelledNetLoss > hardCeiling) {
      return {
        status: "FAIL",
        reason: "TRADE_RISK_EXCEEDS_CEILING",
        details: { modelledNetLoss, hardCeiling },
      };
    }

    return {
      status: "PASS",
      details: { realizedDailyLoss, modelledNetLoss, remainingDailyBudget, hardCeiling },
    };
  }

  /**
   * Complete 12-Filter Deterministic Evaluation
   * @param {Object} context - Market and data context for scanning
   */
  evaluate(context = {}) {
    const evaluationId = crypto.randomUUID();
    const evaluatedAt = new Date().toISOString();
    const evaluationTime = context.time ? new Date(context.time) : new Date();

    const filters = {};

    // 1. F9: Session Window (Gate early)
    filters[FILTER_KEYS.F9_SESSION_WINDOW] = this.evaluateF9SessionWindow(evaluationTime);

    // 2. F10: Macro Blackout
    filters[FILTER_KEYS.F10_MACRO_BLACKOUT] = this.evaluateF10MacroBlackout(evaluationTime);

    // 3. F11: Position Limits
    filters[FILTER_KEYS.F11_POSITION_LIMIT] = this.evaluateF11PositionLimit();

    // 4. F1: Higher-Timeframe Trend
    const f1Result = this.evaluateF1Trend(context.candles1h);
    filters[FILTER_KEYS.F1_HTF_TREND] = f1Result;
    const bias = f1Result.bias || "NONE";

    // 5. F2: Market Structure & VWAP
    filters[FILTER_KEYS.F2_MARKET_STRUCTURE_VWAP] = this.evaluateF2Structure(
      context.candles15m,
      context.spotPrice,
      bias
    );

    // 6. F5: Contract Selection & Delta
    const f5Result = this.evaluateF5ContractDelta({
      underlyingPrice: context.spotPrice,
      bias,
      contracts: context.contracts || [],
      dteDays: context.dteDays || 2.5,
      ivPct: context.ivPct || 14.0,
    });
    filters[FILTER_KEYS.F5_DELTA_ALIGNMENT] = f5Result;
    const selectedContract = f5Result.contract;

    // 7. F3: Option Liquidity
    const optionQuote = context.optionQuote || (selectedContract?.tokenKey && this.engine?.getAuthoritativeQuote(selectedContract.tokenKey, "CANDIDATE_ENTRY")) || context.quote;
    filters[FILTER_KEYS.F3_OPTION_LIQUIDITY] = this.evaluateF3Liquidity(optionQuote, context.maxQuoteAgeMs || 5000);

    // 8. F4: Relative Volume & Strike OI
    filters[FILTER_KEYS.F4_VOLUME_OI] = this.evaluateF4VolumeOI(
      context.candles5m,
      context.currentCandle5m,
      optionQuote?.openInterest || context.openInterest || selectedContract?.openInterest || 0
    );

    // 9. F6: ATR-Based Stop Sizing
    const underlyingAtr = context.underlyingAtr || calculateATR(context.candles15m || context.candles1h, 14);
    const f6Result = this.evaluateF6AtrStop({
      underlyingAtr,
      absDelta: selectedContract?.absDelta,
      multiplier: context.atrMultiplier || 1.5,
      maxOptionStopPts: context.maxOptionStopPts || 3.25,
    });
    filters[FILTER_KEYS.F6_ATR_STOP] = f6Result;
    const optionStopDistancePts = f6Result.details?.optionStopDistancePts || 2.50;

    // 10. F8: Net Risk-to-Reward Ratio
    const refEntry = optionQuote?.ask || optionQuote?.ltp || context.entryPrice || context.referenceEntryPrice || 120.0;
    const stopPolicy = context.stopPolicy || (context.pegStopToFill === false ? "TECHNICAL_ABSOLUTE" : "ATR_ENTRY_RELATIVE");
    const targetPolicy = context.targetPolicy || (context.targetPrice ? "TECHNICAL_ABSOLUTE" : "RR_DERIVED");

    const f8Result = this.evaluateF8RiskReward({
      referenceEntryPrice: refEntry,
      stopDistancePts: optionStopDistancePts,
      stopLossPrice: context.stopLossPrice || context.stopLoss,
      targetPrice: context.targetPrice || context.target,
      stopPolicy,
      targetPolicy,
      lotSize: 65,
      lots: 1,
      symbol: selectedContract?.symbol || "NIFTY",
      minNetRr: context.minNetRr || 2.0,
      maxNetRisk: context.maxNetRisk || 300.0,
      pegStopToFill: stopPolicy === "ATR_ENTRY_RELATIVE",
    });
    filters[FILTER_KEYS.F8_NET_RISK_REWARD] = f8Result;

    // 11. F12: Daily Drawdown Shield
    const modelledNetLoss = f8Result.details?.netStopLoss || 250.0;
    filters[FILTER_KEYS.F12_DAILY_DRAWDOWN_SHIELD] = this.evaluateF12DailyDrawdown(modelledNetLoss, 300.0);

    // 12. F7: EV Research Gate (Always evaluated, edgeStatus strictly NOT_VALIDATED)
    filters[FILTER_KEYS.F7_EV_VALIDATION_STATUS] = this.evaluateF7EVResearch(context.evInputs || {});

    // Aggregate Decision
    let allPassed = true;
    let primaryFailure = null;

    for (const [key, res] of Object.entries(filters)) {
      if (res.status !== "PASS") {
        allPassed = false;
        if (!primaryFailure) {
          primaryFailure = { filter: key, reason: res.reason, details: res.details };
        }
      }
    }

    let decision = "NO_TRADE";
    let candidate = null;

    if (allPassed && (bias === "CALL" || bias === "PUT") && selectedContract) {
      decision = bias;
      const rr = f8Result.details;
      candidate = {
        symbol: selectedContract.symbol,
        strike: selectedContract.strike,
        optionType: selectedContract.optionType,
        underlyingPrice: Number(context.spotPrice),
        underlyingAtr,
        lots: 1,
        lotSize: 65,
        units: 65,
        stopPolicy: rr.stopPolicy,
        targetPolicy: rr.targetPolicy,
        referenceEntryPrice: rr.referenceEntryPrice,
        referenceStopLoss: rr.referenceStopLoss,
        referenceTarget: rr.referenceTarget,
        modelledEntryFill: rr.modelledEntryFill,
        modelledStopLoss: rr.modelledStopLoss,
        modelledTarget: rr.modelledTarget,
        filledEntryPrice: null, // Strictly populated only upon paper execution
        executedStopLoss: null,  // Strictly populated only upon paper execution
        executedTarget: null,    // Strictly populated only upon paper execution
        entryPrice: rr.referenceEntryPrice, // Indicative reference price
        stopLoss: rr.rawStopLoss,           // Pre-trade modelled stop
        target: rr.rawTarget,               // Pre-trade modelled target
        stopDistancePts: rr.stopDistancePts,
        targetDistancePts: rr.targetDistancePts,
        direction: "LONG",
        modelledNetRisk: rr.netStopLoss,
        modelledNetReward: rr.netTargetProfit,
        modelledNetRrRatio: rr.netRrRatio,
        netRiskRupees: rr.netStopLoss,
        netRewardRupees: rr.netTargetProfit,
        netRiskRewardRatio: rr.netRrRatio,
        delta: selectedContract.delta,
        absDelta: selectedContract.absDelta,
        gamma: selectedContract.gamma,
        theta: selectedContract.theta,
        vega: selectedContract.vega,
        edgeStatus: EDGE_STATUS.NOT_VALIDATED,
        generatedAt: evaluatedAt,
      };
    }

    const result = {
      evaluationId,
      evaluatedAt,
      timestamp: evaluatedAt,
      decision,
      bias,
      candidate,
      filters,
      edgeStatus: EDGE_STATUS.NOT_VALIDATED,
      reason: allPassed ? "ALL_FILTERS_PASSED" : primaryFailure?.reason || "FILTERS_NOT_MET",
      primaryFailure,
    };

    this.lastEvaluation = result;

    if (candidate) {
      this.publishCandidateIfNew(candidate, result);
    }

    return result;
  }

  publishCandidateIfNew(candidate, fullResult) {
    const now = Date.now();
    const isSameStrike = this.lastEmittedCandidate?.strike === candidate.strike;
    const isSameType = this.lastEmittedCandidate?.optionType === candidate.optionType;
    const priceDiff = Math.abs((this.lastEmittedCandidate?.entryPrice || 0) - candidate.entryPrice);
    const withinDedup = now - this.lastEmittedAt < this.dedupWindowMs;

    if (isSameStrike && isSameType && priceDiff < 0.25 && withinDedup) {
      fullResult.isDuplicate = true;
      return;
    }

    this.lastEmittedCandidate = candidate;
    this.lastEmittedAt = now;
    fullResult.isDuplicate = false;

    this.emit("candidate", { candidate, evaluationId: fullResult.evaluationId });
    if (this.engine && typeof this.engine.publish === "function") {
      this.engine.publish("scanner_candidate", { candidate, evaluationId: fullResult.evaluationId });
    }
  }

  getLatestEvaluation() {
    return this.lastEvaluation;
  }
}
