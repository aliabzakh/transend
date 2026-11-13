import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Server-side settings (contract ID, keys) live in the repo-root .env locally and
// in the host's environment variables when deployed. Nothing here reaches the browser.
try {
  process.loadEnvFile("../.env");
} catch {
  /* no root .env: use the host environment */
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The repo root also has a lockfile (for scripts/); the app itself lives here.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
};

export default nextConfig;
