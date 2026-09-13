import { apiClient, ApiError } from "~/lib/api-client";

/**
 * Auth helpers, thin wrappers over the api client. These mirror the backend's
 * auth endpoints (see backend openapi.yml):
 *
 *   POST /api/auth/register  -> sets cookies, returns { id, role, postal_code }
 *   POST /api/auth/login     -> sets cookies, returns { id, role, postal_code }
 *   GET  /api/auth/me        -> returns { id, role, postal_code } for the cookie
 *
 * The tokens live in HttpOnly cookies the browser can't read; we keep only a
 * minimal `auth_user` in localStorage for fast client-side role checks/redirects.
 * The cookie is always the source of truth — `me()` re-validates against it.
 */

export type Role = "admin" | "farmer" | "customer";

export type Account = {
  id: string;
  role: Role;
  /**
   * 0 for admins (no subtype postal_code column) and for any Account cached
   * in localStorage from before this field existed — treat 0 as "unknown",
   * not literally postal code zero.
   */
  postalCode: number;
};

/** Wire shape returned by the backend's auth endpoints (snake_case). */
type SessionAccountResponse = {
  id: string;
  role: Role;
  postal_code: number;
};

function fromResponse(res: SessionAccountResponse): Account {
  return { id: res.id, role: res.role, postalCode: res.postal_code };
}

/** Roles a user may pick when registering. Admins are seeded in the DB. */
export type RegisterableRole = "farmer" | "customer";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: RegisterableRole;
  postalCode: number;
  /** Required when role is "farmer". */
  farmName?: string;
};

const AUTH_USER_KEY = "auth_user";

function rememberUser(account: Account) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(account));
  } catch {
    // Non-fatal: `me()` still works off the cookie if storage is unavailable.
  }
}

/** The last-known account from localStorage, or null. Not authoritative. */
export function getStoredUser(): Account | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Account;
    // A stale entry cached before `postalCode` existed on this type would
    // otherwise carry `undefined` at runtime despite the type saying `number`.
    return { ...parsed, postalCode: parsed.postalCode ?? 0 };
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<Account> {
  const res = await apiClient.post<SessionAccountResponse>("/auth/login", { email, password });
  const account = fromResponse(res);
  rememberUser(account);
  return account;
}

export async function register(input: RegisterInput): Promise<Account> {
  const res = await apiClient.post<SessionAccountResponse>("/auth/register", {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    password: input.password,
    role: input.role,
    postal_code: input.postalCode,
    farm_name: input.farmName ?? "",
  });
  const account = fromResponse(res);
  rememberUser(account);
  return account;
}

/**
 * Resolve the current account from the auth cookie. Returns null when the user
 * is not authenticated (401) so callers/loaders can redirect to /login.
 */
export async function me(): Promise<Account | null> {
  try {
    const res = await apiClient.get<SessionAccountResponse>("/auth/me");
    const account = fromResponse(res);
    rememberUser(account);
    return account;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

/**
 * Log out: expire the auth cookies on the server (they're HttpOnly, so the
 * browser can't clear them) and drop the local hint. Best-effort — even if the
 * request fails we still clear local state so the UI reflects a logged-out user.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout");
  } catch {
    // ignore network/HTTP errors; local state is cleared below regardless
  }
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // ignore
  }
}

/** The dashboard path for a given role. */
export function dashboardPath(role: Role): string {
  return `/${role}`;
}
