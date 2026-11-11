/**
 * Strict Order Payload Validator
 * Validates incoming order requests to prevent invalid inputs, NaN, negative quantities,
 * and upside-down Stop Loss / Target configurations.
 */

export function validateOrderPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a valid JSON object."], sanitized: null };
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!symbol || symbol.length > 50) {
    errors.push("Field 'symbol' is required and must be a string under 50 characters.");
  }

  const entryPrice = Number(body.entryPrice);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    errors.push("Field 'entryPrice' must be a strictly positive number.");
  }

  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
    errors.push("Field 'quantity' must be an integer between 1 and 1000 lots.");
  }

  const direction = String(body.direction || "LONG").toUpperCase();
  if (!["LONG", "SHORT"].includes(direction)) {
    errors.push("Field 'direction' must be either 'LONG' or 'SHORT'.");
  }

  let stopLoss = null;
  if (body.stopLoss !== undefined && body.stopLoss !== null && body.stopLoss !== "") {
    const parsedSl = Number(body.stopLoss);
    if (!Number.isFinite(parsedSl) || parsedSl <= 0) {
      errors.push("Field 'stopLoss' must be a positive number if provided.");
    } else {
      stopLoss = parsedSl;
    }
  }

  let targetPrice = null;
  if (body.targetPrice !== undefined && body.targetPrice !== null && body.targetPrice !== "") {
    const parsedTp = Number(body.targetPrice);
    if (!Number.isFinite(parsedTp) || parsedTp <= 0) {
      errors.push("Field 'targetPrice' must be a positive number if provided.");
    } else {
      targetPrice = parsedTp;
    }
  }

  // Cross-field logic (Bypassed in Testing Mode for full freedom)
  const isTesting = Boolean(body.testingMode || body.bypassRiskCap);
  if (!isTesting && Number.isFinite(entryPrice) && entryPrice > 0) {
    if (direction === "LONG") {
      if (stopLoss !== null && stopLoss >= entryPrice) {
        errors.push(`For LONG trades, stopLoss (₹${stopLoss}) must be lower than entryPrice (₹${entryPrice}).`);
      }
      if (targetPrice !== null && targetPrice <= entryPrice) {
        errors.push(`For LONG trades, targetPrice (₹${targetPrice}) must be higher than entryPrice (₹${entryPrice}).`);
      }
    } else if (direction === "SHORT") {
      if (stopLoss !== null && stopLoss <= entryPrice) {
        errors.push(`For SHORT trades, stopLoss (₹${stopLoss}) must be higher than entryPrice (₹${entryPrice}).`);
      }
      if (targetPrice !== null && targetPrice >= entryPrice) {
        errors.push(`For SHORT trades, targetPrice (₹${targetPrice}) must be lower than entryPrice (₹${entryPrice}).`);
      }
    }
  }

  let lotSize = Number.isInteger(Number(body.lotSize)) && Number(body.lotSize) > 1 ? Number(body.lotSize) : null;
  if (!lotSize) {
    const symUpper = (symbol || String(body.underlyingSymbol || "")).toUpperCase();
    if (symUpper.includes("BANKNIFTY")) lotSize = 30;
    else if (symUpper.includes("FINNIFTY")) lotSize = 65;
    else if (symUpper.includes("MIDCPNIFTY")) lotSize = 75;
    else if (symUpper.includes("SENSEX")) lotSize = 20;
    else if (symUpper.includes("NIFTY")) lotSize = 65;
    else lotSize = 1;
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }

  return {
    valid: true,
    errors: null,
    sanitized: {
      ...body,
      symbol,
      entryPrice,
      quantity,
      direction,
      stopLoss,
      targetPrice,
      lotSize
    }
  };
}
