import fs from "node:fs";
import path from "node:path";

export function loadDotEnv(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn("Could not load .env:", err.message);
  }
}

export async function verifyToken(token) {
  try {
    const res = await fetch("https://api.upstox.com/v2/user/profile", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return { valid: false, status: res.status };
    const json = await res.json();
    return { valid: true, user: json.data?.user_name || json.data?.user_id || "Upstox User" };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

export async function exchangeAuthCode(code) {
  const clientId = process.env.UPSTOX_API_KEY || process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_API_SECRET || process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || "http://127.0.0.1:3000/upstox/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing UPSTOX_API_KEY or UPSTOX_API_SECRET in .env");
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://api.upstox.com/v2/login/authorization/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

export function saveToken(sessionFile, projectRoot, token, user = "Upstox User") {
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(
    sessionFile,
    JSON.stringify(
      {
        access_token: token,
        user,
        updated_at: new Date().toISOString(),
      },
      null,
      2
    )
  );
  try {
    fs.chmodSync(sessionFile, 0o600);
  } catch {}
  console.log(`\n✅ Upstox session token saved successfully to ${path.relative(projectRoot, sessionFile)} (chmod 0600 secured)`);
}
