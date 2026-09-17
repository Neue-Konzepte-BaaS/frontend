import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Separate from vite.config.ts on purpose: that one loads the react-router
 * dev plugin (route type generation, SSR entry points, …), none of which a
 * plain unit test of app/lib needs — pulling it in would only slow tests
 * down and couple them to the app's routing setup for no benefit.
 */
export default defineConfig({
  resolve: {
    // fileURLToPath, not the URL's own .pathname: .pathname percent-encodes
    // characters like the space in this repo's directory name (".../Neue
    // Konzepte Vibecoding/..." -> "...%20Konzepte..."), which silently broke
    // every "~/..." import in tests — nothing under app/lib ever exercised
    // the alias before (they all use relative imports), so this went unnoticed.
    alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) },
  },
  test: {
    environment: "node",
  },
});
