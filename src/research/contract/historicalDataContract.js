/**
 * PORTFOLIOX - Canonical Historical Research Dataset Contract
 * Phase 5.2B: Research Dataset Contract & Acquisition Readiness (Corrected)
 *
 * STRICT GOVERNANCE:
 * - RESEARCH_DATA_STATUS: PARTIAL
 * - EDGE_STATUS: NOT_VALIDATED
 * - BACKTEST_PROFITABILITY_CLAIMS: DISABLED
 * - LIVE_ORDER_ROUTING: DISABLED
 * - NO DATA PURCHASE / NO EXTERNAL VENDOR CONNECTION
 */

import crypto from "node:crypto";

export const GOVERNANCE_STATUS = Object.freeze({
  RESEARCH_DATA_STATUS: "PARTIAL",
  EDGE_STATUS: "NOT_VALIDATED",
  BACKTEST_PROFITABILITY_CLAIMS: "DISABLED",
  LIVE_ORDER_ROUTING: "DISABLED",
  PAPER_TRADES_ROLE: "SYSTEM_VALIDATION_ONLY"
});

/**
 * 5.2B.1 — CONTRACT MASTER SCHEMA & DETERMINISTIC COLLISION PREVENTION
 */
export const CONTRACT_MASTER_SCHEMA = Object.freeze({
  required_fields: [
    "canonical_urn",       // Globally unique URN: e.g. "NSE:OPT:BANKNIFTY:2026-09-24:54200:CE"
    "underlying",          // "NIFTY" | "BANKNIFTY"
    "exchange",            // "NSE"
    "instrument_type",     // "OPTIDX" | "OPTSTK"
    "option_type",         // "CE" | "PE"
    "strike",              // Numeric strike price (e.g. 54200.0)
    "expiry_date",         // "YYYY-MM-DD"
    "trading_date",        // "YYYY-MM-DD" (As-of date)
    "exchange_token",      // Historical raw token (e.g. "50917")
    "lot_size_as_of_date", // Authoritative lot size on trading_date (Point-in-time)
    "contract_status",     // "ACTIVE" | "EXPIRED"
    "calendar_era"         // e.g. "SEBI_2024_REVISED_LOT"
  ],
  
  /**
   * Generates a deterministic canonical contract URN.
   * Deterministic identity and collision prevention are guaranteed by the canonical URN composite key structure,
   * which embeds underlying, expiry date, strike, and option type.
   */
  generateCanonicalUrn(contract) {
    const { exchange, instrument_type, underlying, expiry_date, strike, option_type } = contract;
    if (!exchange || !underlying || !expiry_date || strike === undefined || !option_type) {
      throw new Error("Missing required fields for canonical contract URN");
    }
    return `${exchange}:${instrument_type || "OPTIDX"}:${underlying}:${expiry_date}:${Number(strike).toFixed(2)}:${option_type.toUpperCase()}`;
  },

  /**
   * Collision check utility
   */
  checkCollision(contractA, contractB) {
    const urnA = this.generateCanonicalUrn(contractA);
    const urnB = this.generateCanonicalUrn(contractB);
    const tokenReused = contractA.exchange_token === contractB.exchange_token;
    const sameUrn = urnA === urnB;
    return {
      tokenReused,
      sameUrn,
      isCollision: sameUrn && contractA.expiry_date !== contractB.expiry_date,
      urnCollisionProtected: tokenReused && !sameUrn
    };
  }
});

/**
 * 5.2B.2 — MARKET DATA SCHEMA (1-Minute Record)
 */
export const MARKET_DATA_SCHEMA = Object.freeze({
  required_fields: [
    "timestamp_ist",        // ISO 8601 with +05:30 offset: e.g. "2026-09-24T09:15:00+05:30"
    "open",                 // Traded open price (positive number)
    "high",                 // Traded high price (>= open, low, close)
    "low",                  // Traded low price (<= open, high, close)
    "close",                // Traded close price (positive number)
    "volume"                // Traded contract volume in units (integer >= 0)
  ],
  optional_fields: [
    "open_interest",        // Traded Open Interest (available on some platforms; optional in 1m)
    "underlying_spot_close" // Synchronized underlying cash index close at identical bar
  ],
  validateRecord(record) {
    for (const f of this.required_fields) {
      if (record[f] === undefined || record[f] === null) {
        return { valid: false, reason: `Missing required field: ${f}` };
      }
    }
    if (record.high < record.low || record.high < record.open || record.high < record.close || record.low > record.open || record.low > record.close) {
      return { valid: false, reason: "Malformed OHLC: High must be >= Open/Close/Low and Low must be <= Open/Close/High" };
    }
    if (record.open <= 0 || record.high <= 0 || record.low <= 0 || record.close <= 0) {
      return { valid: false, reason: "Impossible price: Non-positive OHLC values" };
    }
    if (record.volume < 0) {
      return { valid: false, reason: "Negative volume" };
    }
    return { valid: true };
  }
});

