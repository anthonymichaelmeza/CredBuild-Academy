// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AccessError } from "@/modules/identity/access";
import type { ExamAdminSummary } from "@/modules/exams/types";

vi.mock("@/modules/exams/service", () => ({ adminSummary: vi.fn() }));
vi.mock("@/modules/identity/auth", async () => ({
  AccessError: (await import("@/modules/identity/access")).AccessError,
  actor: vi.fn(),
}));
import { actor } from "@/modules/identity/auth";
import { adminSummary } from "@/modules/exams/service";
import ExamAdminPage from "@/app/studio/exams/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const summary: ExamAdminSummary = {
  availability: {
    count: 200,
    durationSeconds: 14400,
    blueprintVersion: "2022.04.12",
    latestOfficialVersionConfirmed: false,
    durationBasis: "credbuilt_practice_configuration",
    domains: [
      { code: "1", title: "Hazards", required: 73, eligible: 70, shortfall: 3 },
      {
        code: "2",
        title: "Emergency response",
        required: 40,
        eligible: 40,
        shortfall: 0,
      },
      {
        code: "3",
        title: "Safety programs",
        required: 45,
        eligible: 45,
        shortfall: 0,
      },
      {
        code: "4",
        title: "Leadership",
        required: 42,
        eligible: 42,
        shortfall: 0,
      },
    ],
    eligibleTotal: 197,
    canStart: false,
    blockers: ["Domain 1 needs 3 more eligible questions."],
    developmentFixture: false,
    signedIn: true,
    bankConnected: true,
  },
  domainCounts: [
    { code: "1", approved: 71, published: 70, draft: 3, unreviewed: 4 },
    { code: "2", approved: 40, published: 40, draft: 0, unreviewed: 0 },
    { code: "3", approved: 45, published: 45, draft: 0, unreviewed: 0 },
    { code: "4", approved: 42, published: 42, draft: 0, unreviewed: 0 },
  ],
  approvedTotal: 198,
  publishedTotal: 197,
  draftCount: 3,
  unreviewedCount: 4,
  invalidPublished: 0,
  completedAttempts: 2,
  inProgressAttempts: 1,
  questionStatistics: [
    {
      id: "fictional-stat-domain1",
      version: 2,
      domain: "1",
      topic: "Fictional test topic",
      answered: 4,
      correct: 3,
      accuracy: 75,
    },
    {
      id: "fictional-stat-domain2",
      version: 1,
      domain: "2",
      topic: "Other fictional test topic",
      answered: 2,
      correct: 1,
      accuracy: 50,
    },
  ],
};

describe("exam administration boundary", () => {
  it("does not resolve identities or touch the database in browser-demo mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    render(await ExamAdminPage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Exam management is protected",
    );
    expect(actor).not.toHaveBeenCalled();
    expect(adminSummary).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /short rehearsals/ }),
    ).toHaveAttribute("href", "/exam");
  });

  it("keeps database metrics unavailable to signed-out visitors", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    vi.mocked(actor).mockResolvedValue(null);
    render(await ExamAdminPage());
    expect(
      screen.getByText(/Sign in with a configured managed account/),
    ).toBeInTheDocument();
    expect(adminSummary).not.toHaveBeenCalled();
  });

  it("renders a protected response when the trusted service rejects a non-administrator", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    vi.mocked(actor).mockResolvedValue({ id: "learner", mode: "managed" });
    vi.mocked(adminSummary).mockRejectedValue(
      new AccessError("An administrator role is required.", 403),
    );
    render(await ExamAdminPage());
    expect(
      screen.getByText("An administrator role is required."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Eligible full-exam questions"),
    ).not.toBeInTheDocument();
  });

  it("shows saved domain shortfalls and filters observed statistics without substituting fixture counts", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "false");
    vi.mocked(actor).mockResolvedValue({ id: "admin", mode: "managed" });
    vi.mocked(adminSummary).mockResolvedValue(summary);
    render(
      await ExamAdminPage({ searchParams: Promise.resolve({ domain: "2" }) }),
    );
    expect(adminSummary).toHaveBeenCalledWith({ id: "admin", mode: "managed" });
    expect(
      screen.getByText("Domain 1 needs 3 more eligible questions."),
    ).toBeInTheDocument();
    const table = screen.getByRole("region", {
      name: "Scrollable domain eligibility table",
    });
    const firstDomain = within(table).getByRole("row", { name: /Hazards/ });
    expect(
      within(firstDomain)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["73", "71", "70", "70", "3", "3", "4"]);
    expect(screen.getByText("fictional-stat-domain2 · v1")).toBeInTheDocument();
    expect(
      screen.queryByText("fictional-stat-domain1 · v2"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Four hours is the CredBuilt practice configuration/),
    ).toBeInTheDocument();
  });
});
