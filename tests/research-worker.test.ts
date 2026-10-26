import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/modules/identity/access";
import { runResearchWorker } from "@/modules/research/worker";
import type {
  ResearchClaim,
  ResearchCompletion,
} from "@/modules/research/model";
import type { ResearchNetworkOptions } from "@/modules/research/network";
const who = { id: "synthetic-worker-admin", mode: "managed" as const };
const job: ResearchClaim = {
  jobId: "job-1",
  sourceId: "source-1",
  url: "https://www.osha.gov/synthetic-worker-test",
  depth: 0,
  leaseToken: "lease-token",
  attemptNumber: 1,
  etag: null,
  lastModified: null,
  policy: { maxDepth: 2, maxDocuments: 50, delayMs: 1000 },
  license: "unknown",
  access: "public_link",
  classification: "regulatory_requirement",
};
function dependencies(
  claims: ResearchClaim[],
  transport: NonNullable<ResearchNetworkOptions["transport"]>,
) {
  let position = 0;
  const claim = vi.fn(async () => claims[position++] || null);
  const complete = vi.fn(
    async (
      _who: Actor,
      jobId: string,
      _token: string,
      result: ResearchCompletion,
    ) => ({
      sourceId: jobId,
      status:
        result.document?.status || (result.notModified ? "parsed" : "failed"),
      childrenQueued: 0,
    }),
  );
  return {
    claim,
    complete,
    network: {
      transport,
      resolve: async () => ["142.250.72.14"],
      sleep: async () => {},
    },
    workerId: "software-test-worker",
  };
}
describe("explicit bounded research worker", () => {
  it("passes actually parsed fixture sections to persistence without transferring bytes or creating verification", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response(
              "<main><h1 id='one'>Software test source</h1><p>Original synthetic text.</p></main>",
              { headers: { "content-type": "text/html" } },
            ),
    );
    const deps = dependencies([job], transport),
      result = await runResearchWorker(who, deps);
    expect(result).toMatchObject({
      claimed: 1,
      retrieved: 1,
      parsed: 1,
      blocked: 0,
      stopReason: "no_ready_jobs",
    });
    const input = deps.complete.mock.calls[0][3];
    expect(input.document?.sections[0]).toMatchObject({
      locator: "#one",
      text: "Original synthetic text.",
    });
    expect(input).not.toHaveProperty("bytes");
    expect(input).not.toHaveProperty("verified");
    expect(input.document?.status).toBe("parsed");
    expect(deps.claim.mock.calls).toHaveLength(2);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("preserves actual not-modified semantics without parsing new content or manufacturing sections", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response(null, { status: 304 }),
    );
    const deps = dependencies([{ ...job, etag: '"prior"' }], transport),
      process = vi.fn();
    const result = await runResearchWorker(who, { ...deps, process });
    expect(result).toMatchObject({ retrieved: 0, parsed: 0, blocked: 0 });
    expect(process).not.toHaveBeenCalled();
    expect(deps.complete.mock.calls[0][3]).toMatchObject({
      httpStatus: 304,
      notModified: true,
    });
    expect(deps.complete.mock.calls[0][3].document).toBeUndefined();
  });
  it("cancels commercial PDF bodies before download without lawful processing metadata", async () => {
    const cancelled = vi.fn();
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response(new ReadableStream({ cancel: cancelled }), {
              headers: { "content-type": "application/pdf" },
            }),
    );
    const deps = dependencies(
        [{ ...job, url: "https://www.wiley.com/unknown-book.pdf" }],
        transport,
      ),
      process = vi.fn();
    const result = await runResearchWorker(who, { ...deps, process });
    expect(result).toMatchObject({ retrieved: 0, parsed: 0, blocked: 1 });
    expect(process).not.toHaveBeenCalled();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(deps.complete.mock.calls[0][3]).toMatchObject({
      httpStatus: 200,
      restricted: true,
    });
    expect(deps.complete.mock.calls[0][3].error).toMatch(
      /body was not downloaded/,
    );
  });
  it("records parser errors truthfully and rejects oversized worker batches", async () => {
    const transport = vi.fn<NonNullable<ResearchNetworkOptions["transport"]>>(
      async (url) =>
        url.endsWith("robots.txt")
          ? new Response("", { status: 404 })
          : new Response("broken encoding", {
              headers: { "content-type": "text/plain" },
            }),
    );
    const deps = dependencies([job], transport),
      process = vi.fn(async () => {
        throw new Error("Synthetic parser failure");
      });
    const result = await runResearchWorker(who, { ...deps, process });
    expect(result).toMatchObject({ retrieved: 1, parsed: 0, blocked: 1 });
    expect(deps.complete.mock.calls[0][3].error).toContain(
      "no successful content processing is claimed",
    );
    await expect(
      runResearchWorker(who, { ...deps, maxJobs: 51 }),
    ).rejects.toThrow(/1–50 jobs/);
  });
});
