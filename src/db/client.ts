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
import { postgresOptions } from "./postgres-options";

const migrationRequired = () =>
  new Error(
    "Database migration required. Run npm run db:migrate explicitly before starting the application.",
  );

async function migrationSources() {
  // Literal paths also allow Next.js output-file tracing to include every migration.
  const sources = await Promise.all([
    readFile(
      path.join(process.cwd(), "src/db/migrations/0001_foundation.sql"),
      "utf8",
    ),
    readFile(
      path.join(process.cwd(), "src/db/migrations/0002_learning.sql"),
      "utf8",
    ),
    readFile(
      path.join(process.cwd(), "src/db/migrations/0003_learner_profiles.sql"),
      "utf8",
    ),
    readFile(
      path.join(process.cwd(), "src/db/migrations/0004_content_studio.sql"),
      "utf8",
    ),
  ]);
  return sources.map((source, i) => ({
    id: String(i + 1).padStart(4, "0"),
    source,
    hash: createHash("sha256").update(source).digest("hex"),
  }));
}

export async function migrateDatabase(local: PGlite | null, pool: Pool | null) {
  const migrations = await migrationSources();
  const allowed = Boolean(local) || process.env.CREDBUILT_MIGRATE === "true";
  if (allowed) {
    const run = async (
      query: (
        text: string,
        params?: string[],
      ) => Promise<{ rows: { id: string; sha256: string }[] }>,
    ) => {
      await query(
        "CREATE TABLE IF NOT EXISTS _credbuilt_migrations (id text PRIMARY KEY, sha256 text NOT NULL)",
      );
      const installed = (
        await query("SELECT id, sha256 FROM _credbuilt_migrations ORDER BY id")
      ).rows;
      for (const migration of migrations) {
        const previous = installed.find((m) => m.id === migration.id);
        if (previous && previous.sha256 !== migration.hash)
          throw new Error(
            "Migration checksum changed. Add a new migration; do not rewrite applied migrations.",
          );
        if (!previous) {
          await query(migration.source);
          await query("INSERT INTO _credbuilt_migrations VALUES ($1, $2)", [
            migration.id,
            migration.hash,
          ]);
        }
      }
    };
    if (local) {
      await local.transaction(async (tx) => {
        await run(async (text, params) => {
          // exec accepts multiple statements; only data/ledger queries need rows.
          if (params || text.startsWith("SELECT"))
            return tx.query(text, params);
          await tx.exec(text);
          return { rows: [] };
        });
      });
    } else {
      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        // Serializes explicit migration jobs across application instances.
        await client.query("SELECT pg_advisory_xact_lock(715225, 1)");
        await run((text, params) => client.query(text, params));
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    return;
  }
  let installed: { id: string; sha256: string }[];
  try {
    installed = (
      await pool!.query<{ id: string; sha256: string }>(
        "SELECT id, sha256 FROM _credbuilt_migrations ORDER BY id",
      )
    ).rows;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "42P01"
    )
      throw migrationRequired();
    throw error;
  }
  for (const migration of migrations) {
    const previous = installed.find((m) => m.id === migration.id);
    if (!previous) throw migrationRequired();
    if (previous.sha256 !== migration.hash)
      throw new Error(
        "Migration checksum changed. Add a new migration; do not rewrite applied migrations.",
      );
  }
}

async function connect() {
  if (browserDemoEnabled())
    throw new Error("Database access is disabled in browser demo mode.");
  const managed = Boolean(process.env.DATABASE_URL);
  if (!managed && process.env.VERCEL)
    throw new Error(
      "Vercel account mode requires managed PostgreSQL. Use NEXT_PUBLIC_BROWSER_DEMO=true for the credential-free demonstration; local filesystem storage is not durable on Vercel.",
    );
  if (!managed && process.env.ALLOW_LOCAL_DEMO !== "true")
    throw new Error(
      "Configure DATABASE_URL or explicitly enable ALLOW_LOCAL_DEMO for development.",
    );
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
    ? new Pool(postgresOptions(process.env.DATABASE_URL!))
    : null;
  pool?.on("error", () => {
    console.error(JSON.stringify({ event: "database_idle_connection_error" }));
  });
  try {
    await migrateDatabase(local, pool);
  } catch (error) {
    await local?.close();
    await pool?.end();
    throw error;
  }
  const orm = local
    ? localDrizzle(local, { schema })
    : managedDrizzle(pool!, { schema });
  return {
    orm,
    query: async (text: string, params: unknown[] = []) => {
      if (local) return local.query<Record<string, unknown>>(text, params);
      return pool!.query<Record<string, unknown>>(text, params);
    },
    transaction: async <T>(work: (query: DatabaseQuery) => Promise<T>) => {
      if (local)
        return local.transaction((tx) =>
          work((text, params = []) =>
            tx.query<Record<string, unknown>>(text, params),
          ),
        );
      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        const result = await work((text, params = []) =>
          client.query<Record<string, unknown>>(text, params),
        );
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: async () => {
      await local?.close();
      await pool?.end();
    },
  };
}
export type DatabaseQuery = (
  text: string,
  params?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;
type Connection = Awaited<ReturnType<typeof connect>>;
const globalDb = globalThis as unknown as { credbuiltDb?: Promise<Connection> };
export function connection() {
  return (globalDb.credbuiltDb ??= connect().catch((error) => {
    globalDb.credbuiltDb = undefined;
    throw error;
  }));
}
export async function db() {
  return (await connection()).orm;
}
