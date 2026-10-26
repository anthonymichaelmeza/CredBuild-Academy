import "server-only";
import { randomUUID } from "node:crypto";
import type { Actor } from "@/modules/identity/access";
import { claimResearchJob, completeResearchJob } from "./service";
import {
  createResearchNetwork,
  governmentResearchSource,
  type ResearchNetworkOptions,
  type ResearchRetrieval,
} from "./network";
import { processDocument, type ProcessedDocument } from "./processing";
import type { ResearchClaim, ResearchCompletion } from "./model";

export type ResearchWorkerOptions = {
  maxJobs?: number;
  maxRunMs?: number;
  workerId?: string;
  network?: ResearchNetworkOptions;
  claim?: (
    who: Actor,
    workerId: string,
    lease: { leaseSeconds: number },
  ) => Promise<ResearchClaim | null>;
  complete?: (
    who: Actor,
    jobId: string,
    leaseToken: string,
    result: ResearchCompletion,
  ) => Promise<{ sourceId: string; status: string; childrenQueued: number }>;
  process?: (
    bytes: Uint8Array,
    options: { contentType?: string; url?: string },
  ) => Promise<ProcessedDocument>;
};
function completionFields(result: ResearchRetrieval): ResearchCompletion {
  return {
    attemptedAt: result.attemptedAt,
    resolvedUrl: result.resolvedUrl,
    httpStatus: result.httpStatus,
    proxyStatus: result.proxyStatus,
    error: result.error,
    ...(result.restricted ? { restricted: true } : {}),
    ...(result.paywalled ? { paywalled: true } : {}),
    ...(result.notModified ? { notModified: true } : {}),
    ...(result.retryAfterSeconds
      ? { retryAfterSeconds: Math.min(86400, result.retryAfterSeconds) }
      : {}),
    redirects: result.redirects,
    requests: result.requests,
    ...(result.etag !== undefined ? { etag: result.etag } : {}),
    ...(result.lastModified !== undefined
      ? { lastModified: result.lastModified }
      : {}),
  };
}
/** Explicit maintenance entry point, never started by a request or server boot.
 * Work is sequential; leases and all failures are written by the existing
 * administrator-only service. A successful parse is never a verification. */
export async function runResearchWorker(
  who: Actor,
  options: ResearchWorkerOptions = {},
) {
  const maxJobs = options.maxJobs ?? 10,
    maxRunMs = options.maxRunMs ?? 55_000;
  if (
    !Number.isInteger(maxJobs) ||
    maxJobs < 1 ||
    maxJobs > 50 ||
    !Number.isInteger(maxRunMs) ||
    maxRunMs < 1000 ||
    maxRunMs > 60_000
  )
    throw new Error(
      "Research worker permits 1–50 jobs and a 1–60 second scheduling window.",
    );
  const workerId = options.workerId || `research-${randomUUID()}`;
  const claim = options.claim || claimResearchJob,
    complete = options.complete || completeResearchJob,
    process = options.process || processDocument;
  const started = Date.now();
  const result = {
    claimed: 0,
    retrieved: 0,
    parsed: 0,
    blocked: 0,
    childrenQueued: 0,
    stopReason: "no_ready_jobs" as
      "no_ready_jobs" | "job_limit" | "time_budget",
    jobs: [] as { jobId: string; sourceId: string; status: string }[],
  };
  // Clients persist across jobs for policy caching and minimum request spacing.
  let client: ReturnType<typeof createResearchNetwork> | undefined,
    clientDelay = 0;
  for (let count = 0; count < maxJobs; count++) {
    if (Date.now() - started >= maxRunMs) {
      result.stopReason = "time_budget";
      break;
    }
    const job = await claim(who, workerId, { leaseSeconds: 180 });
    if (!job) break;
    result.claimed++;
    let completion: ResearchCompletion;
    if (job.depth > 2 || job.depth > job.policy.maxDepth) {
      completion = {
        attemptedAt: new Date().toISOString(),
        httpStatus: null,
        proxyStatus: null,
        error:
          "Configured crawl depth limit reached. No source request was made.",
        redirects: [],
        requests: [],
      };
    } else {
      const delay = Math.max(
        1000,
        job.policy.delayMs,
        options.network?.delayMs || 0,
      );
      if (count > 0)
        await (
          options.network?.sleep ||
          ((milliseconds: number) =>
            new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
        )(delay);
      if (!client || delay !== clientDelay) {
        client = createResearchNetwork({ ...options.network, delayMs: delay });
        clientDelay = delay;
      }
      const rightsPermit =
        job.license === "public_reproduction_permitted" ||
        job.license === "licensed_private";
      const retrieval = await client.retrieve(job.url, {
        etag: job.etag,
        lastModified: job.lastModified,
        allowCommercialPdfBodies: rightsPermit,
      });
      completion = completionFields(retrieval);
      if (retrieval.httpStatus === 200 && retrieval.bytes && !retrieval.error) {
        result.retrieved++;
        const pdf =
          new TextDecoder().decode(retrieval.bytes.slice(0, 5)) === "%PDF-" ||
          retrieval.contentType?.includes("pdf");
        if (
          pdf &&
          !governmentResearchSource(retrieval.resolvedUrl || job.url) &&
          !rightsPermit
        ) {
          completion.error =
            "PDF was retrieved but its text was not processed: commercial/unknown reproduction rights require an authorized manual import or explicit rights metadata. No raw document was retained.";
        } else if (
          retrieval.contentType &&
          !/html|pdf|text\//i.test(retrieval.contentType)
        ) {
          completion.error =
            "Retrieved document format is unsupported. No content was inferred; an authorized manual conversion is required.";
        } else {
          try {
            completion.document = await process(retrieval.bytes, {
              contentType: retrieval.contentType,
              url: retrieval.resolvedUrl || job.url,
            });
            if (
              completion.document.sections.some((section) =>
                Boolean(section.text.trim()),
              )
            )
              result.parsed++;
          } catch (error) {
            completion.error = `Source parsing failed; no successful content processing is claimed: ${error instanceof Error ? error.message : "unknown parser error"}`;
          }
        }
      }
    }
    const saved = await complete(who, job.jobId, job.leaseToken, completion);
    result.childrenQueued += saved.childrenQueued;
    if (!completion.document && !completion.notModified) result.blocked++;
    result.jobs.push({
      jobId: job.jobId,
      sourceId: job.sourceId,
      status: saved.status,
    });
    if (count === maxJobs - 1) result.stopReason = "job_limit";
  }
  return result;
}
