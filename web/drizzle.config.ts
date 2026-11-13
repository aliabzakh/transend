import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../.env");
} catch {
  /* use the shell environment */
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
