import { afterEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import { migrateDatabase } from "@/db/client";
afterEach(() => vi.unstubAllEnvs());

describe("incremental database upgrades", () => {
  it("upgrades the original schema without losing existing learner records and checks every checksum", async () => {
    const local = new PGlite();
    try {
      const source = await readFile(
        "src/db/migrations/0001_foundation.sql",
        "utf8",
      );
      await local.exec(source);
      await local.exec(
        "CREATE TABLE _credbuilt_migrations (id text PRIMARY KEY, sha256 text NOT NULL)",
      );
      await local.query(
        "INSERT INTO _credbuilt_migrations VALUES ('0001', $1)",
        [createHash("sha256").update(source).digest("hex")],
      );
      await local.query(
        "INSERT INTO users (id, identity_mode) VALUES ('retained-user','managed')",
      );
      await local.query(
        "INSERT INTO learning_sessions(id,owner_id,status,data) VALUES ('retained-session','retained-user','in_progress',$1)",
        [JSON.stringify({ original: true })],
      );
      await migrateDatabase(local, null);
      await migrateDatabase(local, null);
      expect(
        (
          await local.query<{ id: string }>(
            "SELECT id FROM _credbuilt_migrations ORDER BY id",
          )
        ).rows.map((r) => r.id),
      ).toEqual(["0001", "0002", "0003", "0004"]);
      expect(
        (
          await local.query<{ data: unknown }>(
            "SELECT data FROM learning_sessions WHERE id='retained-session'",
          )
        ).rows[0].data,
      ).toEqual({ original: true });
      await local.query(
        "UPDATE _credbuilt_migrations SET sha256='tampered' WHERE id='0002'",
      );
      await expect(migrateDatabase(local, null)).rejects.toThrow(
        "checksum changed",
      );
      expect(
        (await local.query("SELECT * FROM users WHERE id='retained-user'"))
          .rows,
      ).toHaveLength(1);
    } finally {
      await local.close();
    }
  });
  it("never auto-applies pending migrations to a managed database during application startup", async () => {
    vi.stubEnv("CREDBUILT_MIGRATE", "false");
    const query = vi
      .fn<(text: string) => Promise<{ rows: [] }>>()
      .mockResolvedValue({ rows: [] });
    await expect(
      migrateDatabase(null, { query } as unknown as Pool),
    ).rejects.toThrow("Run npm run db:migrate explicitly");
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toMatch(/^SELECT/);
  });
});
