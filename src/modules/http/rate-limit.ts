import "server-only";
import { AccessError } from "@/modules/identity/auth";

// A bounded per-process guard. A shared gateway limit is still required for
// production across serverless instances; this is not a distributed quota.
const buckets = new Map<string, { count: number; resetsAt: number }>();
export function limitWrites(key: string, max = 120, now = Date.now()) {
  for (const [id, bucket] of buckets)
    if (bucket.resetsAt <= now) buckets.delete(id);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= 10_000)
      throw new AccessError("Service is busy. Please retry in a minute.", 429);
    bucket = { count: 0, resetsAt: now + 60_000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > max)
    throw new AccessError(
      "Too many saves. Please wait a minute and retry.",
      429,
    );
}
