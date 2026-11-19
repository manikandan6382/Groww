/**
 * Upstox Data Availability Probe
 * Empirically tests the actual Upstox account/API for expired derivatives historical data coverage.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sessionFile = path.join(root, "data", "upstox-session.json");
if (!fs.existsSync(sessionFile)) {
  console.error("❌ Session file not found at:", sessionFile);
  process.exit(1);
}

const sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
const token = sessionData.access_token;

console.log("================================================================================");
console.log("   🔬 Upstox Empirical Data Availability & Historical Coverage Probe            ");
console.log("================================================================================\n");

// Parse JWT payload safely to extract claims
function parseJwt(tokenStr) {
  try {
    const base64Url = tokenStr.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, "base64")
        .toString("utf-8")
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const jwtPayload = parseJwt(token);
console.log("📋 Token Claims Inspection:");
console.log(`   - Subject (User ID): ${jwtPayload?.sub || "Unknown"}`);
console.log(`   - Is Plus Plan:     ${jwtPayload?.isPlusPlan !== undefined ? jwtPayload.isPlusPlan : "Unknown"}`);
console.log(`   - Is Multi Client:  ${jwtPayload?.isMultiClient !== undefined ? jwtPayload.isMultiClient : "Unknown"}`);
console.log(`   - Token Issued At:  ${jwtPayload?.iat ? new Date(jwtPayload.iat * 1000).toISOString() : "Unknown"}`);
console.log(`   - Token Expires At: ${jwtPayload?.exp ? new Date(jwtPayload.exp * 1000).toISOString() : "Unknown"}\n`);

const accountPlan = jwtPayload?.isPlusPlan ? "Upstox Plus" : "Standard (Non-Plus)";

const probeRecords = [];

async function callUpstox(endpoint, label) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.upstox.com${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    const status = res.status;
    let data = null;
    let rawText = "";
    try {
      data = await res.json();
    } catch {
      rawText = await res.text();
    }
    return { status, ok: res.ok, data, rawText };
  } catch (err) {
    return { status: 0, ok: false, data: null, error: err.message };
  }
}

async function runProbe() {
  // 1. Check Profile Endpoint
  console.log("1️⃣ Checking Profile API (/v2/user/profile)...");
  const profileRes = await callUpstox("/v2/user/profile", "Profile");
  console.log(`   Status: HTTP ${profileRes.status}`);
  if (profileRes.ok) {
    console.log(`   User: ${profileRes.data?.data?.user_name} (${profileRes.data?.data?.user_id})`);
    console.log(`   Exchanges: ${(profileRes.data?.data?.exchanges || []).join(", ")}`);
    console.log(`   Products: ${(profileRes.data?.data?.products || []).join(", ")}`);
  } else {
    console.log(`   Error:`, profileRes.data || profileRes.rawText || profileRes.error);
  }
  console.log("");

  // 2. Test Expired Instruments: Get Expiries API (/v2/expired-instruments/expiries)
  console.log("2️⃣ Testing Expired Instruments: Get Expiries API (/v2/expired-instruments/expiries)...");
  const expiriesRes = await callUpstox("/v2/expired-instruments/expiries?instrument_key=NSE_INDEX%7CNifty%2050", "Get Expiries");
  console.log(`   Endpoint: /v2/expired-instruments/expiries?instrument_key=NSE_INDEX|Nifty 50`);
  console.log(`   Status: HTTP ${expiriesRes.status}`);
  let availableExpiries = [];
  if (expiriesRes.ok && expiriesRes.data?.data) {
    availableExpiries = expiriesRes.data.data;
    console.log(`   ✅ Success! Found ${availableExpiries.length} available past expiries:`, availableExpiries.slice(0, 10));
  } else {
    console.log(`   Response Message:`, expiriesRes.data?.errors || expiriesRes.data?.message || expiriesRes.rawText || expiriesRes.error);
  }
  console.log("");

  // 3. Test Expired Contracts API (/v2/expired-instruments/option/contracts)
  console.log("3️⃣ Testing Expired Option Contracts API (/v2/expired-instruments/option/contracts)...");
  // Test with a sample expiry date from recent past
  const testExpiryDates = availableExpiries.length > 0 
    ? availableExpiries.slice(0, 5) 
    : ["2026-09-24", "2026-09-29", "2026-10-01", "2026-10-06", "2025-10-30"];

  let sampleExpiredContracts = [];
  for (const expDate of testExpiryDates) {
    const contractsRes = await callUpstox(`/v2/expired-instruments/option/contracts?instrument_key=NSE_INDEX%7CNifty%2050&expiry_date=${expDate}`, `Option Contracts ${expDate}`);
    console.log(`   Expiry ${expDate} -> Status: HTTP ${contractsRes.status}`);
    if (contractsRes.ok && contractsRes.data?.data) {
      console.log(`   ✅ Returned ${contractsRes.data.data.length} contracts for ${expDate}`);
      if (sampleExpiredContracts.length === 0) {
        sampleExpiredContracts = contractsRes.data.data;
      }
    } else {
      console.log(`   Response:`, contractsRes.data?.errors || contractsRes.data?.message || contractsRes.rawText || contractsRes.error);
    }
  }
  console.log("");

  // 4. Test Expired Historical Candle Data API (/v2/expired-instruments/historical-candle/{key}/{interval}/{to_date}/{from_date})
  console.log("4️⃣ Testing Expired Historical Candle API (/v2/expired-instruments/historical-candle)...");
  const candidateExpiredKeys = sampleExpiredContracts.length > 0 
    ? sampleExpiredContracts.slice(0, 3).map(c => ({ key: c.expired_instrument_key || c.instrument_key, exp: c.expiry, strike: c.strike_price, type: c.instrument_type }))
    : [
        { key: "NSE_FO|NIFTY26SEP24800CE", exp: "2026-09-24", from: "2026-09-20", to: "2026-09-24" },
        { key: "NSE_FO|NIFTY26OCT24800CE", exp: "2026-10-01", from: "2026-09-25", to: "2026-10-01" },
        { key: "NSE_FO|NIFTY25OCT24000CE", exp: "2025-10-30", from: "2025-10-20", to: "2025-10-30" }
      ];

  for (const c of candidateExpiredKeys) {
    const fromDate = c.from || "2026-09-20";
    const toDate = c.to || c.exp;
    const url = `/v2/expired-instruments/historical-candle/${encodeURIComponent(c.key)}/1minute/${toDate}/${fromDate}`;
    const candleRes = await callUpstox(url, `Expired Candle ${c.key}`);
    const candleCount = Array.isArray(candleRes.data?.data?.candles) ? candleRes.data.data.candles.length : 0;
    const firstTs = candleCount > 0 ? candleRes.data.data.candles[candleCount - 1][0] : null;
    const lastTs = candleCount > 0 ? candleRes.data.data.candles[0][0] : null;

    const record = {
      contract: c.key,
      expiry: c.exp,
      requested_from: fromDate,
      requested_to: toDate,
      interval: "1minute",
      http_status: candleRes.status,
      returned_candle_count: candleCount,
      first_timestamp: firstTs,
      last_timestamp: lastTs,
      response_or_error: candleRes.ok ? "SUCCESS" : JSON.stringify(candleRes.data?.errors || candleRes.data?.message || candleRes.rawText || candleRes.error),
      account_api_plan: accountPlan,
      endpoint_version: "v2 (Expired Instruments)"
    };
    probeRecords.push(record);
    console.log(`   Contract: ${c.key} -> HTTP ${candleRes.status} | Candles: ${candleCount} | Result: ${record.response_or_error}`);
  }
  console.log("");

  // 5. Test Standard Historical Candle API v2 / v3 on derivative instruments
  console.log("5️⃣ Testing Standard Historical Candle API (/v2/historical-candle/{key}/{interval}/{to_date}/{from_date})...");
  const standardTestKeys = [
    { key: "NSE_INDEX|Nifty 50", from: "2026-10-01", to: "2026-10-08", label: "Underlying Nifty 50" },
    { key: "NSE_FO|NIFTY26OCT24800CE", from: "2026-10-01", to: "2026-10-08", label: "Oct 2026 Option" },
    { key: "NSE_FO|NIFTY26SEP24800CE", from: "2026-09-15", to: "2026-09-24", label: "Sep 2026 Option" },
    { key: "NSE_FO|NIFTY25OCT24000CE", from: "2025-10-15", to: "2025-10-30", label: "Oct 2025 Option" }
  ];

  for (const s of standardTestKeys) {
    const url = `/v2/historical-candle/${encodeURIComponent(s.key)}/1minute/${s.to}/${s.from}`;
    const res = await callUpstox(url, `Standard Candle ${s.key}`);
    const candleCount = Array.isArray(res.data?.data?.candles) ? res.data.data.candles.length : 0;
    const firstTs = candleCount > 0 ? res.data.data.candles[candleCount - 1][0] : null;
    const lastTs = candleCount > 0 ? res.data.data.candles[0][0] : null;

    const record = {
      contract: s.key,
      expiry: s.label,
      requested_from: s.from,
      requested_to: s.to,
      interval: "1minute",
      http_status: res.status,
      returned_candle_count: candleCount,
      first_timestamp: firstTs,
      last_timestamp: lastTs,
      response_or_error: res.ok ? "SUCCESS" : JSON.stringify(res.data?.errors || res.data?.message || res.rawText || res.error),
      account_api_plan: accountPlan,
      endpoint_version: "v2 (Standard Historical)"
    };
    probeRecords.push(record);
    console.log(`   Contract: ${s.key} (${s.label}) -> HTTP ${res.status} | Candles: ${candleCount} | Result: ${record.response_or_error}`);
  }

  // Also test v3 historical candle API if available
  console.log("\n6️⃣ Testing Historical Candle API V3 (/v3/historical-candle)...");
  for (const s of standardTestKeys.slice(0, 2)) {
    const url = `/v3/historical-candle/${encodeURIComponent(s.key)}/1minute/${s.to}/${s.from}`;
    const res = await callUpstox(url, `V3 Candle ${s.key}`);
    const candleCount = Array.isArray(res.data?.data?.candles) ? res.data.data.candles.length : 0;
    const record = {
      contract: s.key,
      expiry: s.label,
      requested_from: s.from,
      requested_to: s.to,
      interval: "1minute",
      http_status: res.status,
      returned_candle_count: candleCount,
      first_timestamp: candleCount > 0 ? res.data.data.candles[candleCount - 1][0] : null,
      last_timestamp: candleCount > 0 ? res.data.data.candles[0][0] : null,
      response_or_error: res.ok ? "SUCCESS" : JSON.stringify(res.data?.errors || res.data?.message || res.rawText || res.error),
      account_api_plan: accountPlan,
      endpoint_version: "v3 (Historical Candle)"
    };
    probeRecords.push(record);
    console.log(`   V3 Contract: ${s.key} -> HTTP ${res.status} | Candles: ${candleCount}`);
  }

  // 7. Save Machine-Readable Probe Audit Report
  const reportPath = path.join(root, "data", "upstox-data-availability-report.json");
  const reportData = {
    generated_at: new Date().toISOString(),
    account: {
      user_id: jwtPayload?.sub,
      plan: accountPlan,
      is_plus_plan: Boolean(jwtPayload?.isPlusPlan)
    },
    expired_instruments_api_status: expiriesRes.ok ? "AVAILABLE" : "UNAVAILABLE_OR_RESTRICTED",
    total_probe_calls: probeRecords.length,
    probe_records: probeRecords
  };
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf-8");
  console.log(`\n📄 Saved authoritative data availability report to: ${reportPath}`);

  console.log("\n================================================================================");
  console.log("   📊 PROBE RESULTS SUMMARY TABLE                                              ");
  console.log("================================================================================");
  console.table(probeRecords);
}

runProbe().catch((err) => {
  console.error("Fatal probe error:", err);
  process.exit(1);
});
