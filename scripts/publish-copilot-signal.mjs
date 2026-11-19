#!/usr/bin/env node
/**
 * CLI utility to publish a verified Copilot trade signal to the Order Desk Beacon.
 * Usage:
 *   node scripts/publish-copilot-signal.mjs --underlying NIFTY --type CALL --strike 23400 --entry 126.75 --sl 122.90 --target 134.45
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    underlying: "NIFTY",
    optionType: "CALL",
    strikePrice: 22450,
    entryPrice: 95.00,
    stopLoss: 91.15,
    targetPrice: 102.70,
    lots: 1,
    reason: "Copilot Bullish Breakout Setup",
    ttlSeconds: 300
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--underlying" && args[i + 1]) params.underlying = args[++i].toUpperCase();
    else if (arg === "--type" && args[i + 1]) params.optionType = args[++i].toUpperCase();
    else if (arg === "--strike" && args[i + 1]) params.strikePrice = Number(args[++i]);
    else if (arg === "--entry" && args[i + 1]) params.entryPrice = Number(args[++i]);
    else if (arg === "--sl" && args[i + 1]) params.stopLoss = Number(args[++i]);
    else if (arg === "--target" && args[i + 1]) params.targetPrice = Number(args[++i]);
    else if (arg === "--lots" && args[i + 1]) params.lots = Number(args[++i]);
    else if (arg === "--reason" && args[i + 1]) params.reason = args[++i];
    else if (arg === "--ttl" && args[i + 1]) params.ttlSeconds = Number(args[++i]);
  }
  // Enforce Manikandan's Strict Net Risk Invariant: Gross Risk + Statutory Friction <= ₹300
  const lotSize = params.underlying === "BANKNIFTY" ? 30 : 65;
  const totalQty = lotSize * params.lots;
  const statutoryFriction = 58.10;
  const maxNetRiskAllowed = 280.00; // conservative buffer below ₹300 hard cap
  const maxGrossPoints = Number(((maxNetRiskAllowed - statutoryFriction) / totalQty).toFixed(2)); // ~2.9 - 3.0 pts

  const currentSlPoints = Math.abs(params.entryPrice - params.stopLoss);
  if (currentSlPoints > maxGrossPoints) {
    console.warn(`⚠️ [RMS INVARIANT TRIGGERED] SL distance of ${currentSlPoints} pts on ${totalQty} qty causes net loss > ₹300 with ₹58 charges.`);
    params.stopLoss = Number((params.entryPrice - maxGrossPoints).toFixed(2));
    params.targetPrice = Number((params.entryPrice + (maxGrossPoints * 2.0)).toFixed(2));
    console.log(`🔒 [Auto-Calibrated SL & Target] Clamped SL to ₹${params.stopLoss} (${maxGrossPoints} pts = ₹${(maxGrossPoints * totalQty).toFixed(2)} gross + ₹${statutoryFriction} charges = ₹${(maxGrossPoints * totalQty + statutoryFriction).toFixed(2)} net risk). Target calibrated to ₹${params.targetPrice}.`);
  }

  return params;
}

async function publish() {
  const payload = parseArgs();
  const url = "http://localhost:3003/api/copilot/signal";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      console.log(`\n✅ [Copilot Signal Published] ${data.signal.symbol} @ ₹${data.signal.entryPrice}`);
      console.log(`   SL: ₹${data.signal.stopLoss} | TP: ₹${data.signal.targetPrice} | TTL: ${data.signal.ttlSeconds}s`);
      console.log(`   Signal active in Order Desk Beacon on http://localhost:3003/practice\n`);
    } else {
      console.error("❌ Failed to publish signal:", data);
    }
  } catch (err) {
    console.error("❌ Network error connecting to localhost:3003:", err.message);
  }
}

publish();
