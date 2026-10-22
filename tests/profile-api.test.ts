import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/modules/identity/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/identity/auth")>();
  return {
    ...actual,
    actor: vi.fn(async () => null),
    requireActor: vi.fn(async () => {
      throw new actual.AccessError();
    }),
  };
});
import { actor, requireActor } from "@/modules/identity/auth";
import { GET, POST } from "@/app/api/profile/route";
import { defaultProfile } from "@/modules/planner/model";
function request(input: unknown, origin = "https://academy.test") {
  return new Request("https://academy.test/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(input),
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("learner profile API authorization", () => {
  it("returns an empty private snapshot without an account and requires identity to write", async () => {
    const read = await GET();
    expect(await read.json()).toEqual({
      state: null,
      revision: 0,
      weakDomains: [],
    });
    expect(read.headers.get("Cache-Control")).toBe("private, no-store");
    expect(
      (
        await POST(
          request({ action: "save", profile: defaultProfile, revision: 0 }),
        )
      ).status,
    ).toBe(401);
  });
  it("rejects cross-origin writes before account lookup", async () => {
    expect(
      (
        await POST(
          request(
            { action: "save", profile: defaultProfile, revision: 0 },
            "https://other.test",
          ),
        )
      ).status,
    ).toBe(403);
    expect(requireActor).not.toHaveBeenCalled();
  });
  it("never accepts a client-selected account owner", async () => {
    vi.mocked(requireActor).mockResolvedValueOnce({
      id: "demo:alice",
      mode: "demo",
    });
    expect(
      (
        await POST(
          request({
            action: "save",
            profile: defaultProfile,
            revision: 0,
            ownerId: "demo:bob",
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("browser demo rejects server reads and mutations without touching identity or database", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    expect((await GET()).status).toBe(403);
    expect(
      (
        await POST(
          request({ action: "save", profile: defaultProfile, revision: 0 }),
        )
      ).status,
    ).toBe(403);
    expect(actor).not.toHaveBeenCalled();
    expect(requireActor).not.toHaveBeenCalled();
  });
});