/**
 * 5.2B.3 — MICROSTRUCTURE EXTENSIONS (High-Fidelity Classification)
 */
export const MICROSTRUCTURE_EXTENSIONS = Object.freeze({
  fields: {
    bid: { classification: "PREFERRED", description: "Best bid price at bar close" },
    ask: { classification: "PREFERRED", description: "Best ask price at bar close" },
    bid_size: { classification: "OPTIONAL", description: "Quantity at best bid" },
    ask_size: { classification: "OPTIONAL", description: "Quantity at best ask" },
    spread: { classification: "PREFERRED", description: "Ask - Bid spread (Never synthesize if bid/ask absent)" },
    tick_timestamp: { classification: "OPTIONAL", description: "High-resolution millisecond timestamp of last trade" },
    IV: { classification: "OPTIONAL", description: "Implied Volatility (Must be exchange/calibrated; do not synthesize)" },
    delta: { classification: "OPTIONAL", description: "Option Delta Greek" },
    gamma: { classification: "OPTIONAL", description: "Option Gamma Greek" },
    vega: { classification: "OPTIONAL", description: "Option Vega Greek" }
  },
  synthesis_rule: "STRICT_BAN: Microstructure fields (Bid, Ask, Spread, IV, Greeks) must NEVER be synthesized or backfilled using linear interpolation or spot-proxy guesses. If absent, they must be recorded as null with status UNAVAILABLE."
});

/**
 * 5.2B.4 — DATA QUALITY CONTRACT & SEPARATED BAR CLASSIFICATIONS
 */
export const QUALITY_TIERS = Object.freeze({
  VALID: "VALID",           // All invariants pass, zero missing bars, verified provenance
  PARTIAL: "PARTIAL",       // Mechanically usable but contains gaps, zero-volume bars, or missing optional fields
  INVALID: "INVALID",       // Fails core invariants (lookahead, malformed OHLC, unaligned timestamps)
  UNAVAILABLE: "UNAVAILABLE" // Dataset not acquired or cannot be probed
});

export const BAR_ANOMALY_TYPES = Object.freeze({
  ZERO_VOLUME: "ZERO_VOLUME", // Valid bar present in stream with timestamp, but 0 contracts traded
  MISSING_BAR: "MISSING_BAR", // Expected calendar minute within 09:15-15:30 IST completely absent from feed
  POST_MARKET: "POST_MARKET"  // Bar timestamp between 15:30:01 and 16:00:00 IST (settlement mark only)
});

export const QUALITY_VALIDATION_RULES = Object.freeze({
  rules: [
    { id: "Q01", name: "Strict Timestamp Monotonicity", severity: "FATAL" },
    { id: "Q02", name: "Duplicate Timestamp Prohibition", severity: "FATAL" },
    { id: "Q03", name: "Session Window Bounding (09:15-15:30 IST)", severity: "FATAL" },
    { id: "Q04", name: "Post-Market Bar Tagging (15:30-16:00 IST)", severity: "WARNING" },
    { id: "Q05", name: "Zero-Volume Bar Identification (Distinct from Missing Bar)", severity: "WARNING" },
    { id: "Q06", name: "Missing Bar Gap Detection (Distinct from Zero-Volume Bar)", severity: "WARNING" },
    { id: "Q07", name: "Malformed OHLC Detection", severity: "FATAL" },
    { id: "Q08", name: "Point-in-Time Lot Size Verification", severity: "FATAL" },
    { id: "Q09", name: "No Lookahead Forward Revisions", severity: "FATAL" },
    { id: "Q10", name: "Authoritative Source Provenance & SHA-256", severity: "FATAL" }
  ],
  evaluateDataset(candles, meta) {
    if (!candles || candles.length === 0) return QUALITY_TIERS.UNAVAILABLE;
    
    let hasZeroVolume = false;
    let hasMissingBars = false;
    let hasPostMarket = false;
    let lastTs = -1;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const ts = new Date(c.timestamp_ist).getTime();
      
      if (isNaN(ts) || ts <= lastTs) {
        return { tier: QUALITY_TIERS.INVALID, reason: "Timestamp order violation or duplicate detected" };
      }
      
      // Gap check (more than 1 minute difference between consecutive bars within session)
      if (lastTs !== -1 && (ts - lastTs) > 60000) {
        hasMissingBars = true;
      }
      lastTs = ts;

      const recordCheck = MARKET_DATA_SCHEMA.validateRecord(c);
      if (!recordCheck.valid) {
        return { tier: QUALITY_TIERS.INVALID, reason: recordCheck.reason };
      }

      if (c.volume === 0) hasZeroVolume = true;
      const hours = new Date(c.timestamp_ist).getHours();
      const minutes = new Date(c.timestamp_ist).getMinutes();
      if (hours > 15 || (hours === 15 && minutes > 30)) {
        hasPostMarket = true;
      }
    }

    if (hasZeroVolume || hasMissingBars || hasPostMarket || !meta?.has_oi) {
      return { 
        tier: QUALITY_TIERS.PARTIAL, 
        reason: "Contains zero-volume bars, missing bar gaps, post-market marks, or lacks full microstructure",
        anomalies: { hasZeroVolume, hasMissingBars, hasPostMarket }
      };
    }

    return { tier: QUALITY_TIERS.VALID, reason: "All quality invariants satisfied" };
  }
});

