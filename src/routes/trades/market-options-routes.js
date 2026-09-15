import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { computeGexProfile } from "../../services/greeksEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { readJsonBody, sendJson } from "./route-helpers.js";

export async function handleMarketOptionsRoutes(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/market/gex-profile") {
    const symbol = (url.searchParams.get("symbol") || "NIFTY").toUpperCase();
    const spot = Number(url.searchParams.get("spot") || (symbol === "BANKNIFTY" ? 52000 : 24500));
    const dte = Number(url.searchParams.get("dte") || 1);
    const profile = computeGexProfile(symbol, spot, [], dte);
    sendJson(res, profile);
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
              const tokenKey = await client.resolveOptionToken({ symbol: sym });
              return { sym, tokenKey };
            } catch {
              return { sym, tokenKey: null };
            }
          })
        );

        const validEntries = tokenEntries.filter((e) => Boolean(e.tokenKey));
        if (validEntries.length > 0) {
          const uniqueKeys = Array.from(new Set(validEntries.map((e) => e.tokenKey)));
          const qRes = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(uniqueKeys.join(","))}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
          });
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

                paperTradeEngine.registerWatchedToken(tokenKey, sym);
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
        const parsedStrike = Number((sym.match(/\b\d{5,6}\b/) || sym.match(/\d+/) || [24000])[0]);
        const isCall = sym.includes("CE") || sym.includes("CALL");
        const intrinsic = isCall ? Math.max(0, spot - parsedStrike) : Math.max(0, parsedStrike - spot);
        const extrinsic = Math.max(15, 80 - Math.abs(spot - parsedStrike) * 0.08);
        const ltp = Math.max(0.05, Math.round((intrinsic + extrinsic) * 20) / 20);
        quotes[sym] = {
          symbol: sym,
          tokenKey: `PRACTICE:${sym}`,
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

  return false;
}
