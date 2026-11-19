import fs from "node:fs";

const session = JSON.parse(fs.readFileSync("data/upstox-session.json", "utf8"));
const token = session.access_token;

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status} on ${url}: ${errText}`);
  }
  return res.json();
}

function calculateEma(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  const emaValues = [ema];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emaValues.push(ema);
  }
  return emaValues;
}

function calculateBlack76Delta(spot, strike, dteDays, ivPct, r, isCall) {
  const S = spot;
  const K = strike;
  const T = Math.max(0.001, dteDays / 365.25);
  const sigma = ivPct / 100;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  
  // Normal CDF approx
  function normCdf(x) {
    if (x < 0) return 1 - normCdf(-x);
    const p = 0.2316419;
    const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
    const t = 1 / (1 + p * x);
    const poly = t * (b[0] + t * (b[1] + t * (b[2] + t * (b[3] + t * b[4]))));
    const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    return 1 - pdf * poly;
  }
  
  const discount = Math.exp(-r * T);
  return isCall ? discount * normCdf(d1) : discount * (normCdf(d1) - 1);
}

async function run() {
  console.log("==================================================");
  console.log("   ⚡ RUNNING DETERMINISTIC COPILOT PRO AUDIT     ");
  console.log("==================================================");

  // 1. Fetch Index Quotes
  const indexUrl = "https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX%7CNifty%2050,NSE_INDEX%7CNifty%20Bank,NSE_INDEX%7CIndia%20VIX";
  const indexData = await fetchJson(indexUrl);
  const niftyQuote = indexData.data["NSE_INDEX:Nifty 50"];
  const bnfQuote = indexData.data["NSE_INDEX:Nifty Bank"];
  const vixQuote = indexData.data["NSE_INDEX:India VIX"];

  const spot = niftyQuote.last_price;
  const netChange = niftyQuote.net_change;
  const timestamp = niftyQuote.timestamp;
  const vix = vixQuote.last_price;

  console.log(`📡 Upstox Live Quote: NIFTY 50 @ ${spot} (${netChange >= 0 ? "+" : ""}${netChange}) | Timestamp: ${timestamp}`);
  console.log(`   BankNifty @ ${bnfQuote.last_price} | India VIX @ ${vix}`);

  // 2. Fetch 1-min Intraday Candles of Today
  const candle1mUrl = `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent("NSE_INDEX|Nifty 50")}/1minute`;
  const candle1mData = await fetchJson(candle1mUrl);
  const raw1m = (candle1mData.data?.candles || []).reverse(); // oldest first: [timestamp, open, high, low, close, vol, oi]

  // Aggregate into 5-minute candles
  const candles5m = [];
  for (let i = 0; i < raw1m.length; i += 5) {
    const chunk = raw1m.slice(i, i + 5);
    if (!chunk.length) continue;
    const time = chunk[0][0];
    const open = chunk[0][1];
    let high = -Infinity;
    let low = Infinity;
    let vol = 0;
    for (const c of chunk) {
      if (c[2] > high) high = c[2];
      if (c[3] < low) low = c[3];
      vol += c[5] || 0;
    }
    const close = chunk[chunk.length - 1][4];
    candles5m.push({ time, open, high, low, close, vol });
  }

  // Calculate Session VWAP (typical price * volume, or close if vol 0)
  // For index without volume, VWAP is proxy typical price cumulative
  let cumTypVol = 0;
  let cumVol = 0;
  let cumTyp = 0;
  for (let i = 0; i < raw1m.length; i++) {
    const typ = (raw1m[i][2] + raw1m[i][3] + raw1m[i][4]) / 3;
    const v = raw1m[i][5] || 1;
    cumTypVol += typ * v;
    cumVol += v;
    cumTyp += typ;
  }
  const sessionVwap = Number((cumTypVol / cumVol).toFixed(2));

  // ATR14 on 5M candles
  let atr14 = 10;
  if (candles5m.length >= 15) {
    const trs = [];
    for (let i = 1; i < candles5m.length; i++) {
      const h = candles5m[i].high;
      const l = candles5m[i].low;
      const prevC = candles5m[i - 1].close;
      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      trs.push(tr);
    }
    const last14Trs = trs.slice(-14);
    atr14 = Number((last14Trs.reduce((a, b) => a + b, 0) / 14).toFixed(2));
  }

  // Last 3 15M Swing High / Swing Low
  const raw15mChunks = [];
  for (let i = 0; i < raw1m.length; i += 15) {
    const chunk = raw1m.slice(i, i + 15);
    if (chunk.length >= 10) raw15mChunks.push(chunk);
  }
  const last3_15m = raw15mChunks.slice(-3);
  let pivotLow15m = Infinity;
  let pivotHigh15m = -Infinity;
  for (const chunk of last3_15m) {
    for (const c of chunk) {
      if (c[3] < pivotLow15m) pivotLow15m = c[3];
      if (c[2] > pivotHigh15m) pivotHigh15m = c[2];
    }
  }

  const latest5m = candles5m[candles5m.length - 1];
  console.log(`📊 5M Structure: Close = ${latest5m.close} | VWAP = ${sessionVwap} | ATR14 = ${atr14}pt`);
  console.log(`   15M Swing Low = ${pivotLow15m} | Swing High = ${pivotHigh15m}`);

  // 3. Fetch Historical 30m candles for 1H Macro Trend
  const hist30mUrl = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent("NSE_INDEX|Nifty 50")}/30minute/2026-09-25/2026-09-01`;
  const hist30mData = await fetchJson(hist30mUrl);
  const raw30m = (hist30mData.data?.candles || []).reverse();

  // Combine with today's 1m candles aggregated to 30m
  const candles1h = [];
  for (let i = 0; i < raw30m.length; i += 2) {
    const chunk = raw30m.slice(i, i + 2);
    if (chunk.length < 2) continue;
    candles1h.push(chunk[1][4]); // 1H close
  }

  const ema20_1h_vals = calculateEma(candles1h, 20);
  const ema50_1h_vals = calculateEma(candles1h, 50);

  const ema20_1h = Number(ema20_1h_vals[ema20_1h_vals.length - 1].toFixed(2));
  const ema50_1h = Number(ema50_1h_vals[ema50_1h_vals.length - 1].toFixed(2));
  const ema20_prev3 = ema20_1h_vals[ema20_1h_vals.length - 4] || ema20_1h;
  const ema20_slope = Number(((ema20_1h - ema20_prev3) / 3).toFixed(2));

  console.log(`📈 1H Macro Trend: Close = ${spot} | 1H EMA20 = ${ema20_1h} | 1H EMA50 = ${ema50_1h} | Slope = ${ema20_slope}`);

  // 4. Fetch Nearest ATM Options Contracts dynamically
  const roundedAtm = Math.round(spot / 50) * 50;
  let ceQuote = null;
  let peQuote = null;
  let ceDepth = { bestBid: 0, bestAsk: 0, spread: 0 };
  let peDepth = { bestBid: 0, bestAsk: 0, spread: 0 };
  let ceDelta = 0.5;
  let peDelta = -0.5;

  try {
    const contractsUrl = "https://api.upstox.com/v2/option/contract?instrument_key=NSE_INDEX%7CNifty%2050";
    const contractsData = await fetchJson(contractsUrl);
    const contracts = contractsData.data || [];
    
    // Sort expiries and find nearest
    const todayStr = new Date().toISOString().split("T")[0];
    const validContracts = contracts.filter(c => c.expiry >= todayStr);
    const sortedExpiries = [...new Set(validContracts.map(c => c.expiry))].sort();
    const nearestExpiry = sortedExpiries[0];

    const atmCe = validContracts.find(c => c.expiry === nearestExpiry && c.strike_price === roundedAtm && c.instrument_type === "CE");
    const atmPe = validContracts.find(c => c.expiry === nearestExpiry && c.strike_price === roundedAtm && c.instrument_type === "PE");

    if (atmCe && atmPe) {
      const optQuotesUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(atmCe.instrument_key)},${encodeURIComponent(atmPe.instrument_key)}`;
      const optQuotesData = await fetchJson(optQuotesUrl);
      const quotesMap = optQuotesData.data || {};
      
      const qValues = Object.values(quotesMap);
      ceQuote = quotesMap[atmCe.instrument_key] || qValues.find(q => (q.instrument_token || "").includes("CE") || (q.trading_symbol || "").includes("CE")) || qValues[0];
      peQuote = quotesMap[atmPe.instrument_key] || qValues.find(q => (q.instrument_token || "").includes("PE") || (q.trading_symbol || "").includes("PE")) || qValues[1];

      function parseDepth(q) {
        if (!q) return { bestBid: 0, bestAsk: 0, spread: 0 };
        const buyBook = q.depth?.buy || [];
        const sellBook = q.depth?.sell || [];
        const bestBid = buyBook[0]?.price || q.last_price || 0;
        const bestAsk = sellBook[0]?.price || q.last_price || 0;
        const spread = Number((bestAsk - bestBid).toFixed(2));
        return { bestBid, bestAsk, spread };
      }

      if (ceQuote) ceDepth = parseDepth(ceQuote);
      if (peQuote) peDepth = parseDepth(peQuote);

      const dteDays = Math.max(1, Math.round((new Date(nearestExpiry) - new Date()) / (1000 * 60 * 60 * 24)));
      const iv = vix || 14.0;
      ceDelta = Number(calculateBlack76Delta(spot, roundedAtm, dteDays, iv, 0.065, true).toFixed(2));
      peDelta = Number(calculateBlack76Delta(spot, roundedAtm, dteDays, iv, 0.065, false).toFixed(2));

      console.log(`\n🎯 ATM STRIKES AUDIT (Expiry: ${nearestExpiry} | ATM: ${roundedAtm}):`);
      if (ceQuote) console.log(`   NIFTY ${roundedAtm} CE: LTP ₹${ceQuote.last_price} | Bid ₹${ceDepth.bestBid} | Ask ₹${ceDepth.bestAsk} | Spread ₹${ceDepth.spread} | Vol: ${ceQuote.volume} | OI: ${ceQuote.oi} | Delta: ${ceDelta}`);
      if (peQuote) console.log(`   NIFTY ${roundedAtm} PE: LTP ₹${peQuote.last_price} | Bid ₹${peDepth.bestBid} | Ask ₹${peDepth.bestAsk} | Spread ₹${peDepth.spread} | Vol: ${peQuote.volume} | OI: ${peQuote.oi} | Delta: ${peDelta}`);
    }
  } catch (err) {
    console.log(`⚠️ Option chain query warning: ${err.message}`);
  }

  // Summary JSON output
  const summary = {
    spot,
    netChange,
    timestamp,
    vix,
    sessionVwap,
    atr14,
    pivotLow15m,
    pivotHigh15m,
    ema20_1h,
    ema50_1h,
    ema20_slope,
    ce: {
      symbol: `NIFTY ${roundedAtm} CE`,
      ltp: ceQuote?.last_price ?? 0,
      bid: ceDepth.bestBid,
      ask: ceDepth.bestAsk,
      spread: ceDepth.spread,
      vol: ceQuote?.volume ?? 0,
      oi: ceQuote?.oi ?? 0,
      delta: ceDelta
    },
    pe: {
      symbol: `NIFTY ${roundedAtm} PE`,
      ltp: peQuote?.last_price ?? 0,
      bid: peDepth.bestBid,
      ask: peDepth.bestAsk,
      spread: peDepth.spread,
      vol: peQuote?.volume ?? 0,
      oi: peQuote?.oi ?? 0,
      delta: peDelta
    }
  };

  fs.writeFileSync("data/copilot-audit-result.json", JSON.stringify(summary, null, 2));
  console.log("\n✅ Audit data written to data/copilot-audit-result.json");
}

run().catch(err => {
  console.error("❌ Fatal Audit Error:", err);
  process.exit(1);
});
