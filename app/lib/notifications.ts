import { apiClient } from "~/lib/api-client";

/**
 * Customer inbox API wrapper. See backend/openapi.yml:
 *
 *   GET /api/inbox -> InboxItem[] (customer only — farmer/admin receive 403)
 *
 * The backend merges platform broadcasts, farm announcements, ripeness
 * notices and (once backend #62 lands) care instructions into one
 * newest-first feed. The wire kind for a ripeness notice is
 * `ripeness_notice`; it is mapped to the UI's shorter `ripeness` here.
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
  kind: "broadcast" | "announcement" | "ripeness_notice" | "care";
  subject: string;
  body: string;
  farm_name?: string;
  created_at: string;
};

export function kindFromResponse(
  kind: InboxItemResponse["kind"],
): NotificationKind {
  if (kind === "ripeness_notice") return "ripeness";
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
