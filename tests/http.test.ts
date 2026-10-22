import { afterEach, describe, expect, it, vi } from "vitest";
import { readJson, privateJson, apiError } from "@/modules/http/requests";
import { limitWrites } from "@/modules/http/rate-limit";
import { AccessError, demoEnabled } from "@/modules/identity/auth";

afterEach(() => vi.unstubAllEnvs());
const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://academy.test/api/profile", {
    method: "POST",
    headers: {
      Origin: "https://academy.test",
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });
describe("private API request boundaries", () => {
  it("bounds actual UTF-8 bytes even if length is omitted or underreported", async () => {
    await expect(
      readJson(request(JSON.stringify({ value: "é".repeat(9000) }))),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readJson(
        request(JSON.stringify({ value: "a".repeat(17000) }), {
          "Content-Length": "2",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(await readJson(request('{"revision":0}'))).toEqual({ revision: 0 });
  });
  it("rejects other origins, wrong media types and malformed JSON", async () => {
    await expect(
      readJson(request("{}", { Origin: "https://other.test" })),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readJson(request("{}", { "Content-Type": "text/plain" })),
    ).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request("{"))).rejects.toBeInstanceOf(SyntaxError);
  });
  it("uses configured canonical origin behind a reverse proxy", async () => {
    vi.stubEnv("APP_ORIGIN", "https://canonical.test");
    await expect(readJson(request("{}"))).rejects.toMatchObject({
      status: 403,
    });
    expect(
      await readJson(request("{}", { Origin: "https://canonical.test" })),
    ).toEqual({});
  });
  it("makes both success and error responses private and noncacheable", () => {
    for (const response of [
      privateJson({ progress: true }),
      apiError(new AccessError()),
    ]) {
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Vary")).toContain("Cookie");
    }
  });
  it("limits repeated writes and allows retry after a window", () => {
    limitWrites("test:http:quota", 2, 1000);
    limitWrites("test:http:quota", 2, 1001);
    expect(() => limitWrites("test:http:quota", 2, 1002)).toThrow(
      "Too many saves",
    );
    expect(() => limitWrites("test:http:quota", 2, 61000)).not.toThrow();
  });
  it("never permits local demo identity on Vercel", () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    vi.stubEnv("ALLOW_LOCAL_DEMO", "true");
    vi.stubEnv("VERCEL", "1");
    expect(demoEnabled()).toBe(false);
  });
});
