# architecture.md

Lightweight conventions so the codebase stays coherent. Rules, not a straitjacket
— when you make a new decision, write it down here.

## Stack

- **React Router v8**, framework mode, **SPA** (`ssr: false` in `react-router.config.ts`).
- **Tailwind v4** (`@import "tailwindcss"` + `@theme` in `app/app.css`).
- **TypeScript strict**. Path alias `~/*` → `app/*` (see `tsconfig.json`).
- Package manager: **npm** (commit `package-lock.json`).

## Where things go

- `app/routes/` — route modules. Register them in `app/routes.ts` (React Router
  file convention). One route module per screen.
- `app/components/` — shared, reusable UI.
- `app/lib/` — shared logic: constants, the API client, helpers, types.
  E.g. `~/lib/constants.ts`, `~/lib/api-client.ts`.
- Group by feature under these folders when a feature grows — don't invent
  parallel top-level trees.

## Backend & data

- Frontend only. The backend is a **separate Go + PostgreSQL repo**; the app
  talks to it over HTTP. If you need an API change, **flag it in your summary** —
  don't try to implement it here.
- **All backend calls go through one API client** in `~/lib/`. Never scatter raw
  `fetch()` across routes and components.
- Auth is browser-side: cookies (`credentials: "include"`) plus a little state in
  `localStorage`. This is why we run SPA mode — no server-render of authed data.

### API client — reference shape

> **Example, adapt as you scaffold.** This is the intended pattern, not a file to
> paste verbatim. Keep error messages in **English** (the sketch below has German
> strings — translate them).

- A typed `ApiError extends Error` carrying `status` + `message`.
- A single `request<T>(path, options)` wrapping `fetch` with `credentials: "include"`
  and JSON headers; returns parsed JSON, handles `204` as `undefined`.
- On **401**: run a **single in-flight refresh** (`POST /auth/refresh`) with a queue
  so concurrent requests wait for one refresh, then retry once. On refresh failure,
  `forceLogout()` (clear local auth, redirect to `/login` unless on a public path).
- A `NO_REFRESH_PATHS` list for auth endpoints that must not trigger the refresh loop.
- Export an `apiClient` with `get / post / put / patch / delete`.

### Auth entry points

- `~/lib/api-client.ts` — the single API client described above. Every backend
  call goes through it.
- `~/lib/auth.ts` — thin wrappers over the client: `login`, `register`, `me`,
  `logout`, plus the `Account`/`Role` types and `dashboardPath(role)`.
- `~/lib/guards.ts` — `requireRole(role)` for route `clientLoader`s: resolves the
  session via `me()`, redirects unauthenticated users to `/login` and wrong-role
  users to their own dashboard.
- Public routes: `/login`, `/register`. Role-guarded routes: `/admin`, `/farmer`,
  `/customer`.

> **`app/routes/{admin,farmer,customer}.tsx` are TEMPORARY** placeholder
> dashboards. They exist only to verify registration, login, and role-based
> routing (Issue #8). Replace each with the real dashboard — the auth wiring in
> their `clientLoader` (`requireRole`) is the part worth keeping.

> SPA mode: use `clientLoader` for auth/data, never a server `loader`. A
> `HydrateFallback` is only permitted on the **root** route.

## Styling & UX

- Tailwind utility classes; shared design tokens via `@theme` in `app/app.css`.
- Hold the accessibility bar from `context.md`: sufficient contrast, large tap
  targets, few steps, mobile-first.

## Working conventions

- Small, focused commits with imperative messages ("add login form").
- Never commit secrets or `.env`.
- Say plainly when something is broken or unfinished.
- A local `react-router` skill lives at `.agents/skills/react-router/` — consult
  it for routing, loaders/actions, and mode-specific patterns.
