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
    <nav className="hidden shrink-0 flex-col justify-between border-r border-beige/50 bg-beige p-4 md:flex md:w-56">
      <ul className="space-y-1">
        {items.map((item) => (
          <SideNavLink key={item.to} item={item} />
        ))}
      </ul>
      {pinnedItems.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-sage/30 pt-4">
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
              ? "bg-forest/20 text-forest font-semibold"
              : "text-forest/80 hover:bg-forest/10 hover:text-forest"
          }`
        }
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {item.label}
      </NavLink>
    </li>
  );
}
