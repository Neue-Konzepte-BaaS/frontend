import { apiClient } from "~/lib/api-client";

/**
 * Customer inbox API wrapper. See backend/openapi.yml:
 *
 *   GET /api/inbox -> InboxItem[] (customer only — farmer/admin receive 403)
 *
 * The backend merges platform broadcasts and farm announcements into one
 * newest-first feed. `ripeness` and `care` kinds are not yet emitted by the
 * backend — they are modelled here for when the backend adds them.
 *
 * Like announcements.ts, the wire shape is snake_case (`farm_name`,
 * `created_at`) and gets mapped to camelCase at this module's boundary.
 */

export type NotificationKind = "ripeness" | "care" | "farm";

export type Notification = {
  id: string;
  kind: NotificationKind;
  subject: string;
  body: string;
  /** Farm or broadcast sender name */
  sender: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  createdAt: string;
};

type InboxItemResponse = {
  id: string;
  /** Backend emits "broadcast" | "announcement" today; "ripeness" | "care" are planned. */
  kind: "broadcast" | "announcement" | "ripeness" | "care";
  subject: string;
  body: string;
  farm_name?: string;
  created_at: string;
};

function kindFromResponse(kind: InboxItemResponse["kind"]): NotificationKind {
  if (kind === "ripeness") return "ripeness";
  if (kind === "care") return "care";
  return "farm";
}

function fromResponse(r: InboxItemResponse): Notification {
  return {
    id: r.id,
    kind: kindFromResponse(r.kind),
    subject: r.subject,
    body: r.body,
    sender: r.farm_name ?? "Bauer as a Service",
    createdAt: r.created_at,
  };
}

/** Newest first, `[]` when there are no notifications yet. */
export async function listNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<InboxItemResponse[]>("/inbox");
  return res.map(fromResponse);
}
