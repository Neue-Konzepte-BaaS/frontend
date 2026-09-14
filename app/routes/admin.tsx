import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/admin";
import { requireRole } from "~/lib/guards";
import {
  getStatistics,
  createCrop,
  deleteCrop,
  broadcastNotification,
  listCrops,
  type Statistics,
  type Crop,
} from "~/lib/admin";
import { ApiError } from "~/lib/api-client";
import { Field as FormField, FormError, inputClass, submitClass } from "~/components/form";
import { LogoutButton } from "~/components/logout-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("admin:dashboardTitle") + " · BaaS" }];
}

export async function clientLoader() {
  const account = await requireRole("admin");
  const [stats, crops] = await Promise.all([getStatistics(), listCrops()]);
  return { account, stats, crops };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { account } = loaderData;
  const [stats] = useState<Statistics>(loaderData.stats);
  const { t, i18n: i18nInstance } = useTranslation("admin");

  const dateLocale = i18nInstance.language.startsWith("de") ? "de-DE" : "en-GB";
  const generatedAt = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(stats.generatedAt));

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link to="/" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            BaaS
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <p className="hidden font-mono text-xs text-gray-400 sm:block dark:text-gray-500">{account.id}</p>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboardTitle")}</h1>

        {/* Statistics */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("statisticsTitle")}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("generatedAt", { time: generatedAt })}</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t("statFields")}>
              <StatRow label={t("statTotal")} value={stats.fields.total} />
              <StatRow label={t("statArea")} value={stats.fields.areaSquareMeters.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} />
            </StatCard>

            <StatCard title={t("statPlots")}>
              <StatRow label={t("statTotal")} value={stats.plots.total} />
              <StatRow label={t("statRented")} value={stats.plots.rented} />
              <StatRow label={t("statAvailable")} value={stats.plots.available} />
              <StatRow
                label={t("statOccupancy")}
                value={(stats.plots.occupancyRate * 100).toLocaleString(dateLocale, { maximumFractionDigits: 1 }) + " %"}
              />
            </StatCard>

            <StatCard title={t("statRentals")}>
              <StatRow label={t("statTotal")} value={stats.rentals.total} />
              <StatRow label={t("statActive")} value={stats.rentals.active} />
              <StatRow label={t("statLast30Days")} value={stats.rentals.last30Days} />
            </StatCard>

            {stats.accounts && (
              <StatCard title={t("statAccounts")}>
                <StatRow label={t("statTotal")} value={stats.accounts.total} />
                <StatRow label={t("statFarmers")} value={stats.accounts.farmers} />
                <StatRow label={t("statCustomers")} value={stats.accounts.customers} />
                <StatRow label={t("statRegisteredLast30")} value={stats.accounts.registeredLast30Days} />
              </StatCard>
            )}
          </div>
        </section>

        {/* Notification broadcast */}
        <BroadcastSection />

        {/* Crop catalog */}
        <CropSection initialCrops={loaderData.crops} />
      </main>
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

function BroadcastSection() {
  const { t } = useTranslation("admin");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const result = await broadcastNotification(subject.trim(), body.trim());
      setSuccess(t("notifSuccess", { recipients: result.recipients }));
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notificationsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("notificationsBody")}</p>

      <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
        {error && <FormError message={error} />}
        {success && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            {success}
          </p>
        )}

        <FormField label={t("notifSubjectLabel")} htmlFor="notif-subject">
          <input
            id="notif-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("notifSubjectPlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("notifBodyLabel")} htmlFor="notif-body">
          <textarea
            id="notif-body"
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("notifBodyPlaceholder")}
            className={`${inputClass} resize-y`}
          />
        </FormField>

        <button type="submit" disabled={sending} className={`${submitClass} w-auto px-6 py-2 text-sm`}>
          {sending ? t("notifSending") : t("notifSend")}
        </button>
      </form>
    </section>
  );
}

function CropSection({ initialCrops }: { initialCrops: Crop[] }) {
  const { t } = useTranslation("admin");
  const [name, setName] = useState("");
  const [months, setMonths] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropList, setCropList] = useState<Crop[]>(initialCrops);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const m = Number(months);
    if (!Number.isInteger(m) || m < 1) {
      setError("Duration must be a positive integer.");
      return;
    }

    setAdding(true);
    try {
      const crop = await createCrop(name.trim(), m);
      setCropList((prev) => [...prev, crop]);
      setSuccess(t("cropAddedSuccess", { name: crop.name }));
      setName("");
      setMonths("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(crop: Crop) {
    setError(null);
    setSuccess(null);
    setDeletingId(crop.id);
    try {
      await deleteCrop(crop.id);
      setCropList((prev) => prev.filter((c) => c.id !== crop.id));
      setSuccess(t("cropDeletedSuccess", { name: crop.name }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("cropDeleteConflict", { name: crop.name }));
      } else {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("cropsTitle")}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("cropsBody")}</p>

      {cropList.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {cropList.map((crop) => (
            <li key={crop.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {t("cropDuration", { name: crop.name, months: crop.durationMonths })}
              </span>
              <button
                type="button"
                disabled={deletingId === crop.id}
                onClick={() => handleDelete(crop)}
                className="ml-4 shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                {deletingId === crop.id ? t("cropDeleting") : t("cropDelete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-4">
        {error && <FormError message={error} />}
        {success && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            {success}
          </p>
        )}

        <FormField label={t("cropNameLabel")} htmlFor="crop-name">
          <input
            id="crop-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("cropNamePlaceholder")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("cropDurationLabel")} htmlFor="crop-months">
          <input
            id="crop-months"
            type="number"
            required
            min={1}
            step={1}
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <button type="submit" disabled={adding} className={`${submitClass} w-auto px-6 py-2 text-sm`}>
          {adding ? t("cropAdding") : t("cropAdd")}
        </button>
      </form>
    </section>
  );
}
