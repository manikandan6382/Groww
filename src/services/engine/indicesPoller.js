const INDEX_ITEMS = [
  { key: "NSE_INDEX|Nifty 50", lookup: "NSE_INDEX:Nifty 50", name: "NIFTY 50" },
  { key: "NSE_INDEX|Nifty Bank", lookup: "NSE_INDEX:Nifty Bank", name: "BANKNIFTY" },
  { key: "NSE_INDEX|India VIX", lookup: "NSE_INDEX:India VIX", name: "INDIA VIX" },
  { key: "NSE_INDEX|Nifty Fin Service", lookup: "NSE_INDEX:Nifty Fin Service", name: "FINNIFTY" },
  { key: "BSE_INDEX|SENSEX", lookup: "BSE_INDEX:SENSEX", name: "BSE SENSEX" },
];

export async function pollUpstoxIndices(client, publish) {
  client.refreshAccessToken();
  const token = client.accessToken;
  if (!token) return;

  try {
    const keys = "NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank,NSE_INDEX|India VIX,NSE_INDEX|Nifty Fin Service,BSE_INDEX|SENSEX";
    const res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return;

    const body = await res.json();
    const raw = body?.data || {};

    for (const item of INDEX_ITEMS) {
      const q = raw[item.lookup] || raw[item.key];
      if (q && q.last_price != null) {
        const ltp = Number(q.last_price);
        const change = Number(q.net_change || 0);
        const prevClose = q.ohlc?.close != null ? Number(q.ohlc.close) : ltp - change;
        const changePct = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

        publish("index_tick", {
          symbol: item.key,
          tokenKey: item.key,
          name: item.name,
          ltp,
          change,
          changePct,
          open: q.ohlc?.open != null ? Number(q.ohlc.open) : ltp,
          high: q.ohlc?.high != null ? Number(q.ohlc.high) : ltp,
          low: q.ohlc?.low != null ? Number(q.ohlc.low) : ltp,
          close: prevClose,
          receivedAt: q.timestamp || new Date().toISOString(),
        });
      }
    }
  } catch {
    // Non-fatal poll error
  }
}
