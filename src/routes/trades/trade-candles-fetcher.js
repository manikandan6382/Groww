export async function fetchUpstoxTradeCandles({ token, tokenKey, symbol, fromDate, fromTime, toTime }) {
  let candles = [];
  let underlying = null;
  let source = "interpolated";

  const dateOnly = fromDate.toISOString().split("T")[0];
  const todayOnly = new Date().toISOString().split("T")[0];
  const isToday = dateOnly === todayOnly;
  const candleUrl = isToday
    ? `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(tokenKey)}/1minute`
    : `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(tokenKey)}/1minute/${dateOnly}/${dateOnly}`;

  let indexKey = symbol.includes("BANK") ? "NSE_INDEX|Nifty Bank" : (symbol.includes("FIN") ? "NSE_INDEX|Nifty Fin Service" : "NSE_INDEX|Nifty 50");
  let indexName = symbol.includes("BANK") ? "BANKNIFTY" : (symbol.includes("FIN") ? "FINNIFTY" : "NIFTY 50");
  const indexUrl = isToday
    ? `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(indexKey)}/1minute`
    : `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(indexKey)}/1minute/${dateOnly}/${dateOnly}`;

  const [cRes, iRes] = await Promise.all([
    fetch(candleUrl, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }),
    fetch(indexUrl, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }).catch(() => null)
  ]);

  const minTime = fromTime - 3 * 60 * 1000;
  const maxTime = toTime + 3 * 60 * 1000;

  if (iRes && iRes.ok) {
    try {
      const iData = await iRes.json();
      const rawIdx = iData?.data?.candles || [];
      if (rawIdx.length > 0) {
        const matched = rawIdx
          .map((c) => ({ time: c[0], timestamp: new Date(c[0]).getTime(), close: Number(c[4]) }))
          .filter((c) => c.timestamp >= minTime && c.timestamp <= maxTime)
          .sort((a, b) => a.timestamp - b.timestamp);
        if (matched.length >= 2) {
          const uStart = matched[0].close;
          const uEnd = matched[matched.length - 1].close;
          const uPts = Number((uEnd - uStart).toFixed(1));
          underlying = { name: indexName, key: indexKey, startPrice: uStart, endPrice: uEnd, changePts: uPts, changePct: Number(((uPts / uStart) * 100).toFixed(2)), candles: matched };
        }
      }
    } catch { /* ignore */ }
  }

  if (cRes && cRes.ok) {
    const cData = await cRes.json();
    const raw = cData?.data?.candles || [];
    if (raw.length > 0) {
      const matched = raw
        .map((c) => ({ time: c[0], timestamp: new Date(c[0]).getTime(), open: Number(c[1]), high: Number(c[2]), low: Number(c[3]), close: Number(c[4]), volume: Number(c[5] || 0) }))
        .filter((c) => c.timestamp >= minTime && c.timestamp <= maxTime)
        .sort((a, b) => a.timestamp - b.timestamp);
      if (matched.length >= 2) {
        candles = matched;
        source = "upstox";
      } else if (matched.length === 1) {
        candles = matched;
        source = "upstox-single";
      }
    }
  }

  return { candles, underlying, source };
}
