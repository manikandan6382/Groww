export function isMarketOpenNow(date = new Date()) {
  const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
}

export function isSessionExpiredError(error) {
  return /session|token|jkey|invalid|expired/i.test(String(error?.message || ""));
}
