import { apiClient } from "~/lib/api-client";

/**
 * Bulletin board ("Schwarzes Brett") API wrapper. See backend/openapi.yml:
 *
 *   GET  /api/announcements -> Announcement[] (farmer: their own posts;
 *     customer: every farm they currently rent from — newest first)
 *   POST /api/announcements -> CreatedAnnouncement (farmer only) — the
 *     farmer-side announce screen, issue #39.
 *
 * Like auth.ts, the wire shape is snake_case (`farm_name`, `created_at`) and
 * gets mapped to camelCase at this module's boundary.
 */

export type Announcement = {
  id: string;
  farmer: string;
  farmName: string;
  subject: string;
  body: string;
  /** Set when the post was scoped to one field. At most one of fieldId/plotId is ever set. */
  fieldId?: string;
  /** Set when the post was scoped to one plot. */
  plotId?: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  createdAt: string;
};

type AnnouncementResponse = {
  id: string;
  farmer: string;
  farm_name: string;
  subject: string;
  body: string;
  field_id?: string;
  plot_id?: string;
  created_at: string;
};

function fromResponse(res: AnnouncementResponse): Announcement {
  return {
    id: res.id,
    farmer: res.farmer,
    farmName: res.farm_name,
    subject: res.subject,
    body: res.body,
    fieldId: res.field_id,
    plotId: res.plot_id,
    createdAt: res.created_at,
  };
}

/**
 * The board, scoped to the caller's role by the backend. Newest first, `[]`
 * when there's nothing to read yet.
 */
export async function listAnnouncements(): Promise<Announcement[]> {
  const res = await apiClient.get<AnnouncementResponse[]>("/announcements");
  return res.map(fromResponse);
}

export type CreateAnnouncementInput = {
  subject: string;
  body: string;
  /** At most one of fieldId/plotId may be set — omitting both reaches every current tenant. */
  fieldId?: string;
  plotId?: string;
};

export type CreatedAnnouncement = Announcement & {
  /** How many tenants were queued for delivery, not how many were reached — see backend/openapi.yml. */
  recipients: number;
};

type CreatedAnnouncementResponse = AnnouncementResponse & { recipients: number };

/** Farmer only. Stores the notice and mails the audience the scope selects. */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<CreatedAnnouncement> {
  const res = await apiClient.post<CreatedAnnouncementResponse>("/announcements", {
    subject: input.subject,
    body: input.body,
    field_id: input.fieldId,
    plot_id: input.plotId,
  });
  return { ...fromResponse(res), recipients: res.recipients };
}
