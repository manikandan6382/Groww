export function normalizeTick(message) {
  const ltp = Number(message.lp || message.ltp || message.c || 0);
  const token = String(message.tk || message.token || "").trim();
  const exchange = String(message.e || message.exch || "NFO").trim() || "NFO";
  if (!token || !Number.isFinite(ltp) || ltp <= 0) return null;
  return {
    exchange,
    token,
    key: `${exchange}|${token}`,
    ltp,
    raw: message,
    receivedAt: new Date().toISOString(),
  };
}

export function normalizeSubscriptionKey(key) {
  const text = String(key || "").trim().toUpperCase();
  if (!text) return "";
  if (text.includes("|")) return text;
  return `NFO|${text}`;
}

export function getManualToken(trade) {
  const notes = `${trade.personalNotes || ""} ${trade.entryReason || ""}`;
  const match = notes.match(/(?:SHOONYA_TOKEN|TOKEN)\s*[:=]\s*([A-Z]+[|])?(\d+)/i);
  if (!match) return null;
  return `${match[1] ? match[1].replace("|", "").toUpperCase() : "NFO"}|${match[2]}`;
}

export function buildShoonyaSearchText(trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = Number(trade.strikePrice || 0);
  const side = toShoonyaSide(trade.optionType);
  if (!underlying || !strike || !side) return "";
  return `${underlying} ${strike} ${side}`;
}

export function toShoonyaSide(optionType) {
  const value = String(optionType || "").toUpperCase();
  if (value === "CALL" || value === "CE") return "CE";
  if (value === "PUT" || value === "PE") return "PE";
  return "";
}

export function chooseOptionSearchMatch(rows, trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = String(Number(trade.strikePrice || 0));
  const side = toShoonyaSide(trade.optionType);
  const expiry = normalizeDateFragment(trade.expiryDate);
  const candidates = rows
    .map((row) => ({
      token: row.token || row.tk || row.instrument_token,
      text: `${row.tsym || ""} ${row.dname || ""} ${row.cname || ""}`.toUpperCase(),
      raw: row,
    }))
    .filter((row) => row.token && row.text.includes(underlying) && row.text.includes(strike) && row.text.includes(side));

  if (!candidates.length) return null;
  if (!expiry) return candidates[0];
  return candidates.find((row) => normalizeDateFragment(row.text).includes(expiry)) || candidates[0];
}

export function normalizeDateFragment(value) {
  if (!value) return "";
  const text = String(value).toUpperCase();
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return text.replace(/[^A-Z0-9]/g, "");
  const [, year, month, day] = dateMatch;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${day}${months[Number(month) - 1]}${year.slice(2)}`;
}
