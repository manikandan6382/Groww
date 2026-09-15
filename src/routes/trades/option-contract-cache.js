export const optionContractsCache = new Map();
export const optionChainCache = new Map();
export const indicesCache = new Map();

export async function getUpstoxOptionChain(token, indexKey, expiryDate) {
  const cacheKey = `${indexKey}_${expiryDate}`;
  const cached = optionChainCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 20 * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(indexKey)}&expiry_date=${encodeURIComponent(expiryDate)}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length) {
        if (optionChainCache.size > 20) {
          const first = optionChainCache.keys().next().value;
          optionChainCache.delete(first);
        }
        optionChainCache.set(cacheKey, { cachedAt: Date.now(), data: json.data });
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Option chain fetch error:", e.message);
  }
  return cached?.data || [];
}

export async function getUpstoxOptionContracts(token, indexKey) {
  const cached = optionContractsCache.get(indexKey);
  if (cached && Date.now() - cached.cachedAt < 10 * 60 * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.upstox.com/v2/option/contract?instrument_key=${encodeURIComponent(indexKey)}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length) {
        optionContractsCache.set(indexKey, { cachedAt: Date.now(), data: json.data });
        return json.data;
      }
    }
  } catch (e) {
    console.warn("Option contracts fetch error:", e.message);
  }
  return cached?.data || [];
}
