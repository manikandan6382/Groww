import fs from "node:fs";
import { fetchText, tryGetKiteSession } from "./marketHttpUtils.js";

const fallbackStocks = JSON.parse(
  fs.readFileSync(new URL("./fallbackStocks.json", import.meta.url), "utf8"),
);

const instrumentCache = { savedAt: 0, payload: null };

export async function searchStocks(url, kiteApiBase, sessionFile) {
  const query = normalizeSearch(url.searchParams.get("q") || "");
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 20), 50));
  const universe = await getStockUniverse(kiteApiBase, sessionFile);
  const ranked = (universe.items || [])
    .map((item) => ({ item, score: scoreStockMatch(item, query) }))
    .filter((entry) => (query ? entry.score < 99 : true))
    .sort((a, b) => a.score - b.score || a.item.tradingsymbol.localeCompare(b.item.tradingsymbol))
    .slice(0, limit)
    .map((entry) => entry.item);

  if (query && query.length >= 2 && !ranked.some((item) => item.tradingsymbol.toUpperCase() === query)) {
    ranked.push({
      tradingsymbol: query,
      name: `${query} (Direct NSE Ticker)`,
      exchange: "NSE",
      yahooSymbol: `${query}.NS`,
    });
  }

  return {
    source: universe.source,
    count: ranked.length,
    items: ranked,
  };
}

export async function getStockUniverse(kiteApiBase, sessionFile) {
  if (instrumentCache.payload && Array.isArray(instrumentCache.payload.items) && instrumentCache.payload.items.length > 0 && Date.now() - instrumentCache.savedAt < 12 * 60 * 60 * 1000) {
    return { ...instrumentCache.payload, cached: true };
  }

  try {
    const csv = await downloadInstrumentCsv(kiteApiBase, sessionFile);
    const rows = parseCsv(csv);
    const items = rows
      .filter((row) => ["NSE", "BSE"].includes(row.exchange))
      .filter((row) => row.instrument_type === "EQ")
      .filter((row) => row.tradingsymbol && row.name)
      .map((row) => ({
        tradingsymbol: row.tradingsymbol,
        name: row.name,
        exchange: row.exchange,
        yahooSymbol: toYahooInstrumentSymbol(row.tradingsymbol, row.exchange),
      }))
      .sort((a, b) => a.tradingsymbol.localeCompare(b.tradingsymbol));
    if (items.length > 100) {
      instrumentCache.payload = { source: "Kite instruments", items };
      instrumentCache.savedAt = Date.now();
      return instrumentCache.payload;
    }
  } catch {
    // Fall back to the bundled list
  }

  const fallback = {
    source: "Built-in NSE/BSE Universe",
    items: fallbackStocks.map((item) => ({
      ...item,
      yahooSymbol: toYahooInstrumentSymbol(item.tradingsymbol, item.exchange),
    })),
  };
  instrumentCache.payload = fallback;
  instrumentCache.savedAt = Date.now();
  return fallback;
}

async function downloadInstrumentCsv(kiteApiBase, sessionFile) {
  try {
    return await fetchText(`${kiteApiBase}/instruments`);
  } catch (error) {
    const session = tryGetKiteSession(sessionFile);
    if (!session) throw error;
    return fetchText(`${kiteApiBase}/instruments`, {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${session.apiKey}:${session.accessToken}`,
      },
    });
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function normalizeSearch(value) {
  return value.trim().toUpperCase().replace(/\.(NS|BO)$/, "");
}

function scoreStockMatch(item, query) {
  if (!query) return 10;
  const symbol = item.tradingsymbol.toUpperCase();
  const name = item.name.toUpperCase();
  if (symbol === query) return 0;
  if (symbol.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (symbol.includes(query)) return 3;
  if (name.includes(query)) return 4;
  return 99;
}

function toYahooInstrumentSymbol(tradingsymbol, exchange) {
  return `${tradingsymbol}.${exchange === "BSE" ? "BO" : "NS"}`;
}
