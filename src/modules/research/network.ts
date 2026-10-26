import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, ProxyAgent, fetch as undiciFetch } from "undici";
import { allowedResearchUrl, normalizeResearchUrl } from "./scope";
import { RESEARCH_MAX_DOCUMENT_BYTES } from "./processing";

export type ResearchRequestAudit = {
  url: string;
  purpose: "robots" | "document";
  attemptedAt: string;
  httpStatus: number | null;
  proxyStatus: number | null;
  resolvedUrl: string | null;
  error: string | null;
};
export type ResearchRetrieval = {
  attemptedAt: string;
  resolvedUrl: string | null;
  httpStatus: number | null;
  proxyStatus: number | null;
  error: string | null;
  restricted?: boolean;
  paywalled?: boolean;
  notModified?: boolean;
  retryAfterSeconds?: number;
  redirects: { from: string; to: string; status: number }[];
  requests: ResearchRequestAudit[];
  etag?: string | null;
  lastModified?: string | null;
  contentType?: string;
  bytes?: Uint8Array;
};
export type ResearchNetworkOptions = {
  transport?: (
    url: string,
    init: {
      headers: Record<string, string>;
      signal: AbortSignal;
      redirect: "manual";
    },
  ) => Promise<Response>;
  resolve?: (hostname: string) => Promise<string[]>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
  delayMs?: number;
};
export function publicResearchAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  return (
    isIP(address) === 6 &&
    /^[23][a-f0-9]{0,3}:/i.test(address) &&
    !/^2001:db8:/i.test(address)
  );
}
export function governmentResearchSource(url: string) {
  const hostname = new URL(url).hostname;
  return [
    "osha.gov",
    "www.osha.gov",
    "cdc.gov",
    "www.cdc.gov",
    "stacks.cdc.gov",
    "fema.gov",
    "www.fema.gov",
    "training.fema.gov",
    "epa.gov",
    "www.epa.gov",
  ].includes(hostname);
}
function safeError(error: unknown) {
  let value = error instanceof Error ? error.message : "Source request failed.";
  if (
    error &&
    typeof error === "object" &&
    "cause" in error &&
    error.cause instanceof Error
  )
    value += ` ${error.cause.message}`;
  return value
    .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/gi, "[redacted proxy credentials]@")
    .slice(0, 1500);
}
function proxyStatus(error: unknown) {
  const value = safeError(error);
  const code = value.match(
    /(?:proxy|tunnel|CONNECT)[^\n]{0,120}?\b(\d{3})\b/i,
  )?.[1];
  return code ? Number(code) : null;
}
async function boundedBody(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    await response.body?.cancel();
    throw new Error("Source document exceeds the configured byte limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Source document exceeds the configured byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function retryAfter(value: string | null, now: number): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds
    : (Date.parse(value) - now) / 1000;
  return Number.isFinite(delay) && delay > 0
    ? Math.max(1, Math.ceil(delay))
    : undefined;
}
type RobotGroup = {
  agents: string[];
  rules: { allow: boolean; path: string }[];
  delay: number;
};
function normalizedRobotPath(value: string) {
  return value.replace(/%([a-f0-9]{2})/gi, (original, hex: string) => {
    const char = String.fromCharCode(parseInt(hex, 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : original.toUpperCase();
  });
}
export function researchRobotsPolicy(body: string, url: string) {
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null,
    hasDirectives = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split("#", 1)[0].trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase(),
      value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || hasDirectives) {
        current = { agents: [], rules: [], delay: 0 };
        groups.push(current);
        hasDirectives = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (current && ["allow", "disallow"].includes(key)) {
      hasDirectives = true;
      if (value) current.rules.push({ allow: key === "allow", path: value });
    } else if (current && key === "crawl-delay") {
      hasDirectives = true;
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0)
        current.delay = Math.ceil(seconds * 1000);
    }
  }
  const specific = groups.filter((group) =>
    group.agents.some(
      (agent) => agent !== "*" && "credbuiltresearchbot".startsWith(agent),
    ),
  );
  const applicable = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes("*"));
  const parsed = new URL(url),
    target = normalizedRobotPath(`${parsed.pathname}${parsed.search}`);
  const matches = applicable
    .flatMap((group) => group.rules)
    .filter((rule) => {
      const ending = rule.path.endsWith("$");
      const raw = ending ? rule.path.slice(0, -1) : rule.path;
      const pattern =
        normalizedRobotPath(raw)
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*") + (ending ? "$" : "");
      try {
        return new RegExp(`^${pattern}`).test(target);
      } catch {
        return true;
      }
    })
    .sort(
      (a, b) =>
        b.path.replace(/\*/g, "").length - a.path.replace(/\*/g, "").length ||
        Number(b.allow) - Number(a.allow),
    );
  return {
    allowed: matches[0]?.allow ?? true,
    delayMs: Math.max(0, ...applicable.map((group) => group.delay)),
  };
}
/** One client is reused by a sequential worker. Proxy errors never trigger a
 * direct connection fallback; robots policies are checked before source bodies. */
