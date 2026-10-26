"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  browserSnapshot,
  browserFullExamView,
  browserFullExamHistory,
  subscribeBrowserDemo,
} from "@/demo/browser-store";
import type { SessionView } from "@/modules/practice/types";
import type { ExamHistoryItem } from "@/modules/exams/types";
import { useHydrated } from "./use-hydrated";
import { FullExamSession } from "./full-exam-session";
import { FullExamHistory } from "./full-exam-history";

type Resolution<T> =
  { value: T; error?: never } | { value?: never; error: string };

function BrowserExamStorageError({ message }: { message: string }) {
  return (
    <div className="page-wrap narrow">
      <section className="card">
        <h1>Demonstration progress is unavailable</h1>
        <p className="error" role="alert">
          {message}
        </p>
        <p>
          Progress belongs to this browser profile and website address. No
          account or server database contains these demonstration attempts.
        </p>
        <Link className="button primary" href="/exam">
          Open Exam Simulator
        </Link>
        <Link className="button secondary" href="/settings">
          Open demo settings
        </Link>
      </section>
    </div>
  );
}

/** Read/finalize external storage after mount, never as a render side effect. */
function useBrowserExam<T>(read: () => T, identity: string) {
  const raw = useSyncExternalStore(
    subscribeBrowserDemo,
    browserSnapshot,
    () => null,
  );
  const hydrated = useHydrated();
  const [resolution, setResolution] = useState<Resolution<T> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setResolution({ value: read() });
      } catch (error) {
        setResolution({
          error:
            error instanceof Error
              ? error.message
              : "Saved demonstration progress could not be read.",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [raw, hydrated, read, identity]);
  return resolution;
}

// Stable callbacks avoid repeated effects for unchanged snapshots.
const readHistory = () => browserFullExamHistory();

export function BrowserFullExam({ id }: { id: string }) {
  const [reader] = useState(() => () => browserFullExamView(id));
  const resolution = useBrowserExam<SessionView>(reader, id);
  if (!resolution)
    return (
      <div className="page-wrap">
        <p role="status">Loading demonstration examination…</p>
      </div>
    );
  if (resolution.error !== undefined)
    return <BrowserExamStorageError message={resolution.error} />;
  return <FullExamSession key={id} initial={resolution.value} browserOnly />;
}

export function BrowserFullExamHistory() {
  const resolution = useBrowserExam<ExamHistoryItem[]>(readHistory, "history");
  if (!resolution)
    return (
      <div className="page-wrap">
        <p role="status">Loading demonstration history…</p>
      </div>
    );
  if (resolution.error !== undefined)
    return <BrowserExamStorageError message={resolution.error} />;
  return <FullExamHistory initial={resolution.value} browserOnly />;
}
