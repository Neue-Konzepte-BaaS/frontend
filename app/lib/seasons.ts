import { apiClient } from "~/lib/api-client";

/**
 * Rental seasons: a season is a recurring yearly calendar window (month/day
 * only, no year) that a crop can be tied to. Renting that crop then only
 * succeeds if the whole rental period falls inside the window. See
 * backend/openapi.yml for the authoritative contract:
 *
 *   GET    /api/seasons                -> Season[]          (admin or farmer)
 *   POST   /api/seasons                -> Season            (admin or farmer)
 *   PUT    /api/seasons/{seasonId}     -> Season            (admin or farmer)
 *   DELETE /api/seasons/{seasonId}     -> 204                (admin or farmer)
 *   PUT    /api/crops/{cropId}/season  -> CropSeasonRule    (admin or farmer)
 *   DELETE /api/crops/{cropId}/season  -> 204                (admin or farmer)
 *   GET    /api/crops/seasons          -> CropSeason[]      (admin or farmer)
 *
 * **Default seasons and farm seasons.** An admin maintains the default set
 * (`farmId: null`) — every farm starts from these. A farmer maintains their
 * own farm's set independently; `listSeasons` for a farmer returns the
 * defaults *and* the farm's own seasons in one flat array (split by
 * `farmId === null`), unlike the care guide's default/override pair. A
 * farmer can only edit or delete their own farm's rows — the backend 403s or
 * 404s on an attempt to mutate a default row through these same endpoints.
 *
 * **Crop season rules.** A `CropSeasonRule` separately ties one season to
 * one crop: a default rule (admin, `farmId: null`, every farm without an
 * override uses it) and/or a farm rule (farmer, `farmId` set, must point at
 * one of that farm's own seasons). A crop with no rule at all is
 * unrestricted. Assigning is an upsert — calling assignCropSeason when a
 * rule already exists repoints it rather than failing.
 *
 * The JSON is camelCase — checked against internal/handlers/season_handler.go,
 * not assumed (see architecture.md on the backend's inconsistent casing).
 */

export type Season = {
  id: string;
  /** null = global default (admin-owned); set = that farm's own season. */
  farmId: string | null;
  name: string;
  /** 1-12. */
  startMonth: number;
  /** 1-31. The backend does not validate this against startMonth's length. */
  startDay: number;
  /** 1-12. */
  endMonth: number;
  /** 1-31. The backend does not validate this against endMonth's length. */
  endDay: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
};

