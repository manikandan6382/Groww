/**
 * Phase 5.3: Historical Research Dataset Acquisition & Validation Readiness Verification (Corrected)
 */

import {
  PHASE_53_GOVERNANCE,
  ACQUISITION_SOURCES_ASSESSMENT,
  ONE_MINUTE_BAR_CONVENTION,
  MINIMUM_VIABLE_DATASET_CHECKLIST,
  AcquisitionAcceptancePipeline,
  RESEARCH_ADEQUACY_EVALUATOR
} from "../src/research/acquisition/acquisitionReadinessPipeline.js";

const results = [];

function assert(id, name, condition, details) {
  if (condition) {
    results.push({ id, name, status: "PASS", details });
    console.log(`✅ [PASS] ${id}: ${name} -> ${details}`);
  } else {
    results.push({ id, name, status: "FAIL", details });
    console.error(`❌ [FAIL] ${id}: ${name} -> ${details}`);
  }
}

console.log("================================================================================");
console.log("   🔬 PORTFOLIOX PHASE 5.3 - REVISED ACQUISITION READINESS VERIFICATION      ");
console.log("================================================================================\n");

// Test M53-01: Upstox Developer Plus Unverified Status & Source Assessment Completeness
const upstoxPlus = ACQUISITION_SOURCES_ASSESSMENT.find(s => s.candidate_id === "SRC_UPSTOX_PLUS");
const upstoxStandard = ACQUISITION_SOURCES_ASSESSMENT.find(s => s.candidate_id === "SRC_UPSTOX_STANDARD");

const upstoxPlusRequiresVerification = (
  upstoxPlus?.meets_minimum_spec.includes("REQUIRES_EMPIRICAL_VERIFICATION") &&
  upstoxPlus?.option_ohlc_1m.includes("REQUIRES EMPIRICAL VERIFICATION") &&
  upstoxStandard?.meets_minimum_spec.includes("BLOCKED")
);

assert(
  "M53-01",
  "Upstox Developer Plus Unverified Qualification & Sources Completeness",
  upstoxPlusRequiresVerification,
  "Developer Plus strictly qualified as REQUIRES_EMPIRICAL_VERIFICATION (zero false claim of guaranteed compliance)."
);

// Test M53-02: Explicit Half-Open 1-Minute Bar Convention [t, t+1m)
const barConv = ONE_MINUTE_BAR_CONVENTION;
const conventionPassed = (
  barConv.interval_type === "LEFT_CLOSED_RIGHT_OPEN [t, t+1m)" &&
  barConv.first_bar_timestamp === "09:15:00+05:30" &&
  barConv.last_bar_timestamp === "15:29:00+05:30" &&
  barConv.session_endpoint.includes("15:30:00") &&
  barConv.total_regular_bars_per_session === 375 &&
  barConv.post_market_boundary.includes(">= 15:30:00")
);

assert(
  "M53-02",
  "Explicit 1-Minute Bar Half-Open Interval Convention",
  conventionPassed,
  "Proven: [09:15:00, 09:16:00) through [15:29:00, 15:30:00) yields exactly 375 bars with 15:30:00 as session endpoint."
);

// Test M53-03: Preservation of Frozen 5.2B Field Classifications (Spot is strictly Optional)
const checklist = MINIMUM_VIABLE_DATASET_CHECKLIST;
const fieldClassificationsPassed = (
  checklist.required_fields.length === 6 &&
  checklist.required_fields.includes("volume") &&
  checklist.required_fields.includes("timestamp_ist") &&
  !checklist.required_fields.includes("underlying_spot_close") && // Strictly NOT in required_fields
  checklist.optional_fields.includes("underlying_spot_close") &&  // Strictly OPTIONAL
  checklist.optional_fields.includes("open_interest")
);

assert(
  "M53-03",
  "Preservation of Frozen 5.2B Field Classifications (Spot Optional)",
  fieldClassificationsPassed,
  "Frozen 5.2B preserved: [timestamp, open, high, low, close, volume] strictly REQUIRED; spot_close & OI strictly OPTIONAL."
);

// Test M53-04: Empirical Missing-Bar Gap Auditing (Zero Arbitrary Thresholds)
const pipeline = new AcquisitionAcceptancePipeline();
const validContract = {
  underlying: "BANKNIFTY",
  exchange: "NSE",
  instrument_type: "OPTIDX",
  option_type: "CE",
  strike: 54200,
  expiry_date: "2026-09-24",
  trading_date: "2026-09-24",
  exchange_token: "50917",
  lot_size_as_of_date: 15,
  source: "TEST_AUDIT"
};

