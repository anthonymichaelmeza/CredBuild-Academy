import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import { grantStudioRole } from "@/modules/studio/roles";
import { studioAction } from "@/modules/studio/service";
import { getPublishedLesson } from "@/modules/studio/publication";
import {
  lessonTemplate,
  questionTemplate,
  type ContentDraft,
  type StudioItem,
} from "@/modules/studio/model";
import * as practice from "@/modules/practice/service";
import {
  publishedLessonResource,
  readLearning,
  saveLesson,
} from "@/modules/learning/service";
import type { LessonAction } from "@/modules/learning/progress";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
delete process.env.DATABASE_URL;
delete process.env.ALLOW_LOCAL_STUDIO;
const author = { id: "delivery-author", mode: "managed" as const };
const reviewer = { id: "delivery-reviewer", mode: "managed" as const };
const admin = { id: "delivery-admin", mode: "managed" as const };
const learner = { id: "delivery-learner", mode: "managed" as const };
const other = { id: "delivery-other", mode: "managed" as const };
const certification = "qa-delivery";
const source = {
  id: "delivery-fixture-source",
  title: "Fictional isolated delivery test source",
  url: "https://example.test/delivery-fixture",
  edition: "QA only",
  section: "Synthetic fixture",
  classification: "professional_guidance" as const,
};
const common = {
  certificationId: certification,
  blueprintRevisionId: "qa-delivery-blueprint",
  domain: "qa-domain",
  objectiveCode: "QA-1",
  topic: "Fictional delivery concept",
  sources: [source],
};
const expected = (item: StudioItem) => ({
  id: item.id,
  revision: item.revision,
  rowVersion: item.rowVersion,
});
async function act(who: typeof author, input: unknown) {
  return (await studioAction(who, input)) as StudioItem;
}
async function verifyFixture(item: StudioItem) {
  const pending = await act(author, {
    action: "request_source_verification",
    ...expected(item),
  });
  return act(reviewer, {
    action: "verify_sources",
    ...expected(pending),
    decision: "verified",
    findings: "Fictional isolated source-examination fixture.",
    sourceChecks: item.data.sources.map((source) => ({
      sourceId: source.id,
      outcome: "supports",
      notes: "Synthetic source test only.",
      edition: source.edition,
      section: source.section,
      url: source.url,
    })),
    humanAttestation: true,
  });
}
async function publish(content: ContentDraft, previous?: StudioItem) {
  const draft = await act(
    author,
    previous
      ? { action: "revise", ...expected(previous), content }
      : { action: "create", content },
  );
  const verified = await verifyFixture(draft);
  const submitted = await act(author, {
    action: "submit",
    ...expected(verified),
  });
  const approved = await act(reviewer, {
    action: "review",
    ...expected(submitted),
    decision: "approved",
    findings: "Synthetic QA attestation; no actual technical verification.",
    sourceChecks: [
      {
        sourceId: source.id,
        outcome: "supports",
        notes: "Fictional fixture test only.",
      },
    ],
    humanAttestation: true,
  });
  return act(admin, { action: "publish", ...expected(approved) });
}
const config = {
  count: 1 as const,
  mode: "exam" as const,
  domain: "all",
  prioritizeMissed: false,
  durationSeconds: 600,
  bank: "published" as const,
  certification,
};
beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const who of [author, reviewer, admin, learner, other])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(author.id, "author", "qa-operator");
  await grantStudioRole(reviewer.id, "reviewer", "qa-operator");
  await grantStudioRole(admin.id, "administrator", "qa-operator");
  await query(
    "INSERT INTO certifications(id,name,kind) VALUES($1,'Fictional delivery fixture','credential_prep')",
    [certification],
  );
  await query(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES('qa-delivery-blueprint',$1,'QA','https://example.test/blueprint','Fictional test fixture',$2::jsonb)",
    [
      certification,
      JSON.stringify([{ code: "qa-domain", title: "Fictional domain" }]),
    ],
  );
  await studioAction(admin, {
    action: "verify_blueprint",
    blueprintRevisionId: "qa-delivery-blueprint",
    sourceUrl: "https://example.test/blueprint",
    edition: "QA only",
    section: "Synthetic fixture",
    notes:
      "This isolated test does not verify any official examination blueprint.",
    objectives: [
      { code: "QA-1", domain: "qa-domain", title: "Test immutable delivery" },
    ],
    humanAttestation: true,
  });
});
afterAll(async () => {
  await (await connection()).close();
});

