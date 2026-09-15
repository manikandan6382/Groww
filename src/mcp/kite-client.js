import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, "../..");

export const KITE_API_BASE = "https://api.kite.trade";
export const KITE_LOGIN_BASE = "https://kite.zerodha.com/connect/login";
export const SESSION_FILE = path.resolve(
  projectRoot,
  process.env.KITE_SESSION_FILE || ".zerodha-session.json",
);

export function instrumentQuery(instruments) {
  if (!Array.isArray(instruments) || instruments.length === 0) {
    throw new Error("instruments must be a non-empty array.");
  }
  const params = new URLSearchParams();
  for (const instrument of instruments) {
    params.append("i", instrument);
  }
  return `?${params.toString()}`;
}

export async function kiteRequest(endpoint, options = {}) {
  const { apiKey, accessToken } = getSession();
  const headers = {
    "X-Kite-Version": "3",
    Authorization: `token ${apiKey}:${accessToken}`,
    ...(options.headers || {}),
  };
  return requestJson(`${KITE_API_BASE}${endpoint}`, { ...options, headers });
}

export async function kitePublicRequest(endpoint, options = {}) {
  const headers = {
    "X-Kite-Version": "3",
    ...(options.headers || {}),
  };
  return requestJson(`${KITE_API_BASE}${endpoint}`, { ...options, headers });
}

export async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok || payload?.status === "error") {
    const message = payload?.message || payload?.error_type || response.statusText;
    const error = new Error(`Kite API error: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function getSession() {
  const apiKey = requiredEnv("KITE_API_KEY");
  const envToken = process.env.KITE_ACCESS_TOKEN;
  if (envToken) {
    return { apiKey, accessToken: envToken };
  }
  if (fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    if (session.api_key && session.api_key !== apiKey) {
      throw new Error("Saved session API key does not match KITE_API_KEY.");
    }
    if (session.access_token) {
      return { apiKey, accessToken: session.access_token };
    }
  }
  throw new Error("No Kite access token found. Run kite_login_url, then kite_generate_session with the request_token.");
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env or the MCP server environment.`);
  }
  return value;
}

export function redactSession(data) {
  const clone = { ...data };
  for (const key of ["access_token", "public_token", "refresh_token", "enctoken"]) {
    if (clone[key]) clone[key] = "[redacted]";
  }
  return clone;
}

export function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
