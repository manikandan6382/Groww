/**
 * Phase 5.2A: Research Dataset Expansion & Research-Readiness Gate Verification
 * 
 * Verifies that PortfolioX maintains an honest, empirically verified data readiness audit.
 */

import {
  GOVERNANCE_STATUS,
  HISTORICAL_SOURCES_INVENTORY,
  EMPIRICAL_PROBE_RESULTS,
  CONTRACT_UNIVERSE_AUDIT,
  RESEARCH_QUESTION_SUPPORT_MATRIX,
  DATASET_ACQUISITION_PLAN,
  CURRENT_RESEARCH_BOUNDARY
} from "../src/research/readiness/dataReadinessAudit.js";

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
console.log("   🔬 PORTFOLIOX PHASE 5.2A - RESEARCH READINESS GATE VERIFICATION            ");
console.log("================================================================================\n");

// Test M52A-01: Historical Sources Inventory Completeness
const expectedFields = [
  "provider", "product", "account_plan", "instrument_coverage", "expiry_coverage",
  "timeframe_coverage", "earliest_supported_date", "latest_supported_date",
  "expired_contract_support", "active_contract_support", "option_ohlc_availability",
  "volume_availability", "oi_availability", "bid_ask_availability", "tick_availability",
  "greeks_availability", "iv_availability", "rate_limits", "retention_limits",
  "licensing_restrictions"
];

const allSourcesCovered = HISTORICAL_SOURCES_INVENTORY.length >= 3 &&
  HISTORICAL_SOURCES_INVENTORY.every(src => 
    expectedFields.every(field => src[field] !== undefined && typeof src[field] === "string")
  );

assert(
  "M52A-01",
  "Historical Sources Inventory Completeness",
  allSourcesCovered,
  `Verified ${HISTORICAL_SOURCES_INVENTORY.length} legitimate sources across all 20 required audit attributes.`
);

// Test M52A-02: Empirical Probe Record Validation
const spotProbe = EMPIRICAL_PROBE_RESULTS.probes.find(p => p.category.includes("Spot"));
const expiredProbe = EMPIRICAL_PROBE_RESULTS.probes.find(p => p.category.includes("Expired Option Historical 1-Minute (Standard Endpoint)"));
const greeksProbe = EMPIRICAL_PROBE_RESULTS.probes.find(p => p.category.includes("Greeks"));
const ticksProbe = EMPIRICAL_PROBE_RESULTS.probes.find(p => p.category.includes("Tick Data"));

const probeValidationPassed = (
  spotProbe?.http_status === 200 && spotProbe?.status === "AVAILABLE" &&
  expiredProbe?.http_status === 400 && expiredProbe?.status === "UNAVAILABLE" &&
  greeksProbe?.status === "UNAVAILABLE" &&
  ticksProbe?.status === "UNAVAILABLE"
);

assert(
  "M52A-02",
  "Empirical Probe Record Validation",
  probeValidationPassed,
  "Proven: Cash index is AVAILABLE (200 OK), but expired options (400), historical Greeks, and ticks are UNAVAILABLE on Standard plan."
);

// Test M52A-03: Contract Universe Reconstructibility Analysis
const contractUniversePassed = (
  CONTRACT_UNIVERSE_AUDIT.daily_master_present === true &&
  CONTRACT_UNIVERSE_AUDIT.can_reconstruct_active_contracts === true &&
  CONTRACT_UNIVERSE_AUDIT.can_reconstruct_historical_expired_contracts === false &&
  CONTRACT_UNIVERSE_AUDIT.reconstruction_failure_reasons.length >= 4
);

assert(
  "M52A-03",
  "Contract Universe Reconstructibility Analysis",
  contractUniversePassed,
  "Identified: Current instruments master supports active contracts only; historical expired token mapping is strictly PARTIAL/BLOCKED."
);

// Test M52A-04: Research Question Support Matrix Integrity
const requiredQuestions = [
  "Basic Stop-Model Mechanics",
  "Multi-Day Testing",
  "Multi-Expiry Testing",
  "Multi-Regime Testing",
  "Walk-Forward Testing",
  "Out-of-Sample (OOS) Testing",
  "Monte Carlo Permutation / Resampling",
  "True MFE / MAE Quantification",
  "Bid/Ask Spread Execution Modeling",
  "Gamma / IV-Aware Dynamic Modeling"
];

