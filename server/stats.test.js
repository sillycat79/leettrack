import { test } from "node:test";
import assert from "node:assert/strict";
import { streaks, topicStats } from "./stats.js";

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
