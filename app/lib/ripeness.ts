import { apiClient } from "~/lib/api-client";

/**
 * Ripeness notice API wrapper. See backend/openapi.yml:
 *
 *   POST /api/plots/{plotID}/ripeness -> CreatedRipenessNotice (farmer only)
 *
 * Unlike announcements.ts, this is create-only: a ripeness notice has no
 * board of its own — it appears in the recipients' inbox (`kind:
 * "ripeness_notice"`, see notifications.ts) and is
 * otherwise mail-only, so there is nothing here for the farmer to read back.
 *
 * Like announcements.ts, the wire shape is snake_case and gets mapped to
 * camelCase at this module's boundary.
 */

export type CreatedRipenessNotice = {
  id: string;
  farmer: string;
  farmName: string;
  plot: string;
  plotName: string;
  crop: string;
  cropName: string;
  /** ISO 8601. Parse with `new Date(...)` at render time. */
  createdAt: string;
  /** How many tenants were queued for delivery, not how many were reached. */
  recipients: number;
};

type CreatedRipenessNoticeResponse = {
  id: string;
  farmer: string;
  farm_name: string;
  plot: string;
  plot_name: string;
  crop: string;
  crop_name: string;
  created_at: string;
  recipients: number;
};

/**
 * Posts a ripeness notice for a plot owned by the authenticated farmer,
 * mailing everyone currently renting that plot with the given crop.
 */
export async function createRipenessNotice(plotId: string, cropId: string): Promise<CreatedRipenessNotice> {
  const res = await apiClient.post<CreatedRipenessNoticeResponse>(`/plots/${plotId}/ripeness`, {
    crop_id: cropId,
  });
  return {
    id: res.id,
    farmer: res.farmer,
    farmName: res.farm_name,
    plot: res.plot,
    plotName: res.plot_name,
    crop: res.crop,
    cropName: res.crop_name,
    createdAt: res.created_at,
    recipients: res.recipients,
  };
}
