import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { connection } from "@/db/client";
import { seedDemo } from "@/db/seed";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "@/modules/curriculum/catalog";
import { grantStudioRole, requireStudioAccess } from "@/modules/studio/roles";
import {
  questionTemplate,
  type ContentDraft,
  type StudioItem,
} from "@/modules/studio/model";
import { studioAction } from "@/modules/studio/service";

process.env.ALLOW_LOCAL_DEMO = "true";
process.env.LOCAL_DATABASE_PATH = ":memory:";
process.env.NEXT_PUBLIC_BROWSER_DEMO = "false";
delete process.env.DATABASE_URL;

const author = { id: "canonical-security-author", mode: "managed" as const };
const reviewer = {
  id: "canonical-security-reviewer",
  mode: "managed" as const,
};
const administrator = {
  id: "canonical-security-admin",
  mode: "managed" as const,
};
const learner = { id: "canonical-security-learner", mode: "managed" as const };
const exactMap = chstObjectives.map((objective) => ({
  code: objective.id,
  domain: objective.domain,
  title: objective.statement,
}));
const expected = (item: StudioItem) => ({
  id: item.id,
  revision: item.revision,
  rowVersion: item.rowVersion,
});
async function act(who: typeof author, input: unknown) {
  return (await studioAction(who, input)) as StudioItem;
}
function draft(overrides: Partial<ContentDraft> = {}): ContentDraft {
  return {
    ...questionTemplate,
    blueprintRevisionId: CHST_BLUEPRINT_ID,
    objectiveCode: chstObjectives[0].id,
    title: "Isolated software security fixture; not safety instruction",
    body: {
      ...questionTemplate.body,
      stem: "This synthetic item tests access boundaries; it is not published instructional material.",
    },
    ...overrides,
  } as ContentDraft;
}
beforeAll(async () => {
  await seedDemo();
  const query = (await connection()).query;
  for (const who of [author, reviewer, administrator, learner])
    await query("INSERT INTO users(id,identity_mode) VALUES($1,'managed')", [
      who.id,
    ]);
  await grantStudioRole(author.id, "author", "isolated-security-fixture");
  await grantStudioRole(author.id, "reviewer", "isolated-security-fixture");
  await grantStudioRole(reviewer.id, "reviewer", "isolated-security-fixture");
  await grantStudioRole(
    administrator.id,
    "administrator",
    "isolated-security-fixture",
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await (await connection()).close();
});

describe("canonical curriculum and source-examination security", () => {
  it("seeds the exact 78 statements idempotently without manufacturing source or technical approval", async () => {
    await seedDemo();
    const query = (await connection()).query;
    const rows = (
      await query(
        "SELECT id,domain,kind,official_number,statement,page FROM curriculum_objectives WHERE blueprint_revision_id=$1 ORDER BY id",
        [CHST_BLUEPRINT_ID],
      )
    ).rows;
    expect(rows).toEqual(
      chstObjectives
        .map((objective) => ({
          id: objective.id,
          domain: objective.domain,
          kind: objective.kind,
          official_number: objective.number,
          statement: objective.statement,
          page: objective.documentPage,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(
      Number(
        (
          await query(
            "SELECT count(*) AS total FROM reference_publications WHERE bibliography_listed=true",
          )
        ).rows[0].total,
      ),
    ).toBe(21);
    expect(
      (
        await query(
          "SELECT verified_at,verified_by FROM blueprint_revisions WHERE id=$1",
          [CHST_BLUEPRINT_ID],
        )
      ).rows[0],
    ).toEqual({ verified_at: null, verified_by: null });
    expect(
      (
        await query(
          "SELECT current_official_version_confirmed FROM curriculum_documents",
        )
      ).rows.every((row) => row.current_official_version_confirmed === false),
    ).toBe(true);
    for (const table of [
      "studio_source_verifications",
      "studio_reviews",
      "published_questions",
      "published_lessons",
    ])
      expect(
        Number(
          (await query(`SELECT count(*) AS total FROM ${table}`)).rows[0].total,
        ),
      ).toBe(0);
  });

  it("rejects invented, omitted, rewritten or cross-domain official objective maps through service and SQL", async () => {
    const variants = [
      [
        { ...exactMap[0], code: "INVENTED-OFFICIAL-OBJECTIVE" },
        ...exactMap.slice(1),
      ],
      [
        { ...exactMap[0], title: "Invented official wording" },
        ...exactMap.slice(1),
      ],
      [{ ...exactMap[0], domain: "2" }, ...exactMap.slice(1)],
      exactMap.slice(1),
    ];
    for (const objectives of variants) {
      await expect(
        studioAction(administrator, {
          action: "verify_blueprint",
          blueprintRevisionId: CHST_BLUEPRINT_ID,
          sourceUrl: "https://example.test/invalid-security-map",
          edition: "Isolated negative fixture",
          section: "Invalid map",
          notes:
            "This deliberately invalid fixture must be rejected; no actual source approval is claimed.",
          objectives,
          humanAttestation: true,
        }),
      ).rejects.toThrow(/canonical|objective|attached|mapping/i);
    }
    const query = (await connection()).query;
    await expect(
      query(
        "INSERT INTO studio_blueprint_reviews(id,blueprint_revision_id,reviewer_id,source_url,edition,section,notes,objectives) VALUES('invalid-canonical-security-map',$1,$2,'https://example.test/invalid','Negative fixture','Invalid','Must be rejected',$3::jsonb)",
        [CHST_BLUEPRINT_ID, administrator.id, JSON.stringify(variants[0])],
      ),
    ).rejects.toThrow(/canonical|objective|attached|mapping/i);
    expect(
      Number(
        (
          await query(
            "SELECT count(*) AS total FROM studio_blueprint_reviews WHERE blueprint_revision_id=$1",
            [CHST_BLUEPRINT_ID],
          )
        ).rows[0].total,
      ),
    ).toBe(0);
  });

  it("allows incomplete draft mapping but rejects nonblank invented and cross-domain objective IDs", async () => {
    const incomplete = await act(author, {
      action: "create",
      content: draft({ objectiveCode: "" }),
    });
    expect(incomplete.status).toBe("draft");
    for (const content of [
      draft({ objectiveCode: "INVENTED-OFFICIAL-OBJECTIVE" }),
      draft({ domain: "2", objectiveCode: chstObjectives[0].id }),
    ])
      await expect(act(author, { action: "create", content })).rejects.toThrow(
        /canonical|objective|mapping|domain/i,
      );
  });

  it("requires authorized independent examination of the exact URL, edition and locator before source advancement", async () => {
    const source = {
      id: "synthetic-source",
      title: "Fictional isolated security source",
      url: "https://example.test/security-fixture",
      edition: "Synthetic QA only",
      section: "Fixture A",
    };
    const created = await act(author, {
      action: "create",
      content: draft({ sources: [source] }),
    });
    const pending = await act(author, {
      action: "request_source_verification",
      ...expected(created),
    });
    const check = {
      sourceId: source.id,
      outcome: "supports",
      notes: "Synthetic security test only, not technical source validation.",
      url: source.url,
      edition: source.edition,
      section: source.section,
    };
    const action = {
      action: "verify_sources",
      ...expected(pending),
      decision: "verified",
      findings: "This isolated fixture tests rejection paths only.",
      sourceChecks: [check],
      humanAttestation: true,
    };
    await expect(act(author, action)).rejects.toThrow(
      /own content|independent|contributor/i,
    );
    await expect(act(learner, action)).rejects.toThrow(/editorial role/i);
    for (const wrong of [
      { ...check, url: "https://example.test/different" },
      { ...check, edition: "Different edition" },
      { ...check, section: "Unexamined section" },
    ])
      await expect(
        act(reviewer, { ...action, sourceChecks: [wrong] }),
      ).rejects.toThrow(/exact|cited|edition|locator|section/i);
    const query = (await connection()).query;
    await expect(
      query(
        "UPDATE studio_workflow SET status='source_verified',row_version=row_version+1 WHERE revision_id=$1",
        [pending.revisionId],
      ),
    ).rejects.toThrow(/source verification/i);
    expect(
      Number(
        (
          await query(
            "SELECT count(*) AS total FROM studio_source_verifications WHERE revision_id=$1",
            [pending.revisionId],
          )
        ).rows[0].total,
      ),
    ).toBe(0);
  });

  it("keeps attached objectives immutable and rejects browser-demo editorial access before querying roles", async () => {
    const connectionValue = await connection();
    await expect(
      connectionValue.query(
        "UPDATE curriculum_objectives SET statement='Altered official wording' WHERE id=$1",
        [chstObjectives[0].id],
      ),
    ).rejects.toThrow(/append-only/i);
    const query = vi.spyOn(connectionValue, "query");
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    await expect(requireStudioAccess(administrator)).rejects.toThrow(
      /Browser demonstration|connected/i,
    );
    expect(query).not.toHaveBeenCalled();
  });
});
