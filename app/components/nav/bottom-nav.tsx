import { NavLink } from "react-router";
import type { NavItem } from "~/lib/nav-items";

/**
 * Mobile-only bottom bar (hidden at/above the `md` breakpoint). Fixed to the
 * viewport bottom — app-shell.tsx pads its main content so this never covers
 * the last bit of a page.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white md:hidden dark:border-gray-800 dark:bg-gray-950">
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
              `flex flex-1 flex-col items-center gap-1 border-t-2 py-2 text-xs ${
                isActive
                  ? "border-emerald-600 font-semibold text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent font-medium text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
