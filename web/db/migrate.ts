/** Applies db/migrations to DATABASE_URL. Usage: npm run db:migrate */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  process.loadEnvFile("../.env");
} catch {
  /* use the shell environment */
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { prepare: false, max: 1 });
await migrate(drizzle(sql), { migrationsFolder: new URL("./migrations", import.meta.url).pathname });
await sql.end();
console.log("Migrations applied.");
