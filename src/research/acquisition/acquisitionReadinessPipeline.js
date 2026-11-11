/**
 * PORTFOLIOX - Historical Research Dataset Acquisition & Validation Readiness Pipeline
 * Phase 5.3: Acquisition-Source Assessment & Quarantine Pipeline (Corrected)
 *
 * GOVERNANCE:
 * - Frozen Phase 5.2B Contract Enforced
 * - Zero Data Purchased
 * - Zero Vendors Connected
 * - Zero Backtests / Optimizations / Monte Carlo Executed
 * - Zero Silent Forward-Filling or Synthetic Backfilling
 */

import crypto from "node:crypto";
import {
  GOVERNANCE_STATUS,
  CONTRACT_MASTER_SCHEMA,
  MARKET_DATA_SCHEMA,
  QUALITY_TIERS,
  BAR_ANOMALY_TYPES,
  QUALITY_VALIDATION_RULES,
  SYNCHRONIZATION_CONTRACT,
  RESEARCH_PARTITIONING,
  DATASET_VERSIONING_SCHEMA
} from "../contract/historicalDataContract.js";

export const PHASE_53_GOVERNANCE = Object.freeze({
  ...GOVERNANCE_STATUS,
  DATA_PURCHASED: false,
  VENDOR_CONNECTED: false,
  BACKTEST_EXECUTED: false,
  OPTIMIZATION_EXECUTED: false,
  MONTE_CARLO_EXECUTED: false,
  EDGE_CLAIMED: false
});

/**
 * 5.3A — Acquisition Source Assessment Matrix
 */
