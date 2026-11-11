CREATE TABLE IF NOT EXISTS eod_squareoff_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  trade_id INTEGER NOT NULL REFERENCES trades(id),
  request_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'EXECUTED', 'DEFERRED', 'FAILED')),
  exit_price REAL,
  pnl REAL,
  reason TEXT,
  failure_reason TEXT,
  case_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eod_squareoff_session_trade 
  ON eod_squareoff_ledger(session_date, trade_id);
