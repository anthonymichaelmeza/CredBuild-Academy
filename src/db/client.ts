import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { drizzle as localDrizzle } from "drizzle-orm/pglite";
import { drizzle as managedDrizzle } from "drizzle-orm/node-postgres";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import * as schema from "./schema";
import { browserDemoEnabled } from "@/modules/runtime/mode";

async function connect() {
  if (browserDemoEnabled())
    throw new Error("Database access is disabled in browser demo mode.");
  const managed = Boolean(process.env.DATABASE_URL);
  if (!managed && process.env.ALLOW_LOCAL_DEMO !== "true")
    throw new Error(
      "Configure DATABASE_URL or explicitly enable ALLOW_LOCAL_DEMO for development.",
    );
  const migration = await readFile(
    path.join(process.cwd(), "src/db/migrations/0001_foundation.sql"),
    "utf8",
  );
  const hash = createHash("sha256").update(migration).digest("hex");
  const localPath =
    process.env.LOCAL_DATABASE_PATH === ":memory:"
      ? undefined
      : path.resolve(
          /* turbopackIgnore: true */ process.env.LOCAL_DATABASE_PATH ||
            ".local/credbuilt",
        );
  if (!managed && localPath)
    await mkdir(path.dirname(localPath), { recursive: true });
  const local = !managed ? new PGlite(localPath) : null;
  const pool = managed
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
    : null;
  const raw = async (sql: string) =>
    local ? local.exec(sql) : pool!.query(sql);
  await raw(
    "CREATE TABLE IF NOT EXISTS _credbuilt_migrations (id text PRIMARY KEY, sha256 text NOT NULL)",
  );
  const installed = local
    ? (
        await local.query<{ sha256: string }>(
          "SELECT sha256 FROM _credbuilt_migrations WHERE id='0001'",
        )
      ).rows
    : (
        await pool!.query<{ sha256: string }>(
          "SELECT sha256 FROM _credbuilt_migrations WHERE id='0001'",
        )
      ).rows;
  if (installed.length && installed[0].sha256 !== hash)
    throw new Error(
      "Migration checksum changed. Add a new migration; do not rewrite applied migrations.",
    );
  if (!installed.length) {
    if (managed && process.env.CREDBUILT_MIGRATE !== "true")
      throw new Error(
        "Database migration required. Run npm run db:migrate explicitly before starting the application.",
      );
    // One connection guarantees the migration and its ledger entry commit together.
    if (local)
      await local.transaction(async (tx) => {
        await tx.exec(migration);
        await tx.query(
          "INSERT INTO _credbuilt_migrations VALUES ('0001', $1)",
          [hash],
        );
      });
    else {
      const connection = await pool!.connect();
      try {
        await connection.query("BEGIN");
        await connection.query(migration);
        await connection.query(
          "INSERT INTO _credbuilt_migrations VALUES ('0001', $1)",
          [hash],
        );
        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
    }
  }
  const orm = local
    ? localDrizzle(local, { schema })
    : managedDrizzle(pool!, { schema });
  return {
    orm,
    close: async () => {
      await local?.close();
      await pool?.end();
    },
  };
}
type Connection = Awaited<ReturnType<typeof connect>>;
const globalDb = globalThis as unknown as { credbuiltDb?: Promise<Connection> };
export function connection() {
  return (globalDb.credbuiltDb ??= connect());
}
export async function db() {
  return (await connection()).orm;
}
