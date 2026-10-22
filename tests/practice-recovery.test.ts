import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  seed: vi
    .fn()
    .mockRejectedValueOnce(new Error("Temporary database outage"))
    .mockResolvedValue(undefined),
}));
vi.mock("@/db/seed", () => ({ seedDemo: mocks.seed }));
vi.mock("@/db/client", () => ({
  db: async () => ({
    select: () => ({ from: () => ({ where: async () => [] }) }),
  }),
}));
import { pool } from "@/modules/practice/service";
describe("connected practice outage recovery", () => {
  it("retries initialization after an outage rather than caching failure for the process lifetime", async () => {
    await expect(pool()).rejects.toThrow("Temporary database outage");
    expect(await pool()).toEqual([]);
    expect(mocks.seed).toHaveBeenCalledTimes(2);
  });
});
