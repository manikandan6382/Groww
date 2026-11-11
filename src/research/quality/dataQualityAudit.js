/**
 * Historical Data Quality Audit Framework
 * Research Data Foundation - Workstream B
 * 
 * Runs a rigorous 10-point audit on normalized candle datasets.
 * Computes: DATASET STATUS = VALID / INVALID / PARTIAL.
 */

import { validateCandleRecord } from "../contracts/historicalDataContract.js";

export const AUDIT_STATUS = {
  VALID: "VALID",
  PARTIAL: "PARTIAL",
  INVALID: "INVALID",
  UNAVAILABLE: "UNAVAILABLE"
};

/**
 * Perform exhaustive 10-point quality audit on normalized candles array.
 */
export function auditCandleDataset({
  contract_metadata,
  candles,
  expected_hash = null,
  raw_payload_hash = null,
  audit_version = "v1.0.0"
}) {
  const issues = [];
  const warnings = [];

  if (!candles) {
    return {
      status: AUDIT_STATUS.UNAVAILABLE,
      passed: false,
      summary: "Dataset is UNAVAILABLE or null.",
      metrics: { total_candles: 0 },
      critical_issues: ["UNAVAILABLE_DATASET: Dataset is missing or unavailable."],
      warnings: []
    };
  }

  const totalCandles = Array.isArray(candles) ? candles.length : 0;
  if (totalCandles === 0) {
    return {
      status: AUDIT_STATUS.INVALID,
      passed: false,
      summary: "Dataset contains 0 candle records.",
      metrics: { total_candles: 0 },
      critical_issues: ["EMPTY_DATASET: Zero candles present."],
      warnings: []
    };
  }

  // 0. Payload Hash Verification
  let hashMismatch = false;
  if (expected_hash && raw_payload_hash && expected_hash !== raw_payload_hash) {
    hashMismatch = true;
    issues.push(`HASH_INTEGRITY_VIOLATION: Expected hash ${expected_hash} !== raw payload hash ${raw_payload_hash}`);
  }

  // 1. Timestamp Ordering Audit
  let orderingViolations = 0;
  for (let i = 1; i < totalCandles; i++) {
    if (candles[i].epoch_ms <= candles[i - 1].epoch_ms) {
      orderingViolations++;
      if (orderingViolations <= 5) {
        issues.push(`ORDERING_VIOLATION: Candle #${i} (${candles[i].timestamp}) <= Candle #${i - 1} (${candles[i - 1].timestamp})`);
      }
    }
  }

  // 2. Duplicate Timestamps Audit
  const seenTimestamps = new Set();
  let duplicateCount = 0;
  for (const c of candles) {
    if (seenTimestamps.has(c.timestamp)) {
      duplicateCount++;
    } else {
      seenTimestamps.add(c.timestamp);
    }
  }
  if (duplicateCount > 0) {
    issues.push(`DUPLICATE_TIMESTAMPS: Found ${duplicateCount} duplicate timestamp records.`);
  }

  // 3. OHLC Validity Audit
  let ohlcViolations = 0;
  for (let i = 0; i < totalCandles; i++) {
    const val = validateCandleRecord(candles[i], i);
    if (!val.valid) {
      ohlcViolations += val.errors.length;
      if (ohlcViolations <= 5) {
        issues.push(...val.errors);
      }
    }
  }

  // 4. Zero-Volume Periods Audit
  let zeroVolumeCount = 0;
  for (const c of candles) {
    if (c.volume === 0) zeroVolumeCount++;
  }
  const zeroVolumePct = ((zeroVolumeCount / totalCandles) * 100).toFixed(2);
  if (zeroVolumeCount > 0) {
    warnings.push(`ZERO_VOLUME_PERIODS: ${zeroVolumeCount} candles (${zeroVolumePct}%) have 0 volume (illiquid bars).`);
  }

  // 5. Open Interest (OI) Validity Audit
  let negativeOiCount = 0;
  let zeroOiCount = 0;
  for (const c of candles) {
    if (c.open_interest < 0) negativeOiCount++;
    if (c.open_interest === 0) zeroOiCount++;
  }
  if (negativeOiCount > 0) {
    issues.push(`NEGATIVE_OI: Found ${negativeOiCount} candles with negative open interest.`);
  }
  if (zeroOiCount === totalCandles) {
    warnings.push(`ZERO_OI: All candles have 0 open interest. OI analysis will be unavailable.`);
  }

  // 6. Timezone and IST Session Boundaries (+05:30, 09:15 - 15:30)
  let preMarketCount = 0;
  let postMarketSettlementCount = 0;
  let outOfSessionCount = 0;
  let nonIstCount = 0;

  for (const c of candles) {
    if (!c.timestamp.includes("+05:30")) {
      nonIstCount++;
    }
    // Extract local time HH:MM
    const timeMatch = c.timestamp.match(/T(\d{2}):(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2], 10);
      const minuteOfDay = hh * 60 + mm;
      // 09:15 = 555, 15:30 = 930
      if (minuteOfDay < 555) {
        preMarketCount++;
        outOfSessionCount++;
      } else if (minuteOfDay > 930) {
        postMarketSettlementCount++;
        outOfSessionCount++;
      }
    }
  }

  if (nonIstCount > 0) {
    warnings.push(`TIMEZONE_OFFSET: ${nonIstCount} candles do not explicitly declare +05:30 IST offset.`);
  }
  if (postMarketSettlementCount > 0) {
    warnings.push(`POST_MARKET_SETTLEMENT_CANDLES: Found ${postMarketSettlementCount} post-market candles (15:30 - 16:00 IST).`);
  }
  if (preMarketCount > 0) {
    warnings.push(`PRE_MARKET_CANDLES: Found ${preMarketCount} pre-market candles before 09:15 IST.`);
  }

  // 7. Missing Intervals (Intraday gap audit within single trading sessions - DO NOT SILENTLY REPAIR)
  let missingIntervalGaps = 0;
  for (let i = 1; i < totalCandles; i++) {
    const diffMs = candles[i].epoch_ms - candles[i - 1].epoch_ms;
    // Same day check
    const dateA = candles[i - 1].timestamp.slice(0, 10);
    const dateB = candles[i].timestamp.slice(0, 10);
    if (dateA === dateB && diffMs > 60000) {
      const missedMinutes = Math.floor(diffMs / 60000) - 1;
      missingIntervalGaps += missedMinutes;
    }
  }
  if (missingIntervalGaps > 0) {
    warnings.push(`MISSING_INTERVALS: Found ${missingIntervalGaps} missing 1-minute candle intervals across trading days. Preserved raw without silent interpolation.`);
  }

  // 8. Contract Metadata Completeness
  let metadataDeficits = 0;
  if (!contract_metadata?.symbol) { issues.push("MISSING_METADATA: Contract symbol is required"); metadataDeficits++; }
  if (contract_metadata?.strike == null && contract_metadata?.strike_price == null) { warnings.push("METADATA: Strike price not defined"); }
  if (!contract_metadata?.expiry_date && !contract_metadata?.expiry) { issues.push("MISSING_METADATA: Expiry date is required"); metadataDeficits++; }

  // 9. Expiry Consistency Audit (No candles after expiry timestamp)
  let postExpiryCandles = 0;
  if (contract_metadata?.expiry_timestamp) {
    const expiryCutoff = contract_metadata.expiry_timestamp + 16 * 60 * 60 * 1000; // End of expiry day
    for (const c of candles) {
      if (c.epoch_ms > expiryCutoff) {
        postExpiryCandles++;
      }
    }
    if (postExpiryCandles > 0) {
      issues.push(`POST_EXPIRY_DATA: ${postExpiryCandles} candles exist after contract expiry timestamp.`);
    }
  }

  // 10. Synthesize Dataset Status
  let status = AUDIT_STATUS.VALID;
  if (orderingViolations > 0 || duplicateCount > 0 || ohlcViolations > 0 || negativeOiCount > 0 || metadataDeficits > 0 || hashMismatch) {
    status = AUDIT_STATUS.INVALID;
  } else if (missingIntervalGaps > 0 || zeroVolumeCount > 0 || outOfSessionCount > 0) {
    status = AUDIT_STATUS.PARTIAL;
  }

  return {
    status,
    passed: status === AUDIT_STATUS.VALID || status === AUDIT_STATUS.PARTIAL,
    audit_version,
    audited_at: new Date().toISOString(),
    contract: contract_metadata?.symbol || "UNKNOWN",
    metrics: {
      total_candles: totalCandles,
      first_candle_time: candles[0]?.timestamp,
      last_candle_time: candles[totalCandles - 1]?.timestamp,
      ordering_violations: orderingViolations,
      duplicate_timestamps: duplicateCount,
      ohlc_geometry_violations: ohlcViolations,
      zero_volume_candles: zeroVolumeCount,
      zero_volume_percentage: `${zeroVolumePct}%`,
      negative_oi_candles: negativeOiCount,
      out_of_session_candles: outOfSessionCount,
      pre_market_candles: preMarketCount,
      post_market_settlement_candles: postMarketSettlementCount,
      missing_1min_intervals: missingIntervalGaps,
      post_expiry_candles: postExpiryCandles
    },
    critical_issues: issues,
    warnings
  };
}
