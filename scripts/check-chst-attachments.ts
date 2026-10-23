import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  attachmentDocuments,
  chstBibliography,
  chstObjectives,
} from "../src/modules/curriculum/catalog";

const [blueprintPath, referencesPath] = process.argv.slice(2);
if (!blueprintPath || !referencesPath)
  throw new Error(
    "Usage: npx tsx scripts/check-chst-attachments.ts /path/CHST-Blueprint.pdf /path/CHST-References.pdf (requires pdftotext)",
  );

for (const [filePath, document] of [
  [blueprintPath, attachmentDocuments.blueprint],
  [referencesPath, attachmentDocuments.references],
] as const) {
  const digest = createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
  if (digest !== document.sha256)
    throw new Error(
      `${document.fileName}: attachment bytes differ. Review the new document before changing canonical curriculum.`,
    );
}

const blueprintText = execFileSync(
  "pdftotext",
  ["-layout", blueprintPath, "-"],
  { encoding: "utf8" },
);
const extracted: {
  domain: string;
  kind: string;
  number: number;
  statement: string;
  documentPage: number;
}[] = [];
for (const [pageIndex, page] of blueprintText.split("\f").entries()) {
  let domain = "",
    kind = "";
  let current: (typeof extracted)[number] | undefined;
  for (const line of page.split("\n")) {
    const value = line.trim();
    if (value.startsWith("CHST5 Examination Blueprint")) break;
    const domainMatch = /^Domain (\d)$/.exec(value);
    if (domainMatch) {
      domain = domainMatch[1];
      kind = "";
      current = undefined;
      continue;
    }
    if (value === "Knowledge of:" || value === "Skill to:") {
      kind = value === "Knowledge of:" ? "knowledge" : "skill";
      current = undefined;
      continue;
    }
    if (!domain || !kind) continue;
    const numbered = /^(\d+)\.\s+(.+)$/.exec(value);
    if (numbered) {
      current = {
        domain,
        kind,
        number: Number(numbered[1]),
        statement: numbered[2],
        documentPage: pageIndex + 1,
      };
      extracted.push(current);
    } else if (value && current) current.statement += ` ${value}`;
  }
}
const canonical = chstObjectives.map(
  ({ domain, kind, number, statement, documentPage }) => ({
    domain,
    kind,
    number,
    statement,
    documentPage,
  }),
);
if (JSON.stringify(extracted) !== JSON.stringify(canonical))
  throw new Error(
    "The canonical objective wording, numbering, order, domain or page differs from the supplied blueprint.",
  );

const referencesText = execFileSync(
  "pdftotext",
  ["-layout", referencesPath, "-"],
  { encoding: "utf8" },
);
const listings: {
  title: string;
  listedCitation: string;
  documentPage: number;
}[] = [];
for (const [pageIndex, original] of referencesText.split("\f").entries()) {
  if (pageIndex > 1) continue;
  const page = (
    pageIndex === 0
      ? original.split("Title & Auxiliary Information")[1]
      : original
  ).split("CHST Blueprint References")[0];
  for (const block of page.trim().split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 1)
      listings.push({
        title: lines[0],
        listedCitation: lines.slice(1).join(" "),
        documentPage: pageIndex + 1,
      });
  }
}
const bibliography = chstBibliography.map(
  ({ title, listedCitation, documentPage }) => ({
    title,
    listedCitation,
    documentPage,
  }),
);
if (JSON.stringify(listings) !== JSON.stringify(bibliography))
  throw new Error(
    "The canonical bibliography differs from the supplied attachment.",
  );

console.log(
  "Attached-document transcription check passed: 78 objectives and 21 bibliography listings. This does not verify underlying technical sources, human approval, exam duration or the latest official version.",
);
