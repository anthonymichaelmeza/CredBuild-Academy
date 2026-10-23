import { SessionBuilder } from "@/components/session-builder";
import { actor, demoEnabled } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { demoQuestions } from "@/demo/questions";
import { pool } from "@/modules/practice/service";
import { currentQuestionVersions } from "@/modules/practice/engine";
import { performanceData } from "@/modules/performance/dto";
import {
  publishedPool,
  requirePublishedLearner,
} from "@/modules/practice/service";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Practice({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const bank = query.bank === "published" ? "published" : "demonstration";
  const certification =
    typeof query.certification === "string" &&
    /^[a-z0-9_-]{1,80}$/.test(query.certification)
      ? query.certification
      : "chst";
  const initialDomain =
    typeof query.domain === "string" &&
    (bank === "published"
      ? query.domain.length <= 80
      : ["1", "2", "3", "4"].includes(query.domain))
      ? query.domain
      : "all";
  const initialTopic =
    typeof query.topic === "string" ? query.topic.slice(0, 100) : "all";
  const count = Number(query.count);
  const initialCount = [1, 3, 5, 10, 25, 50, 100, 200].includes(count)
    ? count
    : 25;
  const focus = { initialDomain, initialTopic, initialCount };
  if (browserDemoEnabled() && bank === "published")
    return (
      <div className="page-wrap narrow">
        <h1>Published practice needs a connected account.</h1>
        <p>
          The credential-free demonstration includes only unreviewed public
          fixtures.
        </p>
        <Link className="button primary" href="/practice">
          Return to demonstration practice
        </Link>
      </div>
    );
  if (browserDemoEnabled())
    return (
      <SessionBuilder
        available
        browserOnly
        inventory={
          performanceData([], currentQuestionVersions(demoQuestions)).questions
        }
        {...focus}
      />
    );
  const who = await actor();
  let publishedAvailable = false;
  if (who) {
    try {
      requirePublishedLearner(who);
      publishedAvailable = true;
    } catch {}
  }
  const available =
    bank === "published" ? publishedAvailable : demoEnabled() || Boolean(who);
  const inventory = available
    ? currentQuestionVersions(
        bank === "published" ? await publishedPool() : await pool(),
      )
    : [];
  const certificationOptions = [
    ...new Set([
      certification,
      ...inventory
        .map((q) => q.certification)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];
  const selectedInventory =
    bank === "published"
      ? inventory.filter((q) => q.certification === certification)
      : inventory;
  return (
    <>
      <div className="page-wrap narrow" style={{ paddingBottom: 0 }}>
        <nav className="auth-actions" aria-label="Choose practice content">
          <Link className="button secondary" href="/practice">
            Demonstration bank
          </Link>
          <Link className="button secondary" href="/practice?bank=published">
            Published instructional bank
          </Link>
        </nav>
      </div>
      <SessionBuilder
        key={`${bank}:${certification}`}
        available={available}
        bank={bank}
        inventory={performanceData([], selectedInventory).questions}
        certification={certification}
        certificationOptions={certificationOptions}
        {...focus}
      />
    </>
  );
}
