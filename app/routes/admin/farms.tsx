import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/farms";
import { listFarms, type FarmListing } from "~/lib/admin";
import { ListingEmpty, Pager } from "~/components/admin/listing";
import { inputClass, primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:farmsMetaTitle") }];
}

/**
 * Every farm on the platform, with its owner and its holdings
 * (GET /api/admin/farms, backend#50).
 *
 * Filters and paging come from the URL, not component state — see
 * components/admin/listing.tsx. `offset` is floored at 0 and forced to a whole
 * number here because the backend answers a malformed one with a 400: a
 * hand-edited `?offset=-5` should show page 1, not an error page.
 *
 * The mockup on issue #25 also wanted Region and Status columns. Neither
 * exists: the endpoint carries the owner's postal code and a free-text
 * address, and farm verification is backend#49. Postal code stands in for
 * region; there is no status column until then.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const postalCodeRaw = params.get("postalCode")?.trim() ?? "";
  const postalCode = /^\d+$/.test(postalCodeRaw) ? Number(postalCodeRaw) : undefined;
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0));

  const page = await listFarms({ query, postalCode, offset });
  return { page, query, postalCodeRaw };
}

export default function AdminFarms({ loaderData }: Route.ComponentProps) {
  const { page, query, postalCodeRaw } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation("admin");
  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("farmsTitle")}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("farmsBody")}</p>

      {/* A GET form: submitting navigates with the filters in the URL, which
          re-runs the loader. No onSubmit handler, no local state to keep in
          sync, and the result is a shareable link. */}
      <Form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex-1 basis-48 text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">{t("farmsSearchLabel")}</span>
          <input type="search" name="q" defaultValue={query} placeholder={t("farmsSearchPlaceholder")} className={inputClass} />
        </label>
        <label className="basis-32 text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">{t("farmsPostalCodeLabel")}</span>
          <input
            type="text"
            inputMode="numeric"
            name="postalCode"
            defaultValue={postalCodeRaw}
            placeholder="76133"
            className={inputClass}
          />
        </label>
        <button type="submit" className={`${primaryButtonClass} px-6 py-2 text-sm`}>
          {t("listFilter")}
        </button>
      </Form>

      {page.items.length === 0 ? (
        <ListingEmpty filtered={query !== "" || postalCodeRaw !== ""} />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {page.items.map((farm) => (
              <FarmRow key={farm.id} farm={farm} locale={locale} />
            ))}
          </ul>
          <Pager total={page.total} limit={page.limit} offset={page.offset} count={page.items.length} />
        </>
      )}
    </main>
  );
}

/**
 * One farm. A card that becomes a row on wide screens rather than a real
 * <table>: a six-column table at 375px either scrolls sideways or shrinks the
 * type below the size context.md calls for.
 */
function FarmRow({ farm, locale }: { farm: FarmListing; locale: string }) {
  const { t } = useTranslation("admin");
  const num = (value: number, maximumFractionDigits = 0) => value.toLocaleString(locale, { maximumFractionDigits });

  return (
    <li className="rounded-lg border border-gray-200 p-4 md:flex md:items-center md:justify-between md:gap-6 dark:border-gray-800">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{farm.name}</p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {farm.postalCode > 0 ? `${farm.postalCode} · ` : ""}
          {farm.address}
        </p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {farm.owner.firstName} {farm.owner.lastName} · {farm.owner.email}
        </p>
      </div>
      <dl className="mt-3 grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4 md:mt-0">
        <Figure label={t("statFields")} value={num(farm.fields.total)} />
        <Figure label={t("statPlots")} value={num(farm.plots.total)} />
        <Figure label={t("statOccupancy")} value={`${num(farm.plots.occupancyRate * 100, 1)} %`} />
        <Figure label={t("statActive")} value={num(farm.activeRentals)} />
      </dl>
    </li>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}
