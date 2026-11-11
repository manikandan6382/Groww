import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { computeGexProfile } from "../../services/greeksEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { readJsonBody, sendJson } from "./route-helpers.js";
import { getUpstoxOptionContracts, getUpstoxOptionChain } from "./option-contract-cache.js";
import { extractStrikeFromSymbol } from "../../services/upstox/contractResolver.js";

export async function handleMarketOptionsRoutes(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/market/gex-profile") {
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const spot = Number(url.searchParams.get("spot") || (symbol === "BANKNIFTY" ? 52000 : 24500));
    const dte = Number(url.searchParams.get("dte") || 1);
    const profile = computeGexProfile(symbol, spot, [], dte);
    sendJson(res, profile);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/market/subscribe") {
    ensurePaperEngineStarted();
    const body = await readJsonBody(req);
    const key = body.instrumentKey || body.key || body.tokenKey;
    if (key) {
      paperTradeEngine.client.subscribe(key);
      if (body.symbol) {
        if (!paperTradeEngine.watchedTokens) paperTradeEngine.watchedTokens = new Map();
        paperTradeEngine.watchedTokens.set(key, { symbol: body.symbol, lastSeenAt: Date.now() });
      }
      sendJson(res, { success: true, subscribed: key });
      return true;
    }
    sendJson(res, { success: false, error: "Missing instrumentKey" }, 400);
    return true;
  }

  if ((req.method === "POST" && url.pathname === "/api/market/option-quotes") || (req.method === "GET" && url.pathname === "/api/market/option-quote")) {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    let symbols = [];
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      symbols = Array.isArray(body.symbols) ? body.symbols : (body.symbol ? [body.symbol] : []);
    } else {
      const sym = url.searchParams.get("symbol");
      if (sym) symbols.push(sym);
    }

    if (!symbols.length) {
      sendJson(res, { success: true, quotes: {} });
      return true;
    }

    const quotes = {};
    if (token) {
      try {
        const tokenEntries = await Promise.all(
          symbols.map(async (sym) => {
            try {
              const strikePrice = extractStrikeFromSymbol(sym);
              const tokenKey = await client.resolveOptionToken({ symbol: sym, strikePrice });
              return { sym, tokenKey };
            } catch {
              return { sym, tokenKey: null };
            }
          })
        );

        const validEntries = tokenEntries.filter((e) => Boolean(e.tokenKey));
        // Invariant: Register real Upstox token immediately so WebSocket subscribes and streams live market ticks
        const nowMs = Date.now();
        for (const { sym, tokenKey } of validEntries) {
          paperTradeEngine.registerWatchedToken(tokenKey, sym);
          const cached = paperTradeEngine.quoteStore?.get(tokenKey);
          const cachedAgeMs = cached ? (nowMs - (cached.receivedAtMs || new Date(cached.receivedAt || 0).getTime())) : Infinity;
          if (cached && cached.ltp > 0 && cachedAgeMs < 3000) {
            quotes[sym] = {
              symbol: sym,
              tokenKey,
              ltp: Number(cached.ltp),
              change: Number(cached.change || 0),
              open: Number(cached.open || cached.ltp),
              high: Number(cached.high || cached.ltp),
              low: Number(cached.low || cached.ltp),
              close: Number(cached.close || cached.ltp),
              timestamp: cached.receivedAt || new Date().toISOString()
            };
            quotes[tokenKey] = quotes[sym];
          }
        }

        const missingKeys = validEntries
          .filter(e => !quotes[e.sym] || !quotes[e.sym].ltp)
          .map(e => e.tokenKey);

        if (missingKeys.length > 0) {
          const uniqueKeys = Array.from(new Set(missingKeys));
          let qRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(uniqueKeys.join(","))}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
          });
          if (qRes.status === 429) {
            // Respect rate limit: Back off and retry once
            await new Promise(r => setTimeout(r, 400));
            qRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(uniqueKeys.join(","))}`, {
              headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
          }
          if (qRes.ok) {
            const qData = await qRes.json();
            const rawData = qData?.data || {};
            for (const { sym, tokenKey } of validEntries) {
              const quoteItem = Object.values(rawData).find(
                (item) => item?.instrument_token === tokenKey || item?.instrument_key === tokenKey
              ) || rawData[tokenKey] || rawData[tokenKey.replace("|", ":")];

              if (quoteItem && quoteItem.last_price != null) {
                const ltp = Number(quoteItem.last_price);
                const change = Number(quoteItem.net_change || 0);
                const quoteObj = {
                  symbol: sym,
                  tokenKey,
                  ltp,
                  change,
                  open: quoteItem.ohlc?.open != null ? Number(quoteItem.ohlc.open) : ltp,
                  high: quoteItem.ohlc?.high != null ? Number(quoteItem.ohlc.high) : ltp,
                  low: quoteItem.ohlc?.low != null ? Number(quoteItem.ohlc.low) : ltp,
                  close: quoteItem.ohlc?.close != null ? Number(quoteItem.ohlc.close) : ltp,
                  timestamp: quoteItem.timestamp || new Date().toISOString()
                };
                quotes[sym] = quoteObj;
                quotes[tokenKey] = quoteObj;

                paperTradeEngine.publish("tick", {
                  symbol: sym,
                  tokenKey,
                  ltp,
                  change,
                  receivedAt: quoteObj.timestamp
                });
                paperTradeEngine.client.emit("tick", {
                  exchange: tokenKey.split("|")[0] || "NSE",
                  token: tokenKey,
                  key: tokenKey,
                  ltp,
                  change,
                  raw: quoteItem,
                  receivedAt: quoteObj.timestamp
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Option quotes fetch error:", err.message);
      }
    }

    if (!Object.keys(quotes).length && symbols.length) {
      const nowIso = new Date().toISOString();
      for (const sym of symbols) {
        const uSym = sym.includes("SENSEX") ? "BSE_INDEX|SENSEX" : sym.includes("BANK") ? "NSE_INDEX|Nifty Bank" : "NSE_INDEX|Nifty 50";
        const spot = paperTradeEngine.simulator ? paperTradeEngine.simulator.getCurrentSpot(uSym) : (sym.includes("BANK") ? 57317.75 : 24005.55);
        const parsedStrike = extractStrikeFromSymbol(sym) || 24000;
        const isCall = sym.includes("CE") || sym.includes("CALL");
        const intrinsic = isCall ? Math.max(0, spot - parsedStrike) : Math.max(0, parsedStrike - spot);
        const extrinsic = Math.max(15, 80 - Math.abs(spot - parsedStrike) * 0.08);
        const ltp = Math.max(0.05, Math.round((intrinsic + extrinsic) * 20) / 20);
        const matchedEntry = validEntries.find(e => e.sym === sym);
        const resolvedKey = matchedEntry?.tokenKey || `PRACTICE:${sym}`;
        quotes[sym] = {
          symbol: sym,
          tokenKey: resolvedKey,
          ltp,
          change: 0,
          open: ltp,
          high: ltp + 5.0,
          low: Math.max(0.05, ltp - 5.0),
          close: ltp,
          timestamp: nowIso
        };
      }
    }

    sendJson(res, { success: true, quotes });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/market/option-chain") {
    ensurePaperEngineStarted();
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const requestedExpiry = url.searchParams.get("expiry") || "";

    const keyMap = {
      NIFTY: "NSE_INDEX|Nifty 50",
      BANKNIFTY: "NSE_INDEX|Nifty Bank",
      FINNIFTY: "NSE_INDEX|Nifty Fin Service",
      SENSEX: "BSE_INDEX|SENSEX"
    };

    const intervalMap = {
      NIFTY: 50,
      BANKNIFTY: 100,
      FINNIFTY: 50,
      SENSEX: 100
    };

    const spotFallbacks = {
      NIFTY: 25150.25,
      BANKNIFTY: 53820.75,
      FINNIFTY: 24680.50,
      SENSEX: 82450.10
    };

    const instrumentKey = keyMap[symbol] || "NSE_INDEX|Nifty 50";
    const strikeInterval = intervalMap[symbol] || 50;

    let spot = spotFallbacks[symbol] || 25000;
    if (paperTradeEngine?.simulator) {
      const liveSpot = paperTradeEngine.simulator.getCurrentSpot(instrumentKey);
      if (liveSpot && liveSpot > 0) spot = Number(liveSpot);
    }

    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    // 1. Live Upstox Option Chain Fetch
    if (token) {
      try {
        const contracts = await getUpstoxOptionContracts(token, instrumentKey);
        const expiryDates = Array.isArray(contracts)
          ? Array.from(new Set(contracts.map((c) => c.expiry))).filter(Boolean).sort()
          : [];

        const activeExpiry = requestedExpiry || expiryDates[0] || "";

        if (activeExpiry) {
          const rawChain = await getUpstoxOptionChain(token, instrumentKey, activeExpiry);
          if (Array.isArray(rawChain) && rawChain.length > 0) {
            let totalCallOi = 0;
            let totalPutOi = 0;

            const strikes = rawChain.map((item) => {
              const strike = Number(item.strike_price);
              const callData = item.call_options?.market_data || {};
              const callGreeks = item.call_options?.option_greeks || {};
              const putData = item.put_options?.market_data || {};
              const putGreeks = item.put_options?.option_greeks || {};

              const callOi = Number(callData.oi || 0);
              const putOi = Number(putData.oi || 0);
              totalCallOi += callOi;
              totalPutOi += putOi;

              return {
                strike,
                call: {
                  ltp: Number(callData.ltp || 0),
                  change: Number(callData.net_change || 0),
                  oi: callOi,
                  changeOi: Number(callData.close_price ? callOi - Number(callData.close_price) : 0),
                  iv: Number(callGreeks.iv || 13.5),
                  delta: Number(callGreeks.delta || 0.5),
                  instrumentKey: item.call_options?.instrument_key || ""
                },
                put: {
                  ltp: Number(putData.ltp || 0),
                  change: Number(putData.net_change || 0),
                  oi: putOi,
                  changeOi: Number(putData.close_price ? putOi - Number(putData.close_price) : 0),
                  iv: Number(putGreeks.iv || 13.5),
                  delta: Number(putGreeks.delta || -0.5),
                  instrumentKey: item.put_options?.instrument_key || ""
                }
              };
            });

            // Calculate Max Pain
            let maxPainStrike = spot;
            let minPayout = Infinity;
            strikes.forEach((candidate) => {
              let totalLoss = 0;
              strikes.forEach((s) => {
                if (s.strike < candidate.strike) {
                  totalLoss += (candidate.strike - s.strike) * s.call.oi;
                } else if (s.strike > candidate.strike) {
                  totalLoss += (s.strike - candidate.strike) * s.put.oi;
                }
              });
              if (totalLoss < minPayout) {
                minPayout = totalLoss;
                maxPainStrike = candidate.strike;
              }
            });

            const pcr = totalCallOi > 0 ? Number((totalPutOi / totalCallOi).toFixed(2)) : 1.0;

            sendJson(res, {
              success: true,
              symbol,
              instrumentKey,
              spot,
              expiry: activeExpiry,
              expiryDates,
              pcr,
              maxPain: maxPainStrike,
              totalCallOi,
              totalPutOi,
              strikes,
              isSimulated: false
            });
            return true;
          }
        }
      } catch (err) {
        console.warn("[handleMarketOptionsRoutes] Live chain fetch error, falling back to simulated:", err.message);
      }
    }

    // 2. High-Fidelity Synthetic Simulation Fallback (24/7 Resilience)
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikes = [];
    let totalCallOi = 0;
    let totalPutOi = 0;

    // Generate ATM -6 to ATM +6 strikes (13 strikes total)
    for (let offset = -6; offset <= 6; offset++) {
      const strike = atmStrike + offset * strikeInterval;
      const distFromSpot = spot - strike;

      // Realistic Intrinsic & Extrinsic Options Pricing
      const isCallItm = distFromSpot > 0;
      const isPutItm = distFromSpot < 0;

      const callIntrinsic = isCallItm ? distFromSpot : 0;
      const putIntrinsic = isPutItm ? Math.abs(distFromSpot) : 0;

      const extrinsicAtm = spot * 0.019;
      const decayFactor = Math.max(0.15, 1 - Math.abs(offset) * 0.14);
      const extrinsic = extrinsicAtm * decayFactor;

      const callLtp = Number(Math.max(1.5, callIntrinsic + extrinsic).toFixed(2));
      const putLtp = Number(Math.max(1.5, putIntrinsic + extrinsic).toFixed(2));

      // Realistic Institutional OI Clustering (Calls peak higher, Puts peak lower)
      const callBaseOi = Math.round(Math.max(80000, 1500000 * Math.exp(-Math.pow(offset - 2, 2) / 6)));
      const putBaseOi = Math.round(Math.max(90000, 1750000 * Math.exp(-Math.pow(offset + 2, 2) / 6)));

      const callChgOi = Math.round((offset >= 0 ? 1 : -0.5) * (callBaseOi * 0.08));
      const putChgOi = Math.round((offset <= 0 ? 1.2 : -0.4) * (putBaseOi * 0.09));

      totalCallOi += callBaseOi;
      totalPutOi += putBaseOi;

      const callDelta = Number(Math.min(0.95, Math.max(0.05, 0.5 + (distFromSpot / (strikeInterval * 6)) * 0.4)).toFixed(2));
      const putDelta = Number(Math.min(-0.05, Math.max(-0.95, -0.5 + (distFromSpot / (strikeInterval * 6)) * 0.4)).toFixed(2));
      const iv = Number((13.2 + Math.abs(offset) * 0.4).toFixed(2));

      strikes.push({
        strike,
        call: {
          ltp: callLtp,
          change: Number((distFromSpot >= 0 ? 8.5 : -5.2).toFixed(2)),
          oi: callBaseOi,
          changeOi: callChgOi,
          iv,
          delta: callDelta,
          instrumentKey: `PRACTICE:${symbol}_${strike}_CE`
        },
        put: {
          ltp: putLtp,
          change: Number((distFromSpot <= 0 ? 6.8 : -7.1).toFixed(2)),
          oi: putBaseOi,
          changeOi: putChgOi,
          iv,
          delta: putDelta,
          instrumentKey: `PRACTICE:${symbol}_${strike}_PE`
        }
      });
    }

    const pcr = totalCallOi > 0 ? Number((totalPutOi / totalCallOi).toFixed(2)) : 1.15;
    const maxPain = atmStrike;

    sendJson(res, {
      success: true,
      symbol,
      instrumentKey,
      spot,
      expiry: requestedExpiry || "WEEKLY_CURRENT",
      expiryDates: ["CURRENT_EXPIRY", "NEXT_WEEK", "MONTHLY_EXPIRY"],
      pcr,
      maxPain,
      totalCallOi,
      totalPutOi,
      strikes,
      isSimulated: true
    });
    return true;
  }

  return false;
}
