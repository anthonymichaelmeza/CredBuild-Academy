import "server-only";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse, type DefaultTreeAdapterMap } from "parse5";

export const RESEARCH_MAX_DOCUMENT_BYTES = 5_000_000;
export type ProcessedSection = {
  locator: string;
  title: string;
  text: string;
  page: number | null;
  needsManualReview: boolean;
  notes: string[];
};
export type ProcessedDocument = {
  title: string;
  format: "html" | "pdf" | "text";
  status: "parsed" | "partially_parsed" | "requires_manual_review";
  pageCount: number | null;
  pagesProcessed: number[];
  sections: ProcessedSection[];
  warnings: string[];
  links: { url: string; label: string }[];
  contentHash: string;
};
type Node = DefaultTreeAdapterMap["node"];
const run = promisify(execFile);
const ignored = new Set([
  "script",
  "style",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "template",
]);
function children(node: Node): Node[] {
  return "childNodes" in node ? node.childNodes : [];
}
function tag(node: Node) {
  return "tagName" in node ? node.tagName.toLowerCase() : "";
}
function attr(node: Node, name: string) {
  return "attrs" in node
    ? node.attrs.find((a) => a.name === name)?.value || ""
    : "";
}
function isIgnored(node: Node) {
  return (
    ignored.has(tag(node)) ||
    ["navigation", "banner", "contentinfo", "complementary"].includes(
      attr(node, "role"),
    ) ||
    /(?:^|\s)(?:breadcrumb|navigation|menu|cookie-banner|site-header|site-footer)(?:\s|$)/i.test(
      attr(node, "class"),
    )
  );
}
function text(node: Node): string {
  if (isIgnored(node)) return "";
  if (node.nodeName === "#text") return "value" in node ? node.value : "";
  return children(node)
    .map(text)
    .join(
      ["p", "div", "section", "article", "li", "tr", "br"].includes(tag(node))
        ? "\n"
        : " ",
    );
}
function cleaned(value: string) {
  return value
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
function all(node: Node, predicate: (value: Node) => boolean): Node[] {
  return [
    ...(predicate(node) ? [node] : []),
    ...children(node).flatMap((child) => all(child, predicate)),
  ];
}
function htmlDocument(
  bytes: Uint8Array,
  url: string,
  hash: string,
): ProcessedDocument {
  const dom = parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const titleNode = all(dom, (node) => tag(node) === "title")[0];
  const candidates = all(
    dom,
    (node) =>
      ["main", "article"].includes(tag(node)) ||
      attr(node, "role") === "main" ||
      /^(?:main-content|maincontent|content-area|primary)$/i.test(
        attr(node, "id"),
      ),
  );
  const root =
    candidates.sort(
      (a, b) => cleaned(text(b)).length - cleaned(text(a)).length,
    )[0] ||
    all(dom, (node) => tag(node) === "body")[0] ||
    dom;
  const sections: ProcessedSection[] = [];
  const links: ProcessedDocument["links"] = [];
  let current: ProcessedSection = {
    locator: attr(root, "id") ? `#${attr(root, "id")}` : "section-1",
    title:
      cleaned(titleNode ? text(titleNode) : "").slice(0, 1000) ||
      "Source article",
    text: "",
    page: null,
    needsManualReview: false,
    notes: [],
  };
  const usedLocators = new Set<string>();
  const flush = () => {
    current.text = cleaned(current.text);
    current.title = current.title.slice(0, 1000);
    current.notes = [...new Set(current.notes)];
    if (current.text.length > 1_000_000) {
      current.text = current.text.slice(0, 1_000_000);
      current.needsManualReview = true;
      current.notes.push(
        "Section text exceeded the index cap; remaining text was not processed.",
      );
    }
    if (current.text || current.needsManualReview) {
      let locator = current.locator.slice(0, 950),
        suffix = 1;
      while (usedLocators.has(locator))
        locator = `${current.locator.slice(0, 900)}:occurrence-${++suffix}`;
      if (locator !== current.locator)
        current.notes.push(
          "Repeated/oversized source locator received a distinct index suffix; confirm the original section during citation review.",
        );
      current.locator = locator;
      usedLocators.add(locator);
      sections.push(current);
    }
  };
  const visit = (node: Node) => {
    if (isIgnored(node)) return;
    const name = tag(node);
    if (/^h[1-6]$/.test(name)) {
      flush();
      current = {
        locator: attr(node, "id")
          ? `#${attr(node, "id")}`
          : `section-${sections.length + 1}`,
        title: cleaned(text(node)) || "Untitled section",
        text: "",
        page: null,
        needsManualReview: false,
        notes: [],
      };
      return;
    }
    if (name === "a") {
      try {
        const resolved = new URL(attr(node, "href"), url);
        if (resolved.protocol === "https:")
          links.push({
            url: resolved.href,
            label: cleaned(text(node)).slice(0, 500),
          });
      } catch {
        /* Invalid links are not followed. */
      }
    }
    if (["table", "figure", "img", "math"].includes(name)) {
      current.needsManualReview = true;
      current.notes.push(
        `${name} requires visual or structured technical review; no missing meaning was inferred.`,
      );
    }
    if (node.nodeName === "#text") {
      if ("value" in node) current.text += ` ${node.value}`;
      return;
    }
    if (name === "br") current.text += "\n";
    for (const child of children(node)) visit(child);
    if (["p", "div", "section", "li", "tr"].includes(name))
      current.text += "\n";
  };
  visit(root);
  flush();
  const warnings: string[] = [];
  if (sections.length > 5000) {
    warnings.push(
      "HTML section cap reached; sections beyond the first 5,000 remain unprocessed.",
    );
    sections.splice(5000);
  }
  if (links.length > 5000)
    warnings.push(
      "Supporting link index capped at 5,000 links; additional links require a later scoped discovery run.",
    );
  if (!candidates.length)
    warnings.push(
      "No semantic main article container was found; navigation-excluded body text needs scope review.",
    );
  if (!sections.length)
    warnings.push(
      "No meaningful article text was extracted. A dynamic, scanned or restricted source may require manual processing.",
    );
  if (sections.some((s) => s.needsManualReview))
    warnings.push(
      "Tables, figures, images or equations require manual review; flattened text is not verified structured evidence.",
    );
  return {
    title:
      cleaned(titleNode ? text(titleNode) : "") ||
      sections[0]?.title ||
      "Untitled HTML source",
    format: "html",
    status: !sections.length
      ? "requires_manual_review"
      : warnings.length
        ? "partially_parsed"
        : "parsed",
    pageCount: null,
    pagesProcessed: [],
    sections,
    warnings,
    links: [...new Map(links.map((link) => [link.url, link])).values()].slice(
      0,
      5000,
    ),
    contentHash: hash,
  };
}
async function pdfDocument(
  bytes: Uint8Array,
  hash: string,
  maxPages: number,
): Promise<ProcessedDocument> {
  const directory = await mkdtemp(path.join(tmpdir(), "credbuilt-research-"));
  const filename = path.join(directory, "source.pdf");
  const result: ProcessedDocument = {
    title: "PDF source",
    format: "pdf",
    status: "requires_manual_review",
    pageCount: null,
    pagesProcessed: [],
    sections: [],
    warnings: [],
    links: [],
    contentHash: hash,
  };
  const deadline = Date.now() + 30_000;
  try {
    await writeFile(filename, bytes, { mode: 0o600 });
    const info = await run("pdfinfo", [filename], {
      timeout: 15_000,
      maxBuffer: 1_000_000,
      encoding: "utf8",
    });
    result.pageCount =
      Number(info.stdout.match(/^Pages:\s+(\d+)\s*$/m)?.[1] || 0) || null;
    result.title =
      info.stdout.match(/^Title:\s+(.+)$/m)?.[1].trim() || "PDF source";
    if (!result.pageCount)
      throw new Error("PDF page count could not be established.");
    if (/^Encrypted:\s+yes/im.test(info.stdout)) {
      result.warnings.push(
        "Encrypted or restricted PDF: no password, access control or copy protection bypass was attempted.",
      );
      return result;
    }
    const count = Math.min(result.pageCount, maxPages);
    if (result.pageCount > maxPages)
      result.warnings.push(
        `Processing capped at ${maxPages} pages; ${result.pageCount - maxPages} pages remain unprocessed.`,
      );
    for (let page = 1; page <= count; page++) {
      if (Date.now() >= deadline) {
        result.warnings.push(
          `Processing time budget reached before page ${page}; remaining pages require a resumed/manual extraction.`,
        );
        break;
      }
      try {
        const extracted = await run(
          "pdftotext",
          [
            "-layout",
            "-enc",
            "UTF-8",
            "-f",
            String(page),
            "-l",
            String(page),
            filename,
            "-",
          ],
          {
            timeout: Math.max(1, Math.min(15_000, deadline - Date.now())),
            maxBuffer: 2_000_000,
            encoding: "utf8",
          },
        );
        const completeText = extracted.stdout.replace(/\f/g, "").trim();
        const truncated = completeText.length > 1_000_000;
        const value = completeText.slice(0, 1_000_000);
        const potentialTable = /\S[ \t]{3,}\S/.test(value);
        const visual = /\b(?:table|figure|diagram|chart|equation)\s*\d*/i.test(
          value,
        );
        const notes: string[] = [
          "Extracted page text requires visual/layout examination before technical citation; vector figures and formulas were not interpreted.",
        ];
        if (truncated)
          notes.push(
            "Page text exceeded the index cap; this page is not counted as fully extracted.",
          );
        if (!value)
          notes.push(
            "Image-only, blank or unreadable page. No OCR or missing content inference was performed.",
          );
        if (potentialTable)
          notes.push(
            "Possible table or multi-column layout: extracted spacing is retained but cell relationships require manual review.",
          );
        if (visual)
          notes.push(
            "Possible figure, table or equation reference requires visual/manual interpretation.",
          );
        result.sections.push({
          locator: `page-${page}`,
          title: `Page ${page}`,
          text: value,
          page,
          needsManualReview: true,
          notes,
        });
        if (value && !truncated) result.pagesProcessed.push(page);
      } catch (error) {
        result.sections.push({
          locator: `page-${page}`,
          title: `Page ${page}`,
          text: "",
          page,
          needsManualReview: true,
          notes: [
            `Text extraction failed for this page: ${error instanceof Error ? error.message.split("\n")[0] : "unknown parser error"}`,
          ],
        });
      }
    }
    result.warnings.push(
      "PDF text extraction is not technical verification. Images, vector diagrams, formulas and table structure require manual visual examination before supporting a claim.",
    );
    result.status =
      result.pagesProcessed.length === 0
        ? "requires_manual_review"
        : result.pagesProcessed.length < result.pageCount ||
            result.sections.some((s) => s.needsManualReview)
          ? "partially_parsed"
          : "parsed";
    return result;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    result.warnings.push(
      code === "ENOENT"
        ? "PDF processing requires locally installed pdfinfo/pdftotext. This runtime lacks the tools; import extracted page text through the authorized manual workflow."
        : `PDF could not be reliably processed: ${error instanceof Error ? error.message.split("\n")[0] : "unknown parser error"}`,
    );
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export async function processDocument(
  bytes: Uint8Array,
  options: {
    format?: "html" | "pdf" | "text";
    url?: string;
    contentType?: string;
    maxPages?: number;
  } = {},
): Promise<ProcessedDocument> {
  if (!bytes.byteLength || bytes.byteLength > RESEARCH_MAX_DOCUMENT_BYTES)
    throw new Error("Source document must contain 1–5,000,000 bytes.");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const magic = new TextDecoder().decode(bytes.slice(0, 5));
  const format =
    options.format ||
    (magic === "%PDF-" || options.contentType?.includes("pdf")
      ? "pdf"
      : options.contentType?.includes("html") ||
          /^\s*<(?:!doctype|html)/i.test(
            new TextDecoder().decode(bytes.slice(0, 100)),
          )
        ? "html"
        : "text");
  if (format === "pdf") {
    if (magic !== "%PDF-")
      throw new Error(
        "The document claims to be a PDF but has no PDF signature.",
      );
    const maxPages = options.maxPages ?? 100;
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100)
      throw new Error("PDF processing page cap must be between 1 and 100.");
    return pdfDocument(bytes, hash, maxPages);
  }
  if (format === "html")
    return htmlDocument(bytes, options.url || "https://www.osha.gov/", hash);
  const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
  return {
    title: "Authorized text source",
    format: "text",
    status: value ? "partially_parsed" : "requires_manual_review",
    pageCount: null,
    pagesProcessed: [],
    sections: value
      ? Array.from(
          { length: Math.ceil(value.length / 500_000) },
          (_, index) => ({
            locator: `text-chunk-${index + 1}`,
            title: `Imported text chunk ${index + 1}`,
            text: value.slice(index * 500_000, (index + 1) * 500_000),
            page: null,
            needsManualReview: true,
            notes: [
              "Plain text chunks are index boundaries, not original source sections or page references; confirm the original document during citation review.",
            ],
          }),
        )
      : [],
    warnings: [
      "Imported text requires original-document scope and citation review; no page numbers were inferred.",
    ],
    links: [],
    contentHash: hash,
  };
}
