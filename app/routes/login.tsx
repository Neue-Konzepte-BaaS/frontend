import { useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { login, me, dashboardPath } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { safeRedirectTarget } from "~/lib/guards";
import { Field, FormError, inputClass, submitClass } from "~/components/form";

export function meta() {
  return [{ title: "Sign in · BaaS" }];
}

// If already signed in, skip the form. Honor ?redirect= (e.g. the "Log in to
// rent" link from /customer) so a logged-in visitor bounces back to where
// they came from, same as a fresh login below.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const account = await me();
  if (account) {
    const redirectTo = safeRedirectTarget(new URL(request.url).searchParams.get("redirect"));
    throw redirect(redirectTo ?? dashboardPath(account.role));
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      navigate(redirectTo ?? dashboardPath(account.role), { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">
        Welcome back. Sign in to your account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {error && <FormError message={error} />}

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Password" htmlFor="password">
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
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
        No account yet?{" "}
        <Link
          to={{ pathname: "/register", search: searchParams.toString() }}
          className="font-medium text-emerald-700 underline dark:text-emerald-400"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}

