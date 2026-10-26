// Only original, unverified demo fixtures may be imported here. No account data,
// production question bank, credentials, database adapter, or server auth code.
import { z } from "zod";
import {
  deadlinePassed,
  finalize,
  recordAnswer,
} from "@/modules/practice/lifecycle";
import { demoQuestions } from "./questions";
import { browserDraftQuestions } from "@/content/chst/draft-bank";
import { browserFullExamQuestions } from "./full-exam-questions";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import {
  selectQuestions,
  selectionHistory,
  sessionConfigSchema,
  sessionView,
} from "@/modules/practice/engine";
import { practiceActionSchema } from "@/modules/practice/requests";
import type { Question, Session, SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "@/modules/exams/types";
import { examActionSchema } from "@/modules/exams/requests";
import { chstPracticeExamPolicy } from "@/modules/exams/policy";

export const BROWSER_DEMO_STORAGE_KEY = "credbuilt.browser-demo.v1";
export const BROWSER_DEMO_CHANGED = "credbuilt:browser-demo-changed";
export const STORAGE_UNAVAILABLE = "storage-unavailable";
export const allBrowserQuestions = [
  ...demoQuestions,
  ...browserDraftQuestions,
  ...browserFullExamQuestions,
];
const browserFullExamPolicyVersion = "browser-demo-chst5-200-v1";
function sessionQuestionPool(
  session: Pick<Session, "bank" | "developmentFixture">,
): Question[] {
  return session.developmentFixture
    ? browserFullExamQuestions
    : session.bank === "curriculum_drafts"
      ? browserDraftQuestions
      : demoQuestions;
}
const questionId = z.enum(
  allBrowserQuestions.map((q) => q.id) as [string, ...string[]],
);
const answer = z.object({
  choiceId: z.string().min(1).max(20),
  confidence: z.enum(["low", "medium", "high"]),
  correct: z.boolean(),
  answeredAt: z.iso.datetime(),
  responseMs: z.number().int().min(0).max(86_400_000),
});
const storedSession = z
  .object({
    id: z.uuid(),
    ownerId: z.literal("browser-demo"),
    questionIds: z.array(questionId).min(1).max(200),
    questionVersions: z
      .partialRecord(questionId, z.number().int().positive())
      .optional(),
    answers: z.partialRecord(questionId, answer),
    flags: z.array(questionId).max(200),
    mode: z.enum(["learning", "adaptive", "timed", "exam"]),
    status: z.enum(["in_progress", "submitted"]),
    createdAt: z.iso.datetime(),
    submittedAt: z.iso.datetime().nullable(),
    revision: z.number().int().min(0),
    deadlineAt: z.iso.datetime().optional(),
    submissionReason: z.enum(["manual", "expired"]).optional(),
    topic: z.string().max(100).optional(),
    bank: z.enum(["curriculum_drafts", "demonstration"]).optional(),
    certification: z.literal("chst").optional(),
    examKind: z.literal("chst_full_length").optional(),
    currentQuestionIndex: z.number().int().min(0).max(199).optional(),
    examPolicyVersion: z.string().max(100).optional(),
    durationSeconds: z.number().int().min(5).max(14400).optional(),
    developmentFixture: z.boolean().optional(),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.questionIds).size !== s.questionIds.length ||
      (s.questionVersions !== undefined &&
        (Object.keys(s.questionVersions).length !== s.questionIds.length ||
          s.questionIds.some(
            (id) => s.questionVersions?.[id] === undefined,
          ))) ||
      s.flags.some((id) => !s.questionIds.includes(id)) ||
      Object.keys(s.answers).some((id) => !s.questionIds.includes(id)) ||
      s.questionIds.some(
        (id) =>
          !sessionQuestionPool(s).some(
            (q) => q.id === id && q.version === (s.questionVersions?.[id] ?? 1),
          ),
      ) ||
      Object.entries(s.answers).some(
        ([id, answer]) =>
          !answer ||
          !allBrowserQuestions
            .find(
              (q) =>
                q.id === id && q.version === (s.questionVersions?.[id] ?? 1),
            )
            ?.choices.some((choice) => choice.id === answer.choiceId),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid demonstration session snapshot",
      });
    if (s.developmentFixture && s.bank !== "demonstration")
      ctx.addIssue({
        code: "custom",
        message: "Exam samples cannot enter another question bank.",
      });
    if (s.examKind === "chst_full_length") {
      const fullShape =
        s.developmentFixture === true &&
        s.mode === "exam" &&
        s.bank === "demonstration" &&
        s.certification === "chst" &&
        s.questionIds.length === 200 &&
        s.questionVersions !== undefined &&
        s.currentQuestionIndex !== undefined &&
        s.examPolicyVersion === browserFullExamPolicyVersion &&
        s.durationSeconds !== undefined &&
        s.deadlineAt !== undefined &&
        Date.parse(s.deadlineAt) - Date.parse(s.createdAt) ===
          s.durationSeconds * 1000 &&
        (process.env.NODE_ENV === "development" ||
          s.durationSeconds === 14400) &&
        chstPracticeExamPolicy.domains.every(
          (domain) =>
            s.questionIds.filter(
              (id) =>
                browserFullExamQuestions.find((question) => question.id === id)
                  ?.domain === domain.code,
            ).length === domain.required,
        ) &&
        (s.status === "in_progress"
          ? s.submittedAt === null && !s.submissionReason
          : s.submittedAt !== null &&
            Boolean(s.submissionReason) &&
            Date.parse(s.submittedAt) >= Date.parse(s.createdAt) &&
            Date.parse(s.submittedAt) <= Date.parse(s.deadlineAt) &&
            (s.submissionReason !== "expired" ||
              s.submittedAt === s.deadlineAt));
      if (!fullShape)
        ctx.addIssue({
          code: "custom",
          message: "Invalid full-length demonstration examination.",
        });
    } else if (s.developmentFixture && s.mode !== "learning") {
      ctx.addIssue({
        code: "custom",
        message:
          "Exam samples support dedicated examinations or missed-question learning only.",
      });
    }
  });
