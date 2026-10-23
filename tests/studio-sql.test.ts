import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// All sources, domains, objectives and review records in this file are fictional
// disposable database fixtures, never production seeds or reviewed instruction.
const local = new PGlite();
const source = {
  id: "s1",
  title: "Fictional source",
  url: "https://example.test/reference",
  edition: "Test edition",
  section: "Test section",
};
const questionBody = {
  type: "multiple_choice",
  stem: "A fictional test question?",
  choices: [
    { id: "a", text: "A", rationale: "Fixture correct answer" },
    { id: "b", text: "B", rationale: "Fixture distractor" },
  ],
  correctChoice: "a",
  explanation: "Fictional explanation",
  difficulty: "introductory",
  media: [],
  solutionSteps: [],
};
function draft(kind: "question" | "lesson" = "question") {
  return {
    kind,
    certificationId: "test-cert",
    blueprintRevisionId: "test-blueprint",
    domain: "test-domain",
    objectiveCode: "TEST-1",
    topic: "Test topic",
    subtopic: "Test subtopic",
    title: "Fictional test content",
    contentKind: "instructional",
    origin: "human_authored",
    sources: [source],
    body:
      kind === "question"
        ? questionBody
        : {
            summary: "Fictional summary",
            objectives: ["Fictional objective"],
            sections: [
              {
                id: "section",
                title: "Test section",
                paragraphs: ["Fictional content"],
                reflection: "Test reflection",
              },
            ],
            checks: [
              {
                id: "check",
                stem: "Fixture?",
                choices: [
                  { id: "a", text: "A" },
                  { id: "b", text: "B" },
                ],
                correctChoice: "a",
                explanation: "Fixture explanation",
              },
            ],
            readingMinutes: 1,
            questionIds: [],
            relatedLessonIds: [],
            prerequisites: [],
            media: [],
            transcript: "",
          },
  };
}
async function create(id: string, data = draft()) {
  await local.query(
    "INSERT INTO studio_content(id,kind,certification_id,owner_id) VALUES ($1,$2,'test-cert','author')",
    [id, data.kind],
  );
  await local.query(
    "INSERT INTO studio_revisions(id,content_id,revision,author_id,data) VALUES ($1,$2,1,'author',$3)",
    [`${id}:v1`, id, JSON.stringify(data)],
  );
  await local.query("INSERT INTO studio_workflow(revision_id) VALUES ($1)", [
    `${id}:v1`,
  ]);
}
async function submit(id: string) {
  await local.query(
    "UPDATE studio_workflow SET status='technical_review',row_version=row_version+1 WHERE revision_id=$1",
    [`${id}:v1`],
  );
}
async function review(
  id: string,
  reviewer = "reviewer",
  checks = [
    {
      sourceId: "s1",
      outcome: "supports",
      notes: "Fictional reviewed support",
    },
  ],
) {
  await local.query(
    "INSERT INTO studio_reviews(id,revision_id,reviewer_id,decision,findings,source_checks) VALUES ($1,$2,$3,'approved','Fictional review findings',$4)",
    [`${id}:review`, `${id}:v1`, reviewer, JSON.stringify(checks)],
  );
}
async function approve(id: string) {
  await submit(id);
  await review(id);
  await local.query(
    "UPDATE studio_workflow SET status='approved',row_version=row_version+1 WHERE revision_id=$1",
    [`${id}:v1`],
  );
}
async function insertQuestion(id: string, correctChoice = "a") {
  const q = {
    id,
    version: 1,
    domain: "test-domain",
    topic: "Test topic",
    ...questionBody,
    correctChoice,
    contentKind: "instructional",
    reviewStatus: "published",
    origin: "human_authored",
    reference: {
      title: source.title,
      url: source.url,
      locator: source.section,
      verifiedAt: new Date().toISOString(),
    },
  };
  await local.query(
    "INSERT INTO question_versions(id,question_id,version,certification_id,blueprint_revision_id,objective_code,domain,topic,difficulty,content_kind,origin,review_status,author_id,reviewer_id,reviewed_at,data) VALUES ($1,$2,1,'test-cert','test-blueprint','TEST-1','test-domain','Test topic','introductory','instructional','human_authored','approved','author','reviewer',now(),$3)",
    [`${id}:v1`, id, JSON.stringify(q)],
  );
  await local.query(
    "INSERT INTO source_reviews(id,question_version_id,reviewer_id,source_title,source_url,source_version,source_locator,outcome,notes,reviewed_at) SELECT $1,$2,'reviewer',$3,$4,$5,$6,'supports','Fictional support',reviewed_at FROM question_versions WHERE id=$2",
    [
      `${id}:source`,
      `${id}:v1`,
      source.title,
      source.url,
      source.edition,
      source.section,
    ],
  );
}
beforeAll(async () => {
  for (const file of [
    "0001_foundation.sql",
    "0002_learning.sql",
    "0003_learner_profiles.sql",
    "0004_content_studio.sql",
  ])
    await local.exec(await readFile(`src/db/migrations/${file}`, "utf8"));
  for (const id of ["author", "reviewer", "admin", "learner"])
    await local.query(
      "INSERT INTO users(id,identity_mode) VALUES ($1,'managed')",
      [id],
    );
  for (const [subject, role] of [
    ["author", "author"],
    ["author", "reviewer"],
    ["author", "administrator"],
    ["reviewer", "reviewer"],
    ["admin", "administrator"],
  ])
    await local.query(
      "INSERT INTO editorial_roles(subject_id,role,granted_by) VALUES ($1,$2,'fixture-operator')",
      [subject, role],
    );
  await local.query(
    "INSERT INTO certifications(id,name,kind) VALUES ('test-cert','Fictional test certification','credential_prep')",
  );
  await local.query(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES ('test-blueprint','test-cert','Test blueprint','https://example.test/blueprint','Fictional fixture',$1)",
    [JSON.stringify([{ code: "test-domain", title: "Fictional domain" }])],
  );
  await local.query(
    "INSERT INTO studio_blueprint_reviews(id,blueprint_revision_id,reviewer_id,source_url,edition,section,notes,objectives) VALUES ('test-proof','test-blueprint','admin','https://example.test/blueprint','Test edition','Test section','Fictional proof',$1)",
    [
      JSON.stringify([
        { code: "TEST-1", domain: "test-domain", title: "Fictional objective" },
      ]),
    ],
  );
  await local.query(
    "UPDATE blueprint_revisions SET verified_by='admin',verified_at=now() WHERE id='test-blueprint'",
  );
});
afterAll(async () => {
  await local.close();
});

