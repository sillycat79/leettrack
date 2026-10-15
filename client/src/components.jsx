import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Keyboard, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { localDate } from "./api.js";

export const DEFAULT_TOPICS = [
  "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack", "Binary Search",
  "Linked List", "Trees", "Heap", "Backtracking", "Graphs", "Dynamic Programming",
  "Greedy", "Intervals", "Math", "Bit Manipulation", "Tries",
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const longDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/* ---------- motion ---------- */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COUNT_MS = 450;

/** Animates from the previous value to the new one. First render shows the value as-is. */
function useCountUp(value) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    if (prefersReducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / COUNT_MS);
      const v = Math.round(from + (value - from) * (1 - (1 - k) ** 3)); // ease-out cubic
      current.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

export const Num = ({ value }) => useCountUp(value);

/* ---------- feedback primitives ---------- */

export const Skeleton = ({ className = "" }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export function EmptyState({ title, body, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
      {action && <button type="button" className="btn btn-ghost" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

export function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === "error" ? AlertCircle : Check;
        return (
          <div key={t.id} className={`toast ${t.tone}`}>
            <Icon className="icon" strokeWidth={2} aria-hidden="true" />
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button type="button" className="toast-action" onClick={() => { t.action.run(); onDismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
              <X className="icon" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- keyboard shortcuts ---------- */

const SHORTCUTS = [
  [["N"], "Log a problem"],
  [["/"], "Search history"],
  [["Esc"], "Cancel edit or close"],
  [["←", "→", "↑", "↓"], "Browse activity"],
  [["?"], "Show this list"],
];

export function ShortcutHelp({ open, onToggle, onClose }) {
  const panel = useRef(null);
  const button = useRef(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onDown = (e) => {
      if (!panel.current?.contains(e.target) && !button.current?.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  const closeFromPanel = (e) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onClose();
    button.current?.focus();
  };

  return (
    <div className="help">
      <button ref={button} type="button" className="icon-btn" aria-label="Keyboard shortcuts"
        aria-expanded={open} aria-controls="shortcut-help" title="Keyboard shortcuts (?)" onClick={onToggle}>
        <Keyboard className="icon" aria-hidden="true" />
      </button>
      {open && (
        <div id="shortcut-help" ref={panel} className="popover" role="dialog" aria-label="Keyboard shortcuts"
          tabIndex={-1} onKeyDown={closeFromPanel}>
          <p className="popover-title">Keyboard shortcuts</p>
          <dl className="shortcuts">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/* ---------- summary ---------- */

/** Streak and the next topic to practice come first; totals sit underneath. */
export function Hero({ stats, onPractice }) {
  const { streak, solved, total, byDifficulty, topics } = stats;
  const rate = total ? Math.round((solved / total) * 100) : 0;
  const next = topics[0];
  const covered = new Set([...DEFAULT_TOPICS, ...topics.map((t) => t.topic)]).size;

  // The one celebratory animation: pulse the streak when it goes up after a log.
  const prevStreak = useRef(streak.current);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const rose = streak.current > prevStreak.current;
    prevStreak.current = streak.current;
    if (!rose) return;
    setBump(true);
    const id = setTimeout(() => setBump(false), 700);
    return () => clearTimeout(id);
  }, [streak.current]);

  return (
    <section className="hero" aria-label="Summary">
      <div className="hero-main">
        <div>
          <div className="eyebrow">Current streak</div>
          <div className={`streak-value ${streak.current ? "" : "zero"} ${bump ? "bump" : ""}`}>
            <span className="streak-num"><Num value={streak.current} /></span><span className="streak-unit">{streak.current === 1 ? "day" : "days"}</span>
          </div>
          <span className="sr-only" aria-live="polite">{bump ? `Streak up to ${plural(streak.current, "day")}` : ""}</span>
          <div className="hero-meta">
            {streak.longest ? `Best ${plural(streak.longest, "day")}` : "Log a problem today to start one"}
          </div>
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
          <dd><span className="stat-value"><Num value={solved} /></span><span className="stat-sub"><Num value={rate} />% of <Num value={total} /></span></dd>
        </div>
        <div>
          <dt>By difficulty</dt>
          <dd className="split">
            {["Easy", "Medium", "Hard"].map((d) => (
              <span key={d}>
                <span className="stat-value"><Num value={byDifficulty[d]} /></span>
                <span className="stat-sub">{d === "Medium" ? "Med" : d}</span>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Topics covered</dt>
          <dd><span className="stat-value"><Num value={topics.length} /></span><span className="stat-sub">of {covered}</span></dd>
        </div>
      </dl>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="hero" aria-busy="true" aria-label="Loading summary">
      <div className="hero-main">
        <div>
          <Skeleton className="sk-line sk-short" />
          <Skeleton className="sk-display" />
          <Skeleton className="sk-line sk-short" />
        </div>
        <div className="hero-next">
          <Skeleton className="sk-line sk-short" />
          <Skeleton className="sk-title" />
          <Skeleton className="sk-line" />
        </div>
      </div>
      <div className="hero-stats">
        {[0, 1, 2].map((i) => (
          <div key={i}><Skeleton className="sk-line sk-short" /><Skeleton className="sk-stat" /></div>
        ))}
      </div>
    </section>
  );
}

/* ---------- activity ---------- */

/** GitHub-style activity grid. Hover a day, or focus the grid and use arrow keys. */
export function Heatmap({ perDay, weeks = 16 }) {
  const cells = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay()); // align to Sunday
    const out = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = localDate(d);
      out.push({ key, count: perDay[key] || 0, month: d.getMonth(), day: d.getDate() });
    }
    return out;
  }, [perDay, weeks]);
  const [active, setActive] = useState(null);

  const cols = Math.ceil(cells.length / 7);
  const months = Array.from({ length: cols }, (_, c) => {
    const first = cells[c * 7];
    const changed = c === 0 ? first.day <= 14 : first.month !== cells[(c - 1) * 7].month;
    return changed ? new Date(2000, first.month).toLocaleDateString(undefined, { month: "short" }) : "";
  });

  function onKeyDown(e) {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key];
    if (e.key === "Escape") return setActive(null);
    if (!step) return;
    e.preventDefault();
    setActive((a) => (a == null ? cells.length - 1 : Math.min(cells.length - 1, Math.max(0, a + step))));
  }

  const cur = active != null ? cells[active] : null;
  const col = active != null ? Math.floor(active / 7) : 0;
  const edge = col < 2 ? "tip-start" : col > cols - 3 ? "tip-end" : "";

  return (
    <div>
      <div className="months" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
        {months.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div
        className="heatmap"
        role="group"
        tabIndex={0}
        aria-label="Practice activity. Use the arrow keys to read each day."
        onKeyDown={onKeyDown}
        onFocus={() => active == null && setActive(cells.length - 1)}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        {cells.map((c, i) => (
          <div
            key={c.key}
            className={`cell l${Math.min(c.count, 4)} ${i === active ? "active" : ""}`}
            onMouseEnter={() => setActive(i)}
          />
        ))}
        {cur && (
          <div
            className={`tip ${edge}`}
            role="status"
            style={{ left: `${((col + 0.5) / cols) * 100}%`, top: `${((active % 7) / 7) * 100}%` }}
          >
            <strong>{cur.count ? plural(cur.count, "problem") : "No problems"}</strong> · {longDate(cur.key)}
          </div>
        )}
      </div>
      <div className="legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`cell l${l}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}

/* ---------- weak topics ---------- */

export function WeakTopics({ topics }) {
  if (!topics.length) {
    return <p className="muted">No weak spots yet. Log a few problems and the topics that slow you down rank here.</p>;
  }
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

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="sk-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}><Skeleton className="sk-line" /><Skeleton className="sk-bar" /></div>
      ))}
    </div>
  );
}

/* ---------- form ---------- */

// Last difficulty + topic used, so the next log starts where the last one left off.
const PREFS_KEY = "leettrack:form-defaults";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {}; } catch { return {}; }
}
function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode: skip */ }
}
let autofocused = false; // only on first load, so cancelling an edit doesn't yank focus

const EMPTY = {
  title: "", url: "", topic: "", difficulty: "Medium",
  status: "Solved", minutes: "", notes: "", solved_on: "",
};

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = "Add the problem name.";
  if (!f.topic.trim()) e.topic = "Pick a topic, or choose + Other to add your own.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.solved_on)) e.solved_on = "Pick the day you did it.";
  if (f.minutes !== "" && !(Number(f.minutes) >= 0)) e.minutes = "Use a number of minutes, like 25.";
  return e;
}

function FieldError({ name, errors }) {
  if (!errors[name]) return null;
  return (
    <span id={`${name}-error`} className="field-error">
      <AlertCircle className="icon" aria-hidden="true" />{errors[name]}
    </span>
  );
}

function Field({ id, label, className = "", errors, children }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      <FieldError name={id} errors={errors} />
    </div>
  );
}

const invalid = (name, errors) =>
  errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

function Segmented({ label, name, options, value, onChange }) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o} className={`seg-btn ${value === o ? "on" : ""}`}>
            <input type="radio" className="sr-only" name={name} value={o}
              checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProblemForm({ initial, defaultTopic, topics, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const prefs = initial ? {} : loadPrefs();
    return {
    ...EMPTY,
    solved_on: localDate(),
    difficulty: ["Easy", "Medium", "Hard"].includes(prefs.difficulty) ? prefs.difficulty : EMPTY.difficulty,
    topic: defaultTopic ?? prefs.topic ?? "",
    ...(initial ? { ...initial, url: initial.url ?? "", notes: initial.notes ?? "", minutes: initial.minutes ?? "" } : {}),
    };
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (initial || autofocused || !window.matchMedia("(pointer: fine)").matches) return;
    autofocused = true;
    ref.current?.querySelector("#title")?.focus({ preventScroll: true });
  }, [initial]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k in patch) delete next[k];
      return next;
    });
  };
  const set = (k) => (e) => update({ [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) {
      requestAnimationFrame(() =>
        ref.current?.querySelector('[aria-invalid="true"], [data-invalid="true"] button')?.focus());
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      if (!initial) {
        savePrefs({ difficulty: form.difficulty, topic: form.topic.trim() });
        setForm({ ...EMPTY, solved_on: form.solved_on, topic: form.topic, difficulty: form.difficulty });
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // A remembered custom topic may not be in the list yet; show it so it's visibly selected.
  const allTopics = [...new Set([...DEFAULT_TOPICS, ...topics, ...(!custom && form.topic ? [form.topic] : [])])];

  return (
    <form className="form" onSubmit={submit} noValidate ref={ref}>
      <div className="grid2">
        <Field id="title" label="Problem" className="span2" errors={errors}>
          <input id="title" value={form.title} onChange={set("title")} placeholder="e.g. Two Sum" {...invalid("title", errors)} />
        </Field>
        <fieldset className="field span2">
          <legend>Topic</legend>
          <div className="chips" data-invalid={!!errors.topic && !custom}
            aria-describedby={errors.topic ? "topic-error" : undefined}>
            {allTopics.map((t) => (
              <button type="button" key={t} aria-pressed={!custom && form.topic === t}
                className={`chip ${!custom && form.topic === t ? "on" : ""}`}
                onClick={() => { setCustom(false); update({ topic: t }); }}>{t}</button>
            ))}
            <button type="button" aria-pressed={custom} className={`chip ${custom ? "on" : ""}`}
              onClick={() => { setCustom(true); update({ topic: "" }); }}>+ Other</button>
          </div>
          {custom && (
            <input autoFocus aria-label="New topic name" value={form.topic} onChange={set("topic")}
              placeholder="New topic name" {...invalid("topic", errors)} />
          )}
          <FieldError name="topic" errors={errors} />
        </fieldset>
        <Segmented label="Difficulty" name="difficulty" options={["Easy", "Medium", "Hard"]}
          value={form.difficulty} onChange={(v) => update({ difficulty: v })} />
        <Segmented label="Result" name="status" options={["Solved", "Attempted"]}
          value={form.status} onChange={(v) => update({ status: v })} />
        <Field id="minutes" label="Minutes" errors={errors}>
          <input id="minutes" type="number" min="0" inputMode="numeric" value={form.minutes} onChange={set("minutes")}
            placeholder="25" {...invalid("minutes", errors)} />
        </Field>
        <Field id="solved_on" label="Date" errors={errors}>
          <input id="solved_on" type="date" value={form.solved_on} onChange={set("solved_on")} {...invalid("solved_on", errors)} />
        </Field>
        <Field id="url" label="Link" className="span2" errors={errors}>
          <input id="url" type="url" value={form.url} onChange={set("url")} placeholder="https://leetcode.com/problems/…" />
        </Field>
        <Field id="notes" label="Notes" className="span2" errors={errors}>
          <textarea id="notes" rows="2" value={form.notes} onChange={set("notes")} placeholder="Key insight, what tripped you up…" />
        </Field>
      </div>
      {formError && (
        <p className="form-error" role="alert"><AlertCircle className="icon" aria-hidden="true" />{formError}</p>
      )}
      <div className="form-actions">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? (initial ? "Saving…" : "Logging…") : (initial ? "Save changes" : "Log problem")}
        </button>
      </div>
    </form>
  );
}

/* ---------- history ---------- */

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

export function ProblemTable({ problems, editingId, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Problem</th><th>Topic</th><th>Difficulty</th><th>Result</th><th>Min</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => (
            <tr key={p.id} className={p.id === editingId ? "editing" : undefined}
              aria-current={p.id === editingId ? "true" : undefined}>
              <td className="date">{p.solved_on}</td>
              <td>
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                {p.notes && <div className="note">{p.notes}</div>}
              </td>
              <td>{p.topic}</td>
              <td><Difficulty value={p.difficulty} /></td>
              <td><Status value={p.status} /></td>
              <td className="minutes">{p.minutes ?? "—"}{p.minutes != null && <span className="m-unit"> min</span>}</td>
              <td className="row-actions">
                <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${p.title}`} onClick={() => onEdit(p)}>
                  <Pencil className="icon" aria-hidden="true" />
                </button>
                <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${p.title}`} onClick={() => onDelete(p)}>
                  <Trash2 className="icon" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="sk-table" aria-busy="true" aria-label="Loading history">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-row">
          <Skeleton className="sk-line sk-date" /><Skeleton className="sk-line" /><Skeleton className="sk-line sk-short" />
        </div>
      ))}
    </div>
  );
}
