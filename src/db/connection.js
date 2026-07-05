import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const dataDir = path.join(projectRoot, "data");
const migrationsDir = path.join(__dirname, "migrations");
const dbPath = path.join(dataDir, "portfoliox.db");

let database;

export function getDb() {
  if (database) return database;

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(dataDir, "uploads", "trades"), { recursive: true });

  database = new DatabaseSync(dbPath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  runMigrations(database);
  return database;
}

export function getProjectRoot() {
  return projectRoot;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = db.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(file);
    if (applied) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec("BEGIN;");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations(id) VALUES (?)").run(file);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  }
}
