import { getDb } from "./connection.js";

export function seedLast3Days() {
  const db = getDb();

  console.log("⚡ Cleaning old dummy trades and resetting margin to 100k (₹1,00,000)...");

  db.exec(`
    -- Delete all old dummy journal & paper records
    DELETE FROM trade_mistake_tags;
    DELETE FROM trade_strategy_tags;
    DELETE FROM trade_journal;
    DELETE FROM trade_executions;
    DELETE FROM trade_attachments;
    DELETE FROM review_reports;
    DELETE FROM trades;
    DELETE FROM instruments;

    -- Reset Account Capitals to ₹100,000 (100k)
    UPDATE accounts SET starting_capital = 100000, current_capital = 100000 WHERE id = 1;
    UPDATE accounts SET starting_capital = 100000, current_capital = 100000 WHERE id = 2;
  `);

  // Ensure default accounts exist
  const accounts = db.prepare("SELECT id, name FROM accounts").all();
  if (accounts.length === 0) {
    db.prepare(`INSERT INTO accounts (id, name, account_type, market, starting_capital, current_capital) VALUES (1, 'Personal Trading Account', 'REAL', 'INDIA', 100000, 100000)`).run();
    db.prepare(`INSERT INTO accounts (id, name, account_type, market, starting_capital, current_capital) VALUES (2, 'Paper Trading Lab', 'PAPER', 'INDIA', 100000, 100000)`).run();
  }

  // Insert base Strategy & Mistake Tags
  const strategies = ["1:2 Scalp Breakout", "Liquidity Sweep Fade", "Gamma Wall Rejection", "0DTE Momentum"];
  const mistakes = ["Exited Early", "Late Entry", "Chased Wick", "Oversized Lot"];

  for (const s of strategies) {
    db.prepare("INSERT OR IGNORE INTO strategy_tags (name) VALUES (?)").run(s);
  }
  for (const m of mistakes) {
    db.prepare("INSERT OR IGNORE INTO mistake_tags (name) VALUES (?)").run(m);
  }

  // Helper to ensure instrument
  function getOrInsertInstrument(symbol, underlying, optType, strike) {
    let row = db.prepare("SELECT id FROM instruments WHERE symbol = ?").get(symbol);
    if (!row) {
      const res = db.prepare(`
        INSERT INTO instruments (symbol, display_name, market, instrument_type, option_type, underlying_symbol, strike_price, lot_size)
        VALUES (?, ?, 'INDIA', 'OPTION', ?, ?, ?, 75)
      `).run(symbol, symbol, optType, underlying, strike);
      return res.lastInsertRowid;
    }
    return row.id;
  }

  // 3 Days of Clean Authentic Scalping History (Aug 18, Aug 19, Aug 20, 2026)
  const tradesData = [
    // Day 1: Aug 18, 2026 (Monday)
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24450 CE",
      underlying: "NIFTY",
      optType: "CALL",
      strike: 24450,
      direction: "LONG",
      status: "CLOSED",
      entryDatetime: "2026-08-18T09:35:00",
      exitDatetime: "2026-08-18T09:44:00",
      entryPrice: 92.00,
      exitPrice: 100.50,
      targetPrice: 100.50,
      stopLoss: 87.50,
      quantity: 1,
      lotSize: 75,
      capitalUsed: 6900.00,
      realizedPnl: 637.50,
      charges: 53.20,
      netPnl: 584.30,
      closeReason: "TARGET_HIT",
      strategy: "1:2 Scalp Breakout",
      notes: "Clean 5-min opening range breakout above 24450. Target hit in 9 mins.",
    },
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24500 PE",
      underlying: "NIFTY",
      optType: "PUT",
      strike: 24500,
      direction: "LONG",
      status: "CLOSED",
      entryDatetime: "2026-08-18T13:20:00",
      exitDatetime: "2026-08-18T13:27:00",
      entryPrice: 88.00,
      exitPrice: 83.50,
      targetPrice: 96.50,
      stopLoss: 83.50,
      quantity: 1,
      lotSize: 75,
      capitalUsed: 6600.00,
      realizedPnl: -337.50,
      charges: 51.10,
      netPnl: -388.60,
      closeReason: "STOP_LOSS_HIT",
      strategy: "Liquidity Sweep Fade",
      mistake: "Late Entry",
      notes: "Entered late after initial rejection. Disciplined -4.5 pt hard stop respected.",
    },

    // Day 2: Aug 19, 2026 (Tuesday)
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24550 CE",
      underlying: "NIFTY",
      optType: "CALL",
      strike: 24550,
      direction: "LONG",
      status: "CLOSED",
      entryDatetime: "2026-08-19T10:15:00",
      exitDatetime: "2026-08-19T10:28:00",
      entryPrice: 95.00,
      exitPrice: 104.00,
      targetPrice: 104.00,
      stopLoss: 90.50,
      quantity: 1,
      lotSize: 75,
      capitalUsed: 7125.00,
      realizedPnl: 675.00,
      charges: 54.60,
      netPnl: 620.40,
      closeReason: "TARGET_HIT",
      strategy: "Gamma Wall Rejection",
      notes: "Bounced off major Put Wall support at 24500. Solid 1:2 R:R execution.",
    },
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24600 CE",
      underlying: "NIFTY",
      optType: "CALL",
      strike: 24600,
      direction: "LONG",
      status: "CLOSED",
      entryDatetime: "2026-08-19T14:10:00",
      exitDatetime: "2026-08-19T14:22:00",
      entryPrice: 84.00,
      exitPrice: 84.50,
      targetPrice: 92.50,
      stopLoss: 79.50,
      quantity: 1,
      lotSize: 75,
      capitalUsed: 6300.00,
      realizedPnl: 37.50,
      charges: 50.80,
      netPnl: -13.30,
      closeReason: "BREAKEVEN_LOCKED",
      strategy: "0DTE Momentum",
      notes: "Price stalled near resistance at +6 pts; locked breakeven at +0.5 pt.",
    },

    // Day 3: Aug 20, 2026 (Today / Thursday Expiry)
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24500 CE",
      underlying: "NIFTY",
      optType: "CALL",
      strike: 24500,
      direction: "LONG",
      status: "CLOSED",
      entryDatetime: "2026-08-20T09:45:00",
      exitDatetime: "2026-08-20T10:02:00",
      entryPrice: 90.00,
      exitPrice: 98.80,
      targetPrice: 98.50,
      stopLoss: 85.50,
      quantity: 1,
      lotSize: 75,
      capitalUsed: 6750.00,
      realizedPnl: 660.00,
      charges: 52.80,
      netPnl: 607.20,
      closeReason: "TARGET_HIT",
      strategy: "0DTE Momentum",
      notes: "Morning momentum surge off 24480 support. +8.8 pt scalp bagged cleanly.",
    },
    {
      accountId: 2,
      tradeMode: "PAPER",
      symbol: "NIFTY 24400 PE",
      underlying: "NIFTY",
      optType: "PUT",
      strike: 24400,
      direction: "LONG",
      status: "OPEN",
      entryDatetime: "2026-08-20T14:15:00",
      exitDatetime: null,
      entryPrice: 94.00,
      exitPrice: null,
      targetPrice: 103.00,
      stopLoss: 94.50, // Breakeven locked
      quantity: 1,
      lotSize: 75,
      capitalUsed: 7050.00,
      realizedPnl: 0,
      charges: 0,
      netPnl: 0,
      closeReason: null,
      lastMarkPrice: 99.20,
      lastMarkedAt: "2026-08-20T14:45:00",
      strategy: "Gamma Wall Rejection",
      notes: "Afternoon expiry scalp. Up +5.2 pts, breakeven locked at 94.50.",
    },
  ];

  let cumulativeNetPnl = 0;

  for (const t of tradesData) {
    const instId = getOrInsertInstrument(t.symbol, t.underlying, t.optType, t.strike);
    const units = t.quantity * t.lotSize;
    const riskAmt = Math.abs(t.entryPrice - t.stopLoss) * units;
    const rewardAmt = Math.abs(t.targetPrice - t.entryPrice) * units;
    const rr = rewardAmt / (riskAmt || 1);

    const res = db.prepare(`
      INSERT INTO trades (
        account_id, instrument_id, trade_mode, trade_type, direction, status,
        entry_datetime, exit_datetime, entry_price, exit_price, quantity,
        capital_used, position_size, target_price, stop_loss, risk_amount,
        risk_percentage, expected_reward, risk_reward_ratio, realized_pnl,
        charges, net_pnl, close_reason, last_mark_price, last_marked_at
      ) VALUES (
        ?, ?, ?, 'INTRADAY', ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      t.accountId, instId, t.tradeMode, t.direction, t.status,
      t.entryDatetime, t.exitDatetime, t.entryPrice, t.exitPrice, t.quantity,
      t.capitalUsed, units, t.targetPrice, t.stopLoss, riskAmt,
      (riskAmt / 100000) * 100, rewardAmt, Number(rr.toFixed(2)), t.realizedPnl,
      t.charges, t.netPnl, t.closeReason, t.lastMarkPrice || null, t.lastMarkedAt || null
    );

    const tradeId = res.lastInsertRowid;

    if (t.notes) {
      db.prepare(`
        INSERT INTO trade_journal (trade_id, entry_reason, personal_notes, lessons_learned, confidence_score, followed_plan)
        VALUES (?, ?, ?, ?, 8, 1)
      `).run(tradeId, t.strategy, t.notes, t.status === "CLOSED" && t.netPnl > 0 ? "Followed plan and let target hit." : "Protected capital with hard stop.");
    }

    if (t.strategy) {
      const sRow = db.prepare("SELECT id FROM strategy_tags WHERE name = ?").get(t.strategy);
      if (sRow) {
        db.prepare("INSERT OR IGNORE INTO trade_strategy_tags (trade_id, strategy_tag_id) VALUES (?, ?)").run(tradeId, sRow.id);
      }
    }

    if (t.mistake) {
      const mRow = db.prepare("SELECT id FROM mistake_tags WHERE name = ?").get(t.mistake);
      if (mRow) {
        db.prepare("INSERT OR IGNORE INTO trade_mistake_tags (trade_id, mistake_tag_id) VALUES (?, ?)").run(tradeId, mRow.id);
      }
    }

    if (t.status === "CLOSED") {
      cumulativeNetPnl += t.netPnl;
    }
  }

  // Update Account current capital
  const finalCapital = 100000 + cumulativeNetPnl;
  db.prepare("UPDATE accounts SET current_capital = ? WHERE id = 2").run(finalCapital);

  console.log(`✅ Seed Complete! Initial Capital: ₹1,00,000 | 3-Day Net P&L: +₹${cumulativeNetPnl.toFixed(2)} | Current Balance: ₹${finalCapital.toFixed(2)}`);
}

seedLast3Days();
