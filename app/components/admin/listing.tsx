import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

/**
 * Shared chrome for the two admin listings (/admin/farms, /admin/accounts):
 * the filter bar's layout, the empty state, and the pager.
 *
 * Both listings drive their filters and their page through the URL rather than
 * component state, so a filtered page is a link an admin can bookmark or send
 * to someone else, and the browser's Back button steps through their own
 * search history. Every helper here therefore edits the current search params
 * rather than replacing them.
 */

/** Current params with one key changed, and `offset` dropped — a new filter starts at page 1. */
function withFilter(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  next.delete("offset");
  const query = next.toString();
  return query ? `?${query}` : "?";
}

export function ListingEmpty({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation("admin");
  return (
    <p className="mt-6 text-gray-600 dark:text-gray-300">{filtered ? t("listNoMatches") : t("listEmpty")}</p>
  );
}

/**
 * "21–40 of 137", with the two steps either side. `count` is how many rows this
 * page actually returned, so the upper bound is what the admin can see rather
 * than what the page size implies.
 */
export function Pager({ total, limit, offset, count }: { total: number; limit: number; offset: number; count: number }) {
  const { t } = useTranslation("admin");
  const [searchParams] = useSearchParams();

  if (count === 0) return null;

  const from = offset + 1;
  const to = offset + count;
  const hasPrevious = offset > 0;
  const hasNext = to < total;

  function offsetHref(next: number): string {
    const params = new URLSearchParams(searchParams);
    if (next <= 0) params.delete("offset");
    else params.set("offset", String(next));
    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  const stepClass =
    "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-800";

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label={t("listPagerLabel")}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("listRange", { from, to, total })}</p>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link
            to={offsetHref(offset - limit)}
            className={`${stepClass} text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900`}
          >
            {t("listPrevious")}
          </Link>
        ) : (
          // A disabled <button> rather than a dead link: there is nowhere to go,
          // and a link with no destination is a trap for keyboard navigation.
          <button type="button" disabled className={`${stepClass} text-gray-400 dark:text-gray-600`}>
            {t("listPrevious")}
          </button>
        )}
        {hasNext ? (
          <Link
            to={offsetHref(offset + limit)}
            className={`${stepClass} text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900`}
          >
            {t("listNext")}
          </Link>
        ) : (
          <button type="button" disabled className={`${stepClass} text-gray-400 dark:text-gray-600`}>
            {t("listNext")}
          </button>
        )}
      </div>
    </nav>
  );
}

/** A segmented row of filter links, e.g. the account list's role tabs. */
export function FilterTabs({
  paramKey,
  options,
  active,
  label,
}: {
  paramKey: string;
  /** `value: ""` is the "all" entry — it removes the parameter. */
  options: { value: string; label: string }[];
  active: string;
  label: string;
}) {
  const [searchParams] = useSearchParams();

  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value || "all"}
            to={withFilter(searchParams, paramKey, option.value)}
            aria-current={isActive ? "true" : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${
              isActive
                ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
