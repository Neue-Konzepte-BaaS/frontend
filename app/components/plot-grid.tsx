import { useTranslation } from "react-i18next";
import type { PlotStatus } from "~/lib/plots";

// Same hues as the map's rented/requested/selected colors (see field-map.tsx),
// so the legend below explains both at once.
const TILE_CLASS: Record<PlotStatus, string> = {
  rented: "border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200",
  requested: "border-lime-300 bg-lime-100 text-lime-900 hover:bg-lime-200",
  free: "border-beige bg-cream text-wood hover:bg-beige/60",
};
const SELECTED_TILE_CLASS = "border-amber-600 bg-amber-500 text-white ring-2 ring-amber-600 ring-offset-1";

const SWATCH_CLASS: Record<PlotStatus | "selected", string> = {
  rented: "bg-rose-200",
  requested: "bg-lime-200",
  free: "bg-cream border border-beige",
  selected: "bg-amber-500",
};

const STATUS_LABEL_KEY = {
  rented: "common:plotStatusRented",
  requested: "common:plotStatusRequested",
  free: "common:plotStatusFree",
} as const;

export type PlotGridItem = { id: string; status: PlotStatus };

type PlotGridProps = {
  /** In display order — tile N is labelled N, matching the map's labels. */
  plots: PlotGridItem[];
  selectedIds: ReadonlySet<string>;
  onSelect: (plotId: string) => void;
  /** Statuses that can't occur on this page are left out of the legend. */
  legendStatuses?: PlotStatus[];
};

/** A numbered, color-coded tile per plot — the at-a-glance companion to the map. */
export function PlotGrid({ plots, selectedIds, onSelect, legendStatuses = ["rented", "requested", "free"] }: PlotGridProps) {
  const { t } = useTranslation("common");
  const counts = { rented: 0, requested: 0, free: 0 };
  for (const p of plots) counts[p.status]++;

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
        {plots.map((plot, i) => {
          const selected = selectedIds.has(plot.id);
          return (
            <button
              key={plot.id}
              type="button"
              aria-pressed={selected}
              aria-label={t("plotTileLabel", { number: i + 1, status: t(STATUS_LABEL_KEY[plot.status]) })}
              onClick={() => onSelect(plot.id)}
              className={`flex aspect-square items-center justify-center rounded-lg border font-mono text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss ${
                selected ? SELECTED_TILE_CLASS : TILE_CLASS[plot.status]
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-warm-olive">
        {legendStatuses.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${SWATCH_CLASS[status]}`} aria-hidden />
            {t("plotStatusCount", { label: t(STATUS_LABEL_KEY[status]), count: counts[status] })}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm ${SWATCH_CLASS.selected}`} aria-hidden />
          {t("plotStatusSelected")}
        </li>
      </ul>
    </div>
  );
}
