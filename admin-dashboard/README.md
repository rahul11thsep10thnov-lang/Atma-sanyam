# Atma Sanyam — Admin Dashboard

React + Vite web admin dashboard for the editorial review workflow
described in ARCHITECTURE.md §24/§25. Talks to the backend's
`/api/v1/admin/*` REST API.

## Quick start

```bash
cp .env.example .env   # points at the backend API, defaults to localhost:4000
npm install
npm run dev             # http://localhost:5173
```

Requires a running backend (`../backend`) and at least one `AdminUser` row
(create via Prisma Studio or a script, with a bcrypt-hashed password).

## Pages

- **Dashboard** — pipeline funnel numbers, most-viewed stories/categories/languages (§24).
- **Stories** — filterable list by pipeline status; drill into a story to see
  extracted facts, corroborating sources, the generated script with any
  safety/moderation flags, video assets, and take editorial actions
  (approve, reject, edit, regenerate script/audio/video) (§25).
- **Sources** — manage news source reliability score and blacklist status.
- **Config** — adjust the suitability/quality/relevance thresholds and the
  auto-publish toggle (§13/§29).
