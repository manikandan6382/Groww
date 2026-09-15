import { soundEngine } from "./soundEngine";

/**
 * Open a dedicated popup window (separate tab/window) for broker OAuth authentication.
 * Handles window dimensions, focus, and cross-window postMessage handshake.
 *
 * @param {"upstox" | "kite"} broker - Target broker
 * @param {Function} [onSuccess] - Optional callback when authentication succeeds
 * @returns {Window | null}
 */
export function openBrokerAuthPopup(broker = "upstox", onSuccess) {
  soundEngine?.playTabSwitchTone?.();

  const isUpstox = broker.toLowerCase() === "upstox";
  const loginUrl = isUpstox ? "/upstox/login" : "/kite/login";
  const windowName = isUpstox ? "UpstoxOAuthPopup" : "KiteOAuthPopup";

  const width = 600;
  const height = 740;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

  const popup = window.open(
    loginUrl,
    windowName,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
  );

  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    console.warn(`[brokerPopupAuth] Popup window blocked by browser for ${broker}.`);
    window.dispatchEvent(
      new CustomEvent("portfoliox:popup-blocked", {
        detail: { broker, loginUrl }
      })
    );
    const brokerName = isUpstox ? "Upstox Pro" : "Zerodha Kite";
    const shouldOpen = window.confirm(
      `Popup window was blocked by your browser for ${brokerName} authorization.\n\nClick OK to open the login page directly in a new tab.`
    );
    if (shouldOpen) {
      window.open(loginUrl, "_blank");
    }
    return null;
  }

  popup.focus?.();

  // Set up one-time message listener for cross-window handshake
  const messageHandler = (event) => {
    // Strict Origin Verification: only accept messages from exact same origin
    if (event.origin !== window.location.origin) return;

    const data = event.data;
    if (!data) return;

    const isMatch =
      (isUpstox && (data.type === "UPSTOX_AUTH_SUCCESS" || data.type === "BROKER_AUTH_SUCCESS")) ||
      (!isUpstox && (data.type === "KITE_AUTH_SUCCESS" || data.type === "BROKER_AUTH_SUCCESS"));

    if (isMatch) {
      window.removeEventListener("message", messageHandler);
      soundEngine?.playOrderSuccess?.() || soundEngine?.playTargetChime?.();

      if (typeof onSuccess === "function") {
        onSuccess(data);
      } else {
        // Default behavior: trigger full broker status refresh & event notification
        window.dispatchEvent(new CustomEvent("portfoliox:broker-connected", { detail: { broker } }));
      }
    }
  };

  window.addEventListener("message", messageHandler);

  // Auto clean-up listener after 5 minutes if no response
  setTimeout(() => {
    window.removeEventListener("message", messageHandler);
  }, 300000);

  return popup;
}
