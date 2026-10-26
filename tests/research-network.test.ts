import { describe, expect, it, vi } from "vitest";
import {
  createResearchNetwork,
  publicResearchAddress,
  researchRobotsPolicy,
  type ResearchNetworkOptions,
} from "@/modules/research/network";
import {
  allowedResearchUrl,
  normalizeResearchUrl,
} from "@/modules/research/scope";
const source = "https://www.osha.gov/standard/example";
function network(transport: NonNullable<ResearchNetworkOptions["transport"]>) {
  let time = 1_700_000_000_000;
  const sleep = vi.fn(async (ms: number) => {
    time += ms;
  });
  return {
    client: createResearchNetwork({
      transport,
      resolve: async () => ["142.250.72.14"],
      sleep,
      now: () => time,
    }),
    sleep,
  };
}
describe("bounded, policy-respecting source retrieval", () => {
  it("restricts exact HTTPS hosts and rejects local/private addresses before any request", async () => {
    for (const url of [
      "http://www.osha.gov/",
      "https://www.osha.gov.evil.test/",
      "https://evil.osha.gov/",
      "https://user:secret@www.osha.gov/",
      "https://www.osha.gov:8443/",
      "https://127.0.0.1/",
    ])
      expect(allowedResearchUrl(url)).toBe(false);
    expect(normalizeResearchUrl("https://www.osha.gov/example#heading")).toBe(
      "https://www.osha.gov/example",
    );
    for (const address of [
      "127.0.0.1",
      "10.1.1.1",
      "100.64.0.1",
      "169.254.169.254",
      "192.168.1.2",
      "::1",
      "::ffff:127.0.0.1",
      "2001:db8::1",
    ])
      expect(publicResearchAddress(address)).toBe(false);
    const transport = vi.fn();
    const result = await createResearchNetwork({
      transport,
      resolve: async () => ["10.1.1.1"],
    }).retrieve(source);
    expect(transport).not.toHaveBeenCalled();
    expect(result.error).toContain("public network addresses");
    expect(result.httpStatus).toBeNull();
  });
  it("honors publisher robots rules, wildcard/allow precedence and encoded paths", async () => {
    expect(
      researchRobotsPolicy(
        "User-agent: *\nDisallow: /private\nAllow: /private/public",
        "https://www.osha.gov/private/public",
      ).allowed,
    ).toBe(true);
    expect(
      researchRobotsPolicy(
        "User-agent: *\nDisallow: /private",
        "https://www.osha.gov/%70rivate",
      ).allowed,
    ).toBe(false);
    expect(
      researchRobotsPolicy(
        "User-agent: *\nDisallow: /*.pdf$",
        "https://www.osha.gov/test.pdf",
      ).allowed,
    ).toBe(false);
    const transport = vi.fn(
      async () =>
        new Response("User-agent: *\nDisallow: /standard", {
          headers: { "content-type": "text/plain" },
        }),
    );
    const result = await network(transport).client.retrieve(source);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(result.restricted).toBe(true);
    expect(result.httpStatus).toBeNull();
    expect(result.requests[0].purpose).toBe("robots");
  });
  it("processes a real response body only after robots and preserves conditional headers and throttle", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url: string) =>
        url.endsWith("robots.txt")
          ? new Response("User-agent: *\nAllow: /", {
              headers: { "content-type": "text/plain" },
            })
          : new Response("<main><h1>Source</h1><p>Article.</p></main>", {
              headers: { "content-type": "text/html", etag: '"current"' },
            }),
    );
    const { client, sleep } = network(transport);
    const result = await client.retrieve(source, { etag: '"previous"' });
    expect(result.httpStatus).toBe(200);
    expect(result.bytes?.byteLength).toBeGreaterThan(0);
    expect(result.etag).toBe('"current"');
    expect(transport.mock.calls[1]?.[1]?.headers["If-None-Match"]).toBe(
      '"previous"',
    );
    expect(sleep).toHaveBeenCalled();
    expect(result.requests.map((request) => request.purpose)).toEqual([
      "robots",
      "document",
    ]);
  });
  it("checks destination robots on redirects and never follows off-scope destinations", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url: string) =>
        url.endsWith("robots.txt")
          ? new Response("User-agent: *\nAllow: /")
          : new Response(null, {
              status: 302,
              headers: { location: "https://attacker.test/secret" },
            }),
    );
    const result = await network(transport).client.retrieve(source);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(result.error).toContain("outside the explicit publisher allowlist");
    const cross = vi.fn(async (url: string) =>
      url === "https://www.cdc.gov/robots.txt"
        ? new Response("User-agent: *\nDisallow: /")
        : url.endsWith("robots.txt")
          ? new Response("User-agent: *\nAllow: /")
          : new Response(null, {
              status: 302,
              headers: { location: "https://www.cdc.gov/restricted" },
            }),
    );
    const blocked = await network(cross).client.retrieve(source);
    expect(cross).toHaveBeenCalledTimes(3);
    expect(blocked.restricted).toBe(true);
    expect(cross.mock.calls.map(([url]) => url)).not.toContain(
      "https://www.cdc.gov/restricted",
    );
  });
  it("records proxy denial separately from an origin HTTP status and does not bypass it", async () => {
    const transport = vi.fn(async () => {
      throw new Error("Proxy response (403) !== 200 when HTTP Tunneling");
    });
    const result = await network(transport).client.retrieve(source);
    expect(result.httpStatus).toBeNull();
    expect(result.proxyStatus).toBe(403);
    expect(result.restricted).toBe(true);
    expect(result.requests[0].proxyStatus).toBe(403);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("defers temporary failures with Retry-After, retains 304 semantics, and stops access challenges", async () => {
    for (const [status, body] of [
      [429, ""],
      [304, ""],
      [403, ""],
      [200, "<html>Verify you are human CAPTCHA</html>"],
    ] as const) {
      const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
        async (url: string) =>
          url.endsWith("robots.txt")
            ? new Response("", { status: 404 })
            : new Response(status === 304 ? null : body, {
                status,
                headers: { "content-type": "text/html", "retry-after": "120" },
              }),
      );
      const result = await network(transport).client.retrieve(source);
      if (status === 429) expect(result.retryAfterSeconds).toBe(120);
      if (status === 304) {
        expect(result.notModified).toBe(true);
        expect(result.bytes).toBeUndefined();
      }
      if (status === 403 || status === 200) {
        expect(result.restricted).toBe(true);
        expect(result.bytes).toBeUndefined();
      }
    }
  });
  it("does not interpret an HTML robots challenge as permission and caps oversized bodies", async () => {
    const challenge = vi.fn(
      async () =>
        new Response("<html>Challenge</html>", {
          headers: { "content-type": "text/html" },
        }),
    );
    const denied = await network(challenge).client.retrieve(source);
    expect(denied.restricted).toBe(true);
    expect(challenge).toHaveBeenCalledTimes(1);
    const large = vi.fn(async (url: string) =>
      url.endsWith("robots.txt")
        ? new Response("", { status: 404 })
        : new Response("tiny", { headers: { "content-length": "5000001" } }),
    );
    expect((await network(large).client.retrieve(source)).error).toContain(
      "byte limit",
    );
  });

  it("never transfers commercial PDF processing permission through a cross-publisher redirect", async () => {
    const cancelled = vi.fn();
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("User-agent: *\nAllow: /")
          : url === "https://www.wiley.com/licensed.pdf"
            ? new Response(null, {
                status: 302,
                headers: { location: "https://www.pearson.com/unlicensed.pdf" },
              })
            : new Response(new ReadableStream({ cancel: cancelled }), {
                headers: { "content-type": "application/pdf" },
              }),
    );
    const result = await network(transport).client.retrieve(
      "https://www.wiley.com/licensed.pdf",
      { allowCommercialPdfBodies: true },
    );
    expect(result.httpStatus).toBe(200);
    expect(result.resolvedUrl).toBe("https://www.pearson.com/unlicensed.pdf");
    expect(result.restricted).toBe(true);
    expect(result.bytes).toBeUndefined();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(result.redirects).toEqual([
      {
        from: "https://www.wiley.com/licensed.pdf",
        to: "https://www.pearson.com/unlicensed.pdf",
        status: 302,
      },
    ]);
    const authorized = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response("%PDF-synthetic-fixture", {
              headers: { "content-type": "application/pdf" },
            }),
    );
    const sameHost = await network(authorized).client.retrieve(
      "https://www.wiley.com/licensed.pdf",
      { allowCommercialPdfBodies: true },
    );
    expect(sameHost.bytes?.byteLength).toBeGreaterThan(0);
    expect(sameHost.restricted).toBeUndefined();
  });
  it("preserves an actual commercial PDF404 instead of substituting a licensing restriction", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response("No such document", {
              status: 404,
              headers: { "content-type": "application/pdf" },
            }),
    );
    const result = await network(transport).client.retrieve(
      "https://www.wiley.com/missing.pdf",
    );
    expect(result.httpStatus).toBe(404);
    expect(result.restricted).toBeUndefined();
    expect(result.error).toBe("Publisher returned HTTP 404.");
  });
});
