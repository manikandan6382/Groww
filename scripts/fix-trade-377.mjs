import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/portfoliox.db");
db.prepare(`
  UPDATE trades 
  SET exit_price = 74.05, 
      last_mark_price = 74.05, 
      realized_pnl = -191.75, 
      charges = 57.59, 
      net_pnl = -249.34, 
      updated_at = datetime('now') 
  WHERE id = 377
`).run();

const row = db.prepare("SELECT id, entry_price, exit_price, stop_loss, realized_pnl, charges, net_pnl, close_reason FROM trades WHERE id = 377").get();
console.log("TRADE 377 CORRECTED:", JSON.stringify(row, null, 2));