const stateSchema = z.object({
  version: z.literal(1),
  sessions: z.array(storedSession).max(100),
  bookmarks: z.array(questionId).max(allBrowserQuestions.length),
});
export type BrowserDemoState = {
  version: 1;
  sessions: Session[];
  bookmarks: string[];
};
export const emptyBrowserState: BrowserDemoState = {
  version: 1,
  sessions: [],
  bookmarks: [],
};

export function parseBrowserSnapshot(raw: string | null): BrowserDemoState {
  if (raw === STORAGE_UNAVAILABLE)
    throw new Error(
      "Browser storage is unavailable. Allow site storage to try the interactive demo; no progress was sent to a server.",
    );
  if (raw === null) return emptyBrowserState;
  try {
    return stateSchema.parse(JSON.parse(raw)) as BrowserDemoState;
  } catch {
    throw new Error(
      "Saved demo data cannot be read. Use Reset browser demo in Account Settings to remove only this demo’s data.",
    );
  }
}
export function browserSnapshot(): string | null {
  try {
    return window.localStorage.getItem(BROWSER_DEMO_STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}
export function subscribeBrowserDemo(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === BROWSER_DEMO_STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(BROWSER_DEMO_CHANGED, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(BROWSER_DEMO_CHANGED, notify);
  };
}
function persist(state: BrowserDemoState) {
  // Validate before writing; never silently discard earlier sessions or failures.
  stateSchema.parse(state);
  try {
    window.localStorage.setItem(
      BROWSER_DEMO_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    throw new Error(
      "Demo progress could not be saved in this browser. Storage may be blocked or full. No answer was saved; free space or allow site storage and retry.",
    );
  }
  window.dispatchEvent(new Event(BROWSER_DEMO_CHANGED));
}
export function createBrowserSession(input: unknown): string {
  const config = sessionConfigSchema.parse(input);
  if (config.bank === "published")
    throw new Error(
      "Published instructional questions require a connected account; they are not included in the browser demonstration.",
    );
  if (config.bank === "curriculum_drafts" && !browserDemoEnabled())
    throw new Error(
      "Curriculum draft practice requires the explicitly enabled browser demonstration.",
    );
  const state = parseBrowserSnapshot(browserSnapshot());
  if (state.sessions.length >= 100)
    throw new Error(
      "This browser demo holds up to 100 sessions. Reset browser demo in Account Settings before starting more.",
    );
  const history = selectionHistory(state.sessions);
  const bank =
    config.bank === "curriculum_drafts" ? browserDraftQuestions : demoQuestions;
  if (config.count === 200 && config.mode === "exam")
    throw new Error(
      `This practice bank has ${bank.length} unreviewed questions. Use the dedicated 200-question demonstration exam; smaller practice banks are never duplicated.`,
    );
  const selected = selectQuestions(
    bank,
    config,
    history,
    Math.random,
    state.bookmarks,
  );
  const session: Session = {
    id: crypto.randomUUID(),
    ownerId: "browser-demo",
    questionIds: selected.map((q) => q.id),
    questionVersions: Object.fromEntries(
      selected.map((q) => [q.id, q.version]),
    ),
    answers: {},
    flags: [],
    mode: config.mode,
    status: "in_progress",
    createdAt: new Date().toISOString(),
    submittedAt: null,
    revision: 0,
    ...(config.bank === "curriculum_drafts"
      ? { bank: "curriculum_drafts" as const }
      : {}),
    ...(config.topic && config.topic !== "all" ? { topic: config.topic } : {}),
    ...(["timed", "exam"].includes(config.mode)
      ? {
          deadlineAt: new Date(
            Date.now() + config.durationSeconds! * 1000,
          ).toISOString(),
        }
      : {}),
  };
  persist({ ...state, sessions: [session, ...state.sessions] });
  return session.id;
}
export function browserSessionView(session: Session) {
  return sessionView(session, sessionQuestionPool(session));
}
export function browserPracticeAction(
  input: unknown,
  expectedRevision: number,
): SessionView | { bookmarks: string[] } {
  const action = practiceActionSchema.parse(input);
  if (action.action === "start")
    throw new Error("Use the session builder to begin.");
  const state = parseBrowserSnapshot(browserSnapshot());
  let session = state.sessions.find((s) => s.id === action.sessionId);
  if (!session)
    throw new Error(
      "This session is not stored in this browser. Start a new demonstration session.",
    );
  if (session.examKind === "chst_full_length")
    throw new Error(
      "Use the full-length demonstration exam workspace for this attempt.",
    );
  if (session.revision !== expectedRevision)
    throw new Error(
      "This session changed in another tab. Refresh and try again.",
    );
  if (action.action === "bookmark") {
    if (!session.questionIds.includes(action.questionId))
      throw new Error("Question not in this session.");
    state.bookmarks = action.enabled
      ? [...new Set([...state.bookmarks, action.questionId])]
      : state.bookmarks.filter((id) => id !== action.questionId);
    persist(state);
    return { bookmarks: state.bookmarks };
  }
  if (session.status === "submitted") {
    if (action.action === "submit") return browserSessionView(session);
    throw new Error("Session already submitted.");
  }
  if (deadlinePassed(session)) session = finalize(session);
  else if (action.action === "submit") session = finalize(session);
  else {
    const id =
      action.action === "answer" ? action.input.questionId : action.questionId;
    if (!session.questionIds.includes(id))
      throw new Error("Question not in this session.");
    if (action.action === "flag")
      session.flags = session.flags.includes(id)
        ? session.flags.filter((q) => q !== id)
        : [...session.flags, id];
    else {
      const updated = recordAnswer(
        session,
        sessionQuestionPool(session),
        action.input,
      );
      if (updated === session) return browserSessionView(session);
      session = updated;
    }
  }
  state.sessions = state.sessions.map((s) =>
    s.id === session!.id ? session! : s,
  );
  session.revision++;
  persist(state);
  return browserSessionView(session);
}

function requireBrowserFullExam() {
  if (!browserDemoEnabled())
    throw new Error(
      "The sample examination requires the explicitly enabled browser demonstration. Production exams use the separate approved question bank.",
    );
}
function fullExamIn(state: BrowserDemoState, id: string) {
  const session = state.sessions.find(
    (item) => item.id === id && item.examKind === "chst_full_length",
  );
  if (!session)
    throw new Error(
      "This demonstration exam is not stored in this browser. Open Exam Simulator to start a new sample attempt.",
    );
  return session;
}
function finishBrowserFullExam(session: Session, now: number): Session {
  if (session.status === "submitted") return session;
  const expired = deadlinePassed(session, now);
  return {
    ...session,
    status: "submitted",
    submissionReason: expired ? "expired" : "manual",
    submittedAt: expired ? session.deadlineAt! : new Date(now).toISOString(),
  };
}
function saveBrowserFullExam(
  state: BrowserDemoState,
  previous: Session,
  updated: Session,
) {
  if (previous === updated) return previous;
  const next = { ...updated, revision: previous.revision + 1 };
  persist({
    ...state,
    sessions: state.sessions.map((item) => (item.id === next.id ? next : item)),
  });
  return next;
}
function fullExamView(session: Session, now = Date.now()): SessionView {
  // Compatibility timestamp only: this is the local browser's clock, not a
  // server attestation. The demonstration reader labels this distinction.
  return {
    ...browserSessionView(session),
    serverNow: new Date(now).toISOString(),
  };
}

/** Public, inspectable sample data. It cannot publish or enter a connected bank. */
export function createBrowserFullExam(
  input: { durationSeconds?: number } = {},
): string {
  requireBrowserFullExam();
  const { durationSeconds = 14400 } = z
    .object({ durationSeconds: z.number().int().min(5).max(14400).optional() })
    .strict()
    .parse(input);
  if (durationSeconds !== 14400 && process.env.NODE_ENV !== "development")
    throw new Error(
      "Short demonstration timers are available only in local development. This build uses the standard four-hour timer.",
    );
  const state = parseBrowserSnapshot(browserSnapshot());
  const now = Date.now();
  let changed = false;
  let ongoing: Session | undefined;
  const sessions = state.sessions.map((session) => {
    if (
      session.examKind !== "chst_full_length" ||
      session.status !== "in_progress"
    )
      return session;
    if (deadlinePassed(session, now)) {
      changed = true;
      return {
        ...finishBrowserFullExam(session, now),
        revision: session.revision + 1,
      };
    }
    ongoing ??= session;
    return session;
  });
  if (ongoing) {
    if (changed) persist({ ...state, sessions });
    return ongoing.id;
  }
  if (sessions.length >= 100)
    throw new Error(
      "This browser demo holds up to 100 sessions. Export or reset demo data in Settings before starting more.",
    );
  const selected = [...browserFullExamQuestions];
  for (let index = selected.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [selected[index], selected[other]] = [selected[other], selected[index]];
  }
  const createdAt = new Date(now).toISOString();
  const session: Session = {
    id: crypto.randomUUID(),
    ownerId: "browser-demo",
    questionIds: selected.map((question) => question.id),
    questionVersions: Object.fromEntries(
      selected.map((question) => [question.id, question.version]),
    ),
    answers: {},
    flags: [],
    mode: "exam",
    status: "in_progress",
    createdAt,
    submittedAt: null,
    revision: 0,
    deadlineAt: new Date(now + durationSeconds * 1000).toISOString(),
    bank: "demonstration",
    certification: "chst",
    examKind: "chst_full_length",
    currentQuestionIndex: 0,
    examPolicyVersion: browserFullExamPolicyVersion,
    durationSeconds,
    developmentFixture: true,
  };
  persist({ ...state, sessions: [session, ...sessions] });
  return session.id;
}

export function browserFullExamView(id: string): SessionView {
  requireBrowserFullExam();
  const state = parseBrowserSnapshot(browserSnapshot());
  const previous = fullExamIn(state, id);
  const now = Date.now();
  const next = deadlinePassed(previous, now)
    ? finishBrowserFullExam(previous, now)
    : previous;
  return fullExamView(saveBrowserFullExam(state, previous, next), now);
}

export function browserFullExamAction(
  input: unknown,
  expectedRevision: number,
): SessionView | { id: string } {
  requireBrowserFullExam();
  const command = examActionSchema.parse(input);
  if (command.action === "start")
    throw new Error("Use the demonstration exam setup to begin.");
  const state = parseBrowserSnapshot(browserSnapshot());
  const previous = fullExamIn(state, command.sessionId);
  const now = Date.now();
  if (previous.status === "submitted" && command.action === "submit")
    return fullExamView(previous, now);
  if (previous.revision !== expectedRevision)
    throw new Error("This exam changed in another tab. Refresh and try again.");
  if (command.action === "study_missed") {
    if (previous.status !== "submitted")
      throw new Error(
        "Submit this demonstration exam before studying missed questions.",
      );
    const candidates = previous.questionIds
      .filter((id) => !previous.answers[id]?.correct)
      .sort(
        (a, b) =>
          Number(Boolean(previous.answers[b])) -
          Number(Boolean(previous.answers[a])),
      )
      .slice(0, 25);
    if (!candidates.length)
      throw new Error(
        "There are no missed or unanswered questions in this attempt.",
      );
    if (state.sessions.length >= 100)
      throw new Error(
        "This browser demo holds up to 100 sessions. Export or reset demo data in Settings before starting more.",
      );
    const session: Session = {
      id: crypto.randomUUID(),
      ownerId: "browser-demo",
      questionIds: candidates,
      questionVersions: Object.fromEntries(candidates.map((id) => [id, 1])),
      answers: {},
      flags: [],
      mode: "learning",
      status: "in_progress",
      createdAt: new Date(now).toISOString(),
      submittedAt: null,
      revision: 0,
      bank: "demonstration",
      certification: "chst",
      developmentFixture: true,
    };
    persist({ ...state, sessions: [session, ...state.sessions] });
    return { id: session.id };
  }
  if (previous.status === "submitted") return fullExamView(previous, now);
  let next = previous;
  if (deadlinePassed(previous, now))
    next = finishBrowserFullExam(previous, now);
  else if (command.action === "submit")
    next = finishBrowserFullExam(previous, now);
  else if (command.action === "navigate") {
    if (command.index !== previous.currentQuestionIndex)
      next = { ...previous, currentQuestionIndex: command.index };
  } else {
    if (!previous.questionIds.includes(command.questionId))
      throw new Error("Question not in this demonstration exam.");
    if (command.action === "flag") {
      if (previous.flags.includes(command.questionId) !== command.enabled)
        next = {
          ...previous,
          flags: command.enabled
            ? [...previous.flags, command.questionId]
            : previous.flags.filter((id) => id !== command.questionId),
        };
    } else if (
      previous.answers[command.questionId]?.choiceId !== command.choiceId
    ) {
      next = recordAnswer(
        previous,
        browserFullExamQuestions,
        { ...command, confidence: "medium" },
        now,
      );
    }
  }
  return fullExamView(saveBrowserFullExam(state, previous, next), now);
}

export function browserFullExamHistory(): ExamHistoryItem[] {
  requireBrowserFullExam();
  const state = parseBrowserSnapshot(browserSnapshot());
  const now = Date.now();
  let changed = false;
  const sessions = state.sessions.map((session) => {
    if (
      session.examKind !== "chst_full_length" ||
      !deadlinePassed(session, now)
    )
      return session;
    changed = true;
    return {
      ...finishBrowserFullExam(session, now),
      revision: session.revision + 1,
    };
  });
  if (changed) persist({ ...state, sessions });
  return sessions
    .filter((session) => session.examKind === "chst_full_length")
    .map((session) => {
      const correct = Object.values(session.answers).filter(
        (answer) => answer.correct,
      ).length;
      return {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        submittedAt: session.submittedAt,
        deadlineAt: session.deadlineAt!,
        ...(session.submissionReason
          ? { submissionReason: session.submissionReason }
          : {}),
        questionCount: session.questionIds.length,
        answered: Object.keys(session.answers).length,
        currentQuestionIndex: session.currentQuestionIndex || 0,
        developmentFixture: true,
        ...(session.status === "submitted"
          ? {
              correct,
              percentage: Math.round(
                (correct / session.questionIds.length) * 100,
              ),
              domains: chstPracticeExamPolicy.domains.map((domain) => ({
                code: domain.code,
                total: session.questionIds.filter(
                  (id) =>
                    browserFullExamQuestions.find(
                      (question) => question.id === id,
                    )?.domain === domain.code,
                ).length,
                correct: session.questionIds.filter(
                  (id) =>
                    browserFullExamQuestions.find(
                      (question) => question.id === id,
                    )?.domain === domain.code && session.answers[id]?.correct,
                ).length,
              })),
            }
          : {}),
      };
    });
}

export function resetBrowserDemo() {
  try {
    window.localStorage.removeItem(BROWSER_DEMO_STORAGE_KEY);
  } catch {
    throw new Error(
      "Browser storage is blocked. Allow site storage before resetting the demo.",
    );
  }
  window.dispatchEvent(new Event(BROWSER_DEMO_CHANGED));
}
