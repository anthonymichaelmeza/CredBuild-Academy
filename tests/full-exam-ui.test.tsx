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
import type { SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "@/modules/exams/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("full-length examination interfaces", () => {
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
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Load older examinations" }),
      ).not.toBeInTheDocument(),
    );
    expect(request.mock.calls[0][0]).toBe(
      "/api/exams?view=history&before=saved-49",
    );
    expect(
      screen.getAllByRole("link", { name: /Resume examination/ }),
    ).toHaveLength(51);
    expect(screen.getByText("Question 112")).toBeInTheDocument();
  });
});
