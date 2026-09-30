import { NavLink } from "react-router";
import type { NavItem } from "~/lib/nav-items";

/**
 * Desktop-only left sidebar (hidden below the `md` breakpoint — see
 * app-shell.tsx for why width, not orientation, decides which nav shows).
 * `h-full` (of the flex row app-shell.tsx sizes to the viewport minus the
 * page's own header) plus `overflow-y-auto` keep every item reachable and
 * the sidebar itself always fully visible, instead of growing with (and
 * scrolling away with) a tall page like Farm settings — a farmer no longer
 * has to scroll the whole page just to reach a nav item, and the sidebar
 * never runs off past the bottom of the screen.
 */
export function SideNav({ items, pinned }: { items: NavItem[]; pinned?: NavItem | NavItem[] }) {
  // One item (the farmer's "My farm") or a group (the admin's System
  // tools) — both render below the same divider.
  const pinnedItems = pinned ? (Array.isArray(pinned) ? pinned : [pinned]) : [];

  return (
    <nav className="hidden h-full shrink-0 flex-col justify-between overflow-y-auto border-r border-beige/50 bg-beige p-4 md:flex md:w-64">
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
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-lg font-medium ${
            isActive
              ? "bg-forest/20 text-forest font-semibold"
              : "text-forest hover:bg-forest/10"
          }`
        }
      >
        <Icon className="h-6 w-6 shrink-0" aria-hidden />
        {item.label}
      </NavLink>
    </li>
  );
}
