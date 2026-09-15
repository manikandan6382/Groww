/**
 * Strict Indian Standard Time (IST) Short Time Formatter (HH:MM AM/PM)
 */
export function formatTimeShort(dateInput) {
  if (!dateInput) return "--:--";
  try {
    const s = String(dateInput);
    const d = typeof dateInput === "number"
      ? new Date(dateInput)
      : new Date(s.includes("+") || s.includes("Z") ? s : s + "+05:30");

    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return String(dateInput).slice(11, 16) || "--:--";
  }
}
