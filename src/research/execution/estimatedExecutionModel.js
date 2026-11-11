/**
 * Historical Estimated Execution Model & Slippage Sensitivity Matrix
 * Research Data Foundation - Workstream B / Phase 5.0D & 5.0E
 * 
 * Formalizes Track A 1-Minute Candle-Based Estimated Execution.
 * Never labels candle fills as ACTUAL_EXECUTION.
 * Enforces Conservative STOP-FIRST policy on same-bar touches.
 */

import { calculateStatutoryCharges } from "../../client/stores/slices/tradeHelpers.js";

export const EXECUTION_LABELS = {
  ESTIMATED_EXECUTION: "ESTIMATED_EXECUTION",
  ACTUAL_EXECUTION: "ACTUAL_EXECUTION" // Strictly banned for backtests
};

export const DATA_QUALITY_MODES = {
  TRACK_A_ESTIMATED: "CANDLE_BASED_ESTIMATED_EXECUTION",
  TRACK_B_TICK_MICROSTRUCTURE: "TICK_LEVEL_MICROSTRUCTURE_EXECUTION"
};

export const INTRABAR_POLICIES = {
  CONSERVATIVE_STOP_FIRST: "CONSERVATIVE_STOP_FIRST",
  OPTIMISTIC_TARGET_FIRST: "OPTIMISTIC_TARGET_FIRST"
};

export const SLIPPAGE_SENSITIVITY_TIERS = [0.05, 0.10, 0.20, 0.30, 0.50];

/**
 * Simulate trade lifecycle across 1-minute candle bars using estimated execution.
 * 
 * @param {Object} params
 * @param {Array} params.candles - Array of normalized 1-min candles starting from entry
 * @param {number} params.entry_price - Nominal entry price
 * @param {number} params.stop_loss - Nominal stop loss price
 * @param {number} params.target - Nominal profit target price
 * @param {string} params.direction - "LONG" | "SHORT"
 * @param {number} params.quantity - Quantity in units (e.g. 65)
 * @param {number} params.slippage_tier - Synthetic slippage penalty in INR points (e.g. 0.20)
 * @param {string} params.intrabar_policy - "CONSERVATIVE_STOP_FIRST"
 */
