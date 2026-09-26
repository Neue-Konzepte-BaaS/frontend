/**
 * Shared form primitives. Originally duplicated verbatim in login.tsx and
 * register.tsx; extracted here so a third form (fields/plots) doesn't repeat
 * them again. Keep every form in the app using these for a consistent look.
 */

export const inputClass =
  "w-full rounded-lg border border-beige bg-ivory px-4 py-3 text-base text-forest focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss";

/**
 * Primary button, sized to its label — for a button that sits in a row with
 * other controls (a filter bar, a confirm pair). `submitClass` below is this
 * plus `w-full`, which is what a form's lone submit button wants; note that
 * appending `w-auto` to it does NOT undo that, since both are width utilities
 * and Tailwind's own order decides which wins.
 */
export const primaryButtonClass =
  "rounded-lg bg-moss px-4 py-3 text-base font-semibold text-ivory hover:bg-olive focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-60";

export const submitClass = `w-full ${primaryButtonClass}`;

/** Secondary/outline button, for a non-primary action next to a submitClass button (e.g. "cancel", "redraw"). */
export const secondaryButtonClass =
  "rounded-lg border border-beige px-4 py-3 text-base font-medium text-wood hover:bg-cream focus:outline-none focus:ring-2 focus:ring-beige disabled:opacity-60";

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
        className="mb-1 block text-sm font-medium text-deep-olive"
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
      className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
    >
      {message}
    </p>
  );
}

/** Shared inline success banner — the FormError of the happy path. */
export function FormSuccess({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-moss/40 bg-moss/10 px-4 py-3 text-sm text-moss"
    >
      {message}
    </p>
  );
}
