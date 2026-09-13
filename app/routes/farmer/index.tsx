import { Link } from "react-router";

export function meta() {
  return [{ title: "Farmer dashboard · BaaS" }];
}

export default function FarmerDashboard() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Farmer dashboard
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        Manage the fields and land parcels your farm offers for self-harvest rental.
      </p>

      <Link
        to="/farmer/fields"
        className="mt-6 block rounded-lg border border-gray-200 p-6 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
      >
        <h2 className="font-semibold text-gray-900 dark:text-white">Your fields</h2>
        <p className="mt-1 text-sm text-gray-500">
          View your fields and land parcels, or draw a new field on the map.
        </p>
      </Link>
    </main>
  );
}
