import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  // Role dashboards. TEMPORARY placeholders (Issue #8) — see the modules.
  route("admin", "routes/admin.tsx"),
  route("farmer", "routes/farmer.tsx"),
  route("customer", "routes/customer.tsx"),
] satisfies RouteConfig;
