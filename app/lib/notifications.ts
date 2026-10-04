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

export type NotificationKind = "ripeness" | "care" | "farm" | "announcement";

export type Notification = {
  id: string;
  kind: NotificationKind;
  subject: string;
  body: string;
  /** Farm or broadcast sender name */
  sender: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  createdAt: string;
  /** Set for ripeness and care notifications */
  cropName?: string;
  /** Set only for care items */
  fieldName?: string;
  /** Set only for ripeness items */
  plotName?: string;
};

type InboxItemResponse = {
  id: string;
  kind: "broadcast" | "announcement" | "private_message" | "ripeness_notice" | "care";
  subject: string;
  body: string;
  farm_name?: string;
  field_name?: string;
  plot_name?: string;
  crop_name?: string;
  created_at: string;
};

export function kindFromResponse(
  kind: InboxItemResponse["kind"],
): NotificationKind {
  if (kind === "ripeness_notice") return "ripeness";
  if (kind === "care") return "care";
  if (kind === "announcement") return "announcement";
  return "farm";
}

export function fromResponse(r: InboxItemResponse): Notification {
  return {
    id: r.id,
    kind: kindFromResponse(r.kind),
    subject: r.subject,
    body: r.body,
    sender: r.farm_name ?? "Farmland",
    createdAt: r.created_at,
    cropName: r.crop_name,
    fieldName: r.field_name,
    plotName: r.plot_name,
  };
}

/** Newest first, `[]` when there are no notifications yet. */
export async function listNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<InboxItemResponse[]>("/inbox");
  return res.map(fromResponse);
}

/**
 * The newest ripeness notice sent today (local calendar day), or null. The
 * tenant's Home shows it as "ripe today"; `notifications` is newest-first as
 * listNotifications returns it, but this doesn't rely on that order.
 */
export function ripeToday(notifications: Notification[], now: Date = new Date()): Notification | null {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let newest: Notification | null = null;
  for (const notification of notifications) {
    if (notification.kind !== "ripeness") continue;
    const sentAt = new Date(notification.createdAt).getTime();
    if (sentAt < startOfToday || sentAt > now.getTime()) continue;
    if (!newest || sentAt > new Date(newest.createdAt).getTime()) newest = notification;
  }
  return newest;
}
