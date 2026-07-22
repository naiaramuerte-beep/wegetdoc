import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Sentry source-map upload only runs when all three env vars are
// present — keeps `npm run dev` and local builds without Sentry env
// vars working. SENTRY_AUTH_TOKEN is the only true secret here; the
// org and project slugs are public identifiers.
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const sentryPluginEnabled = !!(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT);

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  // Plugin must be added LAST so it sees the final emitted assets.
  // When disabled (no env vars) it's not added at all so Vite doesn't
  // even import the Sentry CLI binary.
  ...(sentryPluginEnabled
    ? [
        sentryVitePlugin({
          authToken: SENTRY_AUTH_TOKEN,
          org: SENTRY_ORG,
          project: SENTRY_PROJECT,
          // The Sentry project lives in the EU datacenter (de.sentry.io).
          url: "https://sentry.io/",
          // Tie this build to a release version so error reports can
          // link back to the exact commit. Railway exposes the SHA.
          release: {
            name: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
          },
          // Source maps are deleted from the build output after upload
          // so we don't expose them to the public via the CDN.
          sourcemaps: {
            filesToDeleteAfterUpload: ["**/*.map"],
          },
        }),
      ]
    : []),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  // Bake the deploy's commit SHA into the client bundle so the running app can
  // tell whether it's stale vs. what the server currently serves (see
  // installVersionAutoReload). Falls back to "dev" outside Railway builds.
  define: {
    __BUILD_ID__: JSON.stringify(process.env.RAILWAY_GIT_COMMIT_SHA || "dev"),
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Source maps are required for Sentry to symbolicate minified
    // stack traces back to original code. The vite plugin uploads
    // them to Sentry and then deletes them from the dist folder.
    sourcemap: true,
  },
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
