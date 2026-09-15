import { defineConfig } from "vitest/config";

/**
 * Separate from vite.config.ts on purpose: that one loads the react-router
 * dev plugin (route type generation, SSR entry points, …), none of which a
 * plain unit test of app/lib needs — pulling it in would only slow tests
 * down and couple them to the app's routing setup for no benefit.
 */
export default defineConfig({
  resolve: {
    alias: { "~": new URL("./app", import.meta.url).pathname },
  },
  test: {
    environment: "node",
  },
});
