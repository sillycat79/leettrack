import { test } from "node:test";
import assert from "node:assert/strict";
import { problemKey, reviewQueue, streaks, summary, topicStats, weekProgress } from "./stats.js";

test("streaks: empty", () => {
  assert.deepEqual(streaks([], "2026-10-14"), { current: 0, longest: 0 });
});

test("streaks: current run ending today", () => {
  const d = ["2026-10-12", "2026-10-13", "2026-10-14"];
  assert.deepEqual(streaks(d, "2026-10-14"), { current: 3, longest: 3 });
});

test("streaks: still alive if last practice was yesterday", () => {
  const d = ["2026-10-12", "2026-10-13"];
  assert.equal(streaks(d, "2026-10-14").current, 2);
});

test("streaks: broken streak, longest kept", () => {
  const d = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-03", "2026-10-10"];
  assert.deepEqual(streaks(d, "2026-10-14"), { current: 0, longest: 3 });
});

test("topicStats: failing topic ranks weaker", () => {
  const rows = topicStats([
    { topic: "Arrays", difficulty: "Easy", status: "Solved", minutes: 10 },
    { topic: "Arrays", difficulty: "Easy", status: "Solved", minutes: 12 },
    { topic: "DP", difficulty: "Medium", status: "Attempted", minutes: 50 },
    { topic: "DP", difficulty: "Medium", status: "Solved", minutes: 40 },
  ]);
  assert.equal(rows[0].topic, "DP");
  assert.equal(rows[0].solveRate, 0.5);
  assert.equal(rows[1].avgMinutes, 11);
});

// ---------- problem keys ----------

test("problemKey: case, number prefix and punctuation all normalize", () => {
  assert.equal(problemKey({ title: "3Sum" }), "3sum");
  assert.equal(problemKey({ title: "3sum" }), "3sum");
  assert.equal(problemKey({ title: "15. 3Sum" }), "3sum");
  assert.equal(problemKey({ title: "Pow(x, n)" }), "powx-n");
  assert.equal(problemKey({ title: "  Best Time to Buy and Sell Stock " }), "best-time-to-buy-and-sell-stock");
});

test("problemKey: URL slug wins and matches the title-based key", () => {
  const withUrl = { title: "Two Sum!", url: "https://leetcode.com/problems/two-sum/description/?envType=x" };
  assert.equal(problemKey(withUrl), "two-sum");
  assert.equal(problemKey({ title: "Two Sum" }), problemKey(withUrl));
});

test("problemKey: non-LeetCode URL falls back to the title", () => {
  assert.equal(problemKey({ title: "Two Sum", url: "https://neetcode.io/problems/two-sum" }), "two-sum");
});

// ---------- review queue ----------

let nextId = 1;
const row = (title, status, solved_on, extra = {}) =>
  ({ id: nextId++, title, topic: "Two Pointers", difficulty: "Medium", status, solved_on, notes: null, ...extra });

test("reviewQueue: only problems with an Attempted row enter", () => {
  const { due, upcoming } = reviewQueue([row("Two Sum", "Solved", "2026-10-01")], "2026-10-15");
  assert.equal(due.length + upcoming.length, 0);
});

test("reviewQueue: schedule steps 1 -> 3 -> 7 -> 14 days, then clears", () => {
  const steps = [
    [[row("3Sum", "Attempted", "2026-10-01")], "2026-10-02", 0],
    [[row("3Sum", "Attempted", "2026-10-01"), row("3Sum", "Solved", "2026-10-02")], "2026-10-05", 1],
    [[row("3Sum", "Attempted", "2026-10-01"), row("3Sum", "Solved", "2026-10-02"),
      row("3Sum", "Solved", "2026-10-05")], "2026-10-12", 2],
    [[row("3Sum", "Attempted", "2026-10-01"), row("3Sum", "Solved", "2026-10-02"),
      row("3Sum", "Solved", "2026-10-05"), row("3Sum", "Solved", "2026-10-12")], "2026-10-26", 3],
  ];
  for (const [rows, dueOn, step] of steps) {
    const [item] = [...reviewQueue(rows, "2026-10-01").due, ...reviewQueue(rows, "2026-10-01").upcoming];
    assert.equal(item.dueOn, dueOn, `step ${step}`);
    assert.equal(item.step, step);
  }
  const cleared = [...steps[3][0], row("3Sum", "Solved", "2026-10-26")];
  const q = reviewQueue(cleared, "2026-11-30");
  assert.equal(q.due.length + q.upcoming.length, 0);
});

