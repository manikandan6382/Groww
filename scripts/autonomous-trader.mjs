import fs from 'fs';

const CONFIG = {
  upstoxSessionPath: 'data/upstox-session.json',
  rmsApiBase: 'http://127.0.0.1:5001',
  clientApiBase: 'http://localhost:3003',
  pollIntervalMs: 5000, // 5 seconds
  maxIterations: 360, // 30 minutes surveillance window per run
  lotSize: 65,
  statutoryCharges: 58.00,
  targetRiskRupees: 250.00,
  maxRiskCapRupees: 300.00,
  targetGainRupees: 500.00,
  
  // Triggers for 2026-10-05 afternoon session (12:15 PM - 1:30 PM)
  bullishSpotTrigger: 22460.00,
  bearishSpotTrigger: 22395.00,
  bankNiftyBullishThreshold: 54550.00,
  bankNiftyBearishThreshold: 54450.00,
  
  // Instruments (06-OCT-2026 weekly expiry ATM: 22450)
  callKey: 'NSE_FO|40689', // NIFTY 22450 CE 06 OCT 26
  callSymbol: 'NIFTY 22450 CE',
  callStrike: 22450,
  putKey: 'NSE_FO|40696',  // NIFTY 22450 PE 06 OCT 26
  putSymbol: 'NIFTY 22450 PE',
  putStrike: 22450
};

process.on('uncaughtException', err => console.error('[WATCHDOG UNCAUGHT]', err.message));
process.on('unhandledRejection', err => console.error('[WATCHDOG REJECTION]', err));

function log(msg) {
  const ts = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  console.log(`[${ts}] ${msg}`);
}

async function getLiveMarketData(token) {
  try {
    const keys = ['NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank', CONFIG.callKey, CONFIG.putKey];
    const url = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(keys.join(','))}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      log(`⚠️ Upstox API HTTP ${res.status}`);
      return {};
    }
    const json = await res.json();
    return json.data || {};
  } catch (err) {
    log(`⚠️ Upstox API error: ${err.message}`);
    return {};
  }
}

async function getRmsStatus() {
  const res = await fetch(`${CONFIG.rmsApiBase}/api/paper-lab`);
  if (!res.ok) throw new Error(`RMS API HTTP ${res.status}`);
  return await res.json();
}

