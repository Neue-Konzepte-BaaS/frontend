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
  file convention). One route module per screen. A feature with multiple
  screens sharing chrome/auth gets its own subfolder + a `layout()` route
  (e.g. `app/routes/farmer/`) rather than flat sibling files.
- `app/components/` — shared, reusable UI. `app/components/form.tsx` holds the
  shared form primitives (`inputClass`, `submitClass`, `Field`, `FormError`) —
  every form in the app should use these instead of redefining them.
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
  - **One documented exception:** `~/lib/geocode.ts`, which calls the
    third-party Nominatim geocoding API directly with its own bare `fetch`.
    `apiClient` always prefixes `API_BASE_URL` (our backend) and sends
    `credentials: "include"` — routing a third-party host through it would
    both break the URL and leak our auth cookies cross-origin. Any other
    third-party HTTP call should follow the same pattern: its own small
    module, a comment explaining why it bypasses `apiClient`, and — if the
    provider has a usage policy — caching to stay well under it (see that
    file for Nominatim's ~1req/s-per-application limit).
- Auth is browser-side: cookies (`credentials: "include"`) plus a little state in
  `localStorage`. This is why we run SPA mode — no server-render of authed data.
- **The backend's JSON casing isn't consistent across endpoints — check before
  assuming.** `Field`/`Plot` (`~/lib/fields.ts`) use flat lowercase keys with
  no multi-word fields, so no mapping is needed. `SessionAccount`/
  `RegisterRequest` (`~/lib/auth.ts`) use snake_case (`first_name`,
  `postal_code`), mapped at the module boundary. `Rental`/`NearbyPlot`
  (`~/lib/rentals.ts`, added for plot search + renting) use **camelCase**
  (`plotId`, `startAt`, `distanceMeters`) instead — a real backend
  inconsistency, not a frontend choice. Because TypeScript's own convention
  is camelCase, `rentals.ts` happens to need no mapping layer either (the
  wire shape already matches the TS shape) — don't assume that means every
  new endpoint is camelCase; check the actual response before writing a new
  `~/lib/*.ts` module.

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
- `~/lib/guards.ts` — two clientLoader guards, both resolving the session via
  `me()`:
  - `requireRole(role)` — for a page that's ONLY for one role. Redirects an
    anonymous visitor to `/login`, and a wrong-role visitor to their own
    dashboard.
  - `resolveOptionalRole(role)` — for a page that works for BOTH anonymous
    visitors and one specific role (currently only `/customer`, the public
    plot search that's also the customer's dashboard). An anonymous visitor
    resolves to `null` (not an error, not a redirect) so the page renders its
    logged-out mode; a wrong-role visitor still redirects, same as
    `requireRole`.
  - `safeRedirectTarget(raw)` — validates a `?redirect=` query param for
    post-login navigation (only a same-origin relative path is honored, so a
    crafted link can't turn `/login` into an open redirect). `login.tsx` and
    `register.tsx` both use this so a flow like "Log in to rent" on
    `/customer` returns the visitor to where they started.
- Public routes: `/login`, `/register`, `/customer` (see `PUBLIC_PATHS` in
  `~/lib/constants.ts` — `/customer` is there too since it must survive a
  stale/expired cookie by falling back to logged-out mode, not by being
  bounced to `/login` the way `api-client.ts`'s `forceLogout()` treats every
  other role-guarded page). Role-guarded: `/admin`, `/farmer/*`.

> **`app/routes/admin.tsx` is still a TEMPORARY** placeholder dashboard
> (Issue #8) — deliberately left alone; context.md gives no MVP feature list
> for the admin role, so there's nothing real to build against yet. `/farmer`
> and `/customer` are both real: `/farmer` is a layout route
> (`app/routes/farmer/layout.tsx`) with `requireRole("farmer")` in its
> `clientLoader`, plus child routes for field/plot management
> (`app/routes/farmer/{index,fields,new-field,field-detail}.tsx`; children
> read the already-resolved account via `useRouteLoaderData("farmer-layout")`
> instead of calling `requireRole`/`me()` again). `/customer`
> (`app/routes/customer.tsx`) is a flat route — one screen, not a
> multi-page section, so no layout route — doubling as public plot search
> (anyone) and the customer's own rentals dashboard (logged in).

## Maps (fields & plots)

- **MapLibre GL + Terra Draw** (`maplibre-gl`, `terra-draw`,
  `terra-draw-maplibre-gl-adapter`). Tile style is Esri World Imagery
  satellite, keyless (`~/lib/constants.ts` → `MAP_STYLE_URL`) — a street map
  makes it hard to see a real field's edges to trace them; satellite doesn't.
  OpenFreeMap's street style is kept commented out as `MAP_STYLE_URL_STREETS`
  if that's ever wanted back. See the comments there before changing either.
- The reusable map component is `app/components/map/field-map.tsx`
  (`FieldMap`). It knows only about generic read-only `shapes` plus one
  active `drawMode` ("field" | "plot" | null) — callers decide what a
  rectangle means. `"plot"` mode exists for the type/handler shape but is
  currently unused: plots are no longer hand-drawn (see below).
- **Only the field boundary is hand-drawn. Plots are computed, not drawn.**
  A farmer draws and names a field (`app/routes/farmer/new-field.tsx`), which
  navigates to that field's own detail/"digital twin" page
  (`app/routes/farmer/field-detail.tsx`, route `farmer/fields/:fieldId`).
  There, entering rows × columns computes an equal-sized rectangular grid
  spanning the field (`~/lib/geo.ts` → `subdivideIntoGrid`) and creates each
  cell as a plot via sequential `POST .../plots` calls (no batch-create
  endpoint exists). Once a field has any plots, the grid inputs disappear
  permanently — there is no regenerate, because there is no plot DELETE, and
  regenerating would just pile up duplicate plots with no way to remove the
  old ones. `farmer/fields.tsx`'s field list links each field to this page.
- **Fields and plots can be rotated, any orientation** — not just
  axis-aligned. `TerraDrawAngledRectangleMode` (3-click: corner, corner+angle,
  perpendicular extent) is what draws them; the backend's PostGIS CHECK
  (`sql/migrations/..._rectangle_any_orientation.sql`) accepts a rectangle at
  any rotation via `ST_OrientedEnvelope`.
- **Dev config, in `vite.config.ts`:** `optimizeDeps.exclude: ["maplibre-gl"]`
  — without it, Vite's dev dependency pre-bundler mangles MapLibre's worker
  module URL, producing a silently blank map (404 on
  `maplibre-gl-worker.mjs`, no console error). Production builds are
  unaffected; don't remove this thinking it's unnecessary.
- **The rectangle-shape math has a real projection trap — read this before
  touching `~/lib/geo.ts` or the backend rectangle CHECK.** MapLibre/Terra
  Draw build shapes in Web Mercator projected space (screen space); that
  projection is NOT angle-preserving when converted back to raw lon/lat
  degrees away from the equator (one degree of longitude covers ~34% less
  ground distance than one degree of latitude at Karlsruhe's ~49°N). A shape
  that's a perfect rectangle on screen can measure as low as ~66° at a corner
  in raw lon/lat. Consequences:
  - Every rectangle is normalized (`~/lib/geo.ts` → `normalizeRotatedRectangle`)
    before being sent to the backend, to fix float drift from the drawing
    library — but normalization does NOT fix the projection issue; it
    preserves whatever shape Terra Draw handed it.
  - The backend's rectangle CHECK reprojects to Web Mercator
    (`ST_Transform(coordinates, 3857)`) before testing rectangle-ness — do
    NOT "simplify" this back to checking the raw SRID 4326 geometry, it will
    reject almost every rotated rectangle a farmer actually draws. Verified
    live: a real on-screen-rectangular shape was rejected by an
    SRID-4326-only version of this check and accepted once reprojected.
  - The plot-within-field check (`~/lib/geo.ts` → `polygonWithin`, and the
    backend's `ST_Within` trigger) is deliberately left on raw lon/lat — it's
    a direct containment test, not a trigonometric reconstruction, so it
    doesn't have the same failure mode; don't "fix" it to use Mercator too
    without re-verifying, since the two are not simply interchangeable.
  - `~/lib/geo.ts` → `subdivideIntoGrid` (the plot-grid math, see above) has
    the SAME trap and handles it the same way: it projects the field's
    corners to Mercator meters (`lonLatToMercator`/`mercatorToLonLat`,
    plain spherical-Mercator formulas — deliberately not MapLibre's
    `MercatorCoordinate`, to keep `geo.ts` dependency-free), interpolates the
    grid there, and reprojects each cell back to lon/lat. Interpolating
    directly on raw lon/lat corners would produce visibly skewed
    (non-rectangular) cells for any rotated field of real size. Verified by
    checking the interior angle of every generated cell in Mercator space
    (all ~90.0°) and that the summed cell area matches the field's own area
    to <0.001% before trusting this in the UI.
  - **`subdivideIntoGrid` also insets every cell 1mm toward its own center
    (`GRID_CELL_INSET_M`) — this is load-bearing, not padding, do not
    remove it.** A grid point meant to sit exactly on the field's boundary
    (say, the midpoint of edge A→B) drifts a tiny but nonzero amount
    (~1e-9°) off PostGIS's straight lon/lat edge after the Mercator
    round-trip, because Mercator reprojection is nonlinear — the two only
    coincide exactly at the endpoints. `ST_Within` has no tolerance, so a
    grid generated without this inset was rejected outright on its first
    cell when actually POSTed to the real backend (confirmed corner-by-corner
    with `ST_Contains`/`ST_Touches`/`ST_Distance`). The inset guarantees
    every generated plot is robustly inside the field regardless of which
    way the float noise falls.
- The map's `dragRotate`/`touchZoomRotate` rotation is disabled: rotating the
  *map view* is unrelated to rotating a *drawn shape*, and disabling it
  removes an easy-to-trigger-by-accident touch gesture. Shape rotation works
  identically regardless.
- **No delete on the map itself, but a redraw-before-save exists.** On the
  name-field step (field drawn but not yet saved to the backend), a
  "Redraw" button discards the local draft and returns to drawing — free,
  since nothing was persisted yet. Once a field or plot is actually saved,
  there is still no way to remove it (see below).
- No update/delete endpoints exist yet for fields/plots (backend only has
  create + list) — the UI is deliberately create-and-view-only beyond the
  pre-save redraw above. Flag `PATCH`/`DELETE /api/fields[/{id}/plots/{id}]`
  as a backend follow-up if editing is needed; note the backend's CORS
  `AllowedMethods` would also need those methods added.

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
