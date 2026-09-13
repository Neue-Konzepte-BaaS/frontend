# AGENT.md

Guidance for AI agents (and humans) working in this repository.

## Project

React frontend for **Bauer as a Service (BaaS)** — a B2B SaaS for managing
self-harvest farm plots. The app is in **English**.

- Repo: <https://github.com/Neue-Konzepte-BaaS/frontend>
- Backend: <https://github.com/Neue-Konzepte-BaaS/backend> (Go + PostgreSQL, separate repo)

Read first:

- **`context.md`** — what we're building and why (product, roles, MVP, users).
- **`architecture.md`** — how the code is laid out (stack, folders, API client, conventions).

## Stack (decided)

React Router v8 (framework mode, **SPA** — `ssr: false`) · Tailwind v4 ·
TypeScript strict · npm. Path alias `~/*` → `app/*`. Details in `architecture.md`.

## Scope boundary

Frontend only. No server code, no database access — the app talks to the backend
over its HTTP API. If you need an API change, note it explicitly in your summary;
it has to happen in the backend repo.

## Working in this repo

- Small, focused commits with imperative messages ("add login form").
- Never commit secrets or `.env` files.
- Say plainly if something is broken or unfinished.
- A local `react-router` skill lives at `.agents/skills/react-router/`.
- Keep the docs current: when you make a project-wide decision, record it in
  `architecture.md` (or `context.md` if it's about product scope) in the same change.
