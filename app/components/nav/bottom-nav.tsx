import { NavLink } from "react-router";
import type { NavItem } from "~/lib/nav-items";

/**
 * Mobile-only bottom bar (hidden at/above the `md` breakpoint). Fixed to the
 * viewport bottom — app-shell.tsx pads its main content so this never covers
 * the last bit of a page.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-beige bg-paper md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              // The active tab is marked by weight and the top bar as well as
              // colour: context.md's accessibility bar rules out colour as the
              // only signal. A transparent border on the inactive tabs keeps
              // the bar from shifting height as you move between them.
              `flex min-w-0 flex-1 flex-col items-center gap-1 border-t-2 px-1 py-2 text-xs ${
                isActive
                  ? "border-moss font-semibold text-moss"
                  : "border-transparent font-medium text-olive"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {/* Five slots on a 375px screen leave ~70px per label; a long one
                (German "Pflanzenkatalog") would otherwise run into its
                neighbour. */}
            <span className="w-full truncate text-center">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
