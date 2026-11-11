/**
 * PORTFOLIOX - Research Data Availability & Capability Audit Module
 * Phase 5.2A: Research Dataset Expansion & Research-Readiness Gate
 *
 * STRICT GOVERNANCE:
 * - RESEARCH_DATA_STATUS: PARTIAL
 * - EDGE_STATUS: NOT_VALIDATED
 * - BACKTEST_PROFITABILITY_CLAIMS: DISABLED
 * - LIVE_ORDER_ROUTING: DISABLED
 */

export const GOVERNANCE_STATUS = Object.freeze({
  RESEARCH_DATA_STATUS: "PARTIAL",
  EDGE_STATUS: "NOT_VALIDATED",
  BACKTEST_PROFITABILITY_CLAIMS: "DISABLED",
  LIVE_ORDER_ROUTING: "DISABLED",
  PAPER_TRADES_ROLE: "SYSTEM_VALIDATION_ONLY"
});

/**
 * 5.2A - Legitimate Historical Data Sources Inventory
 */
export const HISTORICAL_SOURCES_INVENTORY = [
  {
    provider: "Upstox V2 API (Interactive Broker Integration)",
    product: "Historical Candle API (/v2/historical-candle & /v2/expired-instruments)",
    account_plan: "Standard Developer (Non-Plus, User: 5XCCT5)",
    instrument_coverage: "NSE Equity, NSE Indices, Active NSE F&O Contracts",
    expiry_coverage: "Current active near/next month expiries only; past expiries restricted",
    timeframe_coverage: "1minute, 30minute, day, week, month",
    earliest_supported_date: "Spot/Index: ~1-2 years back; Expired Options: Unavailable/Restricted",
    latest_supported_date: "Current live market date (T-0)",
    expired_contract_support: "UNAVAILABLE (Standard Plan returns 400 UDAPI1021/UDAPI100011; Requires Upstox Plus add-on)",
    active_contract_support: "AVAILABLE (Accessible via numeric instrument token while contract is live)",
    option_ohlc_availability: "AVAILABLE for active contracts; UNAVAILABLE for expired contracts",
    volume_availability: "AVAILABLE (contract trade volume per bar)",
    oi_availability: "UNAVAILABLE in historical 1-minute candle tuples (EOD only)",
    bid_ask_availability: "UNAVAILABLE (No historical L2 order book depth)",
    tick_availability: "UNAVAILABLE (No historical trade tick feed)",
    greeks_availability: "UNAVAILABLE (Snapshot option chain only; zero historical timeseries)",
    iv_availability: "UNAVAILABLE (No historical IV surface)",
    rate_limits: "30 requests/second per app; 500 requests/minute",
    retention_limits: "Active contract lifetime; pruned immediately upon expiry from standard endpoints",
    licensing_restrictions: "Personal non-commercial trading account API; prohibited from redistribution"
  },
  {
    provider: "PortfolioX Local Verified Research Cache",
    product: "Static Disk JSON Datasets (data/research/datasets/)",
    account_plan: "Internal Engineering Repository",
    instrument_coverage: "BANKNIFTY 24-SEP-2026 54200 CE, NIFTY 24550 CE (Sample Slices)",
    expiry_coverage: "Single-session historical slices (e.g. 2026-09-24, 2026-10-08)",
    timeframe_coverage: "1-minute OHLCV",
    earliest_supported_date: "2026-09-24 09:15:00 IST",
    latest_supported_date: "2026-10-08 15:39:00 IST",
    expired_contract_support: "AVAILABLE (Pre-captured static slices)",
    active_contract_support: "N/A (Historical offline research)",
    option_ohlc_availability: "AVAILABLE (High-fidelity verified 1-minute bars)",
    volume_availability: "AVAILABLE (Subject to 60.31% zero-volume liquidity realities)",
    oi_availability: "PARTIAL (Captured where available; zero-filled on illiquid bars)",
    bid_ask_availability: "UNAVAILABLE (No intra-bar quotes)",
    tick_availability: "UNAVAILABLE (Aggregated 1-minute bars only)",
    greeks_availability: "UNAVAILABLE (Static counterfactual approximations only)",
    iv_availability: "UNAVAILABLE",
    rate_limits: "Unrestricted local disk read",
    retention_limits: "Local disk persistence",
    licensing_restrictions: "Internal research validation only"
  },
  {
    provider: "NSE India Public Archives (Bhavcopy)",
    product: "Daily F&O Bhavcopy Reports (.csv.zip)",
    account_plan: "Public Open Data (NSE Official Website)",
    instrument_coverage: "All NSE Index & Equity Derivatives contracts traded",
    expiry_coverage: "All historical expiries (Multi-year coverage)",
    timeframe_coverage: "1-Day (Daily EOD summary only)",
    earliest_supported_date: "Year 2000+",
    latest_supported_date: "Previous trading day (T-1)",
    expired_contract_support: "AVAILABLE (Complete historical contract records)",
    active_contract_support: "AVAILABLE (EOD T-1)",
    option_ohlc_availability: "AVAILABLE at 1-Day resolution; UNAVAILABLE at intraday/1-minute",
    volume_availability: "AVAILABLE (Total daily volume)",
    oi_availability: "AVAILABLE (Daily closing OI & change in OI)",
    bid_ask_availability: "UNAVAILABLE",
    tick_availability: "UNAVAILABLE",
    greeks_availability: "UNAVAILABLE",
    iv_availability: "UNAVAILABLE (Daily settlement price only)",
    rate_limits: "Web scraping CAPTCHA / IP rate throttles",
    retention_limits: "Permanent historical archive",
    licensing_restrictions: "Public domain for educational/personal review; proprietary redist restrictions"
  }
];

