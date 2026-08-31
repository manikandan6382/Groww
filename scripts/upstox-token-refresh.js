import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sessionFile = path.join(projectRoot, "data", "upstox-session.json");

// Load .env
function loadDotEnv(filePath) {
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

loadDotEnv(path.join(projectRoot, ".env"));

async function verifyToken(token) {
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

async function exchangeAuthCode(code) {
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

function saveToken(token, user = "Upstox User") {
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

async function main() {
  console.log("==========================================");
  console.log("  ⚡ PortfolioX Upstox Token Auto-Refresher");
  console.log("==========================================");

  const args = process.argv.slice(2);
  const tokenIdx = args.indexOf("--token");
  const codeIdx = args.indexOf("--code");

  let token = "";

  if (tokenIdx >= 0 && args[tokenIdx + 1]) {
    token = args[tokenIdx + 1].trim();
  } else if (codeIdx >= 0 && args[codeIdx + 1]) {
    const code = args[codeIdx + 1].trim();
    console.log(`Exchanging auth code [${code.slice(0, 6)}...]...`);
    token = await exchangeAuthCode(code);
  } else if (fs.existsSync(sessionFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      token = data.access_token || "";
      console.log(`Checking existing saved token in ${path.relative(projectRoot, sessionFile)}...`);
    } catch {}
  }

  if (!token) {
    console.error("\n❌ No token or auth code provided.");
    console.log("Usage:");
    console.log("  node scripts/upstox-token-refresh.js --token <access_token>");
    console.log("  node scripts/upstox-token-refresh.js --code <auth_code>\n");
    process.exit(1);
  }

  console.log("Validating token with Upstox API v2...");
  const check = await verifyToken(token);

  if (check.valid) {
    console.log(`🎉 Token is ACTIVE for user: ${check.user}`);
    saveToken(token, check.user);
    console.log("🟢 Live Feed Ready for 9:15 AM Market Session!\n");
  } else {
    console.error(`\n❌ Token validation failed (${check.status || check.error}).`);
    console.log("Your token has expired. Complete OAuth login to generate a fresh token.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
