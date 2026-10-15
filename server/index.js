import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { reviewQueue, summary } from "./stats.js";

const app = express();
app.use(express.json());

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["Solved", "Attempted"];

function validate(body) {
  const errors = [];
  if (!body.title?.trim()) errors.push("title is required");
  if (!body.topic?.trim()) errors.push("topic is required");
  if (!DIFFICULTIES.includes(body.difficulty)) errors.push("difficulty must be Easy, Medium or Hard");
  if (!STATUSES.includes(body.status)) errors.push("status must be Solved or Attempted");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.solved_on ?? "")) errors.push("solved_on must be YYYY-MM-DD");
  if (body.minutes != null && body.minutes !== "" && !(Number(body.minutes) >= 0))
    errors.push("minutes must be a positive number");
  return errors;
}

const clean = (b) => ({
  title: b.title.trim(),
  url: b.url?.trim() || null,
  topic: b.topic.trim(),
  difficulty: b.difficulty,
  status: b.status,
  minutes: b.minutes === "" || b.minutes == null ? null : Number(b.minutes),
  notes: b.notes?.trim() || null,
  solved_on: b.solved_on,
});

app.get("/api/problems", (req, res) => {
  const { topic, difficulty, status, q } = req.query;
  const where = [];
  const params = {};
  if (topic) { where.push("topic = :topic"); params.topic = topic; }
  if (difficulty) { where.push("difficulty = :difficulty"); params.difficulty = difficulty; }
  if (status) { where.push("status = :status"); params.status = status; }
  if (q) { where.push("(title LIKE :q OR notes LIKE :q)"); params.q = `%${q}%`; }

  const sql = `SELECT * FROM problems ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY solved_on DESC, id DESC`;
  res.json(db.prepare(sql).all(params));
});

app.post("/api/problems", (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const p = clean(req.body);
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO problems (title, url, topic, difficulty, status, minutes, notes, solved_on)
              VALUES (:title, :url, :topic, :difficulty, :status, :minutes, :notes, :solved_on)`)
    .run(p);
  res.status(201).json(db.prepare("SELECT * FROM problems WHERE id = ?").get(lastInsertRowid));
});

app.put("/api/problems/:id", (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const p = { ...clean(req.body), id: Number(req.params.id) };
  const { changes } = db
    .prepare(`UPDATE problems SET title=:title, url=:url, topic=:topic, difficulty=:difficulty,
              status=:status, minutes=:minutes, notes=:notes, solved_on=:solved_on WHERE id=:id`)
    .run(p);
  if (!changes) return res.status(404).json({ errors: ["not found"] });
  res.json(db.prepare("SELECT * FROM problems WHERE id = ?").get(p.id));
});

app.delete("/api/problems/:id", (req, res) => {
  const { changes } = db.prepare("DELETE FROM problems WHERE id = ?").run(Number(req.params.id));
  if (!changes) return res.status(404).json({ errors: ["not found"] });
  res.status(204).end();
});

app.get("/api/stats", (req, res) => {
  const all = db.prepare("SELECT * FROM problems").all();
  res.json(summary(all, req.query.today));
});

app.get("/api/review", (req, res) => {
  const all = db.prepare("SELECT * FROM problems").all();
  res.json(reviewQueue(all, req.query.today));
});

const DEFAULT_WEEKLY_GOAL = 10;

function getSettings() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'weekly_goal'").get();
  return { weeklyGoal: row ? Number(row.value) : DEFAULT_WEEKLY_GOAL };
}

app.get("/api/settings", (_req, res) => res.json(getSettings()));

app.put("/api/settings", (req, res) => {
  const goal = req.body?.weeklyGoal;
  if (!Number.isInteger(goal) || goal < 1 || goal > 50) {
    return res.status(400).json({ errors: ["Pick a number from 1 to 50."] });
  }
  db.prepare(`INSERT INTO settings (key, value) VALUES ('weekly_goal', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(goal));
  res.json(getSettings());
});

app.get("/api/topics", (_req, res) => {
  res.json(db.prepare("SELECT DISTINCT topic FROM problems ORDER BY topic").all().map((r) => r.topic));
});

// In production, serve the built React app from the same server.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "dist");
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`LeetTrack API on http://localhost:${PORT}`));
