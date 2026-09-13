/**
 * Shared card shell for a plot/field row in a list — used by the customer
 * search results and (visually, if ever needed) anywhere else a
 * name + optional metadata + one action needs the same look. Mirrors the
 * `<li>` styling farmer/fields.tsx already uses for its field list, so the
 * two list styles stay visually identical across the app.
 */
export function PlotCard({
  name,
  meta,
  action,
}: {
  name: string;
  /** Secondary line under the name — e.g. a formatted distance or date range. */
  meta?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
        {meta && <p className="mt-1 text-sm text-gray-500">{meta}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

/** Formats a distance in meters the way a farmer's-market visitor would read it. */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
