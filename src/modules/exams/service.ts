import "server-only";
import { randomUUID } from "node:crypto";
import { connection, type DatabaseQuery } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { AccessError, type Actor } from "@/modules/identity/access";
import { requireStudioAccess, requireStudioRole } from "@/modules/studio/roles";
import { sessionView, selectionHistory } from "@/modules/practice/engine";
import { recordAnswer } from "@/modules/practice/lifecycle";
import type { Question, Session, SessionView } from "@/modules/practice/types";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import { chstPracticeExamPolicy } from "./policy";
import {
  buildFullLengthPracticeExam,
  eligibleFullLengthQuestions,
  fullLengthAvailability,
} from "./selection";
import {
  developmentExamFixturesEnabled,
  developmentExamDurationSeconds,
  developmentExamQuestions,
} from "./development-fixtures";
import type {
  ExamAdminSummary,
  ExamAvailability,
  ExamHistoryItem,
} from "./types";

let initialized: Promise<void> | undefined;
async function ready() {
  if (browserDemoEnabled())
    throw new AccessError(
      "Full-length examinations require connected storage; the browser demo cannot start one.",
      403,
    );
  await (initialized ??= seedDemo().catch((error) => {
    initialized = undefined;
    throw error;
  }));
  return connection();
}
function assertLearner(who: Actor) {
  if (
    browserDemoEnabled() ||
    (who.mode !== "managed" && !developmentExamFixturesEnabled())
  )
    throw new AccessError(
      "A full-length examination requires a connected account. Synthetic local engine fixtures are explicitly isolated.",
      403,
    );
}

/** Keyset paging has no bank-size ceiling. Locks keep chosen publication pointers valid until attempt creation commits. */
async function publishedCandidates(query: DatabaseQuery, lock = false) {
  const pool: Question[] = [];
  let after = "";
  while (true) {
    const rows = (
      await query(
        `SELECT p.question_id,v.data FROM published_questions p
      JOIN question_versions v ON v.id=p.question_version_id
      JOIN blueprint_revisions b ON b.id=v.blueprint_revision_id
      JOIN curriculum_objectives o ON o.id=v.objective_code AND o.blueprint_revision_id=b.id AND o.domain=v.domain
      JOIN studio_publications sp ON sp.content_id=p.question_id AND sp.revision_id=v.id
      JOIN studio_workflow w ON w.revision_id=v.id AND w.status='published'
      JOIN LATERAL (SELECT decision,reviewer_id FROM studio_source_verifications WHERE revision_id=v.id ORDER BY event_number DESC LIMIT 1) evidence ON evidence.decision='verified'
      WHERE v.certification_id='chst' AND v.content_kind='instructional' AND v.review_status='approved'
        AND b.id='chst5-2022.04.12' AND b.verified_at IS NOT NULL AND b.verified_by IS NOT NULL
        AND EXISTS(SELECT 1 FROM studio_reviews r WHERE r.revision_id=v.id AND r.decision='approved')
        AND EXISTS(SELECT 1 FROM editorial_roles role WHERE role.subject_id=evidence.reviewer_id AND role.role='reviewer')
        AND EXISTS(SELECT 1 FROM editorial_roles role WHERE role.subject_id=v.reviewer_id AND role.role='reviewer')
        AND p.question_id>$1 ORDER BY p.question_id LIMIT 500${lock ? " FOR SHARE OF p,v" : ""}`,
        [after],
      )
    ).rows;
    pool.push(...rows.map((row) => row.data as Question));
    if (rows.length < 500) break;
    after = String(rows.at(-1)!.question_id);
  }
  return pool;
}
function availabilityFrom(
  pool: Question[],
  signedIn: boolean,
  developmentFixture = false,
  bankConnected = true,
  productionPool?: Question[],
): ExamAvailability {
  const counts = fullLengthAvailability(pool, { developmentFixture });
  const production = fullLengthAvailability(
    productionPool || (developmentFixture ? [] : pool),
  );
  const blockers = counts.domains
    .filter((domain) => domain.shortfall > 0)
    .map(
      (domain) =>
        `Domain ${domain.code}: ${domain.eligible} eligible; ${domain.required} required; shortfall ${domain.shortfall}.`,
    );
  if (!signedIn)
    blockers.unshift(
      "Sign in to start or resume a server-saved full-length examination.",
    );
  if (!bankConnected)
    blockers.unshift(
      "The approved question bank has not been queried because no connected account is available.",
    );
  return {
    count: 200,
    durationSeconds: developmentFixture
      ? developmentExamDurationSeconds()
      : 14400,
    standardDurationSeconds: 14400,
    developmentSimulatorAvailable: developmentExamFixturesEnabled(),
    productionReady:
      bankConnected &&
      production.domains.every((domain) => domain.shortfall === 0),
    productionEligibleTotal: production.eligibleTotal,
    productionDomains: production.domains,
    blueprintVersion: chstPracticeExamPolicy.blueprintVersion,
    latestOfficialVersionConfirmed: false,
    durationBasis: "credbuilt_practice_configuration",
    domains: counts.domains,
    eligibleTotal: counts.eligibleTotal,
    canStart: signedIn && bankConnected && blockers.length === 0,
    blockers,
    developmentFixture,
    signedIn,
    bankConnected,
  };
}
export async function availability(
  who: Actor | null,
): Promise<ExamAvailability> {
  if (!who || browserDemoEnabled())
    return availabilityFrom([], false, false, false);
  assertLearner(who);
  const c = await ready();
  if (developmentExamFixturesEnabled())
    return availabilityFrom(
      developmentExamQuestions(),
      true,
      true,
      true,
      await publishedCandidates(c.query),
    );
  return availabilityFrom(await publishedCandidates(c.query), true);
}

