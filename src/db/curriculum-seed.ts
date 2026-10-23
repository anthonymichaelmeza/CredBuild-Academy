import type { DatabaseQuery } from "./client";
import { isDeepStrictEqual } from "node:util";
import {
  attachmentDocuments,
  chstBlueprint,
  chstDomains,
  chstObjectives,
  chstBibliography,
} from "@/modules/curriculum/catalog";
export async function seedAttachedCurriculum(query: DatabaseQuery) {
  const documents = Object.values(attachmentDocuments);
  const storedDocuments = (
    await query("SELECT * FROM curriculum_documents WHERE id=ANY($1::text[])", [
      documents.map((document) => document.id),
    ])
  ).rows;
  if (
    storedDocuments.some((stored) => {
      const expected = documents.find((document) => document.id === stored.id);
      return (
        !expected ||
        !isDeepStrictEqual(stored.data, expected) ||
        stored.kind !==
          (expected.id === attachmentDocuments.blueprint.id
            ? "blueprint"
            : "bibliography") ||
        stored.version !== expected.version ||
        stored.filename !== expected.fileName ||
        stored.sha256 !== expected.sha256 ||
        Number(stored.pages) !== expected.pages ||
        stored.provenance !== expected.provenance ||
        stored.current_official_version_confirmed !== false
      );
    })
  )
    throw new Error(
      "Attached curriculum document metadata changed under an immutable ID. Register a new reviewed source version instead of overwriting it.",
    );
  const storedObjectives = (
    await query(
      "SELECT * FROM curriculum_objectives WHERE blueprint_revision_id=$1",
      [chstBlueprint.id],
    )
  ).rows;
  if (
    storedObjectives.some((stored) => {
      const expected = chstObjectives.find(
        (objective) => objective.id === stored.id,
      );
      return (
        !expected ||
        stored.certification_id !== expected.certificationId ||
        stored.document_id !== attachmentDocuments.blueprint.id ||
        stored.domain !== expected.domain ||
        stored.kind !== expected.kind ||
        Number(stored.official_number) !== expected.number ||
        stored.statement !== expected.statement ||
        Number(stored.page) !== expected.documentPage
      );
    })
  )
    throw new Error(
      "Attached curriculum objective wording changed under an immutable version. Add a reviewed correction/version instead of silently replacing it.",
    );
  const [storedBlueprint] = (
    await query(
      "SELECT certification_id,version_label,data FROM blueprint_revisions WHERE id=$1",
      [chstBlueprint.id],
    )
  ).rows;
  if (
    storedBlueprint &&
    (storedBlueprint.certification_id !== chstBlueprint.certificationId ||
      storedBlueprint.version_label !== chstBlueprint.version ||
      !isDeepStrictEqual(storedBlueprint.data, chstDomains))
  )
    throw new Error(
      "Attached blueprint identity, domain wording or weights changed under an immutable version. Register a reviewed correction instead of silently replacing it.",
    );
  for (const [key, document] of Object.entries(attachmentDocuments)) {
    await query(
      "INSERT INTO curriculum_documents(id,kind,version,filename,sha256,pages,provenance,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT DO NOTHING",
      [
        document.id,
        key === "blueprint" ? "blueprint" : "bibliography",
        document.version,
        document.fileName,
        document.sha256,
        document.pages,
        document.provenance,
        JSON.stringify(document),
      ],
    );
  }
  await query(
    "INSERT INTO blueprint_revisions(id,certification_id,version_label,source_url,provenance,data) VALUES($1,'chst',$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING",
    [
      chstBlueprint.id,
      chstBlueprint.version,
      "https://www.bcsp.org/construction-health-and-safety-technician-chst/",
      "Transcribed from the supplied BCSP PDF; attached version only. Independent human verification and latest official version confirmation remain pending.",
      JSON.stringify(chstDomains),
    ],
  );
  await query(
    "INSERT INTO curriculum_objectives(id,certification_id,blueprint_revision_id,document_id,domain,kind,official_number,statement,page) SELECT x->>'id',x->>'certificationId',x->>'blueprintRevisionId',$2,x->>'domain',x->>'kind',(x->>'number')::integer,x->>'statement',(x->>'documentPage')::integer FROM jsonb_array_elements($1::jsonb) x ON CONFLICT DO NOTHING",
    [JSON.stringify(chstObjectives), attachmentDocuments.blueprint.id],
  );
  await query(
    "INSERT INTO reference_publications(id,document_id,title,edition,classification,bibliography_listed,url,data) SELECT x->>'id',$2,x->>'title',coalesce(x->>'edition',''),'professional_guidance',true,CASE WHEN x->>'listedUrl' LIKE 'https://%' THEN x->>'listedUrl' ELSE NULL END,x FROM jsonb_array_elements($1::jsonb) x ON CONFLICT DO NOTHING",
    [JSON.stringify(chstBibliography), attachmentDocuments.references.id],
  );
}
