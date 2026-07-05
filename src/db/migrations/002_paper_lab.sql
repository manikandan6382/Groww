ALTER TABLE trades ADD COLUMN close_reason TEXT;
ALTER TABLE trades ADD COLUMN last_mark_price REAL;
ALTER TABLE trades ADD COLUMN last_marked_at TEXT;

UPDATE accounts
SET starting_capital = 100000,
    current_capital = 100000
WHERE account_type = 'PAPER'
  AND name = 'Paper Trading Lab'
  AND starting_capital = 0
  AND current_capital = 0;
