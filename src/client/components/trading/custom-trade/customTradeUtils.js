import { soundEngine } from "../../../utils/soundEngine";

export function getInitialLocalDatetime() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// Indian statutory Upstox F&O tax estimation (Flat ₹40 Brokerage + Sell STT + GST)
export function calculateCustomTradeTaxes(entry, exit, qty, lot, direction = "LONG") {
  const pts = direction === "LONG" ? (exit - entry) : (entry - exit);
  const grossPnl = pts * qty * lot;

  const buyTurnover = entry * qty * lot;
  const sellTurnover = exit * qty * lot;
  const turnover = buyTurnover + sellTurnover;
  const brokerage = 40.0;
  const stt = sellTurnover * 0.001; // 0.1% on option sell
  const exchangeFees = turnover * 0.000505;
  const sebi = turnover * 0.000001;
  const stampDuty = buyTurnover * 0.00003;
  const gst = 0.18 * (brokerage + exchangeFees + sebi);
  const totalTaxes = Math.round((brokerage + stt + exchangeFees + stampDuty + gst) * 100) / 100;
  const netPnl = Math.round((grossPnl - totalTaxes) * 100) / 100;
  const isGain = netPnl >= 0;

  return { pts, grossPnl, totalTaxes, netPnl, isGain };
}

// 1-Click Export Full Trading Brain
export function exportFullBrainBackup(journalTrades) {
  const backupData = {
    version: "2.0.0",
    app: "PortfolioX Quantitative Terminal",
    exportTimestamp: new Date().toISOString(),
    tradeCount: (journalTrades || []).length,
    trades: journalTrades || []
  };
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", jsonStr);
  link.setAttribute("download", `portfoliox_trading_brain_backup_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  soundEngine.playSuccessTone();
}
