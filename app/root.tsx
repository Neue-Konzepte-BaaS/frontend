import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useTranslation } from "react-i18next";

import type { Route } from "./+types/root";
import "./app.css";
import "~/i18n";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  // `ssr: false` still prerenders this route at build time (see field-map.tsx's
  // SSR note) with no real navigator/localStorage available, so the static
  // shell always bakes in the `fallbackLng` ("en"). Setting `lang` directly in
  // JSX would then mismatch a returning German-language visitor's hydration
  // (server "en" vs. client "de") — React logs this as an unpatched hydration
  // error. Set it imperatively after mount instead, which only touches the
  // DOM post-hydration and never becomes part of the SSR/CSR diff.
  useEffect(() => {
    document.documentElement.lang = i18n.language.startsWith("de") ? "de" : "en";
  }, [i18n.language]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// In SPA mode, HydrateFallback is only allowed on the root route. It renders in
// the build-time index.html and shows while the client hydrates and route
// clientLoaders (auth checks, redirects) run.
export function HydrateFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-warm-olive">
      Loading…
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();
  let message = t("common:errorOops");
  let details = t("common:errorUnexpected");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? t("common:errorNotFoundTitle") : t("common:errorTitle");
    details =
      error.status === 404
        ? t("common:errorNotFoundBody")
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-forest">{message}</h1>
      <p className="mt-1 text-wood">{details}</p>
      <Link
        to="/"
        className="mt-6 font-medium text-moss underline hover:text-olive"
      >
        {t("common:backToHome")}
      </Link>
      {stack && (
        <pre className="mt-6 w-full overflow-x-auto rounded-lg border border-beige p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
