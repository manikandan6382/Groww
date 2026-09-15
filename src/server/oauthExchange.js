import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requiredEnv } from "./marketHttpUtils.js";

const kiteApiBase = "https://api.kite.trade";
const upstoxTokenUrl = "https://api.upstox.com/v2/login/authorization/token";

export async function exchangeKiteRequestToken(requestToken, sessionFile) {
  const apiKey = requiredEnv("KITE_API_KEY");
  const apiSecret = requiredEnv("KITE_API_SECRET");
  const checksum = crypto
    .createHash("sha256")
    .update(`${apiKey}${requestToken}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });

  const response = await fetch(`${kiteApiBase}/session/token`, {
    method: "POST",
    headers: {
      "X-Kite-Version": "3",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 finance-dashboard",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data?.status === "error" || !data?.data?.access_token) {
    throw new Error(data?.message || response.statusText || "Failed to exchange Kite request_token for access_token.");
  }

  const session = {
    api_key: apiKey,
    access_token: data.data.access_token,
    public_token: data.data.public_token,
    user_id: data.data.user_id,
    user_name: data.data.user_name,
    login_time: data.data.login_time,
    saved_at: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  process.env.KITE_ACCESS_TOKEN = data.data.access_token;
  return session;
}

export async function exchangeUpstoxCode(code, upstoxSessionFile) {
  const apiKey = process.env.UPSTOX_API_KEY || process.env.UPSTOX_CLIENT_ID || "61557114-951e-4b68-af88-e5121939f2e4";
  const apiSecret = process.env.UPSTOX_API_SECRET || process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3003/upstox/callback";

  if (!apiKey || !apiSecret) {
    throw new Error("Missing UPSTOX_API_KEY or UPSTOX_API_SECRET in .env. Please configure your Upstox API credentials.");
  }

  const body = new URLSearchParams({
    code,
    client_id: apiKey,
    client_secret: apiSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(upstoxTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 finance-dashboard",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok || !data?.access_token) {
    const errorMsg = data?.message || data?.errors?.[0]?.message || response.statusText || text || "Failed to exchange Upstox authorization code.";
    throw new Error(errorMsg);
  }

  let userName = data.user_name || data.user_id || "Upstox User";
  let userId = data.user_id || "";

  try {
    const profileRes = await fetch("https://api.upstox.com/v2/user/profile", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${data.access_token}`,
      },
    });
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.data) {
        userName = profileData.data.user_name || userName;
        userId = profileData.data.user_id || userId;
      }
    }
  } catch {
    // Non-fatal, fallback to token payload
  }

  const session = {
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    user_name: userName,
    user_id: userId,
    user: userName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: "oauth_web_callback",
  };

  fs.mkdirSync(path.dirname(upstoxSessionFile), { recursive: true });
  fs.writeFileSync(upstoxSessionFile, JSON.stringify(session, null, 2), "utf8");
  process.env.UPSTOX_ACCESS_TOKEN = data.access_token;
  console.log(`✅ [Upstox Auth] Token exchanged and saved to ${upstoxSessionFile} for user ${userName} (${userId})`);

  return session;
}
