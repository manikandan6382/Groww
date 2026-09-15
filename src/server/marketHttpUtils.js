import fs from "node:fs";

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 finance-dashboard",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || response.statusText);
  }
  return data;
}

export async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 finance-dashboard",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText);
  }
  return text;
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env.`);
  return value;
}

export function parsePercent(value) {
  if (typeof value !== "string") return Number(value || 0);
  return Number(value.replace("%", "")) || 0;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getKiteSession(sessionFile) {
  const apiKey = requiredEnv("KITE_API_KEY");
  const envToken = process.env.KITE_ACCESS_TOKEN;
  if (envToken) return { apiKey, accessToken: envToken };
  if (!fs.existsSync(sessionFile)) {
    throw new Error("No Kite session found. Generate a session with the MCP login flow first.");
  }
  const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
  if (!session.access_token) {
    throw new Error("Saved Kite session has no access token.");
  }
  return { apiKey, accessToken: session.access_token };
}

export function tryGetKiteSession(sessionFile) {
  try {
    return getKiteSession(sessionFile);
  } catch {
    return null;
  }
}

export async function kiteRequest(endpoint, kiteApiBase, sessionFile) {
  const { apiKey, accessToken } = getKiteSession(sessionFile);
  return fetchJson(`${kiteApiBase}${endpoint}`, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });
}
