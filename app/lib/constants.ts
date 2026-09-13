/**
 * App-wide constants.
 *
 * `API_BASE_URL` points at the Go backend's `/api` prefix. In local dev the
 * backend runs on :8080 while this SPA runs on the Vite dev server (:5173), so
 * calls are cross-origin — the api client sends `credentials: "include"` and the
 * backend enables CORS with credentials (see backend README).
 *
 * Override at build/dev time with `VITE_API_BASE_URL` (e.g. for a deployed
 * backend). See https://vite.dev/guide/env-and-mode.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

/** Public routes that must render without an authenticated session. */
export const PUBLIC_PATHS = ["/login", "/register"] as const;