describe("Studio publication feeds connected learner delivery", () => {
  it("excludes drafts and other certifications, protects exam keys and preserves pinned grading through replacement and retirement", async () => {
    const content: ContentDraft = {
      ...structuredClone(questionTemplate),
      ...common,
      title: "Fictional delivery question",
    };
    const draft = await act(author, { action: "create", content });
    await expect(practice.startSession(learner, config)).rejects.toThrow(
      "Only 0 eligible published",
    );
    const verified = await verifyFixture(draft);
    const submitted = await act(author, {
      action: "submit",
      ...expected(verified),
    });
    const approved = await act(reviewer, {
      action: "review",
      ...expected(submitted),
      decision: "approved",
      findings: "Synthetic QA review only.",
      sourceChecks: [
        {
          sourceId: source.id,
          outcome: "supports",
          notes: "Fictional QA only.",
        },
      ],
      humanAttestation: true,
    });
    const published = await act(admin, {
      action: "publish",
      ...expected(approved),
    });
    await expect(
      practice.startSession({ id: "local-demo", mode: "demo" }, config),
    ).rejects.toThrow("connected learner account");
    await expect(
      practice.startSession(learner, { ...config, certification: undefined }),
    ).rejects.toThrow("Only 0 eligible published");
    const id = await practice.startSession(learner, config);
    const active = await practice.view(id, learner.id);
    expect(active.questions[0]).toMatchObject({
      id: draft.id,
      version: 1,
      certification,
    });
    expect(active.questions[0]).not.toHaveProperty("correctChoice");
    expect(active.feedback).toEqual({});
    await expect(practice.view(id, other.id)).rejects.toThrow(
      "Session not found",
    );
    const answer = await practice.answer(id, learner.id, {
      questionId: draft.id,
      choiceId: "a",
      confidence: "high",
      responseMs: 1000,
    });
    expect(answer.answers[draft.id]).not.toHaveProperty("correct");
    expect(answer.feedback).toEqual({});
    if (content.kind !== "question") throw new Error();
    const revised = structuredClone(content);
    revised.body.correctChoice = "b";
    revised.body.explanation = "Different synthetic revision explanation";
    const replacement = await publish(revised, published);
    await act(admin, { action: "retire", ...expected(replacement) });
    await expect(practice.startSession(learner, config)).rejects.toThrow(
      "Only 0 eligible published",
    );
    const result = await practice.submit(id, learner.id);
    expect(result.questions[0].version).toBe(1);
    expect(result.answers[draft.id].correct).toBe(true);
    expect(result.feedback[draft.id].explanation).toBe(
      content.body.explanation,
    );
    expect(
      (await practice.historyQuestionPool())
        .filter((question) => question.id === draft.id)
        .map((question) => question.version),
    ).toEqual([1, 2]);
  });

  it("grades published lesson checks on the server, enforces versioned prerequisites, isolates owners and rejects stale writes", async () => {
    const prerequisiteContent: ContentDraft = {
      ...structuredClone(lessonTemplate),
      ...common,
      title: "Fictional prerequisite lesson",
    };
    const prerequisite = await publish(prerequisiteContent);
    const dependentContent = {
      ...structuredClone(lessonTemplate),
      ...common,
      title: "Fictional dependent lesson",
    };
    dependentContent.body.prerequisites = [prerequisite.id];
    const dependent = await publish(dependentContent);
    await expect(
      publishedLessonResource(learner, dependent.id),
    ).rejects.toThrow("prerequisite");
    const first = await publishedLessonResource(learner, prerequisite.id);
    expect(first.lesson.checks[0]).not.toHaveProperty("correctChoice");
    expect(first.feedback).toEqual({});
    async function write(action: LessonAction) {
      const snapshot = await readLearning(learner.id);
      return saveLesson(learner, {
        lessonId: prerequisite.id,
        lessonVersion: 1,
        revision: snapshot.revisions[prerequisite.id] || 0,
        action,
      });
    }
    await expect(write({ type: "complete" })).rejects.toThrow(
      "Visit every section",
    );
    const canonical = (await getPublishedLesson(prerequisite.id))!;
    for (const section of canonical.sections)
      await write({ type: "visit", sectionId: section.id });
    const check = canonical.checks[0];
    const wrong = check.choices.find(
      (choice) => choice.id !== check.correctChoice,
    )!.id;
    await write({ type: "check", checkId: check.id, choiceId: wrong });
    const checked = await publishedLessonResource(learner, prerequisite.id);
    expect(checked.progress?.checks[check.id].correct).toBe(false);
    expect(checked.feedback[check.id].correctChoice).toBe(check.correctChoice);
    await expect(
      saveLesson(learner, {
        lessonId: prerequisite.id,
        lessonVersion: 1,
        revision: 0,
        action: { type: "complete" },
      }),
    ).rejects.toThrow("another tab");
    for (const item of canonical.checks)
      await write({
        type: "check",
        checkId: item.id,
        choiceId: item.correctChoice,
      });
    await write({ type: "complete" });
    expect(
      (await publishedLessonResource(learner, dependent.id)).lesson.id,
    ).toBe(dependent.id);
    expect(
      (await publishedLessonResource(other, prerequisite.id)).progress,
    ).toBeNull();
    await expect(publishedLessonResource(other, dependent.id)).rejects.toThrow(
      "prerequisite",
    );
    await publish(
      {
        ...prerequisiteContent,
        title: "Fictional prerequisite lesson revised",
      },
      prerequisite,
    );
    await expect(
      publishedLessonResource(learner, dependent.id),
    ).rejects.toThrow("prerequisite");
    await expect(
      saveLesson(learner, {
        lessonId: prerequisite.id,
        lessonVersion: 1,
        revision: 0,
        action: { type: "complete" },
      }),
    ).rejects.toThrow("new revision");
  });
});
