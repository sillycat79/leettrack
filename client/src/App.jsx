import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { Heatmap, ProblemForm, ProblemTable, StatTile, WeakTopics } from "./components.jsx";

export default function App() {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [filters, setFilters] = useState({ q: "", topic: "", difficulty: "", status: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, s, t] = await Promise.all([api.list(filters), api.stats(), api.topics()]);
      setProblems(list);
      setStats(s);
      setTopics(t);
      setError("");
    } catch {
      setError("Can't reach the API. Is the server running?");
    }
  }, [filters]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (p) => { await api.create(p); refresh(); };
  const save = async (p) => { await api.update(editing.id, p); setEditing(null); refresh(); };
  const remove = async (p) => {
    if (confirm(`Delete "${p.title}"?`)) { await api.remove(p.id); refresh(); }
  };
  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const rate = stats?.total ? Math.round((stats.solved / stats.total) * 100) : 0;

  return (
    <div className="page">
      <header className="top">
        <h1><span className="logo">{"</>"}</span> LeetTrack</h1>
        <p className="muted">Log practice problems, keep the streak, find the weak spots.</p>
      </header>

      {error && <div className="banner">{error}</div>}

      {stats && (
        <section className="tiles">
          <StatTile label="Solved" value={stats.solved} sub={`${rate}% of ${stats.total} attempts`} />
          <StatTile label="Current streak" value={`${stats.streak.current}d`} sub={`Best: ${stats.streak.longest}d`} />
          <StatTile label="Easy / Med / Hard" value={
            <span className="mono">
              <span className="c-easy">{stats.byDifficulty.Easy}</span> / <span className="c-medium">{stats.byDifficulty.Medium}</span> / <span className="c-hard">{stats.byDifficulty.Hard}</span>
            </span>} />
          <StatTile label="Topics covered" value={stats.topics.length} />
        </section>
      )}

      <div className="layout">
        <section className="card">
          <h2>{editing ? "Edit problem" : "Log a problem"}</h2>
          <ProblemForm
            key={editing?.id ?? "new"}
            initial={editing}
            topics={topics}
            onSave={editing ? save : create}
            onCancel={editing ? () => setEditing(null) : null}
          />
        </section>

        <aside className="side">
          <section className="card">
            <h2>Activity</h2>
            <Heatmap perDay={stats?.perDay ?? {}} />
          </section>
          <section className="card">
            <h2>Weakest topics</h2>
            <p className="hint">Ranked by fail rate and time spent, adjusted for difficulty.</p>
            <WeakTopics topics={stats?.topics ?? []} />
          </section>
        </aside>
      </div>

      <section className="card">
        <div className="list-head">
          <h2>History</h2>
          <div className="filters">
            <input placeholder="Search…" value={filters.q} onChange={setFilter("q")} />
            <select value={filters.topic} onChange={setFilter("topic")}>
              <option value="">All topics</option>
              {topics.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={filters.difficulty} onChange={setFilter("difficulty")}>
              <option value="">Any difficulty</option>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <select value={filters.status} onChange={setFilter("status")}>
              <option value="">Any result</option>
              <option>Solved</option><option>Attempted</option>
            </select>
          </div>
        </div>
        <ProblemTable problems={problems} onEdit={(p) => { setEditing(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} onDelete={remove} />
      </section>
    </div>
  );
}
