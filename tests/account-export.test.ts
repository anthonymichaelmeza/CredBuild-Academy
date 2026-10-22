import { afterEach, describe, expect, it, vi } from "vitest";
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
import { GET } from "@/app/api/account/export/route";
afterEach(() => vi.unstubAllEnvs());
describe("learning export privacy", () => {
  it("requires a verified identity before reading private records", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("never pretends the server can export browser-local records", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const response = await GET();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("Export browser demo data");
  });
});
