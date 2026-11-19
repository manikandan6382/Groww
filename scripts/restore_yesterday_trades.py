import sqlite3

conn = sqlite3.connect('data/portfoliox.db')
c = conn.cursor()

# 1. Ensure instrument for NIFTY 22600 CE exists
c.execute("SELECT id FROM instruments WHERE symbol = 'NIFTY 22600 CE'")
row = c.fetchone()
if row:
    inst_22600 = row[0]
else:
    c.execute("""
        INSERT INTO instruments (symbol, display_name, market, instrument_type, exchange, currency, underlying_symbol, option_type, strike_price, lot_size, created_at, updated_at)
        VALUES ('NIFTY 22600 CE', 'NIFTY 22600 CE', 'INDIA', 'OPTION', 'NSE', 'INR', 'NIFTY', 'CALL', 22600.0, 65.0, '2026-10-06 04:18:00', '2026-10-06 04:18:00')
    """)
    inst_22600 = c.lastrowid
print('Instrument 22600 CE ID:', inst_22600)

inst_22650 = 110
inst_22700 = 109

# 2. Insert Trade #447 (Yesterday Trade 1)
c.execute("""
    INSERT OR REPLACE INTO trades (
        id, account_id, instrument_id, trade_mode, trade_type, direction, status,
        entry_datetime, exit_datetime, entry_price, exit_price, quantity,
        capital_used, position_size, target_price, stop_loss, risk_amount,
        risk_percentage, expected_reward, risk_reward_ratio, realized_pnl,
        charges, net_pnl, close_reason, last_mark_price, last_marked_at,
        created_at, updated_at, idempotency_key
    ) VALUES (
        447, 2, ?, 'PAPER', 'INTRADAY', 'LONG', 'CLOSED',
        '2026-10-06T09:48', '2026-10-06T10:15', 81.90, 91.05, 1.0,
        5323.50, 5323.50, 91.05, 78.90, 195.00,
        0.0, 594.75, 3.05, 594.75,
        55.20, 539.55, 'TARGET_HIT', 91.05, '2026-10-06T10:15',
        '2026-10-06 04:18:00', '2026-10-06 04:45:00', 'trade_yesterday_1_447'
    )
""", (inst_22600,))

# 3. Insert Trade #448 (Yesterday Trade 2)
c.execute("""
    INSERT OR REPLACE INTO trades (
        id, account_id, instrument_id, trade_mode, trade_type, direction, status,
        entry_datetime, exit_datetime, entry_price, exit_price, quantity,
        capital_used, position_size, target_price, stop_loss, risk_amount,
        risk_percentage, expected_reward, risk_reward_ratio, realized_pnl,
        charges, net_pnl, close_reason, last_mark_price, last_marked_at,
        created_at, updated_at, idempotency_key
    ) VALUES (
        448, 2, ?, 'PAPER', 'INTRADAY', 'LONG', 'CLOSED',
        '2026-10-06T10:20', '2026-10-06T10:55', 59.70, 69.90, 1.0,
        3880.50, 3880.50, 69.90, 56.70, 195.00,
        0.0, 663.00, 3.40, 663.00,
        55.20, 607.80, 'TARGET_HIT', 69.90, '2026-10-06T10:55',
        '2026-10-06 04:50:00', '2026-10-06 05:25:00', 'trade_yesterday_2_448'
    )
""", (inst_22650,))

# 4. Insert executions for 447 and 448
c.execute("""
    INSERT OR IGNORE INTO trade_executions (trade_id, execution_type, execution_datetime, price, quantity, brokerage, taxes, notes, created_at, charges)
    VALUES (447, 'ENTRY', '2026-10-06T09:48', 81.90, 1.0, 20.0, 5.0, 'VWAP Shelf 22,616 Bounce Trigger', '2026-10-06 04:18:00', 0.0),
           (447, 'EXIT', '2026-10-06T10:15', 91.05, 1.0, 0.0, 0.0, 'TARGET_HIT (+9.15 pts)', '2026-10-06 04:45:00', 55.20),
           (448, 'ENTRY', '2026-10-06T10:20', 59.70, 1.0, 20.0, 5.0, 'Box Breakout 22,655 Continuation', '2026-10-06 04:50:00', 0.0),
           (448, 'EXIT', '2026-10-06T10:55', 69.90, 1.0, 0.0, 0.0, 'TARGET_HIT (+10.20 pts)', '2026-10-06 05:25:00', 55.20)
""")

# 5. Insert journal entries for 447 and 448
c.execute("""
    INSERT OR IGNORE INTO trade_journal (trade_id, entry_reason, confidence_score, followed_plan, personal_notes, created_at, updated_at)
    VALUES (447, 'Institutional VWAP defense scalp', 8, 1, 'NIFTY 22600 CE captured out of 22,616 VWAP shelf test', '2026-10-06 04:18:00', '2026-10-06 04:45:00'),
           (448, 'Morning expansion continuation', 8, 1, 'NIFTY 22650 CE box breakout beyond 22,655', '2026-10-06 04:50:00', '2026-10-06 05:25:00')
""")

# 6. Reconcile Account #2 Capital
c.execute('SELECT SUM(net_pnl) FROM trades WHERE account_id = 2')
total_pnl = c.fetchone()[0]
reconciled_capital = round(100000.0 + total_pnl, 2)
c.execute('UPDATE accounts SET current_capital = ? WHERE id = 2', (reconciled_capital,))

conn.commit()

print('ALL TRADES >= 446:')
c.execute("""
    SELECT t.id, date(t.created_at) as d, i.symbol, t.entry_price, t.exit_price, t.net_pnl, t.status, t.close_reason
    FROM trades t
    JOIN instruments i ON t.instrument_id = i.id
    WHERE t.id >= 446
    ORDER BY t.id ASC
""")
for r in c.fetchall():
    print(r)

c.execute('SELECT id, name, starting_capital, current_capital FROM accounts WHERE id = 2')
print('ACCOUNT 2 BALANCE:', c.fetchone())
conn.close()
