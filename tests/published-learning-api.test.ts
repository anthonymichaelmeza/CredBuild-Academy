import { afterEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/modules/identity/auth", async (original) => {
  const actual = await original<typeof import("@/modules/identity/auth")>();
  return {
    ...actual,
    requireActor: vi.fn(async () => {
      if (!identity.signedIn) throw new actual.AccessError();
      return { id: "verified-published-learner", mode: "managed" };
    }),
  };
});
vi.mock("@/modules/learning/service", () => ({
  publishedLessonResource: vi.fn(async () => ({
    lesson: { id: "published" },
    progress: null,
    revision: 0,
    feedback: {},
  })),
  saveLesson: vi.fn(async () => undefined),
}));
vi.mock("@/modules/studio/publication", () => ({
  getPublishedLesson: vi.fn(async (id: string) =>
    id === "published" ? { id } : null,
  ),
}));
import { GET, POST } from "@/app/api/published-learning/route";
import {
  publishedLessonResource,
  saveLesson,
} from "@/modules/learning/service";
const body = {
  lessonId: "published",
  lessonVersion: 1,
  revision: 0,
  action: { type: "visit", sectionId: "introduction" },
};
function request(input: unknown, origin = "https://academy.test") {
  return new Request("https://academy.test/api/published-learning", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(input),
  });
}
const read = () =>
  GET(
    new Request(
      "https://academy.test/api/published-learning?lessonId=published",
    ),
  );
afterEach(() => {
  identity.signedIn = false;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("published learning API boundary", () => {
  it("requires a verified learner and keeps private responses uncachable", async () => {
    const result = await read();
    expect(result.status).toBe(401);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await POST(request(body))).status).toBe(401);
    expect(publishedLessonResource).not.toHaveBeenCalled();
    expect(saveLesson).not.toHaveBeenCalled();
  });
  it("rejects browser-demo access, foreign origins, owner substitution and forged correctness", async () => {
    identity.signedIn = true;
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    expect((await read()).status).toBe(403);
    expect((await POST(request(body))).status).toBe(403);
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    expect((await POST(request(body, "https://another.test"))).status).toBe(
      403,
    );
    expect((await POST(request({ ...body, ownerId: "victim" }))).status).toBe(
      400,
    );
    expect(
      (
        await POST(
          request({
            ...body,
            action: {
              type: "check",
              checkId: "check",
              choiceId: "a",
              correct: true,
            },
          }),
        )
      ).status,
    ).toBe(400);
    expect(saveLesson).not.toHaveBeenCalled();
  });
  it("accepts only a current published lesson and takes ownership from the verified identity", async () => {
    identity.signedIn = true;
    expect((await POST(request({ ...body, lessonId: "draft" }))).status).toBe(
      404,
    );
    expect(saveLesson).not.toHaveBeenCalled();
    const result = await POST(request(body));
    expect(result.status).toBe(200);
    expect(saveLesson).toHaveBeenCalledWith(
      { id: "verified-published-learner", mode: "managed" },
      body,
    );
    expect(publishedLessonResource).toHaveBeenCalledWith(
      { id: "verified-published-learner", mode: "managed" },
      "published",
    );
  });
});