/**
 * 5.2B - Empirical API Retrieval Probe Results
 */
export const EMPIRICAL_PROBE_RESULTS = Object.freeze({
  probe_timestamp: "2026-10-08T06:02:28.259Z",
  account_user_id: "5XCCT5",
  account_plan: "Standard (Non-Plus)",
  is_plus_plan: false,
  probes: [
    {
      category: "Spot / Index Historical 1-Minute",
      target: "NSE_INDEX|Nifty 50",
      endpoint: "/v2/historical-candle/NSE_INDEX%7CNifty%2050/1minute/2026-10-08/2026-10-01",
      http_status: 200,
      returned_bars: 1500,
      status: "AVAILABLE",
      notes: "Clean continuous 1-minute bars; zero-volume by cash index definition."
    },
    {
      category: "Active Option Historical 1-Minute",
      target: "Current Week Option Contract",
      endpoint: "/v2/historical-candle/{numeric_token}/1minute/...",
      http_status: 200,
      returned_bars: "Varies (Active duration)",
      status: "AVAILABLE",
      notes: "Accessible while contract is actively listed in daily instruments master."
    },
    {
      category: "Expired Option Historical 1-Minute (Standard Endpoint)",
      target: "NSE_FO|NIFTY26OCT24800CE / NSE_FO|NIFTY26SEP24800CE",
      endpoint: "/v2/historical-candle/NSE_FO%7C.../1minute/...",
      http_status: 400,
      returned_bars: 0,
      error_code: "UDAPI100011",
      error_message: "Invalid Instrument key",
      status: "UNAVAILABLE",
      notes: "Instrument key pruned immediately upon expiry from standard candle endpoints."
    },
    {
      category: "Expired Option Historical 1-Minute (Expired Instruments Endpoint)",
      target: "NSE_FO|NIFTY26SEP24800CE",
      endpoint: "/v2/expired-instruments/historical-candle/NSE_FO%7C.../1minute/...",
      http_status: 400,
      returned_bars: 0,
      error_code: "UDAPI1021",
      error_message: "Instrument key is of invalid format (Restricted for Standard plan)",
      status: "UNAVAILABLE",
      notes: "Requires Upstox Developer Plus plan subscription or specific proprietary key format."
    },
    {
      category: "Historical Option Chain & Greeks Timeseries",
      target: "NSE_INDEX|Nifty 50 Historical Greeks",
      endpoint: "N/A (Endpoint does not exist in Upstox V2 API specification)",
      http_status: null,
      returned_bars: 0,
      status: "UNAVAILABLE",
      notes: "Upstox provides snapshot Greeks for current live session only; zero historical archive."
    },
    {
      category: "Intra-Bar Tick Data & Level 2 Depth",
      target: "Historical Level 2 Bid/Ask Quotes",
      endpoint: "N/A (Endpoint does not exist in standard REST API)",
      http_status: null,
      returned_bars: 0,
      status: "UNAVAILABLE",
      notes: "REST API only emits 1-minute OHLCV summaries; intra-bar quote stream is not archived."
    }
  ]
});

