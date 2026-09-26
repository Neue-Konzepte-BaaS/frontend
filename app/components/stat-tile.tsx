/**
 * One headline figure on a stats/overview page: a label, the number itself,
 * and an optional second line of context ("1 401 rented · 76 %"). Replaces
 * the earlier StatCard/StatRow pair, which packed four label/value rows into
 * each card — the number that matters was never the one you saw first.
 *
 * Shared across roles (admin's Platform overview, farmer's Statistics) — not
 * admin-specific despite where it started.
 */
export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-beige p-4">
      <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold text-forest">{value}</p>
      {detail && <p className="mt-1 text-sm text-warm-olive">{detail}</p>}
    </div>
  );
}