const gappedCandles = [
  { timestamp_ist: "2026-09-24T09:15:00+05:30", open: 100, high: 105, low: 95, close: 102, volume: 50 },
  { timestamp_ist: "2026-09-24T09:20:00+05:30", open: 101, high: 106, low: 99, close: 105, volume: 30 } // 4-minute gap!
];

const auditResult = pipeline.processAcquiredDataset({
  rawContract: validContract,
  rawCandles: gappedCandles,
  pointInTimeLotSizeTable: { "2026-09-24": 15 }
});

const anom = auditResult.manifest.anomalies;
const gapAuditingPassed = (
  auditResult.status === "PARTIAL" &&
  anom.missing_bar_count === 4 &&
  anom.longest_gap_minutes === 4 &&
  Array.isArray(anom.gap_segments) && anom.gap_segments.length === 1 &&
  anom.affected_sessions_count === 1 &&
  typeof anom.missing_bar_rate === "number"
);

assert(
  "M53-04",
  "Empirical Gap Structure Auditing Without Arbitrary Thresholds",
  gapAuditingPassed,
  "Missing bars audited empirically: count, rate, gap segments, and longest gap recorded without inventing arbitrary pass cutoffs."
);

// Test M53-05: 24-Month Target Adequacy Reclassification (Pending Empirical Audit)
const unverified24mEval = RESEARCH_ADEQUACY_EVALUATOR.evaluateAdequacy({
  totalMonthsCovered: 24,
  totalExpiriesCovered: 104,
  totalContractsCovered: 1200,
  independentTradeCount: 0, // Un-audited trades
  hasVolDistributionAudit: false,
  hasRegimeAudit: false,
  hasIntradayOI: false,
  hasTickData: false,
  qualityStatus: "VALID"
});

const audited24mEval = RESEARCH_ADEQUACY_EVALUATOR.evaluateAdequacy({
  totalMonthsCovered: 24,
  totalExpiriesCovered: 104,
  totalContractsCovered: 1200,
  independentTradeCount: 250, // Audited trades
  hasVolDistributionAudit: true,
  hasRegimeAudit: true,
  hasIntradayOI: false,
  hasTickData: false,
  qualityStatus: "VALID"
});

const adequacyReclassPassed = (
  unverified24mEval.overall_verdict === "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT" &&
  unverified24mEval.objectives.walk_forward_research === "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT" &&
  unverified24mEval.objectives.multi_regime_research === "CANDIDATE_TARGET_PENDING_EMPIRICAL_AUDIT" &&
  unverified24mEval.audit_prerequisites_missing.length >= 4 &&
  audited24mEval.overall_verdict === "EMPIRICALLY_AUDITED_ADEQUATE" &&
  audited24mEval.objectives.walk_forward_research === "SUPPORTED"
);

assert(
  "M53-05",
  "24-Month Scope Adequacy Reclassification",
  adequacyReclassPassed,
  "24 months strictly classified as candidate target pending empirical audit of trade counts, regimes, and gap distributions."
);

// Test M53-06: Strict Governance Invariants Affirmation
const gov = PHASE_53_GOVERNANCE;
const govPassed = (
  gov.DATA_PURCHASED === false &&
  gov.VENDOR_CONNECTED === false &&
  gov.BACKTEST_EXECUTED === false &&
  gov.OPTIMIZATION_EXECUTED === false &&
  gov.MONTE_CARLO_EXECUTED === false &&
  gov.EDGE_CLAIMED === false &&
  gov.RESEARCH_DATA_STATUS === "PARTIAL" &&
  gov.EDGE_STATUS === "NOT_VALIDATED"
);

assert(
  "M53-06",
  "Phase 5.3 Governance Lockdown Invariants",
  govPassed,
  "All negative governance assertions confirmed: ZERO purchases, ZERO vendor connections, ZERO backtests, ZERO edge claims."
);

console.log("\n================================================================================");
console.log(`📊 PHASE 5.3 REVISED ACQUISITION READINESS SUMMARY (${results.length} Tests)`);
console.log("================================================================================\n");
console.table(results);

const failCount = results.filter(r => r.status === "FAIL").length;
if (failCount > 0) {
  console.error(`\n❌ ${failCount} TEST(S) FAILED IN PHASE 5.3 VERIFICATION.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${results.length} PHASE 5.3 REVISED ACQUISITION READINESS GATES PASSED!`);
}
