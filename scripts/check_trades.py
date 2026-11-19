import sqlite3
import json

con = sqlite3.connect('data/portfoliox.db')
con.row_factory = sqlite3.Row
cur = con.cursor()

cur.execute("SELECT id, instrument_id, direction, status, entry_price, exit_price, target_price, stop_loss, realized_pnl, charges, net_pnl, close_reason, created_at, updated_at, idempotency_key FROM trades WHERE created_at >= '2026-10-29' ORDER BY id DESC")
rows = [dict(r) for r in cur.fetchall()]
print(json.dumps(rows, indent=2))
