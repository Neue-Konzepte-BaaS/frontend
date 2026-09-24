/**
 * A labeled on/off switch — e.g. the notification/accessibility toggles on
 * the tenant's Me page (issue #34). No native `<input type="checkbox">`
 * under the hood since the visual (pill + sliding knob) isn't something a
 * checkbox renders as consistently across browsers; `role="switch"` +
 * `aria-checked` gives the same semantics to assistive tech.
 */
export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Optional secondary line under the label, e.g. explaining the effect. */
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="font-medium text-forest">
          {label}
        </p>
        {description && <p className="mt-1 text-sm text-warm-olive">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2 " +
          (checked ? "bg-moss" : "bg-beige")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}
