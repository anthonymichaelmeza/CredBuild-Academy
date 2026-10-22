import "server-only";
import type { PoolConfig } from "pg";

export function postgresOptions(connectionString: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Invalid PostgreSQL configuration.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid PostgreSQL configuration.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local) {
    const mode = url.searchParams.get("sslmode");
    if (mode && mode !== "verify-full")
      throw new Error(
        "Hosted PostgreSQL requires sslmode=verify-full. Use your provider's verified TLS connection settings.",
      );
    if (
      url.searchParams.get("ssl") === "0" ||
      url.searchParams.get("ssl") === "false"
    )
      throw new Error("Hosted PostgreSQL requires verified TLS.");
  }
  return {
    connectionString,
    ...(!local ? { ssl: { rejectUnauthorized: true } } : {}),
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    application_name: "credbuilt-academy",
  };
}
