import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return url;
}

const queryClient = postgres(requireDatabaseUrl());

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

/** Closes the underlying connection pool — call this at the end of one-off scripts (seed, etc.) so the process can exit instead of hanging on an open connection. Long-running servers (apps/web) should never call this. */
export async function closeDb(): Promise<void> {
  await queryClient.end();
}
