# AGENT.md

Guidance for AI agents (and humans) working in this repository.

> **Status: empty repo.** Nothing is scaffolded yet. Sections marked **TBD** are
> decisions nobody has made — when you make one, update this file in the same change.

## Project

React frontend for **Bauer as a Service (BaaS)**.

- Repo: <https://github.com/Neue-Konzepte-BaaS/frontend>
- Backend: <https://github.com/Neue-Konzepte-BaaS/backend> (Go + PostgreSQL, separate repo)

## Scope boundary

Frontend only. No server code, no database access — the app talks to the backend over
its HTTP API. If you need an API change, note it explicitly in your summary; it has to
happen in the backend repo.

## TBD

Nothing here is chosen yet:

- Build tool / scaffold (Vite, Next.js, …) and TypeScript vs. JavaScript
- Package manager — pick one and commit its lockfile
- Routing, state management, styling
- API base URL config and the client used to call the backend
- Testing setup, linting/formatting, CI

Ask before picking any of these — they are project-wide decisions, not implementation
details. Once picked, document the dev commands in `README.md` and the conventions here.

## Working in this repo

- Small, focused commits with imperative messages ("add login form").
- Never commit secrets or `.env` files.
- Say plainly if something is broken or unfinished.
- Keep this file current: it is the shared context for everyone working here.
