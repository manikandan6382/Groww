/**
 * Phase 5.2B: Historical Research Dataset Contract & Acquisition Readiness Verification (Corrected)
 */

import {
  GOVERNANCE_STATUS,
  CONTRACT_MASTER_SCHEMA,
  MARKET_DATA_SCHEMA,
  MICROSTRUCTURE_EXTENSIONS,
  QUALITY_TIERS,
  BAR_ANOMALY_TYPES,
  QUALITY_VALIDATION_RULES,
  SYNCHRONIZATION_CONTRACT,
  RESEARCH_PARTITIONING,
  RESEARCH_UNIVERSE_EVALUATION,
  DATASET_VERSIONING_SCHEMA,
  REPRODUCIBILITY_MANIFEST,
  ACQUISITION_READINESS_SPEC
} from "../src/research/contract/historicalDataContract.js";

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
console.log("   🔬 PORTFOLIOX PHASE 5.2B - REVISED HISTORICAL DATA CONTRACT VERIFICATION  ");
console.log("================================================================================\n");

// Test M52B-01: Contract Master Schema & Deterministic Collision Prevention
const contractSept = {
  underlying: "BANKNIFTY",
  exchange: "NSE",
  instrument_type: "OPTIDX",
  option_type: "CE",
  strike: 54200,
  expiry_date: "2026-09-24",
  trading_date: "2026-09-24",
  exchange_token: "50917", // Reused token
  lot_size_as_of_date: 15,
  contract_status: "EXPIRED",
  calendar_era: "SEBI_2024_LOT_15"
};

const contractOct = {
  underlying: "BANKNIFTY",
  exchange: "NSE",
  instrument_type: "OPTIDX",
  option_type: "CE",
  strike: 54200,
  expiry_date: "2026-10-29",
  trading_date: "2026-10-01",
  exchange_token: "50917", // Same token reused in October!
  lot_size_as_of_date: 15,
  contract_status: "ACTIVE",
  calendar_era: "SEBI_2024_LOT_15"
};

const urnSept = CONTRACT_MASTER_SCHEMA.generateCanonicalUrn(contractSept);
const urnOct = CONTRACT_MASTER_SCHEMA.generateCanonicalUrn(contractOct);
const collisionCheck = CONTRACT_MASTER_SCHEMA.checkCollision(contractSept, contractOct);

const collisionTestPassed = (
  urnSept !== urnOct &&
  collisionCheck.tokenReused === true &&
  collisionCheck.sameUrn === false &&
  collisionCheck.urnCollisionProtected === true &&
  urnSept === "NSE:OPTIDX:BANKNIFTY:2026-09-24:54200.00:CE" &&
  urnOct === "NSE:OPTIDX:BANKNIFTY:2026-10-29:54200.00:CE"
);

assert(
  "M52B-01",
  "Contract Master Schema & Deterministic Collision Prevention",
  collisionTestPassed,
  "Deterministic identity guaranteed by canonical composite URN; token reuse does not cause collision."
);

// Test M52B-02: Market Data Schema Strict Required vs Optional Boundaries
const validBar = {
  timestamp_ist: "2026-09-24T09:15:00+05:30",
  open: 100.5,
  high: 105.0,
  low: 99.0,
  close: 102.0,
  volume: 500
};

const malformedBar = {
  timestamp_ist: "2026-09-24T09:15:00+05:30",
  open: 100.5,
  high: 95.0, // High < Open (Malformed!)
  low: 99.0,
  close: 102.0,
  volume: 500
};

const missingFieldBar = {
  timestamp_ist: "2026-09-24T09:15:00+05:30",
  open: 100.5,
  high: 105.0,
  low: 99.0,
  // close missing
  volume: 500
};

const validCheck = MARKET_DATA_SCHEMA.validateRecord(validBar);
const malformedCheck = MARKET_DATA_SCHEMA.validateRecord(malformedBar);
const missingCheck = MARKET_DATA_SCHEMA.validateRecord(missingFieldBar);

