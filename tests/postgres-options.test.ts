import { describe, expect, it } from "vitest";
import { postgresOptions } from "@/db/postgres-options";
describe("managed database configuration", () => {
  it("requires certificate verification and bounds connection/query time", () => {
    expect(
      postgresOptions(
        "postgresql://db.example.test/academy?sslmode=verify-full",
      ),
    ).toMatchObject({
      ssl: { rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
    });
    for (const mode of ["disable", "prefer", "require", "no-verify"])
      expect(() =>
        postgresOptions(`postgresql://db.example.test/academy?sslmode=${mode}`),
      ).toThrow("verified TLS");
    expect(
      postgresOptions("postgresql://localhost/academy?sslmode=disable").ssl,
    ).toBeUndefined();
  });
  it("reports invalid configuration without reflecting credentials", () => {
    expect(() => postgresOptions("invalid-private-connection-value")).toThrow(
      "Invalid PostgreSQL configuration.",
    );
  });
});
