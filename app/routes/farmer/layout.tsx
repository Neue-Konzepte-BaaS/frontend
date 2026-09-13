import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireRole } from "~/lib/guards";
import { LogoutButton } from "~/components/logout-button";

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

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bauer as a Service</p>
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{account.id}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