export const ACQUISITION_SOURCES_ASSESSMENT = [
  {
    candidate_id: "SRC_UPSTOX_STANDARD",
    name: "Upstox V2/V3 REST API (Current Standard Account: 5XCCT5)",
    category: "Interactive Broker API (Free Tier)",
    option_ohlc_1m: "PARTIAL (Active contracts only; expired contracts blocked)",
    intraday_1m: "SUPPORTED (Active contracts)",
    nifty_banknifty_coverage: "SUPPORTED",
    calls_puts: "SUPPORTED",
    atm_pm5_feasibility: "SUPPORTED for active week; BLOCKED for past weeks",
    weekly_monthly_expiries: "PARTIAL (Current cycle only)",
    historical_volume: "SUPPORTED",
    historical_oi: "BLOCKED (Historical 1m candles lack OI)",
    historical_spot: "SUPPORTED (Continuous 1m index spot)",
    historical_bid_ask: "BLOCKED",
    historical_ticks: "BLOCKED",
    historical_greeks: "BLOCKED",
    contract_identity: "PARTIAL (Current token master only)",
    lot_size_info: "PARTIAL (Current master only; lacks point-in-time table)",
    retention_period: "Active contract duration; pruned immediately at expiry",
    export_api_availability: "SUPPORTED (REST API)",
    licensing_considerations: "Personal trading API; rate-limited (30 req/s)",
    meets_minimum_spec: "BLOCKED (Cannot provide expired option contracts)"
  },
  {
    candidate_id: "SRC_UPSTOX_PLUS",
    name: "Upstox Developer Plus Plan (Paid Add-On)",
    category: "Interactive Broker API (Developer Add-On)",
    option_ohlc_1m: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION (Documentation references expired endpoints, but raw format, completeness, and field presence are unverified)",
    intraday_1m: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    nifty_banknifty_coverage: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    calls_puts: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    atm_pm5_feasibility: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    weekly_monthly_expiries: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    historical_volume: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    historical_oi: "UNKNOWN (EOD OI exists; intraday 1m OI unverified)",
    historical_spot: "SUPPORTED (Continuous 1m index spot available)",
    historical_bid_ask: "BLOCKED",
    historical_ticks: "BLOCKED",
    historical_greeks: "BLOCKED (Snapshot only, zero historical timeseries)",
    contract_identity: "UNKNOWN / REQUIRES EMPIRICAL VERIFICATION",
    lot_size_info: "UNKNOWN (Historical point-in-time lot sizes unverified)",
    retention_period: "Unverified claim (~2023-2024 to present)",
    export_api_availability: "SUPPORTED (REST API)",
    licensing_considerations: "Subscription fee (~₹500-1000/mo); personal developer license",
    meets_minimum_spec: "REQUIRES_EMPIRICAL_VERIFICATION (Unconfirmed; no purchase or upgrade may occur until exact endpoint, date range, 1m intervals, and contract coverage are experimentally verified)"
  },
  {
    candidate_id: "SRC_NSE_OFFICIAL_SALES",
    name: "NSE India Official Historical Data Sales / Bhavcopy Archives",
    category: "Official Exchange Data Product",
    option_ohlc_1m: "SUPPORTED for paid 1-minute historical CD/download; Bhavcopy is 1-Day only",
    intraday_1m: "SUPPORTED (Paid official intraday package)",
    nifty_banknifty_coverage: "SUPPORTED",
    calls_puts: "SUPPORTED",
    atm_pm5_feasibility: "SUPPORTED",
    weekly_monthly_expiries: "SUPPORTED",
    historical_volume: "SUPPORTED",
    historical_oi: "SUPPORTED",
    historical_spot: "SUPPORTED",
    historical_bid_ask: "UNKNOWN (L1 snapshot in intraday packages; L2 book requires expensive order log package)",
    historical_ticks: "SUPPORTED in official Tick-by-Tick (TBT) product (multi-terabyte)",
    historical_greeks: "BLOCKED (Raw traded data only; Greeks not computed by exchange)",
    contract_identity: "SUPPORTED (Authoritative exchange contract master)",
    lot_size_info: "SUPPORTED (Authoritative point-in-time circulars)",
    retention_period: "Multi-year archives (2000-present)",
    export_api_availability: "BLOCKED for API; Delivered as bulk CSV/ZIP archives",
    licensing_considerations: "Commercial / Institutional pricing (tens of thousands of INR); strictly personal research license unless redistributed",
    meets_minimum_spec: "SUPPORTED (Authoritative ground truth; high acquisition cost & manual ingestion)"
  },
  {
    candidate_id: "SRC_TRUEDATA",
    name: "TrueData (SEBI-Registered Authorized Data Vendor)",
    category: "Authorized Commercial Market Data Vendor",
    option_ohlc_1m: "SUPPORTED (Continuous 1-minute historical options feed)",
    intraday_1m: "SUPPORTED",
    nifty_banknifty_coverage: "SUPPORTED",
    calls_puts: "SUPPORTED",
    atm_pm5_feasibility: "SUPPORTED",
    weekly_monthly_expiries: "SUPPORTED",
    historical_volume: "SUPPORTED",
    historical_oi: "SUPPORTED (Intraday 1-minute OI available in historical feeds)",
    historical_spot: "SUPPORTED",
    historical_bid_ask: "PARTIAL (Available in tick/L2 packages; standard historical is 1m OHLCV+OI)",
    historical_ticks: "SUPPORTED (In dedicated tick-level subscription)",
    historical_greeks: "UNKNOWN / BLOCKED (Vendor provides proprietary Greeks via live SDK; historical Greek surfaces unverified)",
    contract_identity: "SUPPORTED (Consistent internal contract symbology)",
    lot_size_info: "SUPPORTED",
    retention_period: "Multi-year (Options historical 1m typically available for 2-5 years)",
    export_api_availability: "SUPPORTED (WebSocket / REST API / Python SDK)",
    licensing_considerations: "Monthly/annual subscription fees (₹2,000-₹5,000+/mo); personal non-commercial license",
    meets_minimum_spec: "SUPPORTED (Fully capable of meeting Minimum Dataset Spec; requires paid subscription)"
  },
  {
    candidate_id: "SRC_GLOBALDATAFEEDS",
    name: "GlobalDataFeeds / NimbleData (SEBI-Registered Authorized Vendor)",
    category: "Authorized Commercial Market Data Vendor",
    option_ohlc_1m: "SUPPORTED (Historical 1m intraday derivatives)",
    intraday_1m: "SUPPORTED",
    nifty_banknifty_coverage: "SUPPORTED",
    calls_puts: "SUPPORTED",
    atm_pm5_feasibility: "SUPPORTED",
    weekly_monthly_expiries: "SUPPORTED",
    historical_volume: "SUPPORTED",
    historical_oi: "SUPPORTED",
    historical_spot: "SUPPORTED",
    historical_bid_ask: "PARTIAL (In higher tier products)",
    historical_ticks: "SUPPORTED (In tick packages)",
    historical_greeks: "BLOCKED (Historical options deliver OHLCV+OI)",
    contract_identity: "SUPPORTED",
    lot_size_info: "SUPPORTED",
    retention_period: "2-3 years historical options 1m",
    export_api_availability: "SUPPORTED (COM / .NET API / REST / WebSocket)",
    licensing_considerations: "Paid subscription (monthly/quarterly); personal use",
    meets_minimum_spec: "SUPPORTED (Capable of satisfying Minimum Spec; requires commercial subscription)"
  }
];

/**
 * 5.3B — Minimum Viable Acquisition Dataset Checklist & 1-Minute Bar Convention
 */
