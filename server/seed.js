// Fills the DB with sample data so the dashboard isn't empty on first run.
// Usage: npm run seed
import { db } from "./db.js";

const sample = [
  ["Two Sum", "Arrays & Hashing", "Easy", "Solved", 12],
  ["Valid Anagram", "Arrays & Hashing", "Easy", "Solved", 8],
  ["Group Anagrams", "Arrays & Hashing", "Medium", "Solved", 25],
  ["Valid Palindrome", "Two Pointers", "Easy", "Solved", 10],
  ["3Sum", "Two Pointers", "Medium", "Attempted", 45],
  ["Best Time to Buy and Sell Stock", "Sliding Window", "Easy", "Solved", 14],
  ["Longest Substring Without Repeating Characters", "Sliding Window", "Medium", "Solved", 35],
  ["Valid Parentheses", "Stack", "Easy", "Solved", 11],
  ["Binary Search", "Binary Search", "Easy", "Solved", 9],
  ["Search in Rotated Sorted Array", "Binary Search", "Medium", "Attempted", 50],
  ["Reverse Linked List", "Linked List", "Easy", "Solved", 13],
  ["Invert Binary Tree", "Trees", "Easy", "Solved", 10],
  ["Climbing Stairs", "Dynamic Programming", "Easy", "Solved", 20],
  ["Coin Change", "Dynamic Programming", "Medium", "Attempted", 55],
  ["Number of Islands", "Graphs", "Medium", "Solved", 30],
];

const today = new Date();
const insert = db.prepare(
  `INSERT INTO problems (title, topic, difficulty, status, minutes, solved_on)
   VALUES (?, ?, ?, ?, ?, ?)`
);

db.exec("DELETE FROM problems");
sample.forEach(([title, topic, diff, status, mins], i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - Math.floor(i * 1.3)); // spread over ~3 weeks with a few gaps
  insert.run(title, topic, diff, status, mins, d.toISOString().slice(0, 10));
});

console.log(`Seeded ${sample.length} problems.`);
