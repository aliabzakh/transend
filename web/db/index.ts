import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __transendSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  // postgres() connects lazily, so a build without DATABASE_URL still imports this
  // module; the first query then fails with a clear connection error.
  const url = process.env.DATABASE_URL || "postgres://database-url-not-set.invalid/none";
  // `prepare: false` keeps the Neon pooler (PgBouncer, transaction mode) happy.
  return postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 1 : 5 });
}

// Reuse one pool across hot reloads in dev and across warm invocations on Vercel.
const sql = globalThis.__transendSql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__transendSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
