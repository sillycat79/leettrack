import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(dir, "leettrack.db");

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS problems (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    url         TEXT,
    topic       TEXT    NOT NULL,
    difficulty  TEXT    NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
    status      TEXT    NOT NULL CHECK (status IN ('Solved','Attempted')),
    minutes     INTEGER,
    notes       TEXT,
    solved_on   TEXT    NOT NULL,           -- YYYY-MM-DD
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_problems_date  ON problems(solved_on);
  CREATE INDEX IF NOT EXISTS idx_problems_topic ON problems(topic);
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
