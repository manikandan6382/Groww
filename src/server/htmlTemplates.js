export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderUpstoxCallbackHtml({ isError, tokenSaved, error, status, retryAuthUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tokenSaved ? '<meta http-equiv="refresh" content="2;url=/practice?connected=upstox" />' : ""}
    <title>Upstox Pro Authentication - PortfolioX</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, #110d2e 0%, #030712 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; padding: 16px; }
      main { width: min(540px, 100%); border: 1px solid rgba(168,85,247,0.25); border-radius: 24px; padding: 32px; background: rgba(15,23,42,0.85); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.15); text-align: center; }
      .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-monospace, monospace; }
      .pill.success { color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
      .pill.error { color: #f87171; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
      h1 { margin: 18px 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
      p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin: 0 0 20px; }
      .countdown { font-size: 13px; color: #a855f7; font-weight: 600; margin-bottom: 24px; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; transition: all 0.15s ease; cursor: pointer; }
      .btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; box-shadow: 0 4px 14px rgba(168,85,247,0.35); }
      .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
      .btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
      .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>
  </head>
  <body>
    <main>
      <span class="pill ${isError ? "error" : "success"}">
        ${isError ? "Authentication Issue" : tokenSaved ? "Upstox Live Active" : "Authorization Received"}
      </span>
      <h1>${isError ? "Connection Needs Attention" : tokenSaved ? "Upstox Feed Ready" : "OAuth Code Received"}</h1>
      <p>${isError ? escapeHtml(error || status) : escapeHtml(status || "OAuth code verified. Session credentials saved successfully.")}</p>
      ${tokenSaved ? '<div class="countdown">Redirecting to Practice Lab in <span id="cd">2</span>s...</div>' : ""}
      <div class="actions">
        ${tokenSaved ? `
          <a href="/practice?connected=upstox" class="btn btn-primary">Open Practice Cockpit</a>
          <a href="/?connected=upstox" class="btn btn-secondary">Portfolio View</a>
        ` : `
          <a href="${retryAuthUrl}" class="btn btn-primary">Retry Upstox Login</a>
          <a href="/practice" class="btn btn-secondary">Return to Cockpit</a>
        `}
      </div>
    </main>
    ${tokenSaved ? `
    <script>
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'UPSTOX_AUTH_SUCCESS' }, window.location.origin);
          setTimeout(() => { window.close(); }, 500);
        } catch (e) {}
      }
      let c = 2;
      const el = document.getElementById("cd");
      const it = setInterval(() => {
        c--;
        if (el) el.textContent = c;
        if (c <= 0) {
          clearInterval(it);
          window.location.replace("/practice?connected=upstox");
        }
      }, 1000);
    </script>
    ` : ""}
  </body>
</html>`;
}

export function renderKiteCallbackHtml({ isError, tokenSaved, message, retryAuthUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tokenSaved ? '<meta http-equiv="refresh" content="2;url=/practice?connected=kite" />' : ""}
    <title>Zerodha Kite Authentication - PortfolioX</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, #171109 0%, #030712 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; padding: 16px; }
      main { width: min(540px, 100%); border: 1px solid rgba(249,115,22,0.3); border-radius: 24px; padding: 32px; background: rgba(15,23,42,0.85); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(249,115,22,0.15); text-align: center; }
      .pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: ui-monospace, monospace; }
      .pill.success { color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
      .pill.error { color: #f87171; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
      h1 { margin: 18px 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
      p { color: #94a3b8; line-height: 1.6; font-size: 14px; margin: 0 0 20px; }
      .countdown { font-size: 13px; color: #f97316; font-weight: 600; margin-bottom: 24px; }
      .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 22px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; transition: all 0.15s ease; cursor: pointer; }
      .btn-primary { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; box-shadow: 0 4px 14px rgba(249,115,22,0.35); }
      .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
      .btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); }
      .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>
  </head>
  <body>
    <main>
      <span class="pill ${isError ? "error" : "success"}">
        ${isError ? "Zerodha Issue" : tokenSaved ? "Zerodha Kite Linked" : "Token Received"}
      </span>
      <h1>${isError ? "Authorization Needs Attention" : tokenSaved ? "Zerodha Demat Connected" : "Request Token Received"}</h1>
      <p>${escapeHtml(message || (tokenSaved ? "Your Zerodha account is authenticated. Live equity margins & positions are accessible." : "Token received, but session exchange was skipped."))}</p>
      ${tokenSaved ? '<div class="countdown">Redirecting to Practice Cockpit in <span id="cd">2</span>s...</div>' : ""}
      <div class="actions">
        ${tokenSaved ? `
          <a href="/practice?connected=kite" class="btn btn-primary">Open Practice Cockpit</a>
          <a href="/?connected=kite" class="btn btn-secondary">Portfolio View</a>
        ` : `
          <a href="${retryAuthUrl}" class="btn btn-primary">Retry Zerodha Login</a>
          <a href="/practice" class="btn btn-secondary">Return to Cockpit</a>
        `}
      </div>
    </main>
    ${tokenSaved ? `
    <script>
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'KITE_AUTH_SUCCESS' }, window.location.origin);
          setTimeout(() => { window.close(); }, 500);
        } catch (e) {}
      }
      let c = 2;
      const el = document.getElementById("cd");
      const it = setInterval(() => {
        c--;
        if (el) el.textContent = c;
        if (c <= 0) {
          clearInterval(it);
          window.location.replace("/practice?connected=kite");
        }
      }, 1000);
    </script>
    ` : ""}
  </body>
</html>`;
}
