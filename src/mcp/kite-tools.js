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
        description: 'Array of exchange:tradingsymbol values, for example ["NSE:INFY", "NSE:NIFTY 50"].',
      },
    },
    required: ["instruments"],
    additionalProperties: false,
  };
}

export const tools = [
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
