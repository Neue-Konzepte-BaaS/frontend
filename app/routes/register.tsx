import { useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/register";
import { register, me, type RegisterableRole } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { postAuthDestination, safeRedirectTarget } from "~/lib/guards";
import { Field, FormError, inputClass, submitClass } from "~/components/form";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("auth:registerMetaTitle") }];
}

// Signed-in users don't register again — send them to their dashboard, or
// wherever ?redirect= points (e.g. "Log in to rent" on /search or /customer)
// — unless that target or the link's declared ?intent= requires a different
// role than this account has; see postAuthDestination.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const account = await me();
  if (account) {
    const params = new URL(request.url).searchParams;
    const redirectTo = safeRedirectTarget(params.get("redirect"));
    throw redirect(postAuthDestination(account, redirectTo, params.get("intent")));
  }
  return null;
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<RegisterableRole>("customer");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation(["auth", "common"]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const postalCodeRaw = String(form.get("postal_code") ?? "").trim();
    const postalCode = Number(postalCodeRaw);

    if (!Number.isInteger(postalCode) || postalCode <= 0) {
      setError(t("auth:invalidPostalCode"));
      setSubmitting(false);
      return;
    }

    try {
      const account = await register({
        firstName: String(form.get("first_name") ?? "").trim(),
        lastName: String(form.get("last_name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        role,
        postalCode,
        farmName:
          role === "farmer" ? String(form.get("farm_name") ?? "").trim() : undefined,
      });
      const redirectTo = safeRedirectTarget(searchParams.get("redirect"));
      navigate(postAuthDestination(account, redirectTo, searchParams.get("intent")), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:genericError"));
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("auth:registerTitle")}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">{t("auth:registerSubtitle")}</p>

      {/* Role toggle. Admins are seeded in the database, so they aren't offered. */}
      <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label={t("auth:accountType")}>
        <RoleTab active={role === "customer"} onClick={() => setRole("customer")}>
          {t("auth:roleCustomer")}
        </RoleTab>
        <RoleTab active={role === "farmer"} onClick={() => setRole("farmer")}>
          {t("auth:roleFarmer")}
        </RoleTab>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {error && <FormError message={error} />}

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("auth:firstNameLabel")} htmlFor="first_name">
            <input id="first_name" name="first_name" required autoComplete="given-name" className={inputClass} />
          </Field>
          <Field label={t("auth:lastNameLabel")} htmlFor="last_name">
            <input id="last_name" name="last_name" required autoComplete="family-name" className={inputClass} />
          </Field>
        </div>

        <Field label={t("auth:emailLabel")} htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>

        <Field label={t("auth:passwordLabel")} htmlFor="password">
          <input id="password" name="password" type="password" required autoComplete="new-password" className={inputClass} />
        </Field>

        {role === "farmer" && (
          <Field label={t("auth:farmNameLabel")} htmlFor="farm_name">
            <input id="farm_name" name="farm_name" required className={inputClass} />
          </Field>
        )}

        <Field label={t("auth:postalCodeLabel")} htmlFor="postal_code">
          <input
            id="postal_code"
            name="postal_code"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className={inputClass}
          />
        </Field>

        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? t("auth:creatingAccount") : t("common:createAccount")}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
        {t("auth:alreadyHaveAccount")}{" "}
        <Link
          to={{ pathname: "/login", search: searchParams.toString() }}
          className="font-medium text-emerald-700 underline dark:text-emerald-400"
        >
          {t("common:signIn")}
        </Link>
      </p>
    </main>
  );
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-lg border px-4 py-3 text-base font-medium " +
        (active
          ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900")
      }
    >
      {children}
    </button>
  );
}
