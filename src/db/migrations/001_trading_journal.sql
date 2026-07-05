CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('REAL', 'PAPER')),
  market TEXT NOT NULL CHECK (market IN ('INDIA', 'US')),
  currency TEXT NOT NULL DEFAULT 'INR',
  starting_capital REAL NOT NULL DEFAULT 0,
  current_capital REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instruments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  display_name TEXT,
  market TEXT NOT NULL CHECK (market IN ('INDIA', 'US')),
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('STOCK', 'OPTION')),
  exchange TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  underlying_symbol TEXT,
  option_type TEXT CHECK (option_type IN ('CALL', 'PUT') OR option_type IS NULL),
  strike_price REAL,
  expiry_date TEXT,
  lot_size REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instruments_symbol_market
  ON instruments(symbol, market, instrument_type);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  trade_mode TEXT NOT NULL CHECK (trade_mode IN ('REAL', 'PAPER')),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('INTRADAY', 'SWING')),
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  status TEXT NOT NULL CHECK (status IN ('PLANNED', 'OPEN', 'CLOSED', 'CANCELLED')),
  entry_datetime TEXT NOT NULL,
  exit_datetime TEXT,
  entry_price REAL NOT NULL,
  exit_price REAL,
  quantity REAL NOT NULL,
  capital_used REAL NOT NULL DEFAULT 0,
  position_size REAL NOT NULL DEFAULT 0,
  target_price REAL,
  stop_loss REAL,
  risk_amount REAL NOT NULL DEFAULT 0,
  risk_percentage REAL NOT NULL DEFAULT 0,
  expected_reward REAL NOT NULL DEFAULT 0,
  risk_reward_ratio REAL NOT NULL DEFAULT 0,
  realized_pnl REAL NOT NULL DEFAULT 0,
  charges REAL NOT NULL DEFAULT 0,
  net_pnl REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trades_entry_datetime ON trades(entry_datetime);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_trade_mode ON trades(trade_mode);

CREATE TABLE IF NOT EXISTS trade_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('ENTRY', 'EXIT', 'ADD', 'REDUCE')),
  execution_datetime TEXT NOT NULL,
  price REAL NOT NULL,
  quantity REAL NOT NULL,
  brokerage REAL NOT NULL DEFAULT 0,
  taxes REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trade_executions_trade_id ON trade_executions(trade_id);

CREATE TABLE IF NOT EXISTS trade_journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  entry_reason TEXT,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10 OR confidence_score IS NULL),
  emotion_before TEXT,
  emotion_after TEXT,
  followed_plan INTEGER NOT NULL DEFAULT 1,
  lessons_learned TEXT,
  personal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS strategy_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS trade_strategy_tags (
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  strategy_tag_id INTEGER NOT NULL REFERENCES strategy_tags(id),
  PRIMARY KEY (trade_id, strategy_tag_id)
);

CREATE TABLE IF NOT EXISTS mistake_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS trade_mistake_tags (
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  mistake_tag_id INTEGER NOT NULL REFERENCES mistake_tags(id),
  PRIMARY KEY (trade_id, mistake_tag_id)
);

CREATE TABLE IF NOT EXISTS trade_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('ENTRY_SCREENSHOT', 'EXIT_SCREENSHOT', 'SETUP_IMAGE')),
  file_path TEXT NOT NULL,
  original_name TEXT,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trade_attachments_trade_id ON trade_attachments(trade_id);

CREATE TABLE IF NOT EXISTS review_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'RULE_COMPLIANCE')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  summary TEXT,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate REAL NOT NULL DEFAULT 0,
  net_pnl REAL NOT NULL DEFAULT 0,
  biggest_mistake TEXT,
  best_strategy TEXT,
  worst_strategy TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO strategy_tags(name) VALUES
  ('Breakout'),
  ('Pullback'),
  ('Support/Resistance'),
  ('News'),
  ('Reversal'),
  ('Trend Following'),
  ('Scalping');

INSERT OR IGNORE INTO mistake_tags(name) VALUES
  ('FOMO'),
  ('Revenge trading'),
  ('Ignored stop loss'),
  ('Emotional exit'),
  ('Overtrading'),
  ('Poor risk-reward'),
  ('Position size too large');

INSERT INTO accounts(name, account_type, market, currency, starting_capital, current_capital)
SELECT 'Personal Trading Account', 'REAL', 'INDIA', 'INR', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM accounts WHERE name = 'Personal Trading Account'
);

INSERT INTO accounts(name, account_type, market, currency, starting_capital, current_capital)
SELECT 'Paper Trading Lab', 'PAPER', 'INDIA', 'INR', 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM accounts WHERE name = 'Paper Trading Lab'
);