/** Only explicit local QA can persist these draft demonstration fixtures. No publication or review records are created. */
export async function ensureDevelopmentFixtures() {
  if (!developmentExamFixturesEnabled())
    throw new AccessError(
      "Development examination fixtures are disabled.",
      403,
    );
  const c = await ready();
  const pool = developmentExamQuestions();
  await c.transaction(async (query) => {
    for (const question of pool)
      await query(
        `INSERT INTO question_versions(id,question_id,version,certification_id,blueprint_revision_id,objective_code,domain,topic,difficulty,content_kind,origin,review_status,author_id,data)
       VALUES($1,$2,1,'chst','chst5-2022.04.12',$3,$4,$5,$6,'demonstration','ai_generated','draft','development-only-engine-fixture',$7::jsonb) ON CONFLICT DO NOTHING`,
        [
          `${question.id}:v1`,
          question.id,
          question.blueprint!.objective,
          question.domain,
          question.topic,
          question.difficulty,
          JSON.stringify(question),
        ],
      );
  });
  return pool;
}
async function pinnedPool(query: DatabaseQuery, session: Session) {
  const pins = session.questionIds.map(
    (id) => `${id}:v${session.questionVersions![id]}`,
  );
  const rows = (
    await query("SELECT data FROM question_versions WHERE id=ANY($1::text[])", [
      pins,
    ])
  ).rows;
  const pool = rows.map((row) => row.data as Question);
  if (pool.length !== session.questionIds.length)
    throw new Error("An immutable exam question revision is unavailable.");
  return pool;
}
function newSession(
  owner: string,
  selected: Question[],
  developmentFixture: boolean,
  now: number,
  id: string = randomUUID(),
): Session {
  const duration = developmentFixture
    ? developmentExamDurationSeconds()
    : 14_400;
  return {
    id,
    ownerId: owner,
    questionIds: selected.map((question) => question.id),
    questionVersions: Object.fromEntries(
      selected.map((question) => [question.id, question.version]),
    ),
    answers: {},
    flags: [],
    mode: "exam",
    status: "in_progress",
    createdAt: new Date(now).toISOString(),
    submittedAt: null,
    revision: 0,
    deadlineAt: new Date(now + duration * 1000).toISOString(),
    bank: developmentFixture ? "demonstration" : "published",
    certification: "chst",
    examKind: "chst_full_length",
    currentQuestionIndex: 0,
    examPolicyVersion:
      developmentFixture && duration !== 14400
        ? `${chstPracticeExamPolicy.version}-development-${duration}s`
        : chstPracticeExamPolicy.version,
    durationSeconds: duration,
    developmentFixture,
  };
}
async function insertAttempt(
  query: DatabaseQuery,
  session: Session,
  requestKey: string,
) {
  await query(
    "INSERT INTO learning_sessions(id,owner_id,status,revision,data,created_at) VALUES($1,$2,$3,0,$4::jsonb,$5::timestamptz)",
    [
      session.id,
      session.ownerId,
      session.status,
      JSON.stringify(session),
      session.createdAt,
    ],
  );
  await query(
    "INSERT INTO full_exam_attempts(session_id,owner_id,request_key,policy_version,development_fixture) VALUES($1,$2,$3,$4,$5)",
    [
      session.id,
      session.ownerId,
      requestKey,
      session.examPolicyVersion!,
      Boolean(session.developmentFixture),
    ],
  );
}
function expired(session: Session, now: number) {
  return (
    session.status === "in_progress" && Date.parse(session.deadlineAt!) <= now
  );
}
function finalized(session: Session, now: number): Session {
  if (session.status === "submitted") return session;
  const isExpired = expired(session, now);
  return {
    ...session,
    status: "submitted",
    submissionReason: isExpired ? "expired" : "manual",
    submittedAt: isExpired ? session.deadlineAt! : new Date(now).toISOString(),
  };
}
async function save(query: DatabaseQuery, previous: Session, updated: Session) {
  if (previous === updated) return previous;
  const next = { ...updated, revision: previous.revision + 1 };
  await query(
    "UPDATE learning_sessions SET status=$1,revision=$2,data=$3::jsonb WHERE id=$4 AND owner_id=$5",
    [next.status, next.revision, JSON.stringify(next), next.id, next.ownerId],
  );
  return next;
}
async function locked(query: DatabaseQuery, id: string, owner: string) {
  const [row] = (
    await query(
      "SELECT s.data FROM learning_sessions s JOIN full_exam_attempts e ON e.session_id=s.id WHERE s.id=$1 AND s.owner_id=$2 FOR UPDATE OF s",
      [id, owner],
    )
  ).rows;
  if (!row) throw new AccessError("Examination not found.", 404);
  return row.data as Session;
}
function dto(
  session: Session,
  questions: Question[],
  now: number,
): SessionView {
  return {
    ...sessionView(session, questions),
    serverNow: new Date(now).toISOString(),
  };
}
export async function start(who: Actor, requestId: string = randomUUID()) {
  assertLearner(who);
  const c = await ready();
  const fixture = developmentExamFixturesEnabled();
  const fixtures = fixture ? await ensureDevelopmentFixtures() : null;
  return c.transaction(async (query) => {
    await query(
      "INSERT INTO users(id,identity_mode) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [who.id, who.mode],
    );
    await query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [who.id]);
    const [same] = (
      await query(
        "SELECT session_id FROM full_exam_attempts WHERE owner_id=$1 AND request_key=$2",
        [who.id, requestId],
      )
    ).rows;
    if (same) return String(same.session_id);
    const ongoing = (
      await query(
        "SELECT s.data FROM learning_sessions s JOIN full_exam_attempts e ON e.session_id=s.id WHERE s.owner_id=$1 AND s.status='in_progress' ORDER BY s.created_at DESC FOR UPDATE OF s",
        [who.id],
      )
    ).rows;
    for (const row of ongoing) {
      const session = row.data as Session;
      const now = Date.now();
      if (expired(session, now))
        await save(query, session, finalized(session, now));
      else return session.id;
    }
    const previous = (
      await query(
        "SELECT data FROM learning_sessions WHERE owner_id=$1 AND status='submitted' ORDER BY created_at DESC LIMIT 100",
        [who.id],
      )
    ).rows.map((row) => row.data as Session);
    const pool = fixtures || (await publishedCandidates(query, true));
    const status = availabilityFrom(pool, true, fixture);
    if (!status.canStart)
      throw new AccessError(
        `Full-length exam unavailable. ${status.blockers.join(" ")}`,
        422,
      );
    const selected = buildFullLengthPracticeExam(
      pool,
      selectionHistory(previous),
      { developmentFixture: fixture },
    );
    const session = newSession(who.id, selected, fixture, Date.now());
    await insertAttempt(query, session, requestId);
    return session.id;
  });
}
export async function seedExpiredDevelopmentAttempt(who: Actor, id: string) {
  if (!developmentExamFixturesEnabled())
    throw new AccessError(
      "Development examination fixtures are disabled.",
      403,
    );
  const pool = await ensureDevelopmentFixtures();
  const selected = buildFullLengthPracticeExam(pool, [], {
    developmentFixture: true,
  });
  const session = newSession(
    who.id,
    selected,
    true,
    Date.now() - 14_460_000,
    id,
  );
  await (
    await connection()
  ).transaction(async (query) => {
    await query(
      "INSERT INTO users(id,identity_mode) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [who.id, who.mode],
    );
    await insertAttempt(query, session, `expired-fixture:${id}`);
  });
  return id;
}
async function mutate(
  id: string,
  owner: string,
  action: (session: Session, pool: Question[], now: number) => Session,
) {
  const c = await ready();
  return c.transaction(async (query) => {
    const session = await locked(query, id, owner);
    const now = Date.now(); // Read after acquiring the row lock, never trust the browser's clock.
    const pool = await pinnedPool(query, session);
    const next =
      session.status === "submitted"
        ? session
        : expired(session, now)
          ? finalized(session, now)
          : action(session, pool, now);
    return dto(await save(query, session, next), pool, now);
  });
}
export async function view(id: string, owner: string) {
  return mutate(id, owner, (session) => session);
}
export async function answer(
  id: string,
  owner: string,
  input: { questionId: string; choiceId: string; responseMs: number },
) {
  return mutate(id, owner, (session, pool, now) => {
    if (!session.questionIds.includes(input.questionId))
      throw new AccessError("Question not in this examination.", 400);
    const previous = session.answers[input.questionId];
    if (previous?.choiceId === input.choiceId) return session; // Safe retry after a lost HTTP response.
    try {
      return recordAnswer(
        session,
        pool,
        { ...input, confidence: "medium" },
        now,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Choose an available answer."
      )
        throw new AccessError(error.message, 400);
      throw error;
    }
  });
}
export async function flag(
  id: string,
  owner: string,
  questionId: string,
  enabled: boolean,
) {
  return mutate(id, owner, (session) => {
    if (!session.questionIds.includes(questionId))
      throw new AccessError("Question not in this examination.", 400);
    if (session.flags.includes(questionId) === enabled) return session;
    return {
      ...session,
      flags: enabled
        ? [...session.flags, questionId]
        : session.flags.filter((id) => id !== questionId),
    };
  });
}
export async function navigate(id: string, owner: string, index: number) {
  return mutate(id, owner, (session) => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= session.questionIds.length
    )
      throw new AccessError("Choose an available examination question.", 400);
    return session.currentQuestionIndex === index
      ? session
      : { ...session, currentQuestionIndex: index };
  });
}
export async function submit(id: string, owner: string) {
  return mutate(id, owner, (session, _pool, now) => finalized(session, now));
}
function historyItem(session: Session, pool: Question[]): ExamHistoryItem {
  const submitted = session.status === "submitted";
  const correct = Object.values(session.answers).filter(
    (answer) => answer.correct,
  ).length;
  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    submittedAt: session.submittedAt,
    deadlineAt: session.deadlineAt!,
    ...(session.submissionReason
      ? { submissionReason: session.submissionReason }
      : {}),
    questionCount: session.questionIds.length,
    answered: Object.keys(session.answers).length,
    currentQuestionIndex: session.currentQuestionIndex || 0,
    developmentFixture: Boolean(session.developmentFixture),
    ...(submitted
      ? {
          correct,
          percentage: Math.round((correct / session.questionIds.length) * 100),
          domains: chstPracticeExamPolicy.domains.map((domain) => ({
            code: domain.code,
            total: pool.filter((question) => question.domain === domain.code)
              .length,
            correct: pool.filter(
              (question) =>
                question.domain === domain.code &&
                session.answers[question.id]?.correct,
            ).length,
          })),
        }
      : {}),
  };
}
export async function history(
  owner: string,
  beforeId?: string,
): Promise<ExamHistoryItem[]> {
  const c = await ready();
  const rows = (
    await c.query(
      `SELECT s.id FROM learning_sessions s JOIN full_exam_attempts e ON e.session_id=s.id WHERE s.owner_id=$1
    ${beforeId ? "AND (s.created_at,s.id)<(SELECT created_at,id FROM learning_sessions WHERE id=$2 AND owner_id=$1)" : ""}
    ORDER BY s.created_at DESC,s.id DESC LIMIT 50`,
      beforeId ? [owner, beforeId] : [owner],
    )
  ).rows;
  const result: ExamHistoryItem[] = [];
  for (const row of rows) {
    result.push(
      await c.transaction(async (query) => {
        const session = await locked(query, String(row.id), owner);
        const now = Date.now();
        const saved = expired(session, now)
          ? await save(query, session, finalized(session, now))
          : session;
        return historyItem(saved, await pinnedPool(query, saved));
      }),
    );
  }
  return result;
}

