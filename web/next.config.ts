import type { NextConfig } from "next";

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
};

export default nextConfig;
