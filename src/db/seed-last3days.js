import fs from "node:fs";
import { getDb } from "./connection.js";

const tradesData = JSON.parse(
  fs.readFileSync(new URL("./seed-trades-data.json", import.meta.url), "utf8")
);

export function seedLast3Days() {
  const db = getDb();

  console.log("⚡ Cleaning old dummy trades and resetting margin to 100k (₹1,00,000)...");

  db.exec(`
    DELETE FROM trade_mistake_tags;
    DELETE FROM trade_strategy_tags;
    DELETE FROM trade_journal;
    DELETE FROM trade_executions;
    DELETE FROM trade_attachments;
    DELETE FROM review_reports;
    DELETE FROM trades;
    DELETE FROM instruments;

    UPDATE accounts SET starting_capital = 100000, current_capital = 100000 WHERE id = 1;
    UPDATE accounts SET starting_capital = 100000, current_capital = 100000 WHERE id = 2;
  `);

  const accounts = db.prepare("SELECT id, name FROM accounts").all();
  if (accounts.length === 0) {
    db.prepare(`INSERT INTO accounts (id, name, account_type, market, starting_capital, current_capital) VALUES (1, 'Personal Trading Account', 'REAL', 'INDIA', 100000, 100000)`).run();
    db.prepare(`INSERT INTO accounts (id, name, account_type, market, starting_capital, current_capital) VALUES (2, 'Paper Trading Lab', 'PAPER', 'INDIA', 100000, 100000)`).run();
  }

  const strategies = ["1:2 Scalp Breakout", "Liquidity Sweep Fade", "Gamma Wall Rejection", "0DTE Momentum"];
  const mistakes = ["Exited Early", "Late Entry", "Chased Wick", "Oversized Lot"];

  for (const s of strategies) {
    db.prepare("INSERT OR IGNORE INTO strategy_tags (name) VALUES (?)").run(s);
  }
  for (const m of mistakes) {
    db.prepare("INSERT OR IGNORE INTO mistake_tags (name) VALUES (?)").run(m);
  }

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

  const finalCapital = 100000 + cumulativeNetPnl;
  db.prepare("UPDATE accounts SET current_capital = ? WHERE id = 2").run(finalCapital);

  console.log(`✅ Seed Complete! Initial Capital: ₹1,00,000 | 3-Day Net P&L: +₹${cumulativeNetPnl.toFixed(2)} | Current Balance: ₹${finalCapital.toFixed(2)}`);
}

seedLast3Days();
