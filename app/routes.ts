import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  // Public plot search. Open to everyone (no guard) — also the tenant nav's
  // "Search" destination, so it stays outside customer-layout below (that
  // layout requires a customer session; this route must not).
  route("search", "routes/search.tsx"),
  // Admin is still a TEMPORARY placeholder (Issue #8).
  route("admin", "routes/admin.tsx"),
  // Tenant section: nav is Home/Search/Board/Inbox/Me (issue #27). A layout
  // owns the requireRole("customer") guard + shared chrome for everything
  // except Search — see that route's own comment above.
  layout("routes/customer/layout.tsx", { id: "customer-layout" }, [
    route("customer", "routes/customer/home.tsx"),
    route("customer/board", "routes/customer/board.tsx"),
    route("customer/inbox", "routes/customer/inbox.tsx"),
    route("customer/me", "routes/customer/me.tsx"),
  ]),
  // Farmer section: nav is Home/Fields/Plot planner/Tenants/Requests/Board/
  // Care guide, plus Farm settings pinned separately (issue #27). A layout
  // owns the requireRole("farmer") guard and shared chrome; children render
  // in its <Outlet />. fields/new is a sibling of fields (not nested under
  // it) because the draw flow wants the whole viewport, not a list sidebar
  // to fight.
  layout("routes/farmer/layout.tsx", { id: "farmer-layout" }, [
    route("farmer", "routes/farmer/index.tsx"),
    route("farmer/fields", "routes/farmer/fields.tsx"),
    route("farmer/fields/new", "routes/farmer/new-field.tsx"),
    // A field's "digital twin": view it, and (once, before any plots exist)
    // generate its plot grid. :fieldId comes before "new" would ever match
    // it — React Router resolves static segments ("new") before dynamic
    // ones, so this ordering doesn't matter, but keeping /new above for
    // readability (create flow, then manage flow).
    route("farmer/fields/:fieldId", "routes/farmer/field-detail.tsx"),
    // "Plot planner" itself isn't a screen — it redirects into the field
    // above; see planner.tsx.
    route("farmer/planner", "routes/farmer/planner.tsx"),
    route("farmer/tenants", "routes/farmer/tenants.tsx"),
    route("farmer/requests", "routes/farmer/requests.tsx"),
    route("farmer/board", "routes/farmer/board.tsx"),
    route("farmer/care-guide", "routes/farmer/care-guide.tsx"),
    route("farmer/settings", "routes/farmer/settings.tsx"),
  ]),
] satisfies RouteConfig;
