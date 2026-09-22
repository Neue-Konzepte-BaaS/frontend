/**
 * Shared form primitives. Originally duplicated verbatim in login.tsx and
 * register.tsx; extracted here so a third form (fields/plots) doesn't repeat
 * them again. Keep every form in the app using these for a consistent look.
 */

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export const submitClass =
  "w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60";

/** Secondary/outline button, for a non-primary action next to a submitClass button (e.g. "cancel", "redraw"). */
export const secondaryButtonClass =
  "rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

export function Field({
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

/** Shared inline error banner, used below a form's heading area. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </p>
  );
}

/** Shared inline success banner — the FormError of the happy path. */
export function FormSuccess({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
      {message}
    </p>
  );
}
