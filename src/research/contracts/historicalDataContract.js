/**
 * Historical Data Contract & Track A Execution Specification
 * Research Data Foundation - Workstream B
 * 
 * Formal schemas, invariants, and execution penalty parameters for historical research.
 */

export const DATA_QUALITY_MODES = {
  TRACK_A_ESTIMATED: "CANDLE_BASED_ESTIMATED_EXECUTION",
  TRACK_B_TICK_MICROSTRUCTURE: "TICK_LEVEL_MICROSTRUCTURE_EXECUTION"
};

export const INTRABAR_RESOLUTION_POLICIES = {
  CONSERVATIVE_STOP_FIRST: "CONSERVATIVE_STOP_FIRST",
  OPTIMISTIC_TARGET_FIRST: "OPTIMISTIC_TARGET_FIRST",
  EQUAL_PROBABILITY_COIN_FLIP: "EQUAL_PROBABILITY_COIN_FLIP"
};

export const DEFAULT_EXECUTION_CONFIG = {
  data_quality_mode: DATA_QUALITY_MODES.TRACK_A_ESTIMATED,
  intrabar_resolution_policy: INTRABAR_RESOLUTION_POLICIES.CONSERVATIVE_STOP_FIRST,
  default_synthetic_penalty_name: "SYNTHETIC_EXECUTION_PENALTY_V1",
  penalty_sensitivity_tiers: [0.05, 0.10, 0.20, 0.30, 0.50],
  default_penalty_points: 0.20
};

/**
 * Validate a single normalized 1-minute candle record against canonical contract rules.
 */
export function validateCandleRecord(candle, index = 0) {
  const errors = [];

  if (!candle || typeof candle !== "object") {
    return { valid: false, errors: ["Candle record must be an object"] };
  }

  // 1. Timestamp validation
  if (!candle.timestamp || typeof candle.timestamp !== "string") {
    errors.push(`Row ${index}: Missing or invalid ISO timestamp`);
  }
  const epoch = Number(candle.epoch_ms);
  if (!Number.isFinite(epoch) || epoch <= 0) {
    errors.push(`Row ${index}: Missing or invalid epoch_ms (${candle.epoch_ms})`);
  }

  // 2. Numerical OHLC validation
  const o = Number(candle.open);
  const h = Number(candle.high);
  const l = Number(candle.low);
  const c = Number(candle.close);

  if (!Number.isFinite(o) || o <= 0) errors.push(`Row ${index}: Invalid Open (₹${o})`);
  if (!Number.isFinite(h) || h <= 0) errors.push(`Row ${index}: Invalid High (₹${h})`);
  if (!Number.isFinite(l) || l <= 0) errors.push(`Row ${index}: Invalid Low (₹${l})`);
  if (!Number.isFinite(c) || c <= 0) errors.push(`Row ${index}: Invalid Close (₹${c})`);

  // OHLC geometric consistency
  if (h < Math.max(o, c)) {
    errors.push(`Row ${index}: High (₹${h}) must be >= max(Open ₹${o}, Close ₹${c})`);
  }
  if (l > Math.min(o, c)) {
    errors.push(`Row ${index}: Low (₹${l}) must be <= min(Open ₹${o}, Close ₹${c})`);
  }

  // 3. Volume and OI validation
  const v = Number(candle.volume);
  const oi = Number(candle.open_interest);

  if (!Number.isFinite(v) || v < 0) {
    errors.push(`Row ${index}: Volume (${candle.volume}) must be non-negative`);
  }
  if (!Number.isFinite(oi) || oi < 0) {
    errors.push(`Row ${index}: Open Interest (${candle.open_interest}) must be non-negative`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalize raw input candle array [timestamp, open, high, low, close, volume, open_interest]
 * into the canonical research format.
 */
export function normalizeRawCandle(raw) {
  if (Array.isArray(raw)) {
    const [ts, o, h, l, c, v = 0, oi = 0] = raw;
    const epoch = new Date(ts).getTime();
    return {
      timestamp: String(ts),
      epoch_ms: epoch,
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: Number(v),
      open_interest: Number(oi)
    };
  }

  return {
    timestamp: String(raw.timestamp || raw.date || raw.time),
    epoch_ms: raw.epoch_ms || new Date(raw.timestamp || raw.date).getTime(),
    open: Number(raw.open || raw.Open),
    high: Number(raw.high || raw.High),
    low: Number(raw.low || raw.Low),
    close: Number(raw.close || raw.Close),
    volume: Number(raw.volume || raw.Volume || 0),
    open_interest: Number(raw.open_interest || raw.oi || raw.OI || 0)
  };
}
