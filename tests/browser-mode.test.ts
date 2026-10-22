import { afterEach, describe, expect, it, vi } from "vitest";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import { POST } from "@/app/api/practice/route";
import { connection } from "@/db/client";
afterEach(() => vi.unstubAllEnvs());
describe("browser demo disables server identity and persistence", () => {
  it("requires an explicit true flag rather than enabling itself automatically", () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    expect(browserDemoEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    expect(browserDemoEnabled()).toBe(true);
  });
  it("does not authenticate or create demo cookies, even with configured credentials", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "test-placeholder");
    vi.stubEnv("CLERK_SECRET_KEY", "test-placeholder");
    vi.stubEnv("ALLOW_LOCAL_DEMO", "true");
    expect(authConfigured()).toBe(false);
    expect(demoEnabled()).toBe(false);
    expect(await actor(true)).toBeNull();
  });
  it("denies direct server progress mutations before identity/database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const response = await POST(
      new Request("https://demo.test/api/practice", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("stays in your browser");
  });
  it("blocks every database adapter before filesystem or network initialization", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    await expect(connection()).rejects.toThrow("Database access is disabled");
  });
});
