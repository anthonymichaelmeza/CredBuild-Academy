// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  within,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ResearchStudio } from "@/components/research-studio";
import type { ResearchSnapshot } from "@/modules/research/model";
const initial: ResearchSnapshot = {
  access: {
    actorId: "qa-admin",
    roles: ["administrator"],
    localDevelopment: true,
  },
  sources: [
    {
      id: "qa-source",
      parentId: null,
      originalUrl: "https://www.osha.gov/construction",
      resolvedUrl: null,
      publisher: "Synthetic QA author",
      title: "Private research source",
      publicationDate: null,
      format: null,
      access: "user_supplied",
      license: "licensed_private",
      classification: "credbuilt_instruction",
      licensedIdentifier: "qa-original",
      rightsNotes: "Original synthetic software QA only",
      status: "discovered",
      parseStatus: "not_parsed",
      pageCount: null,
      pagesProcessed: [],
      sectionsProcessed: 0,
      documentHash: null,
      error: null,
      updatedAt: "2026-10-26T00:00:00Z",
      objectiveIds: [],
    },
  ],
  sections: [],
  jobs: [],
  attempts: [],
  pagination: { page: 1, pages: 1, total: 1 },
  metrics: {
    sources: 1,
    parsed: 0,
    verified: 0,
    restricted: 0,
    failed: 0,
    sections: 0,
    pendingJobs: 0,
  },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("clears private research content when administrator permission is revoked", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: false,
    status: 403,
    json: async () => ({ error: "Administrator access revoked" }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(<ResearchStudio initial={initial} />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Queue source retrieval" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("heading", {
        name: "Research access changed.",
      }),
    ).toBeVisible(),
  );
  expect(
    screen.queryByText("Private research source", { exact: true }),
  ).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("requires rights attestation and sends manual content only to the protected parsing endpoint", async () => {
  const html =
    "<main><h1>Private original QA</h1><p>No construction instruction.</p></main>";
  const parsed: ResearchSnapshot = {
    ...initial,
    sources: [
      {
        ...initial.sources[0],
        format: "html",
        status: "parsed",
        parseStatus: "parsed",
        sectionsProcessed: 1,
        documentHash: "a".repeat(64),
      },
    ],
    sections: [
      {
        id: "qa-section",
        sourceId: "qa-source",
        locator: "#private",
        title: "Private original QA",
        text: "No construction instruction.",
        page: null,
        needsManualReview: false,
        notes: [],
      },
    ],
    metrics: { ...initial.metrics, parsed: 1, sections: 1 },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => parsed });
  vi.stubGlobal("fetch", fetcher);
  render(<ResearchStudio initial={initial} />);
  const button = screen.getByRole("button", {
    name: "Parse authorized document",
  });
  fireEvent.change(
    screen.getByLabelText("Authorized source content", { exact: true }),
    { target: { value: html } },
  );
  expect(button).toBeDisabled();
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "I have the right to process this copy privately and the supplied content is accurately identified.",
    }),
  );
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Authorized document imported and processed.",
    ),
  );
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    action: "import_document",
    sourceId: "qa-source",
    format: "html",
    content: html,
    rightsAttestation: true,
  });
  expect(fetcher.mock.calls[0][0]).toBe("/api/studio/research");
  expect(
    screen.getByText("No construction instruction.", { exact: true }),
  ).toBeVisible();
  expect(
    screen.getByTestId("research-human-verified-sources"),
  ).toHaveTextContent("0");
});

