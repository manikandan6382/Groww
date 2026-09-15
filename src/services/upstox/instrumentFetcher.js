import fs from "node:fs";
import path from "node:path";
import { parseInstrumentPayload } from "./instrumentMatcher.js";

const UPSTOX_INSTRUMENT_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

export async function fetchUpstoxInstruments(client, projectRoot) {
  const CACHE_TTL = 12 * 60 * 60 * 1000;
  if (client.instrumentCache && Date.now() - client.instrumentCacheAt < CACHE_TTL) {
    return client.instrumentCache;
  }

  const cacheFile = path.join(projectRoot, "data", "upstox-instruments.json");
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) {
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      client.instrumentCache = data;
      client.instrumentCacheAt = stat.mtimeMs;
      return data;
    }
  }

  const res = await fetch(UPSTOX_INSTRUMENT_URL, { headers: { Accept: "application/json, application/gzip" } });
  if (!res.ok) throw new Error(`Instrument download failed: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const data = parseInstrumentPayload(buffer);
  client.instrumentCache = data;
  client.instrumentCacheAt = Date.now();
  try {
    fs.mkdirSync(path.join(projectRoot, "data"), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(data));
  } catch {}
  return data;
}
