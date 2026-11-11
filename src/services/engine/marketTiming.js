import { defaultExchangeCalendar } from "./exchangeCalendar.js";

export function isMarketOpenNow(date = new Date()) {
  const dayCheck = defaultExchangeCalendar.isTradingDay(date);
  if (!dayCheck.isTradingDay) return false;

  const ist = defaultExchangeCalendar.getIstParts(date);
  if (!ist) return false;

  const minutes = ist.totalMinutes;
  const [closeH, closeM] = (dayCheck.sessionHours?.close || "15:40").split(":").map(Number);
  const [openH, openM] = (dayCheck.sessionHours?.open || "09:15").split(":").map(Number);
  return minutes >= openH * 60 + openM && minutes <= closeH * 60 + closeM;
}

export function isSessionExpiredError(error) {
  return /session|token|jkey|invalid|expired/i.test(String(error?.message || ""));
}
