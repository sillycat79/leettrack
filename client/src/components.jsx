import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { localDate } from "./api.js";

export const DEFAULT_TOPICS = [
  "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack", "Binary Search",
  "Linked List", "Trees", "Heap", "Backtracking", "Graphs", "Dynamic Programming",
  "Greedy", "Intervals", "Math", "Bit Manipulation", "Tries",
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Streak and the next topic to practice come first; totals sit underneath. */
export function Hero({ stats, onPractice }) {
  const { streak, solved, total, byDifficulty, topics } = stats;
  const rate = total ? Math.round((solved / total) * 100) : 0;
  const next = topics[0];
  const covered = new Set([...DEFAULT_TOPICS, ...topics.map((t) => t.topic)]).size;

  return (
    <section className="hero" aria-label="Summary">
      <div className="hero-main">
        <div>
          <div className="eyebrow">Current streak</div>
          <div className={`streak-value ${streak.current ? "" : "zero"}`}>
            {streak.current}<span className="streak-unit">{streak.current === 1 ? "day" : "days"}</span>
          </div>
          <div className="hero-meta">Best {plural(streak.longest, "day")}</div>
        </div>
        <div className="hero-next">
          <div className="eyebrow">Next up</div>
          {next ? (
            <>
              <div className="next-topic">{next.topic}</div>
              <p className="next-why">
                {next.solved}/{next.total} solved
                {next.avgMinutes != null && ` · ${next.avgMinutes} min avg`} · your weakest topic right now
              </p>
              <div className="next-action">
                <button type="button" className="btn btn-ghost" onClick={() => onPractice(next.topic)}>
                  Log a {next.topic} problem
                </button>
              </div>
            </>
          ) : (
            <p className="next-why">Log a few problems and your weakest topic shows up here.</p>
          )}
        </div>
      </div>
      <dl className="hero-stats">
        <div>
          <dt>Solved</dt>
          <dd><span className="stat-value">{solved}</span><span className="stat-sub">{rate}% of {total}</span></dd>
        </div>
        <div>
          <dt>By difficulty</dt>
          <dd className="split">
            {["Easy", "Medium", "Hard"].map((d) => (
              <span key={d}>
                <span className="stat-value">{byDifficulty[d]}</span>
                <span className="stat-sub">{d === "Medium" ? "Med" : d}</span>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Topics covered</dt>
          <dd><span className="stat-value">{topics.length}</span><span className="stat-sub">of {covered}</span></dd>
        </div>
      </dl>
    </section>
  );
}

/** GitHub-style activity grid for the last N weeks. */
export function Heatmap({ perDay, weeks = 16 }) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay()); // align to Sunday

  const cells = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = localDate(d);
    cells.push({ key, count: perDay[key] || 0 });
  }
  const level = (c) => Math.min(c, 4);

  return (
    <>
      <div className="heatmap" aria-label="Practice activity">
        {cells.map((c) => (
          <div
            key={c.key}
            className={`cell l${level(c.count)}`}
            title={`${c.key}: ${plural(c.count, "problem")}`}
          />
        ))}
      </div>
      <div className="legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`cell l${l}`} />)}
        <span>More</span>
      </div>
    </>
  );
}

export function WeakTopics({ topics }) {
  if (!topics.length) return <p className="muted">Log a few problems to see your weak spots.</p>;
  return (
    <ol className="weak">
      {topics.slice(0, 6).map((t, i) => (
        <li key={t.topic}>
          <span className="weak-rank">{String(i + 1).padStart(2, "0")}</span>
          <span className="weak-name">{t.topic}</span>
          <span className="weak-score" title="Weakness score, 0–100">{t.weakness}</span>
          <span className="weak-meta">
            {t.solved}/{t.total} solved{t.avgMinutes != null && ` · ${t.avgMinutes} min avg`}
          </span>
          <div className="bar" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${Math.max(t.weakness, 3)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const EMPTY = {
  title: "", url: "", topic: "", difficulty: "Medium",
  status: "Solved", minutes: "", notes: "", solved_on: "",
};

export function ProblemForm({ initial, defaultTopic, topics, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    solved_on: localDate(),
    topic: defaultTopic ?? "",
    ...(initial ? { ...initial, url: initial.url ?? "", notes: initial.notes ?? "", minutes: initial.minutes ?? "" } : {}),
  }));
  const [error, setError] = useState("");
  const [custom, setCustom] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.topic.trim()) return setError("Pick a topic.");
    try {
      await onSave(form);
      if (!initial) setForm({ ...EMPTY, solved_on: form.solved_on, topic: form.topic });
    } catch (err) {
      setError(err.message);
    }
  }

  const allTopics = [...new Set([...DEFAULT_TOPICS, ...topics])];

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid2">
        <label className="span2">Problem
          <input value={form.title} onChange={set("title")} placeholder="e.g. Two Sum" required />
        </label>
        <div className="field span2">Topic
          <div className="chips">
            {allTopics.map((t) => (
              <button type="button" key={t} className={`chip ${!custom && form.topic === t ? "on" : ""}`}
                onClick={() => { setCustom(false); setForm({ ...form, topic: t }); }}>{t}</button>
            ))}
            <button type="button" className={`chip ${custom ? "on" : ""}`}
              onClick={() => { setCustom(true); setForm({ ...form, topic: "" }); }}>+ Other</button>
          </div>
          {custom && <input autoFocus value={form.topic} onChange={set("topic")} placeholder="New topic name" required />}
        </div>
        <label>Difficulty
          <div className="seg">
            {["Easy", "Medium", "Hard"].map((d) => (
              <button type="button" key={d} className={`seg-btn ${form.difficulty === d ? "on" : ""}`}
                onClick={() => setForm({ ...form, difficulty: d })}>{d}</button>
            ))}
          </div>
        </label>
        <label>Result
          <div className="seg">
            {["Solved", "Attempted"].map((s) => (
              <button type="button" key={s} className={`seg-btn ${form.status === s ? "on" : ""}`}
                onClick={() => setForm({ ...form, status: s })}>{s}</button>
            ))}
          </div>
        </label>
        <label>Minutes
          <input type="number" min="0" value={form.minutes} onChange={set("minutes")} placeholder="25" />
        </label>
        <label>Date
          <input type="date" value={form.solved_on} onChange={set("solved_on")} required />
        </label>
        <label className="span2">Link
          <input value={form.url} onChange={set("url")} placeholder="https://leetcode.com/problems/…" />
        </label>
        <label className="span2">Notes
          <textarea rows="2" value={form.notes} onChange={set("notes")} placeholder="Key insight, what tripped you up…" />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary">{initial ? "Save changes" : "Log problem"}</button>
      </div>
    </form>
  );
}

const LEVEL = { Easy: 1, Medium: 2, Hard: 3 };

export function Difficulty({ value }) {
  return (
    <span className="diff">
      <span className="meter" aria-hidden="true">
        {[1, 2, 3].map((n) => <i key={n} className={n <= LEVEL[value] ? "on" : ""} />)}
      </span>
      {value}
    </span>
  );
}

export function Status({ value }) {
  const Icon = value === "Solved" ? Check : RotateCcw;
  return (
    <span className={`status ${value.toLowerCase()}`}>
      <Icon className="icon" strokeWidth={2} aria-hidden="true" />
      {value}
    </span>
  );
}

export function ProblemTable({ problems, onEdit, onDelete }) {
  if (!problems.length) return <p className="muted empty">Nothing here yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Problem</th><th>Topic</th><th>Difficulty</th><th>Result</th><th>Min</th><th /></tr>
        </thead>
        <tbody>
          {problems.map((p) => (
            <tr key={p.id}>
              <td className="date">{p.solved_on}</td>
              <td>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                {p.notes && <div className="note">{p.notes}</div>}
              </td>
              <td>{p.topic}</td>
              <td><Difficulty value={p.difficulty} /></td>
              <td><Status value={p.status} /></td>
              <td className="minutes">{p.minutes ?? "—"}</td>
              <td className="row-actions">
                <button className="link-btn" onClick={() => onEdit(p)}>Edit</button>
                <button className="link-btn danger" onClick={() => onDelete(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
