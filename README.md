# LeetTrack

I built this to track my LeetCode / OA practice. I log every problem I do (topic, difficulty, time, and whether I actually solved it), and it shows me which topics I'm weakest at so I know what to work on next. It also tracks my streak.

![LeetTrack dashboard](docs/dashboard.png)

![LeetTrack history](docs/history.png)

<!-- Live demo: add your Render link here once it's deployed -->

**Stack:** React + Vite, Node/Express, SQLite (`node:sqlite`), tested with `node:test`

## Running it

Needs Node 22.5+.

```bash
npm install
npm run seed   # optional sample data
npm run dev
```

Then open http://localhost:5173. Run `npm test` for the tests.

## How the weakness score works

For each topic, I combine how often I fail it with how long it takes me, adjusted for difficulty (a slow Hard shouldn't count the same as a slow Easy):

```
weakness = 0.6 × fail rate + 0.4 × (avg minutes / difficulty weight, scaled to the slowest topic)
```

Difficulty weights are Easy 1, Medium 2, Hard 3. The logic is in [`server/stats.js`](server/stats.js).

## API

| Method | Endpoint            | Description                                  |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/api/problems`     | List problems (filters: `q`, `topic`, `difficulty`, `status`) |
| POST   | `/api/problems`     | Add a problem                                |
| PUT    | `/api/problems/:id` | Update a problem                             |
| DELETE | `/api/problems/:id` | Delete a problem                             |
| GET    | `/api/stats`        | Totals, streaks, per-topic breakdown         |

## Next

Resurfacing problems I attempted but didn't solve, spaced-repetition style.