export function simulateEstimatedTradeExecution({
  candles,
  entry_price,
  stop_loss,
  target,
  direction = "LONG",
  quantity = 65,
  slippage_tier = 0.20,
  intrabar_policy = INTRABAR_POLICIES.CONSERVATIVE_STOP_FIRST
}) {
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new Error("Simulation requires a non-empty candles array.");
  }

  // 1. Apply entry slippage penalty (adverse fill)
  const isLong = direction === "LONG";
  const filled_entry = isLong
    ? Number((entry_price + slippage_tier).toFixed(2))
    : Number((entry_price - slippage_tier).toFixed(2));

  let exit_candle_index = -1;
  let exit_timestamp = null;
  let exit_reason = "END_OF_DATA_SQUARE_OFF";
  let nominal_exit_price = candles[candles.length - 1].close;
  let intrabar_ambiguity_flag = false;

  // Track bar-by-bar high/low extrema (extrema scalar only, no synthetic tick interpolation)
  let max_favorable_price = filled_entry;
  let max_adverse_price = filled_entry;

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];
    const { high, low, close } = bar;

    if (isLong) {
      if (high > max_favorable_price) max_favorable_price = high;
      if (low < max_adverse_price) max_adverse_price = low;

      const stopTouched = low <= stop_loss;
      const targetTouched = high >= target;

      if (stopTouched && targetTouched) {
        // Intrabar ambiguity: both touched in the same 1-min candle!
        intrabar_ambiguity_flag = true;
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;

        if (intrabar_policy === INTRABAR_POLICIES.CONSERVATIVE_STOP_FIRST) {
          exit_reason = "STOP_LOSS";
          nominal_exit_price = stop_loss;
        } else {
          exit_reason = "TARGET";
          nominal_exit_price = target;
        }
        break;
      } else if (stopTouched) {
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;
        exit_reason = "STOP_LOSS";
        nominal_exit_price = stop_loss;
        break;
      } else if (targetTouched) {
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;
        exit_reason = "TARGET";
        nominal_exit_price = target;
        break;
      }
    } else {
      // SHORT
      if (low < max_favorable_price) max_favorable_price = low;
      if (high > max_adverse_price) max_adverse_price = high;

      const stopTouched = high >= stop_loss;
      const targetTouched = low <= target;

      if (stopTouched && targetTouched) {
        intrabar_ambiguity_flag = true;
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;

        if (intrabar_policy === INTRABAR_POLICIES.CONSERVATIVE_STOP_FIRST) {
          exit_reason = "STOP_LOSS";
          nominal_exit_price = stop_loss;
        } else {
          exit_reason = "TARGET";
          nominal_exit_price = target;
        }
        break;
      } else if (stopTouched) {
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;
        exit_reason = "STOP_LOSS";
        nominal_exit_price = stop_loss;
        break;
      } else if (targetTouched) {
        exit_candle_index = i;
        exit_timestamp = bar.timestamp;
        exit_reason = "TARGET";
        nominal_exit_price = target;
        break;
      }
    }
  }

  if (exit_candle_index === -1) {
    exit_candle_index = candles.length - 1;
    exit_timestamp = candles[candles.length - 1].timestamp;
    nominal_exit_price = candles[candles.length - 1].close;
  }

  // 2. Apply exit slippage penalty (adverse fill on exit)
  const filled_exit = isLong
    ? Number((nominal_exit_price - slippage_tier).toFixed(2))
    : Number((nominal_exit_price + slippage_tier).toFixed(2));

  // 3. Accounting & Levies
  const gross_pnl = Number(((filled_exit - filled_entry) * quantity * (isLong ? 1 : -1)).toFixed(2));
  const total_charges = calculateStatutoryCharges(filled_entry, filled_exit, quantity, direction);
  const net_pnl = Number((gross_pnl - total_charges).toFixed(2));

  // Excursion classification: without granular tick stream, excursion is PARTIAL (extrema only)
  const mfe_pts = Number(Math.abs(max_favorable_price - filled_entry).toFixed(2));
  const mae_pts = Number(Math.abs(max_adverse_price - filled_entry).toFixed(2));

  return {
    execution_label: EXECUTION_LABELS.ESTIMATED_EXECUTION, // Never ACTUAL_EXECUTION
    data_quality_mode: DATA_QUALITY_MODES.TRACK_A_ESTIMATED,
    intrabar_resolution_policy: intrabar_policy,
    intrabar_ambiguity_flag,
    slippage_tier_pts: slippage_tier,
    entry_fill: {
      nominal_price: entry_price,
      filled_price: filled_entry,
      slippage_applied: slippage_tier
    },
    exit_fill: {
      nominal_price: nominal_exit_price,
      filled_price: filled_exit,
      slippage_applied: slippage_tier,
      exit_reason,
      exit_timestamp,
      bars_held: exit_candle_index + 1
    },
    financials: {
      quantity,
      gross_pnl,
      total_charges,
      net_pnl
    },
    excursions: {
      data_quality: "PARTIAL", // Granular tick stream unavailable; candle extrema only
      is_observed: false,
      is_partial: true,
      max_favorable_pts: mfe_pts,
      max_adverse_pts: mae_pts
    }
  };
}

/**
 * Run deterministic execution across all required slippage sensitivity tiers.
 * Minimum tiers: ₹0.05, ₹0.10, ₹0.20, ₹0.30, ₹0.50.
 * Reports robustness matrix across all tiers without cherry-picking.
 */
export function evaluateSlippageSensitivityMatrix({
  candles,
  entry_price,
  stop_loss,
  target,
  direction = "LONG",
  quantity = 65,
  tiers = SLIPPAGE_SENSITIVITY_TIERS
}) {
  const matrix = [];

  for (const tier of tiers) {
    const sim = simulateEstimatedTradeExecution({
      candles,
      entry_price,
      stop_loss,
      target,
      direction,
      quantity,
      slippage_tier: tier,
      intrabar_policy: INTRABAR_POLICIES.CONSERVATIVE_STOP_FIRST
    });

    matrix.push({
      slippage_tier_inr: tier,
      entry_fill: sim.entry_fill.filled_price,
      exit_fill: sim.exit_fill.filled_price,
      exit_reason: sim.exit_fill.exit_reason,
      intrabar_ambiguity: sim.intrabar_ambiguity_flag,
      gross_pnl: sim.financials.gross_pnl,
      total_charges: sim.financials.total_charges,
      net_pnl: sim.financials.net_pnl,
      execution_label: sim.execution_label,
      data_quality_mode: sim.data_quality_mode
    });
  }

  return {
    strategy_frozen: true,
    evaluation_purpose: "ROBUSTNESS_ANALYSIS_ONLY",
    selection_policy: "NO_OPTIMIZATION_OR_SELECTION",
    tested_tiers_count: matrix.length,
    matrix
  };
}
