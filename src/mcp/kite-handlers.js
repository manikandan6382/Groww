import crypto from "node:crypto";
import fs from "node:fs";
import {
  KITE_LOGIN_BASE,
  SESSION_FILE,
  requiredEnv,
  kiteRequest,
  kitePublicRequest,
  instrumentQuery,
  redactSession,
} from "./kite-client.js";

export const handlers = {
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