test("reviewQueue: a new Attempted after clearing starts it over", () => {
  const rows = [
    row("3Sum", "Attempted", "2026-09-01"),
    ...["2026-09-02", "2026-09-05", "2026-09-12", "2026-09-26"].map((d) => row("3Sum", "Solved", d)),
    row("3Sum", "Attempted", "2026-10-10"),
  ];
  const [item] = reviewQueue(rows, "2026-10-15").due;
  assert.equal(item.step, 0);
  assert.equal(item.dueOn, "2026-10-11");
  assert.equal(item.overdueDays, 4);
});

test("reviewQueue: merges spellings and URL vs no URL into one problem", () => {
  const rows = [
    row("15. 3Sum", "Attempted", "2026-10-01"),
    row("3sum", "Solved", "2026-10-02", { url: "https://leetcode.com/problems/3sum/" }),
  ];
  const q = reviewQueue(rows, "2026-10-03");
  assert.equal(q.due.length + q.upcoming.length, 1);
  assert.equal(q.upcoming[0].attempts, 2);
  assert.equal(q.upcoming[0].title, "3sum"); // display uses the latest row
});

test("reviewQueue: same-day attempts are ordered by insertion", () => {
  const rows = [row("3Sum", "Solved", "2026-10-05"), row("3Sum", "Attempted", "2026-10-05")];
  const [item] = reviewQueue(rows, "2026-10-06").due;
  assert.equal(item.step, 0);
  assert.equal(item.lastStatus, "Attempted");
});

test("reviewQueue: early retries count and reset the clock from that day", () => {
  const rows = [row("3Sum", "Attempted", "2026-10-01"), row("3Sum", "Solved", "2026-10-01")];
  const item = reviewQueue(rows, "2026-10-01").upcoming[0];
  assert.equal(item.step, 1);
  assert.equal(item.dueOn, "2026-10-04");
});

test("reviewQueue: due sorted most overdue first; future dates are upcoming", () => {
  const rows = [
    row("A", "Attempted", "2026-10-10"),
    row("B", "Attempted", "2026-10-01"),
    row("C", "Attempted", "2026-12-01"),
  ];
  const { due, upcoming } = reviewQueue(rows, "2026-10-15");
  assert.deepEqual(due.map((i) => i.title), ["B", "A"]);
  assert.deepEqual(upcoming.map((i) => i.title), ["C"]);
});

test("reviewQueue: keeps the most recent notes and what solving would do next", () => {
  const rows = [
    row("3Sum", "Attempted", "2026-10-01", { notes: "skip duplicates" }),
    row("3Sum", "Solved", "2026-10-02"),
  ];
  const item = reviewQueue(rows, "2026-10-10").due[0];
  assert.equal(item.lastNotes, "skip duplicates");
  assert.equal(item.nextIfSolved, 7);
});

test("summary: solved counts each problem once", () => {
  const rows = [
    row("3Sum", "Attempted", "2026-10-01"),
    row("3Sum", "Solved", "2026-10-02"),
    row("3Sum", "Solved", "2026-10-05"),
    row("Two Sum", "Solved", "2026-10-05", { difficulty: "Easy" }),
  ];
  const s = summary(rows, "2026-10-05");
  assert.equal(s.solved, 2);
  assert.equal(s.solves, 3);
  assert.deepEqual(s.byDifficulty, { Easy: 1, Medium: 1, Hard: 0 });
});

// ---------- weekly goal ----------

test("weekProgress: weeks run Monday to Sunday", () => {
  // 2026-10-15 is a Thursday
  assert.deepEqual(weekProgress([], "2026-10-15"), { start: "2026-10-12", end: "2026-10-18", count: 0 });
  assert.equal(weekProgress([], "2026-10-12").start, "2026-10-12"); // Monday is its own start
  assert.equal(weekProgress([], "2026-10-18").start, "2026-10-12"); // Sunday closes the week
});

test("weekProgress: counts every attempt inside the week, nothing outside", () => {
  const rows = [
    row("A", "Solved", "2026-10-11"),    // last Sunday: previous week
    row("B", "Solved", "2026-10-12"),    // Monday
    row("C", "Attempted", "2026-10-14"), // attempts count too
    row("C", "Solved", "2026-10-15"),    // and retries
    row("D", "Solved", "2026-10-18"),    // later this week still counts
    row("E", "Solved", "2026-10-19"),    // next Monday: next week
  ];
  assert.equal(weekProgress(rows, "2026-10-15").count, 4);
});

test("summary: includes this week's progress", () => {
  const s = summary([row("A", "Solved", "2026-10-13")], "2026-10-15");
  assert.equal(s.week.count, 1);
  assert.equal(s.week.start, "2026-10-12");
});