it("saves corrected metadata with a revision guard and preserves source identity", async () => {
  const seeded: ResearchSnapshot = {
    ...initial,
    sources: [
      {
        ...initial.sources[0],
        metadataRevision: 3,
        metadataTitle: "Curated QA catalog title",
      },
    ],
  };
  const updated: ResearchSnapshot = {
    ...seeded,
    sources: [
      {
        ...seeded.sources[0],
        publisher: "Corrected private QA publisher",
        classification: "technical_research",
        metadataRevision: 4,
      },
    ],
  };
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => updated });
  vi.stubGlobal("fetch", fetcher);
  render(<ResearchStudio initial={seeded} />);
  fireEvent.click(
    screen.getByText("Edit selected source metadata", { exact: true }),
  );
  expect(screen.getByLabelText("Metadata original source URL")).toHaveAttribute(
    "readonly",
  );
  expect(screen.getByLabelText("Metadata document title")).toHaveValue(
    "Curated QA catalog title",
  );
  fireEvent.change(screen.getByLabelText("Metadata publisher"), {
    target: { value: "Corrected private QA publisher" },
  });
  fireEvent.change(screen.getByLabelText("Metadata source classification"), {
    target: { value: "technical_research" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save source metadata correction" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Source metadata corrected.",
    ),
  );
  const posted = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(posted.action).toBe("update_metadata");
  expect(posted.sourceId).toBe("qa-source");
  expect(posted.expectedRevision).toBe(3);
  expect(posted.source.title).toBe("Curated QA catalog title");
  expect(posted.source.originalUrl).toBe(initial.sources[0].originalUrl);
  expect(posted.source.parentId).toBeNull();
  expect(posted.source.publisher).toBe("Corrected private QA publisher");
  expect(posted.source.classification).toBe("technical_research");
  expect(posted.source).not.toHaveProperty("status");
});

it("requires exact-section human attestation, preserves extraction flags and cannot resolve missing text", async () => {
  const seed: ResearchSnapshot = {
    ...initial,
    sources: [
      {
        ...initial.sources[0],
        documentHash: "a".repeat(64),
        metadataRevision: 2,
        status: "requires_manual_review",
        parseStatus: "partially_parsed",
        sectionsProcessed: 2,
      },
    ],
    sections: [
      {
        id: "qa-table",
        sourceId: "qa-source",
        locator: "#table",
        title: "Original software QA table",
        text: "Synthetic QA table value",
        page: 1,
        needsManualReview: true,
        notes: ["Table relationships need human examination"],
      },
      {
        id: "qa-unreadable",
        sourceId: "qa-source",
        locator: "page-2",
        title: "Unreadable QA page",
        text: "",
        page: 2,
        needsManualReview: true,
        notes: ["No text extracted"],
      },
    ],
  };
  const result: ResearchSnapshot = {
    ...seed,
    sections: [
      {
        ...seed.sections[0],
        manualReviewResolved: true,
        effectiveNeedsManualReview: false,
      },
      seed.sections[1],
    ],
  };
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => result });
  vi.stubGlobal("fetch", fetcher);
  render(<ResearchStudio initial={seed} />);
  const missing = screen
    .getByRole("heading", { name: "Unreadable QA page" })
    .closest("article")!;
  expect(
    within(missing).getByRole("option", {
      name: "Original content examined; extraction flag resolved",
    }),
  ).toBeDisabled();
  const table = screen
    .getByRole("heading", { name: "Original software QA table" })
    .closest("article")!;
  const button = within(table).getByRole("button", {
    name: "Save section examination",
  });
  expect(button).toBeDisabled();
  fireEvent.change(
    within(table).getByLabelText("Section examination outcome"),
    { target: { value: "resolved" } },
  );
  fireEvent.change(
    within(table).getByLabelText("Section examination findings"),
    {
      target: {
        value:
          "Original synthetic software QA table examined; this provides no construction-safety approval.",
      },
    },
  );
  fireEvent.click(
    within(table).getByRole("checkbox", {
      name: "I personally examined this exact original page or section and recorded accurate findings. This is not an AI attestation.",
    }),
  );
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Section examination recorded",
    ),
  );
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    action: "review_section",
    sourceId: "qa-source",
    sectionId: "qa-table",
    documentHash: "a".repeat(64),
    decision: "resolved",
    notes:
      "Original synthetic software QA table examined; this provides no construction-safety approval.",
    humanAttestation: true,
  });
  expect(
    screen.getByText(
      /Original extraction warning: Table relationships need human examination/,
    ),
  ).toBeVisible();
  expect(
    screen.getByTestId("research-human-verified-sources"),
  ).toHaveTextContent("0");
});
