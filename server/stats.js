// Pure functions so they're easy to test.

const DAY = 24 * 60 * 60 * 1000;

const toDate = (s) => new Date(s + "T00:00:00Z");
const fmt = (d) => d.toISOString().slice(0, 10);

/** Current and longest streak of consecutive days with at least one problem logged. */
export function streaks(dates, today = fmt(new Date())) {
  const days = [...new Set(dates)].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (toDate(days[i]) - toDate(days[i - 1])) / DAY;
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak counts back from today (or yesterday, so it doesn't
  // reset to 0 the moment midnight hits before you've practiced).
  const set = new Set(days);
  let cursor = toDate(today);
  if (!set.has(fmt(cursor))) cursor = new Date(cursor - DAY);
  let current = 0;
  while (set.has(fmt(cursor))) {
    current++;
    cursor = new Date(cursor - DAY);
  }

  return { current, longest };
}

const WEIGHT = { Easy: 1, Medium: 2, Hard: 3 };

/**
 * Per-topic breakdown plus a "weakness" score. A topic is weaker when
 * you fail it more often and take longer on it, adjusted for difficulty
 * (a slow Hard is less worrying than a slow Easy).
 */
export function topicStats(problems) {
  const byTopic = new Map();
  for (const p of problems) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic).push(p);
  }

  const rows = [...byTopic.entries()].map(([topic, list]) => {
    const solved = list.filter((p) => p.status === "Solved").length;
    const timed = list.filter((p) => p.minutes != null);
    const avgMinutes = timed.length
      ? timed.reduce((s, p) => s + p.minutes, 0) / timed.length
      : null;
    // Minutes per unit of difficulty, so topics are comparable.
    const normTime = timed.length
      ? timed.reduce((s, p) => s + p.minutes / WEIGHT[p.difficulty], 0) / timed.length
      : null;
    return {
      topic,
      total: list.length,
      solved,
      solveRate: solved / list.length,
      avgMinutes: avgMinutes == null ? null : Math.round(avgMinutes),
      normTime,
    };
  });

  // Normalize time against the slowest topic, then blend with failure rate.
  const maxNorm = Math.max(0, ...rows.map((r) => r.normTime ?? 0)) || 1;
  for (const r of rows) {
    const timeScore = r.normTime == null ? 0 : r.normTime / maxNorm;
    r.weakness = Math.round(((1 - r.solveRate) * 0.6 + timeScore * 0.4) * 100);
    delete r.normTime;
  }

  return rows.sort((a, b) => b.weakness - a.weakness);
}

/**
 * Identifies the same problem across attempts. Uses the LeetCode slug from the URL
 * when there is one, otherwise slugifies the title the way LeetCode does
 * ("15. 3Sum" -> "3sum", "Pow(x, n)" -> "powx-n"), so both paths agree.
 * Different names for the same problem ("Three Sum") still won't match.
 */
export function problemKey({ title = "", url }) {
  const fromUrl = url?.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (fromUrl) return fromUrl[1].toLowerCase();
  return title
    .toLowerCase()
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export const REVIEW_DAYS = [1, 3, 7, 14];

/** Attempts grouped by problem, oldest first (same-day ties keep insertion order). */
function attemptsByProblem(problems) {
  const byKey = new Map();
  for (const p of problems) {
    const key = problemKey(p);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(p);
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => a.solved_on.localeCompare(b.solved_on) || (a.id ?? 0) - (b.id ?? 0));
  }
  return byKey;
}

/**
 * Spaced repetition for problems you didn't solve. After the latest Attempted,
 * each Solved moves a problem one step along 1 -> 3 -> 7 -> 14 days; four solves
 * in a row clears it, and any new Attempted starts it over. Early retries count.
 */
export function reviewQueue(problems, today = fmt(new Date())) {
  const items = [];
  for (const [key, list] of attemptsByProblem(problems)) {
    const lastFail = list.findLastIndex((p) => p.status === "Attempted");
    if (lastFail === -1) continue;
    const step = list.length - 1 - lastFail;
    if (step >= REVIEW_DAYS.length) continue;

    const latest = list[list.length - 1];
    const dueOn = fmt(new Date(toDate(latest.solved_on).getTime() + REVIEW_DAYS[step] * DAY));
    items.push({
      key,
      title: latest.title,
      url: latest.url,
      topic: latest.topic,
      difficulty: latest.difficulty,
      lastOn: latest.solved_on,
      lastStatus: latest.status,
      lastNotes: [...list].reverse().find((p) => p.notes)?.notes ?? null,
      attempts: list.length,
      step,
      dueOn,
      overdueDays: Math.round((toDate(today) - toDate(dueOn)) / DAY),
      nextIfSolved: REVIEW_DAYS[step + 1] ?? null, // null: solving it clears it
    });
  }

  const due = items
    .filter((i) => i.overdueDays >= 0)
    .sort((a, b) => b.overdueDays - a.overdueDays || a.title.localeCompare(b.title));
  const upcoming = items
    .filter((i) => i.overdueDays < 0)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title));
  return { due, upcoming };
}

/** This Monday-to-Sunday week and how many problems were logged in it (every attempt counts). */
export function weekProgress(problems, today = fmt(new Date())) {
  const t = toDate(today);
  const monday = new Date(t - ((t.getUTCDay() + 6) % 7) * DAY);
  const start = fmt(monday);
  const end = fmt(new Date(monday.getTime() + 6 * DAY));
  const count = problems.filter((p) => p.solved_on >= start && p.solved_on <= end).length;
  return { start, end, count };
}

export function summary(problems, today) {
  // Count each problem once: retries add rows, but solving 3Sum twice is still one problem.
  const solvedDifficulty = new Map();
  for (const [key, list] of attemptsByProblem(problems)) {
    const lastSolve = list.findLast((p) => p.status === "Solved");
    if (lastSolve) solvedDifficulty.set(key, lastSolve.difficulty);
  }
  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  for (const d of solvedDifficulty.values()) byDifficulty[d]++;

  const perDay = {};
  for (const p of problems) perDay[p.solved_on] = (perDay[p.solved_on] || 0) + 1;

  return {
    total: problems.length,
    solved: solvedDifficulty.size,
    solves: problems.filter((p) => p.status === "Solved").length,
    byDifficulty,
    streak: streaks(problems.map((p) => p.solved_on), today),
    topics: topicStats(problems),
    perDay,
    week: weekProgress(problems, today),
  };
}
