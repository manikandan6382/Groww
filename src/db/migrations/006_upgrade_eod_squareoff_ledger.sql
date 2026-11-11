CREATE TABLE IF NOT EXISTS eod_squareoff_ledger_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  trade_id INTEGER NOT NULL REFERENCES trades(id),
  request_key TEXT NOT NULL UNIQUE,
  worker_id TEXT,
  lease_epoch INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('CLAIMED', 'PENDING', 'EXECUTED', 'DEFERRED', 'FAILED', 'RECONCILIATION_REQUIRED')),
  rms_sync_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (rms_sync_status IN ('NOT_STARTED', 'SYNCED', 'FAILED', 'TIMED_OUT', 'RECONCILED')),
  exit_price REAL,
  pnl REAL,
  reason TEXT,
  failure_reason TEXT,
  case_code INTEGER,
  claim_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO eod_squareoff_ledger_v2 (
  id, session_date, trade_id, request_key, worker_id, lease_epoch, status, rms_sync_status, exit_price, pnl, reason, failure_reason, case_code, claim_expires_at, created_at, updated_at
)
SELECT 
  id, 
  session_date, 
  trade_id, 
  request_key, 
  NULL AS worker_id, 
  1 AS lease_epoch,
  CASE WHEN status = 'EXECUTED' THEN 'RECONCILIATION_REQUIRED' ELSE status END AS status, 
  'NOT_STARTED' AS rms_sync_status, 
  exit_price, 
  pnl, 
  reason, 
  failure_reason, 
  case_code, 
  NULL AS claim_expires_at, 
  created_at, 
  updated_at
FROM eod_squareoff_ledger;

DROP TABLE eod_squareoff_ledger;

ALTER TABLE eod_squareoff_ledger_v2 RENAME TO eod_squareoff_ledger;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eod_squareoff_session_trade 
  ON eod_squareoff_ledger(session_date, trade_id);
