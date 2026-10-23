import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/modules/identity/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/identity/auth")>();
  return { ...actual, requireActor: vi.fn() };
});
vi.mock("@/modules/studio/service", () => ({
  studioSnapshot: vi.fn(),
  readStudio: vi.fn(),
  studioAction: vi.fn(),
  requireStudioAccess: vi.fn(),
}));
import { AccessError, requireActor } from "@/modules/identity/auth";
import { requireStudioAccess as realAccess } from "@/modules/studio/roles";
import { GET, POST } from "@/app/api/studio/route";
import * as service from "@/modules/studio/service";
import {
  questionTemplate,
  safeHttps,
  safeMediaUrl,
  contentDraftSchema,
  studioActionSchema,
} from "@/modules/studio/model";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
  vi.stubEnv("ALLOW_LOCAL_STUDIO", "false");
  vi.mocked(requireActor).mockRejectedValue(new AccessError());
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
function request(body: unknown, origin = "https://academy.test") {
  return new Request("https://academy.test/api/studio", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("Content Studio abuse boundaries", () => {
  it("rejects executable, credential-bearing and private-address URLs without making a network request", () => {
    const unsafe = [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "http://www.osha.gov/construction",
      "https://user:password@www.osha.gov/",
      "https://localhost/",
      "https://localhost./",
      "https://localhost../",
      "https://private.localhost/",
      "https://127.0.0.2/",
      "https://2130706433/",
      "https://0177.1/",
      "https://10.0.0.1/",
      "https://172.31.1.1/",
      "https://192.168.1.1/",
      "https://169.254.169.254/latest/meta-data/",
      "https://100.100.100.200/",
      "https://224.0.0.1/",
      "https://198.18.0.1/",
      "https://[::1]/",
      "https://[::ffff:127.0.0.1]/",
      "https://[fe80::1]/",
      "https://[fc00::1]/",
    ];
    for (const value of unsafe) {
      expect(safeHttps(value), value).toBe(false);
      expect(safeMediaUrl(value), value).toBe(false);
    }
    expect(safeHttps("https://www.osha.gov/construction")).toBe(true);
    expect(safeMediaUrl("/media/original-demo.mp4")).toBe(true);
    for (const value of [
      "/media/../private.json",
      "/media/%2e%2e/private.json",
      "//evil.test/video.mp4",
      "/api/account/export",
    ])
      expect(safeMediaUrl(value), value).toBe(false);
  });

  it("does not accept client-selected authors, roles, approvals or source verification metadata", () => {
    for (const injected of [
      { role: "administrator" },
      { ownerId: "someone-else" },
      { authorId: "someone-else" },
      { status: "published" },
      { reviews: [{ decision: "approved" }] },
    ])
      expect(
        studioActionSchema.safeParse({
          action: "create",
          content: questionTemplate,
          ...injected,
        }).success,
      ).toBe(false);
    expect(
      contentDraftSchema.safeParse({
        ...questionTemplate,
        approved: true,
        authorId: "injected",
      }).success,
    ).toBe(false);
    const source = {
      id: "source-1",
      title: "Synthetic test reference",
      url: "https://example.test/reference",
      edition: "test edition",
      section: "test section",
    };
    expect(
      contentDraftSchema.safeParse({
        ...questionTemplate,
        sources: [
          {
            ...source,
            verifiedAt: "2026-10-23T00:00:00Z",
            reviewedBy: "injected",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      contentDraftSchema.safeParse({
        ...questionTemplate,
        sources: [source, source],
      }).success,
    ).toBe(false);
    expect(
      studioActionSchema.safeParse({
        action: "review",
        id: "test-id",
        revision: 1,
        rowVersion: 0,
        decision: "approved",
        findings: "test",
        sourceChecks: [],
        humanAttestation: true,
        reviewerId: "injected",
      }).success,
    ).toBe(false);
  });

  it("uses trusted stored roles and never interprets extra actor properties as privileges", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const forged = {
      id: "managed-security-learner",
      mode: "managed" as const,
      role: "administrator",
      roles: ["administrator"],
    };
    await expect(realAccess(forged, query)).rejects.toMatchObject({
      status: 403,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("editorial_roles"),
      [forged.id],
    );
  });

  it("does not permit local editorial identities in production", async () => {
    vi.stubEnv("ALLOW_LOCAL_STUDIO", "true");
    vi.stubEnv("ALLOW_LOCAL_DEMO", "true");
    vi.stubEnv("NODE_ENV", "production");
    const query = vi.fn(async () => ({ rows: [] }));
    await expect(
      realAccess({ id: "demo:editor", mode: "demo" }, query),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it("requires authentication before exposing content or import templates", async () => {
    for (const url of [
      "https://academy.test/api/studio",
      "https://academy.test/api/studio?template=questions",
      "https://academy.test/api/studio?id=private-content",
    ]) {
      const response = await GET(new Request(url));
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ error: "Sign in to continue." });
    }
    expect(service.studioSnapshot).not.toHaveBeenCalled();
    expect(service.readStudio).not.toHaveBeenCalled();
    expect(service.requireStudioAccess).not.toHaveBeenCalled();
  });

  it("denies a signed-in learner access to the editorial template", async () => {
    vi.mocked(requireActor).mockResolvedValue({
      id: "managed-security-learner",
      mode: "managed",
    });
    vi.mocked(service.requireStudioAccess).mockRejectedValue(
      new AccessError("No editorial role.", 403),
    );
    const response = await GET(
      new Request("https://academy.test/api/studio?template=questions"),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "No editorial role." });
    expect(service.requireStudioAccess).toHaveBeenCalledWith({
      id: "managed-security-learner",
      mode: "managed",
    });
  });

  it("rejects cross-origin and oversized streamed requests before any identity or Studio mutation", async () => {
    expect(
      (
        await POST(
          request(
            { action: "create", content: questionTemplate },
            "https://evil.test",
          ),
        )
      ).status,
    ).toBe(403);
    const oversized = request({ payload: "x".repeat(512_001) });
    oversized.headers.set("Content-Length", "2");
    expect((await POST(oversized)).status).toBe(413);
    expect(requireActor).not.toHaveBeenCalled();
    expect(service.studioAction).not.toHaveBeenCalled();
  });

  it("does not expose editorial reads or writes through the credential-free browser demo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    expect(
      (await GET(new Request("https://academy.test/api/studio"))).status,
    ).toBe(403);
    expect(
      (await POST(request({ action: "create", content: questionTemplate })))
        .status,
    ).toBe(403);
    expect(requireActor).not.toHaveBeenCalled();
    expect(service.studioSnapshot).not.toHaveBeenCalled();
    expect(service.studioAction).not.toHaveBeenCalled();
  });
});
