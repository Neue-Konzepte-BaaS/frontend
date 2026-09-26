import type { ReactNode } from "react";
import { SideNav } from "~/components/nav/side-nav";
import { BottomNav } from "~/components/nav/bottom-nav";
import type { NavItem } from "~/lib/nav-items";

/**
 * The responsive nav shell for both roles (see issue #27): a left sidebar on
 * wide/desktop screens, a bottom bar on narrow/mobile ones. The `md` width
 * breakpoint decides which one shows — not a literal portrait/landscape
 * check, since that would misjudge a narrow desktop window or a tablet held
 * sideways. A page's own header (brand, account, logout — different per role
 * and auth state) stays outside this component; AppShell only owns the nav
 * chrome and the content column next to/above it.
 *
 * `mobileItems` lets the bottom bar show a different (usually shorter) set
 * than the sidebar — see useFarmerMobileNavItems for why.
 */
export function AppShell({
  items,
  mobileItems,
  pinned,
  children,
}: {
  items: NavItem[];
  mobileItems?: NavItem[];
  /** Rendered separately at the bottom of the sidebar only — one item (the
   *  farmer's "My farm") or a group (the admin's System tools). */
  pinned?: NavItem | NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="md:flex md:flex-1">
      <SideNav items={items} pinned={pinned} />
      <main className="flex-1 pb-16 pt-8 md:pb-0">{children}</main>
      <BottomNav items={mobileItems ?? items} />
    </div>
  );
}
