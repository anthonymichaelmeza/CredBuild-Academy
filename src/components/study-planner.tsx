"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { z } from "zod";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
} from "lucide-react";
import { domains } from "@/modules/catalog/blueprint";
import { lessons } from "@/modules/learning/catalog";
import { completedLesson } from "@/modules/learning/progress";
import {
  defaultProfile,
  emptyPlanner,
  utcDate,
  validateProfile,
  plannerStateSchema,
  type LearnerProfile,
  type PlannerAction,
  type PlannerSnapshot,
} from "@/modules/planner/model";
import {
  generateStudyPlan,
  weakDomainsFromSessions,
} from "@/modules/planner/plan";
import {
  plannerSnapshot,
  parsePlanner,
  subscribePlanner,
  plannerAction,
  resetPlanner,
} from "@/demo/planner-store";
import {
  browserSnapshot,
  subscribeBrowserDemo,
  parseBrowserSnapshot,
} from "@/demo/browser-store";
import { useHydrated } from "./use-hydrated";
import { useLearning } from "./use-learning";

const noSubscription = () => () => {};
const noSnapshot = () => null;
const connectedSnapshotSchema = z.object({
  state: plannerStateSchema.nullable(),
  revision: z.number().int().nonnegative(),
});
function errorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues[0]?.message || "Check your entries."
    : error instanceof Error
      ? error.message
      : "Unable to save your study preferences.";
}
function PreferencesForm({
  initial,
  busy,
  onSave,
}: {
  initial: LearnerProfile;
  busy: boolean;
  onSave: (profile: LearnerProfile) => Promise<void>;
}) {
  const [profile, setProfile] = useState(initial);
  const [error, setError] = useState("");
  const toggleDay = (day: number) =>
    setProfile({
      ...profile,
      studyDays: profile.studyDays.includes(day)
        ? profile.studyDays.filter((d) => d !== day)
        : [...profile.studyDays, day].sort(),
    });
  return (
    <form
      className="card planner-preferences"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          await onSave(validateProfile(profile));
        } catch (caught) {
          setError(errorMessage(caught));
        }
      }}
    >
      <div className="eyebrow">MAKE IT PRACTICAL</div>
      <h2>Your goals. Your available time.</h2>
      <p>
        Choose a routine you can maintain. These preferences create a rolling
        week of suggestions, not a promise of examination readiness.
      </p>
      <div className="planner-form-grid">
        <label>
          Certification goal
          <select value={profile.certification} onChange={() => {}}>
            <option value="chst">
              CHST preparation — demonstration curriculum
            </option>
            <option disabled>ASP — not available</option>
            <option disabled>CSP — not available</option>
            <option disabled>OHST / CEST — not available</option>
          </select>
        </label>
        <label>
          Target exam date (optional)
          <input
            type="date"
            min={utcDate()}
            value={profile.targetDate || ""}
            onChange={(event) =>
              setProfile({ ...profile, targetDate: event.target.value || null })
            }
          />
        </label>
        <label>
          Minutes per study day
          <input
            type="number"
            min={10}
            max={120}
            step={5}
            value={profile.minutesPerSession}
            onChange={(event) =>
              setProfile({
                ...profile,
                minutesPerSession: Number(event.target.value),
              })
            }
            required
          />
        </label>
        <label>
          Preferred study activity
          <select
            value={profile.preference}
            onChange={(event) =>
              setProfile({
                ...profile,
                preference: event.target.value as LearnerProfile["preference"],
              })
            }
          >
            <option value="mixed">Reading and practice</option>
            <option value="reading">Reading first</option>
            <option value="practice">Practice first</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Available study days</legend>
        <div className="planner-days-picker">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day, index) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={profile.studyDays.includes(index)}
                  onChange={() => toggleDay(index)}
                />
                {day}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Priority domains (optional)</legend>
        <div className="planner-domains-picker">
          {domains.map((domain) => (
            <label key={domain.code}>
              <input
                type="checkbox"
                checked={profile.priorityDomains.includes(domain.code)}
                onChange={() =>
                  setProfile({
                    ...profile,
                    priorityDomains: profile.priorityDomains.includes(
                      domain.code,
                    )
                      ? profile.priorityDomains.filter((d) => d !== domain.code)
                      : [...profile.priorityDomains, domain.code],
                  })
                }
              />
              Domain {domain.code} · {domain.short}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="planner-muted">
        Weekly availability:{" "}
        <strong>
          {profile.studyDays.length * profile.minutesPerSession || 0} minutes
        </strong>
        . Activity preference changes the plan; it is not a diagnosis of a
        learning style. No email or private personal details are needed.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving preferences…" : "Save study preferences"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

export function StudyPlanner({
  browserOnly,
  available,
  onboarding = false,
}: {
  browserOnly: boolean;
  available: boolean;
  onboarding?: boolean;
}) {
  const hydrated = useHydrated();
  const learning = useLearning();
  const raw = useSyncExternalStore(
    browserOnly ? subscribePlanner : noSubscription,
    browserOnly ? plannerSnapshot : noSnapshot,
    noSnapshot,
  );
  const practiceRaw = useSyncExternalStore(
    browserOnly ? subscribeBrowserDemo : noSubscription,
    browserOnly ? browserSnapshot : noSnapshot,
    noSnapshot,
  );
  const [remote, setRemote] = useState<
    PlannerSnapshot & { weakDomains: string[]; loading: boolean; error: string }
  >({ ...emptyPlanner, weakDomains: [], loading: true, error: "" });
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(false);
  const saving = useRef(false);
  const epoch = useRef(0);
  const reading = useRef<AbortController | null>(null);
  const writing = useRef<AbortController | null>(null);
  const reloadRemote = useCallback(async () => {
    if (browserOnly || !available) return;
    reading.current?.abort();
    const controller = new AbortController();
    reading.current = controller;
    const currentEpoch = ++epoch.current;
    const stale = () =>
      !mounted.current ||
      controller.signal.aborted ||
      epoch.current !== currentEpoch;
    try {
      const response = await fetch("/api/profile", {
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();
      if (stale()) return;
      if (!response.ok)
        throw new Error(
          result.error || "Your study preferences could not be loaded.",
        );
      const snapshot = connectedSnapshotSchema.parse(result);
      const weakDomains = z
        .array(z.enum(["1", "2", "3", "4"]))
        .parse(result.weakDomains || []);
      setRemote({ ...snapshot, weakDomains, loading: false, error: "" });
    } catch (error) {
      if (stale()) return;
      // A failed connected read must not display another identity's previous
      // profile or fall back to browser-local demonstration preferences.
      setRemote({
        ...emptyPlanner,
        weakDomains: [],
        loading: false,
        error: errorMessage(error),
      });
      throw error;
    } finally {
      if (reading.current === controller) reading.current = null;
    }
  }, [browserOnly, available]);
  useEffect(() => {
    mounted.current = true;
    const load = () => {
      if (!saving.current) void reloadRemote().catch(() => {});
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      mounted.current = false;
      reading.current?.abort();
      writing.current?.abort();
      window.removeEventListener("focus", load);
    };
  }, [reloadRemote]);
  let snapshot: PlannerSnapshot = remote;
  let loadError = browserOnly ? "" : remote.error;
  let evidenceError = "";
  let weakDomains = remote.weakDomains;
  if (browserOnly && hydrated) {
    try {
      snapshot = parsePlanner(raw);
    } catch (error) {
      loadError = errorMessage(error);
    }
    try {
      weakDomains = weakDomainsFromSessions(
        parseBrowserSnapshot(practiceRaw).sessions,
      );
    } catch {
      weakDomains = [];
      evidenceError =
        "Practice history could not be read. Weak-domain recommendations are unavailable.";
    }
  }
  const completedIds = learning.state
    ? lessons
        .filter((lesson) => completedLesson(lesson.id, learning.state!))
        .map((lesson) => lesson.id)
    : [];
  const { state, revision } = snapshot;
  const plan = state ? generateStudyPlan(state, completedIds, weakDomains) : [];
  const plannedTasks = plan.flatMap((day) => day.tasks);
  const completedCount = plannedTasks.filter((task) => task.completed).length;
  const today = utcDate();
  const pastTarget = Boolean(
    state?.profile.targetDate && state.profile.targetDate < today,
  );
  async function act(action: PlannerAction) {
    if (saving.current) return;
    saving.current = true;
    reading.current?.abort();
    const controller = new AbortController();
    writing.current = controller;
    const currentEpoch = ++epoch.current;
    const stale = () =>
      !mounted.current ||
      controller.signal.aborted ||
      epoch.current !== currentEpoch;
    setPending(true);
    setOperationError("");
    setNotice("");
    try {
      if (browserOnly) plannerAction(action, completedIds, weakDomains);
      else {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
          signal: controller.signal,
        });
        const result = await response.json();
        if (stale()) return;
        if (!response.ok) {
          if (response.status === 401) {
            setRemote({
              ...emptyPlanner,
              weakDomains: [],
              loading: false,
              error: result.error || "Sign in to load your study plan.",
            });
            setEditing(false);
          }
          if (response.status === 409) await reloadRemote().catch(() => {});
          throw new Error(
            result.error || "Your study preferences could not be saved.",
          );
        }
        const saved = connectedSnapshotSchema.parse(result);
        setRemote((current) => ({
          ...current,
          ...saved,
          loading: false,
          error: "",
        }));
      }
      if (action.action === "save") {
        setEditing(false);
        setNotice(
          "Your study preferences are saved. Your current week is ready.",
        );
      } else if (action.action === "regenerate") {
        setNotice(
          "Your next seven days were refreshed using your current saved learning and practice activity.",
        );
      }
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return;
      setOperationError(errorMessage(error));
      throw error;
    } finally {
      saving.current = false;
      if (writing.current === controller) writing.current = null;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <div className="page-wrap planner-page">
      <div className="eyebrow">
        {onboarding
          ? "WELCOME TO YOUR NEXT CHAPTER"
          : "A ROUTINE THAT FITS THE WORK"}
      </div>
      <div className="planner-heading">
        <div>
          <h1>
            {onboarding
              ? "Build a study routine that fits."
              : "Make room for your next step."}
          </h1>
          <p className="lead">
            A practical week of learning, shaped by your availability and saved
            progress.
          </p>
        </div>
        <CalendarDays size={36} aria-hidden="true" />
      </div>
      <p className="planner-storage-note">
        {browserOnly
          ? "Browser demonstration: goals and checklist stay on this browser and website address. No account or cross-device sync."
          : "Goals and checklist save to your verified account or explicitly enabled local demo identity. A local demo cookie is not a real account."}{" "}
        All suggested lessons and questions are unreviewed demonstrations.
      </p>
      {!available ? (
        <section className="card empty-block">
          <h2>Sign in to save your study goals.</h2>
          <p>
            Your plan belongs to your learner account. Sign-in must be
            configured before account storage can be used.
          </p>
          <Link href="/settings" className="button primary">
            Open account settings
            <ArrowRight size={16} />
          </Link>
        </section>
      ) : !hydrated || (!browserOnly && remote.loading) ? (
        <p role="status">Loading study preferences…</p>
      ) : loadError ? (
        <section className="card settings-card">
          <p className="error" role="alert">
            {loadError}
          </p>
          {browserOnly ? (
            <button
              className="button secondary"
              onClick={() => {
                if (
                  confirm(
                    "Reset only your study preferences and planner checklist? Lesson and practice progress will remain.",
                  )
                ) {
                  try {
                    resetPlanner();
                    setOperationError("");
                  } catch (error) {
                    setOperationError(errorMessage(error));
                  }
                }
              }}
            >
              Reset study plan
            </button>
          ) : (
            <button
              className="button secondary"
              onClick={() => location.reload()}
            >
              Retry loading
            </button>
          )}
        </section>
      ) : (
        <>
          {pending && (
            <p className="planner-muted" role="status">
              Saving your study plan…
            </p>
          )}
          {notice && (
            <p className="planner-success" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </p>
          )}
          {(operationError || evidenceError || learning.error) && (
            <p className="error" role="alert">
              {operationError || evidenceError || learning.error}
            </p>
          )}
          {(!state || editing) && (
            <PreferencesForm
              key={`${revision}:${state?.onboardedAt || "new"}`}
              initial={state?.profile || defaultProfile}
              busy={pending}
              onSave={(profile) => act({ action: "save", profile, revision })}
            />
          )}
          {state && (
            <>
              <section className="card planner-summary">
                <div>
                  <div className="eyebrow">YOUR NEXT SEVEN DAYS · UTC</div>
                  <h2>
                    {completedCount} / {plannedTasks.length} suggested
                    activities checked
                  </h2>
                  <p>
                    {state.profile.studyDays.length} study days per week · up to{" "}
                    {state.profile.minutesPerSession} minutes per day
                    {state.profile.targetDate
                      ? ` · Target: ${state.profile.targetDate}`
                      : " · No exam date set"}
                  </p>
                  <p className="planner-muted">
                    Assigned days stay fixed when you complete a lesson. Past
                    days drop out; refresh your next seven days for new
                    suggestions. Missed work is not piled onto tomorrow.
                    Checkmarks are self-reported unless labeled as a completed
                    lesson. Estimates do not guarantee readiness.
                  </p>
                </div>
                <div className="auth-actions">
                  <button
                    className="button secondary"
                    disabled={pending || pastTarget}
                    onClick={() =>
                      void act({ action: "regenerate", revision }).catch(
                        () => {},
                      )
                    }
                  >
                    Refresh next seven days
                  </button>
                  <button
                    className="button secondary"
                    disabled={pending}
                    onClick={() => setEditing(!editing)}
                  >
                    <SlidersHorizontal size={16} />
                    {editing ? "Close preferences" : "Edit study preferences"}
                  </button>
                </div>
              </section>
              {pastTarget ? (
                <section className="card empty-block">
                  <h2>Your target date has passed.</h2>
                  <p>
                    Update your study preferences to generate a new week. We do
                    not compress missed work into an unrealistic schedule.
                  </p>
                </section>
              ) : !plan.length ? (
                <section className="card empty-block">
                  <h2>No remaining study days in this plan.</h2>
                  <p>
                    Refresh the next seven days, select an available day before
                    your target, or adjust your preferences. No extra study time
                    has been assumed.
                  </p>
                </section>
              ) : (
                <div className="planner-week">
                  {plan.map((day) => (
                    <section className="card planner-day" key={day.date}>
                      <header>
                        <div>
                          <span className="eyebrow">
                            {day.date === today ? "TODAY" : "PLANNED STUDY"}
                          </span>
                          <h3>
                            {new Intl.DateTimeFormat("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            }).format(new Date(`${day.date}T00:00:00Z`))}
                          </h3>
                        </div>
                        <span>
                          <Clock3 size={14} />
                          {day.tasks.reduce(
                            (sum, task) => sum + task.minutes,
                            0,
                          )}{" "}
                          / {day.minutes} min
                        </span>
                      </header>
                      {day.tasks.map((task) => (
                        <article className="planner-task" key={task.id}>
                          <div className="planner-task-label">
                            DOMAIN {task.domain} · {task.kind.toUpperCase()} · ~
                            {task.minutes} MIN
                          </div>
                          <Link className="text-link" href={task.href}>
                            {task.title}
                            <ArrowRight size={15} />
                          </Link>
                          <p>{task.reason}</p>
                          <label className="planner-task-completion">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              disabled={
                                pending || task.completionSource === "lesson"
                              }
                              onChange={(event) => {
                                void act({
                                  action: "complete",
                                  taskId: task.id,
                                  completed: event.target.checked,
                                  revision,
                                }).catch(() => {});
                              }}
                            />
                            {task.completionSource === "lesson"
                              ? "Completed in lesson reader"
                              : task.completed
                                ? "Marked done by you"
                                : `Mark ${task.kind} done (self-reported)`}
                          </label>
                        </article>
                      ))}
                      <p className="planner-muted">
                        Remaining time is available for notes or reflection. No
                        reminder or calendar event is created.
                      </p>
                    </section>
                  ))}
                </div>
              )}
              <section className="planner-method">
                <h2>Why these suggestions?</h2>
                <p>
                  Incomplete lessons come first. Saved practice domains below
                  75% accuracy receive extra focus, followed by your selected
                  priorities. This is a transparent starting rule, not a
                  validated mastery or exam-readiness score. Ongoing exam
                  answers are excluded. Practice links use one distinct question
                  because the demonstration bank is small.
                </p>
                <Link className="text-link" href="/performance">
                  Inspect your saved performance
                  <ArrowRight size={15} />
                </Link>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
