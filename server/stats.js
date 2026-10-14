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

export function summary(problems, today) {
  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of problems) if (p.status === "Solved") byDifficulty[p.difficulty]++;

  const perDay = {};
  for (const p of problems) perDay[p.solved_on] = (perDay[p.solved_on] || 0) + 1;

  return {
    total: problems.length,
    solved: problems.filter((p) => p.status === "Solved").length,
    byDifficulty,
    streak: streaks(problems.map((p) => p.solved_on), today),
    topics: topicStats(problems),
    perDay,
  };
}
