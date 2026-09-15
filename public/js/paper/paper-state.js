export const paperState = {
  loaded: false,
  lab: null,
  alertFilter: "all",
  ledgerFilter: "all",
  pnlRange: "all",
};

export const optionLotSizes = {
  NIFTY: 75,
  BANKNIFTY: 35,
  FINNIFTY: 65,
  SENSEX: 20,
};

export const previewOpenAlerts = [
  { id: 56, symbol: "NIFTY 24300 CE", underlyingSymbol: "NIFTY", strikePrice: 24300, optionType: "CALL", entryDatetime: new Date().toISOString(), entryPrice: 83.0, lastMarkPrice: 88.5, targetPrice: 102.0, stopLoss: 75.0, quantity: 1, lotSize: 65, entryReason: "ATM Scalp Practice · R:R 1:2.38", personalNotes: "[SANDBOX_MANUAL] Practice Sandbox", preview: true },
  { id: 44, symbol: "BANKNIFTY 52200 PE", underlyingSymbol: "BANKNIFTY", strikePrice: 52200, optionType: "PUT", entryDatetime: new Date().toISOString(), entryPrice: 145.0, lastMarkPrice: 162.0, targetPrice: 185.0, stopLoss: 130.0, quantity: 1, lotSize: 35, entryReason: "Bearish Breakdown Scalp · R:R 1:2.67", personalNotes: "[SANDBOX_MANUAL] Practice Sandbox", preview: true },
];

export const previewClosedAlerts = [
  { id: "closed-1", symbol: "NIFTY 24200 CE", optionType: "CALL", entryDatetime: "2026-07-04T10:15", exitDatetime: "2026-07-04T10:15", entryPrice: 90.13, exitPrice: 95, targetPrice: 95, stopLoss: 75, netPnl: 365, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-2", symbol: "BANKNIFTY 52100 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:58", exitDatetime: "2026-07-04T09:58", entryPrice: 247.19, exitPrice: 240, targetPrice: 210, stopLoss: 240, netPnl: -251.5, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-3", symbol: "NIFTY 24300 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:41", exitDatetime: "2026-07-04T09:41", entryPrice: 114.4, exitPrice: 120, targetPrice: 120, stopLoss: 100, netPnl: 420, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-4", symbol: "NIFTY 24100 CE", optionType: "CALL", entryDatetime: "2026-07-04T09:22", exitDatetime: "2026-07-04T09:22", entryPrice: 86.27, exitPrice: 90, targetPrice: 90, stopLoss: 70, netPnl: 280, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-5", symbol: "BANKNIFTY 51900 PE", optionType: "PUT", entryDatetime: "2026-07-04T09:05", exitDatetime: "2026-07-04T09:05", entryPrice: 205.29, exitPrice: 200, targetPrice: 180, stopLoss: 200, netPnl: -185, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-6", symbol: "NIFTY 24200 CE", optionType: "CALL", entryDatetime: "2026-07-03T14:15", exitDatetime: "2026-07-03T14:15", entryPrice: 86.33, exitPrice: 95, targetPrice: 95, stopLoss: 70, netPnl: 650, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
  { id: "closed-7", symbol: "BANKNIFTY 52100 PE", optionType: "PUT", entryDatetime: "2026-07-02T13:30", exitDatetime: "2026-07-02T13:30", entryPrice: 247.85, exitPrice: 240, targetPrice: 205, stopLoss: 240, netPnl: -275, closeReason: "STOP_LOSS_HIT", quantity: 1, lotSize: 35, preview: true },
  { id: "closed-8", symbol: "NIFTY 24400 CE", optionType: "CALL", entryDatetime: "2026-07-01T11:10", exitDatetime: "2026-07-01T11:10", entryPrice: 76.7, exitPrice: 80, targetPrice: 80, stopLoss: 62, netPnl: 247.25, closeReason: "TARGET_HIT", quantity: 1, lotSize: 75, preview: true },
];

export const previewDisplay = {
  active: 3,
  triggeredToday: 2,
  totalPnl: 1250.75,
  pnlPct: 1.27,
  winRate: 64.29,
  wins: 9,
  losses: 5,
  totalTrades: 14,
};

export const previewFeedAlerts = [
  { tone: "win", title: "Target Hit", detail: "NIFTY 24200 CE", badge: "Target ₹95.00 hit", time: "10:15 AM", pnl: 365 },
  { tone: "loss", title: "Stop Loss Hit", detail: "BANKNIFTY 52100 PE", badge: "Stop loss ₹240.00 hit", time: "09:58 AM", pnl: -251.5 },
  { tone: "active", title: "Watching", detail: "NIFTY 24500 CE", badge: "LTP ₹30.75", time: "10:25 AM", pnl: 0 },
  { tone: "win", title: "Target Hit", detail: "NIFTY 24300 PE", badge: "Target ₹120.00 hit", time: "09:41 AM", pnl: 420 },
  { tone: "risk", title: "Vol Spike", detail: "BANKNIFTY 52000 PE", badge: "Volume 2.4x avg", time: "10:22 AM", pnl: 0 },
  { tone: "muted", title: "Alert Muted", detail: "NIFTY 24400 CE", badge: "Muted by user", time: "09:30 AM", pnl: 0 },
];

export const paperRuntime = {
  paperSse: null,
  isDeployingOrder: false,
  isSquaringOff: false,
  isAutoDeploying: false,
  isSlippageSimulationEnabled: false,
  simulationInterval: null,
};
