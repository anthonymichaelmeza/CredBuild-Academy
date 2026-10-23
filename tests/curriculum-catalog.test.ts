import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  attachmentDocuments,
  CHST_BLUEPRINT_ID,
  CHST_BLUEPRINT_VERSION,
  CHST_REFERENCES_VERSION,
  chstBibliography,
  chstBlueprint,
  chstDomains,
  chstObjectives,
  getChstObjective,
} from "@/modules/curriculum/catalog";
import { allocateDomains } from "@/modules/catalog/blueprint";

describe("attached BCSP CHST5 curriculum transcription", () => {
  it("represents all 78 printed knowledge and skill statements with stable distinct identities", () => {
    expect(chstObjectives).toHaveLength(78);
    expect(new Set(chstObjectives.map((objective) => objective.id)).size).toBe(
      78,
    );
    const expected = {
      "1": { knowledge: 31, skill: 5, page: 1 },
      "2": { knowledge: 8, skill: 7, page: 2 },
      "3": { knowledge: 9, skill: 4, page: 2 },
      "4": { knowledge: 7, skill: 7, page: 3 },
    };
    for (const [domain, counts] of Object.entries(expected)) {
      for (const kind of ["knowledge", "skill"] as const) {
        const objectives = chstObjectives.filter(
          (objective) => objective.domain === domain && objective.kind === kind,
        );
        expect(objectives.map((objective) => objective.number)).toEqual(
          Array.from({ length: counts[kind] }, (_, position) => position + 1),
        );
        for (const objective of objectives) {
          expect(objective.documentPage).toBe(counts.page);
          expect(objective.id).toBe(
            `CHST5-2022.04.12-D${domain}-${kind === "knowledge" ? "K" : "S"}${String(objective.number).padStart(2, "0")}`,
          );
          expect(objective.certificationId).toBe("chst");
          expect(objective.blueprintRevisionId).toBe(CHST_BLUEPRINT_ID);
          expect(objective.blueprintVersion).toBe("2022.04.12");
          expect(objective.statement).not.toMatch(/\n|\s{2,}/);
        }
      }
    }
  });

  it("preserves the complete ordered wording extracted from the supplied three-page PDF", () => {
    const fingerprint = createHash("sha256")
      .update(
        chstObjectives
          .map((objective) =>
            [
              objective.domain,
              objective.kind,
              objective.number,
              objective.statement,
            ].join("|"),
          )
          .join("\n"),
      )
      .digest("hex");
    // Independently computed from pdftotext -layout output of the hashed attachment.
    expect(fingerprint).toBe(
      "5362e434935aa0b02d5e28adafb7ef342e39696cd3bc7879d35947bdc3f6a230",
    );
    expect(getChstObjective("CHST5-2022.04.12-D3-K05")?.statement).toBe(
      "Proper equipment use; importance of referencing manufacturers’ manuals and incorporating directives, recommendations, or options found therein",
    );
    expect(getChstObjective("CHST5-2022.04.12-D4-S06")?.statement).toBe(
      "Recognize and address total worker health",
    );
    expect(getChstObjective("CHST5-2022.04.12-D1-K32")).toBeUndefined();
  });

  it("preserves the four printed weights without claiming a current online blueprint or exam policy", () => {
    expect(chstDomains.map((domain) => domain.weight)).toEqual([
      3660, 1990, 2250, 2100,
    ]);
    expect(chstDomains.reduce((sum, domain) => sum + domain.weight, 0)).toBe(
      10000,
    );
    expect(
      allocateDomains(
        100,
        chstDomains.map((domain) => domain.weight),
      ),
    ).toEqual([37, 20, 22, 21]);
    expect(CHST_BLUEPRINT_VERSION).toBe("2022.04.12");
    expect(CHST_REFERENCES_VERSION).toBe("2021.06.09");
    expect(chstBlueprint.currentOfficialVersionConfirmed).toBe(false);
    expect(attachmentDocuments.blueprint.latestVersionStatus).toBe(
      "not_confirmed",
    );
    expect(attachmentDocuments.blueprint.sha256).toBe(
      "9d2b0beb74202507f44feba9996f71a5222d4edaf35fc0f44091145ba90bc3d7",
    );
    expect(attachmentDocuments.references.sha256).toBe(
      "f070a80bd1ea472ac1b0046bf35747c147dd3c6cb034358f9f5a579b00379d93",
    );
  });

  it("represents all 21 bibliography listings as unexamined underlying publications", () => {
    expect(chstBibliography).toHaveLength(21);
    expect(
      new Set(chstBibliography.map((reference) => reference.id)).size,
    ).toBe(21);
    expect(
      chstBibliography.filter((reference) => reference.documentPage === 1),
    ).toHaveLength(18);
    expect(
      chstBibliography.filter((reference) => reference.documentPage === 2),
    ).toHaveLength(3);
    for (const reference of chstBibliography) {
      expect(reference.bibliographyVersion).toBe("2021.06.09");
      expect(reference.accessStatus).toBe("bibliography_only");
      expect(reference.verifiedAt).toBeNull();
      expect(reference.listedCitation).toContain(
        `(${reference.publicationYear}).`,
      );
    }
    expect(
      chstBibliography.filter((reference) => reference.listedUrl !== null),
    ).toEqual([
      expect.objectContaining({
        title: "BCSP Code of Ethics",
        listedUrl:
          "http://www.bcsp.org/Portals/0/Assets/DocumentLibrary/BCSPcodeofethics.pdf",
        publisher: null,
        publicationPlace: null,
      }),
    ]);
    const fingerprint = createHash("sha256")
      .update(
        chstBibliography
          .map((reference) => `${reference.title}|${reference.listedCitation}`)
          .join("\n"),
      )
      .digest("hex");
    expect(fingerprint).toBe(
      "e0fc35d59be3db0a64942b813e3654056788561e42ebef42b263154dc4c67b09",
    );
  });
});
