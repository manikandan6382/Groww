import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadDotEnv(path.join(projectRoot, ".env"));

const KITE_API_BASE = "https://api.kite.trade";
const KITE_LOGIN_BASE = "https://kite.zerodha.com/connect/login";
const SESSION_FILE = path.resolve(
  projectRoot,
  process.env.KITE_SESSION_FILE || ".zerodha-session.json",
);

const tools = [
  {
    name: "kite_login_url",
    description: "Return the Zerodha Kite Connect login URL for the configured API key.",
    inputSchema: {
      type: "object",
      properties: {
        redirect_params: {
          type: "string",
          description: "Optional URL query string to round-trip through Kite login, for example source=codex.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "kite_generate_session",
    description: "Exchange a short-lived Kite request_token for an access_token and save it locally.",
    inputSchema: {
      type: "object",
      properties: {
        request_token: {
          type: "string",
          description: "The request_token query parameter from the Kite redirect URL.",
        },
      },
      required: ["request_token"],
      additionalProperties: false,
    },
  },
  {
    name: "kite_profile",
    description: "Fetch the authenticated Zerodha user profile.",
    inputSchema: emptySchema(),
  },
  {
    name: "kite_margins",
    description: "Fetch funds and margins. Optionally pass segment as equity or commodity.",
    inputSchema: {
      type: "object",
      properties: {
        segment: {
          type: "string",
          enum: ["equity", "commodity"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "kite_holdings",
    description: "Fetch long-term equity holdings from the Zerodha portfolio.",
    inputSchema: emptySchema(),
  },
  {
    name: "kite_positions",
    description: "Fetch current day and net positions from the Zerodha portfolio.",
    inputSchema: emptySchema(),
  },
  {
    name: "kite_ltp",
    description: "Fetch last traded prices for instruments such as NSE:INFY or BSE:SENSEX.",
    inputSchema: instrumentsSchema(),
  },
  {
    name: "kite_ohlc",
    description: "Fetch OHLC snapshots for instruments such as NSE:INFY or NSE:NIFTY 50.",
    inputSchema: instrumentsSchema(),
  },
  {
    name: "kite_quote",
    description: "Fetch full market quote snapshots for instruments such as NSE:INFY.",
    inputSchema: instrumentsSchema(),
  },
];

const handlers = {
  kite_login_url: async (args = {}) => {
    const apiKey = requiredEnv("KITE_API_KEY");
    const url = new URL(KITE_LOGIN_BASE);
    url.searchParams.set("v", "3");
    url.searchParams.set("api_key", apiKey);
    if (args.redirect_params) {
      url.searchParams.set("redirect_params", args.redirect_params);
    }
    return {
      login_url: url.toString(),
      note: "Open this URL in your browser. After login, copy only the request_token query parameter from the redirect URL.",
    };
  },
  kite_generate_session: async ({ request_token: requestToken }) => {
    const apiKey = requiredEnv("KITE_API_KEY");
    const apiSecret = requiredEnv("KITE_API_SECRET");
    const checksum = crypto
      .createHash("sha256")
      .update(`${apiKey}${requestToken}${apiSecret}`)
      .digest("hex");

    const response = await kitePublicRequest("/session/token", {
      method: "POST",
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
      }),
    });

    const session = {
      api_key: apiKey,
      access_token: response.data.access_token,
      public_token: response.data.public_token,
      user_id: response.data.user_id,
      user_name: response.data.user_name,
      login_time: response.data.login_time,
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 });

    return {
      status: response.status,
      data: redactSession(response.data),
      saved_session_file: SESSION_FILE,
      note: "Access token saved locally. It generally expires around 6 AM India time.",
    };
  },
  kite_profile: async () => kiteRequest("/user/profile"),
  kite_margins: async (args = {}) => kiteRequest(args.segment ? `/user/margins/${args.segment}` : "/user/margins"),
  kite_holdings: async () => kiteRequest("/portfolio/holdings"),
  kite_positions: async () => kiteRequest("/portfolio/positions"),
  kite_ltp: async (args) => kiteRequest(`/quote/ltp${instrumentQuery(args.instruments)}`),
  kite_ohlc: async (args) => kiteRequest(`/quote/ohlc${instrumentQuery(args.instruments)}`),
  kite_quote: async (args) => kiteRequest(`/quote${instrumentQuery(args.instruments)}`),
};

function emptySchema() {
  return {
    type: "object",
    properties: {},
    additionalProperties: false,
  };
}

function instrumentsSchema() {
  return {
    type: "object",
    properties: {
      instruments: {
        type: "array",
        minItems: 1,
        maxItems: 500,
        items: {
          type: "string",
          pattern: "^[A-Z]+:.+",
        },
        description: "Array of exchange:tradingsymbol values, for example [\"NSE:INFY\", \"NSE:NIFTY 50\"].",
      },
    },
    required: ["instruments"],
    additionalProperties: false,
  };
}

function instrumentQuery(instruments) {
  if (!Array.isArray(instruments) || instruments.length === 0) {
    throw new Error("instruments must be a non-empty array.");
  }
  const params = new URLSearchParams();
  for (const instrument of instruments) {
    params.append("i", instrument);
  }
  return `?${params.toString()}`;
}

async function kiteRequest(endpoint, options = {}) {
  const { apiKey, accessToken } = getSession();
  const headers = {
    "X-Kite-Version": "3",
    Authorization: `token ${apiKey}:${accessToken}`,
    ...(options.headers || {}),
  };
  return requestJson(`${KITE_API_BASE}${endpoint}`, { ...options, headers });
}

async function kitePublicRequest(endpoint, options = {}) {
  const headers = {
    "X-Kite-Version": "3",
    ...(options.headers || {}),
  };
  return requestJson(`${KITE_API_BASE}${endpoint}`, { ...options, headers });
}

async function requestJson(url, options) {
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

function getSession() {
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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env or the MCP server environment.`);
  }
  return value;
}

function redactSession(data) {
  const clone = { ...data };
  for (const key of ["access_token", "public_token", "refresh_token", "enctoken"]) {
    if (clone[key]) clone[key] = "[redacted]";
  }
  return clone;
}

function loadDotEnv(filePath) {
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

function textContent(value) {
  return [
    {
      type: "text",
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ];
}

async function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "zerodha-kite-mcp",
        version: "0.1.0",
      },
    };
  }

  if (message.method === "notifications/initialized") {
    return undefined;
  }

  if (message.method === "tools/list") {
    return { tools };
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    const handler = handlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await handler(args);
    return {
      content: textContent(result),
    };
  }

  throw new Error(`Unsupported method: ${message.method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    send({
      jsonrpc: "2.0",
      error: { code: -32700, message: `Parse error: ${error.message}` },
      id: null,
    });
    return;
  }

  try {
    const result = await handleRequest(message);
    if (message.id !== undefined && result !== undefined) {
      send({ jsonrpc: "2.0", id: message.id, result });
    }
  } catch (error) {
    if (message.id !== undefined) {
      send({
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32000,
          message: error.message,
          data: error.payload || undefined,
        },
      });
    }
  }
});