describe("Content Studio SQL defense in depth", () => {
  it("rejects self-review even when the author has reviewer and administrator roles", async () => {
    await create("self");
    await submit("self");
    await expect(review("self", "author")).rejects.toThrow(
      "Authors cannot review",
    );
    await expect(review("self", "learner")).rejects.toThrow(
      "technical-review role",
    );
  });
  it("requires source evidence, exact objective mapping, and independent review before approval", async () => {
    await create("missing-source", { ...draft(), sources: [] });
    await submit("missing-source");
    await review("missing-source", "reviewer", []);
    await expect(
      local.query(
        "UPDATE studio_workflow SET status='approved',row_version=row_version+1 WHERE revision_id='missing-source:v1'",
      ),
    ).rejects.toThrow("source evidence");
    await create("wrong-objective", {
      ...draft(),
      objectiveCode: "UNREVIEWED",
    });
    await submit("wrong-objective");
    await review("wrong-objective");
    await expect(
      local.query(
        "UPDATE studio_workflow SET status='approved',row_version=row_version+1 WHERE revision_id='wrong-objective:v1'",
      ),
    ).rejects.toThrow("matching blueprint");
    await create("unreviewed");
    await expect(
      local.query(
        "UPDATE studio_workflow SET status='published',row_version=row_version+1 WHERE revision_id='unreviewed:v1'",
      ),
    ).rejects.toThrow("Invalid editorial transition");
  });
  it("publishes a matching reviewed question atomically and preserves retired snapshots", async () => {
    await create("published-q");
    await approve("published-q");
    await insertQuestion("published-q");
    await local.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO studio_publications(content_id,revision_id,published_by) VALUES ('published-q','published-q:v1','admin')",
      );
      await tx.query(
        "INSERT INTO published_questions(question_id,question_version_id,published_by) VALUES ('published-q','published-q:v1','admin')",
      );
      await tx.query(
        "UPDATE studio_workflow SET status='published',row_version=row_version+1 WHERE revision_id='published-q:v1'",
      );
    });
    expect(
      (
        await local.query(
          "SELECT * FROM published_questions WHERE question_id='published-q'",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      local.query(
        "UPDATE studio_workflow SET status='retired',row_version=row_version+1 WHERE revision_id='published-q:v1'",
      ),
    ).rejects.toThrow("Remove active publication");
    await local.transaction(async (tx) => {
      await tx.query(
        "DELETE FROM published_questions WHERE question_id='published-q'",
      );
      await tx.query(
        "DELETE FROM studio_publications WHERE content_id='published-q'",
      );
      await tx.query(
        "UPDATE studio_workflow SET status='retired',row_version=row_version+1 WHERE revision_id='published-q:v1'",
      );
    });
    expect(
      (
        await local.query(
          "SELECT * FROM question_versions WHERE id='published-q:v1'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("blocks publication snapshots that differ from reviewed answers and disallows bypassing Studio", async () => {
    await create("changed-key");
    await approve("changed-key");
    await insertQuestion("changed-key", "b");
    await expect(
      local.query(
        "INSERT INTO studio_publications(content_id,revision_id,published_by) VALUES ('changed-key','changed-key:v1','admin')",
      ),
    ).rejects.toThrow("match the independently reviewed");
    await expect(
      local.query(
        "INSERT INTO published_questions(question_id,question_version_id,published_by) VALUES ('changed-key','changed-key:v1','admin')",
      ),
    ).rejects.toThrow("matching authorized Studio");
  });
  it("publishes the exact reviewed lesson through both guarded pointers", async () => {
    const lesson = draft("lesson");
    await create("published-l", lesson);
    await approve("published-l");
    await local.query(
      "INSERT INTO lesson_versions(id,lesson_id,version,certification_id,blueprint_revision_id,domain,topic,subtopics,objective_codes,content_kind,review_status,data) VALUES ('published-l:v1','published-l',1,'test-cert','test-blueprint','test-domain','Test topic','[]','[\"TEST-1\"]','instructional','published',$1)",
      [
        JSON.stringify({
          ...lesson.body,
          id: "published-l",
          version: 1,
          title: lesson.title,
          certification: lesson.certificationId,
          domain: lesson.domain,
          topic: lesson.topic,
          contentKind: "instructional",
          reviewStatus: "published",
        }),
      ],
    );
    await local.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO studio_publications(content_id,revision_id,published_by) VALUES ('published-l','published-l:v1','admin')",
      );
      await tx.query(
        "INSERT INTO published_lessons(lesson_id,lesson_version_id,published_by) VALUES ('published-l','published-l:v1','admin')",
      );
      await tx.query(
        "UPDATE studio_workflow SET status='published',row_version=row_version+1 WHERE revision_id='published-l:v1'",
      );
    });
    expect(
      (
        await local.query(
          "SELECT * FROM published_lessons WHERE lesson_id='published-l'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("rejects duplicate source evidence IDs and objectives outside canonical domains", async () => {
    await create("duplicate-source", { ...draft(), sources: [source, source] });
    await submit("duplicate-source");
    await review("duplicate-source", "reviewer", [
      { sourceId: "s1", outcome: "supports", notes: "Fictional support" },
      { sourceId: "s2", outcome: "supports", notes: "Unrelated support" },
    ]);
    await expect(
      local.query(
        "UPDATE studio_workflow SET status='approved',row_version=row_version+1 WHERE revision_id='duplicate-source:v1'",
      ),
    ).rejects.toThrow("identifiers must be unique");
    await expect(
      local.query(
        "INSERT INTO studio_blueprint_reviews(id,blueprint_revision_id,reviewer_id,source_url,edition,section,notes,objectives) VALUES ('wrong-domain','test-blueprint','admin','https://example.test/blueprint','Test','Test','Test',$1)",
        [
          JSON.stringify([
            { code: "BAD", domain: "not-a-domain", title: "Invalid fixture" },
          ]),
        ],
      ),
    ).rejects.toThrow("canonical blueprint domains");
  });
  it("keeps revision, review, source and audit evidence append-only and verified blueprint immutable", async () => {
    await local.query(
      "INSERT INTO studio_audit(actor_id,event) VALUES ('admin','fixture-test')",
    );
    for (const query of [
      "UPDATE studio_revisions SET data='{}' WHERE id='self:v1'",
      "DELETE FROM studio_reviews WHERE revision_id='published-q:v1'",
      "UPDATE studio_audit SET actor_id='forged'",
      "DELETE FROM source_reviews WHERE question_version_id='published-q:v1'",
    ])
      await expect(local.query(query)).rejects.toThrow("append-only");
    await expect(
      local.query(
        "UPDATE blueprint_revisions SET data='[]' WHERE id='test-blueprint'",
      ),
    ).rejects.toThrow("Verified blueprint revisions are immutable");
  });
  it("makes import previews immutable and consumes valid batches at most once", async () => {
    await local.query(
      "INSERT INTO studio_import_batches(id,owner_id,payload,errors,expires_at) VALUES ('batch','author','[]','[]',now()+interval '10 minutes')",
    );
    await expect(
      local.query(
        "UPDATE studio_import_batches SET payload='[{}]' WHERE id='batch'",
      ),
    ).rejects.toThrow("preview is immutable");
    await local.query(
      "UPDATE studio_import_batches SET consumed_at=now() WHERE id='batch'",
    );
    await expect(
      local.query(
        "UPDATE studio_import_batches SET consumed_at=now() WHERE id='batch'",
      ),
    ).rejects.toThrow("consumed once");
  });
});
