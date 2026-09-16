import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CircleUser,
  ClipboardList,
  Home,
  Inbox,
  LandPlot,
  LayoutGrid,
  ListChecks,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Role-specific navigation menus — see issue #27. Hooks rather than plain
 * data so labels re-resolve on a language switch, same as every other piece
 * of UI text in the app.
 */

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Passed straight to NavLink's `end` — true for exact-match destinations
   *  like Home, so a nested child route (e.g. /farmer/fields) doesn't also
   *  light up the parent's tab. */
  end?: boolean;
};

/** Tenant nav — the same 5 items on both the mobile bottom bar and the desktop sidebar. */
export function useTenantNavItems(): NavItem[] {
  const { t } = useTranslation("common");
  return [
    { to: "/customer", label: t("navHome"), icon: Home, end: true },
    { to: "/search", label: t("navSearch"), icon: Search },
    { to: "/customer/board", label: t("navBoard"), icon: ClipboardList },
    { to: "/customer/inbox", label: t("navInbox"), icon: Inbox },
    { to: "/customer/me", label: t("navMe"), icon: CircleUser },
  ];
}

/** Farmer nav for the desktop sidebar — the full set. */
export function useFarmerNavItems(): NavItem[] {
  const { t } = useTranslation("common");
  return [
    { to: "/farmer", label: t("navHome"), icon: Home, end: true },
    { to: "/farmer/fields", label: t("navFields"), icon: LandPlot },
    { to: "/farmer/planner", label: t("navPlanner"), icon: LayoutGrid },
    { to: "/farmer/tenants", label: t("navTenants"), icon: Users },
    { to: "/farmer/requests", label: t("navRequests"), icon: ListChecks },
    { to: "/farmer/board", label: t("navBoard"), icon: ClipboardList },
    { to: "/farmer/care-guide", label: t("navCareGuide"), icon: BookOpen },
  ];
}

/**
 * Farmer nav for the mobile bottom bar — a curated subset, not the full
 * sidebar list: past ~5 items a bottom bar stops being usable on a phone.
 * Plot planner/Requests/Care guide are still reachable from Home/Fields.
 * The last slot swaps in as "Me" (pointing at the same /farmer/settings page
 * the desktop sidebar pins separately as "Farm settings") so the farmer has
 * *some* way to reach their own account/farm settings on mobile too.
 */
export function useFarmerMobileNavItems(): NavItem[] {
  const { t } = useTranslation("common");
  return [
    { to: "/farmer", label: t("navHome"), icon: Home, end: true },
    { to: "/farmer/fields", label: t("navFields"), icon: LandPlot },
    { to: "/farmer/tenants", label: t("navTenants"), icon: Users },
    { to: "/farmer/board", label: t("navBoard"), icon: ClipboardList },
    { to: "/farmer/settings", label: t("navMe"), icon: CircleUser },
  ];
}

/** Pinned separately at the bottom of the farmer's desktop sidebar, below the scrollable item list. */
export function useFarmerSettingsItem(): NavItem {
  const { t } = useTranslation("common");
  return { to: "/farmer/settings", label: t("navFarmSettings"), icon: Settings };
}
