import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("verify-email", "routes/verify-email.tsx"),
  // Allgemeine Geschäftsbedingungen (ToS) — public, linked from the rental
  // request form's acceptance checkbox (plot-crops-and-rent.tsx) before a
  // customer ever signs in to pay, so it must stay reachable logged out.
  route("agb", "routes/terms.tsx"),
  // Public plot search. Open to everyone (no guard) — also the tenant nav's
  // "Search" destination, so it stays outside customer-layout below (that
  // layout requires a customer session; this route must not).
  route("search", "routes/search.tsx"),
  // A farm's public details, reached by clicking a farm in search results.
  // Same public reach as /search — no guard, no customer-layout.
  route("search/farms/:farmId", "routes/search/farm.tsx"),
  // Admin section: nav is Platform/Farms/Accounts/Rentals, plus the System
  // tools (Crop catalog, Care guide, Broadcast) pinned separately (issue
  // #25). A layout owns the requireRole("admin") guard and shared chrome;
  // children render in its <Outlet />. /admin/rentals is still a ComingSoon
  // stub — the backend has no admin rentals endpoint yet.
  layout("routes/admin/layout.tsx", { id: "admin-layout" }, [
    route("admin", "routes/admin/index.tsx"),
    route("admin/farms", "routes/admin/farms.tsx"),
    route("admin/accounts", "routes/admin/accounts.tsx"),
    route("admin/rentals", "routes/admin/rentals.tsx"),
    route("admin/crops", "routes/admin/crops.tsx"),
    // The platform's default care guide — every farm starts from this
    // (backend #44/#68). Its own page/nav entry, mirroring farmer/care-guide.
    route("admin/care-guide", "routes/admin/care-guide.tsx"),
    route("admin/seasons", "routes/admin/seasons.tsx"),
    route("admin/broadcast", "routes/admin/broadcast.tsx"),
    // Subscription tier pricing (issue #73) — pinned in the same "System
    // tools" nav group as Crops/Care guide/Seasons/Broadcast.
    route("admin/subscription-plans", "routes/admin/subscription-plans.tsx"),
  ]),
  // Tenant section: nav is Home/Search/Board/Inbox/Me (issue #27). A layout
  // owns the requireRole("customer") guard + shared chrome for everything
  // except Search — see that route's own comment above.
  layout("routes/customer/layout.tsx", { id: "customer-layout" }, [
    route("customer", "routes/customer/home.tsx"),
    // One rented plot: care, crops and rental period (issue #33). Reached from
    // the Home list's "Open plot"; a plot the tenant has never rented
    // redirects back there rather than rendering an empty page.
    route("customer/plots/:plotId", "routes/customer/plot.tsx"),
    route("customer/board", "routes/customer/board.tsx"),
    route("customer/inbox", "routes/customer/inbox.tsx"),
    route("customer/me", "routes/customer/me.tsx"),
    // Stripe Checkout for a rental request (issue #14) — reached only via
    // PlotCropsAndRent's navigate() carrying the request in router state,
    // never linked to directly. customer/payment/return is where Stripe's
    // return_url sends the browser back once the customer completes (or
    // abandons) checkout.tsx's Payment Element form.
    route("customer/checkout", "routes/customer/checkout.tsx"),
    route("customer/payment/return", "routes/customer/payment-return.tsx"),
    // NOTE (merge): request-sent.tsx was built for the direct rentPlot()
    // submission flow this branch's payment feature retires (a rental is
    // now only ever created by the checkout webhook, never by an immediate
    // customer-facing POST). Nothing on this branch navigates here anymore
    // after this merge -- kept registered rather than deleted so a human
    // can decide whether to repurpose, wire up, or remove it.
    route("customer/request-sent", "routes/customer/request-sent.tsx"),
  ]),
  // Farmer section: nav is Home/Fields/Plot planner/Tenants/Requests/Board/
  // Care guide/Statistics, plus Farm settings and Subscription pinned
  // separately (issue #27, #73). A layout owns the requireRole("farmer") +
  // requireActiveSubscription guard and shared chrome; children render
  // in its <Outlet />.
  layout("routes/farmer/layout.tsx", { id: "farmer-layout" }, [
    route("farmer", "routes/farmer/index.tsx"),
    // Subscription selection/checkout (issue #73) — nested here (not a
    // top-level sibling) so a farmer keeps the header/sidebar throughout,
    // including one who already has a subscription and is just checking its
    // status via the pinned nav item. requireActiveSubscription (the
    // layout's own guard, above) exempts exactly these three paths from its
    // redirect so an unsubscribed farmer visiting them doesn't loop back to
    // themselves — see ~/lib/guards.ts.
    route("farmer/subscribe", "routes/farmer/subscribe.tsx"),
    route("farmer/subscribe/checkout", "routes/farmer/subscribe-checkout.tsx"),
    route("farmer/subscribe/return", "routes/farmer/subscribe-return.tsx"),
    route("farmer/fields", "routes/farmer/fields.tsx"),
    // A field's "digital twin": view it, and (once, before any plots exist)
    // generate its plot grid.
    route("farmer/fields/:fieldId", "routes/farmer/field-detail.tsx"),
    // The draw-a-new-field flow, reached only via the "Plot planner" nav
    // item. Deliberately its own top-level path rather than nested under
    // fields/ — sharing that URL prefix made the "Fields" nav item light up
    // instead of "Plot planner" (both matched /farmer/fields/*). It also
    // wants the whole viewport, not a list sidebar to fight.
    route("farmer/planner", "routes/farmer/planner.tsx"),
    route("farmer/tenants", "routes/farmer/tenants.tsx"),
    route("farmer/requests", "routes/farmer/requests.tsx"),
    route("farmer/board", "routes/farmer/board.tsx"),
    route("farmer/care-guide", "routes/farmer/care-guide.tsx"),
    route("farmer/seasons", "routes/farmer/seasons.tsx"),
    // The farmer's own numbers (issue #22): headline tiles from GET
    // /api/statistics, plus breakdowns computed client-side from rentals/fields.
    route("farmer/statistics", "routes/farmer/statistics.tsx"),
    route("farmer/settings", "routes/farmer/settings.tsx"),
  ]),
] satisfies RouteConfig;
