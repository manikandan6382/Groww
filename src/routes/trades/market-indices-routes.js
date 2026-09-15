import { paperTradeEngine } from "../../services/paperTradeEngine.js";
import { ensurePaperEngineStarted } from "./paper-sse.js";
import { sendJson } from "./route-helpers.js";
import { indicesCache } from "./option-contract-cache.js";

const mapping = [
  { key: "NSE_INDEX|Nifty 50", lookup: "NSE_INDEX:Nifty 50", name: "NIFTY 50" },
  { key: "NSE_INDEX|Nifty Bank", lookup: "NSE_INDEX:Nifty Bank", name: "BANKNIFTY" },
  { key: "NSE_INDEX|India VIX", lookup: "NSE_INDEX:India VIX", name: "INDIA VIX" },
  { key: "NSE_INDEX|Nifty Fin Service", lookup: "NSE_INDEX:Nifty Fin Service", name: "FINNIFTY" },
  { key: "BSE_INDEX|SENSEX", lookup: "BSE_INDEX:SENSEX", name: "BSE SENSEX" }
];

export async function handleMarketIndicesRoutes(req, res, url) {
  if (req.method === "GET" && (url.pathname === "/api/market/indices" || url.pathname === "/api/upstox/indices")) {
    ensurePaperEngineStarted();
    const client = paperTradeEngine.client;
    client.refreshAccessToken();
    const token = client.accessToken || "";

    const cached = indicesCache.get("LIVE_INDICES");
    if (cached && Date.now() - cached.timestamp < 1500) {
      sendJson(res, cached.data);
      return true;
    }

    if (token) {
      try {
        const keys = mapping.map((m) => m.key).join(",");
        const upstoxUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`;
        const qRes = await fetch(upstoxUrl, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
        });

        if (qRes.ok) {
          const qData = await qRes.json();
          const raw = qData?.data || {};
          const result = {};

          for (const item of mapping) {
            const quote = raw[item.lookup] || raw[item.key];
            if (quote && quote.last_price != null) {
              const ltp = Number(quote.last_price);
              const change = Number(quote.net_change || 0);
              const prevClose = quote.ohlc?.close != null ? Number(quote.ohlc.close) : (ltp - change);
              const changePct = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

              result[item.key] = {
                name: item.name,
                ltp,
                change,
                changePct,
                open: quote.ohlc?.open != null ? Number(quote.ohlc.open) : ltp,
                high: quote.ohlc?.high != null ? Number(quote.ohlc.high) : ltp,
                low: quote.ohlc?.low != null ? Number(quote.ohlc.low) : ltp,
                close: prevClose,
                timestamp: quote.timestamp || new Date().toISOString()
              };

              paperTradeEngine.publish("index_tick", {
                symbol: item.key,
                tokenKey: item.key,
                name: item.name,
                ltp,
                change,
                changePct,
                open: result[item.key].open,
                high: result[item.key].high,
                low: result[item.key].low,
                close: prevClose,
                receivedAt: quote.timestamp || new Date().toISOString()
              });
            }
          }

          const responseData = {
            success: true,
            timestamp: new Date().toISOString(),
            indices: result
          };

          indicesCache.set("LIVE_INDICES", { timestamp: Date.now(), data: responseData });
          sendJson(res, responseData);
          return true;
        }
      } catch (err) {
        console.warn("Live indices fetch error:", err.message);
      }
    }

    if (cached?.data?.indices && Object.keys(cached.data.indices).length > 0) {
      sendJson(res, cached.data);
      return true;
    }

    if (paperTradeEngine.simulator) {
      paperTradeEngine.simulator.simulateIndices();
      const fresh = indicesCache.get("LIVE_INDICES");
      if (fresh?.data) {
        sendJson(res, fresh.data);
        return true;
      }
    }

    sendJson(res, {
      success: false,
      message: "Upstox live feed unavailable or token missing",
      indices: cached?.data?.indices || {}
    });
    return true;
  }

  return false;
}
