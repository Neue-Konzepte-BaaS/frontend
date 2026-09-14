import { Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";

/**
 * Shared chrome + auth guard for every /farmer/* route. Runs requireRole once
 * per navigation here rather than in each child, so children can read the
 * account via useRouteLoaderData("farmer-layout") instead of each calling
 * me() again.
 */
export async function clientLoader() {
  const account = await requireRole("farmer");
  return { account };
}

export default function FarmerLayout({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("brand")}</p>
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{account.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
