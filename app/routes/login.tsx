import { useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/login";
import { login, me } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { postAuthDestination, safeRedirectTarget } from "~/lib/guards";
import { Field, FormError, inputClass, submitClass } from "~/components/form";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("auth:loginMetaTitle") }];
}

// If already signed in, skip the form. Honor ?redirect= (e.g. the "Log in to
// rent" link on /search or /customer) so a logged-in visitor bounces back to
// where they came from — unless that target or the link's declared ?intent=
// requires a different role than this account has, in which case
// postAuthDestination sends them to their own dashboard instead. Same as a
// fresh login below.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const account = await me();
  if (account) {
    const params = new URL(request.url).searchParams;
    const redirectTo = safeRedirectTarget(params.get("redirect"));
    throw redirect(postAuthDestination(account, redirectTo, params.get("intent")));
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation(["auth", "common", "home"]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const account = await login(email, password);
      const redirectTo = safeRedirectTarget(searchParams.get("redirect"));
      navigate(postAuthDestination(account, redirectTo, searchParams.get("intent")), { replace: true });
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
      <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16">
        <h1 className="font-serif text-3xl font-bold text-forest">{t("auth:loginTitle")}</h1>
        <p className="mt-2 text-wood">{t("auth:loginSubtitle")}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          {error && <FormError message={error} />}

          <Field label={t("auth:emailLabel")} htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </Field>

          <Field label={t("auth:passwordLabel")} htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </Field>

          <button type="submit" disabled={submitting} className={submitClass}>
            {submitting ? t("auth:signingIn") : t("common:signIn")}
          </button>
        </form>

        <p className="mt-6 text-sm text-wood">
          {t("auth:noAccountYet")}{" "}
          <Link
            to={{ pathname: "/register", search: searchParams.toString() }}
            className="font-medium text-moss underline hover:text-olive"
          >
            {t("auth:createOne")}
          </Link>
        </p>
      </main>
    </div>
  );
}

