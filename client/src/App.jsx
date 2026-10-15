import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { Heatmap, Hero, ProblemForm, ProblemTable, WeakTopics } from "./components.jsx";

export default function App() {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [filters, setFilters] = useState({ q: "", topic: "", difficulty: "", status: "" });
  const [editing, setEditing] = useState(null);
  const [practice, setPractice] = useState(null);
  const [error, setError] = useState("");
  const formRef = useRef(null);

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

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const create = async (p) => { await api.create(p); refresh(); };
  const save = async (p) => { await api.update(editing.id, p); setEditing(null); refresh(); };
  const remove = async (p) => {
    if (confirm(`Delete "${p.title}"?`)) { await api.remove(p.id); refresh(); }
  };
  const startPractice = (topic) => { setEditing(null); setPractice(topic); scrollToForm(); };
  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="page">
      <header className="top">
        <h1 className="brand">leettrack<span className="dot">.</span></h1>
        <span className="top-meta">
          {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </header>

      {error && <div className="banner" role="alert">{error}</div>}

      {stats && <Hero stats={stats} onPractice={startPractice} />}

      <div className="layout">
        <section className="card" ref={formRef}>
          <div className="card-head">
            <h2>{editing ? "Edit problem" : "Log a problem"}</h2>
          </div>
          <ProblemForm
            key={editing?.id ?? `new-${practice ?? ""}`}
            initial={editing}
            defaultTopic={practice}
            topics={topics}
            onSave={editing ? save : create}
            onCancel={editing ? () => setEditing(null) : null}
          />
        </section>

        <aside className="side">
          <section className="card">
            <div className="card-head">
              <h2>Weakest topics</h2>
              <p className="hint">Scored 0–100 from fail rate and time spent, adjusted for difficulty.</p>
            </div>
            <WeakTopics topics={stats?.topics ?? []} />
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Activity</h2>
              <p className="hint">Problems logged per day, last 16 weeks.</p>
            </div>
            <Heatmap perDay={stats?.perDay ?? {}} />
          </section>
        </aside>
      </div>

      <section className="card">
        <div className="list-head">
          <h2>History</h2>
          <div className="filters">
            <input placeholder="Search problems" value={filters.q} onChange={setFilter("q")} />
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
        <ProblemTable problems={problems} onEdit={(p) => { setEditing(p); scrollToForm(); }} onDelete={remove} />
      </section>
    </div>
  );
}
