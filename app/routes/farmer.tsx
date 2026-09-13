// TEMPORARY dummy dashboard (Issue #8) — verifies farmer auth + role routing.
// Replace with the real farmer dashboard. See components/temporary-banner.tsx.
import type { Route } from "./+types/farmer";
import { requireRole } from "~/lib/guards";
import { TemporaryBanner } from "~/components/temporary-banner";
import { LogoutButton } from "~/components/logout-button";

export async function clientLoader() {
  const account = await requireRole("farmer");
  return { account };
}

export default function FarmerDashboard({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <TemporaryBanner />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Farmer dashboard
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        Signed in as <span className="font-mono">{account.id}</span> (farmer).
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Your farm</h2>
        <p className="mt-1 text-sm text-gray-500">
          Farm details and offerings will appear here.
        </p>
      </section>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
