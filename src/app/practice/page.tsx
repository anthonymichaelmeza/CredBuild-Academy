import { SessionBuilder } from "@/components/session-builder";
import { actor, authConfigured, demoEnabled } from "@/modules/identity/auth";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { demoQuestions } from "@/demo/questions";
import { browserDraftQuestions } from "@/content/chst/draft-bank";
import { pool } from "@/modules/practice/service";
import { currentQuestionVersions } from "@/modules/practice/engine";
import { performanceData } from "@/modules/performance/dto";
import {
  publishedPool,
  requirePublishedLearner,
  history,
  bookmarkList,
} from "@/modules/practice/service";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Practice({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const productionAccounts =
    !browserDemoEnabled() &&
    process.env.NODE_ENV === "production" &&
    authConfigured();
  const bank =
    query.bank === "published"
      ? "published"
      : query.bank === "curriculum_drafts"
        ? "curriculum_drafts"
        : query.bank === "demonstration"
          ? "demonstration"
          : productionAccounts
            ? "published"
            : "demonstration";
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
  const initialObjective =
    typeof query.objective === "string" ? query.objective.slice(0, 150) : "all";
  const initialDifficulty =
    typeof query.difficulty === "string" &&
    ["introductory", "intermediate", "advanced"].includes(query.difficulty)
      ? query.difficulty
      : "all";
  const initialAnswered =
    typeof query.answered === "string" &&
    ["answered", "unanswered"].includes(query.answered)
      ? query.answered
      : "all";
  const initialReview =
    typeof query.review === "string" &&
    ["missed", "bookmarked"].includes(query.review)
      ? query.review
      : "all";
  const focus = {
    initialDomain,
    initialTopic,
    initialCount,
    initialObjective,
    initialDifficulty,
    initialAnswered,
    initialReview,
  };
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
      <>
        <div className="page-wrap narrow" style={{ paddingBottom: 0 }}>
          <nav
            className="auth-actions"
            aria-label="Choose demonstration content"
          >
            <Link className="button secondary" href="/practice">
              Original 12-question demo
            </Link>
            <Link
              className="button secondary"
              href="/practice?bank=curriculum_drafts"
            >
              CHST5 curriculum drafts
            </Link>
          </nav>
        </div>
        <SessionBuilder
          key={bank}
          available
          browserOnly
          bank={bank}
          inventory={
            performanceData(
              [],
              currentQuestionVersions(
                bank === "curriculum_drafts"
                  ? browserDraftQuestions
                  : demoQuestions,
              ),
            ).questions
          }
          {...focus}
        />
      </>
    );
  if (bank === "curriculum_drafts")
    return (
      <div className="page-wrap narrow">
        <h1>
          Curriculum drafts are available only in the browser demonstration.
        </h1>
        <p>
          Unreviewed questions cannot enter connected study sessions. Choose the
          reviewed instructional bank or the original demonstration.
        </p>
        <Link className="button primary" href="/practice">
          Return to practice
        </Link>
      </div>
    );
  if (productionAccounts && bank !== "published")
    return (
      <div className="page-wrap narrow">
        <h1>Connected practice uses reviewed instructional content.</h1>
        <p>Unreviewed demonstrations cannot start production study sessions.</p>
        <Link className="button primary" href="/practice?bank=published">
          Open published practice
        </Link>
      </div>
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
  const saved = who ? await history(who.id) : [];
  const marked = who ? await bookmarkList(who.id) : [];
  return (
    <>
      <div className="page-wrap narrow" style={{ paddingBottom: 0 }}>
        <nav className="auth-actions" aria-label="Choose practice content">
          {!productionAccounts && (
            <Link className="button secondary" href="/practice">
              Demonstration bank
            </Link>
          )}
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
        saved={performanceData(saved, []).saved}
        marked={marked}
        certification={certification}
        certificationOptions={certificationOptions}
        {...focus}
      />
    </>
  );
}
