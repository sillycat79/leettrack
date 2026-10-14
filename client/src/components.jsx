import { useState } from "react";
import { localDate } from "./api.js";

export const DEFAULT_TOPICS = [
  "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack", "Binary Search",
  "Linked List", "Trees", "Heap", "Backtracking", "Graphs", "Dynamic Programming",
  "Greedy", "Intervals", "Math", "Bit Manipulation", "Tries",
];

export function StatTile({ label, value, sub }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
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
  const level = (c) => (c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : 3);

  return (
    <div className="heatmap" aria-label="Practice activity">
      {cells.map((c) => (
        <div
          key={c.key}
          className={`cell l${level(c.count)}`}
          title={`${c.key}: ${c.count} problem${c.count === 1 ? "" : "s"}`}
        />
      ))}
    </div>
  );
}

export function WeakTopics({ topics }) {
  if (!topics.length) return <p className="muted">Log a few problems to see your weak spots.</p>;
  return (
    <ul className="weak">
      {topics.slice(0, 6).map((t) => (
        <li key={t.topic}>
          <div className="weak-row">
            <span className="weak-name">{t.topic}</span>
            <span className="weak-meta">
              {t.solved}/{t.total} solved{t.avgMinutes != null && ` · ${t.avgMinutes} min avg`}
            </span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${Math.max(t.weakness, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const EMPTY = {
  title: "", url: "", topic: "", difficulty: "Medium",
  status: "Solved", minutes: "", notes: "", solved_on: "",
};

export function ProblemForm({ initial, topics, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    solved_on: localDate(),
    ...(initial ? { ...initial, url: initial.url ?? "", notes: initial.notes ?? "", minutes: initial.minutes ?? "" } : {}),
  }));
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await onSave(form);
      if (!initial) setForm({ ...EMPTY, solved_on: form.solved_on, topic: form.topic });
    } catch (err) {
      setError(err.message);
    }
  }

  const allTopics = [...new Set([...DEFAULT_TOPICS, ...topics])].sort();

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid2">
        <label className="span2">Problem
          <input value={form.title} onChange={set("title")} placeholder="e.g. Two Sum" required />
        </label>
        <label>Topic
          <input list="topic-list" value={form.topic} onChange={set("topic")} placeholder="Pick or type" required />
          <datalist id="topic-list">{allTopics.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label>Link
          <input value={form.url} onChange={set("url")} placeholder="https://leetcode.com/problems/…" />
        </label>
        <label>Difficulty
          <div className="seg">
            {["Easy", "Medium", "Hard"].map((d) => (
              <button type="button" key={d} className={`seg-btn ${d.toLowerCase()} ${form.difficulty === d ? "on" : ""}`}
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
        <label className="span2">Notes
          <textarea rows="2" value={form.notes} onChange={set("notes")} placeholder="Key insight, what tripped you up…" />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="primary">{initial ? "Save changes" : "Log problem"}</button>
      </div>
    </form>
  );
}

export function ProblemTable({ problems, onEdit, onDelete }) {
  if (!problems.length) return <p className="muted empty">Nothing here yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Problem</th><th>Topic</th><th>Diff.</th><th>Result</th><th>Min</th><th /></tr>
        </thead>
        <tbody>
          {problems.map((p) => (
            <tr key={p.id}>
              <td className="mono">{p.solved_on}</td>
              <td>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                {p.notes && <div className="note">{p.notes}</div>}
              </td>
              <td>{p.topic}</td>
              <td><span className={`pill ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span></td>
              <td className={p.status === "Solved" ? "ok" : "warn"}>{p.status === "Solved" ? "✓ Solved" : "↺ Attempted"}</td>
              <td className="mono">{p.minutes ?? "—"}</td>
              <td className="row-actions">
                <button className="link" onClick={() => onEdit(p)}>Edit</button>
                <button className="link danger" onClick={() => onDelete(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
