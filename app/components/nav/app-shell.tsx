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
 *
 * The caller's own header sits above this component and is expected to be
 * `shrink-0` inside an `h-screen flex flex-col` page wrapper, with this
 * component taking `flex-1 overflow-hidden` (via its own `md:flex md:flex-1
 * md:min-h-0`) so the sidebar can be `h-full` of exactly the *remaining*
 * height rather than the whole viewport — sizing it against 100vh directly
 * would run its bottom edge off-screen by however tall the header is. Only
 * `main` scrolls internally on desktop; the sidebar stays fully visible and
 * unscrolled unless its own content (nav items + pinned group) is taller
 * than the remaining space, in which case it scrolls independently.
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
    <div className="md:flex md:min-h-0 md:flex-1">
      <SideNav items={items} pinned={pinned} />
      <main className="pb-16 pt-8 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-8">{children}</main>
      <BottomNav items={mobileItems ?? items} />
    </div>
  );
}