/** Create learning practice from missed concepts, preferring different eligible examples over exact repeats. */
export async function studyMissed(id: string, who: Actor) {
  assertLearner(who);
  const c = await ready();
  return c.transaction(async (query) => {
    const exam = await locked(query, id, who.id);
    if (exam.status !== "submitted")
      throw new AccessError(
        "Submit this examination before studying missed concepts.",
        409,
      );
    const original = await pinnedPool(query, exam);
    const missed = original.filter(
      (question) => !exam.answers[question.id]?.correct,
    );
    if (!missed.length)
      throw new AccessError(
        "There are no missed or unanswered concepts in this examination.",
        422,
      );
    const fixture =
      Boolean(exam.developmentFixture) && developmentExamFixturesEnabled();
    if (exam.developmentFixture && !fixture)
      throw new AccessError(
        "Development-only question fixtures are unavailable.",
        403,
      );
    const pool = fixture
      ? developmentExamQuestions()
      : await publishedCandidates(query, true);
    const eligible = eligibleFullLengthQuestions(pool, {
      developmentFixture: fixture,
    });
    const objectives = new Set(
      missed.map((question) => question.blueprint?.objective).filter(Boolean),
    );
    const topics = new Set(
      missed.map((question) => `${question.domain}:${question.topic}`),
    );
    const originalIds = new Set(exam.questionIds);
    const candidates = eligible
      .filter(
        (question) =>
          objectives.has(question.blueprint?.objective) ||
          topics.has(`${question.domain}:${question.topic}`),
      )
      .map((question) => ({ question, tie: Math.random() }))
      .sort(
        (a, b) =>
          Number(originalIds.has(a.question.id)) -
            Number(originalIds.has(b.question.id)) || a.tie - b.tie,
      )
      .slice(0, Math.min(25, eligible.length))
      .map(({ question }) => question);
    if (!candidates.length)
      throw new AccessError(
        "No currently eligible practice questions match the missed concepts. Review the saved explanations and objective pages instead.",
        422,
      );
    const now = new Date().toISOString();
    const session: Session = {
      id: randomUUID(),
      ownerId: who.id,
      questionIds: candidates.map((question) => question.id),
      questionVersions: Object.fromEntries(
        candidates.map((question) => [question.id, question.version]),
      ),
      answers: {},
      flags: [],
      mode: "learning",
      status: "in_progress",
      createdAt: now,
      submittedAt: null,
      revision: 0,
      bank: fixture ? "demonstration" : "published",
      certification: "chst",
      ...(fixture ? { developmentFixture: true } : {}),
    };
    await query(
      "INSERT INTO learning_sessions(id,owner_id,status,data) VALUES($1,$2,'in_progress',$3::jsonb)",
      [session.id, who.id, JSON.stringify(session)],
    );
    return session.id;
  });
}

