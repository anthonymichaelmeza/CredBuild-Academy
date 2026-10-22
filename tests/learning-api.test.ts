import { afterEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/modules/identity/auth", async (original) => {
  const actual = await original<typeof import("@/modules/identity/auth")>();
  const who = { id: "verified-learner", mode: "managed" as const };
  return {
    ...actual,
    actor: vi.fn(async () => (identity.signedIn ? who : null)),
    demoEnabled: () => false,
    requireActor: vi.fn(async () => {
      if (!identity.signedIn) throw new actual.AccessError();
      return who;
    }),
  };
});
vi.mock("@/modules/learning/service", () => ({
  readLearning: vi.fn(async () => ({
    state: { version: 1, progress: {} },
    revisions: {},
  })),
  saveLesson: vi.fn(async () => ({
    state: { version: 1, progress: {} },
    revisions: {},
  })),
}));
import { GET, POST } from "@/app/api/learning/route";
import { saveLesson } from "@/modules/learning/service";
const body = {
  lessonId: "recognize-hazards",
  lessonVersion: 1,
  revision: 0,
  action: { type: "visit", sectionId: "understand" },
};
function request(input: unknown, origin = "https://academy.test") {
  return new Request("https://academy.test/api/learning", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(input),
  });
}
afterEach(() => {
  identity.signedIn = false;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("lesson API authorization", () => {
  it("requires authentication, rejects cross-origin writes, and marks private responses uncachable", async () => {
    const result = await GET();
    expect(result.status).toBe(401);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await POST(request(body))).status).toBe(401);
    expect((await POST(request(body, "https://other.test"))).status).toBe(403);
    expect(saveLesson).not.toHaveBeenCalled();
  });
  it("takes ownership from the verified session and rejects client-controlled account fields", async () => {
    identity.signedIn = true;
    expect(
      (await POST(request({ ...body, ownerId: "another-user" }))).status,
    ).toBe(400);
    expect((await POST(request(body))).status).toBe(200);
    expect(saveLesson).toHaveBeenCalledWith(
      { id: "verified-learner", mode: "managed" },
      body,
    );
  });
  it("does not touch server progress when the browser demonstration is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    identity.signedIn = true;
    expect((await GET()).status).toBe(403);
    expect((await POST(request(body))).status).toBe(403);
    expect(saveLesson).not.toHaveBeenCalled();
  });
});
