import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
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
    <main className="flex min-h-screen items-center justify-center p-8 text-gray-500">
      Loading…
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{message}</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">{details}</p>
      <Link
        to="/"
        className="mt-6 font-medium text-emerald-700 underline dark:text-emerald-400"
      >
        Back to home
      </Link>
      {stack && (
        <pre className="mt-6 w-full overflow-x-auto rounded-lg border border-gray-200 p-4 text-left text-xs dark:border-gray-800">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