export async function adminSummary(who: Actor): Promise<ExamAdminSummary> {
  const c = await ready();
  const access = await requireStudioAccess(who);
  requireStudioRole(access, ["administrator"]);
  const pool = await publishedCandidates(c.query);
  const status = availabilityFrom(pool, true, false);
  const all = (
    await c.query(`SELECT v.domain,
    count(*) FILTER(WHERE v.review_status='approved') AS approved,
    count(*) FILTER(WHERE p.question_id IS NOT NULL) AS published,
    count(*) FILTER(WHERE v.review_status='draft') AS draft,
    count(*) FILTER(WHERE v.review_status<>'approved') AS unreviewed
    FROM (SELECT DISTINCT ON(question_id) * FROM question_versions WHERE certification_id='chst' AND content_kind='instructional' ORDER BY question_id,version DESC) v
    LEFT JOIN published_questions p ON p.question_version_id=v.id GROUP BY v.domain`)
  ).rows;
  const publishedCounts = (
    await c.query(`SELECT v.domain,count(*) AS published
    FROM published_questions p JOIN question_versions v ON v.id=p.question_version_id
    WHERE v.certification_id='chst' AND v.content_kind='instructional' GROUP BY v.domain`)
  ).rows;
  const editorial = (
    await c.query(`SELECT r.data->>'domain' AS domain,count(*) FILTER(WHERE w.status='draft') AS draft,count(*) FILTER(WHERE w.status NOT IN('approved','published','retired')) AS unreviewed
    FROM studio_content c JOIN studio_revisions r ON r.content_id=c.id AND r.revision=c.current_revision JOIN studio_workflow w ON w.revision_id=r.id
    WHERE c.kind='question' AND c.certification_id='chst' GROUP BY r.data->>'domain'`)
  ).rows;
  const domainCounts = chstPracticeExamPolicy.domains.map((domain) => {
    const data = all.find((row) => row.domain === domain.code);
    const drafts = editorial.find((row) => row.domain === domain.code);
    return {
      code: domain.code,
      approved: Number(data?.approved || 0),
      published: Number(
        publishedCounts.find((row) => row.domain === domain.code)?.published ||
          0,
      ),
      draft: Number(drafts?.draft || 0),
      unreviewed: Number(drafts?.unreviewed || 0),
    };
  });
  const [attempts] = (
    await c.query(`SELECT count(*) FILTER(WHERE s.status='submitted') AS completed,count(*) FILTER(WHERE s.status='in_progress') AS ongoing
    FROM full_exam_attempts e JOIN learning_sessions s ON s.id=e.session_id WHERE e.development_fixture=false`)
  ).rows;
  const stats = (
    await c.query(`SELECT a.key AS question_id,(s.data->'questionVersions'->>a.key)::integer AS version,
    count(*) AS answered,count(*) FILTER(WHERE a.value->>'correct'='true') AS correct
    FROM learning_sessions s JOIN full_exam_attempts e ON e.session_id=s.id CROSS JOIN LATERAL jsonb_each(s.data->'answers') a
    WHERE s.status='submitted' AND e.development_fixture=false GROUP BY a.key,(s.data->'questionVersions'->>a.key)::integer ORDER BY count(*) DESC,a.key LIMIT 200`)
  ).rows;
  const questionStatistics: ExamAdminSummary["questionStatistics"] = [];
  for (const stat of stats) {
    const [question] = (
      await c.query(
        "SELECT domain,topic FROM question_versions WHERE question_id=$1 AND version=$2",
        [stat.question_id, stat.version],
      )
    ).rows;
    if (question)
      questionStatistics.push({
        id: String(stat.question_id),
        version: Number(stat.version),
        domain: String(question.domain),
        topic: String(question.topic),
        answered: Number(stat.answered),
        correct: Number(stat.correct),
        accuracy: Number(stat.answered)
          ? Math.round((Number(stat.correct) / Number(stat.answered)) * 100)
          : null,
      });
  }
  return {
    availability: status,
    domainCounts,
    approvedTotal: all.reduce((sum, row) => sum + Number(row.approved || 0), 0),
    publishedTotal: publishedCounts.reduce(
      (sum, row) => sum + Number(row.published || 0),
      0,
    ),
    draftCount: domainCounts.reduce((sum, domain) => sum + domain.draft, 0),
    unreviewedCount: domainCounts.reduce(
      (sum, domain) => sum + domain.unreviewed,
      0,
    ),
    invalidPublished: Math.max(
      0,
      publishedCounts.reduce(
        (sum, row) => sum + Number(row.published || 0),
        0,
      ) - status.eligibleTotal,
    ),
    completedAttempts: Number(attempts?.completed || 0),
    inProgressAttempts: Number(attempts?.ongoing || 0),
    questionStatistics,
  };
}