export const ONE_MINUTE_BAR_CONVENTION = Object.freeze({
  interval_type: "LEFT_CLOSED_RIGHT_OPEN [t, t+1m)",
  session_start_ist: "09:15:00",
  session_end_ist: "15:30:00",
  first_bar_interval: "[09:15:00, 09:16:00)",
  first_bar_timestamp: "09:15:00+05:30",
  last_bar_interval: "[15:29:00, 15:30:00)",
  last_bar_timestamp: "15:29:00+05:30",
  session_endpoint: "15:30:00+05:30 (Boundary endpoint of session)",
  total_regular_bars_per_session: 375,
  post_market_boundary: "Bars with timestamp >= 15:30:00+05:30 are post-market marks, not regular session bars"
});

export const MINIMUM_VIABLE_DATASET_CHECKLIST = Object.freeze({
  contract_spec: {
    underlyings: ["NIFTY", "BANKNIFTY"],
    instruments: ["Calls (CE)", "Puts (PE)"],
    strikes: "ATM ± 5 Strikes (Minimum 11 strikes per expiry)",
    expiries: "All weekly and monthly expirations within target window",
    timeframe: "1-minute continuous bars with [t, t+1m) interval convention (09:15:00 to 15:29:00 IST = exactly 375 bars)",
    target_coverage: "24 months minimum acquisition target (scope candidate; adequacy evaluated post-acquisition)"
  },
  // Preserving FROZEN Phase 5.2B field classifications strictly
  required_fields: [
    "timestamp_ist",
    "open",
    "high",
    "low",
    "close",
    "volume"
  ],
  optional_fields: [
    "open_interest",
    "underlying_spot_close"
  ],
  banned_synthesis_fields: [
    "bid",
    "ask",
    "spread",
    "historical_iv",
    "delta",
    "gamma",
    "vega"
  ],
  bar_anomaly_classifications: {
    ZERO_VOLUME: "Valid candle present with volume = 0 (Quiet market; NOT a missing bar)",
    MISSING_BAR: "Expected minute timestamp within [09:15:00, 15:30:00) absent from feed (Gap; quarantined, NOT forward-filled)",
    INVALID_BAR: "Malformed OHLC geometry or non-positive price (Quarantined immediately)",
    NON_EXECUTABLE_SETTLEMENT_MARK: "Bar timestamp >= 15:30:00 IST (Settlement mark only; excluded from fills)",
    UNALIGNED_SPOT: "Option candle timestamp lacks exact minute match in underlying spot series (Preserves optionality; flags PARTIAL)"
  }
});

/**
 * 5.3C — Canonical Acquisition Acceptance Pipeline (Zero Arbitrary Thresholds)
 */
export class AcquisitionAcceptancePipeline {
  constructor(config = {}) {
    this.config = config;
  }

