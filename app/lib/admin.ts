import { apiClient } from "~/lib/api-client";
import type { Crop } from "~/lib/fields";

/**
 * Admin-only API wrappers. See backend/openapi.yml for the contract:
 *
 *   GET  /api/statistics     -> Statistics   (farmer or admin; scope derived from role)
 *   POST /api/notifications  -> BroadcastAccepted  (admin only)
 *   POST /api/crops          -> Crop                (admin only)
 *   GET  /api/crops          -> Crop[]              (public; re-exported for convenience)
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
