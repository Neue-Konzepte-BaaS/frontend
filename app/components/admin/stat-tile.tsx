/**
 * One headline figure on the Platform overview: a label, the number itself,
 * and an optional second line of context ("1 401 rented · 76 %"). Replaces
 * the earlier StatCard/StatRow pair, which packed four label/value rows into
 * each card — the number that matters was never the one you saw first.
 */
export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {detail && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail}</p>}
    </div>
  );
}
