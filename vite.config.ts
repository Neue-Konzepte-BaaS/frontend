import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    // maplibre-gl ships its tile-parsing work as a separate worker module.
    // Vite's dev-time dependency pre-bundler mangles that worker's URL,
    // producing a 404 for maplibre-gl-worker.mjs and a silently blank map
    // (no console error). Excluding it from pre-bundling avoids the mangling;
    // this only affects `npm run dev`, not the production build.
    exclude: ["maplibre-gl"],
  },
});
