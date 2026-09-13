import { useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { login, me, dashboardPath } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";

export function meta() {
  return [{ title: "Sign in · BaaS" }];
}

// If already signed in, skip the form and go to the role dashboard.
export async function clientLoader() {
  const account = await me();
  if (account) {
    throw redirect(dashboardPath(account.role));
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
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
      navigate(dashboardPath(account.role), { replace: true });
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
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </p>
        )}

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
        <Link to="/register" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Create one
        </Link>
      </p>
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const submitClass =
  "w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