/**
 * 5.2C - Contract Universe Historical Reconstruction Audit
 */
export const CONTRACT_UNIVERSE_AUDIT = Object.freeze({
  daily_master_present: true,
  daily_master_path: "data/upstox-instruments.json",
  daily_master_size_bytes: 37340794,
  can_reconstruct_active_contracts: true,
  can_reconstruct_historical_expired_contracts: false,
  reconstruction_failure_reasons: [
    "The daily instruments master (upstox-instruments.json) only contains contracts alive on the download date.",
    "NSE numeric exchange tokens (exchange_token) are re-used across different expiries over multi-year cycles.",
    "Without daily archived instruments snapshots, past strike-to-token mappings cannot be derived deterministically.",
    "Regulatory contract specification shifts (e.g., lot size changes: Bank Nifty 25 -> 15 -> 30; Nifty 50 -> 25 -> 75) require an authoritative historical contract master."
  ],
  reconstruction_feasibility: "PARTIAL (Requires daily archived instrument masters or static metadata catalog)"
});

/**
 * 5.2D - Research Question Support Matrix
 */
export const RESEARCH_QUESTION_SUPPORT_MATRIX = [
  {
    question_id: 1,
    question_name: "Basic Stop-Model Mechanics",
    required_data: "Single-contract 1-minute OHLC bars with execution fill simulation",
    available: true,
    current_limitation: "Conservative STOP_FIRST resolution due to 1-minute intra-bar ambiguity",
    status: "SUPPORTED"
  },
  {
    question_id: 2,
    question_name: "Multi-Day Testing",
    required_data: "Continuous multi-day 1-minute bars across overnight session boundaries",
    available: false,
    current_limitation: "Upstox Standard plan cannot retrieve expired contracts across prior weeks",
    status: "BLOCKED"
  },
  {
    question_id: 3,
    question_name: "Multi-Expiry Testing",
    required_data: "Simultaneous 1-minute feeds across weekly and monthly option expiries",
    available: false,
    current_limitation: "Expired contracts unavailable; cross-expiry dataset not present",
    status: "BLOCKED"
  },
  {
    question_id: 4,
    question_name: "Multi-Regime Testing",
    required_data: "Multi-month historical data spanning high-IV (VIX > 20) and low-IV (VIX < 12) environments",
    available: false,
    current_limitation: "Available sample covers only isolated September/October 2026 sessions",
    status: "BLOCKED"
  },
  {
    question_id: 5,
    question_name: "Walk-Forward Testing",
    required_data: "Rolling in-sample and out-of-sample contiguous multi-month datasets",
    available: false,
    current_limitation: "Zero contiguous multi-month historical option dataset available",
    status: "BLOCKED"
  },
  {
    question_id: 6,
    question_name: "Out-of-Sample (OOS) Testing",
    required_data: "Strictly isolated future date partitions with zero parameter snooping",
    available: false,
    current_limitation: "Sample size too small (< 2,000 bars total) to support statistically valid holdout sets",
    status: "BLOCKED"
  },
  {
    question_id: 7,
    question_name: "Monte Carlo Permutation / Resampling",
    required_data: "Empirical distribution of hundreds of independent trade executions",
    available: false,
    current_limitation: "Insufficient sample of realized trades to construct meaningful bootstrap distributions",
    status: "BLOCKED"
  },
  {
    question_id: 8,
    question_name: "True MFE / MAE Quantification",
    required_data: "Tick-by-tick trade execution stream or high-frequency sub-second quotes",
    available: false,
    current_limitation: "1-minute bar extrema only provide bound estimates (PARTIAL); true tick paths unavailable",
    status: "PARTIALLY_SUPPORTED"
  },
  {
    question_id: 9,
    question_name: "Bid/Ask Spread Execution Modeling",
    required_data: "Level 2 top-of-book historical quotes (Best Bid, Best Ask, Depth)",
    available: false,
    current_limitation: "Upstox API provides only traded OHLC; historical bid/ask spread timeseries is completely absent",
    status: "BLOCKED"
  },
  {
    question_id: 10,
    question_name: "Gamma / IV-Aware Dynamic Modeling",
    required_data: "Synchronized historical IV surface and exchange-calibrated Greeks",
    available: false,
    current_limitation: "Historical Greeks unavailable; can only run theoretical counterfactual formula tests",
    status: "PARTIALLY_SUPPORTED"
  }
];

