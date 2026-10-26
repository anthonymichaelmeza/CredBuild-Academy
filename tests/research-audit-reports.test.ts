import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  attachmentDocuments,
  chstObjectives,
  chstBibliography,
} from "@/modules/curriculum/catalog";
const root = new URL("../research/chst5/", import.meta.url);
const read = (file: string) => readFile(new URL(file, root), "utf8");
describe("recorded research evidence and transparent milestone reports", () => {
  it("retains every actual access attempt without turning proxy failures into publisher responses or downloads", async () => {
    const audit = JSON.parse(await read("CRAWL_AUDIT.json"));
    expect(audit.sources).toHaveLength(43);
    expect(
      new Set(audit.sources.map((row: { url: string }) => row.url)).size,
    ).toBe(43);
    expect(
      audit.sources.filter(
        (row: { group: string }) => row.group === "mandatory",
      ),
    ).toHaveLength(14);
    expect(audit.summary.successfullyAccessedUrls).toBe(0);
    expect(audit.summary.documentsRetrieved).toBe(0);
    expect(audit.summary.childLinksFollowed).toBe(0);
    for (const source of audit.sources) {
      expect(source.attempts).toHaveLength(1);
      expect(source.attempts[0].targetHttpStatus).toBeNull();
      expect(source.attempts[0].proxyConnectStatus).toBe(403);
      expect(source.attempts[0].retrieved).toBe(false);
      expect(source.contentVerificationStatus).toBe("unverified");
    }
  });
  it("distinguishes extracted local pages, complete official mapping and unavailable underlying books", async () => {
    const local = JSON.parse(await read("LOCAL_DOCUMENT_PROCESSING.json"));
    expect(local.documents).toHaveLength(2);
    expect(
      local.documents.flatMap((row: { sections: unknown[] }) => row.sections),
    ).toHaveLength(5);
    for (const document of Object.values(attachmentDocuments)) {
      const evidence = local.documents.find(
        (row: { fileName: string }) => row.fileName === document.fileName,
      );
      expect(evidence.contentHash).toBe(document.sha256);
      expect(evidence.pageCount).toBe(document.pages);
      expect(evidence.pagesProcessed).toHaveLength(document.pages);
      for (const page of evidence.sections) {
        expect(page.characters).toBeGreaterThan(0);
        expect(page.textSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(page).not.toHaveProperty("text");
      }
    }
    const master = await read("CHST5_MASTER_CURRICULUM.csv");
    expect(master.trim().split(/\r?\n/)).toHaveLength(79);
    for (const objective of chstObjectives) {
      expect(master).toContain(`"${objective.id}"`);
      expect(master).toContain(
        `"${objective.statement.replaceAll('"', '""')}"`,
      );
    }
    const acquisition = JSON.parse(
      await read("REFERENCE_ACQUISITION_AUDIT.json"),
    );
    expect(
      acquisition.publications.map((row: { id: string }) => row.id),
    ).toEqual(chstBibliography.map((row) => row.id));
    expect(
      acquisition.publications.every(
        (row: { contentsProcessed: boolean; currentEdition: string | null }) =>
          !row.contentsProcessed && row.currentEdition === null,
      ),
    ).toBe(true);
  });
  it("provides every requested report and does not present existing provisional drafts as new reference-supported material", async () => {
    for (const file of [
      "SOURCE_INVENTORY.csv",
      "CRAWL_AUDIT.json",
      "CHST5_MASTER_CURRICULUM.csv",
      "CHST5_COVERAGE_REPORT.md",
      "REFERENCE_ACQUISITION_REPORT.md",
      "QUESTION_BANK_PROGRESS.md",
      "RESEARCH_LIMITATIONS.md",
    ]) {
      expect((await read(file)).length).toBeGreaterThan(100);
    }
    const bootstrap = JSON.parse(await read("SOURCE_BOOTSTRAP.json"));
    const inventory = await read("SOURCE_INVENTORY.csv");
    expect(inventory.trim().split(/\r?\n/)).toHaveLength(bootstrap.length + 1);
    expect(
      bootstrap.filter(
        (row: { entityKind: string }) =>
          row.entityKind === "bibliographic_publication",
      ),
    ).toHaveLength(21);
    expect(await read("QUESTION_BANK_PROGRESS.md")).toContain(
      "0 additional unsupported questions",
    );
    expect(await read("RESEARCH_LIMITATIONS.md")).toContain(
      "0 publisher URLs successfully accessed",
    );
  });
});
