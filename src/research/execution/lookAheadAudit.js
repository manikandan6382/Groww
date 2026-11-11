/**
 * Point-in-Time Information Boundary & Look-Ahead Bias Audit
 * Research Data Foundation - Workstream B / Phase 5.0C
 * 
 * Enforces strict causal timeline isolation:
 * No decision variable can access market information after its decision timestamp.
 */

export class LookAheadAccessError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LookAheadAccessError";
    this.details = details;
  }
}

/**
 * Formal Point-in-Time Availability Specifications for Decision Variables
 */
export const POINT_IN_TIME_SPECIFICATIONS = {
  indicators: {
    variable: "Technical Indicators (EMA, ATR, RSI)",
    information_boundary: "Completed candle bars strictly <= T_decision. Candle bar k completes at its close timestamp.",
    lookahead_risk: "Consuming bar k+1 close or bar k close before bar completion."
  },
  candle_selection: {
    variable: "Historical Candle Selection",
    information_boundary: "Strictly chronological ascending stream (epoch[k] > epoch[k-1]).",
    lookahead_risk: "Accessing future candle arrays or forward-peeking slices."
  },
  signal_timestamp: {
    variable: "Strategy Signal Timestamp",
    information_boundary: "Timestamped at exactly the close of the trigger bar (T_signal = bar[k].close_time).",
    lookahead_risk: "Signal stamped at bar open using bar close data."
  },
  option_selection: {
    variable: "Option Contract Selection",
    information_boundary: "Available active contracts at T_signal with strike resolved from spot price at T_signal.",
    lookahead_risk: "Selecting contracts based on end-of-day volume or future intraday moves."
  },
  expiry_selection: {
    variable: "Contract Expiry Selection",
    information_boundary: "Exchange calendar rules valid for historical era at T_signal.",
    lookahead_risk: "Applying future regulatory calendar reforms retroactively."
  },
  strike_selection: {
    variable: "Option Strike Selection",
    information_boundary: "Underlying Spot price observable at or prior to T_signal.",
    lookahead_risk: "Using spot high/low of subsequent bars to pick strike."
  },
  entry_price: {
    variable: "Entry Fill Price",
    information_boundary: "Next bar open price (bar[k+1].open) or realistic ask price at T_signal + execution latency.",
    lookahead_risk: "Using bar[k].close or bar[k+1].low as guaranteed fill price without latency."
  },
  stop_price: {
    variable: "Stop Loss Price",
    information_boundary: "Computed at entry execution timestamp from entry fill price and historical risk formula.",
    lookahead_risk: "Dynamically recalculating initial SL based on future trade progression."
  },
  target_price: {
    variable: "Profit Target Price",
    information_boundary: "Computed at entry execution timestamp from entry fill price and fixed/model R:R.",
    lookahead_risk: "Adjusting target using future excursion knowledge."
  },
  position_sizing: {
    variable: "Position Sizing / Lot Allocation",
    information_boundary: "Account capital and risk parameters observable at T_entry.",
    lookahead_risk: "Using post-trade P&L or future win-rate in sizing."
  },
  exit_decision: {
    variable: "Exit Trigger & Execution Fill",
    information_boundary: "Observable bar High/Low during bar j (j > k). If both SL and TP touched, conservative policy enforced.",
    lookahead_risk: "Peeking at bar j+1 or assuming TP hit before SL without tick proof."
  },
  charges: {
    variable: "Statutory Levies & Friction",
    information_boundary: "Authoritative formula based strictly on actual executed turnover at T_exit.",
    lookahead_risk: "Using hypothetical post-hoc flat friction or zero charges."
  },
  slippage: {
    variable: "Execution Slippage Model",
    information_boundary: "Synthetic penalty applied against filled price based on preset sensitivity tiers.",
    lookahead_risk: "Optimizing slippage penalty after seeing backtest outcome."
  },
  market_regime_classification: {
    variable: "Market Regime Classification",
    information_boundary: "Rolling statistical window of past N bars up to T_decision.",
    lookahead_risk: "Centering rolling filters (e.g. 2-sided Savitzky-Golay, future ATR) across current bar."
  }
};

/**
 * Audit an individual decision calculation against causal boundary.
 */
export function auditDecisionPointInTime({
  decision_name,
  decision_timestamp_ms,
  data_timestamps_ms = []
}) {
  const violations = [];
  for (let i = 0; i < data_timestamps_ms.length; i++) {
    const dataTs = data_timestamps_ms[i];
    if (dataTs > decision_timestamp_ms) {
      violations.push({
        index: i,
        data_timestamp: new Date(dataTs).toISOString(),
        decision_timestamp: new Date(decision_timestamp_ms).toISOString(),
        delta_ms: dataTs - decision_timestamp_ms
      });
    }
  }

  return {
    decision_name,
    is_valid: violations.length === 0,
    has_lookahead_bias: violations.length > 0,
    violation_count: violations.length,
    violations
  };
}

/**
 * Guarded Historical Data Feed
 * Prevents consumer code from peeking into future candle records.
 */
export class GuardedDataFeed {
  constructor(candles) {
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error("GuardedDataFeed requires a non-empty array of candles");
    }
    this._candles = Object.freeze([...candles]);
    this._cursor = -1;
  }

  get totalLength() {
    return this._candles.length;
  }

  get currentIndex() {
    return this._cursor;
  }

  hasNext() {
    return this._cursor < this._candles.length - 1;
  }

  next() {
    if (!this.hasNext()) {
      return null;
    }
    this._cursor++;
    return this._candles[this._cursor];
  }

  /**
   * Safe access to historical slice: strictly 0 .. cursor
   */
  getHistory(windowSize = null) {
    if (this._cursor < 0) return [];
    if (windowSize == null) {
      return this._candles.slice(0, this._cursor + 1);
    }
    const start = Math.max(0, this._cursor + 1 - windowSize);
    return this._candles.slice(start, this._cursor + 1);
  }

  /**
   * Attempt to peek forward beyond cursor: throws LookAheadAccessError
   */
  peek(offset = 1) {
    if (offset > 0) {
      throw new LookAheadAccessError(
        `Look-ahead violation: Attempted to peek ${offset} bars ahead into the future! Cursor=${this._cursor}`,
        { cursor: this._cursor, requested_offset: offset }
      );
    }
    const idx = this._cursor + offset;
    if (idx < 0) return null;
    return this._candles[idx];
  }
}
