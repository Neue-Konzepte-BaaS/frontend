import { useState } from "react";
import { Info } from "lucide-react";

/**
 * A small info mark that reveals `children` in a popover on click or focus —
 * not hover-only, so it works on touch and for keyboard users. There's no
 * tooltip/popover library in this app; this is the generic building block
 * for any "explain this value inline" need, not specific to any one feature.
 */
export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center rounded-full text-warm-olive hover:text-forest focus:outline-none focus:ring-2 focus:ring-moss"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="status"
          className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-beige bg-cream px-3 py-2 text-xs text-wood shadow-md"
        >
          {children}
        </span>
      )}
    </span>
  );
}