/**
 * 5.2E - Missing Dataset Acquisition Plan (Non-Purchasing Specification)
 */
export const DATASET_ACQUISITION_PLAN = Object.freeze({
  plan_objective: "Specify technical parameters for acquiring historical option research datasets without committing capital or connecting unverified vendors",
  specifications: {
    missing_datasets: "NSE Index Options (NIFTY & BANKNIFTY) 1-Minute Continuous Expired Contracts",
    required_date_range: "Minimum 24 months (e.g. October 2024 to October 2026) to span diverse volatility regimes",
    required_instruments: "NIFTY & BANKNIFTY At-The-Money (ATM) ± 5 Strikes (Calls and Puts)",
    required_fields: [
      "timestamp_ist",
      "open",
      "high",
      "low",
      "close",
      "volume",
      "open_interest",
      "underlying_spot_close"
    ],
    minimum_timeframe: "1-minute aggregate bars (sub-minute tick preferred for MFE/MAE)",
    required_quality: "Zero forward-looking revisions, continuous timestamp indexing, explicit zero-volume bar flagging",
    preferred_source: "Upstox Developer Plus Plan Add-on (Official broker API integration, zero format impedance)",
    acceptable_alternative: "NSE Official Historical Data Sales / SEBI-registered Authorized Data Vendor (e.g. TrueData/GlobalDataFeeds)",
    validation_requirements: [
      "Checksum verification of all downloaded monthly archives",
      "Reconciliation of daily OHLC against NSE official Bhavcopy settlement figures",
      "Verification of contract lot sizes against historical SEBI regulatory circulars",
      "Zero missing bars between 09:15 and 15:30 IST on trading days"
    ]
  },
  action_status: "SPECIFIED_ONLY_NO_PURCHASE"
});

/**
 * 5.2F - Current Honest Research Boundary
 */
export const CURRENT_RESEARCH_BOUNDARY = Object.freeze({
  SUPPORTED: [
    "Deterministic Stop-Loss / Profit-Target mechanical logic validation",
    "Execution-model slippage and statutory friction sensitivity analysis",
    "Conservative intrabar ambiguity resolution (STOP_FIRST vs TARGET_FIRST)",
    "Single-session active-contract counterfactual simulation on verified cache slices"
  ],
  PARTIALLY_SUPPORTED: [
    "MFE/MAE estimation bounded by 1-minute bar high/low (strictly labeled PARTIAL)",
    "Theoretical Greek formulas (M6) under counterfactual synthetic assumptions (NOT_HISTORICALLY_CALIBRATED)"
  ],
  BLOCKED: [
    "Statistically meaningful out-of-sample (OOS) testing",
    "Walk-forward optimization across multi-month market regimes",
    "True tick-level MAE/MFE curve reconstruction",
    "Historical Level 2 bid/ask liquidity and slippage microstructure modeling",
    "Multi-expiry / multi-strike portfolio backtesting",
    "Any claims of commercial profitability or statistical edge"
  ]
});
