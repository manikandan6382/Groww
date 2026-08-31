import https from "node:https";

export class TelegramNotifier {
  constructor(options = {}) {
    this.botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN || "";
    this.chatId = options.chatId || process.env.TELEGRAM_CHAT_ID || "";
  }

  isConfigured() {
    return Boolean(this.botToken && this.chatId);
  }

  async send(text) {
    if (!this.isConfigured()) {
      return { sent: false, reason: "not_configured" };
    }

    const payload = JSON.stringify({
      chat_id: this.chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.telegram.org",
          path: `/bot${this.botToken}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
          timeout: 5000,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({ sent: res.statusCode === 200, statusCode: res.statusCode, body });
          });
        }
      );

      req.on("error", (err) => {
        console.warn("Telegram dispatch error:", err.message);
        resolve({ sent: false, error: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ sent: false, error: "timeout" });
      });

      req.write(payload);
      req.end();
    });
  }

  async notifyTargetHit(trade, tick, result) {
    const symbol = trade.symbol || "OPTION";
    const netPnl = result?.trade?.netPnl ?? ((tick.ltp - trade.entryPrice) * (trade.lotSize || 25));
    const pnlFormatted = netPnl >= 0 ? `+₹${netPnl.toLocaleString("en-IN")}` : `-₹${Math.abs(netPnl).toLocaleString("en-IN")}`;
    
    const msg = [
      `🎯 *TARGET HIT — PortfolioX Alert*`,
      ``,
      `*Contract:* \`${symbol}\``,
      `*Exit Price:* \`₹${Number(tick.ltp).toFixed(2)}\``,
      `*Entry Price:* \`₹${Number(trade.entryPrice).toFixed(2)}\``,
      `*Net Return:* *${pnlFormatted}*`,
      `*Time:* \`${new Date().toLocaleTimeString("en-IN")}\``,
      ``,
      `_Automated execution locked by Quantitative Paper Engine._`,
    ].join("\n");

    return this.send(msg);
  }

  async notifyStopLossHit(trade, tick, result) {
    const symbol = trade.symbol || "OPTION";
    const netPnl = result?.trade?.netPnl ?? ((tick.ltp - trade.entryPrice) * (trade.lotSize || 25));
    const pnlFormatted = netPnl >= 0 ? `+₹${netPnl.toLocaleString("en-IN")}` : `-₹${Math.abs(netPnl).toLocaleString("en-IN")}`;

    const msg = [
      `🛑 *STOP-LOSS TRIGGERED — Risk Guard Cut*`,
      ``,
      `*Contract:* \`${symbol}\``,
      `*Exit Price:* \`₹${Number(tick.ltp).toFixed(2)}\``,
      `*Stop-Loss Level:* \`₹${Number(trade.stopLoss).toFixed(2)}\``,
      `*Net Realized:* *${pnlFormatted}*`,
      `*Time:* \`${new Date().toLocaleTimeString("en-IN")}\``,
      ``,
      `_Strict discipline preserved. Zero hope mode._`,
    ].join("\n");

    return this.send(msg);
  }

  async notifyBreakevenLocked(trade, newStopLoss, currentLtp) {
    const symbol = trade.symbol || "OPTION";
    const msg = [
      `🛡️ *BREAKEVEN LOCKED — Free Trade Protected*`,
      ``,
      `*Contract:* \`${symbol}\``,
      `*Current LTP:* \`₹${Number(currentLtp).toFixed(2)}\``,
      `*New Stop-Loss:* \`₹${Number(newStopLoss).toFixed(2)}\` *(+0.50 pt profit lock)*`,
      `*Time:* \`${new Date().toLocaleTimeString("en-IN")}\``,
      ``,
      `_Trade risk eliminated. Letting runners compound._`,
    ].join("\n");

    return this.send(msg);
  }
}

export const telegramNotifier = new TelegramNotifier();