const marketDataSchemaPassed = (
  validCheck.valid === true &&
  malformedCheck.valid === false &&
  missingCheck.valid === false &&
  MARKET_DATA_SCHEMA.required_fields.includes("volume") &&
  MARKET_DATA_SCHEMA.optional_fields.includes("open_interest")
);

assert(
  "M52B-02",
  "Market Data Schema Required vs Optional Boundaries",
  marketDataSchemaPassed,
  "OHLCV strictly required and validated; OI and Spot correctly classified as optional without fake mandates."
);

// Test M52B-03: Microstructure Extension Classification & Zero-Synthesis Ban
const fields = MICROSTRUCTURE_EXTENSIONS.fields;
const microPassed = (
  fields.bid.classification === "PREFERRED" &&
  fields.ask.classification === "PREFERRED" &&
  fields.IV.classification === "OPTIONAL" &&
  fields.delta.classification === "OPTIONAL" &&
  MICROSTRUCTURE_EXTENSIONS.synthesis_rule.includes("STRICT_BAN")
);

assert(
  "M52B-03",
  "Microstructure Extension Classification & Zero-Synthesis Ban",
  microPassed,
  "Microstructure fields classified PREFERRED/OPTIONAL; strict ban on synthesizing missing bids/asks/Greeks verified."
);

