import { apiClient, ApiError } from "~/lib/api-client";

/**
 * Auth helpers, thin wrappers over the api client. These mirror the backend's
 * auth endpoints (see backend openapi.yml):
 *
 *   POST /api/auth/register      -> 202, { message }; no account yet, no cookies
 *   POST /api/auth/verify-email  -> sets cookies, returns { id, role, first_name, last_name, postal_code }
 *   POST /api/auth/login         -> sets cookies, returns { id, role, first_name, last_name, postal_code }
 *   GET  /api/auth/me            -> returns { id, role, first_name, last_name, postal_code } for the cookie
 *
 * The tokens live in HttpOnly cookies the browser can't read; we keep only a
 * minimal `auth_user` in localStorage for fast client-side role checks/redirects.
 * The cookie is always the source of truth — `me()` re-validates against it.
 */

export type Role = "admin" | "farmer" | "customer";

/**
 * Human-readable label for a role, e.g. for "You're signed in as a {{role}}"
 * messages. Takes `t` rather than calling useTranslation itself so this stays
 * a plain function usable from any component regardless of which namespaces
 * it already loaded — pass the `auth` namespace's `t`, or any multi-namespace
 * `t` that includes it (the `auth:` prefix below resolves either way).
 */
export function roleLabel(t: (key: string) => string, role: Role): string {
  switch (role) {
    case "customer":
      return t("auth:roleCustomer");
    case "farmer":
      return t("auth:roleFarmer");
    case "admin":
      return t("auth:roleAdmin");
  }
}

export type Account = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
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
  first_name: string;
  last_name: string;
  postal_code: number;
};

function fromResponse(res: SessionAccountResponse): Account {
  return { id: res.id, role: res.role, firstName: res.first_name, lastName: res.last_name, postalCode: res.postal_code };
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
  /** Required when role is "farmer". */
  address?: string;
  /** Optional; only used when role is "farmer". */
  description?: string;
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
    // A stale entry cached before these fields existed on this type would
    // otherwise carry `undefined` at runtime despite the type saying `number`/`string`.
    return { ...parsed, postalCode: parsed.postalCode ?? 0, firstName: parsed.firstName ?? "", lastName: parsed.lastName ?? "" };
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

/**
 * Submits the registration form. This no longer creates the account or logs
 * anyone in — the backend sends a verification email and the account is only
 * created once the visitor clicks that link (see `verifyEmail` below).
 */
export async function register(input: RegisterInput): Promise<void> {
  await apiClient.post<{ message: string }>("/auth/register", {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    password: input.password,
    role: input.role,
    postal_code: input.postalCode,
    farm_name: input.farmName ?? "",
    address: input.address ?? "",
    description: input.description ?? "",
  });
}

/**
 * Consumes the token from a verification email link. This is what actually
 * creates the account and sets the auth cookies — the equivalent of what
 * `register` used to do in one step.
 */
export async function verifyEmail(token: string): Promise<Account> {
  const res = await apiClient.post<SessionAccountResponse>("/auth/verify-email", { token });
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
