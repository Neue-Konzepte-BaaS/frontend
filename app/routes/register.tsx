import { useState } from "react";
import { Link, redirect, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { Route } from "./+types/register";
import { register, me, type RegisterableRole } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { postAuthDestination, safeRedirectTarget } from "~/lib/guards";
import { Field, FormError, inputClass, submitClass } from "~/components/form";
import { LanguageSwitcher } from "~/components/language-switcher";
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
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<RegisterableRole>("customer");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { t } = useTranslation(["auth", "common", "home"]);

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

    const email = String(form.get("email") ?? "").trim();

    try {
      await register({
        firstName: String(form.get("first_name") ?? "").trim(),
        lastName: String(form.get("last_name") ?? "").trim(),
        email,
        password: String(form.get("password") ?? ""),
        role,
        postalCode,
        farmName: role === "farmer" ? String(form.get("farm_name") ?? "").trim() : undefined,
        address: role === "farmer" ? String(form.get("address") ?? "").trim() : undefined,
        description: role === "farmer" ? String(form.get("description") ?? "").trim() : undefined,
      });
      setSubmittedEmail(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common:genericError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/login" className="min-w-[80px] text-center text-base font-semibold text-forest hover:text-moss">{t("common:signIn")}</Link>
            <Link to="/register" className="min-w-[130px] rounded-full bg-deep-olive px-6 py-2.5 text-center text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
          </div>
        </div>
      </header>
      {submittedEmail ? (
        <main className="mx-auto max-w-2xl px-6 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-moss/15">
            <Check className="h-9 w-9 text-moss" strokeWidth={2.5} />
          </div>
          <h1 className="mt-8 font-serif text-4xl font-bold leading-tight text-forest">{t("auth:registerSuccessTitle")}</h1>
          <p className="mt-3 text-base text-warm-olive">{t("auth:registerSuccessSubtitle", { email: submittedEmail })}</p>
        </main>
      ) : (
      <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16">
        <h1 className="font-serif text-3xl font-bold text-forest">{t("auth:registerTitle")}</h1>
        <p className="mt-2 text-wood">{t("auth:registerSubtitle")}</p>

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
            <>
              <Field label={t("auth:farmNameLabel")} htmlFor="farm_name">
                <input id="farm_name" name="farm_name" required className={inputClass} />
              </Field>
              <Field label={t("auth:addressLabel")} htmlFor="address">
                <input id="address" name="address" required className={inputClass} />
              </Field>
              <Field label={t("auth:descriptionLabel")} htmlFor="description">
                <textarea id="description" name="description" rows={3} className={inputClass} />
              </Field>
            </>
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

        <p className="mt-6 text-sm text-wood">
          {t("auth:alreadyHaveAccount")}{" "}
          <Link
            to={{ pathname: "/login", search: searchParams.toString() }}
            className="font-medium text-moss underline hover:text-olive"
          >
            {t("common:signIn")}
          </Link>
        </p>
      </main>
      )}
    </div>
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
          ? "border-moss bg-moss/10 text-moss"
          : "border-beige text-wood hover:bg-cream")
      }
    >
      {children}
    </button>
  );
}