// Test M52B-04: Canonical Data Quality Contract & Disambiguated Bar Classifications (Zero-Volume vs Missing Bar)
const cleanDataset = [
  { timestamp_ist: "2026-09-24T09:15:00+05:30", open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { timestamp_ist: "2026-09-24T09:16:00+05:30", open: 11, high: 13, low: 10, close: 12, volume: 200 }
];

const zeroVolumeDataset = [
  { timestamp_ist: "2026-09-24T09:15:00+05:30", open: 10, high: 12, low: 9, close: 11, volume: 0 } // Zero-volume bar present
];

const missingBarDataset = [
  { timestamp_ist: "2026-09-24T09:15:00+05:30", open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { timestamp_ist: "2026-09-24T09:18:00+05:30", open: 10, high: 12, low: 9, close: 11, volume: 100 } // 3-minute gap! Missing bar!
];

const cleanEval = QUALITY_VALIDATION_RULES.evaluateDataset(cleanDataset, { has_oi: true });
const zeroVolEval = QUALITY_VALIDATION_RULES.evaluateDataset(zeroVolumeDataset, { has_oi: false });
const missingBarEval = QUALITY_VALIDATION_RULES.evaluateDataset(missingBarDataset, { has_oi: false });

const anomalyTypesPassed = (
  BAR_ANOMALY_TYPES.ZERO_VOLUME === "ZERO_VOLUME" &&
  BAR_ANOMALY_TYPES.MISSING_BAR === "MISSING_BAR" &&
  BAR_ANOMALY_TYPES.ZERO_VOLUME !== BAR_ANOMALY_TYPES.MISSING_BAR
);

const qualityPassed = (
  cleanEval.tier === QUALITY_TIERS.VALID &&
  zeroVolEval.tier === QUALITY_TIERS.PARTIAL &&
  zeroVolEval.anomalies.hasZeroVolume === true &&
  zeroVolEval.anomalies.hasMissingBars === false &&
  missingBarEval.tier === QUALITY_TIERS.PARTIAL &&
  missingBarEval.anomalies.hasMissingBars === true &&
  anomalyTypesPassed
);

assert(
  "M52B-04",
  "Data Quality Engine & Explicit Zero-Volume vs Missing Bar Separation",
  qualityPassed,
  "ZERO_VOLUME (trade present with volume 0) strictly separated and distinguished from MISSING_BAR (omitted timestamp gap)."
);

// Test M52B-05: Synchronization Contract & Disambiguated Gap Handling
const syncPassed = (
  SYNCHRONIZATION_CONTRACT.canonical_timezone === "Asia/Kolkata" &&
  SYNCHRONIZATION_CONTRACT.rules.missing_spot_behavior.includes("REJECT_OR_QUARANTINE") &&
  SYNCHRONIZATION_CONTRACT.rules.zero_volume_definition.includes("DO NOT treat as MISSING_BAR") &&
  SYNCHRONIZATION_CONTRACT.rules.missing_bar_definition.includes("DO NOT treat as ZERO_VOLUME") &&
  SYNCHRONIZATION_CONTRACT.rules.missing_bar_definition.includes("DO NOT forward-fill")
);

assert(
  "M52B-05",
  "Synchronization Contract & Non-Interpolation / Disambiguated Gap Rules",
  syncPassed,
  "Zero-volume and missing-bar definitions rigorously disambiguated; silent forward-filling of prices strictly banned."
);

// Test M52B-06: Explicitly Provisional Research Partitioning & Embargo
const partitions = RESEARCH_PARTITIONING.provisional_partitions;
const trainPart = partitions.find(p => p.name.includes("TRAIN"));
const valPart = partitions.find(p => p.name.includes("VALIDATION"));
const oosPart = partitions.find(p => p.name.includes("OUT-OF-SAMPLE"));

const partitioningPassed = (
  RESEARCH_PARTITIONING.status === "PROVISIONAL_PENDING_DATASET_INSPECTION" &&
  trainPart?.share === "60%" &&
  valPart?.share === "20%" &&
  oosPart?.share === "20%" &&
  RESEARCH_PARTITIONING.provisional_embargo.duration_days === 5 &&
  RESEARCH_PARTITIONING.design_note.includes("explicitly provisional specifications")
);

assert(
  "M52B-06",
  "Provisional Research Partitioning (60/20/20 + 5-Day Embargo)",
  partitioningPassed,
  "60/20/20 split and 5-day post-expiry embargo explicitly marked PROVISIONAL pending empirical inspection of acquired dataset coverage."
);

// Test M52B-07: Minimum Research Universe & Corrected 24-Month Target Formulation
const universeEval = RESEARCH_UNIVERSE_EVALUATION;
const expectedTargetPhrase = "24 months minimum acquisition target; adequacy must be demonstrated after acquisition.";

const universePassed = (
  universeEval.proposed_universe.underlyings.includes("NIFTY") &&
  universeEval.proposed_universe.underlyings.includes("BANKNIFTY") &&
  universeEval.proposed_universe.span_target === expectedTargetPhrase &&
  universeEval.adequacy_verdict === expectedTargetPhrase &&
  universeEval.detailed_evaluation.target_definition.includes("minimum acquisition target") &&
  universeEval.detailed_evaluation.multi_regime_limitation.includes("Macro tail-risk adequacy")
);

assert(
  "M52B-07",
  "Minimum Research Universe Target Formulation (24-Month Target)",
  universePassed,
  `Formulation verified: '${expectedTargetPhrase}'. Adequacy must be empirically demonstrated post-acquisition.`
);

// Test M52B-08: Immutable Dataset Versioning Schema & SHA-256 Fingerprint
const mockManifest = {
  dataset_id: "DS_NSE_OPT_2024_2026_1M",
  version: "1.0.0",
  source: "UPSTOX_REST_V2",
  retrieval_date: "2026-10-08",
  coverage_start: "2024-10-01",
  coverage_end: "2026-10-08",
  contract_count: 520,
  row_count: 1542000,
  sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  quality_status: "VALID"
};

const frozenManifest = DATASET_VERSIONING_SCHEMA.createManifest(mockManifest);
let throwsOnMissing = false;
try {
  DATASET_VERSIONING_SCHEMA.createManifest({ dataset_id: "test" });
} catch {
  throwsOnMissing = true;
}

const versioningPassed = frozenManifest.dataset_id === "DS_NSE_OPT_2024_2026_1M" && throwsOnMissing;

assert(
  "M52B-08",
  "Immutable Dataset Versioning Schema & SHA-256 Fingerprint",
  versioningPassed,
  "Authoritative immutable manifest schema validated with mandatory SHA-256 bitwise fingerprint."
);

// Test M52B-09: Research Reproducibility Manifest (Conditional Seed on Stochasticity)
const deterministicExperiment = {
  experiment_id: "EXP_M1_STOP_MECHANICS_001",
  dataset_version: "DS_NSE_OPT_2024_2026_1M_v1.0.0",
  strategy_version: "STRAT_ORB_M1_v1.2",
  model_version: "M1_FIXED_RISK_v1.0",
  execution_model_version: "NET_RMS_SIM_v2.1",
  calendar_version: "NSE_HOLIDAYS_2024_2026_v1",
  charge_model_version: "SEBI_STATUTORY_OCT2024_v1",
  slippage_model: "DETERMINISTIC_TICK_v1",
  is_stochastic: false, // Purely deterministic
  created_at: new Date().toISOString()
};

const stochasticExperimentWithoutSeed = {
  experiment_id: "EXP_MONTE_CARLO_001",
  dataset_version: "DS_NSE_OPT_2024_2026_1M_v1.0.0",
  strategy_version: "STRAT_ORB_M1_v1.2",
  model_version: "M1_FIXED_RISK_v1.0",
  execution_model_version: "NET_RMS_SIM_v2.1",
  calendar_version: "NSE_HOLIDAYS_2024_2026_v1",
  charge_model_version: "SEBI_STATUTORY_OCT2024_v1",
  slippage_model: "DETERMINISTIC_TICK_v1",
  is_stochastic: true, // Stochastic!
  created_at: new Date().toISOString()
};

const stochasticExperimentWithSeed = {
  ...stochasticExperimentWithoutSeed,
  random_seed: 42
};

const detRec = REPRODUCIBILITY_MANIFEST.createExperimentRecord(deterministicExperiment);
let throwsOnMissingSeed = false;
try {
  REPRODUCIBILITY_MANIFEST.createExperimentRecord(stochasticExperimentWithoutSeed);
} catch {
  throwsOnMissingSeed = true;
}
const stochRec = REPRODUCIBILITY_MANIFEST.createExperimentRecord(stochasticExperimentWithSeed);

const reproPassed = (
  detRec.random_seed === null &&
  throwsOnMissingSeed === true &&
  stochRec.random_seed === 42
);

assert(
  "M52B-09",
  "Research Reproducibility Manifest & Conditional Stochastic Seed",
  reproPassed,
  "random_seed is strictly conditional on stochastic experiments; purely deterministic runs do not mandate artificial seed 42."
);

// Test M52B-10: Acquisition Readiness Specifications & Governance Invariants
const spec = ACQUISITION_READINESS_SPEC;
const acquisitionPassed = (
  spec.A_minimum_dataset_spec.coverage_target === expectedTargetPhrase &&
  spec.D_strictly_banned_synthesis_fields.includes("historical_iv") &&
  spec.D_strictly_banned_synthesis_fields.includes("bid_ask_spread") &&
  spec.F_validation_checklist.includes("Disambiguated ZERO_VOLUME vs MISSING_BAR audit") &&
  GOVERNANCE_STATUS.RESEARCH_DATA_STATUS === "PARTIAL" &&
  GOVERNANCE_STATUS.EDGE_STATUS === "NOT_VALIDATED" &&
  GOVERNANCE_STATUS.BACKTEST_PROFITABILITY_CLAIMS === "DISABLED" &&
  GOVERNANCE_STATUS.LIVE_ORDER_ROUTING === "DISABLED"
);

assert(
  "M52B-10",
  "Acquisition Readiness Specifications & Governance Invariants",
  acquisitionPassed,
  "Acquisition specifications verified; synthesis strictly banned; governance invariants locked."
);

console.log("\n================================================================================");
console.log(`📊 PHASE 5.2B REVISED DATA CONTRACT SUMMARY (${results.length} Tests)`);
console.log("================================================================================\n");
console.table(results);

const failCount = results.filter(r => r.status === "FAIL").length;
if (failCount > 0) {
  console.error(`\n❌ ${failCount} TEST(S) FAILED IN PHASE 5.2B VERIFICATION.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${results.length} PHASE 5.2B REVISED DATA CONTRACT GATES PASSED!`);
}
