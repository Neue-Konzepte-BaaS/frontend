import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/requests";
import { requireRole } from "~/lib/guards";
import { listFarmRentals, approveRental, declineRental, type FarmRental } from "~/lib/rentals";
import { ApiError } from "~/lib/api-client";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:requestsMetaTitle") }];
}

export async function clientLoader() {
  await requireRole("farmer");
  const farmRentals = await listFarmRentals();
  return { requests: farmRentals.filter((rental) => rental.status === "requested") };
}

type Decision = "approve" | "decline";

export default function RequestsQueue({ loaderData }: Route.ComponentProps) {
  const [requests, setRequests] = useState<FarmRental[]>(loaderData.requests);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const { t, i18n: i18nInstance } = useTranslation(["farmer", "common"]);
  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" });

  async function handleDecision(rental: FarmRental, decision: Decision) {
    setActingId(rental.id);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rental.id];
      return next;
    });
    try {
      const decide = decision === "approve" ? approveRental : declineRental;
      await decide(rental.id);
      setRequests((prev) => prev.filter((r) => r.id !== rental.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already decided elsewhere (another tab, another farmer session) —
        // it's stale either way, so drop it from the queue rather than
        // leaving a row the farmer can no longer act on.
        setRequests((prev) => prev.filter((r) => r.id !== rental.id));
      } else {
        const message = err instanceof ApiError ? err.message : t("common:genericError");
        setRowErrors((prev) => ({ ...prev, [rental.id]: message }));
      }
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <p className="text-xs font-semibold tracking-wide text-warm-olive uppercase">
        {t("requestsOpenSummary", { count: requests.length })}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-forest">{t("requestsTitle")}</h1>

      {requests.length === 0 ? (
        <p className="mt-8 text-wood">{t("noRequestsYet")}</p>
      ) : (
        <>
          {/* Desktop: a real table, matching tenants.tsx's breakpoint. */}
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-beige text-xs tracking-wide text-warm-olive uppercase">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("requestsColApplicant")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("requestsColPlot")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("requestsColField")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("requestsColStartDate")}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t("requestsColMessage")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">{t("requestsColAction")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige">
                {requests.map((rental) => (
                  <tr key={rental.id}>
                    <td className="py-3 pr-4 font-semibold text-forest">
                      {rental.customer.firstName} {rental.customer.lastName}
                    </td>
                    <td className="py-3 pr-4 text-wood">{rental.plot.name}</td>
                    <td className="py-3 pr-4 text-wood">{rental.fieldName}</td>
                    <td className="py-3 pr-4 text-wood">
                      {dateFormatter.format(new Date(rental.startAt))}
                    </td>
                    <td className="py-3 pr-4 max-w-xs text-wood">{rental.message}</td>
                    <td className="py-3">
                      <RequestActions
                        rental={rental}
                        acting={actingId === rental.id}
                        error={rowErrors[rental.id]}
                        onDecide={handleDecision}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Below lg: one card per request instead of a horizontally cramped table. */}
          <ul className="mt-6 divide-y divide-beige lg:hidden">
            {requests.map((rental) => (
              <li key={rental.id} className="py-4">
                <p className="font-semibold text-forest">
                  {rental.customer.firstName} {rental.customer.lastName}
                </p>
                <p className="mt-1 text-sm text-warm-olive">
                  {rental.plot.name} · {rental.fieldName}
                </p>
                <p className="mt-1 text-sm text-warm-olive">
                  {t("requestsStartsOn", { date: dateFormatter.format(new Date(rental.startAt)) })}
                </p>
                <p className="mt-2 text-sm text-wood">{rental.message}</p>
                <div className="mt-3">
                  <RequestActions
                    rental={rental}
                    acting={actingId === rental.id}
                    error={rowErrors[rental.id]}
                    onDecide={handleDecision}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function RequestActions({
  rental,
  acting,
  error,
  onDecide,
}: {
  rental: FarmRental;
  acting: boolean;
  error?: string;
  onDecide: (rental: FarmRental, decision: Decision) => void;
}) {
  const { t } = useTranslation("farmer");
  // Approving here does nothing payment-related — the customer was already
  // charged when they submitted the request (see checkout.tsx). Declining
  // triggers a server-side refund (backend's DeclineRental), which this UI
  // doesn't need to special-case beyond the existing generic error handling.
  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={acting}
          onClick={() => onDecide(rental, "approve")}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {acting ? t("requestDeciding") : t("approveAction")}
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={() => onDecide(rental, "decline")}
          className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {acting ? t("requestDeciding") : t("declineAction")}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
