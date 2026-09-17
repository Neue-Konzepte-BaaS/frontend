import { NavLink } from "react-router";
import type { NavItem } from "~/lib/nav-items";

/**
 * Desktop-only left sidebar (hidden below the `md` breakpoint — see
 * app-shell.tsx for why width, not orientation, decides which nav shows).
 */
export function SideNav({ items, pinned }: { items: NavItem[]; pinned?: NavItem | NavItem[] }) {
  // One item (the farmer's "Farm settings") or a group (the admin's System
  // tools) — both render below the same divider.
  const pinnedItems = pinned ? (Array.isArray(pinned) ? pinned : [pinned]) : [];

  return (
    <nav className="hidden shrink-0 flex-col justify-between border-r border-gray-200 p-4 md:flex md:w-56 dark:border-gray-800">
      <ul className="space-y-1">
        {items.map((item) => (
          <SideNavLink key={item.to} item={item} />
        ))}
      </ul>
      {pinnedItems.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-gray-200 pt-4 dark:border-gray-800">
          {pinnedItems.map((item) => (
            <SideNavLink key={item.to} item={item} />
          ))}
        </ul>
      )}
    </nav>
  );
}

function SideNavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
            isActive
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
          }`
        }
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {item.label}
      </NavLink>
    </li>
  );
}
