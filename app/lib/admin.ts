import { apiClient } from "~/lib/api-client";
import type { Role } from "~/lib/auth";
import type { Crop } from "~/lib/fields";

/**
 * Admin-only API wrappers. See backend/openapi.yml for the contract:
 *
 *   GET  /api/statistics     -> Statistics   (farmer or admin; scope derived from role)
 *   POST /api/notifications  -> BroadcastAccepted  (admin only)
 *   POST /api/crops          -> Crop                (admin only)
 *   GET  /api/crops          -> Crop[]              (public; re-exported for convenience)
 *   GET  /api/admin/farms    -> Page<FarmListing>    (admin only)
 *   GET  /api/admin/accounts -> Page<AccountListing> (admin only)
 *
 * The two /api/admin listings are the platform's back-office views (backend
 * #50/#51). Their JSON is camelCase, so no mapping layer is needed here —
 * checked against the handlers, not assumed; see architecture.md's note on the
 * backend's inconsistent casing.
 */

export type { Crop } from "~/lib/fields";
export { listCrops } from "~/lib/fields";

export type FieldStatistics = {
  total: number;
  areaSquareMeters: number;
};

export type PlotStatistics = {
  total: number;
  rented: number;
  available: number;
  areaSquareMeters: number;
  occupancyRate: number;
};

export type RentalStatistics = {
  total: number;
  active: number;
  last30Days: number;
};

export type AccountStatistics = {
  total: number;
  farmers: number;
  customers: number;
  registeredLast30Days: number;
};

export type Statistics = {
  scope: "farm" | "platform";
  generatedAt: string;
  fields: FieldStatistics;
  plots: PlotStatistics;
  rentals: RentalStatistics;
  accounts?: AccountStatistics;
};

export type BroadcastAccepted = {
  recipients: number;
};

export function getStatistics(): Promise<Statistics> {
  return apiClient.get<Statistics>("/statistics");
}

export function broadcastNotification(subject: string, body: string): Promise<BroadcastAccepted> {
  return apiClient.post<BroadcastAccepted>("/notifications", { subject, body });
}

export function createCrop(name: string, durationMonths: number): Promise<Crop> {
  return apiClient.post<Crop>("/crops", { name, durationMonths });
}

export function deleteCrop(id: string): Promise<void> {
  return apiClient.delete(`/crops/${id}`);
}

/**
 * A window onto a longer list, plus how many rows the filter matched in total.
 * The two /api/admin listings return this envelope instead of the bare arrays
 * /api/fields, /api/rentals and /api/announcements return — a bare array has
 * nowhere to put `total`.
 */
export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Rows per page for both admin listings. A constant, never a user-supplied
 * value: the backend answers a `limit` outside [1, 100] with a 400 rather than
 * clamping it, so there is nothing to be gained by making it adjustable and a
 * broken page to be had by getting it wrong.
 */
export const ADMIN_PAGE_SIZE = 20;

export type FarmOwner = {
  firstName: string;
  lastName: string;
  email: string;
};

export type FarmListing = {
  id: string;
  farmerId: string;
  name: string;
  address: string;
  /** The owner's postal code — the farm itself carries only a free-text address. */
  postalCode: number;
  owner: FarmOwner;
  /** When the owning account registered; a farm has no timestamp of its own. */
  createdAt: string;
  /** Same shapes, same predicates as GET /api/statistics — summing these
   *  across every page reproduces the platform figures exactly. */
  fields: FieldStatistics;
  plots: PlotStatistics;
  activeRentals: number;
};

export type AccountListing = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Null for an account belonging to no subtype table — an orphan the admin
   *  list is the one place to notice. Not a role the client failed to parse. */
  role: Role | null;
  createdAt: string;
};

export type FarmListParams = {
  /** Matched against farm name and address, and the owner's name and email. */
  query?: string;
  postalCode?: number;
  offset?: number;
};

export type AccountListParams = {
  /** Matched against email, first name and last name. */
  query?: string;
  /** Omit for every role. An unknown value is a 400, so only pass a real Role. */
  role?: Role;
  offset?: number;
};

/** Drops empty values so absent filters stay absent rather than becoming "". */
function listQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams({ limit: String(ADMIN_PAGE_SIZE) });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}

export function listFarms({ query, postalCode, offset }: FarmListParams = {}): Promise<Page<FarmListing>> {
  return apiClient.get<Page<FarmListing>>(`/admin/farms?${listQuery({ q: query, postalCode, offset })}`);
}

export function listAccounts({ query, role, offset }: AccountListParams = {}): Promise<Page<AccountListing>> {
  return apiClient.get<Page<AccountListing>>(`/admin/accounts?${listQuery({ q: query, role, offset })}`);
}
