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
import { browserDemoEnabled } from "@/modules/runtime/mode";
import {
  selectQuestions,
  selectionHistory,
  sessionConfigSchema,
  sessionView,
} from "@/modules/practice/engine";
import { practiceActionSchema } from "@/modules/practice/requests";
import type { Session, SessionView } from "@/modules/practice/types";

export const BROWSER_DEMO_STORAGE_KEY = "credbuilt.browser-demo.v1";
export const BROWSER_DEMO_CHANGED = "credbuilt:browser-demo-changed";
export const STORAGE_UNAVAILABLE = "storage-unavailable";
export const allBrowserQuestions = [...demoQuestions, ...browserDraftQuestions];
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
    bank: z.literal("curriculum_drafts").optional(),
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
          !(
            s.bank === "curriculum_drafts"
              ? browserDraftQuestions
              : demoQuestions
          ).some(
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
      `This browser demonstration has ${bank.length} unreviewed questions in the selected bank. A full 200-question examination requires distinct approved publications and verified official policy.`,
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
  return sessionView(
    session,
    session.bank === "curriculum_drafts"
      ? browserDraftQuestions
      : demoQuestions,
  );
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
        session.bank === "curriculum_drafts"
          ? browserDraftQuestions
          : demoQuestions,
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