export type SeasonInput = {
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type CropSeasonRule = {
  id: string;
  cropId: string;
  seasonId: string;
  /** null = the default rule; set = that farm's own rule. */
  farmId: string | null;
};

/**
 * One crop from the catalog paired with the season it's effectively checked
 * against for the caller: the default rule for an admin, or the effective
 * rule (their own farm's if it has one, the default otherwise) for a
 * farmer. `season: null` means the crop is unrestricted for them.
 */
export type CropSeason = {
  id: string;
  nameDe: string;
  nameEn: string;
  durationMonths: number;
  season: Season | null;
};

/** The caller's own seasons: an admin's defaults, or a farmer's defaults ∪ their own farm's. */
export function listSeasons(): Promise<Season[]> {
  return apiClient.get<Season[]>("/seasons");
}

/** Creates a season in the caller's own set: the defaults for an admin, the farmer's own farm's for a farmer. */
export function createSeason(input: SeasonInput): Promise<Season> {
  return apiClient.post<Season>("/seasons", input);
}

/** Rewrites a season already in the caller's own set. Throws ApiError(404) otherwise. */
export function updateSeason(id: string, input: SeasonInput): Promise<Season> {
  return apiClient.put<Season>(`/seasons/${id}`, input);
}

/** Removes a season from the caller's own set. Throws ApiError(409) if a crop rule still points at it. */
export function deleteSeason(id: string): Promise<void> {
  return apiClient.delete<void>(`/seasons/${id}`);
}

/** Ties a crop to a season (the default rule for an admin, the farmer's own farm's rule for a farmer). Upserts if a rule already exists. */
export function assignCropSeason(cropId: string, seasonId: string): Promise<CropSeasonRule> {
  return apiClient.put<CropSeasonRule>(`/crops/${cropId}/season`, { seasonId });
}

/** Removes the caller's season rule for a crop, so it falls back to the default rule, or becomes unrestricted. */
export function removeCropSeasonRule(cropId: string): Promise<void> {
  return apiClient.delete<void>(`/crops/${cropId}/season`);
}

/** Every crop in the catalog, each with the season it's effectively checked against for the caller. */
export function listCropSeasons(): Promise<CropSeason[]> {
  return apiClient.get<CropSeason[]>("/crops/seasons");
}

/**
 * Whether a full [start, end) period falls entirely within one occurrence of
 * the season, wrap-aware (e.g. a Dec 1 - Feb 28 season). Mirrors the
 * backend's own seasonContainsPeriod in internal/services/rental_service.go
 * so the frontend's pre-submit check agrees with what the backend will
 * actually enforce. This is a client-side UX convenience only — the backend
 * remains authoritative and re-checks at payment time.
 */
export function seasonContainsPeriod(
  season: Pick<Season, "startMonth" | "startDay" | "endMonth" | "endDay">,
  start: Date,
  end: Date,
): boolean {
  const { windowStart, windowEnd } = seasonWindowContaining(season, start);
  return start.getTime() >= windowStart.getTime() && end.getTime() <= windowEnd.getTime();
}

/**
 * Whether at least one start date between `earliestStart` and `latestStart`
 * (inclusive, both truncated to midnight) would let a `durationMonths`-long
 * rental fit entirely within the season. Used to grey out a crop in the
 * rent form before a customer even picks a date: if no day in the pickable
 * range works, showing the date picker at all would only lead to a dead
 * end. Scans day by day — the pickable range is at most 60 days, cheap
 * either way, and this reuses seasonContainsPeriod's exact semantics rather
 * than re-deriving the wrap-aware window math.
 */
export function hasSeasonWindowInRange(
  season: Pick<Season, "startMonth" | "startDay" | "endMonth" | "endDay">,
  durationMonths: number,
  earliestStart: Date,
  latestStart: Date,
): boolean {
  const day = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), earliestStart.getDate());
  const last = new Date(latestStart.getFullYear(), latestStart.getMonth(), latestStart.getDate());
  while (day.getTime() <= last.getTime()) {
    const end = new Date(day);
    end.setMonth(end.getMonth() + durationMonths);
    if (seasonContainsPeriod(season, day, end)) {
      return true;
    }
    day.setDate(day.getDate() + 1);
  }
  return false;
}

/**
 * The concrete [start, end) timestamps of the season's occurrence containing
 * `at`, anchored to the calendar year `at` falls in. For a season that wraps
 * the year boundary (end before start), the occurrence starting in the
 * previous year is used when `at` falls before that year's own start date.
 */
function seasonWindowContaining(
  season: Pick<Season, "startMonth" | "startDay" | "endMonth" | "endDay">,
  at: Date,
): { windowStart: Date; windowEnd: Date } {
  const year = at.getFullYear();
  const wraps = season.endMonth < season.startMonth || (season.endMonth === season.startMonth && season.endDay < season.startDay);

  let windowStart = new Date(year, season.startMonth - 1, season.startDay);
  if (!wraps) {
    const windowEnd = new Date(year, season.endMonth - 1, season.endDay + 1);
    return { windowStart, windowEnd };
  }

  // Wrapping season: the occurrence containing `at` either started this
  // calendar year and ends next year, or started last calendar year and
  // ends this year.
  if (at.getTime() < windowStart.getTime()) {
    windowStart = new Date(year - 1, season.startMonth - 1, season.startDay);
    const windowEnd = new Date(year, season.endMonth - 1, season.endDay + 1);
    return { windowStart, windowEnd };
  }
  const windowEnd = new Date(year + 1, season.endMonth - 1, season.endDay + 1);
  return { windowStart, windowEnd };
}

/** The 12 month names in order (index 0 = January), localized and capitalized as `Intl` renders them. */
export function monthNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2027, i, 1)));
}

/** Human string like "Mar 1 – May 31", wrap-aware, for the given locale. */
export function formatSeasonWindow(season: Pick<Season, "startMonth" | "startDay" | "endMonth" | "endDay">, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  // The year is a placeholder only — formatting with month/day options never renders it.
  const start = formatter.format(new Date(2027, season.startMonth - 1, season.startDay));
  const end = formatter.format(new Date(2027, season.endMonth - 1, season.endDay));
  return `${start} – ${end}`;
}
