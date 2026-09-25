import i18next from "~/i18n";
import { API_BASE_URL, PUBLIC_PATHS } from "~/lib/constants";

/**
 * The single API client. Every backend call goes through here — never scatter
 * raw `fetch()` across routes/components (see architecture.md).
 *
 * Responsibilities kept in one place:
 * - JSON encode/decode, `credentials: "include"` so the auth cookies ride along.
 * - Turn non-2xx responses into a typed `ApiError` carrying the status.
 * - On 401, run a single in-flight token refresh and retry the request once.
 *   Concurrent 401s queue behind that one refresh instead of stampeding it.
 *
 * NOTE (Issue #8): the backend does not implement `POST /api/auth/refresh` yet,
 * so a refresh attempt will itself 401 and fall through to `forceLogout()`. That
 * is acceptable for now — the access token lives 15 minutes. Wiring up a real
 * refresh endpoint is a tracked follow-up.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Auth endpoints must never trigger the 401 refresh loop: a failed login is a
 * real 401, not an expired session, and refreshing during refresh would recurse.
 */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/refresh", "/auth/logout"];

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Internal: set once a request has already been retried after a refresh. */
  _retried?: boolean;
};

// One-flight refresh: while a refresh is running, other 401s await this promise
// instead of each firing their own refresh.
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

function resolveRefreshQueue(ok: boolean) {
  for (const resolve of refreshQueue) resolve(ok);
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    // Wait for the in-flight refresh rather than starting a second one.
    return new Promise<boolean>((resolve) => refreshQueue.push(resolve));
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const ok = res.ok;
    resolveRefreshQueue(ok);
    return ok;
  } catch {
    resolveRefreshQueue(false);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Clear client-side auth state and send the user to /login, unless they are
 * already on a public page (so a logged-out visitor to /login isn't bounced).
 */
export function forceLogout() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("auth_user");
  } catch {
    // Ignore storage errors (e.g. privacy mode); the redirect still logs out.
  }

  // "/" is the landing page — public, but checked exactly: it can't go in
  // PUBLIC_PATHS because startsWith("/") would match every path in the app.
  const path = window.location.pathname;
  const onPublicPage = path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (!onPublicPage) {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestWithHeaders<T>(path, options)).data;
}

/**
 * `request`, plus the response headers — for the few endpoints that say
 * something in a header the body cannot carry (e.g. `X-Care-Guide-Source`).
 * The backend has to list such a header in CORS `ExposedHeaders`, or a
 * cross-origin client reads it as absent.
 */
async function requestWithHeaders<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; headers: Headers }> {
  const { method = "GET", body, _retried = false } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body != null ? { "Content-Type": "application/json" } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // 401 on a non-auth path means the session likely expired: try one refresh,
  // then replay the original request exactly once.
  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path) && !_retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return requestWithHeaders<T>(path, { ...options, _retried: true });
    }
    forceLogout();
    throw new ApiError(401, i18next.t("common:sessionExpired"));
  }

  if (res.status === 204) {
    return { data: undefined as T, headers: res.headers };
  }

  // Prefer the backend's `{ error }` message; fall back to a generic one.
  let payload: unknown = undefined;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!res.ok) {
    const message =
      (payload as { error?: string } | undefined)?.error ??
      i18next.t("common:requestFailed", { status: res.status });
    throw new ApiError(res.status, message);
  }

  return { data: payload as T, headers: res.headers };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  getWithHeaders: <T>(path: string) => requestWithHeaders<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
