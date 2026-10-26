// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FullExamSession } from "@/components/full-exam-session";
import { FullExamClock } from "@/components/full-exam-clock";
import { FullExamHistory } from "@/components/full-exam-history";
import { FullExamResults } from "@/components/full-exam-results";
import { FullExamOverview } from "@/components/full-exam-overview";
import {
  createBrowserFullExam,
  browserFullExamView,
  browserFullExamHistory,
} from "@/demo/browser-store";
import type { SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "@/modules/exams/types";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

function fixture(): SessionView {
  const questions: SessionView["questions"] = Array.from(
    { length: 200 },
    (_, index) => ({
      id: `ui-fixture-${index + 1}`,
      version: 1,
      domain: "1",
      topic: "Development-only interface fixture",
      difficulty: "introductory",
      stem: `Development-only question ${index + 1}`,
      choices: ["A", "B", "C", "D"].map((id) => ({
        id,
        text: `Fixture choice ${id}`,
      })),
      contentKind: "demonstration",
      origin: "human_authored",
      reviewStatus: "draft",
    }),
  );
  return {
    id: "b720638b-c53e-4d76-b8fd-b6d3f1ff70d1",
    questionIds: questions.map((item) => item.id),
    questionVersions: Object.fromEntries(questions.map((item) => [item.id, 1])),
    answers: {},
    flags: [],
    mode: "exam",
    status: "in_progress",
    createdAt: "2026-10-26T12:00:00Z",
    serverNow: "2026-10-26T12:00:00Z",
    deadlineAt: "2026-10-26T16:00:00Z",
    submittedAt: null,
    revision: 0,
    examKind: "chst_full_length",
    currentQuestionIndex: 0,
    durationSeconds: 14400,
    developmentFixture: true,
    questions,
    feedback: {},
  };
}
const response = (data: unknown, ok = true) =>
  ({ ok, json: async () => data }) as Response;

beforeEach(() => {
  navigation.push.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("full-length examination interfaces", () => {
  it("starts the browser demonstration while keeping production readiness separate and never calling the server", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    render(<FullExamOverview browserOnly />);
    expect(
      screen.getByRole("heading", { name: "Production Exam: Not Ready" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Demonstration Exam Simulator: Available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Local QA duration (seconds)"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Start 200-question demonstration exam",
      }),
    );
    await waitFor(() => expect(navigation.push).toHaveBeenCalledOnce());
    const id = String(navigation.push.mock.calls[0][0]).split("/").at(-1)!;
    expect(browserFullExamView(id).questionIds).toHaveLength(200);
    expect(request).not.toHaveBeenCalled();
  });

  it("uses actual browser storage for answer, flag, position, submission and full-exam history", async () => {
    vi.stubEnv("NEXT_PUBLIC_BROWSER_DEMO", "true");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const id = createBrowserFullExam();
    const initial = browserFullExamView(id);
    render(<FullExamSession initial={initial} browserOnly />);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await screen.findByText("All changes saved in this browser.");
    await waitFor(() =>
      expect(
        browserFullExamView(id).answers[initial.questionIds[0]],
      ).toBeDefined(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark for review" }));
    await waitFor(() =>
      expect(browserFullExamView(id).flags).toContain(initial.questionIds[0]),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Next question" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    await screen.findByText("QUESTION 2 OF 200");
    expect(browserFullExamView(id).currentQuestionIndex).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Submit Exam" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Confirm submission",
      }),
    );
    await screen.findByRole("heading", { name: "Your exam results." });
    expect(
      browserFullExamHistory().find((item) => item.id === id)?.status,
    ).toBe("submitted");
    expect(
      screen.getByText("Demonstration results · saved in this browser."),
    ).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it("explicitly associates each question-review filter with its exact label", () => {
    render(
      <FullExamResults
        session={{
          ...fixture(),
          status: "submitted",
          submittedAt: "2026-10-26T13:00:00Z",
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Review all questions" }),
    );
    expect(screen.getByLabelText("Show results", { exact: true })).toHaveValue(
      "all",
    );
    expect(screen.getByLabelText("Review domain", { exact: true })).toHaveValue(
      "all",
    );
    expect(screen.getByLabelText("Review topic", { exact: true })).toHaveValue(
      "all",
    );
    fireEvent.change(screen.getByLabelText("Show results", { exact: true }), {
      target: { value: "unanswered" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "200 of 200 questions match these filters.",
    );
  });
  it("saves answer selections and navigation without showing study feedback during the exam", async () => {
    let saved = fixture();
    const request = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body));
      if (command.action === "answer")
        saved = {
          ...saved,
          revision: saved.revision + 1,
          answers: {
            [command.questionId]: {
              choiceId: command.choiceId,
              confidence: "medium",
              responseMs: command.responseMs,
              answeredAt: saved.serverNow!,
            },
          },
        };
      if (command.action === "navigate")
        saved = {
          ...saved,
          revision: saved.revision + 1,
          currentQuestionIndex: command.index,
        };
      return response(saved);
    });
    vi.stubGlobal("fetch", request);
    render(<FullExamSession initial={saved} />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(
      screen.getAllByRole("button", { name: /Go to question/ }),
    ).toHaveLength(200);
    expect(screen.queryByText("Answer explanation")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Technical references and verification"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("How confident are you?"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "A. Fixture choice A" }));
    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: "A. Fixture choice A" }),
      ).toBeChecked(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Next question" }),
      ).toBeEnabled(),
    );
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({
      action: "answer",
      questionId: "ui-fixture-1",
      choiceId: "A",
    });
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    await screen.findByRole("heading", { name: "Development-only question 2" });
    expect(saved.currentQuestionIndex).toBe(1);
    expect(saved.answers["ui-fixture-1"].choiceId).toBe("A");
  });

  it("retains a failed answer and prevents navigation or leaving until its retry succeeds", async () => {
    const initial = fixture();
    const saved = {
      ...initial,
      revision: 1,
      answers: {
        "ui-fixture-1": {
          choiceId: "B",
          confidence: "medium" as const,
          responseMs: 20,
          answeredAt: initial.serverNow!,
        },
      },
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        response({ error: "Connection interrupted" }, false),
      )
      .mockResolvedValueOnce(response(saved));
    vi.stubGlobal("fetch", request);
    render(<FullExamSession initial={initial} />);
    fireEvent.click(screen.getByRole("radio", { name: "B. Fixture choice B" }));
    await screen.findByText("Connection interrupted");
    expect(
      screen.getByRole("radio", { name: "B. Fixture choice B" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Next question" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mark for review" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Save and leave to Exam History" }),
    ).toHaveAttribute("aria-disabled", "true");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Next question" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByText("Connection interrupted"),
    ).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not let an older background response erase a newly saved answer", async () => {
    const initial = fixture();
    let completeRefresh!: (value: Response) => void;
    const pendingRefresh = new Promise<Response>((resolve) => {
      completeRefresh = resolve;
    });
    const saved = {
      ...initial,
      revision: 1,
      answers: {
        "ui-fixture-1": {
          choiceId: "C",
          confidence: "medium" as const,
          responseMs: 20,
          answeredAt: initial.serverNow!,
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: unknown, init?: RequestInit) =>
        init?.method === "POST"
          ? Promise.resolve(response(saved))
          : pendingRefresh,
      ),
    );
    render(<FullExamSession initial={initial} />);
    fireEvent(window, new Event("focus"));
    fireEvent.click(screen.getByRole("radio", { name: "C. Fixture choice C" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Next question" }),
      ).toBeEnabled(),
    );
    await act(async () => {
      completeRefresh(response(initial));
      await pendingRefresh;
    });
    expect(
      screen.getByRole("radio", { name: "C. Fixture choice C" }),
    ).toBeChecked();
    expect(
      screen.getByText("1", { selector: ".full-exam-progress-line strong" }),
    ).toBeInTheDocument();
  });

  it("calibrates the countdown from server time rather than the visitor's wall clock", async () => {
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "performance"],
    });
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2099-01-01T00:00:00Z"));
    const expired = vi.fn();
    render(
      <FullExamClock
        serverNow="2026-10-26T12:00:00Z"
        deadline="2026-10-26T12:00:01Z"
        onExpire={expired}
      />,
    );
    expect(screen.getByRole("timer")).toHaveTextContent("00:00:01");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00:00");
    expect(expired).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("loads older authenticated examination records without replacing newer attempts", async () => {
    const attempts: ExamHistoryItem[] = Array.from(
      { length: 50 },
      (_, index) => ({
        id: `saved-${index}`,
        status: "in_progress",
        createdAt: "2026-10-26T12:00:00Z",
        submittedAt: null,
        deadlineAt: "2026-10-26T16:00:00Z",
        questionCount: 200,
        answered: 0,
        currentQuestionIndex: index,
        developmentFixture: true,
      }),
    );
    const older = {
      ...attempts[0],
      id: "saved-older",
      currentQuestionIndex: 111,
    };
    const request = vi
      .fn()
      .mockResolvedValue(response({ attempts: [older], nextCursor: null }));
    vi.stubGlobal("fetch", request);
    render(<FullExamHistory initial={attempts} signedIn />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load older examinations" }),
    );
    // The button temporarily changes to "Loading…" before the response arrives.
    // Await the loaded record, rather than treating that label change as completion.
    await waitFor(
      () =>
        expect(
          screen.getAllByRole("link", { name: /Resume examination/ }),
        ).toHaveLength(51),
      { timeout: 5000 },
    );
    expect(
      screen.queryByRole("button", { name: "Load older examinations" }),
    ).not.toBeInTheDocument();
    expect(request.mock.calls[0][0]).toBe(
      "/api/exams?view=history&before=saved-49",
    );
    expect(
      screen.getAllByRole("link", { name: /Resume examination/ }),
    ).toHaveLength(51);
    expect(screen.getByText("Question 112")).toBeInTheDocument();
  });
});
