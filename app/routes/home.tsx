import { Link } from "react-router";
import type { Route } from "./+types/home";
import { me, dashboardPath } from "~/lib/auth";
import { submitClass, secondaryButtonClass } from "~/components/form";

export function meta() {
  return [
    { title: "Bauer as a Service — self-harvest plots, without the spreadsheets" },
    {
      name: "description",
      content:
        "The software behind pick-your-own farms: manage self-harvest plots, tell renters when their crop is ripe, and reach everyone at once.",
    },
  ];
}

/**
 * The public landing page. Unlike every other entry point, this one never
 * redirects: a logged-in visitor sees the same pitch with a "Go to dashboard"
 * button instead of the sign-in pair. (It used to redirect everyone — to their
 * dashboard, or to /login — which meant a first-time visitor met a login form
 * with no idea what BaaS was.)
 */
export async function clientLoader() {
  const account = await me();
  return { account };
}

/** MVP features worth naming up front — see context.md's must-have list. */
const FEATURES = [
  {
    title: "Plot planner",
    body: "Every plot at a glance: free, rented, to whom, and until when. No more colour-coded spreadsheet.",
  },
  {
    title: "Ripeness alerts",
    body: "Mark a crop ripe and everyone renting that plot hears about it — the same day, not next weekend.",
  },
  {
    title: "Bulletin board",
    body: "One announcement reaches all of your renters at once, replacing the group chat nobody reads.",
  },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <p className="whitespace-nowrap font-semibold text-gray-900 dark:text-white">Bauer as a Service</p>
          {account ? (
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath(account.role)}
                className={`${submitClass} inline-block w-auto whitespace-nowrap px-4 py-2 text-sm`}
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="whitespace-nowrap text-sm font-medium text-gray-700 hover:underline dark:text-gray-200"
              >
                Sign in
              </Link>
              <Link to="/register" className={`${submitClass} inline-block w-auto px-4 py-2 text-sm`}>
                Create account
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <section className="py-12 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            Self-harvest plots, without the spreadsheets.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Small farms rent out pick-your-own plots and manage them with Excel, paper, and
            WhatsApp. Bauer as a Service is the software behind the farm: who rents which plot,
            for how long, what's planted, and when it's ripe.
          </p>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            The farm keeps its own brand and its own customers. We just provide the tooling.
          </p>

          {/* items-start keeps the buttons at their content width once the
              row direction kicks in — submitClass carries w-full for forms. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Link to="/search" className={`${submitClass} inline-block px-6 text-center sm:w-auto`}>
              Find a plot near you
            </Link>
            <Link to="/register" className={`${secondaryButtonClass} inline-block px-6 text-center sm:w-auto`}>
              Run a farm on BaaS
            </Link>
          </div>
        </section>

        <section className="border-t border-gray-200 py-12 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What you get</h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-gray-200 py-12 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Looking for a plot to rent?</h2>
          <p className="mt-2 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Search by postal code or city to see the self-harvest plots available near you.
          </p>
          <Link to="/search" className={`${submitClass} mt-6 inline-block px-6 text-center sm:w-auto`}>
            Search plots
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-5xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Bauer as a Service</p>
        </div>
      </footer>
    </div>
  );
}
