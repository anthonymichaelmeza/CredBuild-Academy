"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  learningSnapshot,
  parseLearning,
  subscribeLearning,
  lessonAction,
  resetLearning,
} from "@/demo/learning-store";
import {
  learningStateSchema,
  type LessonAction,
} from "@/modules/learning/progress";
import { lessons } from "@/modules/learning/catalog";
import { browserDemoEnabled } from "@/modules/runtime/mode";
import type { LearningSnapshot } from "@/modules/learning/service";
import { useHydrated } from "./use-hydrated";
const noopSubscribe = () => () => {};
const nullSnapshot = () => null;

export function useLearning() {
  const browserOnly = browserDemoEnabled();
  const raw = useSyncExternalStore(
    browserOnly ? subscribeLearning : noopSubscribe,
    browserOnly ? learningSnapshot : nullSnapshot,
    nullSnapshot,
  );
  const hydrated = useHydrated();
  const [server, setServer] = useState<LearningSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const working = useRef(false);
  const mounted = useRef(false);

  const reload = useCallback(async () => {
    if (browserOnly) return;
    const response = await fetch("/api/learning", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Lesson progress could not be loaded.");
    const snapshot = {
      state: learningStateSchema.parse(data.state),
      revisions: data.revisions || {},
    };
    if (mounted.current) {
      setServer(snapshot);
      setError(null);
    }
    return snapshot;
  }, [browserOnly]);
  useEffect(() => {
    mounted.current = true;
    if (browserOnly)
      return () => {
        mounted.current = false;
      };
    const load = () => {
      if (working.current) return;
      void reload().catch((e) => {
        if (mounted.current) {
          setServer(null);
          setError((e as Error).message);
        }
      });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", load);
    };
  }, [browserOnly, reload]);
  let state = server?.state || null;
  let storageError = error;
  if (browserOnly) {
    try {
      state = parseLearning(raw);
    } catch (e) {
      state = null;
      storageError = (e as Error).message;
    }
  }
  async function action(lessonId: string, input: LessonAction) {
    if (browserOnly) {
      lessonAction(lessonId, input);
      return;
    }
    if (working.current)
      throw new Error("Wait for the current lesson save to finish.");
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found.");
    if (!server)
      throw new Error("Load your saved progress before making changes.");
    working.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          lessonId,
          lessonVersion: lesson.version,
          revision: server.revisions[lessonId] || 0,
          action: input,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setServer(null);
          setError(data.error || "Sign in to continue saving lesson progress.");
        }
        if (response.status === 409) await reload();
        throw new Error(
          data.error || "Lesson progress was not saved. Please retry.",
        );
      }
      if (mounted.current) {
        setServer({
          state: learningStateSchema.parse(data.state),
          revisions: data.revisions || {},
        });
        setError(null);
      }
    } finally {
      working.current = false;
      if (mounted.current) setPending(false);
    }
  }
  async function reset() {
    if (browserOnly) {
      resetLearning();
      return;
    }
    await reload();
  }
  return {
    hydrated:
      hydrated && (browserOnly || Boolean(server) || Boolean(storageError)),
    state,
    error: storageError,
    action,
    reset,
    pending,
    storageMode: browserOnly ? ("browser" as const) : ("account" as const),
  };
}
