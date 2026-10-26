import { describe, expect, it } from "vitest";
import { processDocument } from "@/modules/research/processing";

const encode = (value: string) => new TextEncoder().encode(value);
function smallPdf() {
  const stream =
    "BT /F1 12 Tf 50 740 Td (Synthetic parser fixture only.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Length 0 >>\nstream\n\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let result = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(result));
    result += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const offset = Buffer.byteLength(result);
  result += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return encode(result);
}
describe("actual source processing evidence", () => {
  it("extracts main article headings and locators while excluding navigation, scripts and unrelated page furniture", async () => {
    const result = await processDocument(
      encode(
        '<html><head><title>Official test article</title></head><body><header>Header noise</header><nav>Navigation noise</nav><main><h1 id="general">General provisions</h1><p>Original main article text.</p><h2 id="specific">Specific provision</h2><p>Second meaningful paragraph <a href="/support.pdf">Supporting PDF</a>.</p><script>secretNoise()</script></main><footer>Footer noise</footer></body></html>',
      ),
      { format: "html", url: "https://www.osha.gov/example" },
    );
    expect(result.status).toBe("parsed");
    expect(result.title).toBe("Official test article");
    expect(result.sections.map((section) => section.locator)).toEqual([
      "#general",
      "#specific",
    ]);
    expect(
      result.sections.map((section) => section.text).join(" "),
    ).not.toMatch(/Noise|noise|secretNoise/);
    expect(result.links).toEqual([
      { url: "https://www.osha.gov/support.pdf", label: "Supporting PDF" },
    ]);
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("flags technical tables and figures instead of claiming that flattened text verifies their meaning", async () => {
    const result = await processDocument(
      encode(
        '<main><h1 id="table">Table test</h1><table><tr><td>Alpha</td><td>10</td></tr></table><figure><img alt="Diagram" src="chart.png"></figure></main>',
      ),
      { format: "html" },
    );
    expect(result.status).toBe("partially_parsed");
    expect(result.sections[0].needsManualReview).toBe(true);
    expect(result.sections[0].notes.join(" ")).toContain(
      "no missing meaning was inferred",
    );
  });
  it("extracts real PDF pages, preserving a blank page as unprocessed/manual rather than inventing text", async () => {
    const result = await processDocument(smallPdf(), { format: "pdf" });
    // The production web runtime may lack Poppler; that limitation is explicit.
    if (result.pageCount === null) {
      expect(result.warnings.join(" ")).toMatch(
        /requires locally installed|could not be reliably processed/,
      );
      return;
    }
    expect(result.pageCount).toBe(2);
    expect(result.pagesProcessed).toEqual([1]);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].locator).toBe("page-1");
    expect(result.sections[0].text).toContain("Synthetic parser fixture only.");
    expect(result.sections[1]).toMatchObject({
      page: 2,
      text: "",
      needsManualReview: true,
    });
    expect(result.status).toBe("partially_parsed");
    expect(result.sections[1].notes.join(" ")).toMatch(
      /Image-only, blank or unreadable/,
    );
  });
  it("records the complete PDF page count even when the configured processing cap leaves pages unread", async () => {
    const result = await processDocument(smallPdf(), {
      format: "pdf",
      maxPages: 1,
    });
    if (result.pageCount === null) return;
    expect(result.pageCount).toBe(2);
    expect(result.sections).toHaveLength(1);
    expect(result.warnings.join(" ")).toContain("1 pages remain unprocessed");
  });
  it("requires scope review for plain text or non-semantic HTML and rejects bad encodings/false PDF signatures", async () => {
    const plain = await processDocument(
      encode("Authorized source excerpt without pagination."),
      { format: "text" },
    );
    expect(plain.status).toBe("partially_parsed");
    expect(plain.sections[0].page).toBeNull();
    const fallback = await processDocument(
      encode("<body><p>Only article text.</p></body>"),
      { format: "html" },
    );
    expect(fallback.status).toBe("partially_parsed");
    expect(fallback.warnings.join(" ")).toMatch(/No semantic main/);
    await expect(
      processDocument(encode("Not a PDF"), { format: "pdf" }),
    ).rejects.toThrow(/no PDF signature/);
    await expect(
      processDocument(new Uint8Array([255]), { format: "text" }),
    ).rejects.toThrow();
    await expect(processDocument(new Uint8Array(5_000_001))).rejects.toThrow(
      /5,000,000/,
    );
  });
});
