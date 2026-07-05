# Zerodha Kite MCP

Local read-only MCP server for Zerodha Kite Connect. It exposes portfolio and market-data tools to Codex/ChatGPT without storing your Zerodha password, PIN, OTP, PAN, or bank details.

## What This Server Can Do

- Generate your Kite login URL.
- Exchange the daily `request_token` for an `access_token`.
- Read your Kite profile, margins, holdings, and positions.
- Read LTP, OHLC, and full market quotes.
- Show a local dashboard with Zerodha portfolio data, Yahoo reference charts, and optional Alpha Vantage foreign-market research data.

It does **not** place, modify, or cancel orders.

## Setup

1. Create a Kite Connect app at [developers.kite.trade](https://developers.kite.trade/).
2. In that app, set a redirect URL. For local/manual use, something like `http://127.0.0.1:3000/kite/callback` is fine even if no server is listening.
3. Copy `.env.example` to `.env`.
4. Put your `KITE_API_KEY` and `KITE_API_SECRET` in `.env`.
5. Optional: add `ALPHA_VANTAGE_API_KEY` to enable the Foreign Investing Radar card.
6. Start the MCP server:

```powershell
npm start
```

## Dashboard

Start the premium local dashboard:

```powershell
npm.cmd run dashboard
```

Then open:

```text
http://127.0.0.1:3000
```

Dashboard data sources:

- Zerodha Kite: real Indian holdings, margins, P&L, allocation, and risk.
- Yahoo reference endpoints: Indian market overview and NIFTY 50 chart reference.
- Alpha Vantage: foreign investing radar for research symbols such as AAPL, MSFT, NVDA, and QQQ.
- Watchlist search: searches NSE/BSE stocks from the Kite instrument master when available, then saves selected symbols in browser storage and fetches free Yahoo reference quotes only for those saved symbols.

Keep `TRADING_MODE=read_only` unless you intentionally build and audit order-placement flows later.

## Daily Login Flow

Kite access tokens expire around 6 AM India time, so do this each trading day:

1. Ask the MCP tool `kite_login_url` for the login URL.
2. Open that URL in your browser and complete Zerodha login.
3. After redirect, copy only the `request_token` query parameter from the redirected URL.
4. Call `kite_generate_session` with that `request_token`.
5. Use the read-only tools such as `kite_holdings`, `kite_positions`, and `kite_margins`.

Do not paste your Zerodha password, PIN, OTP, API secret, PAN, or bank details into chat.

## Codex MCP Config Example

Add this server to your Codex MCP configuration using the absolute path to this folder:

```json
{
  "mcpServers": {
    "zerodha-kite": {
      "command": "node",
      "args": [
        "C:\\Users\\LAP-249\\Documents\\Projects\\finance\\src\\server.js"
      ],
      "env": {
        "KITE_SESSION_FILE": "C:\\Users\\LAP-249\\Documents\\Projects\\finance\\.zerodha-session.json"
      }
    }
  }
}
```

The server also loads `.env` from this folder, so you do not need to put `KITE_API_SECRET` in the MCP config.

## Available Tools

- `kite_login_url`
- `kite_generate_session`
- `kite_profile`
- `kite_margins`
- `kite_holdings`
- `kite_positions`
- `kite_ltp`
- `kite_ohlc`
- `kite_quote`

## Quick Smoke Test

This validates the local MCP protocol shape without contacting Zerodha:

```powershell
npm run smoke
```
