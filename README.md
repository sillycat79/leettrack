# LeetTrack

A full-stack tracker for LeetCode / online assessment practice. I log every problem I do (topic, difficulty, time, whether I actually solved it) and it tells me which topics I'm weakest at so I know what to grind next.

<!-- Add a screenshot here: ![LeetTrack dashboard](docs/screenshot.png) -->

## Features

- **Log problems** with topic, difficulty, result (solved / attempted), time taken, link and notes
- **Weak topic ranking** that scores each topic by fail rate and time spent, normalized for difficulty so a slow Hard doesn't count the same as a slow Easy
- **Streaks**: current and longest run of consecutive practice days (doesn't reset until you actually miss a full day)
- **Activity heatmap** for the last 16 weeks
- **Search and filter** history by topic, difficulty and result
- Edit and delete entries, with server-side validation

## Tech stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | React 18, Vite, plain CSS                         |
| Backend  | Node.js, Express REST API                         |
| Database | SQLite via Node's built-in `node:sqlite` (no native deps) |
| Tests    | `node:test` for the stats logic                   |

## Getting started

Requires **Node 22.5+**.

```bash
npm install
npm run seed     # optional: loads sample problems
npm run dev      # API on :3001, web app on :5173
```

Open http://localhost:5173.

Production build (one server serves both the API and the app):

```bash
npm run build
npm start        # http://localhost:3001
```

Run tests:

```bash
npm test
```

## API

| Method | Endpoint              | Description                                         |
| ------ | --------------------- | --------------------------------------------------- |
| GET    | `/api/problems`       | List problems. Query: `q`, `topic`, `difficulty`, `status` |
| POST   | `/api/problems`       | Create a problem                                    |
| PUT    | `/api/problems/:id`   | Update a problem                                    |
| DELETE | `/api/problems/:id`   | Delete a problem                                    |
| GET    | `/api/stats`          | Totals, streaks, per-topic breakdown, daily counts  |
| GET    | `/api/topics`         | Distinct topics in use                              |

## How the weakness score works

For each topic:

- **Fail rate** = attempted-but-not-solved / total
- **Normalized time** = average of `minutes / difficulty weight` (Easy 1, Medium 2, Hard 3), scaled against the slowest topic

`weakness = 0.6 × fail rate + 0.4 × normalized time`, shown as 0 to 100. The logic lives in [`server/stats.js`](server/stats.js) and is unit tested.

## Project structure

```
client/          React app (Vite)
  src/App.jsx        page layout and data loading
  src/components.jsx form, table, heatmap, stat tiles
server/
  index.js       Express routes
  db.js          SQLite schema
  stats.js       streak + weakness calculations
  seed.js        sample data
```

## What I'd add next

- Spaced repetition: resurface problems I attempted but didn't solve
- Auth so multiple people can use one deployment
- Import solved problems from a LeetCode profile