async function deployTrade({ symbol, underlyingSymbol, strikePrice, optionType, entryPrice, stopLoss, targetPrice, reason, tokenKey }) {
  const idempotencyKey = `auto_copilot_${Date.now()}`;
  const payload = {
    symbol,
    underlyingSymbol,
    strikePrice,
    optionType,
    entryPrice,
    plannedEntryPrice: entryPrice,
    targetPrice,
    stopLoss,
    quantity: 1,
    lotSize: CONFIG.lotSize,
    direction: 'LONG',
    tradeType: 'INTRADAY',
    tradeMode: 'PAPER',
    feedMode: 'LIVE',
    testingMode: false,
    idempotencyKey,
    tokenKey,
    strategyTags: ['Autonomous Copilot Pro', 'Dan Passarelli Greeks', optionType === 'CALL' ? '22800 Gamma Squeeze' : '22770 Breakdown Mean Reversion'],
    personalNotes: reason
  };

  log(`🚀 Submitting paper order to RMS for ${symbol} @ ₹${entryPrice}...`);
  const res = await fetch(`${CONFIG.rmsApiBase}/api/paper-lab/trades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resJson = await res.json();
  if (res.ok || res.status === 201) {
    const trade = resJson.item || resJson.trade;
    log(`✅ [ORDER FILLED] Trade #${trade.id} placed! Entry: ₹${trade.entryPrice} | SL: ₹${trade.stopLoss} | Target: ₹${trade.targetPrice}`);
    
    // Also publish signal to Order Desk Beacon
    try {
      await fetch(`${CONFIG.clientApiBase}/api/copilot/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          underlying: underlyingSymbol,
          optionType,
          strikePrice,
          entryPrice,
          stopLoss,
          targetPrice,
          lots: 1,
          reason,
          ttlSeconds: 300
        })
      });
      log(`📡 Copilot beacon updated on frontend.`);
    } catch(err) {
      log(`⚠️ Beacon update error: ${err.message}`);
    }

    return trade;
  } else {
    log(`❌ RMS Rejected Order: ${JSON.stringify(resJson)}`);
    return null;
  }
}

async function runWatchdog() {
  log('⚡ Starting Autonomous Surveillance Watchdog (Quantitative Copilot Pro)...');
  
  if (!fs.existsSync(CONFIG.upstoxSessionPath)) {
    log('❌ Upstox session file missing!');
    process.exit(1);
  }
  const session = JSON.parse(fs.readFileSync(CONFIG.upstoxSessionPath, 'utf8'));
  const token = session.access_token;
  
  // 1. Initial RMS Verification
  const rms = await getRmsStatus();
  const openCount = rms.openTrades?.length || 0;
  const closedToday = rms.closedTrades?.filter(t => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return t.entryDatetime?.startsWith(todayStr);
  })?.length || 0;

  log(`📊 RMS Audit: Open Trades: ${openCount} | Closed Today: ${closedToday} (Quota: Max 3/day)`);

  if (openCount > 0) {
    log(`⏸️ Open position already active (#${rms.openTrades[0].id}: ${rms.openTrades[0].symbol}). Monitoring active position, no new trade.`);
    return;
  }

  if (closedToday >= 3) {
    log('🛑 Daily 3-trade discipline quota reached for today! No new trades permitted. Capital preserved.');
    return;
  }

  // 2. Minimum Cooldown Guard: Enforce at least 15 minutes between consecutive trades
  const todayTrades = rms.closedTrades?.filter(t => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return t.entryDatetime?.startsWith(todayStr);
  }) || [];
  if (todayTrades.length > 0) {
    const lastTrade = todayTrades[0];
    if (lastTrade?.exitDatetime) {
      const exitTime = new Date(lastTrade.exitDatetime).getTime();
      const elapsedMinutes = (Date.now() - exitTime) / 60000;
      if (elapsedMinutes < 15) {
        const remaining = Math.ceil(15 - elapsedMinutes);
        log(`⏳ [COOLDOWN ACTIVE] Trade #${lastTrade.id} closed ${elapsedMinutes.toFixed(1)} mins ago. Waiting ${remaining}m cooldown before next distinct setup.`);
        return;
      }
    }
  }

  // 2. Continuous Tick Surveillance Loop (Active until 3:00 PM IST)
  let tick = 0;
  while (true) {
    tick++;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    if (timeStr >= '15:00:00') {
      log('🏁 3:00 PM IST reached. Intraday session cutoff reached. Capital preserved.');
      break;
    }

    try {
      const data = await getLiveMarketData(token);
      const niftySpot = data['NSE_INDEX:Nifty 50']?.last_price;
      const bankSpot = data['NSE_INDEX:Nifty Bank']?.last_price;
      
      let callLtp, putLtp;
      for (const [k, v] of Object.entries(data)) {
        if (v.instrument_token === CONFIG.callKey || k.includes('CE')) {
          callLtp = v.last_price;
        }
        if (v.instrument_token === CONFIG.putKey || k.includes('PE')) {
          putLtp = v.last_price;
        }
      }

      if (!niftySpot || !callLtp || !putLtp) {
        log(`[Tick ${tick}] Incomplete market data. Retrying in 5s...`);
        await new Promise(r => setTimeout(r, CONFIG.pollIntervalMs));
        continue;
      }

      // Check Triggers
      const isBullishBreakout = niftySpot >= CONFIG.bullishSpotTrigger && bankSpot >= CONFIG.bankNiftyBullishThreshold;
      const isBearishBreakdown = niftySpot <= CONFIG.bearishSpotTrigger && bankSpot <= CONFIG.bankNiftyBearishThreshold;

      if (tick % 6 === 1 || isBullishBreakout || isBearishBreakdown) {
        log(`[Tick ${tick} | ${timeStr}] NIFTY: ${niftySpot.toFixed(2)} | BANKNIFTY: ${bankSpot.toFixed(2)} | Call: ₹${callLtp.toFixed(2)} | Put: ₹${putLtp.toFixed(2)}`);
      }

      // EXECUTE BULLISH BREAKOUT
      if (isBullishBreakout) {
        log(`🎯 [TRIGGER HIT] Bullish Breakout: NIFTY ${niftySpot.toFixed(2)} >= ${CONFIG.bullishSpotTrigger} | BANKNIFTY ${bankSpot.toFixed(2)}`);
        
        // Exact Risk Math: 3.40 points SL on 65 qty = ₹221 gross + ₹58 friction = ₹279 net risk <= ₹300!
        const slPoints = 3.40;
        const tpPoints = 6.80;
        const entryPrice = Math.round(callLtp * 20) / 20;
        const stopLoss = Math.round((entryPrice - slPoints) * 20) / 20;
        const targetPrice = Math.round((entryPrice + tpPoints) * 20) / 20;

        await deployTrade({
          symbol: CONFIG.callSymbol,
          underlyingSymbol: 'NIFTY',
          strikePrice: CONFIG.callStrike,
          optionType: 'CALL',
          entryPrice,
          stopLoss,
          targetPrice,
          tokenKey: CONFIG.callKey,
          reason: `Autonomous Breakout > ${CONFIG.bullishSpotTrigger} Trigger | Bank Nifty ${bankSpot.toFixed(0)} | Greeks Gamma Expansion`
        });
        log('🏁 Trade executed. Exiting surveillance loop.');
        return;
      }

      // EXECUTE BEARISH BREAKDOWN
      if (isBearishBreakdown) {
        log(`🎯 [TRIGGER HIT] Bearish Breakdown: NIFTY ${niftySpot.toFixed(2)} <= ${CONFIG.bearishSpotTrigger} | BANKNIFTY ${bankSpot.toFixed(2)}`);
        
        const slPoints = 3.40;
        const tpPoints = 6.80;
        const entryPrice = Math.round(putLtp * 20) / 20;
        const stopLoss = Math.round((entryPrice - slPoints) * 20) / 20;
        const targetPrice = Math.round((entryPrice + tpPoints) * 20) / 20;

        await deployTrade({
          symbol: CONFIG.putSymbol,
          underlyingSymbol: 'NIFTY',
          strikePrice: CONFIG.putStrike,
          optionType: 'PUT',
          entryPrice,
          stopLoss,
          targetPrice,
          tokenKey: CONFIG.putKey,
          reason: `Autonomous Breakdown < ${CONFIG.bearishSpotTrigger} Trigger | Bank Nifty ${bankSpot.toFixed(0)} | Shelf Invalidation`
        });
        log('🏁 Trade executed. Exiting surveillance loop.');
        return;
      }

    } catch (err) {
      log(`⚠️ Surveillance iteration error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, CONFIG.pollIntervalMs));
  }

  log(`⏳ Surveillance window completed without trigger breach. Consolidation holds.`);
}

runWatchdog().catch(err => {
  log(`💥 Fatal watchdog error: ${err.stack || err.message}`);
  process.exit(1);
});
