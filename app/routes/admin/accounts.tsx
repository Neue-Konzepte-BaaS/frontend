import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/accounts";
import { listAccounts } from "~/lib/admin";
import { roleLabel, type Role } from "~/lib/auth";
import { FilterTabs, ListingEmpty, Pager } from "~/components/admin/listing";
import { inputClass, primaryButtonClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:accountsMetaTitle") }];
}

const ROLES: Role[] = ["admin", "farmer", "customer"];

/** Only a real Role reaches the API: an unknown `?role=` is a 400, not an empty page. */
function knownRole(raw: string | null): Role | undefined {
  return ROLES.find((role) => role === raw);
}

/**
 * Every account on the platform (GET /api/admin/accounts, backend#51).
 *
 * Filters and paging live in the URL — see components/admin/listing.tsx. A
 * `?role=` the backend wouldn't recognise is dropped here rather than
 * forwarded, so a stale or hand-edited link degrades to the unfiltered list
 * instead of a 400.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const role = knownRole(params.get("role"));
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0));

  const page = await listAccounts({ query, role, offset });
  return { page, query, role: role ?? "" };
}

export default function AdminAccounts({ loaderData }: Route.ComponentProps) {
  const { page, query, role } = loaderData;
  const { t, i18n: i18nInstance } = useTranslation(["admin", "auth"]);
  const locale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("admin:accountsTitle")}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin:accountsBody")}</p>

      <div className="mt-4 space-y-3">
        <FilterTabs
          paramKey="role"
          active={role}
          label={t("admin:accountsRoleFilterLabel")}
          options={[
            { value: "", label: t("admin:accountsAllRoles") },
            ...ROLES.map((value) => ({ value, label: roleLabel(t, value) })),
          ]}
        />

        <Form method="get" className="flex flex-wrap items-end gap-2">
          {/* Keeps the active role tab when searching — without this the form
              would submit only its own fields and silently clear the filter. */}
          {role && <input type="hidden" name="role" value={role} />}
          <label className="flex-1 basis-48 text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
              {t("admin:accountsSearchLabel")}
            </span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t("admin:accountsSearchPlaceholder")}
              className={inputClass}
            />
          </label>
          <button type="submit" className={`${primaryButtonClass} px-6 py-2 text-sm`}>
            {t("admin:listFilter")}
          </button>
        </Form>
      </div>

      {page.items.length === 0 ? (
        <ListingEmpty filtered={query !== "" || role !== ""} />
      ) : (
        <>
          <ul className="mt-6 divide-y divide-gray-200 dark:divide-gray-800">
            {page.items.map((account) => (
              <li key={account.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.firstName} {account.lastName}
                  </p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
                </div>
                <div className="flex items-baseline gap-3 text-sm">
                  {/* A null role is an account with no subtype row at all. Say
                      so rather than showing a blank cell that reads as a bug. */}
                  <span className={account.role ? "text-gray-700 dark:text-gray-200" : "text-amber-700 dark:text-amber-300"}>
                    {account.role ? roleLabel(t, account.role) : t("admin:accountsNoRole")}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {dateFormatter.format(new Date(account.createdAt))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Pager total={page.total} limit={page.limit} offset={page.offset} count={page.items.length} />
        </>
      )}
    </main>
  );
}
