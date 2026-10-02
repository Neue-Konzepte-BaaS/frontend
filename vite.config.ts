import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      outDir: "build/client",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Bauer as a Service",
        short_name: "BaaS",
        description:
          "Manage self-harvest plots, tenants, and messages for your farm.",
        theme_color: "#31311B",
        background_color: "#31311B",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        globIgnores: ["**/vegField.jpg", "**/farmerGirl.jpeg", "**/*.mp4"],
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp4|jpg|jpeg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "large-media",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/js\.stripe\.com\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.stripe\.com\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
    {
      name: "suppress-chrome-devtools-probe",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/.well-known/appspecific/com.chrome.devtools.json") {
            res.writeHead(404).end();
            return;
          }
          next();
        });
      },
    },
  ],
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
