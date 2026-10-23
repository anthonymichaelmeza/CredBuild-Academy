import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { migrateDatabase, type DatabaseQuery } from "@/db/client";
import { seedAttachedCurriculum } from "@/db/curriculum-seed";
import {
  attachmentDocuments,
  chstBlueprint,
  chstDomains,
  chstObjectives,
} from "@/modules/curriculum/catalog";

let local: PGlite | undefined;
afterEach(async () => {
  await local?.close();
  local = undefined;
});
async function isolatedDatabase() {
  local = new PGlite();
  await migrateDatabase(local, null);
  const query: DatabaseQuery = (sql, parameters = []) =>
    local!.query<Record<string, unknown>>(sql, parameters);
  await query(
    "INSERT INTO certifications(id,name,kind) VALUES('chst','Isolated seed integrity fixture','credential_prep')",
  );
  return query;
}
async function insertDocument(
  query: DatabaseQuery,
  data: unknown,
  sha256: string = attachmentDocuments.blueprint.sha256,
) {
  const document = attachmentDocuments.blueprint;
  await query(
    "INSERT INTO curriculum_documents(id,kind,version,filename,sha256,pages,provenance,data) VALUES($1,'blueprint',$2,$3,$4,$5,$6,$7::jsonb)",
    [
      document.id,
      document.version,
      document.fileName,
      sha256,
      document.pages,
      document.provenance,
      JSON.stringify(data),
    ],
  );
}

describe("immutable attached-curriculum seed drift detection", () => {
  it("rejects same-ID document metadata drift before creating any other curriculum records", async () => {
    const query = await isolatedDatabase();
    const poisoned = {
      ...attachmentDocuments.blueprint,
      version: "deliberately invalid fixture",
    };
    await insertDocument(query, poisoned);
    await expect(seedAttachedCurriculum(query)).rejects.toThrow(
      /document metadata changed|immutable/i,
    );
    expect(
      (
        await query("SELECT data FROM curriculum_documents WHERE id=$1", [
          attachmentDocuments.blueprint.id,
        ])
      ).rows[0].data,
    ).toEqual(poisoned);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM curriculum_documents"))
          .rows[0].total,
      ),
    ).toBe(1);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM curriculum_objectives"))
          .rows[0].total,
      ),
    ).toBe(0);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM reference_publications"))
          .rows[0].total,
      ),
    ).toBe(0);
  });

  it("rejects a poisoned normalized document hash even when its JSON metadata looks canonical", async () => {
    const query = await isolatedDatabase();
    const poisonedHash = "0".repeat(64);
    await insertDocument(query, attachmentDocuments.blueprint, poisonedHash);
    await expect(seedAttachedCurriculum(query)).rejects.toThrow(
      /document metadata changed|immutable/i,
    );
    expect(
      (
        await query("SELECT sha256 FROM curriculum_documents WHERE id=$1", [
          attachmentDocuments.blueprint.id,
        ])
      ).rows[0].sha256,
    ).toBe(poisonedHash);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM curriculum_documents"))
          .rows[0].total,
      ),
    ).toBe(1);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM curriculum_objectives"))
          .rows[0].total,
      ),
    ).toBe(0);
  });

  it("preserves an existing conflicting objective and reports the drift rather than silently accepting or replacing it", async () => {
    const query = await isolatedDatabase();
    await insertDocument(query, attachmentDocuments.blueprint);
    await query(
      "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES($1,'chst',$2,'https://example.test/negative-fixture','Isolated negative fixture',$3::jsonb)",
      [chstBlueprint.id, chstBlueprint.version, JSON.stringify(chstDomains)],
    );
    const objective = chstObjectives[0];
    await query(
      "INSERT INTO curriculum_objectives(id,certification_id,blueprint_revision_id,document_id,domain,kind,official_number,statement,page) VALUES($1,'chst',$2,$3,$4,$5,$6,'Deliberately wrong fixture wording',$7)",
      [
        objective.id,
        objective.blueprintRevisionId,
        attachmentDocuments.blueprint.id,
        objective.domain,
        objective.kind,
        objective.number,
        objective.documentPage,
      ],
    );
    await expect(seedAttachedCurriculum(query)).rejects.toThrow(
      /objective wording changed|immutable/i,
    );
    expect(
      (
        await query("SELECT statement FROM curriculum_objectives WHERE id=$1", [
          objective.id,
        ])
      ).rows[0].statement,
    ).toBe("Deliberately wrong fixture wording");
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM curriculum_objectives"))
          .rows[0].total,
      ),
    ).toBe(1);
    expect(
      Number(
        (await query("SELECT count(*) AS total FROM reference_publications"))
          .rows[0].total,
      ),
    ).toBe(0);
  });
});