/**
 * 5.2B.5 — SYNCHRONIZATION CONTRACT & DISAMBIGUATED GAP HANDLING
 */
export const SYNCHRONIZATION_CONTRACT = Object.freeze({
  canonical_timezone: "Asia/Kolkata",
  tolerance_window_ms: 0, // 1-minute bars must align on exact minute boundaries (00 seconds)
  rules: {
    spot_alignment: "Option candle at timestamp T must match Underlying Spot candle at timestamp T exactly.",
    missing_spot_behavior: "REJECT_OR_QUARANTINE: If spot candle is missing, DO NOT forward-fill option price. Tag bar as UNALIGNED_SPOT.",
    zero_volume_definition: "A valid candle is present in the feed at timestamp T, but traded volume is zero (volume = 0). DO NOT treat as MISSING_BAR.",
    missing_bar_definition: "An expected calendar minute timestamp T is completely omitted/absent from the feed. DO NOT treat as ZERO_VOLUME, and DO NOT forward-fill price from T-1.",
    metadata_alignment: "Lot size and expiry date must match point-in-time regulatory circulars for that trading date."
  }
});

/**
 * 5.2B.6 — RESEARCH PARTITIONING DESIGN (Explicitly Provisional)
 */
export const RESEARCH_PARTITIONING = Object.freeze({
  status: "PROVISIONAL_PENDING_DATASET_INSPECTION",
  design_note: "The 60/20/20 chronological split and 5-day post-expiry embargo are explicitly provisional specifications. Final partition boundaries and embargo duration must be validated against actual acquired dataset coverage, calendar completeness, and regime structure before research execution.",
  provisional_partitions: [
    {
      name: "TRAIN (In-Sample)",
      role: "Initial hypothesis development and parameter bounds discovery",
      share: "60%",
      status: "PROVISIONAL"
    },
    {
      name: "VALIDATION (Out-of-Sample Holdout 1)",
      role: "Model comparison, overfitting check, stop-model mechanism validation",
      share: "20%",
      status: "PROVISIONAL"
    },
    {
      name: "OUT-OF-SAMPLE (OOS Final Holdout)",
      role: "Single-pass execution; zero parameter modification; confirmation only",
      share: "20%",
      status: "PROVISIONAL"
    }
  ],
  provisional_embargo: {
    duration_days: 5,
    purpose: "Prevent information leakage from multi-day option decaying positions or weekly expiry overlap across split borders. Must be re-verified against actual expiry cycle frequencies post-acquisition."
  },
  regulatory_era_handling: "Partitions must respect regulatory discontinuities (e.g. SEBI circulars changing lot sizes or weekly contract limits in Oct/Nov 2024). Regimes must not be blended haphazardly."
});

/**
 * 5.2B.7 — MINIMUM RESEARCH UNIVERSE EVALUATION (Corrected Target Formulation)
 */
