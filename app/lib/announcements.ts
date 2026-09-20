import { apiClient } from "~/lib/api-client";

/**
 * Bulletin board ("Schwarzes Brett") API wrapper. See backend/openapi.yml:
 *
 *   GET /api/announcements -> Announcement[] (farmer: their own posts;
 *     customer: every farm they currently rent from — newest first)
 *
 * Posting (farmer only, `POST /api/announcements`) is out of scope here —
 * see issue #39 for the farmer-side announce screen.
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
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  createdAt: string;
};

type AnnouncementResponse = {
  id: string;
  farmer: string;
  farm_name: string;
  subject: string;
  body: string;
  created_at: string;
};

function fromResponse(res: AnnouncementResponse): Announcement {
  return {
    id: res.id,
    farmer: res.farmer,
    farmName: res.farm_name,
    subject: res.subject,
    body: res.body,
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