  processAcquiredDataset({ rawContract, rawCandles, rawSpotSeries, pointInTimeLotSizeTable }) {
    if (!rawContract || !rawCandles || rawCandles.length === 0) {
      return {
        status: QUALITY_TIERS.UNAVAILABLE,
        reason: "No dataset provided for ingestion",
        quarantined: true
      };
    }

    // Step 1: Immutable Raw Hash Computation
    const rawBuffer = Buffer.from(JSON.stringify({ rawContract, rawCandles }), "utf-8");
    const sha256_hash = crypto.createHash("sha256").update(rawBuffer).digest("hex");

    // Step 2: Contract Identity Validation
    let canonical_urn;
    try {
      canonical_urn = CONTRACT_MASTER_SCHEMA.generateCanonicalUrn(rawContract);
    } catch (err) {
      return {
        status: QUALITY_TIERS.INVALID,
        reason: `Contract identity failure: ${err.message}`,
        quarantined: true,
        sha256_hash
      };
    }

    // Step 3: Point-in-Time Lot Size Verification
    const expectedLotSize = pointInTimeLotSizeTable?.[rawContract.trading_date] || pointInTimeLotSizeTable?.[rawContract.underlying];
    if (expectedLotSize && rawContract.lot_size_as_of_date !== expectedLotSize) {
      return {
        status: QUALITY_TIERS.INVALID,
        reason: `Point-in-time lot size mismatch: Expected ${expectedLotSize}, found ${rawContract.lot_size_as_of_date}`,
        quarantined: true,
        sha256_hash
      };
    }

    // Step 4: Timestamp & OHLC & Session & Comprehensive Gap Structure Audit
    let zeroVolumeCount = 0;
    let missingBarCount = 0;
    let postMarketCount = 0;
    let unalignedSpotCount = 0;
    let lastTs = -1;

    const gapSegments = [];
    let longestGapMinutes = 0;
    const affectedSessionsSet = new Set();

    const spotMap = new Map();
    if (Array.isArray(rawSpotSeries)) {
      for (const s of rawSpotSeries) {
        spotMap.set(s.timestamp_ist, s.close);
      }
    }

    const validatedBars = [];

    for (let i = 0; i < rawCandles.length; i++) {
      const c = rawCandles[i];
      const ts = new Date(c.timestamp_ist).getTime();
      const dateStr = c.timestamp_ist.split("T")[0];

      // Check monotonicity
      if (isNaN(ts) || ts <= lastTs) {
        return {
          status: QUALITY_TIERS.INVALID,
          reason: `Strict timestamp monotonicity violated at index ${i} (${c.timestamp_ist})`,
          quarantined: true,
          sha256_hash
        };
      }

      // Record detailed gap segments without arbitrary percentage cutoffs
      if (lastTs !== -1 && (ts - lastTs) > 60000) {
        const gapMinutes = Math.floor((ts - lastTs) / 60000) - 1;
        missingBarCount += gapMinutes;
        gapSegments.push({
          start_timestamp: new Date(lastTs).toISOString(),
          end_timestamp: new Date(ts).toISOString(),
          gap_minutes: gapMinutes
        });
        if (gapMinutes > longestGapMinutes) {
          longestGapMinutes = gapMinutes;
        }
        affectedSessionsSet.add(dateStr);
      }
      lastTs = ts;

      // Validate OHLC geometry
      const ohlcCheck = MARKET_DATA_SCHEMA.validateRecord(c);
      if (!ohlcCheck.valid) {
        return {
          status: QUALITY_TIERS.INVALID,
          reason: `Malformed OHLC at ${c.timestamp_ist}: ${ohlcCheck.reason}`,
          quarantined: true,
          sha256_hash
        };
      }

      // Check spot synchronization (Preserving optionality: flags unaligned without mutating schema)
      const spotPrice = spotMap.get(c.timestamp_ist);
      let isSpotAligned = true;
      if (rawSpotSeries && spotPrice === undefined) {
        unalignedSpotCount++;
        isSpotAligned = false;
      }

      // Classify bar type using half-open session convention [09:15, 15:30)
      const hours = new Date(c.timestamp_ist).getHours();
      const minutes = new Date(c.timestamp_ist).getMinutes();
      const isPostMarket = (hours > 15 || (hours === 15 && minutes >= 30));

      let barType = "TRADEABLE";
      if (isPostMarket) {
        postMarketCount++;
        barType = BAR_ANOMALY_TYPES.POST_MARKET;
      } else if (c.volume === 0) {
        zeroVolumeCount++;
        barType = BAR_ANOMALY_TYPES.ZERO_VOLUME;
      }

      validatedBars.push({
        ...c,
        bar_type: barType,
        underlying_spot_close: spotPrice ?? c.underlying_spot_close ?? null,
        is_spot_aligned: isSpotAligned
      });
    }

    // Step 5: Assign Quality Tier (Empirical reporting without arbitrary threshold)
    let quality_status = QUALITY_TIERS.VALID;
    const reasons = [];

    const missingBarRate = rawCandles.length > 0 ? (missingBarCount / (rawCandles.length + missingBarCount)) : 0;
    const zeroVolumeRate = rawCandles.length > 0 ? (zeroVolumeCount / rawCandles.length) : 0;

    if (missingBarCount > 0) {
      quality_status = QUALITY_TIERS.PARTIAL;
      reasons.push(`Detected ${missingBarCount} missing bar gaps (rate: ${(missingBarRate * 100).toFixed(2)}%, longest: ${longestGapMinutes}m across ${affectedSessionsSet.size} sessions)`);
    }
    if (zeroVolumeCount > 0) {
      quality_status = QUALITY_TIERS.PARTIAL;
      reasons.push(`Contains ${zeroVolumeCount} zero-volume bars (${(zeroVolumeRate * 100).toFixed(2)}%)`);
    }
    if (postMarketCount > 0) {
      quality_status = QUALITY_TIERS.PARTIAL;
      reasons.push(`Contains ${postMarketCount} post-market marks`);
    }
    if (unalignedSpotCount > 0) {
      quality_status = QUALITY_TIERS.PARTIAL;
      reasons.push(`Contains ${unalignedSpotCount} unaligned spot bars`);
    }

    // Step 6: Dataset Manifest Generation
    const manifest = {
      dataset_id: `DS_${rawContract.underlying}_${rawContract.expiry_date}_${rawContract.strike}_${rawContract.option_type}`,
      version: "1.0.0",
      canonical_urn,
      source: rawContract.source || "UNKNOWN_SOURCE",
      retrieval_date: new Date().toISOString().split("T")[0],
      coverage_start: rawCandles[0].timestamp_ist,
      coverage_end: rawCandles[rawCandles.length - 1].timestamp_ist,
      contract_count: 1,
      row_count: rawCandles.length,
      sha256_hash,
      quality_status,
      calendar_version: "NSE_SESSION_0915_1530_HALF_OPEN_v1",
      contract_master_version: "CANONICAL_URN_v1",
      lot_size_source_version: "SEBI_POINT_IN_TIME_TABLE_v1",
      acquisition_method: rawContract.acquisition_method || "READ_ONLY_ARCHIVE_INGESTION",
      anomalies: {
        zero_volume_bars: zeroVolumeCount,
        zero_volume_rate: zeroVolumeRate,
        missing_bar_count: missingBarCount,
        missing_bar_rate: missingBarRate,
        gap_segments: gapSegments,
        longest_gap_minutes: longestGapMinutes,
        affected_sessions_count: affectedSessionsSet.size,
        post_market_marks: postMarketCount,
        unaligned_spot_bars: unalignedSpotCount
      },
      quarantined: quality_status === QUALITY_TIERS.INVALID,
      notes: reasons.length > 0 ? reasons.join("; ") : "Zero quality defects"
    };

    return {
      status: quality_status,
      manifest,
      bars: validatedBars,
      quarantined: false
    };
  }
}