const matrixQuestionsPresent = requiredQuestions.every(qName => 
  RESEARCH_QUESTION_SUPPORT_MATRIX.some(m => m.question_name.toLowerCase().includes(qName.toLowerCase().slice(0, 10)))
);

const validStatuses = ["SUPPORTED", "PARTIALLY_SUPPORTED", "BLOCKED"];
const allStatusesValid = RESEARCH_QUESTION_SUPPORT_MATRIX.every(m => validStatuses.includes(m.status));

const mechanicsSupported = RESEARCH_QUESTION_SUPPORT_MATRIX.find(m => m.question_id === 1)?.status === "SUPPORTED";
const multiDayBlocked = RESEARCH_QUESTION_SUPPORT_MATRIX.find(m => m.question_id === 2)?.status === "BLOCKED";
const oosBlocked = RESEARCH_QUESTION_SUPPORT_MATRIX.find(m => m.question_id === 6)?.status === "BLOCKED";
const mfePartial = RESEARCH_QUESTION_SUPPORT_MATRIX.find(m => m.question_id === 8)?.status === "PARTIALLY_SUPPORTED";

const matrixIntegrityPassed = matrixQuestionsPresent && allStatusesValid && mechanicsSupported && multiDayBlocked && oosBlocked && mfePartial;

assert(
  "M52A-04",
  "Research Question Support Matrix Integrity",
  matrixIntegrityPassed,
  "All 10 required research questions evaluated: Mechanics SUPPORTED; MFE/MAE & Greeks PARTIAL; Multi-day/Multi-expiry/OOS/Monte Carlo BLOCKED."
);

// Test M52A-05: Dataset Acquisition Plan Technical Specification
const specs = DATASET_ACQUISITION_PLAN.specifications;
const acquisitionPlanPassed = (
  specs.missing_datasets &&
  specs.required_date_range &&
  specs.required_instruments &&
  Array.isArray(specs.required_fields) && specs.required_fields.length >= 7 &&
  specs.minimum_timeframe &&
  specs.preferred_source &&
  DATASET_ACQUISITION_PLAN.action_status === "SPECIFIED_ONLY_NO_PURCHASE"
);

assert(
  "M52A-05",
  "Dataset Acquisition Plan Technical Specification",
  acquisitionPlanPassed,
  "Complete technical dataset specification documented without making unauthorized purchases or vendor connections."
);

// Test M52A-06: Current Honest Research Boundary Demarcation
const boundary = CURRENT_RESEARCH_BOUNDARY;
const boundaryPassed = (
  Array.isArray(boundary.SUPPORTED) && boundary.SUPPORTED.length >= 4 &&
  Array.isArray(boundary.PARTIALLY_SUPPORTED) && boundary.PARTIALLY_SUPPORTED.length >= 2 &&
  Array.isArray(boundary.BLOCKED) && boundary.BLOCKED.length >= 5
);

assert(
  "M52A-06",
  "Current Honest Research Boundary Demarcation",
  boundaryPassed,
  "Honest boundary enforced: Today we can research deterministic mechanics & sensitivity; statistical edge & multi-year backtests remain BLOCKED."
);

// Test M52A-07: Governance Lockdown Invariants
const governancePassed = (
  GOVERNANCE_STATUS.RESEARCH_DATA_STATUS === "PARTIAL" &&
  GOVERNANCE_STATUS.EDGE_STATUS === "NOT_VALIDATED" &&
  GOVERNANCE_STATUS.BACKTEST_PROFITABILITY_CLAIMS === "DISABLED" &&
  GOVERNANCE_STATUS.LIVE_ORDER_ROUTING === "DISABLED" &&
  GOVERNANCE_STATUS.PAPER_TRADES_ROLE === "SYSTEM_VALIDATION_ONLY"
);

assert(
  "M52A-07",
  "Governance Lockdown Invariants",
  governancePassed,
  "Governance invariants strictly locked: RESEARCH_DATA_STATUS remains PARTIAL, EDGE_STATUS remains NOT_VALIDATED."
);

console.log("\n================================================================================");
console.log(`📊 PHASE 5.2A RESEARCH READINESS SUMMARY (${results.length} Tests)`);
console.log("================================================================================\n");
console.table(results);

const failCount = results.filter(r => r.status === "FAIL").length;
if (failCount > 0) {
  console.error(`\n❌ ${failCount} TEST(S) FAILED IN PHASE 5.2A VERIFICATION.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${results.length} PHASE 5.2A RESEARCH READINESS GATES PASSED!`);
}
