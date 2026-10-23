// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CurriculumExplorer } from "@/components/curriculum-explorer";
import { ReferenceLibrary } from "@/components/reference-library";
import { ContentReportForm } from "@/components/content-report-form";
import { CurriculumCoverageDashboard } from "@/components/curriculum-coverage";
import { SourceVerificationForm } from "@/components/studio/source-verification";
import { BlueprintReview } from "@/components/studio/review";
import {
  CHST_BLUEPRINT_ID,
  chstObjectives,
} from "@/modules/curriculum/catalog";
import type { CurriculumCoverage } from "@/modules/curriculum/coverage-types";
import { questionTemplate, type StudioItem } from "@/modules/studio/model";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("CHST curriculum and source-aware interfaces", () => {
  it("renders every official objective and filters knowledge and skill statements without inventing completion", () => {
    render(<CurriculumExplorer />);
    expect(
      screen.getAllByRole("link", { name: "Open study pathway" }),
    ).toHaveLength(78);
    fireEvent.click(screen.getByRole("button", { name: /DOMAIN 2/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "15 of 78 statements match",
    );
    fireEvent.change(screen.getByLabelText("Statement type"), {
      target: { value: "skill" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "7 of 78 statements match",
    );
    fireEvent.change(screen.getByLabelText("Search blueprint objectives"), {
      target: { value: "exercises" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 of 78 statements match",
    );
    expect(
      screen.getByRole("link", { name: "Open study pathway" }),
    ).toHaveAttribute("href", "/curriculum/CHST5-2022.04.12-D2-S07");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("preserves discovery search while distinguishing bibliographic inclusion from technical verification", async () => {
    render(<ReferenceLibrary />);
    const search = screen.getByRole("textbox", { name: "Search references" });
    await waitFor(() => expect(search).toBeEnabled());
    fireEvent.change(search, { target: { value: "NIOSH" } });
    expect(
      screen.getByText("1 resources", { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Visit publisher/ }),
    ).toHaveAttribute("href", "https://www.cdc.gov/niosh/construction/");
    fireEvent.change(search, { target: { value: "Oakley" } });
    expect(
      screen.getByText("1 resources", { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bibliography only · source not reviewed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Visit publisher/ }),
    ).not.toBeInTheDocument();
  });
  it("records source findings separately and never supplies author, reviewer, or source verification timestamps", async () => {
    const onRecord = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const item: StudioItem = {
      id: "source-qa",
      kind: "question",
      ownerId: "author",
      revision: 1,
      revisionId: "source-qa:v1",
      rowVersion: 1,
      status: "source_verification_pending",
      data: {
        ...questionTemplate,
        sources: [
          {
            id: "candidate",
            title: "Unexamined candidate",
            url: "",
            edition: "",
            section: "",
            classification: "professional_guidance",
          },
        ],
      },
      reviews: [],
      events: [],
      publishedRevisionId: null,
      blockers: [],
      versions: [],
    };
    render(
      <SourceVerificationForm item={item} busy={false} onRecord={onRecord} />,
    );
    expect(
      screen.getByRole("button", { name: "Record source verification" }),
    ).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText("Source verification 1 evidence notes"),
      {
        target: {
          value: "The source text is unavailable and no section was examined.",
        },
      },
    );
    fireEvent.change(screen.getByLabelText("Source verification findings"), {
      target: {
        value:
          "Request access to the actual publication before making a supporting finding.",
      },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Record source verification" }),
    );
    await waitFor(() => expect(onRecord).toHaveBeenCalledOnce());
    expect(onRecord.mock.calls[0][0]).toEqual({
      decision: "changes_requested",
      findings:
        "Request access to the actual publication before making a supporting finding.",
      sourceChecks: [
        {
          sourceId: "candidate",
          outcome: "insufficient",
          notes: "The source text is unavailable and no section was examined.",
          edition: "",
          section: "",
          url: "",
        },
      ],
      humanAttestation: true,
    });
  });
  it("keeps canonical blueprint mappings read-only and requires an explicit human attestation", () => {
    render(
      <BlueprintReview
        blueprints={[
          {
            id: CHST_BLUEPRINT_ID,
            certificationId: "chst",
            version: "2022.04.12",
            verified: false,
            domains: [],
            objectives: [],
          },
        ]}
        busy={false}
        onRecord={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Inspect all 78 canonical mappings"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add objective mapping" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Record blueprint source review" }),
    ).toBeDisabled();
    expect(screen.getByText(chstObjectives[77].statement)).toBeInTheDocument();
  });
  it("clears protected coverage when editorial authorization expires", async () => {
    const initial: CurriculumCoverage = {
      access: {
        actorId: "reviewer",
        roles: ["reviewer"],
        localDevelopment: false,
      },
      blueprint: {
        id: CHST_BLUEPRINT_ID,
        version: "2022.04.12",
        latestOfficialVersionConfirmed: false,
      },
      totals: {
        questions: 0,
        lessons: 0,
        draft: 0,
        sourceVerified: 0,
        approved: 0,
        published: 0,
        technicalReview: 0,
        sourcePending: 0,
        reportedErrors: 0,
        objectivesWithoutQuestions: 78,
        objectivesInsufficientCoverage: 78,
      },
      domains: [],
      objectives: chstObjectives.map((objective) => ({
        id: objective.id,
        domain: objective.domain,
        kind: objective.kind,
        number: objective.number,
        statement: objective.statement,
        page: objective.documentPage,
        questions: 0,
        sourceVerified: 0,
        approved: 0,
        published: 0,
      })),
      references: [],
      reports: [],
      filters: {},
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Editorial permission revoked." },
            { status: 403 },
          ),
        ),
    );
    render(<CurriculumCoverageDashboard initial={initial} />);
    expect(
      screen.getByRole("heading", { name: "Coverage for all 78 statements" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Apply coverage filters" }),
    );
    await screen.findByRole("heading", { name: "Editorial access ended." });
    expect(
      screen.queryByRole("heading", { name: "Coverage for all 78 statements" }),
    ).not.toBeInTheDocument();
  });
  it("sends an actual content report and only confirms the successful server response", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "reported-concern" }));
    vi.stubGlobal("fetch", fetcher);
    render(<ContentReportForm contentId="question-123" revision={2} />);
    fireEvent.change(screen.getByLabelText("Describe the content concern"), {
      target: {
        value: "The exact cited section appears unrelated to this explanation.",
      },
    });
    fireEvent.change(screen.getByLabelText("Concern type"), {
      target: { value: "citation" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Send for editorial review" })
        .closest("form")!,
    );
    await screen.findByRole("status");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      contentId: "question-123",
      revision: 2,
      category: "citation",
      message: "The exact cited section appears unrelated to this explanation.",
    });
    expect(fetcher.mock.calls[0][0]).toBe("/api/content-reports");
  });
});
