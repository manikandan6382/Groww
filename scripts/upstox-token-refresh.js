import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv, verifyToken, exchangeAuthCode, saveToken } from "./upstox-token-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sessionFile = path.join(projectRoot, "data", "upstox-session.json");

loadDotEnv(path.join(projectRoot, ".env"));

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
    saveToken(sessionFile, projectRoot, token, check.user);
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