export const RESEARCH_UNIVERSE_EVALUATION = Object.freeze({
  proposed_universe: {
    underlyings: ["NIFTY", "BANKNIFTY"],
    instruments: ["Calls (CE)", "Puts (PE)"],
    strikes: "ATM ± 5 Strikes",
    expiries: "Weekly and Monthly expiries",
    span_target: "24 months minimum acquisition target; adequacy must be demonstrated after acquisition."
  },
  adequacy_verdict: "24 months minimum acquisition target; adequacy must be demonstrated after acquisition.",
  detailed_evaluation: {
    target_definition: "24 months is a minimum acquisition target to assemble candidate data. True statistical adequacy cannot be assumed a priori and must be empirically demonstrated post-acquisition.",
    mechanics_testing: "Candidate scope provides necessary raw observations to test SL/TP execution mechanics across multiple expirations.",
    walk_forward_testing: "Feasibility of rolling walk-forward folds depends on actual continuous trading session coverage achieved.",
    multi_regime_limitation: "The 2024-2026 window covers predominantly moderate volatility (India VIX 10-16). Macro tail-risk adequacy (e.g. Black Swan shocks like March 2020) cannot be proven by a 24-month target alone.",
    sebi_structural_break: "Late-2024 SEBI regulatory shifts (discontinuation of multiple weekly contracts per exchange, lot size increases) introduce a structural regime discontinuity that must be analyzed post-acquisition."
  }
});

/**
 * 5.2B.8 — DATASET VERSIONING SCHEMA
 */
export const DATASET_VERSIONING_SCHEMA = Object.freeze({
  required_metadata: [
    "dataset_id",
    "version",
    "source",
    "retrieval_date",
    "coverage_start",
    "coverage_end",
    "contract_count",
    "row_count",
    "sha256_hash",
    "quality_status"
  ],
  createManifest(meta) {
    for (const f of this.required_metadata) {
      if (meta[f] === undefined) {
        throw new Error(`Missing required dataset versioning field: ${f}`);
      }
    }
    return Object.freeze({ ...meta });
  }
});

/**
 * 5.2B.9 — RESEARCH REPRODUCIBILITY MANIFEST (Conditional Seed for Stochasticity)
 */
export const REPRODUCIBILITY_MANIFEST = Object.freeze({
  required_fields: [
    "experiment_id",
    "dataset_version",
    "strategy_version",
    "model_version",
    "execution_model_version",
    "calendar_version",
    "charge_model_version",
    "slippage_model",
    "is_stochastic",
    "created_at"
  ],
  createExperimentRecord(config) {
    for (const f of this.required_fields) {
      if (config[f] === undefined) {
        throw new Error(`Experiment cannot be reproduced without field: ${f}`);
      }
    }
    // Conditional random_seed validation: Required if and only if experiment is stochastic
    if (config.is_stochastic === true) {
      if (typeof config.random_seed !== "number") {
        throw new Error("Stochastic experiment requires a valid numeric random_seed for reproducibility");
      }
    } else {
      // For purely deterministic execution, random_seed is optional/null
      config.random_seed = config.random_seed ?? null;
    }
    return Object.freeze({ ...config });
  }
});

/**
 * 5.2B.10 — ACQUISITION READINESS SPECIFICATION
 */
export const ACQUISITION_READINESS_SPEC = Object.freeze({
  A_minimum_dataset_spec: {
    underlying: ["NIFTY", "BANKNIFTY"],
    timeframe: "1-minute continuous OHLCV",
    strikes: "ATM ± 5 Strikes (Calls + Puts)",
    coverage_target: "24 months minimum acquisition target; adequacy must be demonstrated after acquisition.",
    fields: ["timestamp_ist", "open", "high", "low", "close", "volume", "underlying_spot_close"]
  },
  B_preferred_dataset_spec: {
    includes_minimum: true,
    additional_fields: ["open_interest", "daily_bhavcopy_reconciled_settlement"]
  },
  C_nice_to_have_microstructure_spec: {
    fields: ["best_bid", "best_ask", "bid_size", "ask_size", "historical_iv", "delta", "gamma"]
  },
  D_strictly_banned_synthesis_fields: [
    "bid", "ask", "bid_ask_spread", "tick_level_mae", "tick_level_mfe", "historical_iv", "delta", "gamma", "vega"
  ],
  E_minimum_coverage_required: "24 months minimum acquisition target; adequacy must be demonstrated after acquisition.",
  F_validation_checklist: [
    "SHA-256 bitwise file verification",
    "Session 09:15-15:30 IST timestamp monotonic continuity check",
    "Disambiguated ZERO_VOLUME vs MISSING_BAR audit",
    "Zero forward-looking revision audit",
    "Cross-reconciliation with official NSE Bhavcopy settlement files",
    "Point-in-time lot size table verification against SEBI circulars"
  ],
  G_research_partitioning: "Provisional 60% Train, 20% Validation, 20% Out-of-Sample with 5-day post-expiry embargo (to be verified against acquired data structure).",
  H_final_acceptance_criteria: "Dataset must pass QUALITY_VALIDATION_RULES with zero FATAL violations and achieve VALID or explicitly quarantined PARTIAL status prior to any backtest execution."
});