export function createResearchNetwork(options: ResearchNetworkOptions = {}) {
  const now = options.now || Date.now;
  const sleep =
    options.sleep ||
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const resolve =
    options.resolve ||
    (async (hostname: string) =>
      (await lookup(hostname, { all: true })).map((row) => row.address));
  const delayMs = Math.max(1000, options.delayMs || 1000);
  const timeoutMs = Math.min(
    30_000,
    Math.max(1000, options.timeoutMs || 10_000),
  );
  const robotsCache = new Map<
    string,
    { body: string; retrievedAt: number; status: number }
  >();
  let previousRequestAt = 0;
  async function retrieve(
    url: string,
    conditions: {
      etag?: string | null;
      lastModified?: string | null;
      allowCommercialPdfBodies?: boolean;
    } = {},
  ): Promise<ResearchRetrieval> {
    const requestBudgetEnds = now() + 40_000;
    const result: ResearchRetrieval = {
      attemptedAt: new Date(now()).toISOString(),
      resolvedUrl: null,
      httpStatus: null,
      proxyStatus: null,
      error: null,
      redirects: [],
      requests: [],
    };
    async function requestOnce(
      target: string,
      purpose: "robots" | "document",
      headers: Record<string, string> = {},
    ) {
      if (!allowedResearchUrl(target))
        throw new Error(
          "Source request or redirect is outside the explicit publisher allowlist.",
        );
      if (now() >= requestBudgetEnds)
        throw new Error("Source request time budget exhausted; retry later.");
      let dnsTimer: ReturnType<typeof setTimeout> | undefined;
      const addresses = await Promise.race([
        resolve(new URL(target).hostname),
        new Promise<never>((_resolve, reject) => {
          dnsTimer = setTimeout(
            () => reject(new Error("Source DNS resolution timed out.")),
            Math.min(5_000, requestBudgetEnds - now()),
          );
        }),
      ]).finally(() => {
        if (dnsTimer) clearTimeout(dnsTimer);
      });
      if (
        !addresses.length ||
        addresses.some((address) => !publicResearchAddress(address))
      )
        throw new Error(
          "Source host did not resolve exclusively to public network addresses.",
        );
      const wait = Math.max(0, delayMs - (now() - previousRequestAt));
      if (wait) await sleep(wait);
      if (now() >= requestBudgetEnds)
        throw new Error("Source request time budget exhausted; retry later.");
      previousRequestAt = now();
      const audit: ResearchRequestAudit = {
        url: target,
        purpose,
        attemptedAt: new Date(now()).toISOString(),
        httpStatus: null,
        proxyStatus: null,
        resolvedUrl: null,
        error: null,
      };
      result.requests.push(audit);
      let dispatcher: Agent | ProxyAgent | undefined;
      try {
        const init = {
          headers: {
            "User-Agent":
              "CredBuiltResearchBot/1.0 (+https://credbuild-academy.vercel.app/)",
            Accept: "text/html,application/pdf,text/plain;q=0.9",
            ...headers,
          },
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(timeoutMs, requestBudgetEnds - now())),
          ),
          redirect: "manual" as const,
        };
        let response: Response;
        if (options.transport) response = await options.transport(target, init);
        else {
          const proxy =
            process.env.HTTPS_PROXY ||
            process.env.https_proxy ||
            process.env.HTTP_PROXY ||
            process.env.http_proxy;
          dispatcher = proxy
            ? new ProxyAgent(proxy)
            : new Agent({
                connect: {
                  timeout: timeoutMs,
                  autoSelectFamily: false,
                  lookup: (_hostname, _options, callback) =>
                    callback(null, addresses[0], isIP(addresses[0])),
                },
              });
          response = (await undiciFetch(target, {
            ...init,
            dispatcher,
          })) as unknown as Response;
        }
        audit.httpStatus = response.status;
        audit.resolvedUrl = target;
        const contentType = response.headers.get("content-type") || "";
        const pdf =
          /application\/pdf/i.test(contentType) ||
          new URL(target).pathname.toLowerCase().endsWith(".pdf");
        if (
          purpose === "document" &&
          response.status >= 200 &&
          response.status < 300 &&
          pdf &&
          !governmentResearchSource(target) &&
          !(
            conditions.allowCommercialPdfBodies &&
            new URL(target).hostname === new URL(url).hostname
          )
        ) {
          await response.body?.cancel();
          audit.error =
            "Commercial PDF body was not downloaded because explicit lawful processing rights are absent for this exact publisher host; permissions never transfer through cross-host redirects.";
          return {
            status: response.status,
            headers: response.headers,
            bytes: new Uint8Array(),
            bodyRestricted: true,
          };
        }
        const bytes = await boundedBody(
          response,
          purpose === "robots" ? 512_000 : RESEARCH_MAX_DOCUMENT_BYTES,
        );
        return { status: response.status, headers: response.headers, bytes };
      } catch (error) {
        audit.error = safeError(error);
        audit.proxyStatus = proxyStatus(error);
        throw Object.assign(new Error(audit.error), { researchAudit: audit });
      } finally {
        await dispatcher?.close();
      }
    }
    async function ensureRobots(target: string): Promise<boolean> {
      const origin = new URL(target).origin,
        robotsUrl = `${origin}/robots.txt`;
      let robots = robotsCache.get(origin);
      if (!robots || now() - robots.retrievedAt > 3_600_000) {
        const fetched = await requestWithRedirects(robotsUrl, "robots");
        if (!fetched)
          throw new Error("Crawl policy retrieval did not produce a response.");
        const body = new TextDecoder().decode(fetched.bytes);
        if (
          fetched.status === 200 &&
          (fetched.headers.get("content-type")?.includes("html") ||
            /^\s*<(?:!doctype|html)/i.test(body))
        ) {
          result.restricted = true;
          result.error =
            "robots.txt returned an HTML challenge or interstitial. Crawl permission could not be established; no source document was requested.";
          return false;
        }
        robots = { body, retrievedAt: now(), status: fetched.status };
        if (fetched.status === 200 || [404, 410].includes(fetched.status))
          robotsCache.set(origin, robots);
      }
      if (![200, 404, 410].includes(robots.status)) {
        result.error = `Crawl policy could not be confirmed: robots.txt returned HTTP ${robots.status}; the source document was not requested.`;
        if ([401, 403].includes(robots.status)) result.restricted = true;
        else result.retryAfterSeconds = 30;
        return false;
      }
      if (robots.status === 200) {
        const policy = researchRobotsPolicy(robots.body, target);
        if (!policy.allowed) {
          result.restricted = true;
          result.error =
            "Publisher robots policy disallows this source path; the document was not requested.";
          return false;
        }
        if (policy.delayMs > 10_000) {
          result.retryAfterSeconds = Math.ceil(policy.delayMs / 1000);
          result.error =
            "Publisher crawl delay exceeds this short worker execution window. Defer and review the crawl schedule; no source request was made.";
          return false;
        }
        const wait = Math.max(0, policy.delayMs - (now() - previousRequestAt));
        if (wait) await sleep(wait);
      }
      return true;
    }
    async function requestWithRedirects(
      initial: string,
      purpose: "robots" | "document",
      headers: Record<string, string> = {},
    ): Promise<{
      status: number;
      headers: Headers;
      bytes: Uint8Array;
      bodyRestricted?: boolean;
      url: string;
    } | null> {
      let target = normalizeResearchUrl(initial);
      for (let hop = 0; hop <= 5; hop++) {
        if (purpose === "document" && !(await ensureRobots(target)))
          return null;
        const response = await requestOnce(target, purpose, headers);
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location)
            throw new Error("Redirect response has no destination.");
          const next = new URL(location, target).href;
          if (!allowedResearchUrl(next))
            throw new Error(
              "Redirect destination is outside the explicit publisher allowlist.",
            );
          result.redirects.push({
            from: target,
            to: next,
            status: response.status,
          });
          target = normalizeResearchUrl(next);
          continue;
        }
        return { ...response, url: target };
      }
      throw new Error("Source redirect limit exceeded.");
    }
    try {
      const source = normalizeResearchUrl(url);
      const headers: Record<string, string> = {};
      if (conditions.etag) headers["If-None-Match"] = conditions.etag;
      if (conditions.lastModified)
        headers["If-Modified-Since"] = conditions.lastModified;
      const response = await requestWithRedirects(source, "document", headers);
      if (!response) return result;
      result.resolvedUrl = response.url;
      result.httpStatus = response.status;
      result.contentType = response.headers.get("content-type") || "";
      if (response.bodyRestricted) {
        result.restricted = true;
        result.error =
          "Commercial PDF body was not downloaded. Explicit lawful processing rights or an authorized manual import are required.";
        return result;
      }
      result.etag = response.headers.get("etag");
      result.lastModified = response.headers.get("last-modified");
      if (response.status === 304) {
        result.notModified = true;
        return result;
      }
      if ([401, 403].includes(response.status)) {
        result.restricted = true;
        result.error = `Publisher returned HTTP ${response.status}; access restrictions were not bypassed.`;
        return result;
      }
      if (response.status === 402) {
        result.paywalled = true;
        result.error =
          "Publisher requires paid access; no access bypass was attempted.";
        return result;
      }
      if (response.status < 200 || response.status >= 300) {
        result.error = `Publisher returned HTTP ${response.status}.`;
        result.retryAfterSeconds = retryAfter(
          response.headers.get("retry-after"),
          now(),
        );
        return result;
      }
      if (result.contentType.includes("html")) {
        const preview = new TextDecoder().decode(
          response.bytes.slice(0, 100_000),
        );
        if (
          /captcha|verify (?:that )?you are (?:a )?human|access denied|sign in to access/i.test(
            preview,
          )
        ) {
          result.restricted = true;
          result.error =
            "The retrieved page indicates an access challenge or sign-in requirement. No challenge bypass or content parsing was attempted.";
          return result;
        }
        if (/subscription required|purchase access|paywall/i.test(preview)) {
          result.paywalled = true;
          result.error =
            "The page indicates restricted subscription or purchase access; no paid content was processed.";
          return result;
        }
      }
      result.bytes = response.bytes;
      return result;
    } catch (error) {
      result.error = safeError(error);
      const audit =
        error && typeof error === "object" && "researchAudit" in error
          ? (error.researchAudit as ResearchRequestAudit)
          : undefined;
      result.proxyStatus = audit?.proxyStatus ?? proxyStatus(error);
      if (result.proxyStatus === 403 || result.proxyStatus === 407)
        result.restricted = true;
      else if (
        /timeout|timed out|time budget|abort|ECONNRESET|EAI_AGAIN|ENOTFOUND|fetch failed/i.test(
          result.error,
        )
      )
        result.retryAfterSeconds = 30;
      return result;
    }
  }
  return { retrieve };
}
