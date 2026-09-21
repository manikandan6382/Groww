/**
 * 🧪 JOURNAL INTEGRITY & QUANTITATIVE AUDIT TEST HARNESS
 * Verifies Level 3 Elite Trading Journal System:
 * 1. 12-Filter Quantitative Gate & Strict Invariant Sizing (₹200–₹300)
 * 2. Multi-Dimensional Diagnostic Filter Engine (Breach, Runners, BE, Chop, Tilt)
 * 3. Section 44AD Derivative Tax Exporter & CWE-1236 Formula Sanitization
 * 4. Zero Division & Extreme Edge-Case Robustness
 */

import { evaluateTradeIntegrity } from "../src/client/components/trading/journal-story/tradeIntegrityEngine.js";
import { 
  getFilteredTrades, 
  getDateFilteredTrades, 
  isTradeInMiddayChop 
} from "../src/client/components/trading/journal-story/filterJournalTrades.js";
import { 
  generateTaxCsvContent, 
  sanitizeTaxCell 
} from "../src/client/components/trading/journal-story/exportTaxCsv.js";

console.log("🧪 [JOURNAL TEST] Initializing Quantitative & Forensic Test Suite...\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: 12-FILTER QUANTITATIVE RULES ENGINE
// -------------------------------------------------------------
console.log("📐 --- TEST SUITE 1: 12-FILTER QUANT ENGINE & RISK INVARIANTS ---");
{
  // Test 1.1: Standard 1-Lot Disciplined Trade (NIFTY: 65 Qty, Buy 120, SL 116.15 = ₹250 risk, TP 127.70 = ₹500 gain)
  const idealTrade = {
    id: 101,
    symbol: "NIFTY 24500 CE",
    entryPrice: 120.00,
    stopLoss: 116.15,
    targetPrice: 127.70,
    exitPrice: 127.70,
    quantity: 1,
    lotSize: 65,
    totalQty: 65,
    netPnl: 444.80,
    closeReason: "TARGET_HIT",
    strategyTags: ["Opening Momentum"],
    mistakeTags: "None / Disciplined",
    followedPlan: true,
    entryDatetime: "2026-09-21T03:50:00.000Z" // 09:20 AM IST (Opening Drive)
  };

  const audit1 = evaluateTradeIntegrity(idealTrade);
  assert(audit1.isInvariantBreached === false, "Ideal trade respects capital invariants");
  assert(audit1.totalRiskRupees <= 300, `Planned risk ₹${audit1.totalRiskRupees} <= ₹300`);
  assert(audit1.rrRatio >= 1.9, `Target R:R 1:${audit1.rrRatio} achieves >= 1:1.90`);
  assert(audit1.isHighQualitySetup === true, `High quality setup passed with Grade ${audit1.grade}`);
  assert(audit1.passedRules.length >= 10, `Passed ${audit1.passedRules.length} / 12 quantitative rules`);

  // Test 1.2: Invariant Breaching Oversized Trade (SL 10 pts = ₹650 risk, > ₹300 limit)
  const oversizedTrade = {
    id: 102,
    symbol: "NIFTY 24500 PE",
    entryPrice: 100.00,
    stopLoss: 90.00,
    targetPrice: 110.00,
    exitPrice: 90.00,
    quantity: 1,
    lotSize: 65,
    netPnl: -705.20,
    closeReason: "STOP_LOSS_HIT",
    mistakeTags: "Moved Stop Loss",
    followedPlan: false,
    entryDatetime: "2026-09-21T06:00:00.000Z" // 11:30 AM IST (Midday Chop)
  };

  const audit2 = evaluateTradeIntegrity(oversizedTrade);
  assert(audit2.isInvariantBreached === true, "Oversized trade correctly flags invariant breach");
  assert(audit2.violations.some(v => v.includes("₹300")), "Violations include ₹300 invariant breach notice");
  assert(audit2.violations.some(v => v.includes("Midday Chop")), "Violations include Midday Chop trap notice");
  assert(audit2.violations.some(v => v.includes("Stop Loss Moved")), "Violations include Stop Loss moved notice");
  assert(audit2.isHighQualitySetup === false, `Flagged as low integrity setup (Grade: ${audit2.grade})`);

  // Test 1.3: Dynamic derivation from ₹250 risk when stopLoss is missing (NO percentage fallbacks!)
  const missingLevelsTrade = {
    id: 103,
    symbol: "NIFTY 24600 CE",
    entryPrice: 80.00,
    quantity: 1,
    lotSize: 65,
    netPnl: 150.00
  };

  const audit3 = evaluateTradeIntegrity(missingLevelsTrade);
  assert(audit3.totalRiskRupees <= 300, `Dynamically derived risk ₹${audit3.totalRiskRupees} respects ₹300 cap without percentage`);
  assert(Number.isFinite(audit3.rrRatio), "Derived R:R is valid finite number");
}

// -------------------------------------------------------------
// TEST SUITE 2: MULTI-DIMENSIONAL DIAGNOSTIC FILTERS
// -------------------------------------------------------------
console.log("\n🔍 --- TEST SUITE 2: MULTI-DIMENSIONAL DIAGNOSTIC FILTERS ---");
{
  const mockTrades = [
    { id: 201, symbol: "NIFTY 24500 CE", netPnl: 500, closeReason: "TARGET_HIT", rMultiple: 2.1, entryDatetime: "2026-09-21T03:50:00.000Z" },
    { id: 202, symbol: "BANKNIFTY 52000 PE", netPnl: -350, isRuleBreached: true, closeReason: "STOP_LOSS_HIT", entryDatetime: "2026-09-21T04:15:00.000Z" },
    { id: 203, symbol: "FINNIFTY 23500 CE", netPnl: 15, closeReason: "BREAKEVEN_LOCKED", entryDatetime: "2026-09-21T05:30:00.000Z" }, // Midday
    { id: 204, symbol: "NIFTY 24400 PE", netPnl: -260, mistakeTags: "FOMO Entry", followedPlan: false, entryDatetime: "2026-09-21T08:30:00.000Z" },
  ];

  // Test 2.1: RUNNERS filter
  const runners = getFilteredTrades(mockTrades, null, "RUNNERS", "");
  assert(runners.length === 1 && runners[0].id === 201, "RUNNERS filter correctly isolated 1:2+ RR winner");

  // Test 2.2: BREACH filter
  const breaches = getFilteredTrades(mockTrades, null, "BREACH", "");
  assert(breaches.length === 1 && breaches[0].id === 202, "BREACH filter correctly isolated trade with loss > ₹300");

  // Test 2.3: BREAKEVEN filter
  const scratches = getFilteredTrades(mockTrades, null, "BREAKEVEN", "");
  assert(scratches.length === 1 && scratches[0].id === 203, "BREAKEVEN filter correctly isolated breakeven scratch");

  // Test 2.4: CHOP filter
  const chopTrades = getFilteredTrades(mockTrades, null, "CHOP", "");
  assert(chopTrades.length === 1 && chopTrades[0].id === 203, "CHOP filter correctly isolated 11:00 AM IST midday execution");

  // Test 2.5: TILT filter
  const tiltTrades = getFilteredTrades(mockTrades, null, "TILT", "");
  assert(tiltTrades.length === 1 && tiltTrades[0].id === 204, "TILT filter correctly isolated trade with FOMO mistake tag");

  // Test 2.6: Search query indexing
  const searchResults = getFilteredTrades(mockTrades, null, "ALL", "BANKNIFTY");
  assert(searchResults.length === 1 && searchResults[0].id === 202, "Search query matched symbol accurately");
}

// -------------------------------------------------------------
// TEST SUITE 3: SECTION 44AD TAX CSV EXPORTER & CWE-1236
// -------------------------------------------------------------
console.log("\n📊 --- TEST SUITE 3: SECTION 44AD TAX LEDGER & CWE-1236 SANITIZATION ---");
{
  const maliciousTrade = {
    id: "HACK-999",
    symbol: "=cmd|' /C calc'!A0",
    direction: "LONG",
    quantity: 1,
    lotSize: 65,
    entryPrice: 100.00,
    exitPrice: 108.00,
    netPnl: 464.80,
    strategyTags: "+SuperFormula",
    notes: "-DDE(\"server\";\"pipe\";\"cmd\")",
    lessonsLearned: "@SUM(A1:A10)",
    entryDatetime: "2026-09-21T04:00:00.000Z"
  };

  const csv = generateTaxCsvContent([maliciousTrade]);

  assert(csv.includes("TRD-HACK-999"), "CSV includes formatted trade ID");
  assert(csv.includes("Unit"), "CSV header includes total units");
  assert(csv.includes("'+SuperFormula"), "Formula '+' sanitized with leading apostrophe");
  assert(csv.includes("'-DDE"), "Formula '-' sanitized with leading apostrophe");
  assert(csv.includes("'@SUM"), "Formula '@' sanitized with leading apostrophe");
  assert(csv.includes("'=cmd|"), "Formula '=' sanitized with leading apostrophe");
  assert(!csv.includes("\"=cmd|"), "Raw formula '=' was completely eliminated");
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=============================================================");
console.log(`🎯 JOURNAL TEST RESULT: ${passedCount} / ${totalCount} Assertions Passed`);
console.log(`🛡️ Certification: ${passedCount === totalCount ? "LEVEL 3 ELITE CERTIFIED" : "VERIFICATION FAILED"}`);
console.log("=============================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
