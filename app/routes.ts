import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  // Role dashboards. admin/customer are TEMPORARY placeholders (Issue #8).
  route("admin", "routes/admin.tsx"),
  route("customer", "routes/customer.tsx"),
  // Farmer section: a layout owns the requireRole("farmer") guard and shared
  // chrome; children render in its <Outlet />. fields/new is a sibling of
  // fields (not nested under it) because the draw flow wants the whole
  // viewport, not a list sidebar to fight.
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
  ]),
] satisfies RouteConfig;
