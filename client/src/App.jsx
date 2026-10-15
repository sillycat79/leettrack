import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { api } from "./api.js";
import {
  EmptyState, Heatmap, Hero, ReviewQueue, HeroSkeleton, ListSkeleton, ProblemForm, ProblemTable,
  ShortcutHelp, Skeleton, TableSkeleton, Toasts, WeakTopics, prefersReducedMotion,
} from "./components.jsx";

const NO_FILTERS = { q: "", topic: "", difficulty: "", status: "" };
const FIELDS = ["title", "url", "topic", "difficulty", "status", "minutes", "notes", "solved_on"];
const pick = (p) => Object.fromEntries(FIELDS.map((k) => [k, p[k]]));
let toastId = 0;

export default function App() {
  const [problems, setProblems] = useState(null);
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [practice, setPractice] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [help, setHelp] = useState(false);
  const formRef = useRef(null);
  const searchRef = useRef(null);

  const loadStats = useCallback(async () => {
    const [s, t, r] = await Promise.all([api.stats(), api.topics(), api.review()]);
    setStats(s);
    setTopics(t);
    setReview(r);
  }, []);
  const loadList = useCallback(async () => setProblems(await api.list(filters)), [filters]);

  const guard = useCallback(async (fn) => {
    try {
      await fn();
      setError("");
    } catch {
      setError("Can't reach the LeetTrack server.");
    }
  }, []);
  const refreshAll = () => guard(() => Promise.all([loadStats(), loadList()]));

  useEffect(() => { guard(loadStats); }, [guard, loadStats]);
  useEffect(() => { guard(loadList); }, [guard, loadList]);

  // Search waits until typing pauses instead of fetching on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => (f.q === query ? f : { ...f, q: query })), 200);
    return () => clearTimeout(id);
  }, [query]);

  const streakDays = stats?.streak.current ?? 0;
  useEffect(() => {
    document.title = streakDays ? `LeetTrack · ${streakDays} day streak` : "LeetTrack";
  }, [streakDays]);

  const dismiss = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback((t) => {
    const id = ++toastId;
    setToasts((ts) => [...ts.slice(-2), { id, tone: "success", ...t }]);
    setTimeout(() => dismiss(id), t.action ? 6000 : 4000);
  }, [dismiss]);

  const focusForm = (field = "#title") => {
    formRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    requestAnimationFrame(() => formRef.current?.querySelector(field)?.focus({ preventScroll: true }));
  };
  const closeHelp = useCallback(() => setHelp(false), []);

  // N: log a problem · /: search · ?: shortcut list · Esc: close help, then cancel edit.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (help) setHelp(false);
        else if (editing) setEditing(null);
        else if (retrying) setRetrying(null);
        else if (e.target.matches?.("input, textarea, select")) e.target.blur(); // frees N, / and ?
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const typing = e.target.closest?.(
        'input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]');
      if (typing) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setHelp(false);
        if (editing) setEditing(null);
        if (retrying) setRetrying(null);
        focusForm();
      } else if (e.key === "/") {
        e.preventDefault();
        setHelp(false);
        searchRef.current?.focus();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const create = async (p) => {
    await api.create(p);
    toast({ message: `Logged ${p.title.trim()}` });
    refreshAll();
  };
  const logRetry = async (p) => {
    await api.create(p);
    const next = p.status !== "Solved" ? "back tomorrow"
      : retrying.nextIfSolved ? `next review in ${retrying.nextIfSolved} days`
      : "cleared from your review list";
    setRetrying(null);
    toast({ message: `Logged retry of ${p.title} · ${next}` });
    refreshAll();
  };
  const save = async (p) => {
    await api.update(editing.id, p);
    setEditing(null);
    toast({ message: `Saved changes to ${p.title.trim()}` });
    refreshAll();
  };
  const restore = async (p) => {
    try {
      await api.create(pick(p));
      toast({ message: `Restored ${p.title}` });
      refreshAll();
    } catch (err) {
      toast({ tone: "error", message: `Couldn't restore ${p.title}. ${err.message}` });
    }
  };
  const remove = async (p) => {
    try {
      await api.remove(p.id);
      if (editing?.id === p.id) setEditing(null);
      toast({ message: `Deleted ${p.title}`, action: { label: "Undo", run: () => restore(p) } });
      refreshAll();
    } catch (err) {
      toast({ tone: "error", message: `Couldn't delete ${p.title}. ${err.message}` });
    }
  };

  const startPractice = (topic) => { setEditing(null); setRetrying(null); setPractice(topic); focusForm(); };
  const startEdit = (p) => { setRetrying(null); setEditing(p); focusForm(); };
  const startRetry = (item) => { setEditing(null); setRetrying(item); focusForm("#minutes"); };
  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const clearFilters = () => { setQuery(""); setFilters(NO_FILTERS); };

  const loading = !stats && !error;
  const offline = !stats && error;
  const unavailable = <p className="muted">Shows up once the server responds.</p>;
  const filtered = query !== "" || Object.values(filters).some(Boolean);

  let history;
  if (problems === null) {
    history = error
      ? <EmptyState title="Couldn't load your history" body="The server didn't respond. Your data is safe; try again once it's running." action={{ label: "Retry", onClick: refreshAll }} />
      : <TableSkeleton />;
  } else if (problems.length) {
    history = <ProblemTable problems={problems} editingId={editing?.id} onEdit={startEdit} onDelete={remove} />;
  } else if (filtered) {
    history = <EmptyState title="No problems match these filters" body="Try a different search, or clear the filters to see everything you've logged." action={{ label: "Clear filters", onClick: clearFilters }} />;
  } else {
    history = <EmptyState title="No problems logged yet" body="Log your first problem above. Your streak, weak topics and activity all build from here." action={{ label: "Log a problem", onClick: focusForm }} />;
  }

  return (
    <div className="page">
      <header className="top">
        <h1 className="brand">leettrack<span className="dot">.</span></h1>
        <div className="top-right">
          <span className="top-meta">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <ShortcutHelp open={help} onToggle={() => setHelp((h) => !h)} onClose={closeHelp} />
        </div>
      </header>

      {error && (
        <div className="banner" role="alert">
          <AlertCircle className="icon" aria-hidden="true" />
          <span className="banner-msg">{error} Make sure it's running, then retry.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshAll}>Retry</button>
        </div>
      )}

      {stats ? <Hero stats={stats} review={review} onPractice={startPractice} onRetry={startRetry} /> : loading && <HeroSkeleton />}

      <div className="layout">
        <section className="card" ref={formRef}>
          <div className="card-head">
            <h2>{editing ? "Edit problem" : retrying ? `Retry ${retrying.title}` : "Log a problem"}</h2>
            {editing && <p className="hint">Editing “{editing.title}”. Press Esc to cancel.</p>}
            {retrying && (
              <>
                <p className="hint">Logs a new attempt. The original stays in your history. Press Esc to cancel.</p>
                {retrying.lastNotes && <p className="last-notes"><span>Last time</span>{retrying.lastNotes}</p>}
              </>
            )}
          </div>
          <ProblemForm
            key={editing?.id ?? (retrying ? `retry-${retrying.key}` : `new-${practice ?? ""}`)}
            initial={editing}
            retry={editing ? null : retrying}
            defaultTopic={practice}
            topics={topics}
            onSave={editing ? save : retrying ? logRetry : create}
            onCancel={editing ? () => setEditing(null) : retrying ? () => setRetrying(null) : null}
          />
        </section>

        <aside className="side">
          <section className="card">
            <div className="card-head">
              <h2 className="with-count">
                Due for review
                {review?.due.length > 0 && <span className="count">{review.due.length}</span>}
              </h2>
              <p className="hint">Problems you didn't solve come back after 1, 3, 7 and 14 days.</p>
            </div>
            {loading ? <ListSkeleton rows={3} /> : offline || !review ? unavailable
              : <ReviewQueue review={review} activeKey={retrying?.key} onRetry={startRetry} />}
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Weakest topics</h2>
              <p className="hint">Scored 0–100 from fail rate and time spent, adjusted for difficulty.</p>
            </div>
            {loading ? <ListSkeleton /> : offline ? unavailable : <WeakTopics topics={stats.topics} />}
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Activity</h2>
              <p className="hint">Problems logged per day, last 16 weeks.</p>
            </div>
            {loading ? <Skeleton className="sk-heatmap" /> : offline ? unavailable : <Heatmap perDay={stats.perDay} />}
          </section>
        </aside>
      </div>

      <section className="card">
        <div className="list-head">
          <h2>History</h2>
          <div className="filters">
            <input ref={searchRef} type="search" aria-label="Search problems" placeholder="Search problems"
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <select aria-label="Filter by topic" value={filters.topic} onChange={setFilter("topic")}>
              <option value="">All topics</option>
              {topics.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select aria-label="Filter by difficulty" value={filters.difficulty} onChange={setFilter("difficulty")}>
              <option value="">Any difficulty</option>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <select aria-label="Filter by result" value={filters.status} onChange={setFilter("status")}>
              <option value="">Any result</option>
              <option>Solved</option><option>Attempted</option>
            </select>
          </div>
        </div>
        {history}
      </section>

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
