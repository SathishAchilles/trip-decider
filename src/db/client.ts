import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

function createDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
