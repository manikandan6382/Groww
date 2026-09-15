export function insertExecutions(db, tradeId, trade) {
  db.prepare(`
    INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, notes)
    VALUES (?, 'ENTRY', ?, ?, ?, ?)
  `).run(tradeId, trade.entryDatetime, trade.entryPrice, trade.quantity, "Initial MVP entry");

  if (trade.exitPrice != null && trade.exitDatetime) {
    db.prepare(`
      INSERT INTO trade_executions(trade_id, execution_type, execution_datetime, price, quantity, brokerage, notes)
      VALUES (?, 'EXIT', ?, ?, ?, ?, ?)
    `).run(tradeId, trade.exitDatetime, trade.exitPrice, trade.quantity, trade.charges, "Initial MVP exit");
  }
}

export function insertJournal(db, tradeId, journal) {
  db.prepare(`
    INSERT INTO trade_journal(
      trade_id, entry_reason, confidence_score, emotion_before, emotion_after,
      followed_plan, lessons_learned, personal_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tradeId,
    journal.entryReason,
    journal.confidenceScore,
    journal.emotionBefore,
    journal.emotionAfter,
    journal.followedPlan ? 1 : 0,
    journal.lessonsLearned,
    journal.personalNotes,
  );
}

export function insertTags(db, tradeId, type, tags) {
  const tagTable = type === "strategy" ? "strategy_tags" : "mistake_tags";
  const linkTable = type === "strategy" ? "trade_strategy_tags" : "trade_mistake_tags";
  const linkColumn = type === "strategy" ? "strategy_tag_id" : "mistake_tag_id";

  for (const tag of tags) {
    db.prepare(`INSERT OR IGNORE INTO ${tagTable}(name) VALUES (?)`).run(tag);
    const row = db.prepare(`SELECT id FROM ${tagTable} WHERE name = ?`).get(tag);
    db.prepare(`INSERT OR IGNORE INTO ${linkTable}(trade_id, ${linkColumn}) VALUES (?, ?)`).run(tradeId, row.id);
  }
}