/**
 * 5.3F — Empirical Research Adequacy Decision Evaluator
 * 24 months represents a candidate acquisition target; statistical adequacy must be empirically audited post-acquisition.
 */
export const RESEARCH_ADEQUACY_EVALUATOR = Object.freeze({
  evaluateAdequacy({
    totalMonthsCovered,
    totalExpiriesCovered,
    totalContractsCovered,
    independentTradeCount,
    hasVolDistributionAudit,
    hasRegimeAudit,
    hasIntradayOI,
    hasTickData,
    qualityStatus
  }) {
    if (qualityStatus === QUALITY_TIERS.INVALID || qualityStatus === QUALITY_TIERS.UNAVAILABLE) {
      return {
        overall_verdict: "BLOCKED_DUE_TO_QUALITY_FAILURE",
        objectives: Object.fromEntries([
          "basic_execution_mechanics", "m1_m7_mechanics", "multi_day_research",
          "multi_expiry_research", "multi_regime_research", "walk_forward_research",
          "out_of_sample_research", "monte_carlo", "historical_mfe_mae", "microstructure_research"
        ].map(k => [k, "BLOCKED"]))
      };
    }

    // 24 months is an acquisition target. True statistical adequacy must be empirically evaluated post-acquisition.
    const isPostAcquisitionAudited = (
      totalMonthsCovered >= 24 &&
      independentTradeCount >= 100 &&
      hasVolDistributionAudit === true &&
      hasRegimeAudit === true
    );

    const objectives = {
      basic_execution_mechanics: totalContractsCovered >= 1 ? "SUPPORTED" : "BLOCKED",
      m1_m7_mechanics: totalContractsCovered >= 1 ? "SUPPORTED" : "BLOCKED",
      multi_day_research: totalMonthsCovered >= 1 ? "SUPPORTED" : "BLOCKED",
      multi_expiry_research: totalExpiriesCovered >= 4 ? "SUPPORTED" : "BLOCKED",
      multi_regime_research: isPostAcquisitionAudited ? "SUPPORTED" : "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT",
      walk_forward_research: isPostAcquisitionAudited ? "SUPPORTED" : "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT",
      out_of_sample_research: isPostAcquisitionAudited ? "SUPPORTED" : "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT",
      monte_carlo: isPostAcquisitionAudited ? "SUPPORTED" : "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT",
      historical_mfe_mae: hasTickData ? "SUPPORTED" : "PARTIAL", // Bounded by 1m high/low if tick absent
      microstructure_research: hasTickData ? "SUPPORTED" : "BLOCKED"
    };

    return {
      overall_verdict: isPostAcquisitionAudited
        ? "EMPIRICALLY_AUDITED_ADEQUATE"
        : "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT",
      audit_prerequisites_missing: isPostAcquisitionAudited ? [] : [
        "empirical trade sample size verification",
        "volatility regime distribution audit",
        "gap structure & zero-volume distribution audit",
        "out-of-sample partition isolation audit"
      ],
      objectives
    };
  }
});
