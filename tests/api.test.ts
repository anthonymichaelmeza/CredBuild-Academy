import { describe, expect, it, vi } from "vitest";
vi.mock("@/modules/identity/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/modules/identity/auth")>();
  return {
    ...actual,
    requireActor: vi.fn(async () => {
      throw new actual.AccessError();
    }),
  };
});
import { POST } from "@/app/api/practice/route";
import { POST as adminPost } from "@/app/api/admin/route";
function request(body: unknown, origin = "https://academy.test") {
  return new Request("https://academy.test/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
describe("server request boundaries", () => {
  it("rejects cross-origin mutation", async () => {
    expect(
      (await POST(request({ action: "start" }, "https://other.test"))).status,
    ).toBe(403);
  });
  it("rejects invalid session configuration", async () => {
    expect(
      (
        await POST(
          request({
            action: "start",
            config: { count: 999, mode: "adaptive", domain: "all" },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("requires a verified account or explicit demo identity", async () => {
    expect(
      (
        await POST(
          request({
            action: "start",
            config: { count: 10, mode: "adaptive", domain: "all" },
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("does not expose publishing to public requests", async () => {
    expect((await adminPost()).status).toBe(403);
  });
});
