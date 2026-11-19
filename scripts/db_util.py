import sqlite3

def clean_botched_trade():
    con = sqlite3.connect('data/portfoliox.db')
    cur = con.cursor()
    cur.execute('DELETE FROM trades WHERE id = 451')
    cur.execute('UPDATE accounts SET current_capital = 100880.87 WHERE id = 2')
    con.commit()
    print("Purged Trade 451 and restored Account 2 capital to 100880.87")
    
    cur.execute('SELECT id, name, starting_capital, current_capital FROM accounts WHERE id = 2')
    print("Account 2:", cur.fetchall())
    cur.execute('SELECT COUNT(*) FROM trades WHERE created_at LIKE "2026-10-06%"')
    print("Trades on 2026-10-06 count:", cur.fetchone()[0])
    con.close()

if __name__ == '__main__':
    clean_botched_trade()
