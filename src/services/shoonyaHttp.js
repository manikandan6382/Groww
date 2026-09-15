import {
  getManualToken,
  buildShoonyaSearchText,
  chooseOptionSearchMatch,
} from "./shoonyaUtils.js";

export async function resolveShoonyaOptionToken(client, trade) {
  const manual = getManualToken(trade);
  if (manual) return manual;
  if (!client.isConfigured()) return null;

  const searchText = buildShoonyaSearchText(trade);
  if (!searchText) return null;

  const payload = await postShoonyaJson(client, "SearchScrip", {
    uid: client.userId,
    exch: "NFO",
    stext: searchText,
  });
  const rows = payload?.values || payload?.data || [];
  const match = chooseOptionSearchMatch(rows, trade);
  if (!match?.token) return null;
  return `NFO|${match.token}`;
}

export async function postShoonyaJson(client, endpoint, body) {
  const response = await fetch(`${client.restUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: `jData=${encodeURIComponent(JSON.stringify(body))}&jKey=${encodeURIComponent(client.sessionToken)}`,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok || data?.stat === "Not_Ok") {
    const message = data?.emsg || data?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}
