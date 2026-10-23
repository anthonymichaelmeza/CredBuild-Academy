import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/db/client", () => ({ db: vi.fn() }));
vi.mock("@/db/seed", () => ({ seedDemo: vi.fn() }));
import { db } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { startSession } from "@/modules/practice/service";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("connected curriculum draft rejection", () => {
  it("refuses the draft bank before any persistence or publication access", async () => {
    await expect(
      startSession(
        { id: "managed-user", mode: "managed" },
        {
          count: 1,
          mode: "learning",
          domain: "all",
          bank: "curriculum_drafts",
          prioritizeMissed: false,
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
    expect(seedDemo).not.toHaveBeenCalled();
  });
  it("allows only the reviewed bank for managed production starts, while leaving historical lookup unchanged", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const bank of [
      undefined,
      "demonstration",
      "curriculum_drafts",
    ] as const)
      await expect(
        startSession(
          { id: "managed-user", mode: "managed" },
          {
            count: 1,
            mode: "learning",
            domain: "all",
            ...(bank ? { bank } : {}),
            prioritizeMissed: false,
          },
        ),
      ).rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
    expect(seedDemo).not.toHaveBeenCalled();
  });
  it("does not allow the generic practice endpoint to bypass the unverified full-exam policy", async () => {
    await expect(
      startSession(
        { id: "managed-user", mode: "managed" },
        {
          count: 200,
          mode: "exam",
          domain: "all",
          bank: "published",
          durationSeconds: 3600,
          prioritizeMissed: false,
        },
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(db).not.toHaveBeenCalled();
    expect(seedDemo).not.toHaveBeenCalled();
  });
});
